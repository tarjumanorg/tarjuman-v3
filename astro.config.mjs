// @ts-check
import { defineConfig, envField } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import { isPrivatePath } from './src/lib/private-paths.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://tarjuman.org',
  trailingSlash: 'never',
  // Pages serves privacy.html at /privacy and redirects /privacy/ to it; directory format would do the reverse.
  build: { format: 'file' },
  integrations: [
    svelte(),
    sitemap({
      // Prerendered pages arrive with a trailing slash or .html and on-demand routes without; keep one URL each.
      filter: (page) => !isPrivatePath(new URL(page).pathname),
      serialize: (() => {
        const seen = new Set();
        return (item) => {
          const url = new URL(item.url);
          if (url.pathname !== '/') url.pathname = url.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
          if (seen.has(url.href)) return undefined;
          seen.add(url.href);
          item.url = url.href;
          return item;
        };
      })(),
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
      SENDER_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
    }
  }
});