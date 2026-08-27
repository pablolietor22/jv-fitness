# Orbe JARVIS v3

**Qué es:** el orbe del Cerebro de JV Fitness (la esfera verde jade, clase `.cb-orb`), con dos
capas nuevas que **solo aparecen cuando está pensando**.

En reposo es el de la app. Mismo degradado, mismas sombras, misma respiración. No se ha tocado ni
un valor: el CSS está copiado literalmente de `app/jv-fitness-mvp.html`, líneas 407 a 421.

**Los ficheros**

| Fichero | Para qué |
|---|---|
| `orbe.html` | El banco de pruebas. Ábrelo con doble clic. |
| `orbe-pieza.html` | La pieza sola, comentada, lista para copiar y pegar. |
| `LEEME.md` | Esto. |
| `_otra-sesion-2317/` | Copia de seguridad de lo que había en la carpeta antes (ver el aviso del final). |

---

## Los tres estados

**1. Reposo.** El orbe de la app y nada más. Cero resplandor, cero anillos. Sus tres animaciones de
siempre siguen corriendo (respiración, núcleo y reflejo).

**2. Pensando.** Nacen las dos capas:

- **El resplandor.** Un halo de luz que respira alrededor del orbe. Va **encima** del orbe y en modo
  `screen`, que es luz aditiva: no tapa, enciende. Es la capa que da el gusto.
- **Los anillos.** Tres anillos finos que nacen en el borde del orbe y se van hacia fuera. Van
  **detrás** del orbe, así que no pueden taparlo nunca. Son el acento, no el protagonista.

**3. Respondido.** Las dos capas se retiran en 760 ms y se quedan congeladas donde estaban mientras
se desvanecen. No hay tirón ni vuelta brusca al principio de la animación.

---

## Cómo se dispara desde JavaScript

Solo hay dos funciones. No hay más.

```js
// 1. crear un orbe (clona el molde del <template>)
var orbe = jvOrbeCrear("lg");   // "lg" = 132 px  ·  "sm" = 26 px
document.getElementById("cb_hero").prepend(orbe);

// 2. cambiarle el estado
jvOrbeEstado(orbe, "pensando");     // justo antes de resolver la pregunta
jvOrbeEstado(orbe, "respondido");   // en cuanto pintas la respuesta
```

Por dentro, `jvOrbeEstado` no hace magia: pone o quita la clase `jv-orbe--pensando` en el
envoltorio. Todo lo demás lo hace el CSS.

**Un aviso de producto, no de código.** El Cerebro es determinista y responde en milisegundos. Si
lo pones a pensar y a responder seguido, la capa entra y sale en el mismo suspiro y no se ve nada.
Déjalo pensando un mínimo de unos 600 ms. El contraste entre quieto y activo es lo único que hace
que se note que está pensando.

---

## Cómo se pega

**En el escaparate:** copia `orbe-pieza.html` entero.

**En la app (`app/jv-fitness-mvp.html`):** copia `orbe-pieza.html` **borrando el BLOQUE A** del
`<style>`. Ese bloque es el `.cb-orb` de la app y allí ya existe (línea 407); duplicarlo no aporta
nada.

El molde va dentro de un `<template>`. Un `<template>` es un molde que el navegador no pinta: el
orbe solo existe donde tú lo clones. Por eso al pegar la pieza no aparece ningún orbe fantasma
suelto, que es lo que pasó en la v1.

---

## Los números

Todo esto está **medido en el navegador**, no calculado de cabeza.

### La herencia: de dónde sale cada cosa

| Capa | Periodo | Opacidad | Escala | Origen |
|---|---|---|---|---|
| Respiración del orbe | 6 s | (no cambia) | 1 a 1,055 (**5,5 %**) | La app, sin tocar |
| Resplandor A (jade) | 5,3 s | ,22 a ,37 | 1 a 1,015 (**1,5 %**) | Gargantua, `latido-horizonte-a` |
| Resplandor B (ember) | 7,9 s | ,16 a ,29 | 1 a 1,012 (**1,2 %**) | Gargantua, `latido-horizonte-b` |
| Anillos | 4,2 s, uno cada 1,4 s | 0 a ,42 a 0 | 1 a 2,35 | **Capa propia, nueva** |

