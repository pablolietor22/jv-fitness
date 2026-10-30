// [ETIQ-NORM-PURE] — 🧪 normalizador de TABLA NUTRICIONAL (paso 1 del lector de etiquetas, 30-10-2026).
// PURO (sin DOM, red ni storage): texto que devuelve un OCR → campos por 100 g/ml, en 8 idiomas
// (es, en, fr, de, it, pt, nl, pl) con TABLAS DE SINÓNIMOS, no con un modelo.
// Lo que añade sobre [ETIQ-OCR-PURE] (el lector de la app, que no se toca):
//   · columnas: «por 100 g» y «por ración» en la MISMA fila → lee la cabecera para saber cuál es cuál;
//     si sólo hay por ración y se sabe la ración, convierte a 100 g (y lo dice en `avisos`);
//   · el %VRN/%IR se descarta; «<0,5» → 0,5 con marca `menorQue`; «trazas/traces/Spuren…» → 0;
//   · salto de línea entre nombre y número (OCR que lee por columnas): los números sueltos se asignan a
//     los campos que esperaban valor, en orden;
//   · sal ↔ sodio (sal = Na × 2,5; Na en mg como el resto de la app); kJ ↔ kcal (÷ 4,184).
// Ninguna lectura es exacta: el que la usa SIEMPRE la enseña como revisable (doctrina de la casa).

const SIN_TILDES = (s) => String(s == null ? '' : s).toLowerCase()
  .replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export function etiqNormTexto(s) { return SIN_TILDES(s).replace(/[ \t]+/g, ' ').trim(); }

// Palabra entera: (^|no-letra) raíz (no-letra|$). Las raíces van sin tildes y en minúscula.
const P = (raices) => new RegExp('(^|[^a-z])(' + raices.join('|') + ')(?![a-z])');
const IGNORAR = P(['mono ?insaturad\\w*', 'poli ?insaturad\\w*', 'polyinsatur\\w*', 'mono ?insatur\\w*', 'monounsaturat\\w*',
  'polyunsaturat\\w*', 'ungesattigt\\w*', 'einfach', 'mehrfach', 'onverzadigd\\w*', 'jednonienasycon\\w*', 'wielonienasycon\\w*',
  'nienasycon\\w*', 'insaturi', 'monoinsaturi', 'polinsaturi', 'polinsaturad\\w*', 'almidon', 'amido', 'starch', 'amidon',
  'starke', 'zetmeel', 'skrobia', 'polialcoholes', 'polyols?', 'polioli', 'poliois', 'polyole', 'poliole', 'colesterol',
  'cholesterol', 'trans', 'omega']);
export const CAMPOS = {
  // orden = del más específico al más genérico (las saturadas antes que las grasas, el azúcar antes que los hidratos)
  sat: P(['saturad(?:as|os|a|o)?', 'saturates', 'saturated', 'satures', 'saturi', 'gesattigte\\w*', 'verzadigde?', 'nasycone']),
  az: P(['azucar(?:es)?', 'sugars?', 'sucres?', 'zucker', 'zuccheri', 'acucares', 'suikers?', 'cukry', 'cukrow']),
  fib: P(['fibra(?:s)?', 'fibre(?:s)?', 'fiber', 'ballaststoffe', 'vezels?', 'voedingsvezels?', 'blonnik(?: pokarmowy)?']),
  na: P(['sodio', 'sodium', 'natrium', 'sod']),
  sal: P(['sal', 'salt', 'sel', 'salz', 'sale', 'zout', 'sol']),
  p: P(['proteinas?', 'proteins?', 'proteines?', 'eiweiss', 'eiweis', 'proteine', 'eiwitten', 'eiwit', 'bialko']),
  c: P(['hidratos de carbono', 'hidratos', 'carbohidratos?', 'carbohydrates?', 'glucides', 'kohlenhydrate', 'carboidrati',
    'carboidratos', 'koolhydraten', 'weglowodany']),
  f: P(['grasas?', 'lipidos', 'materia grasa', 'fat', 'total fat', 'matieres grasses', 'lipides', 'fett', 'grassi', 'lipidi',
    'gorduras', 'vetten', 'vet', 'tluszcz']),
  e: P(['energia', 'valor energetico', 'energy', 'energie', 'valeur energetique', 'brennwert', 'energetische waarde',
    'wartosc energetyczna', 'kalorie', 'valore energetico'])
};
const ORDEN = ['sat', 'az', 'fib', 'na', 'sal', 'p', 'c', 'f', 'e'];

