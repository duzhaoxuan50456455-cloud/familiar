import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // VITE_API_BASE_URL can be set at build time to point to the deployed backend.
  // Falls back to the local FastAPI dev server during development.
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
    ),
  },
  test: {
    environment: 'jsdom',
  },
})
