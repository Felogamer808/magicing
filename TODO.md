# Pendientes

Estado al último commit. Lo terminado no se lista: está en `git log` y en el
`README.md`.

## En curso

### Croquis por tarjeta de datos
Cada tarjeta del formulario lleva un croquis que rotula los mismos símbolos que
sus campos. Hecho en **vigas — flexión y cortante** (materiales, geometría,
armadura positiva y negativa, ramas del estribo), que es la implementación de
referencia en `components/verificaciones/croquis/`.

Hecho también en **muro de contención** (suelo, geometría y posición de los
apoyos). De paso las etiquetas dejaron de decir sólo "L1" y "L2": ahora nombran
lo que miden, y el croquis dibuja los dos casos apuntalados juntos porque `L1` no
significa lo mismo en uno que en otro.

Faltan 12 páginas, en este orden de prioridad por cuánto se presta a confusión
cada parámetro:

1. **Losas** — que se vea que la armadura en X va por dentro, apoyada sobre la de
   Y, y que por eso tienen distinto canto útil.
2. **Cabezal de pilotes** — separación entre pilotes, ancho del pilar, armaduras
   secundaria y de reparto, y la inclinación de la biela.
3. Zapatas (medianería, corrida, combinada), pilotes, uniones, sección mixta,
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

## Advertencia vigente

Cinco cálculos **no existían en la planilla** y se construyeron con el método
general de la norma, sin un caso real contra el cual contrastarlos: zapata de
medianería, zapata combinada, losa de fundación, pilotes, y el punzonamiento de
la zapata aislada. Están verificados a mano y con tests de sanidad, y cada página
lo aclara en pantalla, pero conviene revisarlos antes de usarlos en obra.

También conviene revisar la corrección del **muro de contención**: el brazo del
peso del alzado se cambió de `A/2` a `esp/2`, lo que da resultados **más
conservadores** que la planilla. Muros que antes verificaban podrían no verificar.
