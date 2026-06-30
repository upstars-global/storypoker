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
  server: { host: 'localhost', port: 3001, strictPort: false },
  preview: { host: 'localhost', port: 3001, strictPort: false },
  build: { sourcemap: true },
})
