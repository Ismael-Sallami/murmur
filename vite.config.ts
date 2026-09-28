import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "./web",
  build: {
    outDir: "../frontend/dist",
    emptyOutDir: true,
  },
  server: {
    // Puerto propio para no chocar con otros proyectos Vite en 5173
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./web/src"),
    },
  },
});
