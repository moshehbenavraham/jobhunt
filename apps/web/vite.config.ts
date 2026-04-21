import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiOrigin = process.env.JOBHUNT_API_ORIGIN ?? 'http://127.0.0.1:4174';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    proxy: {
      '/api': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        target: apiOrigin,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
