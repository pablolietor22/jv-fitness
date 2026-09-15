# Hallazgos de los verificadores adversariales — Escena 3 (entrenos)

> Generado del diario del workflow `wf_1f6b54db-99b` (15/16-09-2026). Tres lentes independientes,
> cada hallazgo con su prueba reproducible. **Reproduce antes de creer**: si uno es falso, dilo con
> la prueba y no toques nada. Fuente de la app: `git -C C:/dev/jvfitness-dev show origin/master:app/jv-fitness-mvp.html`


## Lente: Móvil y portabilidad — Escena 3 · Los entrenos (C:/Users/pablo/dev/jv-fitness/_piezas/escena-entrenos/escena-entrenos.html)

**Veredicto:** APTA

APTA en móvil y portabilidad, con 0 rojos y 3 ámbar. Lo que sostiene el veredicto, medido en navegador servido (127.0.0.1:8781, DOM, no a ojo): a 360×780 la pieza no desborda ni suelta ni pegada en el showcase (scrollWidth 360 = innerWidth, 0 elementos fuera de pantalla en el estado FINAL con todos los bloques creados), y tampoco a 320 px; la fila de series sale exacta a la aritmética (26 · 69,6 · 69,7 · 62,7 · 28 px en un .jven-ej de 272 px útiles) y «62,5» cabe en 68 px con cursor; pegada hereda los tokens reales (IBM Plex Mono, Space Grotesk, --mute-2 del showcase) y .jven gana a las reglas globales section{} y h1,h2,h3{} (padding 26 px, line-height 1,1 verificados); grep de «jven» en showcase.html = 0, ninguna clase ni id sin prefijo, sin style=\"\", sin recursos externos ni <script src>, sin CRLF; clamp() en titular y padding, tabular-nums en celdas, reloj y recuento; aria-hidden en los 4 adornos; toque → 16 .in y 0 animaciones; reduced-motion forzado → todo pintado de golpe. Compuerta determinista: 64 verdes, 0 rojos. Los tres ámbar: (1) --mute-2 pegada es #5E756B y da 3,46:1 sobre el panel (falla AA en nota, cita, «hoy» y «Descanso» a 9,6 px) — defecto de casa heredado del molde y de la paleta del showcase, para decidir arriba; (2) 22.508 B con 20 bytes de margen: cualquier arreglo revienta la compuerta si no se recorta comentario; (3) con las 8 tarjetas pre-pintadas la sección mide 1.043 px y el umbral .25 no se alcanza en viewports de ≤245 px de alto (SE 1ª gen apaisado): caja vacía hasta que se toca; en el S24 de Pablo arranca. Notas menores: transiciones de color del chip RIR fuera del bloque reduced-motion, mono 700 sintetizada pegada, metas duplicadas en body (pierde viewport-fit=cover, sin efecto hoy), detección por .jvce, suelta sin lang, y que el brief de la lente decía 16 KB donde el pliego fijó 22. Limitación honesta: las capturas tras scroll salieron negras porque mi pestaña estaba en segundo plano (otra sesión verifica la Escena 5 en la misma ventana) y no la puse delante para no congelarle sus relojes; la prueba dura es el DOM.

### 🟡 Contraste de --mute-2 PEGADA por debajo de AA: el showcase define --mute-2:#5E756B (no el #7E968B de reserva) y sobre --panel #101E19 da 3,46:1 (3,57:1 sobre panel-2), cuando el mínimo para texto normal es 4,5:1. Afecta a .jven-nota (12,5 px), .jven-cita (11,5 px), .jven-barra i «hoy» (10,2 px) y .jven-rest-l «Descanso» (9,6 px, además por debajo del suelo habitual de 11 px en móvil). Suelta sí pasa (5,42:1). La cabecera kg·reps·RIR (.jven-shd span, 9,9 px con opacity .65) baja a 2,22:1 pegada / 3,06:1 suelta, PERO copia literalmente el CSS de la app (.ent-serie-head span, línea 289 de master: .62rem, opacity .65, .04em), así que ahí la pieza es fiel. Es un defecto de casa: el molde (fisio) usa el mismo mute2 para nota/cita/por/mas y la paleta la pone el showcase; que lo decida el main loop, no un arreglo aislado en esta pieza.

