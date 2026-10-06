---
name: cte-db-se-c
description: CTE Documento Básico SE-C (Cimientos), norma española de geotecnia para edificación. Usar para lo que el Anejo 19 no trae - presión admisible y hundimiento, deslizamiento, vuelco, rozamiento terreno-cimiento, coeficientes parciales geotécnicos (tabla 2.1), asientos, pilotes, muros y pantallas desde el lado del terreno.
---

# CTE DB SE-C — Cimientos

Documento Básico de Seguridad Estructural – Cimientos del Código Técnico de la
Edificación (España). PDF oficial:
https://www.codigotecnico.org/pdf/Documentos/SE/DBSE-C.pdf (165 págs.).

## Relación con el Anejo 19

El Anejo 19 del Código Estructural resuelve la **pieza de hormigón** (flexión,
cortante, punzonamiento, armado). El DB SE-C resuelve el **terreno**:
hundimiento, deslizamiento, vuelco, asientos. Son dominios distintos de un mismo
sistema normativo español, así que usar los dos en una zapata **no es mezclar
normas**. Lo que sí es mezclar: tomar coeficientes del EC7 para el terreno en un
módulo que declare el DB SE-C, o al revés. `muros-contencion` hoy cita el EC7.

Ojo: el DB SE-C remite a la "instrucción EHE" para lo estructural; esa remisión
hoy se entiende hecha al Código Estructural.

## Cómo usar esta skill

No leer todo. Ubicar el tema, abrir sólo ese archivo de `reference/` y citar
apartado y página: `DB SE-C, art. 4.2.3.1 (4), pág. 34`. Los marcadores
`<!-- pag N -->` son la **página del PDF** (no el folio "SE-C-n" impreso).

| Archivo | Contenido | Págs PDF |
|---|---|---|
| `01-generalidades.md` | Ámbito | 5 |
| `02-bases-de-calculo.md` | Situaciones, **tabla 2.1 coeficientes parciales γR, γM, γE, γF** | 6-15 |
| `03-estudio-geotecnico.md` | Reconocimiento, ensayos | 16-23 |
| `04-cimentaciones-directas.md` | Zapatas y losas: hundimiento, **deslizamiento (4.2.2.1.2, 4.2.3.1)**, vuelco, asientos, presión admisible, medianería | 24-46 |
| `05-cimentaciones-profundas.md` | Pilotes, encepados, rozamiento negativo | 47-63 |
| `06-elementos-de-contencion.md` | Muros, pantallas, empujes | 64-97 |
| `07`-`09` | Acondicionamiento, mejora del terreno, anclajes | 98-107 |
| `an-a`..`an-g` | Terminología, notación, prospección, **valores orientativos (D)**, interacción suelo-estructura (E), **modelos de cálculo (F)**, normas | 108-165 |

## Mapa rápido

| Tema | Dónde |
|---|---|
| Coeficiente de seguridad a deslizamiento: γR = 1,5 (persistente), 1,1 (extraordinaria), con γE = γF = 1 | `02`, tabla 2.1, pág. 12 |
| Rozamiento terreno-cimiento: a' = 0, δ' = 3/4·φ' (efectivas); a' = cu, δ' = 0 (sin drenaje) | `04`, art. 4.2.3.1 (4), pág. 34 |
| Zapatas de medianería, vigas centradoras, tirantes, forjados | `04`, art. 4.1.1 (3) y (6), pág. 25 |
| Área equivalente con tirantes o vigas centradoras: dimensiones reales | `04`, art. 4.3.1.3 (6), pág. 36 |

## Advertencias

- **Se perdieron las letras griegas** al extraer el texto (fuente Symbol):
  "’ = 3/4'" es δ' = 3/4·φ'. Ante una fórmula con símbolos raros, contrastar
  contra el PDF oficial antes de usarla.
- Las figuras no se extrajeron.
