import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` doit correspondre au nom du repo pour GitHub Pages
// (https://hichamchessma.github.io/puntobancocoach/). En dev on reste sur "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/puntobancocoach/' : '/',
  plugins: [react()],
}))
