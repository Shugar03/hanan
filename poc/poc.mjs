import * as sat from 'satellite.js';
import * as A from 'astronomy-engine';
const obs = { lat: -23.39858, lon: -66.36753, h: 3605 }; // Susques
const O = new A.Observer(obs.lat, obs.lon, obs.h);
const start = new Date('2026-11-22T18:00:00-03:00');
const fmt = d => d.toLocaleString('es-AR',{timeZone:'America/Argentina/Jujuy',hour12:false});
// Twilight & moon
const dusk = A.SearchAltitude(A.Body.Sun, O, -1, start, 1, -18);
const dawn = A.SearchAltitude(A.Body.Sun, O, +1, dusk.date, 1, -18);
console.log('Noche astronómica:', fmt(dusk.date), '→', fmt(dawn.date));
const mr = A.SearchRiseSet(A.Body.Moon, O, +1, start, 2), ms = A.SearchRiseSet(A.Body.Moon, O, -1, start, 2);
console.log('Luna: sale', fmt(mr.date), 'se pone', fmt(ms.date), 'iluminación', (A.Illumination(A.Body.Moon, start).phase_fraction*100).toFixed(0)+'%');
// Milky Way core (Sgr A*: RA 17.761h, Dec -29.008)
let best={alt:-90};
for (let t=+dusk.date; t<=+dawn.date; t+=10*60e3){const hz=A.Horizon(new Date(t),O,17.761,-29.008,'normal'); if(hz.altitude>best.alt) best={alt:hz.altitude,t};}
console.log('Núcleo Vía Láctea máx altura durante noche astronómica:', best.alt.toFixed(1)+'°', fmt(new Date(best.t)));
for (const b of ['Venus','Mars','Jupiter','Saturn']){const eq=A.Equator(A.Body[b],dusk.date,O,true,true);const hz=A.Horizon(dusk.date,O,eq.ra,eq.dec,'normal');console.log(b,'alt al anochecer',hz.altitude.toFixed(1)+'°');}
// Satellites
const stats={};
const ids={ISS:25544,'SAOCOM 1A':43641,'SAOCOM 1B':46265};
const gd={latitude:sat.degreesToRadians(obs.lat),longitude:sat.degreesToRadians(obs.lon),height:obs.h/1000};
for (const [name,id] of Object.entries(ids)){
  const omm=(await (await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=JSON`)).json())[0];
  const rec=sat.json2satrec(omm); let inPass=false, p={};
  for (let t=+start; t<+start+7*24*3600e3; t+=20e3){
    const d=new Date(t), pv=sat.propagate(rec,d); if(!pv.position) continue;
    const ecf=sat.eciToEcf(pv.position,sat.gstime(d)); const la=sat.ecfToLookAngles(gd,ecf);
    const el=sat.radiansToDegrees(la.elevation);
    const sunAlt=A.Horizon(d,O,...(()=>{const e=A.Equator(A.Body.Sun,d,O,true,true);return[e.ra,e.dec]})(),'normal').altitude;
    // sunlit: sat ECI vs sun direction, cylindrical shadow
    const s=A.GeoVector(A.Body.Sun,d,true); const sl=Math.hypot(s.x,s.y,s.z); const u=[s.x/sl,s.y/sl,s.z/sl];
    const r=[pv.position.x,pv.position.y,pv.position.z]; const dot=r[0]*u[0]+r[1]*u[1]+r[2]*u[2];
    const perp=Math.sqrt(Math.max(0,r[0]**2+r[1]**2+r[2]**2-dot*dot)); const sunlit= dot>0 || perp>6371;
    const visible = el>10 && sunAlt<-6 && sunlit; if(el>10){stats[name]=(stats[name]||{up:0,dark:0,lit:0});stats[name].up++; if(sunAlt<-6)stats[name].dark++; if(sunAlt<-6&&sunlit)stats[name].lit++;}
    if(visible && !inPass){inPass=true;p={name,start:d,max:el,maxT:d};}
    if(visible && el>p.max){p.max=el;p.maxT=d;}
    if(!visible && inPass){inPass=false;console.log(`Pase visible ${name}: ${fmt(p.start)} → ${fmt(d)} máx ${p.max.toFixed(0)}° (${fmt(p.maxT)})`);}
  }
}
console.log(stats)
