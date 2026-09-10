const ETSY_API = "https://openapi.etsy.com/v3/application";
const ETSY_SHOP_NAME = "TresAmigosUnaVida";
const CATALOG_PATH = "/api/etsy/catalog";
const CATALOG_CACHE_SECONDS = 900;

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join("; ");

function withSecurityHeaders(response, api = false) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-XSS-Protection", "0");
  if (!api) headers.set("Content-Security-Policy", CSP);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  return withSecurityHeaders(new Response(JSON.stringify(data), { status, headers }), true);
}

function etsyHeaders(env) {
  if (!env.ETSY_KEYSTRING || !env.ETSY_SHARED_SECRET) return null;
  return {
    "accept": "application/json",
    "x-api-key": `${env.ETSY_KEYSTRING}:${env.ETSY_SHARED_SECRET}`
  };
}

async function etsyFetch(path, env) {
  const headers = etsyHeaders(env);
  if (!headers) throw new Error("Etsy API credentials are not configured.");

  const response = await fetch(`${ETSY_API}${path}`, { headers });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Etsy API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

function money(price) {
  if (!price || typeof price.amount !== "number") return null;
  const divisor = Number(price.divisor) || 100;
  return {
    amount: price.amount / divisor,
    currency: price.currency_code || "USD"
  };
}

function firstImage(listing) {
  const images = Array.isArray(listing.images) ? listing.images.slice() : [];
  images.sort((a, b) => (a.rank || 999) - (b.rank || 999));
  const image = images[0];
  if (!image) return null;
  return {
    url: image.url_570xN || image.url_fullxfull || image.url_170x135 || null,
    full: image.url_fullxfull || image.url_570xN || null,
    alt: image.alt_text || listing.title || "Etsy listing"
  };
}

function summarize(text, max = 190) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 80 ? space : max).trim()}…`;
}

function sanitizeListing(listing) {
  return {
    id: listing.listing_id,
    title: listing.title || "Etsy listing",
    description: summarize(listing.description),
    url: listing.url,
    price: money(listing.price),
    quantity: Number.isFinite(listing.quantity) ? listing.quantity : null,
    type: listing.listing_type || null,
    customizable: Boolean(listing.is_customizable || listing.is_personalizable),
    image: firstImage(listing),
    updated: listing.updated_timestamp || listing.last_modified_timestamp || null
  };
}

async function buildCatalog(env) {
  const shops = await etsyFetch(`/shops?shop_name=${encodeURIComponent(ETSY_SHOP_NAME)}&limit=25`, env);
  const shop = (shops.results || []).find(
    (candidate) => String(candidate.shop_name || "").toLowerCase() === ETSY_SHOP_NAME.toLowerCase()
  ) || (shops.results || [])[0];

  if (!shop || !shop.shop_id) throw new Error(`Could not resolve Etsy shop ${ETSY_SHOP_NAME}.`);

  const active = await etsyFetch(`/shops/${shop.shop_id}/listings/active?limit=100`, env);
  const ids = (active.results || []).map((item) => item.listing_id).filter(Boolean);

  if (!ids.length) {
    return {
      shop: { id: shop.shop_id, name: shop.shop_name || ETSY_SHOP_NAME, url: `https://www.etsy.com/shop/${ETSY_SHOP_NAME}` },
      count: 0,
      listings: [],
      fetched_at: new Date().toISOString()
    };
  }

  const batch = await etsyFetch(`/listings/batch?listing_ids=${ids.join(",")}&includes=Images`, env);
  const listings = (batch.results || [])
    .filter((listing) => listing.state === "active")
    .map(sanitizeListing)
    .filter((listing) => listing.url)
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));

  return {
    shop: { id: shop.shop_id, name: shop.shop_name || ETSY_SHOP_NAME, url: `https://www.etsy.com/shop/${ETSY_SHOP_NAME}` },
    count: listings.length,
    listings,
    fetched_at: new Date().toISOString()
  };
}

async function handleCatalog(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405, { allow: "GET, HEAD" });
  }

  if (!env.ETSY_KEYSTRING || !env.ETSY_SHARED_SECRET) {
    return json({
      error: "storefront_not_configured",
      message: "The Etsy storefront connection is waiting for its Cloudflare secrets."
    }, 503);
  }

  const cache = caches.default;
  const cacheURL = new URL(request.url);
  cacheURL.search = "";
  const cacheKey = new Request(cacheURL.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withSecurityHeaders(cached, true);

  try {
    const catalog = await buildCatalog(env);
    const response = new Response(JSON.stringify(catalog), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=300, s-maxage=${CATALOG_CACHE_SECONDS}, stale-while-revalidate=86400`,
        "x-etsy-cache": "MISS"
      }
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return withSecurityHeaders(response, true);
  } catch (error) {
    console.error("Etsy catalog error", error);
    return json({
      error: "etsy_unavailable",
      message: "The Etsy catalog could not be loaded right now. Please shop directly on Etsy."
    }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === CATALOG_PATH) {
      return handleCatalog(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    // On a Cloudflare Route, fetch(request) continues to the existing origin
    // (GitHub Pages) without recursively invoking this Worker.
    const originResponse = await fetch(request);
    return withSecurityHeaders(originResponse, false);
  }
};
