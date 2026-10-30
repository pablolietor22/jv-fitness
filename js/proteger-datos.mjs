// PROTEGER LOS DATOS DEL USUARIO — la lógica de cuándo avisar, sin tocar la pantalla.
//
// Por qué existe (auditoría de producto del 29-10-2026, bloqueo #4). Todos los datos de JV Fitness
// viven en el navegador del móvil, y en el iPhone WebKit BORRA el almacenamiento de una web tras 7
// días de uso de Safari sin interactuar con ella, salvo las web apps añadidas a la pantalla de
// inicio. La app ocultaba «Instalar» en iOS «a propósito» y el recordatorio de copia sólo saltaba
// con más de 20 entrenos y más de 14 días: un usuario nuevo no tenía copia NUNCA.
//
// Aquí vive lo PURO (sin DOM, sin storage, sin red, sin reloj: la fecha de hoy entra por parámetro):
//   · detectarEntorno — ¿iPhone/iPad?, ¿Safari, otro navegador, o la ventana interna de Instagram/TikTok?,
//                       ¿ya instalada en la pantalla de inicio? Se prueba con cadenas de User-Agent falsas.
//   · guiaInstalar    — el texto de «Añadir a pantalla de inicio» para cada caso.
//   · decidirGuia     — cuándo enseñarla: a la primera comida o al día 3, sin agobiar (máximo 3 veces,
//                       una cada 3 días, y nunca más si dice «ya la tengo / no me avises»).
//   · decidirCopia    — cuándo recordar la copia de seguridad: a la primera comida o al día 3 si aún
//                       no hay NINGUNA copia (más la regla de siempre: >20 entrenos y copia de >14 días).
// La pantalla (modal, toast, guardar el estado) está en el HTML, bloque [PROTEGER-UI]. Se carga con
// import() dinámico; si no carga, queda la regla antigua de la copia y nada se rompe.
//
// Extensión .mjs (módulo ES sin tocar package.json). Pruebas: _tests/test-proteger-datos.node.js.

const MS_DIA = 864e5;

/** Días enteros entre dos fechas AAAA-MM-DD (hasta − desde). null si alguna no es una fecha válida. */
export function diasEntre(desde, hasta) {
  const ok = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!ok(desde) || !ok(hasta)) return null;
  const a = Date.parse(desde + "T12:00:00"), b = Date.parse(hasta + "T12:00:00");   // mediodía: el cambio de hora no cuenta
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / MS_DIA);
}

// ── Entorno ──────────────────────────────────────────────────────────────────────────────────────
const IOS = /\b(iPhone|iPad|iPod)\b/;
// Otros navegadores del iPhone: todos usan el motor de Safari (WebKit) y sufren la misma regla.
const OTRO_NAVEGADOR = /\b(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Brave)\b/;
// Ventanas internas de otras apps (Instagram, TikTok, Facebook…): no se puede añadir a la pantalla de inicio.
const VENTANA_INTERNA = /(Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|Twitter|MicroMessenger|Pinterest|GSA\/|\bLine\/)/;

/**
 * e = { ua, platform, maxTouchPoints, standalone, displayStandalone }  (lo que lee el navegador).
 * Devuelve { ios, instalada, variante }:
 *   ios        — iPhone, iPod o iPad (también iPadOS en «modo escritorio», que se hace pasar por Mac
 *                pero tiene pantalla táctil);
 *   instalada  — la app ya está abierta desde la pantalla de inicio (navigator.standalone en iOS, o
 *                display-mode: standalone). Va ANTES que todo: una web app instalada en iOS no lleva
 *                «Safari/» en su User-Agent y, sin esto, parecería una ventana interna;
 *   variante   — "safari" | "otro" | "webview" (sólo si ios).
 */
