// @lovable.dev/vite-tanstack-config already includes tanstackStart,
// viteReact, tailwindcss, tsConfigPaths, VITE_* env injection, the @ alias,
// React/TanStack dedupe, error logger plugins, and sandbox detection.
// Add only deployment-specific plugins here.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Redirect TanStack Start's bundled server entry to src/server.ts
// (our SSR error wrapper). Nitro builds this for Vercel.
export default defineConfig({
  cloudflare: false,
  plugins: [nitro()],
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 5173,
    },
  },
});
