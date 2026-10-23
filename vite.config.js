import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { allowedHosts: ["terminal.local"], host: "0.0.0.0", port: 4173 },
  build: { chunkSizeWarningLimit: 700 },
});
