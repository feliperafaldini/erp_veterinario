import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy para o backend NestJS. Usado tanto no `dev` quanto no `preview`,
// para que a demo publicada por túnel fale com a API na mesma origem.
const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // O host do túnel (trycloudflare) só é conhecido em runtime.
    allowedHosts: ['.trycloudflare.com'],
    proxy,
  },
  preview: {
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
    proxy,
  },
});
