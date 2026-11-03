// @ts-check
import { defineConfig } from 'astro/config';

// Production runs on https://cartium.store (Vercel). SITE_URL and BASE_PATH let the same build run
// elsewhere, e.g. on GitHub Pages under /<repo>/ (the Pages workflow passes both).
const site = process.env.SITE_URL || 'https://cartium.store';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always',
  },
  image: {
    responsiveStyles: false,
  },
  devToolbar: { enabled: false },
});
