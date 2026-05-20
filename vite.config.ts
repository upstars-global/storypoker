import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  envDir: resolve(__dirname, '.env'),
  plugins: [vue()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app'),
    },
  },
  server: { host: true, port: 3000 },
  preview: { port: 3000 },
  build: { sourcemap: true },
})
