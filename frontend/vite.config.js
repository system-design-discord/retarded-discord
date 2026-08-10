import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies the API and the WebSocket to the backend so that
// `npm run dev` talks to the same single origin nginx serves in production.
const backend = process.env.VITE_DEV_BACKEND ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/media': { target: backend, changeOrigin: true },
      '/ws': { target: backend, ws: true },
    },
  },
})
