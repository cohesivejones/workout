import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import importPlugin from 'eslint-plugin-import'
import a11yPlugin from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'build', 'coverage', 'server'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly'
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react': reactPlugin,
      'import': importPlugin,
      'jsx-a11y': a11yPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...a11yPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // We're using TypeScript for type checking
      'import/no-unresolved': 'off', // TypeScript takes care of this
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn instead of error
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
  },
)
