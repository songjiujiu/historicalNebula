import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Vite loads .env files for client code after evaluating this configuration.
  // Read the server-only target here as well, so dev/preview can use the existing API.
  const env = loadEnv(mode, process.cwd(), 'HISTORICAL_');
  const apiTarget = process.env.HISTORICAL_API_TARGET || env.HISTORICAL_API_TARGET || 'http://127.0.0.1:5000';
  return {
    // Keep the import corpus in public/data for reproducible ingestion, but never
    // serve or bundle it with the browser application.
    publicDir: 'public/site',
    server: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    build: {
      target: 'es2022',
      rollupOptions: { output: { manualChunks: (id) => id.includes('node_modules/three') ? 'three' : undefined } },
    },
  };
});
