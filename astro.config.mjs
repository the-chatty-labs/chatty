// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    // Cast to Vite's PluginOption to avoid cross-package type identity conflicts under pnpm
    plugins: [/** @type {import('vite').PluginOption} */ (tailwindcss())],
  },

  adapter: netlify(),
});
