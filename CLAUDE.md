# jv-fitness — repo de PRODUCCIÓN (privado · hosting externo)

⚠️ **`index.html` es un ARTEFACTO GENERADO. NO lo edites aquí.**

- Fuente de verdad: `jvfitness-dev/app/jv-fitness-mvp.html` (repo `pablolietor22/jvfitness-dev`)
- Flujo de deploy: editar fuente (con BAK en `app/_BAK/`) → `node --check` de los `<script>` → copiar aquí como `index.html` → escanear secretos → commit SIN coautor → push → verificar la URL pública con `?cb=<timestamp>`
- **Este repo es PRIVADO a propósito** (decisión de Pablo 2026-07-05, en `decisions-log.md` del hub). La web pública se sirve desde **Netlify o Cloudflare Pages** conectado a este repo (guía: `_DEPLOY.md`). ~~"Debe seguir público"~~ ya NO aplica: esa regla era de la era GitHub Pages (Pages gratis no sirve repos privados; con hosting externo sí se puede privado). Cada push a `main` republica solo.
- ⚠️ Privado oculta el REPO, no la web: el `index.html` servido (gate incluido) es visible con F12 en la URL pública. Nada realmente secreto puede vivir en este HTML.
- Compartir siempre el **ENLACE** de la app, nunca el archivo .html (iOS abre adjuntos sin JavaScript)
- Mapa de repos y enrutado: `_BRUJULA-REPOS.md`

Si necesitas cambiar la app y este es el único repo clonado: pide al usuario *"clona `pablolietor22/jvfitness-dev` en esta sesión"* y trabaja allí.
