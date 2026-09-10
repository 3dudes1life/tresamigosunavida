# Tres Amigos, Una Vida — Cloudflare Edge

This Worker sits in front of the existing GitHub Pages origin. GitHub remains the publishing source; Cloudflare becomes the public security/edge layer.

## What it does

- Passes normal website requests through to the existing GitHub Pages origin.
- Adds security headers to every public website response.
- Serves `GET /api/etsy/catalog` from the Etsy Open API without exposing Etsy credentials to browser JavaScript or GitHub.
- Caches the Etsy catalog at the edge for 15 minutes, reducing Etsy API usage.
- Rejects unknown `/api/*` paths.

## Secrets

These must exist only in Cloudflare Worker Secrets:

- `ETSY_KEYSTRING`
- `ETSY_SHARED_SECRET`

Never commit either value to GitHub, `.env`, `.dev.vars`, JavaScript, HTML, screenshots in the repo, or documentation.

## One-time requirement

The `www` DNS record must be proxied through Cloudflare (orange cloud) because this Worker uses a Route in front of the existing GitHub Pages origin.

Use `../../SETUP_CLOUDFLARE.command` for first-time deployment.
