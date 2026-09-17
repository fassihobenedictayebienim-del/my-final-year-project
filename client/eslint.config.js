import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Context providers deliberately export a hook alongside their component.
      'react-refresh/only-export-components': 'off',
      // Error objects are kept in catch clauses where a detailed API error may
      // later be surfaced; an underscore makes that intent explicit.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Data-loading effects call asynchronous functions; this rule incorrectly
      // treats those calls as synchronous state updates.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
