/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // §15.1 offline/installability, §13.5 caching strategy per asset type.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Nihongo Trail',
        short_name: 'Nihongo Trail',
        description:
          'A local-first, offline-capable Japanese learning app — Duolingo-style lessons plus FSRS spaced repetition.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell: precached, cache-first (Workbox's default for the
        // precache manifest it generates from the build output).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            // manifest.json: network-first so content updates are picked
            // up, falling back to cache when offline (§13.5).
            urlPattern: /\/content\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'content-manifest' },
          },
          {
            // Content shards: stale-while-revalidate (§13.5).
            urlPattern: /\/content\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'content-shards' },
          },
          {
            // Audio: cache-first, indefinite (§13.5) — TTS files never
            // change once generated for a given content version.
            urlPattern: /\/audio\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx', 'tests/integration/**/*.spec.ts'],
    globals: true,
  },
})
