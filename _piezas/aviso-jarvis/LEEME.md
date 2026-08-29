# Aviso de JARVIS

**Qué es:** la tarjeta con la que la app avisa **por su cuenta**. En la app viva esto es la capa
FLEX (`flexPintarTarjeta`, línea ~20249 de `app/jv-fitness-mvp.html`): creatina sin marcar, agua
olvidada, días sin pesarse, racha de entrenos.

Esta pieza es **el rediseño de esa tarjeta**, construida aparte para dos usos y un solo trabajo:

1. es el aviso que sale en la **Escena 1-bis** del viaje astral (encadenada a la Escena 1);
2. es candidata a ser **el aviso real de la app** el día que le toque el rediseño.

Por eso no depende de nada del escaparate: se pega en `jv-fitness-mvp.html` tal cual.

**Los ficheros**

| Fichero | Para qué |
|---|---|
| `aviso-jarvis.html` | La pieza. `<style>` + `<template>` + `jvAvisoMostrar()`. Se copia y se pega entera. |
| `LEEME.md` | Esto. |

---

## Cómo se usa

```js
var mando = jvAvisoMostrar(contenedor, texto, opciones);
```

| Argumento | Qué es |
|---|---|
| `contenedor` | El elemento donde se cuelga la tarjeta. |
| `texto` | El mensaje. Entra con `textContent`: **literal**, sin formatear y sin interpretar HTML. |
| `opciones` | Todas opcionales (tabla de abajo). |

| Opción | Por defecto | Qué hace |
|---|---|---|
| `titulo` | `"Jarvis nota"` | La cabecera. El CSS la pone en mayúsculas. |
| `etiqueta` | `"Avisarme de esto"` | El texto del interruptor. |
| `activo` | `true` | Estado inicial del interruptor. |
| `alCambiar(activo, mando)` | — | Se llama cuando el usuario toca el interruptor. |
| `alCerrar(mando)` | — | Se llama cuando el usuario pulsa la ✕, antes de que se cierre. |

Devuelve un **mando** con tres cosas:

| | Qué hace |
|---|---|
| `mando.el` | El elemento de la tarjeta (para medirlo o para hacerle scroll). |
| `mando.cerrar()` | Se va con transición y se quita sola al terminarla. Es el gesto del usuario. |
| `mando.destruir()` | La quita **ya**. Es el que tiene que llamar quien la monte dentro de algo que puede cortarse a mitad, como una escena. |

Ejemplo de cómo se engancharía en la app (no se ejecuta, es la muestra):

```js
var mando = jvAvisoMostrar(document.getElementById("flex_host"), hit.txt, {
  alCerrar:  function(){ flexMarcarVisto(hit.id); },              // "por hoy no me lo repitas"
  alCambiar: function(on){ guardarPreferenciaDeAviso(hit.id,on); } // "de esto no me avises más"
});
```

---

## Qué cambia respecto a la tarjeta de hoy

El texto **no**. La frase científica es la que suelta la app y se respeta letra a letra. Lo que
cambia es cómo está dibujada:

| Hoy (`.flexcard`) | Aquí (`.jvav`) | Por qué |
|---|---|---|
| Fondo en degradado jade a ember | Panel sobrio con **un rail jade de 2px a la izquierda** | El degradado leía como reclamo. El rail es el mismo gesto que la cita de fuente del Cerebro: es la casa hablando, no un banner. |
| Un brillo que barre la tarjeta al aparecer (`flexsheen`) | Nada | Ese barrido es lenguaje de promoción. Esto acompaña, no vende. |
| El emoji sale **dos veces** (en la cabecera y dentro del mensaje) | Una sola vez, la del mensaje | En la cabecera va un punto jade, no un emoji. |
| Solo un desplegable de «Tono» | Un **interruptor «Avisarme de esto»** | Es lo que pidió Pablo: que se vea que es configurable. El tono es otra cosa y vive en Ajustes. |
| — | La ✕ tiene `aria-label` y el interruptor es un `role="switch"` de verdad | Se puede usar con teclado y con lector de pantalla. |

---

## Las reglas que cumple, con su número

**Peso: 5,99 KB** (6.138 bytes) de un presupuesto de 6 KB. Va justo, y por eso el fichero lleva
solo los comentarios de las trampas medidas: el resto de la explicación vive aquí.

**Cero red, cero imágenes, cero fuentes.** La ✕ es un SVG de dos trazos escrito a mano.

**Cero animaciones infinitas y cero temporizadores.** La pieza no llama a `setTimeout` ni una vez, y
no declara ningún `@keyframes`. Todo su movimiento son dos transiciones de un tiro: entrar y salir.
Consecuencia práctica, y es la que importa: **no puede dejar nada corriendo fuera de pantalla ni
ningún reloj colgado**. No hace falta pararla al salir del viewport porque no hay nada que parar.

**Movimiento reducido.** Con el ajuste del sistema puesto, se apagan las transiciones y la tarjeta
se queda en su pose final, entera y legible. Verificado **forzando la media query de verdad por
CSSOM** (poniendo `mediaText = "all"` en las reglas reales), no leyendo el código: tarjeta, bola del
interruptor, vía y ✕ salen todas con `animation:none` y `transition:none`, opacidad 1 y sin
transform, y en toda la escena quedan **0 animaciones infinitas**.

