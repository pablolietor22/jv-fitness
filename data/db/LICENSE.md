# Licencia de las bases de alimentos (subconjuntos España y mundial)

> **Copia canónica.** Este fichero vive en el repo (`scripts/food-pipeline/LICENSE-data-db.md`) y
> se copia como `data/db/LICENSE.md` en CADA despliegue de datos. Cubre **todos** los ficheros de
> datos de esa carpeta; si algún día se añade otra base, hay que ampliar este fichero ANTES de
> desplegarla (hallazgo adversarial 25-07-2026: la base mundial estuvo a punto de salir sin
> licencia que la amparase).

Los ficheros de datos de la carpeta `data/db/` son **subconjuntos derivados de
[Open Food Facts](https://openfoodfacts.org)**, saneados para JV Fitness:

- **Base España** (`es-NN.jsonl.gz` + `manifest.json`): filtrada a productos de España con
  nutrición completa.
- **Base mundial** (`world-NN.jsonl.gz` + `world-manifest.json`): productos de cualquier país con
  nutrición completa y al menos 3 escaneos reales (`unique_scans_n >= 3`), pensada como red de
  seguridad opcional del escáner fuera de España.

## Atribución

> Datos de productos: **Open Food Facts** — https://openfoodfacts.org

## Licencia

Open Food Facts publica sus datos bajo una licencia doble, que estos subconjuntos respetan y heredan:

- **Base de datos** (estructura y selección de registros): **Open Database License (ODbL) v1.0**
  — https://opendatacommons.org/licenses/odbl/1-0/
- **Contenidos individuales** (los valores de cada ficha): **Database Contents License (DbCL) v1.0**
  — https://opendatacommons.org/licenses/dbcl/1-0/

Al redistribuir estos subconjuntos se cumplen las obligaciones de la ODbL:

1. **Atribución** a Open Food Facts (visible en la app, en Ajustes → 🗄️ Alimentos y en el
   escáner, y aquí).
2. **Share-alike**: los subconjuntos quedan disponibles públicamente bajo ODbL/DbCL (estos mismos
   ficheros publicados) junto con los scripts que los generan (ver abajo).

## Cómo se generaron estos subconjuntos (reproducibilidad)

Generados con el pipeline `scripts/food-pipeline/` del repositorio de JV Fitness, sin intervención
manual sobre los datos.

### Base España (`es-NN.jsonl.gz`)

1. `off_dump_es.js` — descarga en streaming el dump completo de Open Food Facts
   (`https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz`, ODbL),
   filtra país `en:spain` + nutrición presente + rangos físicos, y emite un JSONL slim.
2. `chunk_db.js` — dedupe por EAN (código de barras; los productos sin EAN se dedupan por
   nombre) + orden alfabético español + troceo en chunks gzip de 25.000 registros con
   `manifest.json`.
3. `_ingest/sanea_base_es.py --db <db>` — saneo de sodio imposible (R1/R2/R3) y cafeína orientativa.

Dump de origen usado en la generación desplegada: export nocturno de Open Food Facts con
`Last-Modified: 2026-07-22`.

### Base mundial (`world-NN.jsonl.gz`)

1. `off_dump_world.js` — mismo dump nocturno, SIN filtro de país; conserva solo productos con
   nutrición completa, rangos físicos y `unique_scans_n >= 3` (lo que la gente escanea de verdad).
2. `chunk_db.js --prefijo world- --manifest world-manifest.json` — mismo dedupe por EAN y troceo;
   solo cambian los nombres de los artefactos.
3. `sanea_base_world.py --db <db>` — **saneo PARCIAL y declarado**: aplica únicamente las reglas
   independientes del idioma (R1 sodio > techo físico de la sal pura → anulado; sales reales
   capadas al techo; rangos físicos verificados; reparación de emojis partidos). Las reglas R2/R3
   y la cafeína curada NO se aplican (sus regexes están escritas en español e infra-disparan en
   nombres extranjeros); el script las mide y las reporta. Detalle completo en la cabecera del
   propio script.

Dump de origen usado en la generación desplegada: export nocturno de Open Food Facts con
`Last-Modified: 2026-07-24`.
