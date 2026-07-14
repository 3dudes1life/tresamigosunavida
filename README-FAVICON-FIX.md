# Favicon Fix

The previous version declared two competing favicons on each page. Safari often selected the generated icon instead of the book cover.

This build removes the duplicate declarations and uses one consistent Book One cover-based icon across the entire website, including Safari tabs, Apple touch icons, and PWA icons.

After deployment, close any existing tabs and reopen the site. Safari may cache favicons aggressively; a private window or clearing website data will force the new icon immediately.
