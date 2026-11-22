/** Sensores del modo observatorio: permiso de orientación (iOS), eventos de orientación y cámara. */

export type OrientationSample = {
  alpha: number; beta: number; gamma: number;
  /** alpha referido al norte (brújula) o relativo a la posición inicial */
  absolute: boolean;
  /** precisión de la brújula en grados (iOS: webkitCompassAccuracy), si el navegador la da */
  accuracy?: number;
  t: number;
};

type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
const doe = (): DOE | undefined => (typeof window !== 'undefined' ? (window as unknown as { DeviceOrientationEvent?: DOE }).DeviceOrientationEvent : undefined);

let pending: Promise<'granted' | 'denied' | 'unsupported'> | null = null;

/** iOS 13+ exige pedir el permiso dentro de un gesto del usuario: llamar en el onClick que abre el observatorio. */
export function requestOrientationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  const D = doe();
  if (!D) return Promise.resolve('unsupported');
  if (typeof D.requestPermission !== 'function') return Promise.resolve('granted');
  if (!pending) {
    pending = D.requestPermission()
      .then((r) => (r === 'granted' ? 'granted' as const : 'denied' as const))
      .catch(() => { pending = null; return 'denied' as const; });
  }
  return pending;
}
export const needsPermissionGesture = () => typeof doe()?.requestPermission === 'function';

/** Escucha la orientación. Android: 'deviceorientationabsolute' (alpha absoluto); si no, 'deviceorientation'. iOS: webkitCompassHeading. */
export function subscribeOrientation(cb: (s: OrientationSample) => void): () => void {
  let lastAbs = -Infinity;
  const onAbs = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    lastAbs = performance.now();
    cb({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: true, t: lastAbs });
  };
  const onRel = (e: DeviceOrientationEvent) => {
    const ios = e as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
    if (e.beta == null || e.gamma == null) return;
    const t = performance.now();
    if (typeof ios.webkitCompassHeading === 'number' && !Number.isNaN(ios.webkitCompassHeading)) {
      const acc = ios.webkitCompassAccuracy;
      cb({ alpha: (360 - ios.webkitCompassHeading) % 360, beta: e.beta, gamma: e.gamma, absolute: true, accuracy: typeof acc === 'number' && acc >= 0 ? acc : undefined, t });
      return;
    }
    if (e.alpha == null) return;
    if (t - lastAbs < 1000) return; // ya llegan eventos absolutos
    cb({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: !!e.absolute, t });
  };
  window.addEventListener('deviceorientationabsolute' as 'deviceorientation', onAbs as EventListener);
  window.addEventListener('deviceorientation', onRel);
  return () => {
    window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', onAbs as EventListener);
    window.removeEventListener('deviceorientation', onRel);
  };
}

export const screenAngle = () =>
  (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number')
    ? screen.orientation.angle
    : typeof window !== 'undefined' && typeof (window as unknown as { orientation?: number }).orientation === 'number'
      ? (window as unknown as { orientation: number }).orientation : 0;

/** Cámara trasera. Devuelve null si no hay cámara, no hay permiso o el contexto no es seguro (HTTPS). */
export async function openBackCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
  } catch {
    return null;
  }
}
export const stopStream = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());
