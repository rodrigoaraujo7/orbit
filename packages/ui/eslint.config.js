import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import stylistic from "@stylistic/eslint-plugin"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", "coverage", "src/test/**", "**/*.test.ts", "**/*.test.tsx"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/quotes": [
        "error",
        "double",
        { avoidEscape: true, allowTemplateLiterals: "avoidEscape" },
      ],
      "@stylistic/jsx-quotes": ["error", "prefer-double"],
    },
  },
])
