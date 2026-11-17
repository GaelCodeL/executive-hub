import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves this repository under /executive-hub/.
  base: '/executive-hub/',
  plugins: [react()],
  server: { host: true },
})
