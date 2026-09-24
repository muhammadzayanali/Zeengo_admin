import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = (env.VITE_API_BASE_URL || 'https://zeengobackend-production-0cde.up.railway.app')
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
