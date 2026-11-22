import type React from 'react';
import { ListChecks, Map as MapIcon, Telescope, Ticket } from 'lucide-react';
import { ICON } from '../kit';
export type Tab = 'explorar' | 'cielo' | 'salidas' | 'noche';
export const TABS: { id: Tab; label: string; icon: React.ReactElement }[] = [
  { id: 'explorar', label: 'Explorar', icon: <MapIcon {...ICON} /> },
  { id: 'cielo', label: 'Cielo', icon: <Telescope {...ICON} /> },
  { id: 'salidas', label: 'Salidas', icon: <Ticket {...ICON} /> },
  { id: 'noche', label: 'Mi noche', icon: <ListChecks {...ICON} /> },
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
