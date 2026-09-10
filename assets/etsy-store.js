(function () {
  "use strict";

  var root = document.getElementById("etsy-live-catalog");
  if (!root) return;

  var shopURL = "https://www.etsy.com/shop/TresAmigosUnaVida";
  var status = document.getElementById("etsy-catalog-status");
  var detailCache = {};
  var lastTrigger = null;

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

    var faultLines =
      /\bfault lines\b/.test(title) ||
      /\bbook\s*2\b/.test(title) ||
      /\bbook\s*two\b/.test(title);

    var bundle =
      /\bbook bundle\b/.test(title) ||
      /\bpaperback bundle\b/.test(title) ||
      /\bbooks?\s*1\s*&\s*2\b/.test(title) ||
      /\bbooks?\s*1\s*(?:and|\+)\s*2\b/.test(title) ||
      /\bbooks?\s*one\s*(?:and|&|\+)\s*two\b/.test(title) ||
      (/\bset\b/.test(title) && /\bbooks?\b|\bpaperback\b/.test(title));

    var signed = /\bsigned\b/.test(title);

    var bookProduct =
      faultLines ||
      bundle ||
      /\bpaperback\b/.test(title) ||
      /\bhardcover\b/.test(title) ||
      /\bromance novel\b/.test(title) ||
      /\bsigned book\b/.test(title) ||
      (/\btres amigos\b/.test(title) &&
        (/\bnovel\b/.test(title) || /\blove story\b/.test(title)));

    var etsyCustomizable =
      Boolean(listing.customizable) ||
      /\bpersonalized\b|\bpersonalised\b|\bcustomizable\b|\bcustomisable\b/.test(title);

    /*
      Tres Amigos shop rule:
      signed books CAN be personalized;
      unsigned books CANNOT.
    */
    var personalized = bookProduct ? signed : etsyCustomizable;

    return {
      title: title,
      faultLines: faultLines,
      bundle: bundle,
      signed: signed,
      bookProduct: bookProduct,
      singleBook: bookProduct && !bundle,
      personalized: personalized
    };
  }

  function cardActionLabel(traits) {
    if (traits.bookProduct) {
      if (traits.bundle && traits.signed) return "Quick Shop";
      if (traits.bundle) return "Quick Shop";
      if (traits.signed) return "Quick Shop";
      return "Quick Shop";
    }
    if (traits.personalized) return "Quick Shop";
    return "Quick Shop";
  }

  function kickerLabel(traits) {
    if (traits.bookProduct && traits.signed) {
      return "Official Etsy · Signed · Personalization Available";
    }
    if (traits.bookProduct) {
      return "Official Etsy · Unsigned";
    }
    if (traits.personalized) {
      return "Official Etsy · Personalized Option";
    }
    return "Official Etsy Shop";
  }

  function preferredImage(listing, traits) {
    /*
      EVERY single Book One / Fault Lines listing gets the clean local cover,
      signed or unsigned. Bundles keep their real Etsy listing photography.
    */
    if (traits.singleBook) {
      if (traits.faultLines) {
        return {
          url: "/assets/fault-lines-cover.jpg",
          alt: "Tres Amigos, Una Vida: Fault Lines book cover",
          coverArt: true
        };
      }

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

  function bindQuickShop(node, listing) {
    node.href = "#";
    node.removeAttribute("target");
    node.removeAttribute("rel");
    node.addEventListener("click", function (event) {
      event.preventDefault();
      lastTrigger = node;
      openQuickShop(listing);
    });
  }

  function makeCard(listing, displayMode) {
    var traits = listingTraits(listing);
    var titleText = decodeText(listing.title);
    var descriptionText = decodeText(listing.description);
    var actionText = cardActionLabel(traits);
    var image = preferredImage(listing, traits);

    var cardClass = "etsy-product-card";
    if (displayMode === "featured") cardClass += " is-featured-book";
    if (displayMode === "collection") cardClass += " is-collection-card";
    if (traits.bookProduct) cardClass += " is-book-product";
    if (traits.bundle) cardClass += " is-bundle";
    if (traits.singleBook) cardClass += " is-single-book";
    if (traits.signed) cardClass += " is-signed";
    if (traits.faultLines) cardClass += " is-fault-lines";

    var card = el("article", cardClass);

    var imageLinkClass = "etsy-product-image-link";
    if (image && image.coverArt) imageLinkClass += " is-cover-art";
    var imageLink = el("a", imageLinkClass);
    imageLink.setAttribute("aria-label", "Quick shop: " + titleText);
    bindQuickShop(imageLink, listing);

    if (image) {
      var img = document.createElement("img");
      img.className =
        "etsy-product-image" + (image.coverArt ? " is-cover-art" : "");
      img.src = image.url;
      img.alt = image.alt || titleText;
      img.loading = "lazy";
      img.decoding = "async";
      imageLink.appendChild(img);
    } else {
      imageLink.appendChild(
        el(
          "div",
          "etsy-product-image etsy-product-placeholder",
          "Tres Amigos, Una Vida"
        )
      );
    }

    var body = el("div", "etsy-product-body");
    body.appendChild(el("p", "etsy-product-kicker", kickerLabel(traits)));

    var title = el("h3", "etsy-product-title");
    var titleLink = document.createElement("a");
    titleLink.textContent = titleText;
    titleLink.setAttribute("aria-label", "Quick shop: " + titleText);
    bindQuickShop(titleLink, listing);
    title.appendChild(titleLink);
    body.appendChild(title);

    if (descriptionText) {
      body.appendChild(
        el("p", "etsy-product-description", descriptionText)
      );
    }

    var footer = el("div", "etsy-product-footer");
    var priceText = money(listing.price);
    if (priceText) {
      footer.appendChild(
        el("strong", "etsy-product-price", priceText)
      );
    }

    var buy = el(
      "a",
      "btn btn-dark etsy-product-buy etsy-quick-shop-trigger",
      actionText
    );
    buy.setAttribute("aria-label", actionText + ": " + titleText);
    bindQuickShop(buy, listing);
    footer.appendChild(buy);

    body.appendChild(footer);
    card.appendChild(imageLink);
    card.appendChild(body);
    return card;
  }

  function ensureModal() {
    var existing = document.getElementById("etsy-quick-shop");
    if (existing) return existing;

    var modal = el("div", "etsy-quick-shop", "");
    modal.id = "etsy-quick-shop";
    modal.hidden = true;

    var backdrop = el("button", "etsy-quick-shop-backdrop", "");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Close quick shop");

    var dialog = el("section", "etsy-quick-shop-dialog", "");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "etsy-quick-shop-title");

    var close = el("button", "etsy-quick-shop-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close quick shop");

    var content = el("div", "etsy-quick-shop-content", "");
    content.id = "etsy-quick-shop-content";

    dialog.appendChild(close);
    dialog.appendChild(content);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    backdrop.addEventListener("click", closeQuickShop);
    close.addEventListener("click", closeQuickShop);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeQuickShop();
      }
    });

    return modal;
  }

  function closeQuickShop() {
    var modal = document.getElementById("etsy-quick-shop");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("etsy-quick-shop-open");
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
  }

  function showModalLoading(listing) {
    var modal = ensureModal();
    var content = document.getElementById("etsy-quick-shop-content");
    content.innerHTML = "";

    var loading = el("div", "etsy-quick-shop-loading", "");
    loading.appendChild(el("p", "kicker", "Quick Shop"));
    loading.appendChild(
      el("h2", "", decodeText(listing.title))
    );
    loading.appendChild(
      el("p", "", "Loading live options, price, and availability…")
    );
    content.appendChild(loading);

    modal.hidden = false;
    document.body.classList.add("etsy-quick-shop-open");

    var close = modal.querySelector(".etsy-quick-shop-close");
    if (close) close.focus();
  }

  function openQuickShop(listing) {
    showModalLoading(listing);

    if (detailCache[listing.id]) {
      renderQuickShop(detailCache[listing.id], listing);
      return;
    }

    fetch("/api/etsy/listing/" + encodeURIComponent(listing.id), {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "same-origin"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Product detail request failed");
        return response.json();
      })
      .then(function (detail) {
        detailCache[listing.id] = detail;
        renderQuickShop(detail, listing);
      })
      .catch(function () {
        renderQuickShopError(listing);
      });
  }

  function renderQuickShopError(listing) {
    var content = document.getElementById("etsy-quick-shop-content");
    if (!content) return;
    content.innerHTML = "";

    var box = el("div", "etsy-quick-shop-error", "");
    box.appendChild(el("p", "kicker", "Quick Shop"));
    box.appendChild(
      el("h2", "", decodeText(listing.title))
    );
    box.appendChild(
      el(
        "p",
        "",
        "The live options could not load right now. You can still finish this item directly on Etsy."
      )
    );

    var link = el("a", "btn btn-dark", "Open on Etsy");
    link.href = listing.url;
    link.target = "_blank";
    link.rel = "sponsored noopener";
    box.appendChild(link);
    content.appendChild(box);
  }

  function makeGallery(detail, traits) {
    var gallery = el("div", "etsy-quick-gallery", "");

    var imageWrap = el(
      "div",
      "etsy-quick-main-image-wrap" +
        (traits.singleBook ? " is-cover-art" : ""),
      ""
    );

    var main = document.createElement("img");
    main.className =
      "etsy-quick-main-image" +
      (traits.singleBook ? " is-cover-art" : "");

    if (traits.singleBook) {
      main.src = traits.faultLines
        ? "/assets/fault-lines-cover.jpg"
        : "/assets/tres-amigos-una-vida-cover.jpg";
      main.alt = traits.faultLines
        ? "Tres Amigos, Una Vida: Fault Lines cover"
        : "Tres Amigos, Una Vida cover";
    } else if (detail.images && detail.images.length) {
      main.src = detail.images[0].full || detail.images[0].url;
      main.alt =
        decodeText(detail.images[0].alt) ||
        decodeText(detail.title);
    } else {
      main.src = "";
      main.alt = "";
    }

    imageWrap.appendChild(main);
    gallery.appendChild(imageWrap);

    if (!traits.singleBook && detail.images && detail.images.length > 1) {
      var thumbs = el("div", "etsy-quick-thumbs", "");
      detail.images.slice(0, 6).forEach(function (image, index) {
        var button = el("button", "etsy-quick-thumb", "");
        button.type = "button";
        if (index === 0) button.classList.add("is-active");

        var thumb = document.createElement("img");
        thumb.src = image.url;
        thumb.alt = decodeText(image.alt) || "Product image";
        button.appendChild(thumb);

        button.addEventListener("click", function () {
          main.src = image.full || image.url;
          main.alt = decodeText(image.alt) || decodeText(detail.title);
          thumbs
            .querySelectorAll(".etsy-quick-thumb")
            .forEach(function (node) {
              node.classList.remove("is-active");
            });
          button.classList.add("is-active");
        });

        thumbs.appendChild(button);
      });
      gallery.appendChild(thumbs);
    }

    return gallery;
  }

  function propertyKey(attribute) {
    return String(attribute.id);
  }

  function variantValue(variant, propertyId) {
    var found = (variant.attributes || []).find(function (attribute) {
      return String(attribute.id) === String(propertyId);
    });
    return found ? found.value : "";
  }

  function renderVariationControls(detail, state, controls, onChange) {
    var properties =
      detail.inventory && Array.isArray(detail.inventory.properties)
        ? detail.inventory.properties
        : [];

    if (!properties.length) return null;

    var section = el("div", "etsy-quick-options", "");
    section.appendChild(el("h3", "", "Choose options"));

    properties.forEach(function (property) {
      var group = el("label", "etsy-quick-field", "");
      var label = el("span", "etsy-quick-label", property.name);
      var select = document.createElement("select");
      select.className = "etsy-quick-select";
      select.setAttribute("data-property-id", String(property.id));

      (property.values || []).forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      select.addEventListener("change", onChange);
      group.appendChild(label);
      group.appendChild(select);
      section.appendChild(group);
      controls[String(property.id)] = select;
    });

    return section;
  }

  function renderPersonalization(detail, traits) {
    /*
      We deliberately DO NOT collect personalization text on this website.
      Etsy is the final commerce system, so asking the buyer to type it here
      and then again on Etsy creates a confusing duplicate step.

      Tres Amigos shop rule:
      - signed books: personalization is available and completed on Etsy
      - unsigned books: no personalization message at all
      - other Etsy items: if Etsy marks them personalizable, explain that the
        personalization is completed on Etsy
    */
    if (traits.bookProduct && !traits.signed) {
      return null;
    }

    var questions = Array.isArray(detail.personalization)
      ? detail.personalization
      : [];

    var available =
      traits.signed ||
      (!traits.bookProduct && (traits.personalized || questions.length > 0));

    if (!available) {
      return null;
    }

    var section = el("div", "etsy-quick-personalization etsy-quick-personalization-note", "");
    section.appendChild(
      el(
        "h3",
        "",
        traits.bookProduct
          ? "Personalization available"
          : "Personalization available"
      )
    );

    section.appendChild(
      el(
        "p",
        "etsy-quick-help",
        traits.bookProduct
          ? "Add your personal message on Etsy before checkout."
          : "Complete the personalization details on Etsy before checkout."
      )
    );

    return section;
  }

  function renderQuickShop(detail, catalogListing) {
    var content = document.getElementById("etsy-quick-shop-content");
    if (!content) return;
    content.innerHTML = "";

    var traits = listingTraits(detail);
    var controls = {};

    var variants =
      detail.inventory && Array.isArray(detail.inventory.variants)
        ? detail.inventory.variants
        : [];

    var availableVariants = variants.filter(function (variant) {
      return Number(variant.quantity || 0) > 0;
    });

    var state = {
      variant: availableVariants[0] || variants[0] || null
    };

    var layout = el("div", "etsy-quick-layout", "");
    layout.appendChild(makeGallery(detail, traits));

    var info = el("div", "etsy-quick-info", "");
    info.appendChild(el("p", "kicker", kickerLabel(traits)));

    var title = el("h2", "", decodeText(detail.title));
    title.id = "etsy-quick-shop-title";
    info.appendChild(title);

    var price = el(
      "div",
      "etsy-quick-price",
      money(
        state.variant && state.variant.price
          ? state.variant.price
          : detail.price
      )
    );
    info.appendChild(price);

    if (detail.description) {
      info.appendChild(
        el(
          "p",
          "etsy-quick-description",
          decodeText(detail.description)
        )
      );
    }

    function syncControlsToVariant() {
      if (!state.variant) return;
      (state.variant.attributes || []).forEach(function (attribute) {
        var select = controls[propertyKey(attribute)];
        if (select) select.value = attribute.value;
      });
    }

    function findVariantFromControls() {
      if (!variants.length) return null;

      return (
        variants.find(function (variant) {
          return Object.keys(controls).every(function (propertyId) {
            return (
              variantValue(variant, propertyId) ===
              controls[propertyId].value
            );
          });
        }) || null
      );
    }

    var availability = el("p", "etsy-quick-stock", "");

    var buyButton = el(
      "a",
      "btn btn-dark etsy-quick-finish",
      "Buy On Etsy"
    );
    buyButton.href = detail.url || catalogListing.url;
    buyButton.target = "_blank";
    buyButton.rel = "sponsored noopener";
    buyButton.setAttribute(
      "aria-label",
      "Buy On Etsy: " + decodeText(detail.title)
    );

    function updateCompatibility() {
      var propertyIds = Object.keys(controls);

      propertyIds.forEach(function (propertyId) {
        var select = controls[propertyId];
        Array.prototype.forEach.call(
          select.options,
          function (option) {
            var possible = variants.some(function (variant) {
              if (Number(variant.quantity || 0) <= 0) return false;

              return propertyIds.every(function (otherId) {
                var desired =
                  otherId === propertyId
                    ? option.value
                    : controls[otherId].value;

                return (
                  !desired ||
                  variantValue(variant, otherId) === desired
                );
              });
            });

            option.disabled = !possible;
          }
        );
      });
    }

    function updateState() {
      var matched = findVariantFromControls();
      if (matched) state.variant = matched;

      var stock = state.variant
        ? Number(state.variant.quantity || 0)
        : Number(detail.quantity || 0);

      var selectedPrice =
        state.variant && state.variant.price
          ? state.variant.price
          : detail.price;

      price.textContent = money(selectedPrice);

      if (stock > 0) {
        availability.textContent =
          stock <= 5 ? "Only " + stock + " left" : "In stock";
        availability.classList.remove("is-sold-out");
        buyButton.classList.remove("is-disabled");
        buyButton.setAttribute("aria-disabled", "false");
      } else {
        availability.textContent = "This option is sold out";
        availability.classList.add("is-sold-out");
        buyButton.classList.add("is-disabled");
        buyButton.setAttribute("aria-disabled", "true");
      }

      updateCompatibility();
    }

    var optionsSection = renderVariationControls(
      detail,
      state,
      controls,
      updateState
    );

    if (optionsSection) {
      info.appendChild(optionsSection);
      syncControlsToVariant();
    }

    info.appendChild(availability);

    var personalizationSection = renderPersonalization(
      detail,
      traits
    );
    if (personalizationSection) {
      info.appendChild(personalizationSection);
    }

    var actions = el("div", "etsy-quick-actions", "");
    actions.appendChild(buyButton);
    info.appendChild(actions);

    var handoffNote = el(
      "p",
      "etsy-quick-handoff-note",
      optionsSection
        ? "You’ll confirm your option and quantity on Etsy before payment."
        : "You’ll confirm quantity on Etsy before payment."
    );
    info.appendChild(handoffNote);

    var trust = el(
      "p",
      "etsy-quick-trust",
      "Secure checkout & payment handled by Etsy."
    );
    info.appendChild(trust);

    buyButton.addEventListener("click", function (event) {
      if (buyButton.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });

    updateState();

    layout.appendChild(info);
    content.appendChild(layout);
  }


  function bookFeatureOrder(listing) {
    var traits = listingTraits(listing);
    if (!traits.bookProduct) return 9999;

    var isBookOne = !traits.faultLines;
    var score = 0;

    /*
      Featured order:
      Book One unsigned
      Fault Lines unsigned
      unsigned two-book sets
      Book One signed
      Fault Lines signed
      signed two-book sets
      then any future book-format products.
    */
    if (traits.bundle && !traits.signed) score = 30;
    else if (traits.bundle && traits.signed) score = 60;
    else if (isBookOne && !traits.signed) score = 10;
    else if (traits.faultLines && !traits.signed) score = 20;
    else if (isBookOne && traits.signed) score = 40;
    else if (traits.faultLines && traits.signed) score = 50;
    else score = 70;

    return score;
  }

  function sortFeaturedBooks(listings) {
    return listings.slice().sort(function (a, b) {
      var orderA = bookFeatureOrder(a);
      var orderB = bookFeatureOrder(b);

      if (orderA !== orderB) return orderA - orderB;

      return decodeText(a.title).localeCompare(
        decodeText(b.title)
      );
    });
  }

  function slugForSection(section) {
    return (
      "etsy-section-" +
      String(section.id || section.title || "collection")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  }

  function sectionHeader(kicker, title, copy) {
    var header = el("div", "etsy-section-heading", "");
    header.appendChild(el("p", "kicker", kicker));
    header.appendChild(el("h2", "", title));

    if (copy) {
      header.appendChild(
        el("p", "etsy-section-intro", copy)
      );
    }

    return header;
  }

  function renderFeaturedBooks(listings) {
    var books = sortFeaturedBooks(
      listings.filter(function (listing) {
        return listingTraits(listing).bookProduct;
      })
    );

    if (!books.length) return null;

    var section = el(
      "section",
      "etsy-featured-books",
      ""
    );
    section.id = "featured-books";

    section.appendChild(
      sectionHeader(
        "Start With The Story",
        "Featured Books",
        "Book One, Fault Lines, signed editions, and bundles stay right here at the top."
      )
    );

    var grid = el("div", "etsy-featured-grid", "");
    books.forEach(function (listing) {
      grid.appendChild(makeCard(listing, "featured"));
    });

    section.appendChild(grid);
    return section;
  }

  function collectionRows(listings, sections) {
    var merchandise = listings.filter(function (listing) {
      return !listingTraits(listing).bookProduct;
    });

    if (!merchandise.length) {
      return [];
    }

    var sectionMap = {};
    (sections || []).forEach(function (section) {
      sectionMap[String(section.id)] = {
        section: section,
        listings: []
      };
    });

    var unsectioned = [];

    merchandise.forEach(function (listing) {
      var key = listing.sectionId
        ? String(listing.sectionId)
        : "";

      if (key && sectionMap[key]) {
        sectionMap[key].listings.push(listing);
      } else {
        unsectioned.push(listing);
      }
    });

    var rows = (sections || [])
      .map(function (section) {
        return sectionMap[String(section.id)];
      })
      .filter(function (entry) {
        return entry && entry.listings.length;
      });

    if (unsectioned.length) {
      rows.push({
        section: {
          id: "other",
          title: rows.length ? "More From Tres Amigos" : "Shop The Collection",
          rank: 99999
        },
        listings: unsectioned
      });
    }

    /*
      If Etsy has no Shop Sections yet, everything simply becomes one
      collection row. As soon as sections are created in Etsy, the next
      API refresh automatically reorganizes the page.
    */
    if (!rows.length && merchandise.length) {
      rows.push({
        section: {
          id: "all",
          title: "Shop The Collection",
          rank: 99999
        },
        listings: merchandise
      });
    }

    return rows;
  }

  function renderCollectionNavigation(rows) {
    if (!rows.length) return null;

    var wrap = el(
      "nav",
      "etsy-collection-nav",
      ""
    );
    wrap.setAttribute("aria-label", "Shop collections");

    rows.forEach(function (row) {
      var link = el(
        "a",
        "etsy-collection-chip",
        decodeText(row.section.title)
      );
      link.href = "#" + slugForSection(row.section);
      wrap.appendChild(link);
    });

    return wrap;
  }

  function renderCollectionRow(row) {
    var section = el(
      "section",
      "etsy-collection-section",
      ""
    );
    section.id = slugForSection(row.section);

    var heading = el(
      "div",
      "etsy-collection-row-heading",
      ""
    );

    var titleWrap = el("div", "", "");
    titleWrap.appendChild(
      el("p", "kicker", "Shop The Collection")
    );
    titleWrap.appendChild(
      el("h2", "", decodeText(row.section.title))
    );

    heading.appendChild(titleWrap);
    heading.appendChild(
      el(
        "span",
        "etsy-collection-count",
        row.listings.length +
          (row.listings.length === 1 ? " item" : " items")
      )
    );

    section.appendChild(heading);

    var scrollerWrap = el(
      "div",
      "etsy-collection-scroller-wrap",
      ""
    );

    var scroller = el(
      "div",
      "etsy-collection-scroller",
      ""
    );

    row.listings.forEach(function (listing) {
      scroller.appendChild(
        makeCard(listing, "collection")
      );
    });

    scrollerWrap.appendChild(scroller);
    section.appendChild(scrollerWrap);

    return section;
  }

  function renderCatalog(data) {
    root.classList.remove("is-loading");
    root.innerHTML = "";

    var listings = data.listings || [];
    var sections = Array.isArray(data.sections)
      ? data.sections
      : [];

    var featured = renderFeaturedBooks(listings);
    if (featured) root.appendChild(featured);

    var rows = collectionRows(listings, sections);

    if (rows.length) {
      var collectionArea = el(
        "div",
        "etsy-collections-area",
        ""
      );

      collectionArea.appendChild(
        sectionHeader(
          "Beyond The Books",
          "Shop The Collection",
          "Browse the rest of the collection by category."
        )
      );

      var nav = renderCollectionNavigation(rows);
      if (nav) collectionArea.appendChild(nav);

      rows.forEach(function (row) {
        collectionArea.appendChild(
          renderCollectionRow(row)
        );
      });

      root.appendChild(collectionArea);
    }
  }

  function fallback(message) {
    root.classList.remove("is-loading");
    root.innerHTML = "";

    var box = el("div", "etsy-catalog-fallback", "");
    box.appendChild(
      el("h3", "", "Shop the official Etsy collection")
    );
    box.appendChild(
      el(
        "p",
        "",
        message ||
          "Our live Etsy shelf is taking a coffee break, but the Etsy shop is still open."
      )
    );

    var link = el("a", "btn", "Shop on Etsy");
    link.href = shopURL;
    link.target = "_blank";
    link.rel = "sponsored noopener";
    box.appendChild(link);

    root.appendChild(box);
    if (status) {
      status.textContent = "Secure checkout is handled by Etsy.";
    }
  }

  fetch("/api/etsy/catalog", {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin"
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Catalog request failed");
      return response.json();
    })
    .then(function (data) {
      if (
        !data ||
        !Array.isArray(data.listings) ||
        !data.listings.length
      ) {
        fallback(
          "The live catalog is empty right now. You can still shop every current listing directly on Etsy."
        );
        return;
      }

      renderCatalog(data);

      if (status) {
        var sectionCount = Array.isArray(data.sections)
          ? data.sections.length
          : 0;

        status.textContent =
          data.listings.length +
          (data.listings.length === 1
            ? " live product"
            : " live products") +
          (sectionCount
            ? " · " + sectionCount + " collections"
            : "") +
          " · Quick Shop available · secure checkout by Etsy";
      }
    })
    .catch(function () {
      fallback(
        "Our live Etsy shelf could not load right now. The Etsy shop itself is still open."
      );
    });
})();
