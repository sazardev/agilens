import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[64, 'favicon-64.png']],
    },
    maskable: {
      sizes: [512],
      resizeOptions: { background: '#4f46e5' },
    },
    apple: {
      sizes: [180],
      resizeOptions: { background: '#4f46e5' },
    },
  },
  images: ['public/logo.svg'],
})