export function etiqCampoDe(linea) {
  const ln = etiqNormTexto(linea);
  if (IGNORAR.test(ln)) return null;
  for (const k of ORDEN) if (CAMPOS[k].test(ln)) return k;
  return null;
}

// «5,2»→5.2 · «2.206»→2206 (punto de millar con 3 cifras) · «1.234,5»→1234.5 · «1 046»→1046 (lo junta quien llama)
export function etiqNumero(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[^\d.,]/g, '');
  if (!s) return null;
  const hasC = s.includes(','), hasD = s.includes('.');
  if (hasC && hasD) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (hasC) s = s.replace(',', '.');
  else if (hasD) { const m = /^(\d+)\.(\d{3})$/.exec(s); if (m) s = m[1] + m[2]; }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const TRAZAS = /(^|[^a-z])(trazas?|traces?|tracce|spuren|vestigios|sporen|sladowe(?: ilosci)?|nd)(?![a-z])/;
const RACION = '(?:por racion|por porcion|racion|porcion|serving|portion|porzione|porcao|porcja|portie|per piece|pieza|stuck)';

// Valores de UNA fila (sin el nombre): números con su unidad, en orden de columna; fuera los %VRN y el «100 g» de cabecera.
export function etiqValoresDeFila(linea) {
  let t = etiqNormTexto(linea)
    .replace(/(^|[^a-z0-9])o\s?(g|gr|mg)(?![a-z])/g, '$1 0 $2')   // «Og» / «O g»: la O del OCR es un cero
    .replace(/(\d)\s*kl(?![a-z])/g, '$1 kj')                 // «1024 kl»: la J que el OCR leyó como L
    .replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2')              // «1 046 kJ» → «1046 kJ»
    // «por 100 g» es cabecera, pero «Grasas 100 g» (un aceite) es un VALOR: sólo se quita con la preposición delante
    .replace(/(^|[^a-z])(?:per|por|pour|je|pro|na|w|in|for|para|valori medi per)\s*100\s*(?:g|ml|gr)\b/g, '$1 ')
    .replace(/\(\s*\d[\d.,]*\s*(?:g|ml)\s*\)/g, ' ');       // «(30 g)» de la ración, no es un valor
  const out = [];
  const re = /(<|≤|menos de|less than|moins de|weniger als|meno di)?\s*(\d[\d.,]*)\s*(%|kj|kcal|mg|µg|mcg|g|ml)?/g;
  let m;
  while ((m = re.exec(t))) {
    if (m[3] === '%') continue;                              // %VRN/%IR: no es un valor por 100 g
    const n = etiqNumero(m[2]); if (n == null) continue;
    out.push({ v: n, u: m[3] || null, menorQue: !!m[1] });
  }
  if (!out.length && TRAZAS.test(t)) out.push({ v: 0, u: 'g', menorQue: false, trazas: true });
  return out;
}

