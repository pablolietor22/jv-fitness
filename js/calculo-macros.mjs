// PRIMER MÓDULO ES DEL PROYECTO — Paso 5 de la hoja de ruta.
//
// Este fichero NO está enganchado todavía a la app: es el andamiaje que demuestra que la
// tubería completa funciona (módulo → test → prueba por mutación → gate). La primera
// extracción REAL de una función del HTML se hace siguiendo
// `_diseno/PROCEDIMIENTO-EXTRACCION-MODULOS.md`, una zona por tanda.
//
// Extensión .mjs a propósito: es un módulo ES sin tener que poner "type": "module" en
// package.json, que rompería las ~120 suites de _tests/ (verificado el 29-08-2026).

/**
 * Reparte unas calorías objetivo en gramos de proteína, grasa e hidratos.
 *
 * El reparto sigue el criterio que ya usa la app: la proteína se fija por peso corporal,
 * la grasa por porcentaje de las calorías, y los hidratos se llevan lo que sobra.
 *
 * @param {number} kcal   calorías objetivo del día
 * @param {number} pesoKg peso corporal en kilos
 * @param {number} [gProteinaPorKg=1.8] gramos de proteína por kilo
 * @param {number} [pctGrasa=0.25] parte de las calorías que va a grasa (0-1)
 * @returns {{proteina:number, grasa:number, hidratos:number}} gramos de cada macro
 */
export function repartirMacros(kcal, pesoKg, gProteinaPorKg = 1.8, pctGrasa = 0.25) {
  if (!Number.isFinite(kcal) || !Number.isFinite(pesoKg)) return { proteina: 0, grasa: 0, hidratos: 0 };
  if (kcal <= 0 || pesoKg <= 0) return { proteina: 0, grasa: 0, hidratos: 0 };
  if (!(pctGrasa >= 0 && pctGrasa < 1)) return { proteina: 0, grasa: 0, hidratos: 0 };

  const proteina = Math.round(pesoKg * gProteinaPorKg);
  const grasa = Math.round((kcal * pctGrasa) / 9);          // 9 kcal por gramo de grasa
  const kcalRestantes = kcal - proteina * 4 - grasa * 9;    // 4 kcal por gramo de proteína
  const hidratos = Math.max(0, Math.round(kcalRestantes / 4));

  return { proteina, grasa, hidratos };
}
