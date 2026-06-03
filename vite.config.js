import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Use loadEnv so .env.local is picked up in dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const DEV_API_TARGET = env.VITE_DEV_API_TARGET || 'https://attractive-kindness-rbe-serveurs.up.railway.app';
  const isHttps = DEV_API_TARGET.startsWith('https://');
  // Helpful banner on startup
  console.log(`[vite] Mode=${mode} | Proxy target=${DEV_API_TARGET}`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      cors: true,
      proxy: (() => {
        const common = {
          target: DEV_API_TARGET,
          changeOrigin: true,
          secure: isHttps,
          configure: (proxy, _options) => {
            console.log(`[vite] API proxy -> ${DEV_API_TARGET}`);
            proxy.on('error', (err, _req, _res) => console.log('proxy error', err));
            proxy.on('proxyReq', (proxyReq, req, _res) => console.log('Sending Request to the Target:', req.method, req.url));
            proxy.on('proxyRes', (proxyRes, req, _res) => console.log('Received Response from the Target:', proxyRes.statusCode, req.url));
          }
        };
        return {
          '/api': { ...common },
          // Some clients call versioned paths directly
          '/v1': { ...common },
          '/auth': { ...common },
          '/retromail': { ...common },
          '/events': { ...common },
          '/vehicles': { ...common },
          '/newsletter': { ...common },
          '/finance': { ...common },
          '/documents': { ...common },
          '/members': { ...common },
          '/site-users': { ...common },
          '/changelog': { ...common },
          '/flashes': { ...common },
          '/stocks': { ...common },
          '/public': { ...common },
        };
      })()
    },
    build: { 
      outDir: 'dist',
      // Optimisations pour r\u00e9duire le temps de chargement
      rollupOptions: {
        output: {
          // S\u00e9parer les gros packages vendor en chunks d\u00e9di\u00e9s
          manualChunks: {
            // React et React-DOM dans un chunk s\u00e9par\u00e9
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Chakra UI et d\u00e9pendances UI dans un chunk
            'chakra-vendor': [
              '@chakra-ui/react',
              '@chakra-ui/icons',
              '@emotion/react',
              '@emotion/styled',
              'framer-motion'
            ],
            // Librairies lourdes (maps, QR codes, markdown)
            'heavy-libs': [
              'react-leaflet',
              'leaflet',
              'qrcode.react',
              'react-markdown',
              '@tiptap/react',
              '@tiptap/starter-kit'
            ]
          },
          // Nommer les chunks pour debug
          chunkFileNames: (chunkInfo) => {
            return '[name]-[hash].js';
          },
          // Nommer les fichiers d'assets
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      },
      // Augmenter la limite d'avertissement de taille (1000 KB au lieu de 500)
      chunkSizeWarningLimit: 1000,
      // Minification esbuild (plus rapide que terser)
      minify: 'esbuild',
      // Source maps d\u00e9sactiv\u00e9es en production pour r\u00e9duire la taille
      sourcemap: false
    },
    // Optimisations des d\u00e9pendances
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@chakra-ui/react',
        '@chakra-ui/icons'
      ]
    },
    preview: { port: 5173, cors: true }
  };
});
