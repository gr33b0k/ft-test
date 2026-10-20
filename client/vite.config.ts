import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const clientPort = Number(process.env.PORT) || 3000;
const serverPort = Number(process.env.SERVER_PORT) || 4000;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: clientPort,
    proxy: {
      "/api": `http://localhost:${serverPort}`,
    },
  },
});
