# Pendientes

Estado al último commit. Lo terminado no se lista: está en `git log` y en el
`README.md`.

## En curso — traspaso del 2026-10-06

Resumen de la sesión del 2026-10-05, para seguir desde otra computadora.

### PR abiertas, en orden de fusión

Las de zapatas van encadenadas: cada una parte de la anterior, así que se
fusionan en este orden. GitHub re-apunta la base sola al fusionar la previa.

1. **#73** Zapata aislada: tres errores del lado inseguro (resultante fuera de
   la base daba "cumple", excentricidad sin peso propio, armado con presiones
   negativas al despegarse).
2. **#74** Zapata aislada: punzonamiento con el momento del pilar, ec. (6.51), y
   bielas en la cara del pilar, ec. (6.53).
3. **#75** Zapata aislada: flexión, cuantía mínima y anclaje según el Anejo 19
   (art. 9.8.2.2). Saca lo último de EHE-08 del módulo.
4. **#76** Zapata de medianería con el Anejo 19, como la aislada.
5. **#79** Viga centradora: página nueva y botón "Resolver con viga centradora"
   desde la medianería.

Independientes, contra `main`:

- **#77** Viga con carga en voladizo por bielas y tirantes, sólo Anejo 19.
  Página nueva. Motivada por una viga real (h 0,89, b 0,77, L 1,24, a 0,33,
  P 1485 kN): el nudo bajo el pilar apeado de 0,14 × 0,50 **no verifica**
  (21,2 MPa contra 15,0 MPa) y el tirante tiene que ir doblado hacia abajo.
- **#78** Mostrar la norma de hormigón como "Anejo 19" en vez de "EC2".

### Lo que sigue

- **Modo proyecto con vínculos entre elementos** (segunda mitad del pedido de
  la viga centradora): que Z-1 (medianería), VC-1 (viga) y Z-2 (interior)
  queden vinculados en un proyecto y las cargas viajen solas. Propuesta: el
  vínculo es un elemento que apunta a otros; las cargas transmitidas se
  muestran, no se copian; si cambia el elemento de origen, el vinculado queda
  marcado como desactualizado; `VERSION_FORMATO` pasa a 2 con conversión
  automática desde 1. **Faltan dos respuestas del usuario:** si el vínculo se
  crea al guardar desde la página o desde la vista del proyecto, y si se piensa
  vincular otros casos (pilar → zapata, viga → viga que la apea) para hacerlo
  genérico.
- **Vuelco y deslizamiento de zapatas.** El Anejo 19 no los trata (art. 2.6 (3)
  remite a documentos específicos; el EQU, al Anejo 18). Faltan datos del
  usuario: qué norma (CTE DB-SE-C o EC7) y sus coeficientes con la cita, carga
  horizontal Hk, rozamiento suelo-zapata, y si se cuentan empuje pasivo y
  tierras sobre la zapata.
- **Sacar Montoya/EHE de "viga de apeo" y "ménsula corta".** Las dos arman por
  el mayor entre Anejo 19 y Montoya, y la ménsula topa fyd en 400 MPa:
  mezclan normas. Hay una tarea preparada con el detalle.
- **Losa de fundación** sigue con el modelo de la planilla (brazo 0,85·d,
  mínimos de la EHE) en `lib/calc/hormigon/losas/franja-sobre-terreno.ts`: la combinada ya no
  lo usa y conviene pasarla al Anejo 19 con el mismo criterio.
- **Zapata corrida, combinada, losa de fundación y pilotes** siguen sin
  auditar. La corrida ya sigue el Anejo 19 (modelo de la aislada, por metro,
  2026-10-06), pero sin repaso independiente.
- **Par tirante–terreno**: el pilar o muro queda con M y V en el arranque y
  sólo se informan; no hay todavía verificación de pilar de hormigón que los
  tome. La losa tampoco se verifica con la tracción del tirante sumada.
- **Recomendaciones cuando no cumple o queda justa**: el motor está en
  `lib/verificaciones/recomendaciones/` y ya lo usan todas las páginas con
  comprobaciones (hormigón, acero, madera y pretensado). Cada página calcula
  con un resolver en `lib/calc/` que toma los campos tal como se cargaron, así
  las propuestas repiten el mismo cálculo. Una verificación nueva tiene que
  traer su resolver y sus palancas. Sin propuestas a propósito: los casos
  apuntalados del muro de contención (son alternativas), el anclaje con
  horquilla de la viga de apeo (es la alternativa al recto), las tensiones del
  pretensado (se resuelven con la sección, que se carga como un juego de
  propiedades que no se pueden mover sueltas) y el rango del lado del cordón
  de soldadura (puede fallar por grande o por chico).
- **Contrastar un caso propio** de zapata aislada y medianería: quedan en
  "probada" hasta que alguien lo haga.

### Pendiente de confirmar por el usuario

- **Los proyectos son para Uruguay.** El viento ya va por UNIT. Queda por
  confirmar si para hormigón rige una norma UNIT (posiblemente la UNIT 1050) y
  en qué se basa, o si se acepta el Código Estructural / EC2 por criterio del
  proyectista. Conviene resolverlo antes de otra migración grande de norma.

### Criterios decididos el 2026-10-05

Para no volver a preguntarlos:

- Zapatas: excentricidad del terreno con peso propio, e = Mk/(Nk+PP).
- Punzonamiento con momento: los dos ejes se suman; MEd = 1,5·Mk sin descontar
  el contramomento del terreno; en la cara del pilar VEd = 1,5·Nk entero.
- Anclaje de zapatas: si la sección de cálculo queda a menos de h/2 del borde,
  ese lado no tiene tirante que anclar.
- Viga centradora: une zapata con zapata y no apoya en el terreno; ΔN no se
  descuenta de la interior; peso propio de la viga en toda la luz; M₁ con su
  signo; reparto del 20 % (art. 9.3.1.1 (2)); va en Cimentaciones, dentro de
  Hormigón armado.
- Viga con carga en voladizo: página aparte, sólo Anejo 19; z = h − d′; la
  carga mínima que estabiliza el apoyo lejano se carga ya ponderada como
  favorable (el coeficiente es del Anejo 18, que no está entre las fuentes).

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

- **`derivarMateriales` no tiene la rama logarítmica de `f_ctm` por encima de
  C50.** La tabla A19.3.1 cambia de expresión ahí: hasta C50 vale la que está
  implementada, y por encima manda `2,12·ln(1 + (f_ck+8)/10)`. El motor de
  ménsula corta la calcula localmente (`lib/calc/ec2/mensula-corta.ts`) en vez
  de arreglar el módulo compartido, porque tocarlo **mueve resultados de otras
  verificaciones y sus tests**, y eso es un refactor aparte. Mientras tanto,
  cualquier otra verificación que use `f_ctm` con hormigón mayor a C50 está
  devolviendo un valor alto de más.

- **Ménsula corta: falta el pórtico plano.** Se decidió a propósito no meter un
  solver matricial 2D para resolver el marco: la ménsula se resuelve entera con
  el modelo de bielas y tirantes, que es lo que pide la norma para una región D.
  Anotado para no volver a proponerlo como si fuera un olvido.

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