// Trozos de la etiqueta: cada línea, y dentro de ella cada «campo: valor» de las tablas en PÁRRAFO
// («Grasas: 14 g, de las cuales saturadas: 3 g. Hidratos de carbono: 4,5 g; …»). Se corta en «;», «|»,
// y en «, » / «. » seguidos de letra (la coma decimal va pegada a la cifra: «3,47 g» no se corta).
export function etiqTrozos(texto) {
  const out = [];
  for (const raw of String(texto == null ? '' : texto).split(/\r?\n/)) {
    for (const s of raw.split(/[;|¦]|[,.]\s+(?=[^\d\s(])/)) { const t = s.trim(); if (t) out.push(t); }
  }
  return out;
}

// Cabecera: ¿en qué orden vienen las columnas «100 g» y «ración»? y ¿cuánto pesa la ración?
// Se mira sólo lo que hay ANTES de la primera fila de nutrientes (una «ración» suelta en el texto de
// abajo —«1 portion = …», «pour un adulte-type»— no puede cambiar el orden de las columnas).
export function etiqColumnas(texto) {
  const trozos = etiqTrozos(texto);
  const primera = trozos.findIndex((x) => { const k = etiqCampoDe(x); return k && k !== 'e'; });
  const cabecera = primera > 0 ? trozos.slice(0, primera + 1).join('\n') : String(texto == null ? '' : texto);
  const t = etiqNormTexto(cabecera), todo = etiqNormTexto(texto);
  const i100 = t.search(/100\s*(?:g|ml|gr|gramos|grammes|gramm|grammi|gramas|gram|gramow)\b/);
  const iRac = t.search(new RegExp(RACION));
  const pesoRacion = (s) => new RegExp(RACION + '[^\\d\\n]{0,30}(\\d[\\d.,]*)\\s*(g|ml)\\b').exec(s)
    || /(\d[\d.,]*)\s*(g|ml)\s*(?:=\s*)?(?:1\s*)?(?:racion|porcion|serving|portion|porzione|porcao|porcja|portie)/.exec(s);
  const mr = pesoRacion(t) || pesoRacion(todo);             // el peso de la ración puede venir debajo de la tabla
  const racion = mr ? etiqNumero(mr[1]) : null;
  const u = /100\s*ml\b/.test(t) ? 'ml' : 'g';
  let orden;
  if (i100 >= 0 && iRac >= 0) orden = i100 < iRac ? ['100', 'racion'] : ['racion', '100'];
  else if (i100 >= 0) orden = ['100'];
  else if (iRac >= 0) orden = ['racion'];
  else orden = ['100'];
  return { orden, racion: racion && racion > 0 ? racion : null, u, supuesta: i100 < 0 && iRac < 0 };
}

const vacio = () => ({ kcal: null, kj: null, f: null, sat: null, c: null, az: null, fib: null, p: null, sal: null, na: null });

export function etiqNormalizar(texto) {
  const lineas = etiqTrozos(texto);
  const col = etiqColumnas(texto);
  const cols = col.orden.map(() => vacio());
  const menores = new Set(), avisos = [];
  const pendientes = [];                                     // campos con nombre pero sin número todavía (OCR por columnas)
  // Una fila con MENOS números que columnas (la tabla en párrafo, o una celda que el OCR no leyó): su
  // primer número es el de 100 g, que es la columna que siempre se rellena primero en las etiquetas.
  const i100c = Math.max(0, col.orden.indexOf('100'));
  const columna = (i, n) => (n < cols.length ? (i === 0 ? i100c : -1) : i);
  const poner = (k, vals) => {
    vals.forEach((x, j) => {
      const i = columna(j, vals.length);
      if (i < 0 || i >= cols.length || cols[i][k] != null) return;
      let v = x.v;
      // sodio en mg, como la app; sin unidad, menos de 10 sólo puede ser gramos (nadie escribe «sodio 0,4 mg»)
      if (k === 'na') v = x.u === 'mg' ? v : (x.u === 'g' || (!x.u && v < 10) ? v * 1000 : v);
      cols[i][k] = v;
      if (x.menorQue && i === i100c) menores.add(k);
    });
  };
  const ponerEnergia = (vals, ln) => {
    // en la fila de energía puede haber kJ y kcal por cada columna: «2206 kJ / 529 kcal | 662 kJ / 159 kcal»
    const kj = vals.filter((x) => x.u === 'kj'), kc = vals.filter((x) => x.u === 'kcal'), sin = vals.filter((x) => !x.u);
    kj.forEach((x, j) => { const i = columna(j, kj.length); if (i >= 0 && i < cols.length && cols[i].kj == null) cols[i].kj = x.v; });
    kc.forEach((x, j) => { const i = columna(j, kc.length); if (i >= 0 && i < cols.length && cols[i].kcal == null) cols[i].kcal = x.v; });
    const dice = (u) => new RegExp('(^|[^a-z])' + u + '(?![a-z])').test(ln || '');
    if (!kj.length && !kc.length && sin.length && dice('kcal') !== dice('kj')) {
      // «Energía (kcal) 529»: la unidad va en el nombre, no pegada al número
      const u = dice('kcal') ? 'kcal' : 'kj';
      sin.forEach((x, i) => { if (i < cols.length && cols[i][u] == null) cols[i][u] = x.v; });
    } else if (!kj.length && !kc.length && sin.length) {
      // «kJ/kcal 1046/250»: sin unidad pegada, van a pares kJ, kcal por columna
      for (let i = 0; i * 2 + 1 < sin.length && i < cols.length; i++) {
        if (cols[i].kj == null) cols[i].kj = sin[i * 2].v;
        if (cols[i].kcal == null) cols[i].kcal = sin[i * 2 + 1].v;
      }
    }
  };
  for (const raw of lineas) {
    const ln = etiqNormTexto(raw); if (!ln) continue;
    const k = etiqCampoDe(ln);
    const vals = etiqValoresDeFila(ln);
    if (!k) {
      if (IGNORAR.test(ln)) continue;
      const soloNumeros = vals.length && !/[a-z]{4,}/.test(ln.replace(/kcal|kj|mg/g, ''));
      if (soloNumeros && vals.some((x) => x.u === 'kj' || x.u === 'kcal')) { ponerEnergia(vals, ln); continue; }   // «529 kcal» suelto
      // fila de sólo números (OCR por columnas): se la lleva el primer campo que esperaba valor
      if (soloNumeros && pendientes.length) {
        const kp = pendientes.shift();
        if (kp === 'e') ponerEnergia(vals, ln); else poner(kp, vals);
      } else if (!vals.length && /\b(kj|kcal)\b/.test(ln)) pendientes.push('e');
      continue;
    }
    // fila fusionada «grasas 10 g de las cuales saturadas 4 g» / «carboidrati 50 di cui zuccheri 20»
    const fusionF = k === 'sat' && CAMPOS.f.test(ln.replace(CAMPOS.sat, ' ')) && vals.length >= 2;
    const fusionC = k === 'az' && CAMPOS.c.test(ln.replace(CAMPOS.az, ' ')) && vals.length >= 2;
    if (fusionF || fusionC) { poner(fusionF ? 'f' : 'c', [vals[0]]); poner(k, [vals[1]]); continue; }
    if (k === 'e') { if (vals.length) ponerEnergia(vals, ln); else pendientes.push('e'); continue; }
    if (vals.length) poner(k, vals); else pendientes.push(k);
  }
  // la columna que vale es la de 100 g; si sólo hay ración, se convierte (si se sabe cuánto pesa)
  const i100 = col.orden.indexOf('100'), iRac = col.orden.indexOf('racion');
  let campos, base;
  if (i100 >= 0) { campos = cols[i100]; base = col.u === 'ml' ? '100ml' : '100g'; }
  else if (col.racion) {
    const fac = 100 / col.racion; campos = vacio(); base = col.u === 'ml' ? '100ml' : '100g';
    for (const k of Object.keys(campos)) if (cols[iRac][k] != null) campos[k] = +(cols[iRac][k] * fac).toFixed(k === 'kcal' || k === 'kj' || k === 'na' ? 0 : 1);
    avisos.push(`La etiqueta da los valores por ración (${col.racion} ${col.u}); los he pasado a 100 ${col.u}. Revísalo.`);
  } else { campos = cols[iRac >= 0 ? iRac : 0]; base = 'racion'; avisos.push('⚠️ La etiqueta va por ración y no dice cuánto pesa: estos números NO son por 100 g.'); }
  if (col.supuesta) avisos.push('No veo «por 100 g» ni «por ración»: supongo 100 g.');
  // energía de reserva: si las filas no la dieron, la primera «N kcal» / «N kJ» del texto entero (es la de
  // 100 g en casi todas las etiquetas; es lo mismo que hace hoy el lector de la app)
  if (campos.kcal == null && campos.kj == null && base !== 'racion') {
    const todo = etiqNormTexto(texto).replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');
    const mc = /(\d[\d.,]*)\s*(?:kcal|keal|kca1|kcai)(?![a-z])/.exec(todo), mj = /(\d[\d.,]*)\s*(?:kj|kl)(?![a-z])/.exec(todo);
    if (mc) campos.kcal = etiqNumero(mc[1]);
    if (mj) campos.kj = etiqNumero(mj[1]);
  }
  // derivados: kJ↔kcal y sal↔sodio, marcados como derivados (nunca se inventa: sólo se convierte lo leído)
  const derivados = [];
  if (campos.kcal == null && campos.kj != null) { campos.kcal = Math.round(campos.kj / 4.184); derivados.push('kcal'); }
  if (campos.kj == null && campos.kcal != null) { campos.kj = Math.round(campos.kcal * 4.184); derivados.push('kj'); }
  if (campos.sal == null && campos.na != null) { campos.sal = +(campos.na * 2.5 / 1000).toFixed(2); derivados.push('sal'); }
  if (campos.na == null && campos.sal != null) { campos.na = Math.round(campos.sal * 400); derivados.push('na'); }
  // techos físicos por 100 g: un número imposible se anula y se avisa (no se corrige a ojo)
  for (const k of ['f', 'sat', 'c', 'az', 'fib', 'p', 'sal']) if (campos[k] != null && campos[k] > 100) { avisos.push(`«${k}» = ${campos[k]} no cabe en 100 g: lo dejo vacío.`); campos[k] = null; }
  if (campos.kcal != null && campos.kcal > 900) { avisos.push(`${campos.kcal} kcal no cabe en 100 g: la dejo vacía.`); campos.kcal = null; }
  return { campos, base, racion: col.racion, columnas: col.orden, porRacion: iRac >= 0 ? cols[iRac] : null,
    menorQue: [...menores], derivados, avisos };
}
// [ETIQ-NORM-PURE-FIN]
