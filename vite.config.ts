import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration
 * - Loads env (e.g., GEMINI_API_KEY) per mode
 * - Configures dev server and React plugin
 * - Exposes selected env vars to client bundle via `define`
 * - Sets `@` alias to project root
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Dev server settings
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // React fast refresh + JSX transform
      plugins: [react()],
      // Make GEMINI_API_KEY available at build time to client code
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // Support absolute imports starting with '@'
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
