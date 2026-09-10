(function () {
  "use strict";

  var root = document.getElementById("etsy-live-catalog");
  if (!root) return;

  var shopURL = "https://www.etsy.com/shop/TresAmigosUnaVida";
  var status = document.getElementById("etsy-catalog-status");

  function decodeText(value) {
    if (!value) return "";
    var textarea = document.createElement("textarea");
    textarea.innerHTML = String(value);
    return textarea.value;
  }

  function money(value) {
    if (!value || typeof value.amount !== "number") return "";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: value.currency || "USD"
      }).format(value.amount);
    } catch (_) {
      return "$" + value.amount.toFixed(2);
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function listingTraits(listing) {
    var title = decodeText(listing.title).toLowerCase();
    var bundle = /\b(bundle|set|books?\s*1\s*&\s*2|books?\s*one\s*&\s*two)\b/.test(title);
    var signed = /\bsigned\b/.test(title);
    var personalized = Boolean(listing.customizable) || /\b(personalized|personalised|custom)\b/.test(title);
    var faultLines = /\bfault lines\b|\bbook\s*2\b|\bbook\s*two\b/.test(title);
    var paperback = /\bpaperback\b/.test(title);

    return {
      bundle: bundle,
      signed: signed,
      personalized: personalized,
      faultLines: faultLines,
      paperback: paperback,
      singleBook: !bundle && (faultLines || paperback)
    };
  }

  function ctaLabel(traits) {
    if (traits.personalized) return "Personalize & Buy";
    if (traits.bundle && traits.signed) return "Buy Signed Set";
    if (traits.bundle) return "Buy the Set";
    if (traits.signed) return "Buy Signed Copy";
    if (traits.paperback || traits.faultLines) return "Buy Paperback";
    return "Buy on Etsy";
  }

  function preferredImage(listing, traits) {
    if (traits.singleBook && traits.faultLines) {
      return {
        url: "/assets/fault-lines-cover.jpg",
        alt: "Tres Amigos, Una Vida: Fault Lines book cover",
        coverArt: true
      };
    }

    if (traits.singleBook && !traits.faultLines) {
      return {
        url: "/assets/tres-amigos-una-vida-cover.jpg",
        alt: "Tres Amigos, Una Vida book cover",
        coverArt: true
      };
    }

    if (listing.image && listing.image.url) {
      return {
        url: listing.image.url,
        alt: decodeText(listing.image.alt) || decodeText(listing.title),
        coverArt: false
      };
    }

    return null;
  }

  function makeCard(listing) {
    var traits = listingTraits(listing);
    var titleText = decodeText(listing.title);
    var descriptionText = decodeText(listing.description);
    var actionText = ctaLabel(traits);
    var image = preferredImage(listing, traits);

    var cardClass = "etsy-product-card";
    if (traits.bundle) cardClass += " is-bundle";
    if (traits.singleBook) cardClass += " is-single-book";
    if (traits.faultLines) cardClass += " is-fault-lines";

    var card = el("article", cardClass);

    var linkClass = "etsy-product-image-link";
    if (image && image.coverArt) linkClass += " is-cover-art";
    var link = el("a", linkClass);
    link.href = listing.url;
    link.target = "_blank";
    link.rel = "sponsored noopener";
    link.setAttribute("aria-label", actionText + ": " + titleText);

    if (image) {
      var img = document.createElement("img");
      img.className = "etsy-product-image" + (image.coverArt ? " is-cover-art" : "");
      img.src = image.url;
      img.alt = image.alt || titleText;
      img.loading = "lazy";
      img.decoding = "async";
      link.appendChild(img);
    } else {
      link.appendChild(el("div", "etsy-product-image etsy-product-placeholder", "Tres Amigos, Una Vida"));
    }

    var body = el("div", "etsy-product-body");
    var kickerText = traits.personalized ? "Official Etsy · Personalized Option" : "Official Etsy Shop";
    var badge = el("p", "etsy-product-kicker", kickerText);

    var title = el("h3", "etsy-product-title");
    var titleLink = document.createElement("a");
    titleLink.href = listing.url;
    titleLink.target = "_blank";
    titleLink.rel = "sponsored noopener";
    titleLink.textContent = titleText;
    title.appendChild(titleLink);

    body.appendChild(badge);
    body.appendChild(title);

    if (descriptionText) {
      body.appendChild(el("p", "etsy-product-description", descriptionText));
    }

    var footer = el("div", "etsy-product-footer");
    var priceText = money(listing.price);
    if (priceText) {
      footer.appendChild(el("strong", "etsy-product-price", priceText));
    }

    var buy = el("a", "btn btn-dark etsy-product-buy", actionText);
    buy.href = listing.url;
    buy.target = "_blank";
    buy.rel = "sponsored noopener";
    buy.setAttribute("aria-label", actionText + ": " + titleText);
    footer.appendChild(buy);
    body.appendChild(footer);

    card.appendChild(link);
    card.appendChild(body);
    return card;
  }

  function fallback(message) {
    root.classList.remove("is-loading");
    root.innerHTML = "";
    var box = el("div", "etsy-catalog-fallback");
    box.appendChild(el("h3", "", "Shop the official Etsy collection"));
    box.appendChild(el("p", "", message || "Our live Etsy shelf is taking a coffee break, but the shop is open."));
    var link = el("a", "btn", "Shop on Etsy");
    link.href = shopURL;
    link.target = "_blank";
    link.rel = "sponsored noopener";
    box.appendChild(link);
    root.appendChild(box);
    if (status) status.textContent = "Secure checkout is handled by Etsy.";
  }

  fetch("/api/etsy/catalog", {
    method: "GET",
    headers: { "accept": "application/json" },
    credentials: "same-origin"
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Catalog request failed");
      return response.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.listings) || !data.listings.length) {
        fallback("The live catalog is empty right now. You can still shop every current listing directly on Etsy.");
        return;
      }

      root.classList.remove("is-loading");
      root.innerHTML = "";
      data.listings.forEach(function (listing) {
        root.appendChild(makeCard(listing));
      });

      if (status) {
        status.textContent =
          data.listings.length +
          (data.listings.length === 1 ? " live product" : " live products") +
          " · secure checkout on Etsy";
      }
    })
    .catch(function () {
      fallback("Our live Etsy shelf could not load right now. The Etsy shop itself is still open and ready for you.");
    });
})();
