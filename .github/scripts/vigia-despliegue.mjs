// AGENTE 01 del ecosistema · VIGÍA DEL DESPLIEGUE de JV Fitness
// ---------------------------------------------------------------------------
// Qué hace: cada día comprueba que la web pública está viva y bien desplegada.
// NO toca nada, NO envía nada, NO usa secretos: solo LEE la web pública (y el
// index.html de su propio repo) y decide si algo va mal.
//
// Cómo avisa: si algo va mal termina con código 1 → el job de GitHub Actions
// sale ROJO → GitHub te manda un email él solo. No hace falta ni bot ni token.
//
// El dolor que mata (bug real de julio): desplegar sin copiar sw.js, o pushear
// y que Pages no reconstruya → el móvil se queda pegado en una versión vieja.
//
// Node 18+ (fetch nativo), sin dependencias.
// A mano:  node .github/scripts/vigia-despliegue.mjs
// Contra otra URL:  VIGIA_URL="https://..." node .github/scripts/vigia-despliegue.mjs

import { readFile, appendFile } from "node:fs/promises";

const BASE = process.env.VIGIA_URL || "https://pablolietor22.github.io/jv-fitness/";
// Fichero del repo con el que comparar lo que sirve la web. Si no existe, se omite.
const LOCAL = process.env.VIGIA_LOCAL || "index.html";

const rojo = [];   // fallos duros  → job rojo → email
const ambar = [];  // avisos        → se anotan, no tumban el job
const info = [];   // datos

// La versión canónica de la app es SOLO esta marca. Nada de buscar "vX.Y.Z"
// suelto: el HTML está lleno de comentarios con versiones históricas
// ("rediseño de la fila de serie (v0.35.0)") y hasta versiones de librerías,
// y eso produce lecturas falsas. Lección aprendida en pruebas: una regex laxa
// dijo "v5.1.1" y "v0.34.1" cuando la app iba por 0.57.0.
const RE_VERSION = /app_version\s*:\s*"([0-9]+(?:\.[0-9]+)*)"/;

async function traer(ruta) {
  const url = new URL(ruta, BASE).href;
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: "follow" });
    const cuerpo = await r.text();
    return { ok: r.ok, estado: r.status, cuerpo, ms: Date.now() - t0, url };
  } catch (e) {
    return { ok: false, estado: 0, cuerpo: "", ms: Date.now() - t0, url, error: String((e && e.message) || e) };
  }
}

