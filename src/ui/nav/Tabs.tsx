import type React from 'react';
export type Tab = 'explorar' | 'cielo' | 'salidas' | 'noche';
export const TABS: { id: Tab; label: string; icon: React.ReactElement }[] = [
  { id: 'explorar', label: 'Explorar', icon: <svg viewBox="0 0 24 24" aria-hidden><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></svg> },
  { id: 'cielo', label: 'Cielo', icon: <svg viewBox="0 0 24 24" aria-hidden><path d="M3 17h18" /><path d="M5.5 17a6.5 6.5 0 0 1 13 0" /><path d="m12 4 .9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 6.1l2-.3z" /></svg> },
  { id: 'salidas', label: 'Salidas', icon: <svg viewBox="0 0 24 24" aria-hidden><path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4z" /><path d="M14 6v12" strokeDasharray="2 2" /></svg> },
  { id: 'noche', label: 'Mi noche', icon: <svg viewBox="0 0 24 24" aria-hidden><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /><path d="M14 9.5h4M16 7.5v4" /></svg> },
];

export const isTab = (x: string | null): x is Tab => !!x && TABS.some((t) => t.id === x);

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => (
        <a key={t.id} href={`?tab=${t.id}`} className="tab" aria-current={t.id === tab ? 'page' : undefined}
          onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onTab(t.id); }}>
          {t.icon}<span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
