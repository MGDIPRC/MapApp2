import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command }) => ({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // Dev: serve at "/" so /clinics.xlsx works on localhost
  // Build: use "/MapApp2/" for GitHub Pages
  base: command === 'serve' ? '/' : '/MapApp2/',
}))
