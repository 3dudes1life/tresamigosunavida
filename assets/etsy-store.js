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
      if (traits.bundle && traits.signed) return "Personalize Signed Set";
      if (traits.bundle) return "Choose the Set";
      if (traits.signed) return "Personalize & Buy";
      return "Choose Paperback";
    }
    if (traits.personalized) return "Personalize & Buy";
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

  function makeCard(listing) {
    var traits = listingTraits(listing);
    var titleText = decodeText(listing.title);
    var descriptionText = decodeText(listing.description);
    var actionText = cardActionLabel(traits);
    var image = preferredImage(listing, traits);

    var cardClass = "etsy-product-card";
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

  function renderPersonalization(detail, traits, answers) {
    if (traits.bookProduct && !traits.signed) {
      return null;
    }

    var questions = Array.isArray(detail.personalization)
      ? detail.personalization
      : [];

    var shouldPersonalize =
      traits.signed || (!traits.bookProduct && questions.length > 0);

    if (!shouldPersonalize) return null;

    var section = el("div", "etsy-quick-personalization", "");
    section.appendChild(
      el(
        "h3",
        "",
        traits.bookProduct ? "Personalize your signed book" : "Personalization"
      )
    );

    if (!questions.length && traits.signed) {
      section.appendChild(
        el(
          "p",
          "etsy-quick-help",
          "Personalization is available for this signed book. Etsy will show the final personalization field before you add it to your cart."
        )
      );
      return section;
    }

    questions.forEach(function (question, index) {
      var key = String(question.id || "q" + index);
      var group = el("label", "etsy-quick-field", "");
      var labelText =
        decodeText(question.text) +
        (question.required ? " *" : "");
      group.appendChild(el("span", "etsy-quick-label", labelText));

      if (question.instructions) {
        group.appendChild(
          el(
            "span",
            "etsy-quick-help",
            decodeText(question.instructions)
          )
        );
      }

      if (question.type === "dropdown") {
        var select = document.createElement("select");
        select.className = "etsy-quick-select";
        select.setAttribute("data-personalization-key", key);

        var empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Choose an option";
        select.appendChild(empty);

        (question.options || []).forEach(function (option) {
          var item = document.createElement("option");
          item.value = decodeText(option.label);
          item.textContent = decodeText(option.label);
          select.appendChild(item);
        });

        select.required = Boolean(question.required);
        select.addEventListener("change", function () {
          answers[key] = {
            label: decodeText(question.text),
            value: select.value,
            required: Boolean(question.required)
          };
        });
        group.appendChild(select);
      } else if (
        question.type === "unlabeled_upload" ||
        question.type === "labeled_upload"
      ) {
        group.appendChild(
          el(
            "div",
            "etsy-quick-upload-note",
            "Etsy requires this file upload to be completed on its site."
          )
        );
        answers[key] = {
          label: decodeText(question.text),
          value: "Complete file upload on Etsy",
          required: Boolean(question.required),
          etsyOnly: true
        };
      } else {
        var input = document.createElement("textarea");
        input.className = "etsy-quick-textarea";
        input.rows = 3;
        input.placeholder = "Enter personalization";
        input.required = Boolean(question.required);

        if (question.maxCharacters) {
          input.maxLength = question.maxCharacters;
        }

        var counter = el("span", "etsy-quick-counter", "");
        function updateText() {
          answers[key] = {
            label: decodeText(question.text),
            value: input.value.trim(),
            required: Boolean(question.required)
          };
          if (question.maxCharacters) {
            counter.textContent =
              input.value.length +
              " / " +
              question.maxCharacters;
          }
        }

        input.addEventListener("input", updateText);
        updateText();

        group.appendChild(input);
        if (question.maxCharacters) group.appendChild(counter);
      }

      section.appendChild(group);
    });

    return section;
  }

  function selectionSummary(detail, state, answers) {
    var lines = ["Item: " + decodeText(detail.title)];

    if (state.variant && state.variant.attributes) {
      state.variant.attributes.forEach(function (attribute) {
        if (attribute.value) {
          lines.push(
            decodeText(attribute.name) + ": " + decodeText(attribute.value)
          );
        }
      });
    }

    lines.push("Quantity: " + state.quantity);

    Object.keys(answers).forEach(function (key) {
      var answer = answers[key];
      if (answer && answer.value) {
        lines.push(
          decodeText(answer.label || "Personalization") +
            ": " +
            decodeText(answer.value)
        );
      }
    });

    return lines.join("\n");
  }

  function validatePersonalization(answers) {
    var keys = Object.keys(answers);
    for (var i = 0; i < keys.length; i += 1) {
      var answer = answers[keys[i]];
      if (
        answer &&
        answer.required &&
        !answer.etsyOnly &&
        !String(answer.value || "").trim()
      ) {
        return false;
      }
    }
    return true;
  }

  function copyChoices(text, messageNode) {
    if (!text || !navigator.clipboard || !window.isSecureContext) {
      return Promise.resolve(false);
    }

    return navigator.clipboard
      .writeText(text)
      .then(function () {
        if (messageNode) {
          messageNode.textContent =
            "Your choices were copied. Etsy may ask you to confirm or paste them before payment.";
        }
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function renderQuickShop(detail, catalogListing) {
    var content = document.getElementById("etsy-quick-shop-content");
    if (!content) return;
    content.innerHTML = "";

    var traits = listingTraits(detail);
    var answers = {};
    var controls = {};

    var variants =
      detail.inventory && Array.isArray(detail.inventory.variants)
        ? detail.inventory.variants
        : [];

    var availableVariants = variants.filter(function (variant) {
      return Number(variant.quantity || 0) > 0;
    });

    var state = {
      variant: availableVariants[0] || variants[0] || null,
      quantity: 1
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

    var quantityGroup = el("label", "etsy-quick-field", "");
    quantityGroup.appendChild(
      el("span", "etsy-quick-label", "Quantity")
    );
    var quantityInput = document.createElement("input");
    quantityInput.className = "etsy-quick-quantity";
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.value = "1";
    quantityGroup.appendChild(quantityInput);

    var finalButton = el(
      "a",
      "btn btn-dark etsy-quick-finish",
      "Finish Securely on Etsy"
    );
    finalButton.href = detail.url || catalogListing.url;
    finalButton.target = "_blank";
    finalButton.rel = "sponsored noopener";

    var clipboardMessage = el(
      "p",
      "etsy-quick-handoff-note",
      "Etsy handles the final cart and payment. Because Etsy does not let this Seller App act as a shopper, Etsy will ask you to confirm any options or personalization there."
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
        quantityInput.max = String(stock);
        quantityInput.disabled = false;

        if (Number(quantityInput.value || 1) > stock) {
          quantityInput.value = String(stock);
        }

        state.quantity = Math.max(
          1,
          Math.min(stock, Number(quantityInput.value || 1))
        );

        finalButton.classList.remove("is-disabled");
        finalButton.setAttribute("aria-disabled", "false");
      } else {
        availability.textContent = "This option is sold out";
        availability.classList.add("is-sold-out");
        quantityInput.disabled = true;
        finalButton.classList.add("is-disabled");
        finalButton.setAttribute("aria-disabled", "true");
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
    info.appendChild(quantityGroup);

    var personalizationSection = renderPersonalization(
      detail,
      traits,
      answers
    );
    if (personalizationSection) {
      info.appendChild(personalizationSection);
    }

    quantityInput.addEventListener("input", function () {
      var max = Number(quantityInput.max || detail.quantity || 1);
      var value = Number(quantityInput.value || 1);
      state.quantity = Math.max(1, Math.min(max, value));
    });

    var actions = el("div", "etsy-quick-actions", "");
    actions.appendChild(finalButton);

    var copyButton = el(
      "button",
      "etsy-quick-copy",
      "Copy My Choices"
    );
    copyButton.type = "button";
    copyButton.addEventListener("click", function () {
      copyChoices(
        selectionSummary(detail, state, answers),
        clipboardMessage
      );
    });
    actions.appendChild(copyButton);

    info.appendChild(actions);
    info.appendChild(clipboardMessage);

    var trust = el(
      "p",
      "etsy-quick-trust",
      "Your payment information never touches TresAmigosUnaVida.com. Etsy securely handles checkout."
    );
    info.appendChild(trust);

    finalButton.addEventListener("click", function (event) {
      var disabled =
        finalButton.getAttribute("aria-disabled") === "true";

      if (disabled) {
        event.preventDefault();
        return;
      }

      if (!validatePersonalization(answers)) {
        event.preventDefault();
        clipboardMessage.textContent =
          "Please complete the required personalization field before continuing.";
        var required = info.querySelector(
          ".etsy-quick-personalization textarea:required:invalid, .etsy-quick-personalization select:required:invalid"
        );
        if (required) required.focus();
        return;
      }

      /*
        Best possible Seller App handoff:
        Copy the exact choices so the buyer has them ready when Etsy asks
        for its required final confirmation. We do NOT pretend selections
        can be silently injected into Etsy checkout.
      */
      copyChoices(
        selectionSummary(detail, state, answers),
        clipboardMessage
      );
    });

    updateState();

    layout.appendChild(info);
    content.appendChild(layout);
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

      root.classList.remove("is-loading");
      root.innerHTML = "";

      data.listings.forEach(function (listing) {
        root.appendChild(makeCard(listing));
      });

      if (status) {
        status.textContent =
          data.listings.length +
          (data.listings.length === 1
            ? " live product"
            : " live products") +
          " · quick shop here · final payment on Etsy";
      }
    })
    .catch(function () {
      fallback(
        "Our live Etsy shelf could not load right now. The Etsy shop itself is still open."
      );
    });
})();