- **Dónde:** escena-entrenos.html líneas 19 (token --en-mute2), 35, 56, 81, 85, 87; showcase.html línea 299
- **Prueba:** node contraste.js (WCAG) → 5,42:1 suelta vs 3,46:1 pegada; getComputedStyle(.jven-nota).color en showcase-pegada.html = rgb(94,117,107); grep -- '--mute-2' showcase.html línea 299

### 🟡 Peso al filo de la compuerta: 22.508 B frente a 22.528 B (22×1024) → 20 bytes de margen. Cualquier arreglo que añada un atributo o una clase pone verificar-pieza.js en ROJO; y si «22 KB» del pliego se lee en decimal (22.000 B) ya va 508 B por encima. La grasa evidente es el comentario de cabecera (líneas 3-17, ~1 KB) y los comentarios del script.

- **Dónde:** escena-entrenos.html entero; comentarios líneas 3-17 y 128-129, 165, 169-170
- **Prueba:** wc -c → 22508; node verificar-pieza.js → «peso 22508 B <= 22 KB» con 0 rojos; 22528-22508=20

### 🟡 En apaisado bajo la escena no arranca sola: las 8 tarjetas se pintan (opacity 0) antes de arrancar y la sección ya mide 1.043 px a 360 px de ancho (990 px a 568), así que con threshold .25 hacen falta ≥261 px (≥248 px) de alto útil. Medido: 640×300 → ratio máx .298 (arranca); 568×250 → .253 (arranca por 3 px); un iPhone SE 1ª gen apaisado (~230 px útiles con la barra de Safari) o cualquier ventana ≤245 px de alto nunca llega al .25 y se queda el marco como caja vacía hasta que se toca. En el S24 de Pablo (780×360 apaisado, ~304 px útiles) sí arranca. Al molde no le pasa porque su marco arranca con 340-460 px. Sugerencia sin tocar el .25 del pliego: arrancar también cuando la escena llene ≥60 % del viewport (e.intersectionRect.height >= e.rootBounds.height*.6).

- **Dónde:** escena-entrenos.html líneas 332 (e.intersectionRatio >= .25) y 335 (threshold: .25); tarjetas pre-pintadas líneas 193-201
- **Prueba:** getBoundingClientRect().height de #jven = 1043 (360×780), 1005 (640×300), 990 (568×250); innerHeight/secH = 0,298 y 0,253

### ⚪ Reduced-motion: todo se pinta de golpe (verificado: 16 .in, celdas llenas, 2:27, 20 series, cita visible, subrayado a scaleX(1), marco transform none), pero .jven-rir no está en la lista del bloque @media (línea 91): al encender el chip RIR corren 6 transiciones de color de 260 ms (background-color, 4 border-color, color). No es movimiento (doctrina «fewer and gentler»), pero el pliego A.2 pide transition:none «en todo».

- **Dónde:** escena-entrenos.html línea 61 (transition de .jven-rir) y línea 91 (lista del @media)
- **Prueba:** copia con matchMedia stub (escena-entrenos-rm.html) → document.getAnimations() dentro de #jven = 6, todas sobre .jven-rir.pick, dur 260

### ⚪ Mono en negrita pegada: el showcase solo carga IBM Plex Mono 400 y 500; .jven-num y .jven-rest b piden 700 → el navegador fabrica la negrita (faux bold), más borrosa en pantalla de móvil. No desborda (.jven-num 26/26 px, sin spill). Con 500 se evita.

- **Dónde:** escena-entrenos.html líneas 57 y 79; showcase.html @font-face líneas 284-292
- **Prueba:** document.fonts cargadas en pegada: «Space Grotesk 400 700», «IBM Plex Mono 400», «IBM Plex Mono 500»; getComputedStyle(.jven-num).fontWeight = 700

### ⚪ Pegada quedan DOS <meta viewport> y DOS <meta charset> en el DOM (la de la pieza dentro de <body>). Chromium/WebKit procesan la viewport esté donde esté y gana la última, así que la del showcase pierde viewport-fit=cover. Efecto nulo hoy (0 usos de safe-area en el showcase, fondo idéntico) y ya lo hacen las piezas jvce y jvfi: es del molde, no de esta pieza.

