import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import stylistic from "@stylistic/eslint-plugin"
import globals from "globals"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", "coverage", "**/*.test.ts"]),
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
    },
  },
])
