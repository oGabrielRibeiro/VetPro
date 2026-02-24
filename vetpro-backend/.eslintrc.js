module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'warn',
    'no-restricted-syntax': 'off',
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['doc', 'req', 'acc'],
      },
    ],
    'no-nested-ternary': 'off',
    'no-continue': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['**/*.test.js', '**/*.spec.js', '/jest.config.js'] },
    ],
    // Allow require() for optional dependencies (OAuth, etc)
    'import/no-unresolved': 'off',
  },
};
