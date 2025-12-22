import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // ✅ belangrijk voor v2.ethics-404.com (web-root = /v2 map)
});
