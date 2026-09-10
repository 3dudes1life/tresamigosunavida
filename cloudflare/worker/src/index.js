const ETSY_API = "https://api.etsy.com/v3/application";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const ETSY_SHOP_NAME = "TresAmigosUnaVida";
const CATALOG_PATH = "/api/etsy/catalog";
const LISTING_PATH_PREFIX = "/api/etsy/listing/";
const CATALOG_CACHE_SECONDS = 900;
const LISTING_CACHE_SECONDS = 900;

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

let shopMemo = null;
let oauthMemo = null;

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

function apiKeyHeader(env) {
  if (!env.ETSY_KEYSTRING || !env.ETSY_SHARED_SECRET) return null;
  return `${env.ETSY_KEYSTRING}:${env.ETSY_SHARED_SECRET}`;
}

async function publicEtsyFetch(path, env) {
  const key = apiKeyHeader(env);
  if (!key) throw new Error("Etsy API credentials are not configured.");

  const response = await fetch(`${ETSY_API}${path}`, {
    headers: {
      accept: "application/json",
      "x-api-key": key
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(`Etsy API ${response.status}: ${body.slice(0, 500)}`);
    error.etsyStatus = response.status;
    throw error;
  }

  return response.json();
}

async function refreshOAuth(env) {
  if (!env.ETSY_REFRESH_TOKEN || !env.ETSY_KEYSTRING) {
    const error = new Error("Etsy OAuth is not connected.");
    error.code = "oauth_not_connected";
    throw error;
  }

  if (oauthMemo && oauthMemo.accessToken && Date.now() < oauthMemo.expiresAt - 60000) {
    return oauthMemo.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.ETSY_KEYSTRING,
    refresh_token: env.ETSY_REFRESH_TOKEN
  });

  const response = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`Etsy OAuth refresh ${response.status}: ${text.slice(0, 500)}`);
    error.code = "oauth_refresh_failed";
    throw error;
  }

  const token = await response.json();
  if (!token.access_token) {
    const error = new Error("Etsy OAuth refresh returned no access_token.");
    error.code = "oauth_refresh_failed";
    throw error;
  }

  oauthMemo = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (Number(token.expires_in || 3600) * 1000)
  };

  return oauthMemo.accessToken;
}

async function scopedEtsyFetch(path, env) {
  const key = apiKeyHeader(env);
  if (!key) throw new Error("Etsy API credentials are not configured.");

  const accessToken = await refreshOAuth(env);

  const response = await fetch(`${ETSY_API}${path}`, {
    headers: {
      accept: "application/json",
      "x-api-key": key,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(`Etsy scoped API ${response.status}: ${body.slice(0, 500)}`);
    error.etsyStatus = response.status;
    throw error;
  }

  return response.json();
}

async function resolveShop(env) {
  if (shopMemo && shopMemo.shop_id) return shopMemo;

  const shops = await publicEtsyFetch(
    `/shops?shop_name=${encodeURIComponent(ETSY_SHOP_NAME)}&limit=25`,
    env
  );

  const shop =
    (shops.results || []).find(
      (candidate) =>
        String(candidate.shop_name || "").toLowerCase() ===
        ETSY_SHOP_NAME.toLowerCase()
    ) || (shops.results || [])[0];

  if (!shop || !shop.shop_id) {
    throw new Error(`Could not resolve Etsy shop ${ETSY_SHOP_NAME}.`);
  }

  shopMemo = shop;
  return shop;
}

function money(price) {
  if (!price || typeof price.amount !== "number") return null;
  const divisor = Number(price.divisor) || 100;
  return {
    amount: price.amount / divisor,
    currency: price.currency_code || "USD"
  };
}

function imagesFor(listing) {
  const images = Array.isArray(listing.images) ? listing.images.slice() : [];
  images.sort((a, b) => (a.rank || 999) - (b.rank || 999));

  return images
    .map((image) => ({
      id: image.listing_image_id || null,
      rank: image.rank || null,
      url:
        image.url_570xN ||
        image.url_fullxfull ||
        image.url_170x135 ||
        image.url_75x75 ||
        null,
      full: image.url_fullxfull || image.url_570xN || null,
      alt: image.alt_text || listing.title || "Etsy listing"
    }))
    .filter((image) => image.url);
}

function firstImage(listing) {
  return imagesFor(listing)[0] || null;
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
    updated:
      listing.updated_timestamp ||
      listing.last_modified_timestamp ||
      null
  };
}

function sanitizePersonalization(listing) {
  const questions =
    listing &&
    listing.personalization &&
    Array.isArray(listing.personalization.personalization_questions)
      ? listing.personalization.personalization_questions
      : [];

  return questions.map((question) => ({
    id: question.question_id || null,
    type: question.question_type || "text_input",
    text: question.question_text || "Personalization",
    instructions: question.instructions || "",
    required: Boolean(question.required),
    maxCharacters:
      Number.isFinite(question.max_allowed_characters)
        ? question.max_allowed_characters
        : null,
    maxFiles:
      Number.isFinite(question.max_allowed_files)
        ? question.max_allowed_files
        : null,
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          id: option.option_id || null,
          label: option.label || ""
        }))
      : []
  }));
}

