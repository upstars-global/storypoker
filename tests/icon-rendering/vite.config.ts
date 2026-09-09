import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '../..')
const isMask = process.env.ICON_RENDERER === 'mask'

function stripRemoteFonts(): Plugin {
  return {
    name: 'icon-harness-strip-remote-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('main.css')) return null
      return code.replace(/@import url\((['"])https:\/\/fonts\.googleapis\.com[^)]*\1\);?/g, '')
    },
  }
}

export default defineConfig({
  root: import.meta.dirname,
  envDir: import.meta.dirname,
  plugins: [
    stripRemoteFonts(),
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Icon Rendering Harness',
        short_name: 'Icon Harness',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#212121',
        background_color: '#212121',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  resolve: {
    alias: [
      ...(isMask
        ? [
            { find: /^.*[/\\]AppIcon\.vue$/, replacement: resolve(import.meta.dirname, 'IconMask.vue') },
            {
              find: /^.*[/\\]registerLocalIcons(\.ts)?$/,
              replacement: resolve(import.meta.dirname, 'registerMaskIcons.ts'),
            },
          ]
        : []),
      { find: '~', replacement: resolve(projectRoot, 'app') },
      { find: '@', replacement: resolve(projectRoot, 'app') },
    ],
  },
  build: {
    sourcemap: true,
    outDir: resolve(projectRoot, `test-results/icon-rendering/dist-${isMask ? 'b' : 'a'}`),
    emptyOutDir: true,
  },
})
