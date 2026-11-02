import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": "/src",
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    exclude: [...configDefaults.exclude, "**/e2e/**"],
  },
});