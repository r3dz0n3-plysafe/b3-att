import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Base path '/b3-att/' cuma dipakai saat build produksi (GitHub Pages project site).
  // Dev server tetap di '/' supaya http://localhost:5173/ tidak berubah.
  base: command === 'build' ? '/b3-att/' : '/',
  plugins: [react(), tailwindcss()],
}))
