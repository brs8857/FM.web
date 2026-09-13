import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist/**", "standalone/**", "coverage/**", "playwright-report/**", "test-results/**", "tests/golden/**", "src/data/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.3" } },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/engine/**/*.js", "src/state/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["react", "react-dom", "react/*", "react-dom/*"], message: "engine/ and state/ must not import React." }],
      }],
    },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "no-restricted-properties": ["error", {
        object: "Math", property: "random",
        message: "Use an Rng from src/engine/rng.js so results replay from the career seed.",
      }],
    },
  },
];
