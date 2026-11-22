// satellite.js sin el módulo WASM (su index re-exporta un build con top-level await que rompe el bundle del navegador).
export { json2satrec } from '../../node_modules/satellite.js/dist/io.js';
export { propagate, gstime } from '../../node_modules/satellite.js/dist/propagation.js';
export { radiansToDegrees, degreesToRadians, degreesLat, degreesLong, eciToGeodetic, eciToEcf, ecfToLookAngles } from '../../node_modules/satellite.js/dist/transforms.js';
export type { SatRec } from '../../node_modules/satellite.js/dist/propagation/SatRec.js';
