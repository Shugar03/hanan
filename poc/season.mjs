import * as A from 'astronomy-engine';
const O=new A.Observer(-23.39858,-66.36753,3605);
const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
for(let m=0;m<12;m++){const day=new Date(Date.UTC(2027,m,15,21));
 const dusk=A.SearchAltitude(A.Body.Sun,O,-1,new Date(Date.UTC(2027,m,15,15)),1,-18);const dawn=A.SearchAltitude(A.Body.Sun,O,+1,dusk.date,1,-18);
 let mx=-90,hrs=0;for(let t=+dusk.date;t<=+dawn.date;t+=10*60e3){const a=A.Horizon(new Date(t),O,17.761,-29.008,'normal').altitude;mx=Math.max(mx,a);if(a>20)hrs+=1/6;}
 console.log(months[m],'noche astro',((dawn.date-dusk.date)/36e5).toFixed(1)+'h','núcleo VL máx',mx.toFixed(0)+'°','horas >20°',hrs.toFixed(1));}
