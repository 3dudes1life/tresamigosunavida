# Tres Amigos, Una Vida - Launch Infrastructure Build

## Major additions
- Google Analytics restored: `G-QS94RD8PPR`
- outbound click events for Amazon, Etsy, Shopify, Instagram, Book One, Book Two, and release-update intent
- accurate Fault Lines structured data with no false preorder claim
- `/series.html` with BookSeries schema and reading order
- `/release-updates.html` with owned email-intent flow and Instagram backup
- horizontal social preview images for homepage, Book One, Fault Lines, series, and authors
- local Book One cover file
- PWA manifest, icons, favicon, and Apple touch icon
- visible breadcrumbs plus BreadcrumbList schema
- updated sitemap
- cache-busted CSS and JavaScript

## Social preview files
- `assets/social-home.jpg`
- `assets/social-book-one.jpg`
- `assets/social-fault-lines.jpg`
- `assets/social-series.jpg`
- `assets/social-authors.jpg`

All are 1200 x 630 pixels.

## Release updates
Until a dedicated OneSignal or email-form endpoint is supplied, `/release-updates.html` uses an owned email-intent button that opens a prewritten request to:

`tresamigosunavida@gmail.com`

This can later be replaced without changing the page URL.

## Upload
Replace the repository root with the contents of this package, preserving the `assets/` folder.
After deployment, hard refresh Safari with Command + Option + R.
