import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';

const tsFiles = ['**/*.ts', '**/*.tsx'];

const typeCheckedConfig = [
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
].map((cfg) => ({
  ...cfg,
  files: tsFiles,
}));

export default defineConfig([
  { ignores: ['dist', 'node_modules', 'coverage', '.direnv', '.agent'] },

  // Base JS rules
  js.configs.recommended,

  // Global settings
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // React Rules
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // TS Rules & Customization
  ...typeCheckedConfig,
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },

  eslintConfigPrettier,
]);
