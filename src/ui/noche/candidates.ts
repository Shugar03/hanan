import type { PointId, SatPass } from '../../sky/types';
import type { Candidate } from '../../sky/recommend';
import type { PointModel } from '../../model';
import { nightSummary } from '../../sky/ephemeris';
import { nightOf } from '../../sky/time';
import { passes, type Tracked } from '../../sky/satellites';

const summaries = new Map<string, ReturnType<typeof nightSummary>>();
function summary(m: PointModel, night: string) {
  const k = m.point.id + night;
  if (!summaries.has(k)) summaries.set(k, nightSummary(night, m.point));
  return summaries.get(k)!;
}

/** Candidatos punto × noche para el motor de recomendaciones. Los pases se calculan solo si hacen falta. */
export function buildCandidates(models: Record<PointId, PointModel>, opts: { sats?: Tracked[] } = {}): Candidate[] {
  const out: Candidate[] = [];
  for (const m of Object.values(models)) {
    for (const n of m.nights) {
      const hours = m.hours.filter((h) => nightOf(h.time) === n.night);
      const conditions = hours.map((h) => m.conditions.get(+h.time)).filter(Boolean) as Candidate['conditions'];
      let visiblePasses: SatPass[] | undefined;
      if (opts.sats) {
        visiblePasses = [];
        const hrs = (+n.astroDawn - +n.astroDusk) / 3600_000 + 1.5;
        for (const t of opts.sats) if (t.name !== 'ARSAT 2') visiblePasses.push(...passes(t, m.point, new Date(+n.astroDusk - 1.5 * 3600_000), hrs + 1.5, 30).filter((p) => p.visible));
        visiblePasses.sort((a, b) => +a.start - +b.start);
      }
      out.push({ point: m.point, night: n, summary: summary(m, n.night), hours, conditions, visiblePasses });
    }
  }
  return out;
}
