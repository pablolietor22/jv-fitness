# Cómo publicar JV Fitness

## ✅ ESTADO ACTUAL (2026-07-07, decisión de Pablo revertida): repo PÚBLICO + GitHub Pages
- **URL VIVA:** https://pablolietor22.github.io/jv-fitness/ · contraseña del gate: `lietor`
- El repo `jv-fitness` (SOLO el escaparate) se volvió a poner **público** para que Pages gratis lo sirva. El TALLER `jvfitness-dev` (master-file, motor, todo lo gordo) sigue PRIVADO. Escaneo de secretos previo: 0.
- **Deploy = un push a `main`**: el flujo copia `app/jv-fitness-mvp.html` del taller → `index.html` aquí **Y `app/sw.js` → `sw.js`** → `git push` → Pages reconstruye solo en ~1-2 min.
- ⚠️ **SIEMPRE copiar también `sw.js`** (service worker network-first): es lo que hace que la app se autoactualice en el móvil (sin él, se queda pegada en versiones viejas cacheadas — pasó el 09-07). Registro en el `<script>` final del HTML.
- Lleva `manifest.json` + `icon.svg` (PWA): "Añadir a pantalla de inicio" en el móvil = icono como app nativa (pantalla completa).
- La opción Netlify/privado de abajo queda como alternativa histórica (si algún día se quiere ocultar el historial).

---

# (Histórico) Cómo publicar con repo PRIVADO + hosting externo


> Decisión de Pablo (05/07): el repo `pablolietor22/jv-fitness` es **PRIVADO a propósito**.
> GitHub Pages gratis no sirve repos privados, así que la web pública se sirve desde **Netlify**
> o **Cloudflare Pages** (ambos gratis, publican `index.html` desde `main`).
> Reparto: 🤖 = lo hace Claude en el repo · 🖐️ = lo haces tú en un panel (cuenta/OAuth).

## Estado del repo — 🤖 LISTO
- `index.html` en la raíz (la app v0.9.1, con los 2 fixes del 05/07).
- `_headers` con cabeceras de seguridad (lo leen tanto Netlify como Cloudflare).
- `.nojekyll` (inofensivo fuera de Pages) · `CLAUDE.md` (guardián) · `_BRUJULA-REPOS.md`.
- **No hace falta build**: es un sitio estático de un solo archivo. Publish directory = raíz (`.` o `/`).

## Opción A — Netlify (la más rápida) 🖐️
1. Entra en https://app.netlify.com → **Add new site → Import an existing project**.
2. **Deploy with GitHub** → autoriza Netlify (aquí es donde le das permiso para ver tu repo privado; puedes limitarlo SOLO a `jv-fitness`).
3. Elige `pablolietor22/jv-fitness`, branch `main`.
4. **Build command**: (déjalo VACÍO). **Publish directory**: `.` (un punto). → **Deploy**.
5. Te da una URL tipo `https://<algo>.netlify.app`. En **Site configuration → Change site name** puedes ponerle algo como `jv-fitness-pablo`.
6. (Opcional) **Site configuration → Build & deploy → Stop builds** no; déjalo con auto-deploy: cada push a `main` republica solo.

## Opción B — Cloudflare Pages 🖐️
1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**.
2. Autoriza Cloudflare para el repo privado `jv-fitness`.
3. Framework preset: **None**. Build command: (vacío). Build output directory: `/`.
4. **Save and Deploy** → te da `https://jv-fitness.pages.dev`.

## Después (cualquiera de las dos)
- Verifica la URL nueva con `?cb=<timestamp>` para saltarte la caché.
- **Esta URL nueva SUSTITUYE a la de GitHub Pages** — actualiza el enlace que uses en el móvil.
- Cada `git push` a `main` (que hace el flujo de deploy desde el taller) republica automáticamente.

## ⚠️ Aviso honesto sobre "código oculto"
Hacer el repo privado oculta el **historial y los demás archivos** del repo. PERO la app es una
web estática: **el `index.html` que se sirve en la URL pública es visible al 100% con F12 / "Ver código
fuente"** — incluido el `#gate` y la contraseña `lietor` en claro. Eso siempre fue así (el gate es una
"puerta simple compartida", no seguridad). Privado ≠ la web deja de mostrar su propio HTML. Si algún
día hay algo REALMENTE secreto (una API key), NO puede vivir en este HTML: iría en un backend/función.
