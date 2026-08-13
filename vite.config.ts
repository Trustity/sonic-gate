import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sonic-Gate · Trustity Labs',
        short_name: 'Sonic-Gate',
        description:
          'Acoustic data transmission POC from Trustity Labs — send text through sound waves.',
        theme_color: '#050607',
        background_color: '#050607',
        display: 'standalone',
      },
    }),
  ],
})
