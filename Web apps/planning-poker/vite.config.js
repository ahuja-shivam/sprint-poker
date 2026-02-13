import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { writeFileSync, readFileSync } from 'fs'

// Plugin to create SPA fallback files for Vercel
function spaFallback() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const indexHtml = readFileSync(resolve(distDir, 'index.html'), 'utf-8')
      // Vercel uses 200.html as SPA catch-all fallback
      writeFileSync(resolve(distDir, '200.html'), indexHtml)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
})
