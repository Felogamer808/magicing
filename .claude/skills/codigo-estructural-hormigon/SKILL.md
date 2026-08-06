---
name: codigo-estructural-hormigon
description: Texto completo del Anejo 19 del Código Estructural español (BOE-A-2021-13681) — proyecto de estructuras de hormigón, equivalente al Eurocódigo 2. Usar SIEMPRE que se trabaje en hormigón armado o pretensado: flexión, cortante, punzonamiento, torsión, bielas y tirantes, anclajes y solapes, fisuración, deformaciones, pandeo, fluencia y retracción, durabilidad y recubrimientos, detalles de armado, prefabricados, hormigón en masa. También al verificar una fórmula, buscar un coeficiente, citar un apartado normativo, o resolver ejercicios y exámenes de hormigón estructural. Contiene 417 ecuaciones en LaTeX y 613 figuras con referencia de página.
---

# Código Estructural — Anejo 19 (estructuras de hormigón)

Norma española vigente (RD 470/2021, BOE-A-2021-13681). Sustituye a la EHE-08 y
traspone el Eurocódigo 2, por lo que el articulado y la numeración de fórmulas
coinciden en gran medida con UNE-EN 1992-1-1.

## Cómo usar esta skill

**No leas este directorio entero.** Son 207 páginas. Identificá el tema en la
tabla de abajo, leé *sólo* ese archivo de `reference/` y citá con página.

Formato de cita: `Anejo 19, art. 6.4.4 (3), ec. (6.47), pág. 93`. Los archivos
traen marcadores `<!-- pag N -->` que corresponden a la **página del PDF
original**, y las ecuaciones conservan su numeración oficial vía `\tag{6.47}`.

## Índice

| Archivo en `reference/` | Contenido | Págs | Ecs |
|---|---|---|---|
| `01-generalidades.md` | Alcance, definiciones, **notación completa** | 11-16 | 1 |
| `02-bases-de-calculo.md` | Estados límite, coeficientes parciales γ, combinaciones | 17-22 | 0 |
| `03-materiales.md` | Hormigón (f_ck, E_cm, fluencia, retracción), acero pasivo y activo, dispositivos de pretensado | 23-38 | 34 |
| `04-durabilidad-y-recubrimiento-de-las-armaduras.md` | Clases de exposición, recubrimiento nominal c_nom | 39-44 | 1 |
| `05-analisis-estructural.md` | Imperfecciones, análisis lineal/plástico/no lineal, **2.º orden y pandeo**, inestabilidad lateral | 45-73 | 82 |
| `06-estados-limite-ultimos-elu.md` | **Flexión, cortante, torsión, punzonamiento, bielas y tirantes, anclajes y solapes, zonas parcialmente cargadas, fatiga** | 74-107 | 121 |
| `07-estados-limite-de-servicio-els.md` | Limitación de tensiones, **fisuración w_k**, deformaciones/flechas | 108-121 | 30 |
| `08-detalles-de-armado-para-armaduras-pasivas-y-acti.md` | Separaciones, mandriles, anclaje, solapes, grupos de barras | 122-139 | 31 |
| `09-detalles-de-armado-de-elementos-y-reglas-particu.md` | Reglas por elemento: vigas, losas macizas y planas, pilares, muros, vigas de gran canto, cimentaciones, regiones D | 140-158 | 27 |
| `10-reglas-adicionales-para-elementos-y-estructuras.md` | Prefabricados | 159-171 | 9 |
| `11-estructuras-de-hormigon-con-aridos-ligeros.md` | Hormigón ligero (todo el articulado adaptado) | 172-177 | 19 |
| `12-estructuras-de-hormigon-en-masa-y-ligeramente-ar.md` | Hormigón en masa y ligeramente armado | 178-184 | 16 |

### Apéndices

