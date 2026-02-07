import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    alias: {
      '/@fs/': resolve('./src'),
    },
  },
  resolve: {
    alias: {
      '@/': `${resolve(__dirname, './src')}/`,
    },
  },
});