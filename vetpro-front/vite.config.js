import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("framer-motion") ||
            id.includes("@radix-ui") ||
            id.includes("react-compare-image")
          ) {
            return "vendor-ui";
          }

          if (id.includes("recharts") || id.includes("exceljs")) {
            return "vendor-analytics";
          }

          return "vendor-core";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
