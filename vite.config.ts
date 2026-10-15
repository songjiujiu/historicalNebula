import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  const demoBase = process.env.HISTORICAL_DEMO_BASE || '/historicalNebula/';
  if (demo && (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(demoBase))) {
    throw new Error('HISTORICAL_DEMO_BASE must be / or a slash-terminated path such as /historicalNebula/.');
  }
  // Vite loads .env files for client code after evaluating this configuration.
  // Read the server-only target here as well, so dev/preview can use the existing API.
  const env = demo ? {} : loadEnv(mode, process.cwd(), 'HISTORICAL_');
  const apiTarget = process.env.HISTORICAL_API_TARGET || env.HISTORICAL_API_TARGET || 'http://127.0.0.1:5000';
  return {
    base: demo ? demoBase : '/',
    // Production contains UI assets only. The explicit demo packager separately
    // validates and copies a whitelist from public/data into dist-demo/data.
    publicDir: 'public/site',
    server: demo ? {} : {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: demo ? {} : {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    build: {
      outDir: demo ? 'dist-demo' : 'dist',
      target: 'es2022',
      rollupOptions: { output: { manualChunks: (id) => id.includes('node_modules/three') ? 'three' : undefined } },
    },
  };
});
