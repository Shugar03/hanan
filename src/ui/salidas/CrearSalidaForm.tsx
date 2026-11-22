import { useMemo, useState } from 'react';
import { POINTS, pointById } from '../../data/points';
import { addDays, localDateStr } from '../../sky/time';
import {
  createSalida, GARANTIA_HORAS, initialsOf, type Guide, GARANTIA_UMBRAL, LANG_LABEL, LEVEL_LABEL, LOCAL_GUIDE_ID, localGuide, validarSalida,
  type MarketSalida, type NightScoreFn, type NuevaSalida, type PhysicalLevel,
} from '../../data/marketplace';
import type { PointId } from '../../sky/types';
import { SalidaCard, scoreOf } from './parts';
import './salidas.css';

type Props = { onCreated: (id: string) => void; nightScore?: NightScoreFn; now?: Date };
type Errors = ReturnType<typeof validarSalida>;

const INCLUDES = ['Traslado', 'Telescopio', 'Bebida caliente', 'Ponchos y mantas', 'Cena liviana', 'Carta celeste'];
const LANGS = ['es', 'en', 'pt'];
const POLICY = `Garantía de cielo: si a ${GARANTIA_HORAS} h de la salida el score de la noche es menor a ${GARANTIA_UMBRAL}, propongo otra fecha o devuelvo la seña completa.`;

