/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ICON = resolve(import.meta.dirname, 'design/logo/hanan-mark.svg');

/** PWA mínima: ícono desde design/logo y service worker con precache de todo el bundle (incluye los fixtures). */
function pwa(): Plugin {
  const sw = (files: string[], version: string) => readFileSync(resolve(import.meta.dirname, 'src/sw-template.js'), 'utf8')
    .replace('__PRECACHE__', JSON.stringify(files)).replace('__VERSION__', version);
  return {
    name: 'hanan-pwa',
    configureServer(server) {
      server.middlewares.use('/icon.svg', (_req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.end(readFileSync(ICON)); });
    },
    generateBundle(_o, bundle) {
      this.emitFile({ type: 'asset', fileName: 'icon.svg', source: readFileSync(ICON) });
      const files = ['./', './index.html', './manifest.webmanifest', './icon.svg', ...Object.keys(bundle).map((f) => './' + f)];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw([...new Set(files)], String(Date.now())) });
    },
  };
}

/** Offline-first: la fuente de la marca se sirve empaquetada (@fontsource) en vez del @import remoto de Google Fonts
 *  que trae design/tokens.css (ese archivo no se toca; el import se quita solo al empaquetar). */
function localFonts(): Plugin {
  return {
    name: 'hanan-local-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].endsWith('.css')) return;
      if (!code.includes('fonts.googleapis.com')) return;
      return { code: code.replace(/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g, ''), map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [localFonts(), react(), pwa()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