**Contraste AA**, medido en el navegador sobre los colores computados (no a ojo):

| Elemento | Ratio | Mínimo |
|---|---|---|
| El mensaje | **14,35:1** | 4,5 |
| «JARVIS NOTA» | **9,20:1** | 4,5 |
| Etiqueta del interruptor, encendido | **11,05:1** | 4,5 |
| Etiqueta del interruptor, apagado / la ✕ | **5,12:1** | 4,5 |

**Diana táctil:** el interruptor mide 25 x 148 px y la ✕ 26 x 26 px. Los dos por encima del mínimo
de 24 x 24 (WCAG 2.5.8). El interruptor se quedaba en 21 px de alto y se subió el padding.

**Se anuncia una vez, no letra a letra.** La tarjeta es `role="status"` y el texto se mete de golpe
con `textContent` antes de que nada se anime. No hay escritura carácter a carácter, así que no hay
forma de que un lector de pantalla lo lea a trozos.

---

## Las tres trampas que costaron sangre (para que nadie las repita)

**1. El contraste no se hereda: `--mute-2` no vale.** En `showcase.html` ese token vale `#5E756B`, y
sobre el fondo de esta tarjeta da **3,5:1**, por debajo del AA de 4,5:1. La pieza **no lo hereda**:
fija `#7E968B`, que da 5,1:1. Por el mismo motivo el fondo de la tarjeta también es fijo y propio,
no heredado: así el contraste está garantizado **caiga sobre el fondo que caiga**. Lo único que sí
se hereda es la tipografía.

> ⚠️ De paso, un aviso honesto que **no** es de esta pieza: la Escena 1 usa `--mute-2` para su nota
> al pie y para el sello de la ficha. En el escaparate eso son esos mismos 3,5:1. No se ha tocado
> (no era el encargo), pero está ahí y conviene arreglarlo algún día.

**2. La media query no suma especificidad.** El bloque de movimiento reducido lleva los selectores
**doblados** (`.jvav.jvav`) a propósito. Con `.jvav` a secas pesa (0,1,0) y **pierde** contra
`.jvav.esta-dentro` y `.jvav.se-va`, que pesan (0,2,0), aunque esté dentro de una media query y vaya
después. Es la tercera vez que esta trampa muerde en este proyecto (ya pasó con los anillos y con la
luz del orbe).

**3. Un flex item con `overflow:hidden` se aplasta.** La tarjeta lleva `overflow:hidden`, y eso hace
que su `min-height:auto` valga **0**. Metida en una columna flex de altura fija, el navegador la
encoge sin avisar: medido en Chrome, **24,6 px de los 176 que ocupa**. La cabecera se veía y el
mensaje no.

> El arreglo **no está en la pieza**, está en quien la mete: la Escena 1 lleva
> `.jvce-hilo .jvav{flex:none}`. Se hizo así porque el aprieto lo pone el contenedor, no la tarjeta:
> en flujo normal (que es como la usa la app hoy, dentro de `#flex_host`) no pasa nada.
> **Si la pegas en un sitio con altura fija y la ves cortada, esta es la causa y `flex:none` es el
> arreglo.**

---

## Cómo se pega en la app

Se copia `aviso-jarvis.html` entero. No hay bloques que borrar (a diferencia del orbe, aquí no se
duplica nada que la app ya tenga).

Después, en `flexPintarTarjeta()` se cambia el `innerHTML` a mano por la llamada a `jvAvisoMostrar`
con los dos enganches del ejemplo de arriba. **Ojo:** la app está congelada por orden de Pablo hasta
que él la revise, así que esto **no se ha hecho** y no se hace sin su visto bueno.

Dos cosas a decidir cuando llegue ese día, y las decide él, no el código:

- **Dónde vive el «no me avises de esto».** Hoy no existe: la app solo tiene la ✕ («por hoy no») y
  el desplegable de tono. El interruptor de la pieza necesita un sitio donde guardarse (un
  `localStorage` tipo `jvf_flex_off` con los ids apagados) y un reflejo en Ajustes.
- **Si la ✕ se queda.** Con un interruptor de «avisarme», tener además una ✕ de «hoy no» puede
  sobrar. Se han dejado las dos porque la app hoy tiene la ✕ y quitarla sería decidir por él.

---

## Lo que NO está verificado

- **Cómo se ve en su móvil de verdad.** Se ha medido con el viewport a 375 x 812 en Chrome: la
  tarjeta entra entera, no desborda en horizontal y las dianas cumplen. Pero eso es un navegador
  emulando un móvil, no un móvil.
- **Lectores de pantalla reales.** El marcado es correcto (`role="status"`, `role="switch"` con
  `aria-checked`, `aria-label` en la ✕) y se ha comprobado en el DOM, pero no se ha probado con NVDA
  ni con VoiceOver.
- **La pieza dentro de la app.** No se ha pegado (la app está congelada). Lo único que se ha
  verificado es que no depende de nada del escaparate.
