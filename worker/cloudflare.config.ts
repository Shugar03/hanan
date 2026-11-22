// Configuración para el CLI `cf` (Cloudflare, technical preview). No hay Wrangler en el repo.
// `cf/config` lo provee el CLI global `cf` (npm i -g cf); no es dependencia de este paquete.
import { defineConfig, defineWorker, bindings } from 'cf/config';

export default defineConfig({
  worker: defineWorker({
    name: 'hanan-api',
    compatibilityDate: '2026-11-01',
    entrypoint: './src/index.ts',
    env: {
      // Opcional (HU-10 "Quiero ir"): sin este binding, /api/demand responde 501.
      DEMAND: bindings.kv(),
    },
  }),
});
