// TRADUCTOR DE NOMBRES DE HEVY → CATÁLOGO DE JV FITNESS.
//
// Por qué existe. El importador de Hevy sólo conocía 41 títulos (HEVY_MAP, los de Pablo). Con el CSV
// de un desconocido —«Squat (Barbell)», «Bench Press (Barbell)», «Deadlift (Barbell)»…— se
// descartaba el 67 % de las series, justo los básicos. Este módulo traduce el título de Hevy al
// nombre del catálogo (EJERCICIOS, 1.502 fichas) sin inventar nada.
//
// Cómo decide (de más a menos seguro; la primera que acierta gana):
//   1. «usuario»  — un alias que el propio usuario ha dado (`extra`). Manda sobre todo lo demás.
//   2. «catalogo» — el título YA es un nombre del catálogo (export en castellano, ejercicio propio
//                   con el mismo nombre). Se compara normalizado: sin tildes, mayúsculas ni signos.
//   3. «alias»    — TABLA de abajo: movimiento + equipo. El título se parte en «movimiento» y
//                   «equipo» («Squat (Barbell)» → squat + barra), se normaliza (plurales, sinónimos,
//                   orden de las palabras) y se busca en la tabla.
//   Lo que no case sale `null`: NO se adivina. Un «Bench Press (Band)» que la tabla no conoce se
//   queda sin mapear, y el importador se lo dice al usuario en vez de apuntarle otro ejercicio.
//
// Garantías que prueba _tests/test-hevy-alias.node.js:
//   · jamás devuelve un nombre que no esté en el catálogo que se le pasa;
//   · cada destino de la tabla existe, y una sola vez, en el catálogo real de la app;
//   · «(Barbell)» y «(Dumbbell)» no se confunden (la mutación que los intercambia hace saltar la suite).
//
// PURO: sin DOM, sin storage, sin red, sin reloj. Extensión .mjs (módulo ES sin tocar package.json).
// Se carga con import() dinámico sólo al importar un CSV de Hevy; si no carga, el importador sigue
// funcionando con su HEVY_MAP de siempre.

