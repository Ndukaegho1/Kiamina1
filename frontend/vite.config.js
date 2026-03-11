import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const popupSafeHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: popupSafeHeaders,
  },
  preview: {
    headers: popupSafeHeaders,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null
          if (id.includes('pdfjs-dist')) return 'vendor-pdf'
          if (id.includes('xlsx') || id.includes('exceljs') || id.includes('jszip')) return 'vendor-office'
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})