export function CrearSalidaForm({ onCreated, nightScore, now = new Date() }: Props) {
  const lg = localGuide();
  const [f, setF] = useState({
    title: '', guideName: lg?.name ?? '', whatsapp: lg?.whatsapp ?? '', pointId: 'susques' as PointId,
    date: addDays(localDateStr(now), 1), time: '22:00', durationH: '3', capacityMin: '2', capacityMax: '10', price: '',
    includes: ['Telescopio', 'Bebida caliente'] as string[], extra: '', meetingPoint: 'Susques', physicalLevel: 'bajo' as PhysicalLevel,
    maxAltitudeM: String(pointById('susques').elevationM), languages: ['es'] as string[], weatherPolicy: POLICY,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);

  const draft: NuevaSalida = useMemo(() => ({
    title: f.title, guideName: f.guideName, whatsapp: f.whatsapp, pointId: f.pointId,
    departure: `${f.date}T${f.time || '00:00'}:00-03:00`, durationH: Number(f.durationH),
    capacityMin: Number(f.capacityMin), capacityMax: Number(f.capacityMax), pricePerPersonARS: Number(f.price),
    includes: [...f.includes, ...f.extra.split(',').map((x) => x.trim()).filter(Boolean)],
    meetingPoint: f.meetingPoint, physicalLevel: f.physicalLevel, maxAltitudeM: Number(f.maxAltitudeM),
    languages: f.languages, weatherPolicy: f.weatherPolicy,
  }), [f]);
  const live = tried ? validarSalida(draft, now) : errors;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (k === 'pointId') {
      const p = pointById(v);
      setF({ ...f, pointId: v as PointId, maxAltitudeM: String(p.elevationM) });
    } else setF({ ...f, [k]: v });
  };
  const toggle = (k: 'includes' | 'languages', v: string) =>
    setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const r = createSalida(draft, now);
    if (!r.ok) {
      setErrors(r.errors);
      setTimeout(() => (document.querySelector('.sx-form [aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    onCreated(r.salida.id);
  };

  const preview: MarketSalida = {
    ...draft, id: 'preview', guideId: LOCAL_GUIDE_ID, booked: 0, demo: false, demoPrice: false, local: true,
    title: draft.title || 'Título de tu salida', pricePerPersonARS: draft.pricePerPersonARS || 0,
  };
  const previewGuide: Guide = {
    id: LOCAL_GUIDE_ID, name: f.guideName.trim() || 'Tu nombre', initials: initialsOf(f.guideName || 'Tu nombre'), kind: 'guia',
    registeredLey6308: false, legajo18829: false, languages: f.languages, ratingDemo: 0, salidasCount: 0, base: f.meetingPoint, whatsapp: '', bio: '', demo: false,
  };
  const err = (k: keyof NuevaSalida) => live[k] ? <span className="sx-err" id={`sx-e-${k}`}>{live[k]}</span> : null;
  const a11y = (k: keyof NuevaSalida) => ({ id: `sx-f-${k}`, 'aria-invalid': !!live[k], 'aria-describedby': live[k] ? `sx-e-${k}` : undefined });

  return (
    <section className="sx" aria-labelledby="sx-new-h">
      <header className="sx-head">
        <h1 id="sx-new-h" className="sx-h1">Nueva salida</h1>
        <p className="sx-lead">Vos fijás el precio por persona y el cupo. La salida aparece en Salidas, ordenada por el cielo de esa noche.</p>
      </header>

      <div className="sx-preview" aria-label="Vista previa de la tarjeta">
        <p className="sx-h2">Así se ve tu tarjeta</p>
        <SalidaCard s={preview} score={nightScore ? scoreOf(preview, nightScore) : null} preview guide={previewGuide} />
      </div>

      <form className="sx-form" onSubmit={submit} noValidate>
        <fieldset>
          <legend>Quién sale</legend>
          <label className="sx-field"><span>Tu nombre o el del operador</span><input {...a11y('guideName')} value={f.guideName} onChange={set('guideName')} autoComplete="name" />{err('guideName')}</label>
          <label className="sx-field"><span>WhatsApp (con código de país)</span><input {...a11y('whatsapp')} type="tel" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} placeholder="54 9 388 …" />{err('whatsapp')}</label>
          <p className="sx-muted sx-small">Tu perfil aparece sin verificar hasta que validemos tu inscripción en el Registro Único de Guías de Turismo de Jujuy (Ley 6308) o el legajo de agencia (Ley 18.829). Tu teléfono se muestra solo a quien reserva.</p>
        </fieldset>

        <fieldset>
          <legend>La salida</legend>
          <label className="sx-field"><span>Título</span><input {...a11y('title')} value={f.title} onChange={set('title')} placeholder="Cielo profundo en el COAS" maxLength={60} />{err('title')}</label>
          <label className="sx-field"><span>Punto de observación</span>
            <select {...a11y('pointId')} value={f.pointId} onChange={set('pointId')}>{POINTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{err('pointId')}
          </label>
          <div className="sx-grid2">
            <label className="sx-field"><span>Fecha</span><input {...a11y('departure')} type="date" value={f.date} onChange={set('date')} /></label>
            <label className="sx-field"><span>Hora</span><input type="time" value={f.time} onChange={set('time')} aria-label="Hora de salida" /></label>
          </div>
          {err('departure')}
          <div className="sx-grid2">
            <label className="sx-field"><span>Duración (h)</span><input {...a11y('durationH')} type="number" inputMode="decimal" step="0.5" min="0.5" max="12" value={f.durationH} onChange={set('durationH')} />{err('durationH')}</label>
            <label className="sx-field"><span>Precio por persona (ARS)</span><input {...a11y('pricePerPersonARS')} type="number" inputMode="numeric" step="1000" min="1000" value={f.price} onChange={set('price')} placeholder="50000" />{err('pricePerPersonARS')}</label>
          </div>
          <div className="sx-grid2">
            <label className="sx-field"><span>Cupo mínimo</span><input {...a11y('capacityMin')} type="number" inputMode="numeric" min="1" value={f.capacityMin} onChange={set('capacityMin')} />{err('capacityMin')}</label>
            <label className="sx-field"><span>Cupo máximo</span><input {...a11y('capacityMax')} type="number" inputMode="numeric" min="1" max="60" value={f.capacityMax} onChange={set('capacityMax')} />{err('capacityMax')}</label>
          </div>
          <div className="sx-field" role="group" aria-labelledby="sx-l-lang">
            <span id="sx-l-lang">Idiomas</span>
            <div className="sx-chips sx-wrap">{LANGS.map((l) => <button key={l} type="button" className="sx-chip" aria-pressed={f.languages.includes(l)} onClick={() => toggle('languages', l)}>{LANG_LABEL[l]}</button>)}</div>
            {err('languages')}
          </div>
        </fieldset>

        <fieldset>
          <legend>Qué incluye y dónde</legend>
          <div className="sx-field" role="group" aria-labelledby="sx-l-inc">
            <span id="sx-l-inc">Incluye</span>
            <div className="sx-chips sx-wrap">{INCLUDES.map((i) => <button key={i} type="button" className="sx-chip" aria-pressed={f.includes.includes(i)} onClick={() => toggle('includes', i)}>{i}</button>)}</div>
          </div>
          <label className="sx-field"><span>Otros (separados por coma)</span><input value={f.extra} onChange={set('extra')} placeholder="Oxímetro, botiquín" /></label>
          <label className="sx-field"><span>Punto de encuentro (localidad)</span><input {...a11y('meetingPoint')} value={f.meetingPoint} onChange={set('meetingPoint')} />{err('meetingPoint')}</label>
          <div className="sx-field" role="radiogroup" aria-labelledby="sx-l-lvl">
            <span id="sx-l-lvl">Nivel físico</span>
            <div className="sx-seg">{(Object.keys(LEVEL_LABEL) as PhysicalLevel[]).map((l) => <button key={l} type="button" role="radio" aria-checked={f.physicalLevel === l} className="sx-seg-btn" onClick={() => setF({ ...f, physicalLevel: l })}>{LEVEL_LABEL[l]}</button>)}</div>
          </div>
          <label className="sx-field"><span>Altura máxima (m)</span><input {...a11y('maxAltitudeM')} type="number" inputMode="numeric" value={f.maxAltitudeM} onChange={set('maxAltitudeM')} />{err('maxAltitudeM')}</label>
        </fieldset>

        <fieldset>
          <legend>Política de clima</legend>
          <label className="sx-field"><span>Garantía de cielo</span><textarea {...a11y('weatherPolicy')} rows={4} value={f.weatherPolicy} onChange={set('weatherPolicy')} />{err('weatherPolicy')}</label>
        </fieldset>

        {tried && Object.keys(live).length > 0 && <p className="sx-error" role="alert">Revisá {Object.keys(live).length === 1 ? 'el campo marcado' : `los ${Object.keys(live).length} campos marcados`}.</p>}
        <button type="submit" className="sx-btn sx-btn-primary sx-block-btn">Publicar salida</button>
        <p className="sx-muted sx-small">Se guarda en este dispositivo (MVP).</p>
      </form>
    </section>
  );
}
