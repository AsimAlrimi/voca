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
      manifest: {
        name: 'Voca',
        short_name: 'Voca',
        start_url: '/voca/',
        scope: '/voca/',
        display: 'standalone',
        background_color: '#18181b',
        theme_color: '#18181b',
        icons: [
          {
            src: '/voca/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/voca/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/voca/'
})