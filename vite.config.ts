import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ALLOW_TEST_ORDERS) process.env.ALLOW_TEST_ORDERS = env.ALLOW_TEST_ORDERS;
  if (env.VITE_ENABLE_SYSTEM_CHECK) process.env.VITE_ENABLE_SYSTEM_CHECK = env.VITE_ENABLE_SYSTEM_CHECK;
  if (env.VITE_FIREBASE_API_KEY) process.env.VITE_FIREBASE_API_KEY = env.VITE_FIREBASE_API_KEY;
  if (env.VITE_FIREBASE_PROJECT_ID) process.env.VITE_FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
  if (env.VITE_FIREBASE_AUTH_DOMAIN) process.env.VITE_FIREBASE_AUTH_DOMAIN = env.VITE_FIREBASE_AUTH_DOMAIN;
  if (env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID = env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
  // In dev mode (command === 'serve'), always use '/' so Vite serves root HTML and assets properly.
  // In build mode for deployment:
  // 1. If BASE_PATH is supplied by GitHub Actions configure-pages, use it.
  // 2. If GITHUB_REPOSITORY (e.g. "username/cineverse") is present, use "/<repo>/".
  // 3. Otherwise default to relative "./" for portable local and preview hosting.
  let base = command === 'serve' ? '/' : './';
  if (command !== 'serve') {
    if (process.env.BASE_PATH) {
      const bp = process.env.BASE_PATH.trim();
      base = bp.endsWith('/') ? bp : `${bp}/`;
    } else if (process.env.GITHUB_REPOSITORY) {
      const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
      if (repo && !repo.endsWith('.github.io')) {
        base = `/${repo}/`;
      } else {
        base = '/';
      }
    }
  }

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/create-order')) {
              try {
                const { default: handler } = await import('./api/create-order.js');
                let body = '';
                req.on('data', (chunk) => {
                  body += chunk;
                });
                req.on('end', async () => {
                  (req as any).body = body;
                  const originalJson = (data: any) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  };
                  (res as any).status = (code: number) => {
                    res.statusCode = code;
                    return { json: originalJson, end: () => res.end() };
                  };
                  (res as any).json = originalJson;
                  await handler(req as any, res as any);
                });
                return;
              } catch (e: any) {
                console.error('Error in dev /api/create-order:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  };
});
