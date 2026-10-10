import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/trpc': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 600000,
        proxyTimeout: 600000,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            req.setTimeout(0);
            if (req.socket) req.socket.setTimeout(0);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['connection'] = 'keep-alive';
            proxyRes.headers['cache-control'] = 'no-cache';
          });
        },
      },
    },
  },
});
