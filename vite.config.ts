import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        // SECURITY: the Gemini key is intentionally NOT injected into the client
        // bundle. AI calls go through the backend orchestrator, which holds the
        // key server-side. Replaced with an empty string so any legacy reference
        // resolves harmlessly instead of leaking a secret. (env is still loaded
        // for Firebase's VITE_* values, which are safe to expose by design.)
        'process.env.VITE_GOOGLE_API_KEY': JSON.stringify('')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
