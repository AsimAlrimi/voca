import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // App shell, the bundled PDF.js worker (assets/*.js) and icons are precached for offline use.
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        // The PDF.js worker is ~1.1 MB; keep headroom above Workbox's 2 MB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Voca',
        short_name: 'Voca',
        description: 'Read PDF books, look up unfamiliar words, save them and practise them later.',
        start_url: '/voca/',
        scope: '/voca/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          {
            src: '/voca/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/voca/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  base: '/voca/'
})
