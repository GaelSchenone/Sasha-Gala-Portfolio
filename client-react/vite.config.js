import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where the dev proxy forwards /api and /imgs. Defaults to a local backend;
  // set VITE_PROXY_TARGET in .env.local to point at production (real data,
  // no CORS) when you only want to work on the React side.
  const apiTarget = env.VITE_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      allowedHosts: 'all',
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
        '/imgs': { target: apiTarget, changeOrigin: true, secure: false },
      },
    },
  }
})