Los retardos son **-2,65 s** y **-3,95 s**: medio periodo en negativo. Eso hace que cada capa
arranque en su valor medio en vez de en un extremo, así que al aparecer no da un salto. Los
periodos no son múltiplos entre sí (7,9 / 5,3 = 1,49), por eso respira en vez de marcar el compás
como un metrónomo.

### Corrección de un hecho, para que nadie repita la falsedad

**Gargantua NO tiene anillos que se expanden.** Verificado barriendo todos los `@keyframes` del
showcase: `acercamiento`, `blip`, `deriva-nave`, `latido-horizonte-a`, `latido-horizonte-b`,
`latido-nave` y los `metodo-*`. Ninguno es un anillo.

Así que, con precisión: **el resplandor** copia la gramática de Gargantua (sus tiempos y sus
opacidades, calcados). **Los anillos** son una capa propia que pediste tú. No se vende como copiado
lo que no lo es.

Y una segunda precisión: del resplandor se copia el **pulso**, no la **forma**. En Gargantua la luz
enciende un disco de acrecion (una elipse achatada); aquí enciende una esfera, así que el degradado
es un anillo centrado en el orbe.

### Geometría (medida en el navegador)

| Qué | Medida |
|---|---|
| Orbe grande | 132 px (el envoltorio mide exactamente lo mismo) |
| Lienzo de las capas | 343 px, o sea **2,600 veces el orbe** (`inset:-80%`) |
| Orbe pequeño | 26 px, lienzo 68 px (la misma proporción) |
| Resplandor jade, radio visible | hasta 134 px (268 px de diámetro) |
| Resplandor ember, radio visible | hasta 141 px (281 px de diámetro) |
| Anillo más grande | **310 px de diámetro** |
| Desborde horizontal de la página | ninguno |

Las capas van en `position:absolute`, así que ese lienzo de 343 px **no empuja nada del layout**.

### El reparto: por qué el resplandor manda y los anillos acompañan

Este es el punto donde falló la v2, así que va con números.

| Capa | Alfa efectivo (teórico) | Alfa efectivo (medido en vivo) | Sobre cuánta superficie |
|---|---|---|---|
| Resplandor jade | 0,229 | 0,2071 | una banda de unos 96 px de ancho |
| Resplandor ember | 0,075 | 0,0531 | una banda de unos 86 px |
| Anillo | 0,231 | 0,1781 | **1 px de línea** |

El anillo y el resplandor tienen un alfa parecido, pero el resplandor lo reparte sobre casi cien
veces más superficie. Por eso manda él y el anillo es un acento.

Y hay un segundo reparto, el geométrico, para que no se peleen por los mismos píxeles: el orbe
ocupa del 0 % al 38,5 % del lienzo, el resplandor vive del 22 % al 78 %, y los anillos viajan del
38,5 % al 90 %. El resplandor manda cerca, los anillos acompañan lejos.

Referencia de lo que se estaba evitando: en la v2 el anillo superviviente medía 7,3 px con un alfa
efectivo de **0,028**. El resplandor de ahora está en 0,207, unas **7 veces más**, y además va
encima y en modo `screen` en vez de enterrado debajo del orbe.

### Movimiento reducido (verificado)

Con el ajuste del sistema activado, la pieza pide **cero fotogramas**: `animation:none` en todo, más
una pose fija escrita a mano. Medido:

- Orbe congelado a mitad de respiración: `scale(1,0275)`.
- Resplandor encendido en su valor medio: opacidad 0,295 y 0,225.
- Tres anillos quietos a 187 px, 243 px y 285 px, con opacidades 0,40, 0,26 y 0,12.

O sea: quieto, pero sigue leyéndose que está pensando. No se apaga la información, se apaga el
movimiento.

---

## Lo que hay que vigilar (avisos honestos)

**1. La respiración del orbe es del 5,5 %, más del doble del techo.** El guion fija un techo del 2 al
3 % para lo nuevo. `cbbreath` llega a `scale(1.055)`, o sea 5,5 %. Para una bola grande y sola puede
estar bien, pero ahora se le suman dos capas.

