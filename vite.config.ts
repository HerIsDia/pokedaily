import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  define: {
    // Une seule source de vérité pour la version : package.json
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      // L'enregistrement est fait par `src/pwa/register.ts` (mise à jour avec confirmation).
      injectRegister: false,
      injectManifest: {
        // Le « shell » de l'app uniquement. Les images passent par un cache à la demande (sw.ts).
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        // Les polices « latin-ext » (un seul nom de forme en a besoin) ne sont pas préchargées :
        // elles se gardent au premier usage (voir sw.ts).
        globIgnores: ['**/sprites/**', '**/*latin-ext*'],
      },
      manifest: {
        name: 'Pokédaily',
        short_name: 'Pokédaily',
        description: "Quel Pokémon es-tu aujourd'hui ?",
        theme_color: '#0f0f1a',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
