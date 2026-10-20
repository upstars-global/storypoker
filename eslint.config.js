import vue from 'eslint-plugin-vue'
import vueTs from '@vue/eslint-config-typescript'

export default [
  ...vue.configs['flat/recommended'],
  ...vueTs(),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['app/components/AppIcon.vue'],
    rules: {
      'vue/no-v-html': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      '.netlify/**',
      '.nuxt/**',
      '.output/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
      '.agents/**',
    ],
  },
]
