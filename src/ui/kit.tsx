/**
 * Kit de UI de Hanan: piezas que antes se repetían con estilos propios en cada módulo.
 * Íconos: lucide-react (ISC), siempre con ICON (20 px, trazo 1,75) para que toda la app tenga el mismo peso.
 * Estilos en styles.css (sección "Kit"). Solo roles semánticos: funcionan en oscuro, claro y rojo.
 */
import type React from 'react';
import { useId } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export const ICON = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const;

/** Isotipo cardón-constelación inline: toma los roles (estrellas --text, trazos --text-2, estrella mayor --accent). */
export function Mark({ size = 28, id = 'hanan-ml-1' }: { size?: number; id?: string }) {
  const stars: [number, number, number][] = [[12, 16, 2], [36, 12, 2], [10.76, 34.24, 1.4], [37.24, 25.24, 1.4], [15, 30, 1.1], [33, 21, 1.1], [20, 17, 1.2], [28, 34, 1.2], [20, 44, 1.4], [28, 44, 1.4]];
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <rect width="48" height="48" fill="#fff" />
        {[[24, 5, 2.8], ...stars].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r + 0.9} fill="#000" />)}
      </mask>
      <path className="mark-line" d="M20 44 V36 H15 A6 6 0 0 1 9 30 V19 A3 3 0 0 1 15 19 V30 H20 V9 A4 4 0 0 1 28 9 V21 H33 V15 A3 3 0 0 1 39 15 V21 A6 6 0 0 1 33 27 H28 V44 Z" mask={`url(#${id})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="mark-key" cx="24" cy="5" r="2.8" />
      {stars.map(([x, y, r]) => <circle key={`${x}-${y}`} className="mark-star" cx={x} cy={y} r={r} />)}
      <circle className="mark-star" cx="42.5" cy="4" r="0.9" opacity="0.7" />
      <circle className="mark-star" cx="5.5" cy="7" r="0.8" opacity="0.7" />
    </svg>
  );
}

/** Botón de ícono de 44 × 44 (target mínimo). El texto visible aparece desde 560 px; el nombre accesible es siempre `label`. */
export function IconButton({ icon: I, label, text, pressed, onClick, className = '', ...rest }: {
  icon: LucideIcon; label: string; text?: string; pressed?: boolean; onClick?: () => void; className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} aria-pressed={pressed} onClick={onClick} {...rest}>
      <I {...ICON} />
      {text && <span className="icon-txt">{text}</span>}
    </button>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost';
/** Botón: una sola variante primaria por pantalla. */
export function Button({ variant = 'secondary', icon: I, children, className = '', ...rest }: {
  variant?: BtnVariant; icon?: LucideIcon; children: React.ReactNode; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...rest}>
      {I && <I {...ICON} size={18} />}{children}
    </button>
  );
}

/** Sección con título: superficie un paso de tono sobre el fondo (sin sombras). */
export function Section({ title, aside, children, className = '', accent, ...rest }: {
  title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string; accent?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card ${accent ? 'card-accent' : ''} ${className}`} {...rest}>
      {(title || aside) && <div className="card-head">{title && <h2>{title}</h2>}{aside}</div>}
      {children}
    </section>
  );
}

/** Divulgación progresiva: detalle secundario plegado, con chevron. */
export function Disclosure({ summary, children, open, className = '' }: { summary: React.ReactNode; children: React.ReactNode; open?: boolean; className?: string }) {
  return (
    <details className={`disclosure ${className}`} open={open}>
      <summary><span>{summary}</span><ChevronDown {...ICON} size={18} className="disclosure-chev" /></summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}

/** Dato compacto: valor arriba, etiqueta abajo. */
export function Stat({ value, label, tone }: { value: React.ReactNode; label: React.ReactNode; tone?: string }) {
  return (
    <div className="stat" data-tone={tone}>
      <span className="stat-v num">{value}</span>
      <span className="stat-k">{label}</span>
    </div>
  );
}

/** Chip conmutador (pill, 44 px). */
export function Chip({ pressed, children, className = '', ...rest }: { pressed?: boolean; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`opt ${className}`} aria-pressed={pressed} {...rest}>{children}</button>;
}

/** Control segmentado (radiogroup). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="seg" role="radiogroup" aria-label={label} id={id}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className="seg-btn" onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
