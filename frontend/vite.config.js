import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001'

  return {
    plugins: [vue()],
    server: {
      // Permite probar en la red local y desde túneles de desarrollo.
      host: true,
      allowedHosts: ['.trycloudflare.com'],
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
