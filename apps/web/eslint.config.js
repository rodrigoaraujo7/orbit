import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui exports variants (cva) next to the component, TanStack Router
    // requires exporting `Route` from the route file, and stores export
    // Provider + hook together. Library patterns, not ours to "fix".
    files: [
      'src/components/ui/**/*.tsx',
      'src/routes/**/*.tsx',
      'src/lib/*-store.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
