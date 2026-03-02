import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: './',
  server: {
    port: 5176,
    strictPort: true,
  },
  plugins: [
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      overrides: { crypto: 'crypto-browserify' },
    }),
    react(),
  ],
  resolve: {
    alias: {
      global: 'global',
      undici: resolve(__dirname, 'node_modules/opnet/src/fetch/fetch-browser.js'),
    },
    mainFields: ['module', 'main', 'browser'],
    dedupe: [
      '@noble/curves',
      '@noble/hashes',
      '@scure/base',
      'buffer',
      'react',
      'react-dom',
    ],
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
