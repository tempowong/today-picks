import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 43127,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3210",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
