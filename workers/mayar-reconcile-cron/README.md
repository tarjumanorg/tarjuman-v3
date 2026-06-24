# Mayar Reconcile Cron Worker

A standalone Cloudflare Worker that wakes up every 10 minutes and calls the
main app's `/api/mayar/reconcile` endpoint to catch any Mayar webhooks that
were missed. It is deployed separately from the main Astro app — Cloudflare
Cron Triggers require a `scheduled` handler, and the main app's
`@astrojs/cloudflare`-generated worker only exports `fetch`.

## Deploy

Run from inside this directory (not the project root):

```sh
wrangler deploy
```

## Manual setup (required before/after deploying)

1. Set `RECONCILE_URL` in `wrangler.jsonc` (`vars` block) to the real deployed
   reconcile endpoint URL (e.g. `https://tarjuman.org/api/mayar/reconcile`).
2. Run `wrangler secret put MAYAR_WEBHOOK_TOKEN` from inside this directory
   and paste in the same token value configured as `MAYAR_WEBHOOK_TOKEN` on
   the main app.
