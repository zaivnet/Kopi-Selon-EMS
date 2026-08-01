import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.resolve(__dirname, 'tailwind.config.cjs') }),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react-is', 'recharts']
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('leaflet')) {
              return 'map-vendor';
            }
            if (id.includes('jspdf') || id.includes('xlsx') || id.includes('file-saver')) {
              return 'pdf-excel-vendor';
            }
            if (id.includes('lucide-react') || id.includes('motion')) {
              return 'ui-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('@tanstack')) {
              return 'core-vendor';
            }
          }
        }
      }
    }
  }
});
