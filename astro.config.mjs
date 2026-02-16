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

  output: 'server',

  adapter: cloudflare({
    imageService: 'compile',
  }),

  env: {
    schema: {
      DUITKU_MERCHANT_CODE: envField.string({ context: "server", access: "secret" }),
      DUITKU_API_KEY: envField.string({ context: "server", access: "secret" }),
      DUITKU_BASE_URL: envField.string({ context: "server", access: "secret", default: "https://sandbox.duitku.com" }),
      SITE_URL: envField.string({ context: "server", access: "secret", default: "https://tarjuman.org" }),
    }
  }
});