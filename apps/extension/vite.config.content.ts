import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/content-script.ts'),
      name: 'ApplyFlowContentScript',
      formats: ['iife'],
      fileName: () => 'content/content-script.js'
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  }
});
