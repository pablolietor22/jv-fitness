// COMIDA SIN RUIDO · capa canónica: UNA estimación por alimento en vez de miles de variantes.
//
// Qué resuelve. En la Base España «chocolate negro» casa 1.484 fichas y «manzana» 1.365: el usuario no sabe
// en cuál apuntar y eso es ansiedad al registrar. Aquí se AGRUPAN las variantes de un mismo alimento bajo una
// entrada canónica (una cifra tipo con su rango y su origen) y se OCULTAN detrás de ella con una regla
// REVERSIBLE: las filas no se tocan, no se borran, no se renombran; solo se dice «estas N son la misma cosa».
// Principio «modo super Andy»: una estimación DECLARADA es mejor que un hueco; se estima primero y se afina
// después (subtipos, y al final el producto concreto).
//
// Dos reglas que no se negocian (pliego `_PLIEGO-COMIDA-SIN-RUIDO-25-10.md`, §4.3, §4.4 y P6):
//   · NADA SE INVENTA. Toda cifra de una entrada es la MEDIANA de fichas reales ya limpiadas (o la de la fuente
//     oficial/institucional si la hay). Con menos de `nMinimo` fichas limpias no hay cifra: `estimacion` es null
//     y la entrada lo dice. Un campo que la muestra no trae (fibra, azúcar, saturadas, sodio) va AUSENTE, jamás 0.
//   · NADA SE MEZCLA EN SILENCIO. Cada entrada lleva su `etiqueta` de origen: «oficial», «tabla» (institucional),
//     «media-catalogo» (mediana de Open Food Facts, ESTIMADO) o «sin-estimacion». Lo que no es oficial se
//     pinta con «~» y, si la muestra es ancha, con el rango delante.
//
// Cómo. Todo son funciones PURAS (sin pantalla, sin IndexedDB, sin red, sin reloj): reciben datos y devuelven
// datos. La capa se CONSTRUYE en el taller (`tools/alimentos/canonico-construye.js`, contra una copia fechada de
// la Base España que NO está en el repo) y baja al móvil ya hecha; en el móvil solo se BUSCA (`buscarCanonico`)
// y se PLIEGA (`plegarResultados`). Test: `_tests/test-comida-canonica.node.js`.
//
// Convenciones heredadas del HTML (para que ambos lados hablen el mismo idioma): `normalizar` es `otroNorm`,
// `tokens` es `dbxTokens` (el test lo comprueba CONTRA el HTML real, no contra una copia).
//
// Todos los umbrales de PARAMETROS son propuestas del pliego marcadas [P]: se validan con datos propios antes
// de darlos por buenos. Están en UN sitio, y todas las funciones aceptan otros por si el piloto los cambia.

/** Mezcla unos umbrales parciales con los del pliego: un P a medias NO apaga los filtros que no menciona. */
function par(P) { return (!P || P === PARAMETROS) ? PARAMETROS : { ...PARAMETROS, ...P }; }

/** Umbrales provisionales [P] del pliego. Congelado: para cambiarlos se pasa otro objeto, no se muta este. */
export const PARAMETROS = Object.freeze({
  nMinimo: 30,            // fichas limpias mínimas para una cifra automática (§4.3 regla 1)
  dentro: 0.20,           // «a ±20 % de la mediana» (§4.5)
  bajoDispersion: 0.25,   // riesgo bajo: dispersión ≤ 25 % …
  bajoDentro: 0.80,       // … y al menos el 80 % de las fichas a ±20 %
  altoDispersion: 0.60,   // riesgo alto: dispersión > 60 % …
  altoDentro: 0.60,       // … o menos del 60 % de las fichas a ±20 %
  revisarModaPct: 0.10,   // mediana y moda difieren más del 10 % → marcar para revisión (§4.3) …
  modaMinFichas: 5,       // … pero solo si la moda es un pico de verdad: al menos 5 fichas con ese valor …
  modaMinFraccion: 0.10,  // … y al menos el 10 % de las limpias (con valores todos distintos la «moda» es ruido)
  cocienteKcal: 0.35,     // una ficha no cuadra con sus macros si kcal y 4p+4c+9f difieren más de este % …
  margenKcal: 40,         // … Y más de este margen absoluto (los redondeos de etiqueta no son error)
  logicaPct: 0.10,        // la cifra de una entrada es LÓGICA si kcal ≈ 4P+4C+9G dentro de ±10 % …
  logicaMinKcal: 5,       // … con un suelo de ±5 kcal (en una bebida de 2 kcal el 10 % no tiene sentido)
});

// ───────────────────────── texto: el mismo idioma que la app ─────────────────────────

/**
 * Minúsculas y sin tildes (la ñ se conserva). Es `otroNorm` del HTML: el MISMO normalizador a los dos lados
 * para que el buscador y la capa no se desincronicen.
 * @param {*} s
 * @returns {string}
 */
export function normalizar(s) {
  return String(s == null ? "" : s).toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ü/g, "u");
}

/**
 * Palabras ÚNICAS de ≥2 letras o cifras, en orden de aparición. Es `dbxTokens` del HTML (sirve para casar
 * lo que teclea el usuario por prefijo, igual que el buscador de la Base España).
 * @param {*} nombre
 * @returns {string[]}
 */
export function tokens(nombre) {
  const n = normalizar(nombre).replace(/[^a-z0-9ñ]+/g, " ").trim();
  if (!n) return [];
  const out = [], vistos = Object.create(null);
  for (const t of n.split(" ")) {
    if (t.length < 2 || vistos[t]) continue;
    vistos[t] = 1; out.push(t);
  }
  return out;
}

/**
 * Palabras EN ORDEN y con repetidas (a diferencia de `tokens`): hace falta el orden para saber si un
 * nombre EMPIEZA por una frase («chocolate negro») y no solo la contiene («almendra con chocolate negro»).
 * @param {*} nombre
 * @returns {string[]}
 */
export function palabras(nombre) {
  const n = normalizar(nombre).replace(/[^a-z0-9ñ]+/g, " ").trim();
  return n ? n.split(" ") : [];
}

