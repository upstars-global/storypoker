// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'import/first': 'warn',
    'no-empty': 'warn',
    'no-empty-pattern': 'warn',
    'vue/multi-word-component-names': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-dynamic-delete': 'warn',
    '@typescript-eslint/no-unsafe-function-type': 'warn',
    '@typescript-eslint/unified-signatures': 'warn',
  },
})
