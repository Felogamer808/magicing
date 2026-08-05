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

Ver el informe de análisis para el detalle. Por impacto:

- **Andamiaje duplicado en las 16 páginas.** `aNumero` y `fmt` están copiados
  íntegros en cada una, y el bloque de validación `useMemo` está repetido con
  variantes (357 llamadas a `aNumero()`). Es el mayor consumo de contexto del
  proyecto.
- **Componentes definidos dentro de páginas** en 6 de 16 (`DiagramaCabezal`,
  `DiagramaMuro`, `DiagramaCFT`, `TarjetaDireccion`, `TarjetaLado`,
  `CampoSeleccion`), mientras las otras 10 los importan. Hay que unificar.
- **`zod` declarado y sin usar** en `package.json`.
- **`components/ui/tabs.tsx` huérfano**, no lo importa nadie.

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
