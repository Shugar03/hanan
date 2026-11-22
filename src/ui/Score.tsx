import type { SkyScore } from '../sky/types';
import { labelFor, toneFor } from '../sky/score';

export function ScoreBadge({ score, label, size = 'md' }: { score: number; label?: string; size?: 'sm' | 'md' }) {
  const l = label ?? labelFor(score);
  return (
    <span className={`badge badge-${size}`} data-tone={toneFor({ score, label: l as SkyScore['label'] })}>
      <b className="num">{score}</b> <span>{l}</span>
    </span>
  );
}

export function Bar({ value, tone }: { value: number; tone?: string }) {
  return <span className="bar" aria-hidden><span className="bar-fill" data-tone={tone} style={{ width: `${Math.round(value * 100)}%` }} /></span>;
}
