import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    proxy: {
      '/api': { target: process.env.DEV_API_TARGET || 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: process.env.DEV_API_TARGET || 'http://localhost:3000', changeOrigin: true }
    }
  }
})
