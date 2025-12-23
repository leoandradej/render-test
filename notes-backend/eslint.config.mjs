import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
      ecmaVersion: 'latest',
    },
    rules: {
      eqeqeq: 'error',
      'no-trailing-spaces': 'error',
      'no-console': 'off',
    },
  },
  prettier,
  {
    ignores: ['dist/**'],
  },
];
