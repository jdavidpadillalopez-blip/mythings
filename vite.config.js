import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/, so every asset URL
// needs that /<repo>/ prefix. The deploy workflow (.github/workflows/deploy.yml) passes the repo
// name in as BASE_PATH at build time; locally (npm run dev/build) it's unset, so base falls back
// to '/' and nothing changes for local dev.
const base = process.env.BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration is done manually in main.jsx (via the `virtual:pwa-register` import) instead of
      // the plugin's auto-injected script, so we can force an update check on load and periodically
      // thereafter — see the comment there for why that's necessary on GitHub Pages.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Finanzas USD → COP',
        short_name: 'Finanzas',
        description: 'Ingresos en dólares, gastos en pesos colombianos, deudas, bolsillos y reportes.',
        theme_color: '#022c22',
        background_color: '#020617',
        display: 'standalone',
        // Relative rather than hardcoded '/' so the manifest resolves correctly under the
        // /<repo>/ subpath GitHub Pages uses instead of only working at a domain root.
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // A waiting new service worker normally sits idle until every tab using the old one closes
        // (skipWaiting) and only controls tabs opened after it activates (clientsClaim). Combined,
        // these make a freshly deployed version take over immediately instead of requiring the user
        // to fully quit and reopen the browser — this is what caused the site to keep showing an
        // old, already-fixed bug after deploys before this change.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Cache-first for the built static assets so the app opens (and its last-loaded data
        // renders) with no network at all after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => ['style', 'script', 'image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
