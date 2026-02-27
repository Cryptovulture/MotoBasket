import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  server: {
    port: 5176,
    strictPort: true,
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'crypto'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      undici: new URL('node_modules/opnet/dist/fetch-browser.js', import.meta.url).pathname,
    },
  },
  optimizeDeps: {
    exclude: ['crypto-browserify'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'crypto-libs': ['crypto-browserify', '@noble/hashes'],
          'opnet': ['opnet', '@btc-vision/transaction', '@btc-vision/bitcoin'],
          'react-ui': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
