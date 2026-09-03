/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base:'./' — relative asset paths, so the build works on GitHub Pages in a
// subdirectory (username.github.io/sunsetrise/) without changing base.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    // Two real pages: the sun forecast (index.html) and the moon calendar
    // (moon.html). Each imports its own entry, so the astronomy-engine bundle
    // is only loaded on the moon page.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        moon: fileURLToPath(new URL('./moon.html', import.meta.url)),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/api/**/*.ts', 'src/hooks/**/*.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});