import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/plan': 'http://localhost:8000',
      '/fault': 'http://localhost:8000',
      '/mission': 'http://localhost:8000',
      '/missions': 'http://localhost:8000',
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
      },
    },
  },
})
