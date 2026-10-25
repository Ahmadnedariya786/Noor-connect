import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";
import compression from "vite-plugin-compression";

import { execSync } from "child_process";

const getGitCommit = (): string => {
  if (process.env.VITE_BUILD_COMMIT) return process.env.VITE_BUILD_COMMIT.trim();
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.trim();
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

const APP_VERSION = process.env.npm_package_version ?? "2.2.1";
const BUILD_TIME = new Date().toISOString();
const BUILD_COMMIT = getGitCommit();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(BUILD_TIME),
    'import.meta.env.VITE_BUILD_COMMIT': JSON.stringify(BUILD_COMMIT),
  },
  build: {
    minify: 'terser',
    chunkSizeWarningLimit: 600,
    target: 'es2015',
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        // Exclude heavy vendor chunks from modulepreload (they're lazy-loaded)
        return deps.filter(dep =>
          !dep.includes('pdf-vendor') &&
          !dep.includes('charts') &&
          !dep.includes('radix-ui') &&
          !dep.includes('animations')
        );
      }
    },
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: mode === 'production',
        pure_funcs: [],
      },
      mangle: {
        safari10: true, // Better Safari 10+ compatibility
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // PDF vendor chunk
          'pdf-vendor': ['pdfjs-dist', 'jspdf'],
          // Charts vendor chunk
          'charts': ['recharts'],
          // Animation vendor chunk
          'animations': ['framer-motion'],
          // Radix UI components
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-tooltip',
          ],
          // React + i18n stay in the main chunk — manual chunks can't extract
          // React when @vitejs/plugin-react-swc handles resolution, and separating
          // react-i18next from React causes createContext timing issues.
          // React Query
          'react-query': ['@tanstack/react-query'],
          // Carousel vendor chunk
          'carousel': ['embla-carousel-react'],
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:54321/functions/v1",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: 'serve-android-assets',
      configureServer(server) {
        server.middlewares.use('/android_asset/mushaf', (req, res, next) => {
          const urlPath = req.url?.split('?')[0] || '';
          const filePath = path.join(__dirname, 'android/app/src/main/assets/mushaf', urlPath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      }
    },
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: [
        "favicon.ico",
        "favicon.png",
        "logo-mark.png",
        "icon-192x192.png",
        "icon-512x512.png",
        "apple-touch-icon.png",
        "icon-72x72.png",
        "icon-96x96.png",
        "icon-128x128.png",
        "icon-144x144.png",
        "icon-152x152.png",
        "icon-384x384.png"
      ],
      manifest: {
        id: "com.noorconnect.ummah.v1.2",
        name: "Noor Connect - Islamic Companion",
        short_name: "Noor Connect",
        description: "Prayer times, Qur'an, Qibla, Tasbeeh, and Daily Hadith. Your complete Islamic companion app.",
        theme_color: "#150D2E",
        background_color: "#150D2E",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["books", "education", "productivity"],
        lang: "en",
        dir: "ltr",
        shortcuts: [
          {
            name: "Radio",
            short_name: "Radio",
            description: "Listen to Quran Radio",
            url: "/quran-radio",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Prayer Times",
            short_name: "Prayers",
            description: "Check Prayer Times",
            url: "/dashboard",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          }
        ],
        icons: [
          {
            src: "/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        enabled: false // Disable SW in dev to prevent caching of Vite internal files
      },
      // Exclude large hadith data from PWA precaching
      injectManifest: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        globIgnores: ['**/*.map', '**/data/hadith-collections/**']
      }
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-i18next',
      'i18next',
      'use-sync-external-store/shim',
    ],
  },
}));
