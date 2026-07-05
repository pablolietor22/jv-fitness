# 🧭 Brújula de repositorios — dónde vive cada cosa

> ESTÁS EN: **jv-fitness** — el ESCAPARATE (GitHub Pages: https://pablolietor22.github.io/jv-fitness/).
> ⚠️ index.html es un ARTEFACTO GENERADO: NO editar aquí. La fuente es jvfitness-dev/app/jv-fitness-mvp.html
> (flujo: editar fuente → node --check → copiar aquí → scan secretos → commit sin coautor → curl cache-bust).
> El repo debe seguir PÚBLICO (privado + cuenta gratis = Pages 404, probado). Compartir el ENLACE, nunca el .html.
> Copia de esta brújula en los 4 repos. Si la editas, propaga el cambio a los demás (o pide clonarlos).

## El mapa (4 repos)

| Repo | Rol | Qué vive ahí | Rama |
|---|---|---|---|
| **pablolietor22/iamasters-os** | 🧠 HUB / OS | Bandeja central de reels (`projects/bandeja-reels/`) · coach JV Fitness verificado (`projects/briefs/jv-fitness/coach-system-prompt.md`) · comandos `/reel` `/entreno` · roadmap mejoras Claude (`projects/mejoras-claude/`) · contexto del operador (`context/`) | sesión cloud: rama `claude/...` designada |
| **pablolietor22/jvfitness-dev** | 🔧 TALLER JV Fitness | `master-file.md` (cerebro del proyecto) · `_motor/` (motor cálculo Python + tests) · `app/jv-fitness-mvp.html` (desarrollo) · `_MEJORAS-PENDIENTES.md` · `_ESTADO-PROYECTO.md` · deep researchs | `master` |
| **pablolietor22/jv-fitness** | 🌍 ESCAPARATE | `index.html` desplegada en GitHub Pages (la URL pública que usa Pablo). NO desarrollar aquí: se despliega desde el taller | `main` |
| **pablolietor22/-jarvis-legaltech** | 📜 ARCHIVO JARVIS (desktop) | Bandeja histórica de reels (jun-jul 26) · `BACKLOG_JVLEGAL.md` (fuente de verdad JVLegal) · apps JVLegal Suite · reglas operativas del JARVIS de escritorio | `main` |

## Reglas de enrutado (innegociables)

1. **Todo reel/TikTok destilado se archiva en la bandeja del HUB** (`iamasters-os/projects/bandeja-reels/bandeja.md`), venga de donde venga. Además, sus hallazgos se APLICAN al repo que toque (fitness → taller; legal → archivo JARVIS/backlog; mejoras Claude → roadmap del HUB).
2. **Si el repo que necesitas NO está clonado en la sesión** → NO lo des por perdido: dile al usuario *"clona `pablolietor22/<repo>` en esta sesión para poder meter esta información"*. Mientras tanto, archívalo en local con la marca `⏳ PENDIENTE DE SYNC → <repo destino>`.
3. **El cerebro fitness tiene DOS niveles**: evidencia científica verificada → coach del HUB (`coach-system-prompt.md`); conocimiento de producto/app → `master-file.md` del taller. No dupliques: enlaza.
4. **El escaparate (`jv-fitness`) nunca se edita a mano**: los cambios nacen en `app/jv-fitness-mvp.html` del taller y se despliegan copiando a `index.html`. Zonas protegidas del taller: motor (`R`/validar/bmr/calObjetivo/macros/factorPasos/plan/calibrar) y gate (`#gate` + bypass file:// + `?k=...`).
5. **Comandos espejo**: los 4 repos llevan `.claude/commands/reel.md` (mismo protocolo, enrutado a esta brújula). El pipeline completo (oEmbed/embed triage → yt-dlp → ffmpeg → Whisper local) vive documentado en el `/reel` del HUB.

## Cómo se pide un clon

El usuario añade el repo a la sesión diciendo: *"Clonar el repositorio pablolietor22/<nombre> en esta sesión"*.
