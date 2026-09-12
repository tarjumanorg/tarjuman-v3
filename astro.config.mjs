// @ts-check
import { defineConfig, envField } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://tarjuman.org',
  integrations: [
    svelte(),
    sitemap({
      filter: (page) =>
        !['/admin/', '/dashboard/', '/login/', '/checkout/process/', '/maintenance/'].some(
          (path) => page.includes(path)
        ),
    }),
  ],

  redirects: {
    '/order': '/',
    '/contact': '/',
    '/terms-of-service': '/terms',
  },

  vite: {
    plugins: [tailwindcss()]
  },

  // Allow external POST requests (e.g. from the Mayar webhook)
  security: {
    checkOrigin: false
  },

  output: 'server',

  adapter: cloudflare({
    imageService: 'compile',
  }),

  env: {
    schema: {
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      MAYAR_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      MAYAR_API_URL: envField.string({ context: "server", access: "secret", default: "https://api.mayar.club" }),
      MAYAR_WEBHOOK_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      SITE_URL: envField.string({ context: "server", access: "secret", default: "https://tarjuman.org" }),
      SENDPULSE_API_ID: envField.string({ context: "server", access: "secret", optional: true }),
      SENDPULSE_API_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      SENDPULSE_ID: envField.string({ context: "server", access: "secret", optional: true }),
      SENDPULSE_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
    }
  }
});