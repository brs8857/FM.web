import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// base: "./" keeps asset paths relative so the build works under the
// GitHub Pages project path (https://brs8857.github.io/FM.web/).
export default defineConfig({
  plugins: [react()],
  base: "./",
  json: { stringify: true },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}", "tests/unit/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"],
  },
});
