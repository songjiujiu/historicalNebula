import { defineConfig } from 'vite';

export default defineConfig({
  // Keep the import corpus in public/data for reproducible ingestion, but never
  // serve or bundle it with the browser application.
  publicDir: 'public/site',
  server: {
    proxy: { '/api': { target: process.env.HISTORICAL_API_TARGET || 'http://127.0.0.1:5000', changeOrigin: true } },
  },
  preview: {
    proxy: { '/api': { target: process.env.HISTORICAL_API_TARGET || 'http://127.0.0.1:5000', changeOrigin: true } },
  },
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks: (id) => id.includes('node_modules/three') ? 'three' : undefined } },
  },
});
