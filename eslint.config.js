// Basic ESLint config for a Next.js/React/TypeScript project
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import next from '@next/eslint-plugin-next';

export default [
  js.configs.recommended,
  tseslint.configs.recommended,
  react.configs.recommended,
  next.configs.recommended,
  {
    rules: {
      // You can add custom rules here
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
];