function inventoryObjectFromBatch(batch, listingId) {
  const results = Array.isArray(batch && batch.results) ? batch.results : [];

  const match =
    results.find((item) => Number(item.listing_id) === Number(listingId)) ||
    results[0] ||
    null;

  if (!match) return null;

  // Current batch endpoint returns inventory on each listing result.
  if (match.inventory) return match.inventory;

  // Defensive compatibility if Etsy returns inventory-shaped data directly.
  if (Array.isArray(match.products)) return match;

  return null;
}

function sanitizeInventory(inventory) {
  const products =
    inventory && Array.isArray(inventory.products) ? inventory.products : [];

  const variants = [];
  const propertyMap = new Map();

  for (const product of products) {
    if (product.is_deleted === true) continue;

    const attributes = Array.isArray(product.property_values)
      ? product.property_values.map((property) => {
          const value = Array.isArray(property.values)
            ? property.values.join(", ")
            : "";

          const attribute = {
            id: property.property_id,
            name: property.property_name || "Option",
            scale: property.scale_name || null,
            value
          };

          if (!propertyMap.has(String(attribute.id))) {
            propertyMap.set(String(attribute.id), {
              id: attribute.id,
              name: attribute.name,
              values: new Set()
            });
          }

          if (value) {
            propertyMap.get(String(attribute.id)).values.add(value);
          }

          return attribute;
        })
      : [];

    const offerings = Array.isArray(product.offerings) ? product.offerings : [];

    for (const offering of offerings) {
      if (offering.is_deleted === true || offering.is_enabled === false) continue;

      variants.push({
        productId: product.product_id || null,
        offeringId: offering.offering_id || null,
        sku: product.sku || "",
        quantity: Number.isFinite(offering.quantity) ? offering.quantity : 0,
        price: money(offering.price),
        attributes
      });
    }
  }

  const properties = Array.from(propertyMap.values()).map((property) => ({
    id: property.id,
    name: property.name,
    values: Array.from(property.values)
  }));

  return {
    properties,
    variants,
    priceOnProperty:
      inventory && Array.isArray(inventory.price_on_property)
        ? inventory.price_on_property
        : [],
    quantityOnProperty:
      inventory && Array.isArray(inventory.quantity_on_property)
        ? inventory.quantity_on_property
        : []
  };
}

function sanitizeListingDetail(listing, inventory) {
  return {
    id: listing.listing_id,
    title: listing.title || "Etsy listing",
    description: listing.description || "",
    url: listing.url,
    price: money(listing.price),
    quantity: Number.isFinite(listing.quantity) ? listing.quantity : null,
    type: listing.listing_type || null,
    customizable: Boolean(listing.is_customizable || listing.is_personalizable),
    images: imagesFor(listing),
    inventory: sanitizeInventory(inventory),
    personalization: sanitizePersonalization(listing),
    updated:
      listing.updated_timestamp ||
      listing.last_modified_timestamp ||
      null
  };
}

