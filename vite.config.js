import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the build works under the
// GitHub Pages project path (https://brs8857.github.io/FM.web/).
export default defineConfig({
  plugins: [react()],
  base: "./",
  json: { stringify: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}", "tests/unit/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"],
  },
});