/** Minúsculas, sin tildes ni apóstrofos; todo lo que no sea letra/número/paréntesis pasa a espacio. */
export function normalizarTitulo(s) {
  return String(s == null ? "" : s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Equipo ───────────────────────────────────────────────────────────────────────────────────────
// b barra · d mancuerna · c polea · s multipower (Smith) · m máquina · k kettlebell · r banda
// w peso corporal (también «Weighted») · a asistido. El ORDEN importa: «smith machine» antes que
// «machine», y «machine plates» antes que «machine».
const EQUIPOS = [
  ["s", /\bsmith( machine)?\b/],
  ["m", /\b(machine plates?|plate loaded|machine|leverage|lever|selectorized)\b/],
  ["b", /\b(barbell|bb|olympic bar)\b/],
  ["d", /\b(dumbbells?|dbs?)\b/],
  ["c", /\b(cables?)\b/],
  ["k", /\b(kettlebells?|kbs?)\b/],
  ["r", /\b(resistance bands?|bands?|banded)\b/],
  ["a", /\b(assisted)\b/],
  ["w", /\b(bodyweight|body weight|weighted)\b/],
];

/**
 * Separa el equipo del movimiento. Devuelve { eq, resto } donde `eq` es la letra del equipo
 * ("w" si el título no nombra ninguno: «Pull Up», «Plank»), o `null` si el título es ambiguo
 * (nombra dos equipos distintos fuera de los paréntesis) y `resto` es el movimiento sin él.
 */
export function separarEquipo(norm) {
  const grupos = [];
  let base = norm.replace(/\(([^()]*)\)/g, (_, g) => { grupos.push(g.trim()); return " "; })
    .replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const quitar = (texto) => {
    const hallados = [];
    let t = texto;
    EQUIPOS.forEach(([k, re]) => { if (re.test(t)) { hallados.push(k); t = t.replace(new RegExp(re.source, "g"), " "); } });
    return { hallados, t: t.replace(/\s+/g, " ").trim() };
  };
  let eq = null;
  const restoGrupos = [];
  for (const g of grupos) {
    const r = quitar(g);
    if (r.hallados.length && eq == null) eq = r.hallados[0];
    // lo que NO sea equipo dentro del paréntesis («(Close Grip)») modifica el movimiento
    if (r.t) restoGrupos.push(r.t);
  }
  const rb = quitar(base);
  if (rb.hallados.length) {
    if (eq == null) {
      if (new Set(rb.hallados).size > 1) return { eq: null, resto: "" };   // «Cable Dumbbell Fly»: no se adivina
      eq = rb.hallados[0];
    }
  }
  const resto = (rb.t + " " + restoGrupos.join(" ")).replace(/\s+/g, " ").trim();
  return { eq: eq == null ? "w" : eq, resto };
}

// ── Palabras → clave de movimiento ───────────────────────────────────────────────────────────────
// Se reescriben frases enteras ANTES de partir en palabras (sinónimos y formas pegadas).
const FRASES = [
  [/\bpull ?ups?\b/g, "pull up"], [/\bpush ?ups?\b/g, "push up"], [/\bchin ?ups?\b/g, "chin up"],
  [/\bsit ?ups?\b/g, "sit up"], [/\bpull ?downs?\b/g, "pulldown"], [/\bpush ?downs?\b/g, "pushdown"],
  [/\bskull ?crushers?\b/g, "skullcrusher"], [/\bwood ?chop(per)?s?\b/g, "woodchopper"],
  [/\bhyper ?extensions?\b/g, "back extension"], [/\bpec ?dec?k\b/g, "pec deck"],
  [/\brdl\b/g, "romanian deadlift"], [/\bsldl\b/g, "stiff leg deadlift"], [/\bohp\b/g, "overhead press"],
  [/\bhex bar\b/g, "trap bar"], [/\bez ?bar\b/g, "ez bar"], [/\bt ?bar\b/g, "t bar"],
  [/\bflyes?\b/g, "fly"], [/\bflies\b/g, "fly"], [/\bcalves\b/g, "calf"], [/\bbiceps\b/g, "bicep"],
  [/\btriceps\b/g, "tricep"], [/\bglutes\b/g, "glute"], [/\bdeltoids?\b/g, "delt"],
  [/\bone arm\b/g, "single arm"],
];
const SOBRAN = new Set(["a", "the", "with", "using", "on", "exercise", "workout"]);

function plegarPlural(t) {
  if (t.length <= 3) return t;
  if (/(ch|sh|ss|x)es$/.test(t)) return t.slice(0, -2);   // crunches → crunch · presses → press
  if (/ies$/.test(t)) return t.slice(0, -3) + "y";
  if (/ss$/.test(t) || /us$/.test(t)) return t;               // press · triceps (ya plegado) · focus
  if (/s$/.test(t)) return t.slice(0, -1);                    // curls → curl · raises → raise
  return t;
}

/** «Bench Press» y «press bench» dan la MISMA clave: las palabras se pliegan y se ordenan. */
export function claveMovimiento(texto) {
  let t = normalizarTitulo(texto).replace(/[()]/g, " ");
  FRASES.forEach(([re, a]) => { t = t.replace(re, a); });
  const toks = t.split(" ").filter((x) => x && !SOBRAN.has(x)).map(plegarPlural);
  return Array.from(new Set(toks)).sort().join(" ");
}

// ── La tabla: movimiento → { equipo: nombre en el catálogo } ─────────────────────────────────────
// "*" = vale con cualquier equipo (o ninguno). Cada fila lista sus nombres en inglés (sinónimos) y
// el destino por equipo. Los destinos están comprobados nombre a nombre contra EJERCICIOS por
// _tests/test-hevy-alias.node.js (existen, una sola vez). Si falta un equipo, NO se mapea.
const FILAS = [
  // ── Pecho ──
  [["bench press", "flat bench press", "chest bench press"], { b: "Press banca", d: "Press banca mancuernas", s: "Press en multipower", m: "Press en máquina" }],
  [["incline bench press", "incline press"], { b: "Press inclinado con barra", d: "Press inclinado mancuernas", s: "Press inclinado en multipower", m: "Press inclinado en máquina" }],
  [["decline bench press", "decline press"], { b: "Press declinado con barra", d: "Press declinado con mancuernas", s: "Press declinado en multipower", m: "Press declinado en máquina" }],
  [["close grip bench press", "narrow grip bench press"], { b: "Press cerrado", d: "Press cerrado con mancuernas", s: "Press cerrado en multipower" }],
  [["wide grip bench press"], { b: "Press banca agarre ancho" }],
  [["floor press"], { b: "Press de suelo con barra (floor press)", d: "Press de suelo con mancuernas" }],
  [["chest press"], { m: "Press de pecho en máquina", c: "Press de pecho en polea" }],
  [["incline chest press"], { m: "Press de pecho inclinado en máquina", c: "Press inclinado en polea" }],
  [["decline chest press"], { m: "Press declinado en máquina", c: "Press declinado en polea" }],
  [["chest fly", "fly", "dumbbell fly"], { d: "Aperturas con mancuernas", m: "Aperturas en máquina (peck deck)", c: "Cruces en polea" }],
  [["incline chest fly", "incline fly"], { d: "Aperturas inclinadas con mancuernas", c: "Aperturas inclinadas en polea" }],
  [["decline chest fly", "decline fly"], { d: "Aperturas declinadas con mancuernas", c: "Aperturas declinadas en polea" }],
  [["seated chest fly"], { c: "Cruces en polea", m: "Aperturas en máquina (peck deck)" }],
  [["pec deck", "butterfly"], { "*": "Aperturas en máquina (peck deck)" }],
  [["cable crossover", "cable fly crossover", "crossover"], { "*": "Cruces en polea" }],
  [["low cable crossover", "low cable fly crossover", "low fly crossover"], { "*": "Cruces en polea baja" }],
  [["push up"], { w: "Flexiones" }],
  [["incline push up"], { w: "Flexiones inclinadas" }],
  [["decline push up"], { w: "Flexiones declinadas" }],
  [["diamond push up"], { w: "Flexiones diamante" }],
  [["wide push up", "wide grip push up"], { w: "Flexiones con agarre ancho" }],
  [["clap push up", "plyo push up", "plyometric push up"], { w: "Flexiones pliométricas" }],
  [["chest dip", "dip"], { w: "Fondos en paralelas" }],
  [["triceps dip", "parallel bar dip", "triceps dip parallel bar"], { w: "Fondos en paralelas para tríceps" }],
  [["bench dip"], { w: "Fondos en banco" }],
  [["pullover"], { d: "Pullover con mancuerna", b: "Pullover con barra", m: "Pullover en máquina", c: "Jalón con brazos rectos (pullover en polea)" }],
  // ── Espalda ──
  [["pull up"], { w: "Dominadas", a: "Dominadas asistidas" }],
  [["chin up"], { w: "Dominadas supinas" }],
  [["neutral grip pull up", "neutral pull up"], { w: "Dominadas agarre neutro" }],
  [["lat pulldown", "pulldown", "cable pulldown"], { c: "Jalón al pecho", m: "Jalón al pecho" }],
  [["wide grip lat pulldown", "wide pulldown"], { c: "Jalón al pecho agarre ancho", m: "Jalón al pecho agarre ancho" }],
  [["close grip lat pulldown", "close grip pulldown"], { c: "Jalón agarre cerrado", m: "Jalón agarre cerrado" }],
  [["reverse grip lat pulldown", "underhand lat pulldown", "supinated lat pulldown"], { c: "Jalón agarre supino", m: "Jalón agarre supino" }],
  [["single arm lat pulldown"], { c: "Jalón al pecho a un brazo" }],
  [["straight arm lat pulldown", "straight arm pulldown"], { c: "Jalón con brazos rectos (pullover en polea)" }],
  [["v bar lat pulldown", "v grip lat pulldown", "v handle lat pulldown"], { c: "Jalón con triángulo (agarre en V)" }],
  [["bent over row"], { b: "Remo con barra", d: "Remo con dos mancuernas" }],
  [["row", "barbell row"], { b: "Remo con barra", d: "Remo con mancuerna", c: "Remo en polea baja", m: "Remo en máquina" }],
  [["single arm row", "single arm dumbbell row"], { d: "Remo con mancuerna", c: "Remo en polea a una mano" }],
  [["pendlay row"], { b: "Remo Pendlay", w: "Remo Pendlay" }],
  [["t bar row"], { "*": "Remo en barra T" }],
  [["seated row", "seated cable row"], { c: "Remo en polea baja", m: "Remo sentado en máquina" }],
  [["chest supported row", "chest supported incline row", "incline row"], { d: "Remo con mancuernas pecho apoyado en banco inclinado", b: "Remo con barra pecho apoyado en banco inclinado" }],
  [["inverted row"], { w: "Remo invertido" }],
  [["face pull"], { "*": "Face pull" }],
  [["deadlift", "conventional deadlift"], { b: "Peso muerto", w: "Peso muerto", s: "Peso muerto en multipower" }],
  [["sumo deadlift"], { b: "Peso muerto sumo", w: "Peso muerto sumo" }],
  [["trap bar deadlift"], { "*": "Peso muerto con trap bar" }],
  [["romanian deadlift"], { b: "Peso muerto rumano", w: "Peso muerto rumano", d: "Peso muerto rumano con mancuernas", s: "Peso muerto rumano en multipower" }],
  [["stiff leg deadlift", "straight leg deadlift"], { b: "Peso muerto piernas rígidas" }],
  [["single leg romanian deadlift", "single leg deadlift"], { d: "Peso muerto a una pierna" }],
  [["rack pull"], { b: "Rack pull (peso muerto parcial)", w: "Rack pull (peso muerto parcial)" }],
  [["good morning"], { b: "Buenos días", w: "Buenos días" }],
  [["back extension"], { w: "Hiperextensiones lumbares", m: "Hiperextensión lumbar en máquina" }],
  [["reverse back extension", "reverse hyperextension"], { "*": "Hiperextensión inversa" }],
  [["shrug"], { b: "Encogimientos con barra", d: "Encogimientos con mancuernas", c: "Encogimientos en polea", m: "Encogimientos en máquina" }],
  // ── Hombro ──
  [["overhead press", "military press", "standing overhead press", "standing press"], { b: "Press militar con barra", d: "Press militar mancuernas", s: "Press militar en multipower", m: "Press militar en máquina", k: "Press de hombro con kettlebell" }],
  [["standing military press"], { b: "Press militar de pie con barra" }],
  [["seated overhead press", "seated military press"], { b: "Press militar sentado con barra", d: "Press de hombros sentado con mancuernas" }],
  [["shoulder press", "seated shoulder press"], { d: "Press de hombros sentado con mancuernas", m: "Press de hombro en máquina", c: "Press de hombros en polea", k: "Press de hombro con kettlebell" }],
  [["arnold press"], { d: "Press Arnold" }],
  [["push press"], { b: "Push press con barra", k: "Push press con kettlebell" }],
  [["lateral raise", "side lateral raise", "side raise"], { d: "Elevaciones laterales", c: "Elevaciones laterales en polea", m: "Elevaciones laterales en máquina", r: "Elevaciones laterales con banda" }],
  [["seated lateral raise"], { d: "Elevaciones laterales sentado", c: "Elevaciones laterales en polea sentado" }],
  [["single arm lateral raise"], { d: "Elevación lateral a un brazo", c: "Elevación lateral en polea a un brazo" }],
  [["front raise"], { d: "Elevaciones frontales", c: "Elevaciones frontales en polea", b: "Elevaciones frontales con barra" }],
  [["rear delt fly", "rear delt reverse fly", "reverse fly", "rear fly", "bent over lateral raise", "rear lateral raise", "rear delt raise"], { d: "Pájaros (deltoides posterior)", c: "Pájaros en polea", m: "Pájaros en máquina (reverse peck deck)", r: "Pájaros con banda" }],
  [["upright row"], { b: "Remo al mentón con barra", d: "Remo al mentón con mancuernas", c: "Remo al mentón en polea", s: "Remo al mentón en multipower" }],
  // ── Brazos ──
  [["bicep curl", "curl", "arm curl", "standing bicep curl"], { b: "Curl con barra", d: "Curl con mancuernas", c: "Curl en polea", m: "Curl de bíceps en máquina", r: "Curl con banda" }],
  [["ez bar bicep curl", "ez bar curl", "ez curl"], { "*": "Curl con barra Z" }],
  [["alternating bicep curl", "alternate bicep curl", "alternating curl"], { d: "Curl alterno con mancuernas" }],
  [["hammer curl"], { d: "Curl martillo", c: "Curl martillo en polea con cuerda" }],
  [["preacher curl"], { b: "Curl en predicador con barra", d: "Curl predicador con mancuernas", m: "Curl en predicador", c: "Curl predicador en polea" }],
  [["incline curl", "incline bicep curl", "seated incline curl"], { d: "Curl inclinado con mancuernas" }],
  [["concentration curl"], { d: "Curl concentrado", w: "Curl concentrado" }],
  [["spider curl"], { d: "Curl spider" }],
  [["zottman curl"], { d: "Curl Zottman" }],
  [["reverse curl"], { b: "Curl inverso con barra", d: "Curl inverso con mancuernas", c: "Curl inverso en polea" }],
  [["drag curl"], { b: "Curl de arrastre (drag curl)" }],
  [["tricep pushdown", "pushdown", "cable pushdown", "tricep cable pushdown"], { "*": "Extensión en polea con barra" }],
  [["tricep rope pushdown", "rope pushdown", "tricep rope extension"], { "*": "Extensión en polea (cuerda)" }],
  [["single arm tricep pushdown"], { c: "Extensión de tríceps en polea a un brazo" }],
  [["tricep extension"], { d: "Extensión sobre la cabeza", c: "Extensión de tríceps en polea", m: "Extensión de tríceps en máquina" }],
  [["overhead tricep extension", "overhead extension"], { d: "Extensión sobre la cabeza", c: "Extensión sobre la cabeza en polea", b: "Extensión de tríceps con barra sobre la cabeza" }],
  [["skullcrusher", "lying tricep extension", "tricep skullcrusher", "ez bar skullcrusher"], { b: "Press francés", d: "Press francés con mancuernas", c: "Press francés en polea" }],
  [["tricep kickback"], { d: "Patada de tríceps", c: "Patada de tríceps en polea" }],
  [["jm press"], { b: "JM press" }],
  [["wrist curl"], { b: "Curl de muñeca con barra", d: "Curl de muñeca" }],
  [["reverse wrist curl"], { b: "Curl de muñeca invertido", d: "Curl de muñeca invertido con mancuernas" }],
  // ── Pierna ──
  [["squat", "back squat", "high bar squat", "low bar squat"], { b: "Sentadilla con barra", d: "Sentadilla con mancuernas", s: "Sentadilla en multipower", k: "Sentadilla con kettlebell", w: "Sentadilla a peso corporal" }],
  [["front squat"], { b: "Sentadilla frontal", w: "Sentadilla frontal" }],
  [["goblet squat"], { d: "Sentadilla goblet", k: "Sentadilla goblet", w: "Sentadilla goblet" }],
  [["bulgarian split squat", "split squat"], { d: "Sentadilla búlgara", w: "Sentadilla búlgara", b: "Sentadilla búlgara con barra", s: "Sentadilla búlgara en multipower" }],
  [["sumo squat"], { d: "Sentadilla sumo con mancuerna", b: "Sentadilla sumo con barra" }],
  [["box squat"], { b: "Sentadilla al cajón (box squat)" }],
  [["hack squat"], { m: "Hack squat", b: "Sentadilla hack con barra", s: "Hack squat en multipower" }],
  [["sissy squat"], { w: "Sentadilla sissy" }],
  [["jump squat"], { w: "Sentadilla con salto" }],
  [["zercher squat"], { b: "Sentadilla Zercher" }],
  [["overhead squat"], { b: "Sentadilla overhead" }],
  [["leg press"], { m: "Prensa de piernas" }],
  [["horizontal leg press"], { m: "Prensa horizontal" }],
  [["leg extension"], { m: "Extensión de cuádriceps" }],
  [["lying leg curl"], { m: "Curl femoral tumbado" }],
  [["seated leg curl"], { m: "Curl femoral sentado" }],
  [["standing leg curl"], { m: "Curl femoral de pie" }],
  [["nordic hamstring curl", "nordic curl"], { w: "Curl nórdico" }],
  [["lunge"], { d: "Zancadas", w: "Zancadas", b: "Zancadas con barra" }],
  [["walking lunge"], { d: "Zancadas caminando", b: "Zancadas caminando con barra" }],
  [["reverse lunge"], { d: "Zancada atrás con mancuernas" }],
  [["lateral lunge", "side lunge"], { b: "Zancada lateral con barra" }],
  [["step up"], { d: "Subida al cajón con mancuernas", b: "Subida al cajón con barra" }],
  [["hip thrust"], { b: "Hip thrust", m: "Hip thrust en máquina" }],
  [["glute bridge"], { w: "Puente de glúteo", b: "Puente de glúteo con barra" }],
  [["glute kickback"], { m: "Patada de glúteo en máquina", c: "Patada de glúteo en polea" }],
  [["hip abduction"], { m: "Abducción en máquina", c: "Abducción de cadera en polea" }],
  [["hip adduction"], { m: "Aducción de cadera en máquina", c: "Aducción de cadera en polea" }],
  [["standing calf raise", "calf raise"], { m: "Elevación de gemelo de pie", w: "Elevación de gemelo de pie", s: "Elevación de gemelo en multipower", b: "Elevación de gemelo con barra", d: "Elevación de gemelo con mancuerna" }],
  [["seated calf raise"], { m: "Elevación de gemelo sentado", w: "Elevación de gemelo sentado", d: "Elevación de gemelo sentado con mancuerna", b: "Elevación de gemelo sentado con barra" }],
  [["calf press", "leg press calf raise"], { m: "Elevación de gemelo en prensa" }],
  [["kettlebell swing", "swing"], { k: "Swing con kettlebell" }],
  [["cable pull through", "pull through"], { c: "Pull through en polea" }],
  [["glute ham raise"], { "*": "Glute ham raise (GHD)" }],
  [["box jump"], { w: "Salto al cajón" }],
  [["jumping lunge", "jump lunge"], { w: "Zancada con salto" }],
  [["clean"], { k: "Clean con kettlebell" }],
  [["snatch"], { k: "Snatch con kettlebell" }],
  [["high pull"], { k: "Tirón alto con kettlebell" }],
  [["farmer walk", "farmer carry"], { "*": "Paseo del granjero (farmer's walk)" }],
  // ── Core ──
  [["crunch"], { w: "Crunch", c: "Crunch en polea", m: "Crunch en máquina" }],
  [["decline crunch"], { w: "Crunch declinado" }],
  [["reverse crunch"], { w: "Crunch invertido" }],
  [["bicycle crunch"], { w: "Crunch bicicleta" }],
  [["sit up"], { w: "Sit-up" }],
  [["russian twist"], { w: "Giro ruso", c: "Giro ruso en polea" }],
  [["plank"], { "*": "Plancha" }],
  [["side plank"], { "*": "Plancha lateral" }],
  [["hanging leg raise"], { "*": "Elevación de piernas colgado" }],
  [["leg raise"], { w: "Elevación de piernas" }],
  [["ab wheel", "ab wheel rollout", "ab roller"], { "*": "Rueda abdominal" }],
  [["mountain climber"], { "*": "Escaladores (mountain climbers)" }],
  [["dead bug"], { "*": "Dead bug" }],
  [["pallof press"], { "*": "Press Pallof" }],
  [["woodchopper"], { c: "Leñador en polea", w: "Leñador en polea" }],
  [["v up"], { w: "Abdominales en V (jackknife)" }],
  // ── Cardio (los datos de distancia/tiempo los trata hevyAgrupar) ──
  [["running", "run", "running outdoor"], { "*": "Correr" }],
  [["running treadmill", "treadmill run"], { "*": "Correr en cinta" }],
  [["cycling indoor", "cycling stationary", "stationary bike", "exercise bike"], { "*": "Bicicleta estática" }],
  [["rowing"], { m: "Remo indoor (remoergómetro)" }],
  [["elliptical trainer", "elliptical"], { "*": "Elíptica" }],
  [["stair", "stairmaster", "stair climber"], { "*": "Escaladora (stairmaster)" }],
  [["sled push"], { "*": "Empuje de trineo (sled push)" }],
];

/** Clave de un nombre de la tabla: el movimiento SIN el equipo («seated cable row» → «row seated»). */
export function claveDeFila(nombre) {
  return claveMovimiento(separarEquipo(normalizarTitulo(nombre)).resto);
}

// clave de movimiento → { equipo: destino }. Se construye una vez, al cargar el módulo.
const TABLA = (() => {
  const t = Object.create(null);
  FILAS.forEach(([nombres, destinos]) => {
    nombres.forEach((n) => {
      const k = claveDeFila(n);
      // Dos filas que se pisen son un descuido del que escribe la tabla, no un dato: se prueba en el test.
      if (!t[k]) t[k] = destinos;
    });
  });
  return t;
})();

/** Todas las filas, para que el test compruebe destino a destino contra el catálogo real. */
export const FILAS_ALIAS = FILAS;

/**
 * Crea el traductor para un catálogo concreto.
 *   nombresCatalogo: array con el campo `n` de cada EJERCICIOS.
 *   extra: opcional, { "<título de Hevy>": "<nombre del catálogo>" } — alias del propio usuario.
 * Devuelve resolver(titulo) → { nombre, via } | null. `via`: "usuario" | "catalogo" | "alias".
 */
export function crearResolutor(nombresCatalogo, extra) {
  const lista = Array.isArray(nombresCatalogo) ? nombresCatalogo : [];
  const existe = new Set(lista);
  // normalizado → nombre; si dos nombres del catálogo normalizan igual, se marca ambiguo (null).
  const porNorm = new Map();
  lista.forEach((n) => {
    const k = normalizarTitulo(n);
    porNorm.set(k, porNorm.has(k) ? null : n);
  });
  const propios = new Map();
  if (extra && typeof extra === "object") {
    Object.keys(extra).forEach((t) => { if (existe.has(extra[t])) propios.set(normalizarTitulo(t), extra[t]); });
  }
  return function resolver(titulo) {
    const norm = normalizarTitulo(titulo);
    if (!norm) return null;
    if (propios.has(norm)) return { nombre: propios.get(norm), via: "usuario" };
    const directo = porNorm.get(norm);
    if (directo) return { nombre: directo, via: "catalogo" };
    const { eq, resto } = separarEquipo(norm);
    if (eq == null || !resto) return null;
    const fila = TABLA[claveMovimiento(resto)];
    if (!fila) return null;
    const destino = fila[eq] || fila["*"];
    if (!destino || !existe.has(destino)) return null;            // jamás un nombre que el catálogo no tenga
    return { nombre: destino, via: "alias" };
  };
}
