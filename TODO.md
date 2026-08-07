# Pendientes

Estado al último commit. Lo terminado no se lista: está en `git log` y en el
`README.md`.

## Terminado: croquis por tarjeta de datos

Las **16 páginas** tienen croquis en sus tarjetas de datos, rotulando los mismos
símbolos que los campos. Viven en `components/verificaciones/croquis/`, agrupados
por familia: `CroquisViga`, `CroquisLosa`, `CroquisCabezal`, `CroquisMuro`,
`CroquisCimentacion` y `CroquisVarios`.

Lo que cada uno vino a resolver, por si hay que revisarlos:

- **Losas** — X va por dentro, apoyada sobre Y, y por eso tiene menor canto útil.
- **Muro** — `L1` no significa lo mismo en el caso 2 que en el 3, y `L2` no es una
  altura sino la separación entre apoyos.
- **Cabezal** — la separación entre pilotes no es un dato: es 2,5·D.
- **Zapatas** — "ancho // A" es el paralelo a A, no el perpendicular.
- **Combinada y losa de fundación** — la posición de los pilares se mide desde el
  borde izquierdo.
- **Corrida** — se calcula una rebanada de un metro.
- **Pilotes** — fs actúa en el fuste y qp sólo en la punta.

Convención para los que se agreguen: el croquis va dentro de `CardContent`,
envuelto en `<div className="col-span-full">` cuando la tarjeta usa grid.

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

- **Separar `Nk` en permanente y variable, en zapatas y pilotes.** Hoy `Nk` es
  una carga vertical característica agregada, y el motor la mayora entera con un
  único `GAMMA_F = 1,5`. Queda del lado seguro —a la parte permanente le tocaría
  1,35— pero es una simplificación: impide usar γG y γQ como los define la norma,
  y obliga a que la constante se llame γF en vez de γQ (ver
  `lib/calc/ec2/coeficientes.ts`). Pedirlas por separado como `Ng` y `Nq`
  resolvería las dos cosas. **Cambia resultados**, así que hay que rehacer los
  casos de la planilla, no sólo el código.

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