async function buildCatalog(env) {
  const shop = await resolveShop(env);

  const active = await publicEtsyFetch(
    `/shops/${shop.shop_id}/listings/active?limit=100`,
    env
  );

  const ids = (active.results || [])
    .map((item) => item.listing_id)
    .filter(Boolean);

  if (!ids.length) {
    return {
      shop: {
        id: shop.shop_id,
        name: shop.shop_name || ETSY_SHOP_NAME,
        url: `https://www.etsy.com/shop/${ETSY_SHOP_NAME}`
      },
      count: 0,
      listings: [],
      fetched_at: new Date().toISOString()
    };
  }

  const batch = await publicEtsyFetch(
    `/listings/batch?listing_ids=${ids.join(",")}&includes=Images`,
    env
  );

  const listings = (batch.results || [])
    .filter((listing) => listing.state === "active")
    .map(sanitizeListing)
    .filter((listing) => listing.url)
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));

  return {
    shop: {
      id: shop.shop_id,
      name: shop.shop_name || ETSY_SHOP_NAME,
      url: `https://www.etsy.com/shop/${ETSY_SHOP_NAME}`
    },
    count: listings.length,
    listings,
    fetched_at: new Date().toISOString()
  };
}

async function buildListingDetail(listingId, env) {
  const shop = await resolveShop(env);

  // Etsy removed Inventory from getListing includes.
  // Images + Personalization remain valid associations.
  const listing = await publicEtsyFetch(
    `/listings/${listingId}?includes=Images,Personalization`,
    env
  );

  if (!listing || Number(listing.shop_id) !== Number(shop.shop_id)) {
    const error = new Error("Listing does not belong to this shop.");
    error.status = 404;
    throw error;
  }

  if (listing.state && listing.state !== "active") {
    const error = new Error("Listing is not active.");
    error.status = 404;
    throw error;
  }

  // Inventory moved to this dedicated endpoint and requires listings_r OAuth.
  const inventoryBatch = await scopedEtsyFetch(
    `/listings/batch/inventory?listing_ids=${encodeURIComponent(listingId)}`,
    env
  );

  const inventory = inventoryObjectFromBatch(inventoryBatch, listingId);

  return sanitizeListingDetail(listing, inventory);
}

async function handleCatalog(request, env, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405, { allow: "GET, HEAD" });
  }

  if (!env.ETSY_KEYSTRING || !env.ETSY_SHARED_SECRET) {
    return json(
      {
        error: "storefront_not_configured",
        message: "The Etsy storefront connection is waiting for its Cloudflare secrets."
      },
      503
    );
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
    return json(
      {
        error: "etsy_unavailable",
        message: "The Etsy catalog could not be loaded right now. Please shop directly on Etsy."
      },
      502
    );
  }
}

async function handleListingDetail(request, env, ctx, listingId) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405, { allow: "GET, HEAD" });
  }

  if (!/^\d+$/.test(String(listingId || ""))) {
    return json({ error: "Invalid listing ID" }, 400);
  }

  if (!env.ETSY_KEYSTRING || !env.ETSY_SHARED_SECRET) {
    return json(
      {
        error: "storefront_not_configured",
        message: "The Etsy storefront connection is waiting for its Cloudflare API secrets."
      },
      503
    );
  }

  if (!env.ETSY_REFRESH_TOKEN) {
    return json(
      {
        error: "oauth_not_connected",
        message: "Etsy Seller OAuth must be connected once before live variations can be read."
      },
      503
    );
  }

  const cache = caches.default;
  const cacheURL = new URL(request.url);
  cacheURL.search = "";
  const cacheKey = new Request(cacheURL.toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return withSecurityHeaders(cached, true);

  try {
    const detail = await buildListingDetail(listingId, env);
    const response = new Response(JSON.stringify(detail), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=300, s-maxage=${LISTING_CACHE_SECONDS}, stale-while-revalidate=86400`,
        "x-etsy-cache": "MISS"
      }
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return withSecurityHeaders(response, true);
  } catch (error) {
    console.error("Etsy listing detail error", error);

    if (error && (error.code === "oauth_not_connected" || error.code === "oauth_refresh_failed")) {
      return json(
        {
          error: error.code,
          message: "The Etsy Seller OAuth connection needs to be refreshed."
        },
        503
      );
    }

    const status = error && error.status === 404 ? 404 : 502;

    return json(
      {
        error: status === 404 ? "listing_not_found" : "etsy_unavailable",
        message:
          status === 404
            ? "That listing is not available in this shop."
            : "The product details could not be loaded right now."
      },
      status
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === CATALOG_PATH) {
      return handleCatalog(request, env, ctx);
    }

    if (url.pathname.startsWith(LISTING_PATH_PREFIX)) {
      const listingId = url.pathname.slice(LISTING_PATH_PREFIX.length);
      return handleListingDetail(request, env, ctx, listingId);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    const originResponse = await fetch(request);
    return withSecurityHeaders(originResponse, false);
  }
};
