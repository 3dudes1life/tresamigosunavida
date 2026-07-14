# Tres Amigos, Una Vida — SEO Website Package

## What is included
- SEO-focused homepage
- Dedicated book, author, press, and buying pages
- Accurate Book structured data
- Canonical URLs
- Open Graph and X/Twitter sharing tags
- robots.txt
- sitemap.xml
- custom 404 page
- responsive shared stylesheet

## Important before publishing
1. Replace the existing website files with the contents of this folder.
2. Keep the domain set to https://tresamigosunavida.com.
3. Confirm the Amazon and official-store links are still correct.
4. Add the Google Search Console verification tag to every page template where indicated, or upload Google's HTML verification file to the site root.
5. Do not restore the old hidden zero-font SEO link.
6. Retire the old seo.html page. Best option: redirect it permanently to `/book.html`. If redirects are unavailable, replace it with a normal visible page containing:
   `<meta name="robots" content="noindex,follow">`
   and a canonical link to `/book.html`.

## Google Search Console setup
1. Open Google Search Console.
2. Add a **Domain property** for `tresamigosunavida.com`.
3. Verify ownership using the DNS TXT record Google provides.
4. Submit this sitemap:
   `https://tresamigosunavida.com/sitemap.xml`
5. Use URL Inspection on:
   - https://tresamigosunavida.com/
   - https://tresamigosunavida.com/book.html
   - https://tresamigosunavida.com/authors.html
   - https://tresamigosunavida.com/shop.html
6. Click **Request indexing** for each page after the new site is live.
7. Check **Pages**, **Sitemaps**, **Core Web Vitals**, and **Enhancements** weekly during the first month.

## SEO note
No website can guarantee first-page Google rankings. This package fixes the technical and on-page foundations so Google can understand, crawl, and present the book accurately. Rankings then grow through indexing, quality backlinks, press coverage, reviews, branded searches, and fresh useful content.

## Design revision
This edition intentionally restores the original book-site personality:
- coral-to-gold gradient
- Dancing Script headings
- original full-screen hero image
- white rounded purchase buttons
- original trio artwork
- centered, warm, celebratory layout

The SEO structure remains intact underneath the restored visual identity.
