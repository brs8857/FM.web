import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build use relative asset paths, so it works whether
// it's deployed at the root of a domain or under a GitHub Pages project
// path like https://username.github.io/fm-web/ — no config needed either way.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
