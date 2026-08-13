import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
    // The chat surface talks to the API server, which holds the Anthropic key.
    proxy: {
      '/api': {
        target: process.env.BLAYNE_API_URL ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