- **Dónde:** escena-entrenos.html línea 1; showcase.html línea 32
- **Prueba:** document.querySelectorAll('meta[name=viewport]').length = 2 en showcase-pegada.html; grep -c safe-area showcase.html = 0

### ⚪ La detección suelta/pegada depende de que exista .jvce (Escena 1) y de que esté ANTES en el DOM: hoy se cumple (.jvce en 1475, la 3 se pega tras 1818 → sueltaClass=false verificado). Si la Escena 1 se moviera o quitara, añadiría html.jven-suelta dentro del showcase; hoy sin efecto visible porque fondo (#0A100E) y familia coinciden. Idéntico al molde; no hay otra dependencia de globales del showcase (solo document/window estándar e ids propios).

- **Dónde:** escena-entrenos.html línea 124
- **Prueba:** grep -n 'class="jvce' showcase.html → 1475; documentElement.className en pegada = «js lettersgo» (sin jven-suelta); grep de document./window. en la pieza

### ⚪ Suelta no hay <html lang="es"> (no hay etiqueta html) ni -webkit-text-size-adjust:100% (el showcase sí lo trae en línea 338): lector de pantalla sin idioma declarado e iOS Safari puede inflar el texto en apaisado. Heredado del molde.

- **Dónde:** escena-entrenos.html líneas 1-2 y 20
- **Prueba:** estructura del fichero (líneas 1-2); showcase.html línea 338

### ⚪ A 320 px (fuera del contrato de 360) tampoco desborda: docSW 320, columnas 26·53·53·56·28 (el RIR toca su mínimo de 56), celdas de 51 px sin recorte en estado final. Pero con IBM Plex Mono «62,5▍» durante el tecleo pide ~59 px > 51 → el cursor se saldría del recuadro un instante (la celda no lleva overflow:hidden). A 360 sobra (68 px).

- **Dónde:** escena-entrenos.html líneas 55 (grid) y 58-59 (celda y cursor)
- **Prueba:** resize 320×700 + clic sintético: scrollWidth 320, gridTemplateColumns «26px 53px 53px 56px 28px», celdas clientWidth 51 = scrollWidth 51

### ⚪ El brief de esta lente dice «peso ≤16 KB»; el pliego §A.3 lo corrigió el 15-09 a 22 KB por pieza. He juzgado contra el pliego, que es quien manda.

- **Dónde:** pliego §A.3
- **Prueba:** _PLIEGO-ESCENAS-3-Y-5-VIAJE-ASTRAL.md línea 50


## Lente: MOVIMIENTO Y COMPUERTAS — Escena 3 · Los entrenos (C:/Users/pablo/dev/jv-fitness/_piezas/escena-entrenos/escena-entrenos.html, 22.508 B)

**Veredicto:** NO APTA