/**
 * Quita la marca del final del nombre. Open Food Facts en España la añade entre paréntesis al final
 * («Almendras chocolate negro (Lacasa)»); a veces el paréntesis llega cortado («… (San Benedett»).
 * Solo se quita el ÚLTIMO grupo. Si todo el nombre fuera un paréntesis se devuelve tal cual.
 * @param {*} nombre
 * @returns {string}
 */
export function quitarMarca(nombre) {
  const s = String(nombre == null ? "" : nombre);
  const r = s.replace(/\s*\([^()]*\)?\s*$/, "");
  return r.trim() ? r : s;
}

/**
 * Clave de «variante» de una ficha: el nombre sin marca, normalizado. Dos fichas con la misma clave son
 * la misma cosa vista desde dos marcas o dos escritos distintos («Chocolate negro 70% (Lindt)» y
 * «chocolate  NEGRO 70 % (Valor)» → «chocolate negro 70»).
 * @param {*} nombre
 * @returns {string}
 */
export function claveVariante(nombre) {
  return palabras(quitarMarca(nombre)).join(" ");
}

// ───────────────────────── estadística ─────────────────────────

/**
 * Percentil por interpolación lineal sobre una lista YA ORDENADA ascendente (p entre 0 y 1).
 * @param {number[]} ord
 * @param {number} p
 * @returns {number|null} null si la lista está vacía
 */
