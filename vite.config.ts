import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
          'vendor-xlsx': ['xlsx'],
          'vendor-ui': ['lucide-react'],
          'vendor-db': ['dexie'],
          // Split components into logical chunks
          'components-map': [
            './src/components/BusinessMap.tsx',
            './src/components/MarketIntelligence.tsx'
          ],
          'components-table': [
            './src/components/BusinessTable.tsx',
            './src/components/MobileBusinessList.tsx'
          ],
          'components-forms': [
            './src/components/ImportModal.tsx',
            './src/components/ImportMappingModal.tsx',
            './src/components/LoginModal.tsx'
          ],
          'components-details': [
            './src/components/ClientDetailsToolbar.tsx',
            './src/components/SeenClients.tsx'
          ]
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    // Enable source maps for debugging but keep them separate
    sourcemap: false,
    // Optimize minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
