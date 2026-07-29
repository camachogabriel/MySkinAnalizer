import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// MySkinAnalyzer — Vite config
// worker format 'es' es necesario para poder usar import dinámico de OpenCV.js dentro del Web Worker.
export default defineConfig({
  base: '/MySkinAnalizer/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MySkinAnalyzer',
        short_name: 'MySkinAnalyzer',
        description: 'Análisis facial orientativo y seguimiento de piel mediante fotografías estandarizadas.',
        theme_color: '#0F766E',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: []
      }
    })
  ],
  worker: { format: 'iife' },
  resolve: { alias: { '@': '/src' } },
  server: { https: false }
});
