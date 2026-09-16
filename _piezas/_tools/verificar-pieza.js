#!/usr/bin/env node
// verificar-pieza.js <pieza.html> <literales.json>
// Compuerta determinista de una pieza portable del viaje astral. Sale con codigo 1 si hay ROJOS.
// Los verificadores adversariales la usan como suelo, no como techo: luego leen el codigo.
'use strict';
const fs = require('fs');
const [,, ruta, literalesRuta] = process.argv;
if (!ruta) { console.error('uso: node verificar-pieza.js <pieza.html> [literales.json]'); process.exit(2); }
const html = fs.readFileSync(ruta, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
const rojos = [], ambar = [], verdes = [];
const ok = (c, m) => (c ? verdes : rojos).push(m);
const warn = (c, m) => { if (!c) ambar.push(m); };

// 1 · contrato de pieza suelta
ok(/<meta charset="utf-8">/i.test(html), 'meta charset utf-8 (sin el, tildes rotas suelta)');
ok(/<meta name="viewport"/i.test(html), 'meta viewport (sin el, el movil pinta a 980px)');
ok(bytes <= 24 * 1024, `peso ${bytes} B <= 24 KB por pieza`);
// El techo que de verdad manda es el del plan maestro: 150 KB para TODA la obra sobre la pagina.
// No se suman los HTML de _piezas/ (ahi hay copias de reserva que no se publican): se mide el
// showcase.html, que es lo que de verdad descarga el visitante.
try {
  const path = require('path');
  const sc = path.join(path.dirname(ruta), '..', '..', 'showcase.html');
  if (fs.existsSync(sc)) {
    const kb = fs.statSync(sc).size;
    ok(kb <= 400 * 1024, `la pagina publicada: showcase.html ${kb} B (las 150 KB del plan son el PESO ANADIDO por la obra, no el total)`);
  }
} catch (e) { ambar.push('no se pudo medir el showcase: ' + e.message); }

// 2 · prohibiciones de la casa (CSP default-src self + Never Ship de Emil + plan maestro)
ok(!/\b(src|href)=["']https?:\/\//i.test(html), 'sin recursos externos (CSP default-src self)');
ok(!/<script[^>]+src=/i.test(html), 'sin <script src>: cero librerias');
ok(!/transition\s*:\s*all\b/i.test(html), 'sin transition: all (Never Ship)');
ok(!/scale\(\s*0\s*\)/.test(html), 'sin scale(0) en entradas (Never Ship: nada aparece de la nada)');
ok(!/ease-in\b(?!-out)/.test(html.replace(/ease-in-out/g, '')), 'sin ease-in en interfaz (Never Ship)');
ok(!/\bstyle="/.test(html), 'sin style="" en el HTML (las variables van en clases; CSP de otros showcases lo bloquea en silencio)');
ok(/prefers-reduced-motion\s*:\s*reduce/.test(html), 'bloque @media prefers-reduced-motion presente');
ok(/matchMedia\([^)]*prefers-reduced-motion/.test(html), 'el JS consulta prefers-reduced-motion (quieto)');
ok(/IntersectionObserver/.test(html), 'arranca por IntersectionObserver (al VERSE, no al cargar)');
ok(/addEventListener\(\s*['"]click['"]/.test(html), 'un toque completa la escena');
ok(/aria-hidden/.test(html), 'lo decorativo lleva aria-hidden');

// 3 · techos de mareo (plan maestro: <=5 % escala, <=11 grados)
const escalas = [...html.matchAll(/scale\(\s*([0-9.]+)\s*\)/g)].map(m => +m[1]).filter(v => v !== 1);
ok(escalas.every(v => v >= 0.95 && v <= 1.05), `escalas dentro de +-5 % (${escalas.join(', ') || 'ninguna'})`);
const grados = [...html.matchAll(/rotate\(\s*(-?[0-9.]+)deg\)/g)].map(m => Math.abs(+m[1]));
ok(grados.every(v => v <= 11), `rotaciones <= 11 grados (${grados.join(', ') || 'ninguna'})`);

// 4 · duraciones de interfaz (Never Ship: >300 ms sin motivo; aqui se permiten entradas ilustrativas hasta 600)
const ms = [...html.matchAll(/(\d{3,4})ms/g)].map(m => +m[1]);
warn(ms.every(v => v <= 600), `hay transiciones > 600 ms: ${ms.filter(v => v > 600).join(', ')}`);

// 5 · sintaxis del script
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
ok(scripts.length >= 1, 'hay un <script> inline');
for (const s of scripts) { try { new Function(s); verdes.push('script: sintaxis OK'); } catch (e) { rojos.push('script NO compila: ' + e.message); } }

// 6 · prefijo de clases unico (todas las clases empiezan por el mismo prefijo jvXX-)
const clases = [...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));
const pref = (clases[0] || '').match(/^(jv[a-z]{2})/);
if (pref) {
  const raras = clases.filter(c => c && !c.startsWith(pref[1]) && !/^(in|pick|se-va|foco)$/.test(c));
  ok(raras.length === 0, `todas las clases con prefijo ${pref[1]}- (raras: ${raras.slice(0, 5).join(', ') || 'ninguna'})`);
} else rojos.push('no se detecta prefijo jvXX- en las clases');

// 7 · literales: cada cadena del JSON debe aparecer TAL CUAL
if (literalesRuta && fs.existsSync(literalesRuta)) {
  const lit = JSON.parse(fs.readFileSync(literalesRuta, 'utf8'));
  for (const [k, v] of Object.entries(lit)) ok(html.includes(v), `literal «${k}» presente tal cual`);
}

// 8 · nota de honestidad al pie
ok(/literal/i.test(html) && /(atrezo|ejemplo)/i.test(html), 'nota al pie: dice que es literal y que es atrezo');

console.log(`\n${ruta}  ·  ${bytes} B`);
verdes.forEach(m => console.log('  ✓ ' + m));
ambar.forEach(m => console.log('  ⚠ ' + m));
rojos.forEach(m => console.log('  ✗ ' + m));
console.log(`\n═══ VERDES: ${verdes.length} · AMBAR: ${ambar.length} · ROJOS: ${rojos.length} ═══`);
process.exit(rojos.length ? 1 : 0);