Compuerta determinista: 64 verdes · 0 ámbar · 0 rojos. Lo que SÍ aguanta, medido y no supuesto: (1) Línea de tiempo real reconstruida con DOM mínimo + relojes falsos en Node (<scratch>/mov-entrenos.js, 306 comprobaciones, 0 fallos): cortes exactamente en 0 / 600 / 1600-2300 (cascada 100 ms) / 3400 / 4200→6940 (tecleo 90 ms por carácter, cursor solo en la activa) / 7400 / 8400 / 9600 (tics 10600-11600-12600) / 11200 (recuento 0→20 en 700 ms, paso 35 ms) / 12600; hueco máximo entre cambios 1.200 ms (nunca > 5,5 s), último cambio a 12,6 s + 340 ms de transición (dentro de 12-18 s). En el navegador real los mismos cortes llegan con desvío ≤ 13 ms. (2) Movimiento: entradas 300-340 ms con `--ease-entra`, golpe 320 ms (.97→1.04→1), Guardar 240 ms (1→1.04→1), subrayado 300 ms `--ease-casa`; escalas .98/.97/1.04 dentro del ±5 %; sin rotaciones; sin `transition:all`, sin `ease-in`, sin `will-change`; en el pico 16 animaciones vivas y **0 al final** (`document.getAnimations()`), también 0 tras el toque y 3 s después. (3) Compuertas: el IO arranca una sola vez (segunda entrada no duplica relojes; ratio .1 no arranca; `dataset.listo` impide doble ejecución: 1 IO, 1 listener, 8 filas); `parar()` limpia timeouts e intervals (los dos `setInterval` van a `tempos`); el toque —antes de arrancar, a 200/3500/5000/7500/10300/11500 ms, tras el final, y un click real a 5.986 ms— deja siempre 0 relojes, un bloque de cada, 16/16 `.in`, celdas 60·8·2 / 60·8·2 / 62,5·7·1, sin cursor, 2:27, 20, RIR fila 1 y Guardar en `pick`, lista sin `dim`, subrayado en `scaleX(1)` con transición 0 s, y no se rompe nada al entrar/salir después; quieto: 48 relojes a ≤ 60 ms, 0 intervalos, todo pintado; sin IO (navegador viejo) arranca al cargar. Móvil 360×780 a plena vista: termina sola, `scrollWidth 360 = innerWidth`. Lo que NO aguanta: UNA roja reproducida en Chromium real y validada por mutación — con un solo umbral .25, `!e.isIntersecting` es verdadero en cuanto el ratio baja del 25 % aunque la sección siga en pantalla, y como la sección crece al reproducirse (1.051→1.501 px; móvil 1.043→1.554), un visitante QUIETO con «rótulo + cabecera de la app asomando» (263-375 px visibles; móvil 261-388) ve la escena abortar a los 3,4 s (`jven-ya` a 3.409 ms). Arreglo de 4 bytes en la línea 335: `{ threshold: [0, .25] }`; con eso el cruce a .249 llega como intersectante y solo la salida real (ratio 0) completa — probado. El molde escena-fisio y el arreglo D.4 de la Escena 4 llevan el mismo mecanismo: avisar al main loop. Veredicto: NO APTA hasta ese cambio + re-pasar checker (peso: 20 B de margen) y esta lente; el resto de la pieza está limpio y las notas son de letra de la norma o de partitura del propio storyboard, no de ejecución.

### 🔴 La compuerta de salida completa la escena DELANTE del visitante sin que se mueva. La pieza usa un solo umbral (.25) y trata `!e.isIntersecting` como «ha salido de pantalla», pero en Chromium `isIntersecting` es falso en cuanto el ratio baja del umbral más bajo, aunque la sección siga solapando el viewport (medido: 15 % visible, `top 610 < 768` → `isIntersecting:false`). Y la sección CRECE al reproducirse (escritorio 1.051 → 1.501 px; móvil 360 px: 1.043 → 1.554 px). Resultado reproducido: visitante quieto con la sección al 28,5 % visible (rótulo + cabecera de la app asomando por abajo, posición natural al bajar y pararse) → arranca (`r .285`); en el corte 3 (t=3,4 s) entra el bloque de series, la altura pasa a 1.203 px, el ratio cae a .249, Chromium dispara `isIntersecting:false` y la pieza llama a `completar()`: `jven-ya` a los 3.409 ms de 12.600. La coreografía aborta a un cuarto. Banda de posiciones que lo provoca: 263–375 px visibles en escritorio, 261–388 px en móvil (todo lo que entra en «veo el titular y el marco asoma»). El mismo mecanismo también «completa» si el visitante desplaza despacio y deja un 20 % visible. Raíz validada por mutación en una copia del arnés (`threshold:[0,.25]`, sin tocar la pieza): el mismo cruce a .249 llega como `isIntersecting:true` y la escena sigue (`ya:false` a 6,4 s, series presentes); la salida real (`r 0`) sí dispara `isIntersecting:false` → `completar()` (`ya:true`, 0 animaciones, 16/16 `.in`, 2:27, 20). Arreglo mínimo: `{ threshold: [0, .25] }` en la línea 335 (+4 B, cabe en el techo de peso), sin tocar las dos condiciones del callback. Con un solo umbral .25 NO hay forma de detectar la salida real: al pasar de .2 a 0 no cambia el índice y no llega ninguna entrada.

