# Tres Amigos, Una Vida — Secure Etsy + Cloudflare Deployment

## Architecture

Visitor → Cloudflare → existing GitHub Pages website

- GitHub remains the source of truth for normal website files and future updates.
- Cloudflare proxies the public `www` hostname and runs a Worker before GitHub Pages.
- Normal requests continue to GitHub Pages.
- `/api/etsy/catalog` is handled inside the Worker.
- Etsy credentials live only as encrypted Cloudflare Worker secrets.
- Checkout continues on Etsy.

## First-time setup

1. Make sure `tresamigosunavida.com` exists as an active Cloudflare zone.
2. Make sure the `www` DNS record still points to the GitHub Pages origin and is **Proxied** (orange cloud).
3. Push this build to GitHub with `DEPLOY_TRES_AMIGOS_V2.command`.
4. Run `SETUP_CLOUDFLARE.command` once.
5. Paste the Etsy keystring when prompted.
6. Paste the Etsy shared secret into the hidden prompt. It is sent straight to Cloudflare and is never written into the repo.

If the domain is not using Cloudflare nameservers yet, that is the one registrar/DNS onboarding step Bash cannot safely perform for you without registrar credentials. Complete the Cloudflare zone activation first, then rerun the setup script.

## Future website updates

Nothing changes about the normal workflow. Keep pushing website files to the GitHub repository. Cloudflare continues serving/protecting the domain and passes requests through to the current GitHub Pages origin.

You only need to rerun the Cloudflare setup when the Worker itself changes or its secrets need to be rotated.

## Etsy API behavior

The public shop page requests `/api/etsy/catalog` from the same domain. Cloudflare privately calls Etsy with the app keystring and shared secret, returns only storefront-safe fields, and caches the result for 15 minutes. Browser source never receives the Etsy credentials.
