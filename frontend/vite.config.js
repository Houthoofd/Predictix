import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 600000, // 10 minutes timeout for streaming SSE scraper logs
        proxyTimeout: 600000, // 10 minutes proxy timeout
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            req.setTimeout(0);
            res.setTimeout(0);
            if (req.socket) {
              req.socket.setTimeout(0);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['connection'] = 'keep-alive';
            proxyRes.headers['cache-control'] = 'no-cache';
          });
        }
      },
    },
  },
});
