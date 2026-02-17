// @ts-check
import { defineConfig, envField } from 'astro/config';

import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()]
  },

  // Allow external POST requests (e.g. from Duitku callback)
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
      DUITKU_MERCHANT_CODE: envField.string({ context: "server", access: "secret", optional: true }),
      DUITKU_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      DUITKU_BASE_URL: envField.string({ context: "server", access: "secret", default: "https://sandbox.duitku.com" }),
      SITE_URL: envField.string({ context: "server", access: "secret", default: "https://tarjuman.org" }),
    }
  }
});