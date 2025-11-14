import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      'firebase/compat/app': path.resolve(__dirname, 'node_modules/firebase/compat/app/dist/esm/index.esm.js'),
      'firebase/compat/firestore': path.resolve(__dirname, 'node_modules/firebase/compat/firestore/dist/esm/index.esm.js')
    }
  }
})