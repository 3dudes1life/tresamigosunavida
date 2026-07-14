(function () {
  "use strict";

  function eventNameForLink(link) {
    var href = (link.href || "").toLowerCase();
    if (href.indexOf("amazon.com") !== -1) return "click_amazon";
    if (href.indexOf("etsy.com") !== -1) return "click_etsy";
    if (href.indexOf("shopify.com") !== -1) return "click_shopify";
    if (href.indexOf("instagram.com") !== -1) return "click_instagram";
    if (href.indexOf("fault-lines.html") !== -1) return "view_book_two_cta";
    if (href.indexOf("book.html") !== -1) return "view_book_one_cta";
    if (href.indexOf("release-updates.html") !== -1 || href.indexOf("mailto:") === 0) return "release_update_intent";
    return "outbound_click";
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    var isOutbound = /^https?:\/\//i.test(href) && href.indexOf(location.hostname) === -1;
    var isTrackedInternal = /fault-lines\.html|book\.html|release-updates\.html/.test(href);
    if (!isOutbound && !isTrackedInternal && href.indexOf("mailto:") !== 0) return;

    if (typeof window.gtag === "function") {
      window.gtag("event", eventNameForLink(link), {
        link_url: link.href,
        link_text: (link.textContent || "").trim().slice(0, 100),
        page_location: location.href
      });
    }
  });
})();
