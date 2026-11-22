import { requestOrientationPermission } from './sensors';
import './observatorio.css';

/** Botón de 44 px que abre el modo observatorio. Pide el permiso de orientación de iOS dentro del gesto. */
export default function ObservatorioButton(props: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="obs-open"
      aria-label="Abrir modo observatorio"
      title="Modo observatorio"
      onClick={() => { void requestOrientationPermission(); props.onOpen(); }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M3.5 12.2l11.2-5.4 1.9 3.9-11.2 5.4z" />
        <path d="M16.6 6.1l2.6-1.3 1.9 3.9-2.6 1.3" />
        <path d="M10.6 14.6L8 21M11.6 14.2l3 6.8M11.1 14.4V21" />
        <circle cx="20.5" cy="3" r=".6" className="obs-open-star" />
      </svg>
    </button>
  );
}
