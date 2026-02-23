import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE_URL || 'https://ebloodbank.onrender.com';

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