export function percentil(ord, p) {
  if (!Array.isArray(ord) || !ord.length) return null;
  if (ord.length === 1) return ord[0];
  const pos = Math.min(1, Math.max(0, p)) * (ord.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return ord[lo] + (ord[hi] - ord[lo]) * (pos - lo);
}

/**
 * Mediana de una lista de números (no la modifica). Ignora lo que no sea número finito.
 * @param {number[]} valores
 * @returns {number|null}
 */
export function mediana(valores) {
  const v = limpiarNumeros(valores);
  return percentil(v, 0.5);
}

function limpiarNumeros(valores) {
  return (Array.isArray(valores) ? valores : []).filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
}

/**
 * Resumen de una muestra: n, mediana, P10, P90, dispersión relativa ((P90−P10)/mediana) y la fracción de
 * fichas a ±`P.dentro` de la mediana.
 * @param {number[]} valores
 * @param {object} [P] umbrales (PARAMETROS por defecto)
 * @returns {{n:number, mediana:number|null, p10:number|null, p90:number|null, dispersion:number|null, dentro:number|null}}
 */
export function estadisticas(valores, P = PARAMETROS) {
  P = par(P);
  const v = limpiarNumeros(valores);
  if (!v.length) return { n: 0, mediana: null, p10: null, p90: null, dispersion: null, dentro: null };
  const med = percentil(v, 0.5), p10 = percentil(v, 0.1), p90 = percentil(v, 0.9);
  let dispersion = null, dentro = null;
  if (med > 0) {
    dispersion = (p90 - p10) / med;
    let k = 0;
    for (const x of v) if (Math.abs(x - med) <= P.dentro * med) k++;
    dentro = k / v.length;
  } else if (p90 === p10) {
    // mediana 0 y P10 = P90: la muestra es toda ceros (bebidas «zero»): es consistente, no indefinida
    dispersion = 0;
    dentro = v.filter((x) => x === med).length / v.length;
  }
  return { n: v.length, mediana: med, p10, p90, dispersion, dentro };
}

/**
 * Riesgo de colapsar una familia a UNA cifra (pliego §4.5): bajo si la dispersión es ≤ 25 % y al menos el 80 %
 * de las fichas cae a ±20 %; alto si la dispersión pasa del 60 % o cae menos del 60 %; medio el resto.
 * Sin muestra devuelve null; con mediana 0 y valores distintos de cero (dispersión indefinida) devuelve «alto»: lo que
 * no se puede medir no se declara seguro. Una muestra toda de ceros (bebidas «zero») es consistente y sale «bajo».
 * @param {{n:number, dispersion:number|null, dentro:number|null}} est salida de `estadisticas`
 * @param {object} [P]
 * @returns {"bajo"|"medio"|"alto"|null}
 */
export function riesgoDe(est, P = PARAMETROS) {
  P = par(P);
  if (!est || !est.n) return null;
  if (est.dispersion == null || est.dentro == null) return "alto";
  if (est.dispersion <= P.bajoDispersion && est.dentro >= P.bajoDentro) return "bajo";
  if (est.dispersion > P.altoDispersion || est.dentro < P.altoDentro) return "alto";
  return "medio";
}

// ───────────────────────── limpieza de fichas ─────────────────────────

/** kcal que salen de las macros con Atwater (4 de proteína, 4 de hidratos, 9 de grasa) y, si la fila lo trae, 7 por gramo de alcohol. */
export function kcalDeMacros(p, c, f, alcohol) {
  return 4 * (+p || 0) + 4 * (+c || 0) + 9 * (+f || 0) + 7 * (+alcohol || 0);
}

/**
 * ¿Las kcal y las macros cuentan la misma historia? Falla solo si difieren más del `cocienteKcal` Y más del
 * `margenKcal` absoluto: el alcohol, los polioles y los redondeos de etiqueta mueven unas kcal sin que la ficha esté mal.
 * @returns {boolean} true si CUADRA
 */
export function cuadraConMacros(kcal, p, c, f, P = PARAMETROS, alcohol) {
  P = par(P);
  const e = kcalDeMacros(p, c, f, alcohol), d = Math.abs(kcal - e);
  const base = Math.max(kcal, e);
  return !(d > P.margenKcal && d > P.cocienteKcal * base);
}

/**
 * ¿Es LÓGICA la cifra de una entrada o de un plato? (principio de producto del 29-10: «el número tiene que ser
 * lógico»). Dos comprobaciones: (1) coherencia, kcal ≈ 4P+4C+9G dentro de ±`logicaPct` (con un suelo de
 * `logicaMinKcal`); (2) si se pasa un `rango` {min,max} (el de su categoría, en las mismas unidades), que la kcal
 * caiga dentro. Una cifra no finita o sin macros no es lógica. No corrige nada: solo informa.
 * @param {{kcal:number,p:number,c:number,f:number}} est
 * @param {{min:number,max:number}|null} [rango]
 * @returns {{ok:boolean, coherente:boolean, dentroRango:boolean|null, kcalMacros:number|null, desvio:number|null}}
 */
export function comprobarLogica(est, rango, P = PARAMETROS) {
  P = par(P);
  const nums = est && [est.kcal, est.p, est.c, est.f].concat(est.alcohol == null ? [] : [est.alcohol]).every((x) => typeof x === "number" && Number.isFinite(x));
  if (!nums) return { ok: false, coherente: false, dentroRango: null, kcalMacros: null, desvio: null };
  const e = kcalDeMacros(est.p, est.c, est.f, est.alcohol), desvio = est.kcal - e;
  const tol = Math.max(P.logicaPct * est.kcal, P.logicaMinKcal);
  const coherente = Math.abs(desvio) <= tol;
  let dentroRango = null;
  if (rango && typeof rango.min === "number" && typeof rango.max === "number") dentroRango = est.kcal >= rango.min && est.kcal <= rango.max;
  return { ok: coherente && dentroRango !== false, coherente, dentroRango, kcalMacros: redondear1(e), desvio: redondear1(desvio) };
}

/** Fracciones de lo que te has comido (principio de producto del 29-10): todo, la mitad o compartido (÷2 por defecto). */
export const FRACCIONES = Object.freeze({ todo: 1, mitad: 0.5, compartido: 0.5 });

/**
 * Aplica una fracción a los valores de UN TOTAL (un plato entero, una pieza…): kcal y macros. Solo escala lo que
 * hay: un campo ausente sigue ausente, nunca pasa a 0. `compartido` divide entre `entre` personas (entero ≥ 2;
 * cualquier otra cosa → 2). El resultado va redondeado a un decimal; el factor, exacto.
 * @param {object} valores {kcal,p,c,f,fib?,az?,sat?,na?}
 * @param {"todo"|"mitad"|"compartido"} [modo]
 * @param {number} [entre]
 * @returns {{modo:string, factor:number, valores:object}|null} null si el modo no existe o no hay valores
 */
export function aplicarFraccion(valores, modo = "todo", entre = 2) {
  if (!valores || typeof valores !== "object" || !Object.prototype.hasOwnProperty.call(FRACCIONES, modo)) return null;
  let factor = FRACCIONES[modo];
  if (modo === "compartido") factor = 1 / ((Number.isInteger(entre) && entre >= 2) ? entre : 2);
  const out = {};
  for (const k of Object.keys(valores)) {
    const v = valores[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = redondear1(v * factor);
  }
  return { modo, factor, valores: out };
}

/**
 * Por qué se descarta una ficha para MEDIR (null = es limpia). Descartar aquí no la borra de nada: solo no
 * entra en la mediana. Motivos:
 *   · «invalida»: kcal o macros no son números, o son negativos;
 *   · «macros-imposibles»: proteínas + hidratos + grasas pasan de 100 g por 100 g (con 1 g de margen de redondeo);
 *   · «cero-con-macros-cero»: 0 kcal y macros a cero (suele ser un dato vacío; las bebidas «zero» lo piden
 *     permitido con `permiteCero`, porque ahí el cero ES el dato);
 *   · «macros-a-cero-con-kcal»: kcal sin ninguna macro, no verificable por coherencia (cervezas, sobre todo);
 *   · «incoherente»: kcal y macros no cuadran (`cuadraConMacros`).
 * @param {object} fila {kcal,p,c,f,...}
 * @param {object} [opciones] {permiteCero:boolean}
 * @returns {string|null}
 */
export function motivoDescarte(fila, opciones, P = PARAMETROS) {
  const o = opciones || {};
  if (!fila || typeof fila !== "object") return "invalida";
  const kcal = fila.kcal, p = fila.p, c = fila.c, f = fila.f;
  for (const x of [kcal, p, c, f]) if (typeof x !== "number" || !Number.isFinite(x) || x < 0) return "invalida";
  if (fila.alcohol != null && (typeof fila.alcohol !== "number" || !Number.isFinite(fila.alcohol) || fila.alcohol < 0)) return "invalida";
  const macros = p + c + f;
  if (macros > 101) return "macros-imposibles";       // más de 100 g de macros en 100 g de alimento: no existe
  if (kcal === 0 && macros === 0) return o.permiteCero ? null : "cero-con-macros-cero";
  if (kcal > 0 && macros === 0 && !(fila.alcohol > 0)) return "macros-a-cero-con-kcal";   // un licor puro tiene kcal sin macros: son del alcohol
  if (!cuadraConMacros(kcal, p, c, f, P, fila.alcohol)) return "incoherente";
  return null;
}

// ───────────────────────── reglas: qué fila es de qué alimento ─────────────────────────

// Palabras que no cambian lo que es un alimento (formato y envase). Las usa `exigeSolo`.
const NEUTRAS = ["g", "gr", "kg", "ml", "l", "cl", "ud", "uds", "unidad", "unidades", "pack", "x", "bolsa", "bandeja",
  "formato", "familiar", "ahorro", "extra", "categoria", "calibre", "granel", "pieza", "piezas"];

function esCifra(w) { return /^\d+$/.test(w); }

// Igualdad de palabra con plural en -s / -es / -ces (arroz → arroces) por cualquiera de los dos lados. La corta ha de
// tener ≥3 letras: con 1 o 2 («m», «te») cualquier palabra suelta casaría con «mes», «tes»…
function igualPalabra(a, b) {
  if (a === b) return true;
  const c = a.length <= b.length ? a : b, l = a.length <= b.length ? b : a;
  if (c.length < 3) return false;
  if (l === c + "s" || l === c + "es") return true;
  if (c.endsWith("z") && l === c.slice(0, -1) + "ces") return true;
  return false;
}

// ¿La frase `fw` (palabras) aparece seguida en `w`? Con plural tolerado.
function contieneFrase(w, fw) {
  if (!fw.length) return false;
  for (let i = 0; i + fw.length <= w.length; i++) {
    let ok = true;
    for (let j = 0; j < fw.length; j++) if (!igualPalabra(fw[j], w[i + j])) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

function estaEn(w, lista) {
  for (const x of lista) if (igualPalabra(x, w)) return true;
  return false;
}

/**
 * ¿La ficha es de este alimento según su regla? La regla es:
 *   · `incluye`: frases (texto); el nombre SIN marca tiene que EMPEZAR por alguna («chocolate negro» casa
 *     «Chocolate negro 70% (Lindt)» y NO «Almendras con chocolate negro»);
 *   · `excluye`: palabras sueltas que lo descalifican si aparecen en cualquier sitio del nombre
 *     («zumo», «sidra»…); es lo que separa «manzana» (fruta) de «Zumo de manzana»;
 *   · `exigeSolo`: si existe, lo que sigue a la frase solo puede ser cifras, formato/envase neutro o estas
 *     palabras (variedades, «ecológica»…). Es la regla estricta de la fruta y la verdura fresca;
 *   · `contieneAlguna`: si existe, el nombre tiene que traer AL MENOS UNA de esas palabras o frases seguidas en
 *     cualquier sitio («atún» + «natural» o «agua» → atún al natural; «0 0» casa «0,0» y NO «0,33»). Separa las
 *     familias bimodales en entradas distintas.
 * Con plural tolerado en las palabras de la regla y del nombre.
 * @param {*} nombre nombre de la ficha (con marca; se quita aquí)
 * @param {{incluye:string[], excluye?:string[], exigeSolo?:string[]}} regla
 * @returns {number} longitud en palabras de la frase que casó (0 = no pertenece)
 */
export function pertenece(nombre, regla) {
  return pertenecePalabras(palabras(quitarMarca(nombre)), regla, palabras(nombre));
}

/**
 * Lo mismo que `pertenece` pero sobre las palabras YA sacadas del nombre: `w` sin la marca (`palabras(quitarMarca(n))`) y
 * `wf` con TODO el nombre (`palabras(n)`, también lo que va entre paréntesis), así `asignar` las calcula UNA vez por
 * ficha y no una por regla. La frase `incluye` y `exigeSolo` miran `w` (la marca no estorba); `excluye` y `contieneAlguna`
 * miran `wf` (un paréntesis descriptivo como «(chips)» o «(desnatado)» sí cuenta; la marca solo molesta si choca con
 * una palabra de la regla). Sin `wf` se usa `w`.
 * @param {string[]} w
 * @param {object} regla
 * @param {string[]} [wf]
 * @returns {number}
 */
export function pertenecePalabras(w, regla, wf) {
  if (!Array.isArray(wf)) wf = w;
  if (!regla || !Array.isArray(regla.incluye) || !Array.isArray(w) || !w.length) return 0;
  let mejor = 0;
  for (const frase of regla.incluye) {
    const fw = palabras(frase);
    if (!fw.length || fw.length > w.length || fw.length <= mejor) continue;
    let ok = true;
    for (let i = 0; i < fw.length; i++) if (!igualPalabra(fw[i], w[i])) { ok = false; break; }
    if (!ok) continue;
    if (regla.excluye && regla.excluye.length) {
      let malo = false;
      for (const x of wf) if (estaEn(x, regla.excluye)) { malo = true; break; }
      if (malo) continue;
    }
    if (Array.isArray(regla.contieneAlguna) && regla.contieneAlguna.length) {
      let hay = false;
      for (const frase of regla.contieneAlguna) if (contieneFrase(wf, palabras(frase))) { hay = true; break; }
      if (!hay) continue;
    }
    if (regla.exigeSolo) {
      let limpio = true;
      for (let i = fw.length; i < w.length && limpio; i++) {
        const x = w[i];
        if (!(esCifra(x) || NEUTRAS.indexOf(x) >= 0 || estaEn(x, regla.exigeSolo))) limpio = false;
      }
      if (!limpio) continue;
    }
    mejor = fw.length;
  }
  return mejor;
}

/**
 * Porcentaje que lleva el nombre («70%», «70 %», «85,5 %»): el primero que aparece. null si no hay.
 * @param {*} nombre
 * @returns {number|null}
 */
export function porcentajeEnNombre(nombre) {
  const m = /(\d{1,3}(?:[.,]\d+)?)\s*%/.exec(String(nombre == null ? "" : nombre));
  if (!m) return null;
  const v = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

// ¿Cumple un criterio {tokens?, pct?}? `tokens`: TODAS esas palabras están en el nombre; `pct`: su porcentaje
// está en [min,max). Un criterio vacío no casa con nada (así un subtipo mal escrito no se traga todo).
function criterioCasa(c, w, pct) {
  if (!c) return false;
  const hayTokens = Array.isArray(c.tokens) && c.tokens.length > 0;
  if (!hayTokens && !c.pct) return false;
  if (hayTokens) for (const t of c.tokens) if (!estaEn(normalizar(t), w)) return false;
  if (c.pct && (pct == null || pct < c.pct[0] || pct >= c.pct[1])) return false;
  return true;
}

/**
 * Subtipo de una ficha que YA pertenece a la regla (null si no encaja en ninguno). Cada subtipo es
 * {id, nombre, tokens?:string[], pct?:[min,max), o?:criterio[], resto?:true}: casa si el nombre (entero) trae
 * TODAS las palabras de `tokens` y, si hay `pct`, su porcentaje está en [min,max). `o` añade criterios
 * alternativos del mismo tipo (basta con que case uno: «sin alcohol» O «0,0»). Con `resto` casa con todo lo
 * que no casó antes (va el último). El primer subtipo que casa gana.
 * @param {*} nombre
 * @param {object} regla
 * @returns {string|null} id del subtipo
 */
export function subtipoDe(nombre, regla) {
  if (!regla || !Array.isArray(regla.subtipos)) return null;
  const w = palabras(nombre);                       // el nombre ENTERO: «Chocolate negro (70%)» también cuenta
  const pct = porcentajeEnNombre(nombre);
  for (const s of regla.subtipos) {
    if (s.resto) return s.id;                                 // «el resto»: lo que no casó con los anteriores
    if (criterioCasa(s, w, pct)) return s.id;
    if (Array.isArray(s.o)) for (const c of s.o) if (criterioCasa(c, w, pct)) return s.id;
  }
  return null;
}

/**
 * Reparte las fichas entre las reglas SIN perder ni duplicar ninguna: cada ficha va a la regla cuya frase casó
 * más larga (la más específica: «arroz cocido» gana a «arroz»); a igualdad, a la que va antes en la lista.
 * Devuelve ÍNDICES, no copias: la lista de entrada no se toca.
 * @param {object[]} filas
 * @param {{id:string}[]} reglas
 * @returns {{porRegla:Object<string,number[]>, sinRegla:number[]}}
 */
export function asignar(filas, reglas) {
  const porRegla = Object.create(null), sinRegla = [];
  for (const r of reglas) porRegla[r.id] = [];
  for (let i = 0; i < filas.length; i++) {
    const nom = filas[i] && filas[i].n;
    const w = palabras(quitarMarca(nom)), wf = palabras(nom);
    let mejor = null, largo = 0;
    for (const r of reglas) {
      const l = pertenecePalabras(w, r, wf);
      if (l > largo) { largo = l; mejor = r; }
    }
    if (mejor) porRegla[mejor.id].push(i); else sinRegla.push(i);
  }
  return { porRegla, sinRegla };
}

// ───────────────────────── construir una entrada canónica ─────────────────────────

const CAMPOS_OPCIONALES = ["fib", "az", "sat", "na", "alcohol"];

function moda(valores) {
  const cuenta = new Map();
  for (const x of valores) { const k = Math.round(x); cuenta.set(k, (cuenta.get(k) || 0) + 1); }
  let mejor = null, n = 0;
  for (const [k, v] of cuenta) if (v > n || (v === n && k < mejor)) { mejor = k; n = v; }
  return { valor: mejor, n, fraccion: valores.length ? n / valores.length : 0 };
}

// La ficha real más cercana a la mediana de cada campo (medoide): se usa cuando las medianas por separado
// forman un «alimento» que no cuadra con sus propias kcal.
function medoide(limpias, med) {
  let mejor = null, dmin = Infinity;
  for (const f of limpias) {
    let d = 0;
    for (const k of ["kcal", "p", "c", "f"]) d += Math.abs(f[k] - med[k]) / Math.max(med[k], 1);
    if (d < dmin) { dmin = d; mejor = f; }
  }
  return mejor;
}

function redondear1(x) { return Math.round(x * 10) / 10; }

// Calcula las cifras de UNA muestra de fichas limpias. No decide la etiqueta: eso lo hace `construirEntrada`.
function cifras(limpias, P, minCampo) {
  // Un campo opcional exige `nMinimo` fichas que lo traigan si la muestra es del catálogo; en una tabla o una ficha oficial (una
  // fila ya es el dato) basta con una: `minCampo` = 1.
  const minC = minCampo == null ? P.nMinimo : minCampo;
  const estK = estadisticas(limpias.map((f) => f.kcal), P);
  const med = { kcal: estK.mediana, p: mediana(limpias.map((f) => f.p)), c: mediana(limpias.map((f) => f.c)), f: mediana(limpias.map((f) => f.f)) };
  let usadoMedoide = false, valores = med;
  if (!cuadraConMacros(med.kcal, med.p, med.c, med.f, P)) {
    const m = medoide(limpias, med);
    if (m) { valores = { kcal: m.kcal, p: m.p, c: m.c, f: m.f }; usadoMedoide = true; }
  }
  const out = { kcal: redondear1(valores.kcal), p: redondear1(valores.p), c: redondear1(valores.c), f: redondear1(valores.f) };
  // Un campo opcional solo se da si al menos `nMinimo` fichas LO TRAEN; si no, va ausente (nunca 0).
  for (const k of CAMPOS_OPCIONALES) {
    const v = limpias.map((x) => x[k]).filter((x) => typeof x === "number" && Number.isFinite(x) && x >= 0);
    if (v.length >= minC) out[k] = redondear1(mediana(v));
  }
  const md = moda(limpias.map((f) => f.kcal));
  const modaFiable = md.n >= P.modaMinFichas && md.fraccion >= P.modaMinFraccion;
  return {
    valores: out,
    rango: { p10: redondear1(estK.p10), p90: redondear1(estK.p90) },
    riesgo: riesgoDe(estK, P),
    dispersion: estK.dispersion == null ? null : Math.round(estK.dispersion * 1000) / 1000,
    dentro: estK.dentro == null ? null : Math.round(estK.dentro * 1000) / 1000,
    n: estK.n,
    moda: modaFiable ? md.valor : null,
    revisar: !!(modaFiable && estK.mediana > 0 && Math.abs(estK.mediana - md.valor) / estK.mediana > P.revisarModaPct) || usadoMedoide,
    medoide: usadoMedoide,
  };
}

/**
 * Confianza declarada de una entrada (alta, media o baja). Regla [P], determinista y a la vista:
 * oficial → alta; tabla institucional → media; media del catálogo → alta/media/baja según el riesgo (bajo/medio/alto);
 * y una cifra que no pasa la comprobación de lógica es siempre baja (salvo la oficial). Sin cifra → null.
 * @param {"oficial"|"tabla"|"media-catalogo"|string} etiqueta
 * @param {"bajo"|"medio"|"alto"|null} riesgo
 * @param {boolean} logicaOk
 * @returns {"alta"|"media"|"baja"|null}
 */
export function confianzaDe(etiqueta, riesgo, logicaOk) {
  if (etiqueta === "oficial") return "alta";
  if (etiqueta !== "tabla" && etiqueta !== "media-catalogo") return null;
  if (!logicaOk) return "baja";
  if (etiqueta === "tabla") return "media";
  return riesgo === "bajo" ? "alta" : riesgo === "medio" ? "media" : "baja";
}

// ¿Es una ESTIMACIÓN? Regla de Pablo (29-10): solo cuando no hay forma de averiguar la realidad. Un dato confirmado en una
// fuente (carta oficial, tabla institucional como BEDCA o USDA) se da TAL CUAL, sin «≈»; la media de un catálogo y el plato
// calculado por ingredientes sí son estimaciones.
function esEstimado(etiqueta) { return etiqueta !== "oficial" && etiqueta !== "tabla"; }

// Copia PROFUNDA de un subtipo de la regla (sus listas no se comparten con la regla de entrada).
function copiaSubtipo(s) {
  const o = { ...s };
  if (Array.isArray(s.tokens)) o.tokens = s.tokens.slice();
  if (Array.isArray(s.pct)) o.pct = s.pct.slice();
  if (Array.isArray(s.o)) o.o = s.o.map((c) => ({ ...c, ...(Array.isArray(c.tokens) ? { tokens: c.tokens.slice() } : {}), ...(Array.isArray(c.pct) ? { pct: c.pct.slice() } : {}) }));
  return o;
}

// Rellena `dst` (la entrada o uno de sus subtipos) con la cifra de una muestra: etiqueta, marca `estimado`, estimación,
// rango, riesgo, lógica y confianza. Si la cifra NO es lógica (kcal fuera de ±10 % de sus macros) y no es oficial, NO se
// publica: queda «sin-estimacion» con motivo «ilogica» y la candidata a la vista para auditarla (nada ilógico viaja).
function poner(dst, etiqueta, c, P) {
  const logica = comprobarLogica(c.valores, null, P);
  dst.n = c.n;
  if (!logica.ok && etiqueta !== "oficial") {
    dst.etiqueta = "sin-estimacion"; dst.estimacion = null; dst.motivo = "ilogica";
    dst.candidata = { estimacion: c.valores, rango: c.rango, riesgo: c.riesgo, logica };
    return;
  }
  dst.etiqueta = etiqueta;
  dst.estimado = esEstimado(etiqueta);              // el DATO lleva siempre la marca; la pantalla decide si la enseña
  dst.estimacion = c.valores;
  dst.rango = c.rango;
  dst.riesgo = c.riesgo;
  dst.dispersion = c.dispersion;
  dst.dentro = c.dentro;
  dst.moda = c.moda;
  dst.revisar = c.revisar || !logica.ok;
  if (c.medoide) dst.medoide = true;
  dst.logica = logica;
  let conf = confianzaDe(etiqueta, c.riesgo, logica.ok);
  if (etiqueta === "media-catalogo" && conf === "alta" && c.n < P.nMinimo) conf = "media";   // muestra del catálogo por debajo del mínimo general (una ficha oficial o una tabla valen con una sola fila)
  dst.confianza = conf;
}

/**
 * Convierte una TABLA DE REFERENCIA (`tools/alimentos/tablas/*.json`: BEDCA, USDA…) en filas de nivel 2 que `construirCapa` usa
 * como fuente institucional: mandan sobre la mediana del catálogo y salen sin «≈». Cada fila conserva su fuente
 * (`fuenteTabla`: base, id, descripción, fecha de lectura). Una fila mal formada se IGNORA aquí (la valida el test del fichero).
 * @param {{filas:object[]}} tabla
 * @returns {object[]}
 */
export function filasDeTabla(tabla) {
  const out = [];
  for (const t of (tabla && Array.isArray(tabla.filas) ? tabla.filas : [])) {
    if (!t || typeof t.n !== "string" || !t.n || !t.por100 || typeof t.por100 !== "object" || !t.fuente || typeof t.fuente !== "object") continue;
    out.push({ ...t.por100, n: t.n, nivel: 2, fuenteTabla: { ...t.fuente, tabla: t.id || null } });
  }
  return out;
}

/**
 * Construye UNA entrada canónica a partir de las fichas que la regla reclama.
 *
 * Cómo elige la cifra (nunca una inventada):
 *   1. Si hay fichas de fuente alta (`nivel` 1 = oficial o 2 = institucional), la cifra es la mediana de ESAS y
 *      la etiqueta es «oficial» (todas de nivel 1) o «tabla». Con una basta: una tabla es un valor, no una muestra.
 *   2. Si no, la mediana de las fichas LIMPIAS del catálogo, etiqueta «media-catalogo» (ESTIMADO), pero solo si hay
 *      `nMinimo` o más. Con menos: `estimacion` es null, etiqueta «sin-estimacion»; se cura a mano o se rechaza.
 * Las fichas descartadas no se pierden: `descartadas` cuenta cuántas y por qué.
 *
 * @param {object} regla {id, nombre, alias?, incluye, excluye?, exigeSolo?, subtipos?, permiteCero?, nota?}
 * @param {object[]} filas las fichas que la regla reclama
 * @param {{baseVersion?:string, fecha?:string, fuenteTexto?:string, capaVersion?:string}} [meta]
 * @param {object} [P]
 * @returns {object} entrada (ver campos en el cuerpo)
 */
export function construirEntrada(regla, filas, meta, P = PARAMETROS) {
  P = par(P);
  const m = meta || {};
  const todas = Array.isArray(filas) ? filas : [];
  const descartadas = {};
  const limpias = [];
  for (const f of todas) {
    const mot = motivoDescarte(f, { permiteCero: !!regla.permiteCero }, P);
    if (mot) descartadas[mot] = (descartadas[mot] || 0) + 1; else limpias.push(f);
  }
  const entrada = {
    id: regla.id,
    nombre: regla.nombre,
    alias: Array.isArray(regla.alias) ? regla.alias.slice() : [],
    regla: { incluye: regla.incluye.slice(), excluye: (regla.excluye || []).slice(), subtipos: (regla.subtipos || []).map(copiaSubtipo) },
    nFichas: todas.length,
    descartadas,
    capa_version: m.capaVersion || null,
    fuente: { texto: m.fuenteTexto || null, base: m.baseVersion || null, fecha: m.fecha || null },
  };
  if (regla.exigeSolo) entrada.regla.exigeSolo = regla.exigeSolo.slice();
  if (regla.contieneAlguna) entrada.regla.contieneAlguna = regla.contieneAlguna.slice();
  if (regla.nota) entrada.nota = regla.nota;

  // Una regla puede BAJAR el mínimo de fichas (nunca por debajo de 10) si su familia es un único producto muy
  // homogéneo (Coca-Cola: 24 fichas idénticas). Es una excepción declarada: la confianza no pasa de «media».
  const nMin = (Number.isInteger(regla.nMinimo) && regla.nMinimo >= 10 && regla.nMinimo < P.nMinimo) ? regla.nMinimo : P.nMinimo;
  if (nMin !== P.nMinimo) entrada.nMinimo = nMin;
  const altas = limpias.filter((f) => f.nivel === 1 || f.nivel === 2);
  let muestra, etiqueta;
  if (altas.length) {
    muestra = altas;
    etiqueta = altas.every((f) => f.nivel === 1) ? "oficial" : "tabla";
  } else if (limpias.length >= nMin) {
    muestra = limpias; etiqueta = "media-catalogo";
  } else {
    entrada.etiqueta = "sin-estimacion";
    entrada.estimacion = null;
    entrada.n = limpias.length;
    entrada.motivo = "pocas-fichas";
    return entrada;
  }
  const minCampo = etiqueta === "media-catalogo" ? P.nMinimo : 1;
  poner(entrada, etiqueta, cifras(muestra, P, minCampo), P);
  if (etiqueta === "tabla" || etiqueta === "oficial") {       // de dónde sale la cifra: la fuente de cada fila que la dio
    const fts = muestra.map((f) => f.fuenteTabla).filter((x) => x && typeof x === "object");
    if (fts.length) entrada.fuentesTabla = fts.map((x) => ({ ...x }));
  }

  if (Array.isArray(regla.subtipos) && regla.subtipos.length) {
    entrada.subtipos = regla.subtipos.map((s) => {
      const propias = muestra.filter((f) => subtipoDe(f.n, regla) === s.id);
      const st = { id: s.id, nombre: s.nombre, n: propias.length };
      if (propias.length >= P.nMinimo || (altas.length && propias.length)) poner(st, etiqueta, cifras(propias, P, minCampo), P);
      else { st.etiqueta = "sin-estimacion"; st.estimacion = null; st.motivo = "pocas-fichas"; }
      return st;
    });
  }
  return entrada;
}

/**
 * Construye la capa entera: asigna las fichas a las reglas y construye cada entrada.
 * No toca `filas`. El informe dice cuántas fichas quedaron sin regla (siguen existiendo, solo no están plegadas).
 * @param {object[]} reglas
 * @param {object[]} filas
 * @param {object} meta {capaVersion, baseVersion, fecha, fuenteTexto}
 * @param {object} [P]
 * @returns {{meta:object, entradas:object[], informe:{filas:number, asignadas:number, sinRegla:number}}}
 */
export function construirCapa(reglas, filas, meta, P = PARAMETROS) {
  const vistos = new Set();
  for (const r of reglas) { if (vistos.has(r.id)) throw new Error("regla con id repetido: " + r.id); vistos.add(r.id); }
  const { porRegla, sinRegla } = asignar(filas, reglas);
  const entradas = reglas.map((r) => construirEntrada(r, porRegla[r.id].map((i) => filas[i]), meta, P));
  return {
    meta: { ...(meta || {}) },
    entradas,
    informe: { filas: filas.length, asignadas: filas.length - sinRegla.length, sinRegla: sinRegla.length },
  };
}

// ───────────────────────── lo que ve el usuario ─────────────────────────

/**
 * Redondeo de una estimación SEGÚN EL TAMAÑO DE SU RANGO (pliego §6.2 [P]): semirrango de hasta 10 kcal → de 5
 * en 5; hasta 25 → de 10; hasta 60 → de 25; más → de 50. Un redondeo fijo a 5 sobre una cifra con ±60 de rango
 * comunicaría una precisión que no existe.
 * @param {number} valor
 * @param {number} semirrango
 * @returns {number|null}
 */
export function redondearSegunRango(valor, semirrango) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
  const s = Math.abs(+semirrango) || 0;
  const paso = s <= 10 ? 5 : s <= 25 ? 10 : s <= 60 ? 25 : 50;
  return Math.round(valor / paso) * paso;
}

/**
 * Cómo se enseña la cifra de una entrada (principio de producto del 29-10): lo justo. Un «≈» junto al número si
 * es una estimación, nada más: sin avisos, sin textos, sin ventanas. Todo lo demás (marca `estimado`, confianza,
 * rango, origen) viaja como DATO para que la pantalla decida si lo enseña. Redondeado según el tamaño del rango.
 * Sin estimación → null: la app cae al camino de hoy.
 * @param {object} entrada
 * @returns {{kcal:number, texto:string, estimado:boolean, confianza:string|null, rango:string|null, origen:string}|null}
 */
export function paraMostrar(entrada) {
  if (!entrada || !entrada.estimacion || !Number.isFinite(entrada.estimacion.kcal)) return null;
  const e = entrada.estimacion, r = entrada.rango || {};
  const lo = Number.isFinite(r.p10) ? r.p10 : r.min, hi = Number.isFinite(r.p90) ? r.p90 : r.max;     // {p10,p90} de una entrada o {min,max} de un plato
  const conRango = Number.isFinite(lo) && Number.isFinite(hi);
  const estimado = esEstimado(entrada.etiqueta);
  const kcal = estimado ? redondearSegunRango(e.kcal, conRango ? (hi - lo) / 2 : 0) : e.kcal;
  return {
    kcal,
    texto: (estimado ? "≈" : "") + kcal,
    estimado,
    confianza: entrada.confianza == null ? null : entrada.confianza,
    rango: conRango ? Math.round(lo) + "–" + Math.round(hi) : null,
    origen: textoOrigen(entrada),
  };
}

/**
 * Etiqueta de origen para la fila y la ficha: nunca se pinta una cifra sin ella.
 * @param {object} entrada
 * @returns {string}
 */
export function textoOrigen(entrada) {
  if (!entrada) return "";
  switch (entrada.etiqueta) {
    case "oficial": return "Oficial";
    case "tabla": return "Tabla de referencia";
    case "media-catalogo": return "Estimado · media del catálogo de " + entrada.n + " productos";
    case "estimado-plato": return "Estimado · por ingredientes";
    default: return "Sin estimación";
  }
}

// ───────────────────────── buscar y plegar (esto es lo que corre en el móvil) ─────────────────────────

/**
 * Entradas canónicas que casan con lo que teclea el usuario: TODAS las palabras de la consulta tienen que ser
 * prefijo de alguna palabra del nombre o de algún alias («choc ne» casa «Chocolate negro»). Ordena primero las
 * que EMPIEZAN por la consulta, luego el nombre más corto, luego el orden de la capa. Las entradas sin
 * estimación no se ofrecen: no hay nada que apuntar.
 * @param {string} consulta
 * @param {{entradas:object[]}} capa
 * @param {number} [limite] 5 por defecto
 * @returns {object[]}
 */
export function buscarCanonico(consulta, capa, limite = 5) {
  const tq = tokens(consulta);
  if (!tq.length || !capa || !Array.isArray(capa.entradas)) return [];
  const nq = normalizar(consulta).replace(/[^a-z0-9ñ]+/g, " ").trim();
  const lim = (+limite > 0) ? Math.floor(+limite) : 5;
  const dec = [];
  capa.entradas.forEach((e, i) => {
    if (!e || !e.estimacion) return;
    const nombres = [e.nombre].concat(e.alias || []);
    const tn = tokens(nombres.join(" "));
    for (const t of tq) if (!tn.some((w) => w.indexOf(t) === 0)) return;
    const empieza = nombres.some((n) => normalizar(n).replace(/[^a-z0-9ñ]+/g, " ").trim().indexOf(nq) === 0) ? 0 : 1;
    dec.push({ e, g: empieza, len: String(e.nombre).length, i });
  });
  dec.sort((a, b) => (a.g - b.g) || (a.len - b.len) || (a.i - b.i));
  return dec.slice(0, lim).map((d) => d.e);
}

/**
 * Pliega los resultados de una búsqueda: las fichas que son variantes de un alimento canónico se agrupan
 * detrás de su entrada y el resto queda suelto. Es REVERSIBLE por construcción: devuelve índices sobre la lista
 * de entrada, no la modifica y no pierde ni duplica ninguna ficha (`expandir` las recompone todas).
 * Dos salvaguardas contra ocultar de más:
 *   · solo se pliega detrás de las entradas que SE VAN A ENSEÑAR: las que casan con la consulta
 *     (`buscarCanonico`) y tienen estimación. Buscando «chocolate negro» las «Galletas con chocolate negro» NO
 *     se pliegan detrás de «Galletas», porque esa entrada no está en pantalla. Sin `consulta` no se pliega nada;
 *   · con `verTodo` no se oculta nada (la salida de emergencia de quien quiere ver cada producto).
 * @param {object[]} filas resultados de la búsqueda (los de la Base España)
 * @param {{entradas:object[]}} capa
 * @param {{consulta?:string, verTodo?:boolean, limite?:number}} [opciones] `limite`: entradas que se enseñan (5 por defecto)
 * @returns {{canonicos:{id:string, indices:number[]}[], sueltas:number[], ocultas:number, total:number}}
 */
export function plegarResultados(filas, capa, opciones) {
  const o = opciones || {};
  const lista = Array.isArray(filas) ? filas : [];
  const total = lista.length;
  const todoSuelto = { canonicos: [], sueltas: lista.map((_, i) => i), ocultas: 0, total };
  if (o.verTodo || !o.consulta || !capa || !Array.isArray(capa.entradas)) return todoSuelto;
  const enPantalla = buscarCanonico(o.consulta, capa, o.limite);
  if (!enPantalla.length) return todoSuelto;
  // El reparto es el MISMO que el de `construirCapa` (todas las reglas de la capa, en su orden): una ficha solo se
  // pliega detrás de la entrada a la que la capa la asigna, y solo si esa entrada está en pantalla.
  const visibles = new Set(enPantalla.map((e) => e.id));
  const vistas = new Set();
  const reglas = capa.entradas.filter((e) => e && e.regla && !vistas.has(e.id) && vistas.add(e.id)).map((e) => ({ id: e.id, ...e.regla }));   // un id repetido cuenta una sola vez
  const { porRegla, sinRegla } = asignar(lista, reglas);
  const canonicos = [], sueltas = sinRegla.slice();
  let ocultas = 0;
  for (const r of reglas) {
    const idx = porRegla[r.id];
    if (!idx.length) continue;
    if (visibles.has(r.id)) { canonicos.push({ id: r.id, indices: idx }); ocultas += idx.length; }
    else for (const i of idx) sueltas.push(i);
  }
  sueltas.sort((a, b) => a - b);
  return { canonicos, sueltas, ocultas, total };
}

/**
 * Deshace `plegarResultados`: todos los índices de la lista original, cada uno una sola vez, en su orden.
 * @param {{canonicos:{indices:number[]}[], sueltas:number[]}} plegado
 * @returns {number[]}
 */
export function expandir(plegado) {
  const out = [];
  for (const c of (plegado && plegado.canonicos) || []) for (const i of c.indices) out.push(i);
  for (const i of (plegado && plegado.sueltas) || []) out.push(i);
  return out.sort((a, b) => a - b);
}
