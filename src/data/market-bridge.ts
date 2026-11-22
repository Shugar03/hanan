// Puente al marketplace (src/data/marketplace.ts, agente G) para "Mi noche". Si no existe, lista vacía.
import type { Salida } from '../sky/types';
import { ext } from '../ui/Optional';

export async function loadMarketSalidas(): Promise<Salida[]> {
  if (!ext.market) return [];
  try {
    const m = (await ext.market()) as Record<string, any>;
    const list: any[] = m.listSalidas?.() ?? [];
    return list.map((s) => {
      const g = m.getGuide?.(s.guideId);
      return {
        id: s.id, guideName: g?.name ?? 'Guía', guideRegistered: g ? !!m.isVerified?.(g) : false,
        pointId: s.pointId, departure: new Date(s.departure), durationH: s.durationH,
        capacity: Math.max(0, (m.cuposRestantes?.(s) ?? s.capacityMax)), languages: s.languages ?? [],
        priceRef: m.ars ? `${m.ars(s.pricePerPersonARS)} por persona${s.demoPrice ? ' (ejemplo)' : ''}` : undefined,
        whatsapp: g?.whatsapp ?? '', demo: !!s.demo, meetingPoint: s.meetingPoint, market: true,
      } as Salida & { market: true };
    });
  } catch (e) { console.warn('[hanan] marketplace no disponible', e); return []; }
}
