import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages: set base to '/mesmo-barco/' when deploying to project pages.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
})
