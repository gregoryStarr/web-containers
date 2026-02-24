/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/browser-ci-pipeline',
  server: {
    port: 4200,
    host: 'localhost',
    https: {
      cert: './certs/localhost.pem',
      key: './certs/localhost-key.pem',
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  preview: {
    port: 4200,
    host: 'localhost',
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@org/github-integration': path.resolve(import.meta.dirname, '../../libs/shared/github-integration/src/index.ts'),
      '@org/webcontainer-manager': path.resolve(import.meta.dirname, '../../libs/shared/webcontainer-manager/src/index.ts'),
      '@org/ci-pipeline': path.resolve(import.meta.dirname, '../../libs/shared/ci-pipeline/src/index.ts'),
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
