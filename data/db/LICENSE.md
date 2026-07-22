# Licencia de la base de alimentos (subconjunto España)

Los ficheros de datos de esta carpeta (`es-NN.jsonl.gz` + `manifest.json`) son un
**subconjunto derivado de [Open Food Facts](https://openfoodfacts.org)**, filtrado a
productos de España con nutrición completa y saneado para JV Fitness.

## Atribución

> Datos de productos: **Open Food Facts** — https://openfoodfacts.org

## Licencia

Open Food Facts publica sus datos bajo una licencia doble, que este subconjunto respeta y hereda:

- **Base de datos** (estructura y selección de registros): **Open Database License (ODbL) v1.0**
  — https://opendatacommons.org/licenses/odbl/1-0/
- **Contenidos individuales** (los valores de cada ficha): **Database Contents License (DbCL) v1.0**
  — https://opendatacommons.org/licenses/dbcl/1-0/

Al redistribuir este subconjunto se cumplen las obligaciones de la ODbL:

1. **Atribución** a Open Food Facts (visible en la app, en Ajustes → 🗄️ Alimentos y en el
   escáner, y aquí).
2. **Share-alike**: este subconjunto queda disponible públicamente bajo ODbL/DbCL (estos mismos
   ficheros publicados) junto con el script que lo genera (ver abajo).

## Cómo se generó este subconjunto (reproducibilidad)

Generado con el pipeline `scripts/food-pipeline/` del repositorio de JV Fitness, sin intervención
manual sobre los datos:

1. `off_dump_es.js` — descarga en streaming el dump completo de Open Food Facts
   (`https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz`, ODbL),
   filtra país `en:spain` + nutrición presente + rangos físicos, y emite un JSONL slim.
2. `chunk_db.js` — dedupe por nombre + orden alfabético español + troceo en chunks gzip de 25.000
   registros con `manifest.json`.
3. `_ingest/sanea_base_es.py --db <db>` — saneo de sodio imposible (R1/R2/R3) y cafeína orientativa.

Dump de origen usado en esta generación: export nocturno de Open Food Facts con
`Last-Modified: 2026-07-22`.
