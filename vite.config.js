import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const API_SERVER = 'https://property-management-1mlx.onrender.com';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Production builds ship no source maps and no console output, so nothing internal leaks to the browser.
  build: { sourcemap: false },
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    // In development, /api/... is sent to the live server, so the browser never hits a CORS block.
    proxy: { '/api': { target: API_SERVER, changeOrigin: true, secure: true } },
  },
}));
