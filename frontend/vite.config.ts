/*import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
 // base: "./",
})*/

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so both localhost and 127.0.0.1 work.
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        // Always proxy to IPv4 Functions host.
        target: "http://127.0.0.1:7071",
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
      },
    },
  },
})
