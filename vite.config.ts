import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries in separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    },
    // Enable minification (uses default terser settings)
    minify: 'terser',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Performance optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
