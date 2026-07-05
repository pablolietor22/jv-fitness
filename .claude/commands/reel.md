---
description: Procesa un reel/TikTok con el protocolo central del OS y enruta los hallazgos al repo correcto. Espejo del /reel del hub iamasters-os.
---

# /reel (espejo) — protocolo central en iamasters-os

1. **Lee `_BRUJULA-REPOS.md`** (raíz de este repo): ahí está el mapa de los 4 repos y las reglas de enrutado.
2. **Protocolo completo**: vive en `iamasters-os/.claude/commands/reel.md` (triaje oEmbed/embed → pipeline yt-dlp + ffmpeg + Whisper local o Groq → veredicto crítico → archivo). Si `iamasters-os` está clonado en la sesión (busca en `/home/user/iamasters-os` o `/workspace/iamasters-os`), úsalo TAL CUAL y archiva en SU bandeja (`projects/bandeja-reels/bandeja.md`).
3. **Si el hub NO está clonado**: dile al usuario — *"clona `pablolietor22/iamasters-os` en esta sesión para archivar en la bandeja central"*. Mientras tanto, archiva la entrada en `_bandeja-local.md` (créalo con la plantilla de la entrada) marcada `⏳ PENDIENTE DE SYNC → iamasters-os`.
4. **Aplica los hallazgos a su destino** (con la brújula): fitness → taller `jvfitness-dev` (`_INGESTA-PENDIENTE-<fecha>.md`, NUNCA el master-file sin protocolo LOCK) · mejoras de Claude/MCPs → `iamasters-os/projects/mejoras-claude/roadmap.md` · legal → `BACKLOG_JVLEGAL.md` del archivo JARVIS. Repo destino sin clonar → pide clonarlo.
5. **Regla de oro heredada**: un reel cada vez, exhaustivo, veredicto crítico no validador, y NUNCA inventar contenido que no se haya podido ver/oír.
6. **Verificación con estudios = OBLIGATORIA por defecto** (Pablo no debe recordarla): toda afirmación científica se contrasta con la literatura (WebSearch + bots adversariales que refutan, citando papers) ANTES del veredicto. Detalle completo en el `/reel` del hub. Nada llega al coach sin estudio detrás.
