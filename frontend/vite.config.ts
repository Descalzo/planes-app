import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Solo proxy si es llamada de API (Axios envía Accept: application/json)
// Las navegaciones del navegador envían Accept: text/html → se sirve la SPA
function apiOnly(req: { headers: Record<string, string | string[] | undefined> }) {
  const accept = (req.headers['accept'] as string) ?? '';
  if (accept.includes('text/html')) {
    return req.url as string;
  }
}

const backendProxy = {
  target: 'http://localhost:3000',
  changeOrigin: true,
  bypass: apiOnly,
};

const wsProxy = {
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true,
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon.svg'],
      manifest: {
        name: 'Planes',
        short_name: 'Planes',
        description: 'App para encontrar planes y actividades con otras personas',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache only app shell assets; all API/WS calls go to network
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
        runtimeCaching: [
          {
            // API calls — network-first, no cache
            urlPattern: /\/(users|activities|notifications)(\/|$)/,
            handler: 'NetworkOnly',
          },
          {
            // Socket.IO — never cache
            urlPattern: /\/socket\.io\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 4173,
    proxy: {
      '/users':        backendProxy,
      '/activities':   backendProxy,
      '/notifications': backendProxy,
      '/socket.io':    wsProxy,
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/users':        backendProxy,
      '/activities':   backendProxy,
      '/notifications': backendProxy,
      '/socket.io':    wsProxy,
    },
  },
});
