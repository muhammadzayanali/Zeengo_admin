import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = (
    env.VITE_API_BASE_URL_LOCAL ||
    env.VITE_API_BASE_URL ||
    'http://127.0.0.1:3000'
  )
    .replace(/\/$/, '')
    .replace(/\/api\/v1$/i, '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: baseUrl,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
