# MagicIng

Herramienta web de verificaciones estructurales según Eurocódigo 2 (EN 1992-1-1).

Nace para reemplazar un conjunto de planillas de Excel (`CALCULOS TODO.xlsx`, 24 hojas) por
una interfaz clara, con el detalle de fórmulas visible para poder auditar cada resultado.

## Correr el proyecto

```bash
npm install
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run test` | Tests del motor de cálculo (Vitest) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |

## Estructura

```
app/verificaciones/<id>/page.tsx   Formulario + resultados de cada verificación
components/verificaciones/         Diagramas SVG y piezas de UI compartidas
lib/calc/ec2/                      Motor de cálculo: funciones puras, sin React
lib/verificaciones/registry.ts     Índice de verificaciones (alimenta menú y landing)
```

El motor de cálculo (`lib/calc/ec2/`) no depende de React: son funciones puras con sus
tests al lado (`*.test.ts`). Agregar una verificación nueva = un archivo de cálculo + sus
tests + una página + una entrada en el registry.

## Estado de las verificaciones

### Validadas contra la planilla original

Los tests comparan el resultado contra los valores que produce el Excel, celda por celda.

- **Vigas — flexión y cortante** (hoja `VIGAS 1`). Incluye distribución automática de la
  armadura en capas cuando no entra en una sola fila por separación mínima, recalculando el
  centroide y por lo tanto `d`.
- **Zapata aislada** (hoja `Zapatas`, bloque *ZAPATA AISLADA CON MOMENTO*).
- **Zapata corrida** (hoja `Zapatas`, bloque *ZAPATA CORRIDA CON MOMENTO*).

Dos errores encontrados en la planilla original, corregidos acá a propósito (los tests lo
documentan):

1. En vigas, la armadura negativa no aplicaba el As mínimo (`=MAX(L8)` sin el rango de mínimos).
2. En zapatas, el armado en dirección B usaba `Mk A` en lugar de `Mk B`.

### Construidas con el método general de EC2

No existen en la planilla, así que **no hay un caso real contra el cual contrastarlas**.
Verificadas a mano contra fórmulas clásicas y con tests de sanidad, pero conviene revisarlas
antes de usarlas en obra. Cada página lo aclara en pantalla.

- Punzonamiento y cortante unidireccional de la zapata aislada (EC2 6.4 y 6.2.2).
- **Zapata de medianería** — excentricidad geométrica; avisa cuando la resultante se sale del
  núcleo central (ahí hace falta viga centradora).
- **Zapata combinada** — dos pilares, resuelta como viga sobre el terreno con diagrama de
  esfuerzos por integración numérica.
- **Losa de fundación** — método de franjas (cada línea de pilares como una viga sobre el
  terreno). Método preliminar de mano, no reemplaza un análisis de placa.
- **Pilotes** — capacidad axial por fuste y punta, más verificación estructural de la sección.

### Pendientes

Listadas en el índice como *Próximamente*: vigas con torsión, vigas de apeo, losas,
secciones mixtas, cabezales de pilotes, muros de contención, fisuración (ELS), viento,
soldaduras y chapas.

Fuera de alcance por ahora: grupo de pilotes, pandeo de pilotes, y punzonamiento en zapata
combinada y losa de fundación.

## Convenciones

- Interfaz y nombres de variables en español, con la misma terminología que la planilla
  original, para no tener que reaprender nombres.
- Unidades: metros, kN, kN·m, MPa, cm². Los diámetros de barra van en mm.
- Cada resultado booleano se muestra como Verifica / No verifica, y cada bloque tiene un panel
  "Ver cálculo" con los pasos intermedios.

## Nota sobre las normas

Los PDFs de normas (Eurocódigo, Jiménez Montoya) y las planillas de Excel **no se versionan**
— están en el `.gitignore`. Las normas tienen copyright y no deben subirse al repositorio.
