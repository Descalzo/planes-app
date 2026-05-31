import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 4173,
    proxy: {
      '/users':      backendProxy,
      '/activities': backendProxy,
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/users':      backendProxy,
      '/activities': backendProxy,
    },
  },
});
