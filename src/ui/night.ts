import type { NightScore } from '../sky/night';
import type { ObservationWindow } from '../sky/types';
import { toneFor } from '../sky/score';
import { localParts } from '../sky/time';
import { range } from './format';

export const nightTone = (n: Pick<NightScore, 'score' | 'label'>) => toneFor(n);
/** "02:00 a 05:06 (de madrugada)" — la ventana ya viene recortada a la noche astronómica. */
export const windowText = (w: ObservationWindow) => `${range(w.start, w.end)}${localParts(w.start).h < 12 ? ' (de madrugada)' : ''}`;
