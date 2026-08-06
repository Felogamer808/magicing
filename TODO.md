# Pendientes

Estado al último commit. Lo terminado no se lista: está en `git log` y en el
`README.md`.

## En curso

### Croquis por tarjeta de datos
Cada tarjeta del formulario lleva un croquis que rotula los mismos símbolos que
sus campos. Hecho en **vigas — flexión y cortante** (materiales, geometría,
armadura positiva y negativa, ramas del estribo), que es la implementación de
referencia en `components/verificaciones/croquis/`.

Faltan 13 páginas, en este orden de prioridad por cuánto se presta a confusión
cada parámetro:

1. **Muro de contención** — `L1` y `L2` de los casos apuntalados son hoy opacos:
   hay que dibujar dónde apoya el contrapiso y dónde la losa superior.
2. **Losas** — que se vea que la armadura en X va por dentro, apoyada sobre la de
   Y, y que por eso tienen distinto canto útil.
3. **Cabezal de pilotes** — separación entre pilotes, ancho del pilar, armaduras
   secundaria y de reparto.
4. Zapatas (medianería, corrida, combinada), pilotes, uniones, sección mixta,
   viento, fisuración.

## Funcionalidad pendiente

- **Varios casos guardados por verificación.** Hoy hay un solo juego de valores
  por verificación: no se puede tener "Viga V1" y "Viga V2" y alternar. Es lo más
  valioso que falta para usar la herramienta en un proyecto real.
- **Errores de validación que nombren el campo.** Cuando un dato es inválido los
  resultados desaparecen con un aviso genérico, sin decir cuál falta.
- **Encabezado en la impresión** con obra y fecha. Hoy el PDF sale por el diálogo
  del navegador, que agrega fecha y URL pero no datos de la obra.

## Deuda técnica

Pendiente, aprobado pero todavía sin hacer:

- **Bloque de validación repetido en las 16 páginas.** Cada `useMemo` de cálculo
  arranca convirtiendo todos sus campos con `aNumero()` y descartando el
  resultado si alguno no es finito o no es positivo (357 llamadas en total). Es
  lo que más pesa hoy al leer una página, y encaja con el pendiente de
  "errores de validación que nombren el campo": un helper que sepa qué campo
  falló resuelve las dos cosas de una vez.

Ya resuelto (queda anotado para no volver a proponerlo):

- `aNumero`, `fmt` y `describirCapas` viven en `lib/verificaciones/formato.ts`.
- Los seis componentes que se definían dentro de una página están en
  `components/verificaciones/`.
- Se fueron `zod` (declarado y nunca importado) y `components/ui/tabs.tsx`.

## Verificaciones fuera de alcance por ahora

Decidido no hacerlas todavía, no olvidado:

- Punzonamiento en zapata combinada y en losa de fundación.
- Grupo de pilotes y pandeo de pilotes.
- Cabezales sobre núcleos (la planilla tiene hojas aparte).
- Del índice siguen en "Próximamente": vigas con torsión ya está hecha, pero
  quedan las que nunca se portaron desde la planilla.

## A decidir: coeficientes del cortante sin armadura transversal

El mismo artículo (Anejo 19, art. 6.2.2, ec. 6.2.a y 6.2.b, pág. 76) está
implementado con dos juegos de coeficientes distintos:

| | `vigas-flexion-cortante.ts` (de la planilla) | `zapata-aislada.ts` (del articulado) |
|---|---|---|
| C_Rd,c | `0,15/1,5` = 0,10 | `0,18/1,5` = 0,12 |
| v_min | `0,075/1,5 · k^1,5 · √fck` | `0,035 · k^1,5 · √fck` |

El articulado dice **0,18/γc** y **0,035·k^(3/2)·√fck**. El `0,075/γc` de la
planilla es el mínimo de la **EHE-08**, la norma anterior; el `0,15/γc` no es de
ninguna de las dos y parece un 0,18 mal transcripto.

Mezclar ambos importa: con cuantías bajas manda el mínimo, y ahí la planilla
devuelve hasta **+43 %** de resistencia respecto de la norma — en esa dirección
el error no es conservador.

Pendiente de decisión del usuario: unificar contra el articulado, o dejar el
criterio de la planilla y documentarlo como criterio de oficina.

## Advertencia vigente

Cinco cálculos **no existían en la planilla** y se construyeron con el método
general de la norma, sin un caso real contra el cual contrastarlos: zapata de
medianería, zapata combinada, losa de fundación, pilotes, y el punzonamiento de
la zapata aislada. Están verificados a mano y con tests de sanidad, y cada página
lo aclara en pantalla, pero conviene revisarlos antes de usarlos en obra.

También conviene revisar la corrección del **muro de contención**: el brazo del
peso del alzado se cambió de `A/2` a `esp/2`, lo que da resultados **más
conservadores** que la planilla. Muros que antes verificaban podrían no verificar.
