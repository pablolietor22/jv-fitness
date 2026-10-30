// [ETIQ-FILAS-PURE] — 🧪 rehacer las FILAS de una tabla nutricional con la POSICIÓN de cada palabra
// (paso 1b del lector de etiquetas, 30-10-2026). PURO: sin DOM, red ni storage.
//
// POR QUÉ. El banco de pruebas (tools/etiquetas/banco-off.mjs) enseña que el fallo que más pesa no es
// entender las palabras sino el ORDEN: el OCR devuelve primero todos los nombres («Grasas», «Hidratos»…)
// y luego todos los números, así que nadie sabe qué número es de qué fila. Tanto el OCR de Open Food
// Facts (Google Vision) como Tesseract dan, de cada palabra, su caja en la foto: con eso se rehacen las
// filas como las ve una persona, de arriba abajo y de izquierda a derecha, y el normalizador
// (etiq-norm.mjs) lee fila a fila.
//
// ENTRADA: [{t:'Grasas', x0, y0, x1, y1}, …] (píxeles de la foto). SALIDA: el texto, una fila por línea.
// Una palabra entra en una fila si su centro vertical cae a menos de media altura (mediana de la fila)
// del centro de la fila. Fotos torcidas más de unos grados: cada fila sale partida en dos (se nota en el
// banco y se arregla con la inclinación, no aquí).

export function etiqFilasDeCajas(palabras, opciones = {}) {
  const tol = opciones.tolerancia ?? 0.5;
  const ws = (palabras || []).filter((w) => w && String(w.t || '').trim() && w.y1 > w.y0)
    .map((w) => ({ t: String(w.t), x0: w.x0, x1: w.x1, yc: (w.y0 + w.y1) / 2, h: w.y1 - w.y0 }))
    .sort((a, b) => a.yc - b.yc);
  const filas = [];
  for (const w of ws) {
    // la fila más cercana en vertical cuyo centro esté dentro de la tolerancia
    let mejor = null, dist = Infinity;
    for (const f of filas) {
      const d = Math.abs(f.yc - w.yc);
      if (d <= tol * Math.max(f.h, w.h) && d < dist) { mejor = f; dist = d; }
    }
    if (!mejor) { filas.push({ yc: w.yc, h: w.h, ws: [w] }); continue; }
    mejor.ws.push(w);
    mejor.yc = mejor.ws.reduce((s, x) => s + x.yc, 0) / mejor.ws.length;
    mejor.h = mediana(mejor.ws.map((x) => x.h));
  }
  return filas.sort((a, b) => a.yc - b.yc)
    .map((f) => f.ws.sort((a, b) => a.x0 - b.x0).map((w) => w.t).join(' '))
    .join('\n');
}

// De la respuesta de Google Vision que Open Food Facts guarda junto a cada foto ({responses:[{textAnnotations}]}):
// la primera anotación es el texto entero; las siguientes, una por palabra con su polígono.
export function etiqCajasDeVision(json) {
  const r = json && json.responses && json.responses[0];
  const anots = (r && r.textAnnotations) || [];
  const out = [];
  for (let i = 1; i < anots.length; i++) {
    const v = (anots[i].boundingPoly && anots[i].boundingPoly.vertices) || [];
    if (v.length < 4) continue;
    const xs = v.map((p) => p.x || 0), ys = v.map((p) => p.y || 0);
    out.push({ t: anots[i].description, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
  }
  return out;
}

// Las dos lecturas juntas: el texto tal cual lo dio el OCR y las filas rehechas por posición. Medido en el
// banco (30-10): las filas aciertan mucho más los macros, pero a veces pierden la energía (una fila que junta
// dos columnas). Regla: cada campo, de las filas si lo tienen y si no del texto; y la kcal, de entre las dos
// candidatas, la que más se acerca a la de Atwater (4·p + 4·c + 9·f) con los macros leídos. Ninguna cifra se
// inventa: sólo se elige entre lo que las dos lecturas sacaron de la foto.
export function etiqElegir(porTexto, porFilas) {
  const t = porTexto || {}, f = porFilas || {}, out = {};
  for (const k of new Set([...Object.keys(t), ...Object.keys(f)])) out[k] = f[k] != null ? f[k] : (t[k] != null ? t[k] : null);
  const cand = [f.kcal, t.kcal].filter((x) => x != null);
  if (cand.length === 2 && cand[0] !== cand[1] && out.p != null && out.c != null && out.f != null) {
    const atw = 4 * out.p + 4 * out.c + 9 * out.f;
    out.kcal = Math.abs(cand[0] - atw) <= Math.abs(cand[1] - atw) ? cand[0] : cand[1];
  }
  return out;
}

function mediana(a) { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; }
// [ETIQ-FILAS-PURE-FIN]
