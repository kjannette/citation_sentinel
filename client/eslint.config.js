import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
    },
  },
];
