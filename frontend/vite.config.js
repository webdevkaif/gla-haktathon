import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
<<<<<<< HEAD
    host: '0.0.0.0',
    port: 5173,
=======
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    strictPort: false,
>>>>>>> f635bb06627205b2375f77f7e4a39d93b824da8f
  }
})
