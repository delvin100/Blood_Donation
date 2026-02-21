import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: target,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
