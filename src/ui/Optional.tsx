// Módulos de otros equipos (Cielo, Capas, Salidas) se cargan con import.meta.glob:
// si el archivo todavía no existe, el glob queda vacío y se muestra un placeholder; el build no se rompe.
import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react';

type Loader = () => Promise<unknown>;

export function Pending({ title, note }: { title: string; note?: string }) {
  return (
    <section className="pending" role="status">
      <svg viewBox="0 0 48 48" aria-hidden className="pending-mark">
        <circle cx="24" cy="24" r="17" />
        <path d="M6 31h36" />
        <circle cx="31" cy="15" r="1.6" className="fill" />
        <circle cx="18" cy="12" r="1.1" className="fill" />
        <circle cx="25" cy="20" r="1.3" className="fill" />
      </svg>
      <h2>{title}</h2>
      <p className="muted">{note ?? 'Disponible en breve.'}</p>
    </section>
  );
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: unknown) { console.warn('[hanan] módulo opcional falló; muestro placeholder', e); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

const cache = new Map<string, ComponentType<any>>();
/** Componente perezoso a partir de un loader de glob. `pick` elige el export (default o nombrado). */
export function optional<P>(key: string, loader: Loader | undefined, pick: string): ComponentType<P> | null {
  if (!loader) return null;
  const k = key + '#' + pick;
  if (!cache.has(k)) {
    cache.set(k, lazy(async () => {
      const m = (await loader()) as Record<string, unknown>;
      const C = m[pick] as ComponentType<P> | undefined;
      if (!C) throw new Error(`${key} no exporta ${pick}`);
      return { default: C };
    }));
  }
  return cache.get(k)!;
}

export function Slot<P extends object>({ C, props, title, note }: { C: ComponentType<P> | null; props: P; title: string; note?: string }) {
  const fb = <Pending title={title} note={note} />;
  if (!C) return fb;
  return (
    <Boundary fallback={fb}>
      <Suspense fallback={<p className="muted small loading">Cargando {title.toLowerCase()}…</p>}><C {...props} /></Suspense>
    </Boundary>
  );
}

// Registro de módulos externos (rutas fijas por contrato).
const cielo = import.meta.glob('./cielo/CieloView.tsx');
const capasCtl = import.meta.glob('./capas/CapasControls.tsx');
const capasLayer = import.meta.glob('./capas/weatherLayer.ts');
const gridMod = import.meta.glob('../data/grid.ts');
const salidas = import.meta.glob('./salidas/index.ts');
const market = import.meta.glob('../data/marketplace.ts');

export const ext = {
  cielo: cielo['./cielo/CieloView.tsx'],
  capasControls: capasCtl['./capas/CapasControls.tsx'],
  capasLayer: capasLayer['./capas/weatherLayer.ts'],
  grid: gridMod['../data/grid.ts'],
  salidas: salidas['./salidas/index.ts'],
  market: market['../data/marketplace.ts'],
};