export function detectarEntorno(e) {
  e = e || {};
  const ua = String(e.ua == null ? "" : e.ua);
  const ios = IOS.test(ua) || (e.platform === "MacIntel" && Number(e.maxTouchPoints) > 1);
  const instalada = e.standalone === true || e.displayStandalone === true;
  if (!ios) return { ios: false, instalada: instalada, variante: null };
  let variante = "safari";
  if (VENTANA_INTERNA.test(ua)) variante = "webview";
  else if (OTRO_NAVEGADOR.test(ua)) variante = "otro";
  else if (IOS.test(ua) && !/\bSafari\//.test(ua)) variante = "webview";   // WKWebView: sin el «Safari/» del navegador de verdad
  return { ios: true, instalada: instalada, variante: variante };
}

// ── Textos ───────────────────────────────────────────────────────────────────────────────────────
const REGLA = "Safari borra los datos de una web si pasas 7 días usándolo sin abrirla. Una app añadida a la pantalla de inicio se libra de esa regla.";
const MIGRAR = "⚠️ Puede que la app de la pantalla de inicio empiece vacía (en iPhone suele guardar sus datos aparte de Safari). Si ya has apuntado cosas aquí, haz antes la copia (⚙️ Ajustes → 📦 Datos → Exportar) y, si la app nueva sale vacía, impórtala allí.";

/** El texto de la guía para cada variante. Devuelve { titulo, intro, pasos[], aviso }. */
export function guiaInstalar(variante) {
  if (variante === "webview") {
    return {
      titulo: "📲 Ábrela en Safari para no perder tus datos",
      intro: "Estás dentro de otra app (Instagram, TikTok…). Aquí no se puede añadir a la pantalla de inicio, y lo que apuntes en esta ventana puede no aparecer luego en Safari.",
      pasos: [
        "Toca los tres puntos ⋯ (o el icono de la brújula) de esta pantalla.",
        "Elige «Abrir en Safari» (o «Abrir en el navegador»).",
        "Ya en Safari, toca Compartir (el cuadrado con la flecha hacia arriba) y elige «Añadir a pantalla de inicio»."
      ],
      aviso: "Hazlo antes de apuntar nada importante: " + REGLA
    };
  }
  if (variante === "otro") {
    return {
      titulo: "📲 Guarda JV Fitness en tu iPhone",
      intro: "Tus datos viven solo en este iPhone, dentro del navegador. En iPhone todos los navegadores usan el motor de Safari y la misma regla: " + REGLA,
      pasos: [
        "Toca el botón Compartir (el cuadrado con la flecha hacia arriba), junto a la barra de direcciones o en el menú ⋯.",
        "Elige «Añadir a pantalla de inicio».",
        "Pulsa «Añadir».",
        "A partir de ahora abre JV Fitness desde ese icono, no desde el navegador."
      ],
      aviso: MIGRAR + " Si tu navegador no te ofrece «Añadir a pantalla de inicio», abre esta misma dirección en Safari y repite los pasos."
    };
  }
  return {
    titulo: "📲 Guarda JV Fitness en tu iPhone",
    intro: "Tus datos viven solo en este iPhone, dentro de Safari. " + REGLA,
    pasos: [
      "Toca el botón Compartir de Safari (el cuadrado con una flecha hacia arriba, abajo en el centro; en iPad, arriba a la derecha).",
      "Desliza hacia abajo y elige «Añadir a pantalla de inicio».",
      "Pulsa «Añadir», arriba a la derecha.",
      "A partir de ahora abre JV Fitness desde ese icono, no desde Safari."
    ],
    aviso: MIGRAR
  };
}

/** El aviso de copia: lo que hace falta saber ANTES de exportar (y que el archivo NO está cifrado). */
export const AVISO_COPIA = {
  titulo: "Haz tu primera copia de seguridad",
  cuerpo: "Tus datos viven solo en este móvil. Descarga una copia en ⚙️ Ajustes → 📦 Datos → Exportar. " +
    "Ojo: el archivo NO va cifrado (cualquiera que lo tenga puede leerlo), así que guárdalo donde solo entres tú, " +
    "y las fotos de progreso NO se incluyen."
};

// ── Cuándo enseñar la guía ───────────────────────────────────────────────────────────────────────
export const GUIA_MAX_VECES = 3;     // primera vez + 2 recordatorios; después, nunca más
export const GUIA_PAUSA_DIAS = 3;    // entre una vez y la siguiente
export const DIA_ALTA = 3;           // «día 3» de uso

/**
 * ¿Toca enseñar la guía de «Añadir a pantalla de inicio»?
 *   entorno — lo que devuelve detectarEntorno
 *   comidas, entrenos — cuántos registros hay
 *   hoy, primerUso — AAAA-MM-DD
 *   guia — lo guardado: { veces, ultima, cerrada }
 * Devuelve { mostrar, motivo }.
 */
export function decidirGuia(p) {
  p = p || {};
  const no = (motivo) => ({ mostrar: false, motivo: motivo });
  const ent = p.entorno;
  if (!ent || !ent.ios) return no("no-ios");
  if (ent.instalada) return no("instalada");
  const g = p.guia && typeof p.guia === "object" ? p.guia : {};
  if (g.cerrada) return no("cerrada");
  if ((Number(g.veces) || 0) >= GUIA_MAX_VECES) return no("max-veces");
  const desdeUltima = g.ultima ? diasEntre(g.ultima, p.hoy) : null;
  if (desdeUltima !== null && desdeUltima < GUIA_PAUSA_DIAS) return no("pausa");
  if ((Number(p.comidas) || 0) >= 1) return { mostrar: true, motivo: "primera-comida" };
  const dias = p.primerUso ? diasEntre(p.primerUso, p.hoy) : null;
  if (dias !== null && dias >= DIA_ALTA) return { mostrar: true, motivo: "dia-3" };
  return no("aun-no");
}

/** El estado de la guía tras una acción: "vista" (se acaba de enseñar), "hecho" o "nunca". Devuelve un objeto NUEVO. */
export function registrarGuia(guia, hoy, accion) {
  const g = guia && typeof guia === "object" ? guia : {};
  if (accion === "vista") return { veces: (Number(g.veces) || 0) + 1, ultima: hoy, cerrada: !!g.cerrada };
  if (accion === "hecho" || accion === "nunca") return { veces: Number(g.veces) || 0, ultima: g.ultima || hoy, cerrada: true };
  return { veces: Number(g.veces) || 0, ultima: g.ultima || null, cerrada: !!g.cerrada };
}

// ── Cuándo recordar la copia de seguridad ───────────────────────────────────────────────────────
export const COPIA_VIEJA_DIAS = 14;      // la regla de siempre: más de 14 días sin copia…
export const COPIA_VIEJA_ENTRENOS = 20;  // …y más de 20 entrenos

/**
 * ¿Toca recordar la copia de seguridad? Como mucho UNA vez al día.
 *   ultimaCopia — AAAA-MM-DD de la última exportación (null/undefined = nunca)
 *   ultimoAviso — AAAA-MM-DD del último recordatorio
 * Reglas:
 *   · sin datos (ni comidas ni entrenos) no hay nada que copiar → no;
 *   · NUEVA: si aún no hay NINGUNA copia, se avisa a la primera comida o al día 3;
 *   · DE SIEMPRE: más de 20 entrenos y copia de hace más de 14 días (o ninguna).
 * Devuelve { avisar, motivo }.
 */
export function decidirCopia(p) {
  p = p || {};
  const no = (motivo) => ({ avisar: false, motivo: motivo });
  if (p.ultimoAviso && p.ultimoAviso === p.hoy) return no("ya-avisado-hoy");
  const comidas = Number(p.comidas) || 0, entrenos = Number(p.entrenos) || 0;
  if (comidas < 1 && entrenos < 1) return no("sin-datos");
  const desdeCopia = p.ultimaCopia ? diasEntre(p.ultimaCopia, p.hoy) : null;   // null = nunca (o fecha ilegible)
  if (entrenos > COPIA_VIEJA_ENTRENOS && (desdeCopia === null || desdeCopia > COPIA_VIEJA_DIAS)) return { avisar: true, motivo: "historial-viejo" };
  if (desdeCopia === null) {
    if (comidas >= 1) return { avisar: true, motivo: "primera-comida" };
    const dias = p.primerUso ? diasEntre(p.primerUso, p.hoy) : null;
    if (dias !== null && dias >= DIA_ALTA) return { avisar: true, motivo: "dia-3" };
  }
  return no("al-dia");
}
