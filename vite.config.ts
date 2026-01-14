import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    root: 'src',
    server: {
        port: 3000,
        proxy: {
            '/ws': {
                target: 'ws://localhost:3001',
                ws: true
            }
        }
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
})
