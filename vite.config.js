import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/spell/',
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 将 exifreader 拆分为独立 chunk，避免打入主 bundle
          if (id.includes('node_modules/exifreader')) {
            return 'exifreader';
          }
        }
      }
    }
  }
})
