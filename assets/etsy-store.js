(function () {
  "use strict";

  var root = document.getElementById("etsy-live-catalog");
  if (!root) return;

  var shopURL = "https://www.etsy.com/shop/TresAmigosUnaVida";
  var status = document.getElementById("etsy-catalog-status");

  function money(value) {
    if (!value || typeof value.amount !== "number") return "View on Etsy";
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

  function makeCard(listing) {
    var card = el("article", "etsy-product-card");
    var link = el("a", "etsy-product-image-link");
    link.href = listing.url;
    link.target = "_blank";
    link.rel = "sponsored noopener";
    link.setAttribute("aria-label", "View " + listing.title + " on Etsy");

    if (listing.image && listing.image.url) {
      var img = document.createElement("img");
      img.className = "etsy-product-image";
      img.src = listing.image.url;
      img.alt = listing.image.alt || listing.title;
      img.loading = "lazy";
      img.decoding = "async";
      link.appendChild(img);
    } else {
      link.appendChild(el("div", "etsy-product-image etsy-product-placeholder", "Tres Amigos, Una Vida"));
    }

    var body = el("div", "etsy-product-body");
    var badge = el("p", "etsy-product-kicker", listing.customizable ? "Official Etsy · Personalized Option" : "Official Etsy Shop");
    var title = el("h3", "etsy-product-title");
    var titleLink = document.createElement("a");
    titleLink.href = listing.url;
    titleLink.target = "_blank";
    titleLink.rel = "sponsored noopener";
    titleLink.textContent = listing.title;
    title.appendChild(titleLink);

    body.appendChild(badge);
    body.appendChild(title);
    if (listing.description) body.appendChild(el("p", "etsy-product-description", listing.description));

    var footer = el("div", "etsy-product-footer");
    footer.appendChild(el("strong", "etsy-product-price", money(listing.price)));
    var buy = el("a", "btn btn-dark etsy-product-buy", "View on Etsy");
    buy.href = listing.url;
    buy.target = "_blank";
    buy.rel = "sponsored noopener";
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
    var link = el("a", "btn", "Open Etsy Shop");
    link.href = shopURL;
    link.target = "_blank";
    link.rel = "sponsored noopener";
    box.appendChild(link);
    root.appendChild(box);
    if (status) status.textContent = "Etsy checkout remains available.";
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
        fallback("The live catalog is empty right now. You can still browse every current listing directly on Etsy.");
        return;
      }

      root.classList.remove("is-loading");
      root.innerHTML = "";
      data.listings.forEach(function (listing) {
        root.appendChild(makeCard(listing));
      });

      if (status) {
        status.textContent = data.listings.length + (data.listings.length === 1 ? " live Etsy listing" : " live Etsy listings") + " · checkout securely on Etsy";
      }
    })
    .catch(function () {
      fallback("Our live Etsy shelf could not load right now. The Etsy shop itself is still open and ready for you.");
    });
})();
