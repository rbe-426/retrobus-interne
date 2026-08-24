import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Use loadEnv so .env.local is picked up in dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const DEV_API_TARGET = env.VITE_DEV_API_TARGET || 'https://attractive-kindness-rbe-serveurs.up.railway.app';
  const LOCAL_API_TARGET = env.VITE_LOCAL_API_TARGET || 'http://localhost:8080';
  const isHttps = DEV_API_TARGET.startsWith('https://');
  // Helpful banner on startup
  console.log(`[vite] Mode=${mode} | Proxy target=${DEV_API_TARGET}`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      cors: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false, // Plus performant sur Windows
      },
      proxy: (() => {
        const common = {
          target: DEV_API_TARGET,
          changeOrigin: true,
          secure: isHttps,
          timeout: 30000, // 30s timeout
          proxyTimeout: 30000,
          agent: false, // Désactive l'agent pour de meilleures performances
          configure: (proxy, _options) => {
            console.log(`[vite] API proxy -> ${DEV_API_TARGET}`);
            // Logs d'erreurs uniquement (désactivation des logs verbeux pour performances)
            proxy.on('error', (err, _req, _res) => console.error('[proxy error]', err));
          }
        };
        return {
          '/api/process-parc': { ...common, target: LOCAL_API_TARGET, secure: false },
          '/api': { ...common },
          // Some clients call versioned paths directly
          '/v1': { ...common },
          '/health': { ...common },
          '/events': { ...common },
            '/ineo': { ...common },
          '/vehicles': { ...common },
          '/newsletter': { ...common },
          '/finance': { ...common },
          '/documents': { ...common },
          '/members': { ...common },
          '/site-users': { ...common },
          '/flashes': { ...common },
          '/stocks': { ...common },
          '/public': { ...common },
          '/uploads': { ...common },
        };
      })()
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      reportCompressedSize: false, // Plus rapide en build
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks séparés pour meilleur caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chakra-ui': ['@chakra-ui/react', '@chakra-ui/icons', '@emotion/react', '@emotion/styled', 'framer-motion'],
            'editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-color', '@tiptap/extension-highlight', '@tiptap/extension-image', '@tiptap/extension-link', '@tiptap/extension-text-align'],
            'maps': ['leaflet', 'react-leaflet'],
            'utils': ['axios', 'react-icons', 'lucide-react', 'qrcode.react', 'html2pdf.js']
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@chakra-ui/react',
        '@emotion/react',
        '@emotion/styled',
        'framer-motion'
      ],
      exclude: []
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  };
});
