// [ETIQ-BASE-PURE] — 🧪 ¿la etiqueta va POR 100 g o POR RACIÓN? (paso 2 del lector de etiquetas, 30-10-2026)
// PURO: sin DOM, red ni storage. Cierra el bloqueo #7: hoy la app toma lo leído como «por 100 g» sin avisar.
// Usa la misma lectura de cabecera que el normalizador (etiqColumnas) y devuelve lo que la pantalla necesita:
// la base, el peso de la ración, si se puede convertir, y el AVISO en una frase (nunca en silencio).
import { etiqColumnas } from './etiq-norm.mjs';

export function etiqDetectarBase(texto) {
  const c = etiqColumnas(texto);
  const tiene100 = c.orden.includes('100'), tieneRac = c.orden.includes('racion');
  const u = c.u;
  if (tiene100 && tieneRac) return { base: 'ambas', racion: c.racion, u, convertible: true, confianza: 'alta',
    aviso: c.racion ? `La etiqueta trae por 100 ${u} y por ración (${c.racion} ${u}): uso la de 100 ${u}.` : `La etiqueta trae por 100 ${u} y por ración: uso la de 100 ${u}.` };
  if (tiene100 && !c.supuesta) return { base: '100' + u, racion: c.racion, u, convertible: true, confianza: 'alta', aviso: null };
  if (tieneRac && c.racion) return { base: 'racion', racion: c.racion, u, convertible: true, confianza: 'media',
    aviso: `⚠️ Esta etiqueta va POR RACIÓN (${c.racion} ${u}). La paso a 100 ${u}: revísalo con el envase.` };
  if (tieneRac) return { base: 'racion', racion: null, u, convertible: false, confianza: 'media',
    aviso: '⚠️ Esta etiqueta va POR RACIÓN y no dice cuánto pesa: dime los gramos de la ración o no sale por 100 g.' };
  return { base: 'desconocida', racion: null, u, convertible: false, confianza: 'baja',
    aviso: 'No veo si es «por 100 g» o «por ración»: lo trato como 100 g. Míralo en el envase.' };
}

// Pasa a 100 g/ml unos campos leídos POR RACIÓN. kcal, kJ y sodio (mg) en entero; el resto con 1 decimal.
// Sin ración (o ración imposible) no convierte: devuelve null, porque inventar el divisor sería peor.
export function etiqA100(campos, racion) {
  if (!campos || !(racion > 0) || racion > 2000) return null;
  const f = 100 / racion, out = {};
  for (const [k, v] of Object.entries(campos)) out[k] = v == null ? null : +(v * f).toFixed(k === 'kcal' || k === 'kj' || k === 'na' ? 0 : 1);
  return out;
}
// [ETIQ-BASE-PURE-FIN]