Los números de lo que se suma, para que decidas con datos: el resplandor mueve un 1,5 % de escala, y
tanto el resplandor como los anillos viven **fuera** de la cara del orbe. En el sitio donde está el
orbe el movimiento sigue siendo el 5,5 % de siempre: **no se acumula**. Aun así, míralo tú en el
banco. **El orbe de la app NO se ha tocado.** Si al verlo te marea, se cambia, pero se cambia allí y
con tu permiso, no aquí por la puerta de atrás.

**2. El orbe no se acelera al pensar, y es a propósito.** Se pensó en acortarle la respiración de 6 s
a 4,6 s cuando piensa. Se descartó con motivo: cambiarle la duración a una animación que ya está en
marcha produce un **salto visible**, porque el navegador recalcula el progreso sobre la duración
nueva. Como pediste que no hubiera tirones, toda la intensificación vive en la luz.

**3. El anillo más grande mide 310 px y la tarjeta del Cerebro recorta.** `#cerebro.cb-card` lleva
`overflow:hidden` (línea 388 de la app). **Esto no lo he medido**: no sé el ancho interior real de
esa tarjeta en tu móvil. Si al pegarlo ves que el anillo se corta en recto contra el borde, el
mando está en una sola línea: baja el `scale(2.35)` del `@keyframes jvorbe-onda` a `scale(2)` y el
anillo pasa a 264 px.

**4. La app machaca las animaciones con movimiento reducido.** En su línea 457 hay una regla global
`*{animation-duration:.001ms!important}`. Por eso la pieza **no** usa el truco de Gargantua (pausar
con retardo negativo): con esa duración impuesta, un retardo negativo cae en un punto impredecible y
la pose saldría al azar. Se usa `animation:none` con valores fijos, que es inmune.

**5. Un bug que solo se veía mirando.** La primera versión de la pieza tenía el envoltorio en
`display:inline-block` y medía **0 x 0 píxeles**. Motivo: `.cb-orb` es un `<span>`, y un `<span>` es
inline, o sea que se salta `width` y `height`. En la app funciona porque vive dentro de contenedores
flex (`.cb-hero` y `.cb-headorb`). Arreglado con `inline-flex`. Lo cuento porque es la misma lección
de la v2: **cuando algo es visual, se mira, no se deduce del código.**

---

## Qué se ha verificado y qué es decisión de diseño

**Verificado de verdad** (abriendo el banco en Chrome y leyendo el DOM):

- El envoltorio mide 132 px y el lienzo 343 px, ratio 2,600 exacto.
- El orden de pintado es el que se quería: anillos en z-index 1, orbe en 2, resplandor en 3 con
  `mix-blend-mode:screen`.
- Las 8 animaciones existen y corren.
- Los cuatro cuadros de la prueba de aislamiento se ven distintos entre sí. "Solo resplandor" **no**
  parece un orbe pelado.
- Con movimiento reducido, todo a `animation:none` y la pose fija es legible.
- Cero peticiones de red en el fichero: funciona con doble clic.
- La página no desborda en horizontal.

**Decisión de diseño, no medida** (o sea, discutible y tuya):

- Que los anillos sean tres y no dos.
- Los alfas concretos del degradado. Se ajustaron **mirando**: la primera pasada dejaba un halo
  pardo que leía como niebla, con el ember comiéndose al jade. Se subió el jade y se apretó el
  ember para que mande el verde, que es el color del orbe (y es el reparto que ya tiene su propia
  sombra: jade ,30 contra ember ,22).
- El mínimo de 600 ms pensando.

**No medido, declarado como pendiente:**

- El ancho interior real de la tarjeta del Cerebro en tu móvil (ver aviso 3).
- Cómo se ve en tu pantalla. Eso lo juzgas tú: para eso está el banco con los dos estados uno al
  lado del otro.

---

## Aviso de carpeta compartida

Mientras se construía esto, **otra sesión estaba escribiendo en la misma carpeta** (dejó un
`orbe-pieza.html` a las 23:15 y un `orbe.html` a las 23:17, más un `.BAK-prearreglos`). No se ha
borrado nada suyo: está todo en `_otra-sesion-2317/`, y su copia previa sigue en
`orbe-pieza.html.BAK-prearreglos`. Si al abrir los ficheros ves algo que no cuadra con este LEEME,
mira la fecha: puede que la otra sesión haya vuelto a escribir encima.
