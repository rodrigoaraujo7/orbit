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
    // shadcn/ui exporta variantes (cva) junto do componente, o TanStack
    // Router exige exportar `Route` no arquivo da rota e os stores exportam
    // Provider + hook juntos. Padrões das libs, não código nosso pra corrigir.
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