| Archivo | Contenido | Págs |
|---|---|---|
| `ap-a-recomendaciones-para-la-modificacion-de-los-coef.md` | γ_c y γ_s reducidos según control de ejecución | 185-186 |
| `ap-b-metodos-recomendados-para-estimar-la-deformacion.md` | **Fluencia y retracción — formulación detallada** | 187-189 |
| `ap-c-propiedades-del-acero-para-armaduras-pasivas-ade.md` | Remite a los Artículos 34 y 35 del Código (1 frase) | 190 |
| `ap-d-propuesta-de-metodo-de-calculo-detallado-de-las.md` | **Pérdidas por relajación del pretensado** | 191 |
| `ap-e-clases-resistentes-indicativas-para-la-durabilid.md` | Clases resistentes mínimas por exposición | 192-193 |
| `ap-f-expresiones-recomendadas-para-la-armadura-de-tra.md` | Armadura de tracción en estados planos | 194-195 |
| `ap-g-recomendaciones-para-la-consideracion-de-la-inte.md` | Interacción suelo-estructura | 196-197 |
| `ap-h-propuesta-para-la-consideracion-de-los-efectos-g.md` | Efectos globales de 2.º orden | 198-200 |
| `ap-i-recomendaciones-para-el-analisis-de-losas-planas.md` | **Análisis de losas planas y pantallas** | 201-203 |
| `ap-j-ejemplos-de-definicion-de-los-detalles-de-proyec.md` | Ejemplos de detalles de armado (10 figuras) | 204-207 |

## Mapa rápido: tema → archivo

| Si preguntan por… | Abrir |
|---|---|
| Punzonamiento, perímetro crítico, v_Ed, v_Rd,c | `06` §6.4 |
| Cortante, celosía, θ, V_Rd,s / V_Rd,max | `06` §6.2 |
| Flexión, dominios, diagrama parábola-rectángulo | `06` §6.1 (bloque de tensiones: `03` §3.1.7) |
| Torsión | `06` §6.3 |
| Bielas y tirantes, regiones D, nudos | `06` §6.5 + `09` §9.9 |
| Longitud de anclaje l_bd, solapes l_0 | `08` §8.4-8.7 |
| Fisuración, w_max, s_r,max | `07` §7.3 |
| Flechas, L/d | `07` §7.4 |
| Pandeo, esbeltez λ, método de la curvatura nominal | `05` §5.8 (+ `ap-h` global) |
| Fluencia φ(t,t₀) y retracción ε_cs | `03` §3.1.4 → detalle en `ap-b` |
| Pérdidas de pretensado | `03` §3.3 + `ap-d` (relajación) |
| Recubrimiento c_nom, clase de exposición | `04` (+ `ap-e`) |
| Cuantías mínimas y máximas por elemento | `09` |
| Armado de zapatas y encepados | `09` §9.8 |
| Losas planas, ábacos, capiteles | `09` §9.4 + `ap-i` |
| Símbolo o subíndice que no reconocés | `01` §1.6 (notación) |

## Figuras

Están en `reference/images/` (613 archivos), referenciadas desde cada capítulo
como `![](images/<hash>.jpg)`. Para mostrarle una figura al usuario, leé la
imagen con el path relativo al capítulo.

## Advertencias

- **Texto obtenido por OCR** (MinerU sobre el PDF del BOE). El cuerpo y las
  ecuaciones se verificaron correctos en muestreo, pero ante un cálculo que se
  vaya a construir, contrastá el valor contra el PDF original:
  `Desktop/HE3/HE3_2026_Estudio/Material adicional-20260516/BOE-A-2021-13681-ANEXO_19_ESTRUCTURAS_DE_HORMIGON.pdf`
- Algunas variables sueltas quedaron como ecuación en bloque (`$$u_i$$` en vez
  de inline). Es cosmético, no altera el contenido.
- 5 de las 40 tablas no se parsearon a HTML y quedaron como imagen; el archivo
  igual las referencia.
- Este anejo remite en varios puntos al articulado principal del Código
  Estructural (Artículos 1-100), que **no** está incluido acá.

## Errores conocidos

Modos de falla ya vistos usando esta skill. Leer antes de dar un resultado.
El review de fin de sesión escribe acá: bullet nuevo con fecha absoluta, sin
tocar el resto del archivo.

- **2026-08-02 — Aplicar la fórmula general sin leer el artículo del elemento.**
  Cuando el elemento tiene artículo propio (ménsula corta, viga-pared, zapata,
  nudo, pretensado), ahí viven topes y excepciones que no se deducen de la regla
  general y que se olvidan. Precedente: en ménsulas cortas f_yd está topado, así
  que f_yk/γ_s no vale directo y toda la armadura cambia. **Leé el apartado del
  elemento antes de la fórmula general, y citá de dónde sale el tope.**
- **2026-08-02 — Citar un número de apartado sin decir de qué cuerpo salió.**
  El Código Estructural y el EC2 (UNE-EN 1992-1-1) son el mismo cuerpo normativo
  pero **la numeración no coincide**. Al citar, decí explícitamente si el número
  es del Anejo 19 o del EC2; si no, el apartado no se puede volver a encontrar.
