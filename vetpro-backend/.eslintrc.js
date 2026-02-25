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
        ignorePropertyModificationsFor: ['doc', 'req', 'acc', 'socket'],
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
    // Disable class-methods-use-this for services
    'class-methods-use-this': 'off',
    // Disable global-require for conditional requires
    'global-require': 'off',
    // Disable consistent-return for middleware
    'consistent-return': 'off',
    // Allow no-useless-escape
    'no-useless-escape': 'off',
    // Allow no-return-await (handled by TypeScript eventually)
    'no-return-await': 'off',
    // Allow no-loop-func
    'no-loop-func': 'off',
    // Allow no-plus-plus
    'no-plus-plus': 'off',
    // Allow no-constant-condition
    'no-constant-condition': 'off',
  },
};
