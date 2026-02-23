import { defineConfig } from 'vite'

export default defineConfig({
  base: '/liar-sisain/',
  build: {
    target: 'esnext'
  },
  server: {
    open: true,
    host: true
  }
})
