import { createReadStream, cpSync, existsSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const cesiumBaseUrl = '/cesium/'
const cesiumSource = resolve(__dirname, 'node_modules/cesium/Build/Cesium')
const cesiumOutput = resolve(__dirname, 'dist/cesium')

const mimeTypes: Record<string, string> = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp'
}

const cesiumAssets = (): Plugin => ({
  name: 'smart-city-cesium-assets',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = request.url?.split('?')[0] ?? ''
      if (!url.startsWith(cesiumBaseUrl)) {
        next()
        return
      }

      const assetPath = decodeURIComponent(url.slice(cesiumBaseUrl.length))
      const filePath = resolve(cesiumSource, assetPath)
      if (!filePath.startsWith(cesiumSource) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        next()
        return
      }

      response.setHeader('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream')
      createReadStream(filePath).pipe(response)
    })
  },
  writeBundle() {
    cpSync(cesiumSource, cesiumOutput, { recursive: true })
  }
})

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl)
  },
  plugins: [
    react(),
    tailwindcss(),
    cesiumAssets()
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        headers: {
          Host: 'smartcity.localhost:8000'
        }
      }
    }
  }
})
