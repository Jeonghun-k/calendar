import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: '공유 캘린더',
        short_name: '공유캘린더',
        description: '가족이 함께 쓰는 모바일 캘린더',
        theme_color: '#f8f8fb',
        background_color: '#f8f8fb',
        display: 'standalone',
        start_url: mode === 'production' ? '/Calander-antigravity/' : '/',
        scope: mode === 'production' ? '/Calander-antigravity/' : '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  // GitHub Pages project site base path
  base: mode === 'production' ? '/Calander-antigravity/' : '/',
}))
