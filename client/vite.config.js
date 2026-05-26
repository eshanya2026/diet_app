import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Use 127.0.0.1 to avoid IPv6/localhost resolution issues; ECONNRESET often happens when the server restarts (e.g. --watch).
const API_TARGET = process.env.VITE_API_URL ?? 'http://127.0.0.1:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        timeout: 30000,
      },
    },
  },
});