async function comprobar() {
  // 1) La web responde y trae la app de verdad (no una página de error)
  const home = await traer("index.html");
  if (!home.ok) {
    rojo.push(`La web pública no responde (HTTP ${home.estado}${home.error ? " · " + home.error : ""}) — ${home.url}`);
    return; // sin home, el resto no dice nada útil
  }
  info.push(`index.html: ${home.estado} · ${(home.cuerpo.length / 1024) | 0} KB · ${home.ms} ms`);
  if (home.cuerpo.length < 100_000) {
    rojo.push(`La web responde pero devuelve muy poco (${home.cuerpo.length} bytes): parece una página de error, no la app.`);
  }

  // 2) Versión que sirve la web, leída del marcador canónico
  const mWeb = RE_VERSION.exec(home.cuerpo);
  const verWeb = mWeb ? mWeb[1] : null;
  if (!verWeb) {
    rojo.push('No encuentro el marcador de versión app_version:"X.Y.Z" en el HTML servido. O cambió el formato, o lo que se sirve no es la app.');
  } else {
    info.push(`Versión servida al usuario: ${verWeb}`);
  }

  // 3) ¿La web sirve lo que hay en el repo? (detecta "pusheé y Pages no reconstruyó")
  let verRepo = null;
  try {
    const local = await readFile(LOCAL, "utf8");
    const mRepo = RE_VERSION.exec(local);
    verRepo = mRepo ? mRepo[1] : null;
  } catch { /* fuera del repo (ejecución local suelta): se omite esta comprobación */ }

  if (verRepo && verWeb) {
    if (verRepo === verWeb) {
      info.push(`El repo y la web coinciden (${verWeb}): el despliegue llegó entero.`);
    } else {
      rojo.push(`DESFASE DE DESPLIEGUE: el repo tiene ${verRepo} pero la web sirve ${verWeb}. O Pages no ha reconstruido, o el push se quedó a medias.`);
    }
  } else if (verRepo === null) {
    info.push("Sin comparación repo↔web (no encontré el index.html local).");
  }

  // 4) El HTML registra el service worker (si no, la app no se autoactualiza)
  if (!/serviceWorker/.test(home.cuerpo) || !/sw\.js/.test(home.cuerpo)) {
    rojo.push("El HTML servido NO registra el service worker: la app no se autoactualizará en el móvil.");
  }

  // 5) sw.js existe Y es el network-first correcto ← el corazón del vigía
  const sw = await traer("sw.js");
  if (!sw.ok) {
    rojo.push(`sw.js NO se sirve (HTTP ${sw.estado}). ESTE es el fallo histórico: se publicó sin copiar sw.js y el móvil se quedó con una versión vieja.`);
  } else {
    const faltan = [];
    if (!/jvf-cache/.test(sw.cuerpo)) faltan.push("nombre de caché 'jvf-cache'");
    if (!/fetch\s*\(\s*e\.request\s*\)/.test(sw.cuerpo)) faltan.push("estrategia network-first");
    if (!/skipWaiting/.test(sw.cuerpo)) faltan.push("skipWaiting");
    if (faltan.length) {
      rojo.push(`sw.js se sirve pero no parece el network-first correcto (falta: ${faltan.join("; ")}). Riesgo de caché pegada.`);
    } else {
      info.push("sw.js: presente y network-first verificado.");
    }
  }

  // 6) PWA: manifest e icono (avisos blandos)
  const manifest = await traer("manifest.json");
  if (!manifest.ok) ambar.push(`manifest.json no se sirve (HTTP ${manifest.estado}): "Añadir a pantalla de inicio" puede fallar.`);
  else info.push("manifest.json: presente.");

  const icono = await traer("icon.svg");
  if (!icono.ok) ambar.push(`icon.svg no se sirve (HTTP ${icono.estado}): el icono de la PWA puede no aparecer.`);
}

async function resumenActions(ok) {
  const ruta = process.env.GITHUB_STEP_SUMMARY;
  if (!ruta) return;
  let md = `## Vigía del despliegue — ${ok ? "✓ sano" : "✗ revisar"}\n\n`;
  if (info.length) md += "**Datos**\n" + info.map((s) => `- ${s}`).join("\n") + "\n\n";
  if (ambar.length) md += "**Avisos**\n" + ambar.map((s) => `- ⚠️ ${s}`).join("\n") + "\n\n";
  if (rojo.length) md += "**Fallos**\n" + rojo.map((s) => `- ❌ ${s}`).join("\n") + "\n";
  try { await appendFile(ruta, md); } catch { /* el resumen es un extra */ }
}

// --- ejecución --------------------------------------------------------------
// Ojo con el orden: hay que TERMINAR de escribir antes de salir. Llamar a
// process.exit() con escrituras async a medias hace que Node aborte con
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" y devuelva 127
// en vez de 1. Por eso se hace await de todo y se fija exitCode al final.
await comprobar();

const linea = (s) => console.log(s);
linea("");
linea("== VIGÍA DEL DESPLIEGUE · JV Fitness ==");
linea(`Web vigilada: ${BASE}`);
linea("");
if (info.length) { linea("Datos:"); info.forEach((s) => linea("  · " + s)); linea(""); }
if (ambar.length) { linea("Avisos:"); ambar.forEach((s) => linea("  ▲ " + s)); linea(""); }

const sano = rojo.length === 0;
if (sano) {
  linea("VEREDICTO: ✓ despliegue sano" + (ambar.length ? " (con avisos)" : ""));
} else {
  linea("VEREDICTO: ✗ ALGO VA MAL");
  rojo.forEach((s) => linea("  ✗ " + s));
}
linea("");

await resumenActions(sano);
process.exitCode = sano ? 0 : 1;
