// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'e2e/node_modules/*', '.expo/*', 'android/*', 'ios/*', 'coverage/*'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Jest mocks must be declared with require() inside jest.mock factories.
    files: ['src/__tests__/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Node CLI scripts (i18n check, locale builder).
    files: ['scripts/**/*.js', 'e2e/**/*.js'],
    languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
]);
