#!/usr/bin/env node
// simular-pieza.js <pieza.html> <idRaiz>
// Ejecuta el <script> real de una pieza portable en un DOM de juguete con relojes falsos y un
// IntersectionObserver controlable. Tres escenarios: (A) cargada pero NO vista -> nada pintado ni
// reloj alguno; (B) vista -> los relojes corren y todo acaba en 'in'; (C) toque antes de verse ->
// todo pintado y la vista posterior NO reinicia nada. Sale 1 si algo falla.
'use strict';
const fs = require('fs');
const [,, ruta, idRaiz] = process.argv;
const html = fs.readFileSync(ruta, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const clasesHtml = [...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));

function mundo() {
  // --- DOM de juguete ---
  const todos = [];
  function El(tag) {
    const el = { tag, children: [], _cls: new Set(), attrs: {}, textContent: '', _html: '', listeners: {}, parent: null, dataset: {}, style: {} };
    el.classList = { add: (...c) => c.forEach(x => el._cls.add(x)), remove: (...c) => c.forEach(x => el._cls.delete(x)), contains: c => el._cls.has(c), toggle: c => el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c) };
    Object.defineProperty(el, 'className', { get: () => [...el._cls].join(' '), set: v => { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
    Object.defineProperty(el, 'innerHTML', { get: () => el._html, set: v => { el._html = String(v); el.children = []; parse(el, el._html); } });
    Object.defineProperty(el, 'offsetWidth', { get: () => 100 });
    el.appendChild = c => { c.parent = el; el.children.push(c); return c; };
    el.setAttribute = (k, v) => { el.attrs[k] = v; if (k === 'class') el.className = v; if (k === 'id') el.attrs.id = v; };
    el.getAttribute = k => el.attrs[k];
    el.addEventListener = (t, fn) => { (el.listeners[t] = el.listeners[t] || []).push(fn); };
    el.dispatch = t => (el.listeners[t] || []).forEach(fn => fn({ target: el }));
    el.remove = () => { if (el.parent) el.parent.children = el.parent.children.filter(c => c !== el); };
    el.querySelector = s => el.querySelectorAll(s)[0] || null;
    el.querySelectorAll = s => { const out = []; const sels = s.split(',').map(x => x.trim()); (function walk(n) { n.children.forEach(c => { if (sels.some(sel => casaCompuesto(c, sel, el))) out.push(c); walk(c); }); })(el); return out; };
    todos.push(el);
    return el;
  }
  // selectores compuestos: 'A>B' (hijo directo) y 'A B' (descendiente); cada trozo simple va a casa()
  function casaCompuesto(el, sel, tope) {
    const partes = sel.split(/\s*>\s*|\s+/); const ops = sel.match(/\s*>\s*|\s+/g) || [];
    let nodo = el; if (!casa(nodo, partes[partes.length - 1])) return false;
    for (let i = partes.length - 2; i >= 0; i--) {
      const directo = /\>/.test(ops[i]);
      let p = nodo.parent; let ok = false;
      while (p && p !== tope.parent) { if (casa(p, partes[i])) { ok = true; nodo = p; break; } if (directo) break; p = p.parent; }
      if (!ok) return false;
    }
    return true;
  }
  function casa(el, sel) {
    if (sel.startsWith('#')) return el.attrs.id === sel.slice(1);
    if (sel.startsWith('.')) return sel.slice(1).split('.').every(c => el._cls.has(c));
    return el.tag === sel;
  }
  // parser mínimo de innerHTML: crea hijos por etiqueta con class/id, ignora texto
  function parse(padre, s) {
    const re = /<([a-z0-9]+)([^>]*)>/g; let m; const pila = [padre];
    const src = s.replace(/<\/([a-z0-9]+)>/g, (x, t) => `<¬${t}>`);
    const re2 = /<(¬?)([a-z0-9]+)([^>]*)>/g;
    while ((m = re2.exec(src))) {
      if (m[1]) { if (pila.length > 1 && pila[pila.length - 1].tag === m[2]) pila.pop(); continue; }
      const el = new El(m[2]);
      const cl = /class=['"]([^'"]+)['"]/.exec(m[3]); if (cl) el.className = cl[1];
      const id = /id=['"]([^'"]+)['"]/.exec(m[3]); if (id) el.attrs.id = id[1];
      pila[pila.length - 1].appendChild(el);
      if (!/^(br|img|input|hr|meta|link)$/.test(m[2])) pila.push(el);
    }
  }
  const documento = new El('document');
  documento.documentElement = new El('html');
  documento.body = new El('body'); documento.documentElement.appendChild(documento.body);
  parse(documento.body, html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, ''));
  documento.getElementById = id => todos.find(e => e.attrs.id === id) || null;
  documento.querySelector = s => documento.body.querySelector(s);
  documento.querySelectorAll = s => documento.body.querySelectorAll(s);
  documento.createElement = t => new El(t);
  // --- relojes falsos ---
  let ahora = 0, seq = 0; const relojes = new Map();
  const setTimeoutF = (fn, ms) => { const id = ++seq; relojes.set(id, { fn, at: ahora + (ms || 0), every: 0 }); return id; };
  const setIntervalF = (fn, ms) => { const id = ++seq; relojes.set(id, { fn, at: ahora + (ms || 16), every: ms || 16 }); return id; };
  const clearF = id => relojes.delete(id);
  function avanzar(ms) { const fin = ahora + ms; let guard = 0; while (guard++ < 100000) { let prox = null; for (const [id, r] of relojes) if (r.at <= fin && (!prox || r.at < prox.r.at)) prox = { id, r }; if (!prox) break; ahora = prox.r.at; if (prox.r.every) prox.r.at += prox.r.every; else relojes.delete(prox.id); prox.r.fn(); } ahora = fin; }
  // --- observador controlable ---
  const ios = [];
  function IO(cb, opts) { this.cb = cb; this.opts = opts; this.observe = el => { ios.push({ io: this, el }); }; this.unobserve = () => { this.unobserved = true; }; this.disconnect = () => {}; }
  const ventana = { matchMedia: () => ({ matches: false }), IntersectionObserver: IO, setTimeout: setTimeoutF, setInterval: setIntervalF, clearTimeout: clearF, clearInterval: clearF, document: documento };
  ventana.window = ventana;
  const fn = new Function('window', 'document', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'IntersectionObserver', script);
  fn(ventana, documento, setTimeoutF, setIntervalF, clearF, clearF, IO);
  return { documento, avanzar, relojes, ios, ver: () => ios.forEach(o => o.io.cb([{ isIntersecting: true, intersectionRatio: 1, target: o.el }], o.io)), salir: () => ios.forEach(o => o.io.cb([{ isIntersecting: false, intersectionRatio: 0, target: o.el }], o.io)) };
}

const raizSel = '#' + idRaiz;
function cuenta(m) { return m.documento.querySelectorAll('.in').length; }
let fallos = 0; const ok = (c, msg) => { console.log((c ? '  ✓ ' : '  ✗ ') + msg); if (!c) fallos++; };

console.log(`\n${ruta} · raíz ${raizSel}`);
// A · cargada, no vista
{ const m = mundo(); ok(m.ios.length === 1, 'crea exactamente 1 IntersectionObserver'); m.avanzar(60000); ok(cuenta(m) === 0, `A · no vista 60 s: 0 elementos 'in' (hay ${cuenta(m)})`); ok(m.relojes.size === 0, `A · no vista: 0 relojes vivos (hay ${m.relojes.size})`); }
// B · vista -> corre y termina
{ const m = mundo(); m.ver(); ok(m.relojes.size > 0, `B · al verse arrancan relojes (${m.relojes.size})`); m.avanzar(60000); const n = cuenta(m); ok(n > 0, `B · a los 60 s: ${n} elementos 'in'`); ok(m.relojes.size === 0, `B · al final 0 relojes vivos (hay ${m.relojes.size})`); m.ver(); m.avanzar(5000); ok(cuenta(m) === n, 'B · verse otra vez NO reinicia (misma cuenta)'); }
// C · toque antes de verse -> completo; verse después no reinicia
{ const m = mundo(); const raiz = m.documento.getElementById(idRaiz); console.log(`  · diagnóstico C: raíz encontrada=${!!raiz} · zonas bajo la raíz=${raiz?raiz.querySelectorAll('.jvfi-z,.jven-z,.jvru-z').length:'-'} · zonas en el documento=${m.documento.querySelectorAll('.jvfi-z,.jven-z,.jvru-z').length} · padre de la raíz=${raiz&&raiz.parent?raiz.parent.tag:'-'}`); raiz.dispatch('click'); const n1 = cuenta(m); const totalC = (function(){ const k = mundo(); k.ver(); k.avanzar(60000); return cuenta(k); })(); ok(n1 >= totalC, `C · toque antes de verse: ${n1} elementos 'in' (el recorrido natural deja ${totalC}; el toque puede marcar tambien lo que acaba oculto)`); ok(m.relojes.size === 0, 'C · tras el toque 0 relojes'); m.ver(); m.avanzar(60000); ok(cuenta(m) === n1 && m.relojes.size === 0, `C · verse después del toque no reinicia (${cuenta(m)} in, ${m.relojes.size} relojes)`); }
// D · sale de pantalla a medias -> se completa
{ const m = mundo(); m.ver(); m.avanzar(1500); const parcial = cuenta(m); m.salir(); const tras = cuenta(m); const total = (function(){ const k = mundo(); k.ver(); k.avanzar(60000); return cuenta(k); })(); ok(tras === total && m.relojes.size === 0, `D · sale a medias (${parcial} in) -> completa del todo (${tras} de ${total} in, ${m.relojes.size} relojes)`); }
console.log(fallos ? `\n═══ ROJOS: ${fallos} ═══` : '\n═══ TODO VERDE ═══');
process.exit(fallos ? 1 : 0);