- **Dónde:** escena-entrenos.html, script líneas 330-337 (`io = new IntersectionObserver(...)`, condición `else if (!e.isIntersecting && arrancado) { completar(); }` en la 333, `{ threshold: .25 }` en la 335).
- **Prueba:** Arnés servido por http (el visor file:// bloquea el JS): carpeta <scratch>/mov-web/ con arnes.html (= espaciador 1.500 px + la pieza verbatim + logger que envuelve IntersectionObserver en window.__io y un sondeo de estado cada 100 ms en window.__hitos); `python -m http.server 8789 --bind 127.0.0.1` en esa carpeta; Browser pane a 1024×768 (resize_window), captura inicial para despertar el panel (oculto congela el IO, memoria de la casa); `scrollTo(0, 1500+300-768)`; a los 15 s: `__io` = [{isI:true,r:.285,h:1051},{isI:false,r:.249,h:1203,t:+3,4 s}], `__hitos.find(x=>x.ya).t` = 3409, `hFinal` 1501. Prueba de semántica: `scrollTo(0, 1500+0.15*1051-768)` → entrada inicial `{isI:false, r:.15, top:610}`. Mutación: <scratch>/mov-web/arnes-fix.html (mismo fichero con `{ threshold: [0, .25] }`), mismo scroll → `__io` [{isI:true,.285},{isI:true,.249,h:1203}], `ya:false` a 6.428 ms; `scrollTo(0,0)` → `{isI:false,r:0}` y `ya:true`, `getAnimations().length 0`, inCount 16, rest 2:27, fin 20. Móvil 360×780 a plena vista: h 1.043 → 1.554, ratio .748 → .502 (no cruza), cita a 12.596 ms, `scrollWidth 360 === innerWidth`.

### ⚪ Fuera de esta pieza pero para el main loop: el MOLDE escena-fisio.html (líneas 240-245: `if (e.isIntersecting) arrancar(); else if (arrancado && tempos.length) { completar(); io.unobserve(raiz); }`, umbral .25) tiene exactamente el mismo mecanismo, y el pliego §D.4 manda envolver la Escena 4 integrada con «el mismo IntersectionObserver (umbral .25)». La fisio también crece al reproducirse (bloque + 3 ejercicios + prehab + bandera). Si se arregla aquí con `[0, .25]`, conviene aplicar lo mismo al molde y al arreglo D.4, o la Escena 4 heredará el aborto a medias.

- **Dónde:** escena-fisio.html líneas 240-245; _PLIEGO-ESCENAS-3-Y-5-VIAJE-ASTRAL.md §A.2 y §D.4.
- **Prueba:** Lectura de C:/Users/pablo/dev/jv-fitness/_piezas/escena-fisio/escena-fisio.html líneas 238-246 y del pliego §A.2 / §D.4. No ejecutado sobre la fisio (fuera de mi lente); el comportamiento de Chromium medido en esta pieza es el mismo API.

### ⚪ `scaleX(0)` en el subrayado del RPE 8 (`.jven-sub::after`, `transform:scaleX(0)` → `scaleX(1)` con `--en-casa` 300 ms y 320 ms de retardo). Esquiva el regex del checker (`scale\(\s*0\s*\)` no casa con `scaleX(0)`) y, tomado a la letra, es una escala fuera de 0,95-1,05. Es un trazo que se dibuja de izquierda a derecha (`transform-origin:left`), que es lo que pide el storyboard (corte 5 «subrayado jade») y la forma correcta de hacerlo sin animar `width`; no es un elemento que aparezca de la nada. Decisión de la casa: o se acepta como excepción declarada, o el checker aprende a distinguir `scaleX` de trazo.

- **Dónde:** escena-entrenos.html líneas 70-71 (CSS) y 89 (regla `.jven.jven-ya .jven-sub::after`).
- **Prueba:** grep -n 'scaleX' en la pieza → líneas 70-71; verificar-pieza.js línea 32 (`/scale\(\s*0\s*\)/`) no lo detecta. En navegador tras el toque: `getComputedStyle(sub,'::after').transform` = `matrix(1,0,0,1,0,0)` y `transitionDuration 0s` (la clase `.jven-ya` sí lo cubre porque la regla lo nombra explícitamente en la línea 89).

### ⚪ Dos `@keyframes` en elementos de disparo: `jven-pulso` en el botón «✓ Guardar» al recibir `pick` (líneas 41-42, scale 1→1.04→1, 240 ms) y `jven-golpe` en el badge RPE (66-67, .97→1.04→1, 320 ms). El pliego prohíbe keyframes en «elementos de disparo rápido»; aquí se disparan UNA vez por guion (no son interactivos), `.jven-ya` los anula (`animation:none!important`, medido `animationName none` tras el toque) y el bloque reduced-motion también. Amplitudes dentro del techo del 5 %. Lo señalo por la letra de la norma; funcionalmente no hay solape ni reentrada.

- **Dónde:** escena-entrenos.html líneas 41-42 y 65-67.
- **Prueba:** Líneas 41-42 y 66-67. En navegador tras click a 5.986 ms: `getComputedStyle(.jven-save).animationName` = none, `getComputedStyle(.jven-rpe).animationName` = none, `document.getAnimations().length` = 0.

### ⚪ Transiciones de propiedades que no son transform/opacity: `border-color 260ms` en `.jven-ej` (línea 46), `background/color/border-color 200ms` en `.jven-save` (40) y `background/border-color/color 260ms` en `.jven-rir` (61). Son las mismas recetas del molde (`.jvfi-z` transiciona background/border-color/color) y del pliego B.4 («misma receta que .jvfi-z.pick»), así que es patrón aceptado en la casa, pero contradice la letra de §A.3 «solo transform y opacity se animan». Sin `will-change` en ninguna parte (correcto: nada que retirar).

- **Dónde:** escena-entrenos.html líneas 40, 46, 61.
- **Prueba:** Lectura de las líneas 40, 46, 61 de la pieza y 35 del molde escena-fisio.html.

### ⚪ El bloque `@media (prefers-reduced-motion:reduce)` (líneas 90-93) deja `transition:none!important; opacity:1!important; transform:none!important` en todo: quita el desplazamiento Y TAMBIÉN el fundido. El pliego §A.2 dice las dos cosas a la vez («deja opacity:1; transform:none; transition:none en todo» y «se conserva el fundido, se quita el desplazamiento»): la pieza cumple la regla explícita y hace lo mismo que el molde. Si la casa quiere el «fewer and gentler» de Emil de verdad, habría que dejar la transición de opacity y anular solo transform. En quieto, el JS sí es correcto: 48 relojes caen todos a ≤ 60 ms, cero intervalos (el descanso y el recuento saltan al valor final), sin excepción.

- **Dónde:** escena-entrenos.html líneas 90-93; pliego §A.2 último punto.
- **Prueba:** `node <scratch>/mov-entrenos.js <pieza>` escenario 6 (quieto): «todos los relojes caen a <= 60 ms (max 60)», «quieto@60ms: 0 relojes vivos», estado final completo. CSS leído en líneas 90-93.

### ⚪ «Una tarjeta cada vez» se cumple sólo entre filas de ejercicio: al entrar el bloque de series (3,4 s) las otras 7 filas bajan a .45 (medido `opacity .45` en captura) y vuelven a 1 al Guardar. Pero DENTRO de la tarjeta en foco se acumulan a opacidad 1 el badge+glosario (7,4 s), el consejo (8,4 s) y el descanso (9,6 s), y el reloj de descanso sigue tictaqueando (10,6 / 11,6 / 12,6 s) mientras sube el recuento (11,2→11,9 s, 20 pasos de 35 ms) y entra la cita (12,6 s): a los 11,6 s y 12,6 s hay dos cosas moviéndose a la vez. Lo dicta el propio storyboard (corte 7 «reloj siempre visible», cortes 8-9 solapados por diseño), así que no es defecto de ejecución sino de la partitura; lo dejo escrito por si Pablo lo ve «cargado» al verla.

- **Dónde:** escena-entrenos.html líneas 166-167 (constantes T) y 262-305 (cortes 7-9).
- **Prueba:** Línea de tiempo reconstruida por `mov-entrenos.js` escenario 1 (70 instantes con cambio; tics en 10600/11600/12600; recuento 11200→11900; cita 12600) y capturas del navegador a 6,3 s y 8,4 s.

### ⚪ Peso 22.508 B contra el techo del checker 22×1024 = 22.528 B: 20 bytes de margen. El arreglo de la roja (`[0, .25]`) suma 4 B y cabe; un comentario de una línea explicando el porqué (que Pablo agradecería) ya no. Es de la lente de portabilidad, pero condiciona el arreglo.

- **Dónde:** escena-entrenos.html (fichero entero) y verificar-pieza.js línea 17.
- **Prueba:** `wc -c` = 22508; verificar-pieza.js línea 17 (`bytes <= 22 * 1024`).

