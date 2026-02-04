import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep vendor libraries separate but avoid component-specific chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
          'vendor-xlsx': ['xlsx'],
          'vendor-ui': ['lucide-react']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging but keep them separate
    sourcemap: false,
    // Optimize minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      }
    }
  }
})
