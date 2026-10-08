import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Manifest colours are the white paper and the pitch green of the mark.
// start_url and scope stay relative for the Pages path.
export const manifest = {
  name: "Era XI",
  short_name: "Era XI",
  description: "Draft an XI from 34 years of the English top flight or ten of the Championship, one club-season at a time. Ratings hidden until kick-off.",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#FFFFFF",
  theme_color: "#007016",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

// base: "./" keeps asset paths relative so the build works under the
// GitHub Pages project path. `--mode standalone` inlines everything into
// dist/standalone/index.html with no service worker.
export default defineConfig(({ mode }) => {
  const standalone = mode === "standalone";
  return {
    plugins: [
      react(),
      VitePWA({
        disable: standalone,
        registerType: "prompt",
        manifest,
        includeAssets: ["icon.svg", "icons/apple-touch-icon.png"],
        workbox: { globPatterns: ["**/*.{js,css,html,json,png,svg,webmanifest,woff2}"], globIgnores: ["standalone/**"] },
      }),
      ...(standalone ? [viteSingleFile()] : []),
    ],
    base: "./",
    json: { stringify: true },
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: standalone ? { outDir: "dist/standalone" } : {},
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{js,jsx}", "tests/unit/**/*.test.{js,jsx}"],
      setupFiles: ["tests/setup.js"],
    },
  };
});
