# Arquitectura

Aplicación de una sola pieza, sin backend: todo el cálculo corre en el navegador.

## Mapa del proyecto

```
app/
  layout.tsx                       Fuentes, metadata, script de tema
  page.tsx                         Portada: secciones, o áreas si hubiera más de una (server)
  globals.css                      Tokens de color, tema claro/oscuro, estilos de impresión
  areas/[area]/page.tsx            Secciones de un área (hoy sólo estructural)
  secciones/[seccion]/page.tsx     Índice de verificaciones de una sección
  verificaciones/
    layout.tsx                     Barra lateral (escritorio) + BarraMovil
    (hormigon)/<id>/page.tsx       Route group: no aparece en la URL, sólo agrupa
    (acero)/<id>/page.tsx
    (madera)/<id>/page.tsx
    (pretensado)/<id>/page.tsx
    (acciones)/<id>/page.tsx
    (herramientas)/<id>/page.tsx
  proyectos/[proyecto]/            Vista del proyecto, memoria/ y modelo/ (visor 3D)
  cad-revit/                       Planta de fundaciones en DXF → interpretación → Revit

components/
  ui/                              Primitivas de shadcn/ui — no editar a mano
  verificaciones/
    comun/                         ResultadoCheck, PanelFormulas, CampoNumerico,
                                    BarraAcciones, AvisoCombinacion... lo que usa
                                    cualquier verificación sin importar el material
    croquis/                       Croquis chicos que acompañan cada tarjeta de datos
    hormigon/  acero/  madera/     Diagramas específicos de un material
    pretensado/
    estatica/  geometria/          Diagramas de las herramientas de análisis
  proyectos/                       Piezas de la vista del proyecto: CalcularElemento,
                                    ImportarIfc, VisorModelo, PanelElementoModelo
  cad-revit/                       PlantaInterpretada (SVG), PanelPieza, ListaAvisos
  TemaToggle.tsx                   Claro/oscuro + script que evita el destello inicial
  IndiceVerificaciones.tsx         Índice con buscador

lib/
  calc/
    hormigon/
      comun/                       materiales, coeficientes, cortante, types —
                                    lo que usan vigas y cimentaciones por igual
      vigas/                       flexion-cortante, torsion, complementos, apeo-bielas
      losas/                       losa, losa-fundacion
      cimentaciones/               zapata-aislada/corrida/medianeria/combinada,
                                    pilote, cabezal-pilotes
      muros/                       contencion, portante
      fisuracion.ts                No es de una pieza sola: aplica a vigas y losas
      mensula-corta.ts             Región D, no es un voladizo de viga
      pretensado.ts                ACI 318, no EC2 — ver "Material, no norma" abajo
    acero/                         AISC 360: perfiles, compresión, flexión, corte,
                                    flexo-compresión, uniones, sección mixta (CFT)
    madera/                        EC5: axil, cortante, flexión, uniones, fuego...
    acciones/                      CIRSOC 102 (viento) — no es un material, es una carga
    geometria/                     Propiedades de sección, catálogo de perfiles
    estatica/                      Vigas continuas por rigidez directa
    armaduras.ts                   Serie comercial de diámetros (todo hormigón armado)
  hooks/useCampo.ts                Campos persistidos en localStorage
  proyectos/                       Proyecto → Elemento → Cálculo: tipos, modelo (puro),
                                    almacen (localStorage), estado (derivado)
  ifc/                             Lectura de IFC (web-ifc), escena 3D (three.js),
                                    el IFC en memoria — ver "Modelo IFC" abajo
  dxf/                             Lector de DXF por partes: entidades del espacio
                                    modelo, sin interpretar
  cad-revit/                       Qué es cada cosa de una planta de fundaciones:
                                    rótulos, pilotes, cabezales, vigas, zonas — ver
                                    "CAD → Revit" abajo
  verificaciones/
    registry.ts                    Índice de áreas, secciones y verificaciones (fuente única)
    combinaciones.ts               Con qué combinación trabaja cada una
  utils.ts                         cn() de shadcn
```

## Material, no norma

`lib/calc/`, `components/verificaciones/` y `app/verificaciones/` se organizan
**por el material o elemento que se calcula**, no por la norma que lo rige. La
norma queda igual de citada — en el comentario que está pegado a cada fórmula,
línea por línea, no como nivel de carpeta — pero encontrar algo ya no exige
saber de memoria bajo qué articulado vive.

Tres casos no son obvios y conviene no volver a discutirlos:

- **`pretensado.ts` vive en `hormigon/`, aunque sigue ACI 318 y no EC2.** Es
  una pieza de hormigón; que la fuente normativa sea otra no cambia de qué
  material es.
- **`seccion-mixta.ts` (pilar CFT) vive en `acero/`, aunque es un tubo relleno
  de hormigón.** Se calcula entero por AISC 360: la carpeta sigue al
  articulado que lo gobierna, porque ahí no hay una pieza de hormigón armado
  separable del perfil.
- **`acciones/` (viento) no es un material.** Es una carga, aplicable a
  cualquier material. Tiene su propia carpeta en vez de forzarla dentro de
  `hormigon/` o `acero/`.

Regla general cuando aparezca un caso nuevo: **la carpeta sigue al elemento
que se construye, no a la norma que hay que abrir para verificarlo.**

## Las tres capas

**1. Motor de cálculo (`lib/calc/`)** — Funciones puras, sin React. Reciben
interfaces de entrada y devuelven interfaces de resultado. Cada archivo tiene su
`*.test.ts` al lado, comparando contra valores reales de la planilla original
(o, donde no existía planilla, contra geometría exacta y propiedades que tienen
que cumplirse sí o sí).

Se puede trabajar acá **sin abrir nada de UI**, y es lo más barato en contexto.

**2. Presentación (`components/`)** — Diagramas SVG y piezas de formulario. Los
diagramas reciben números ya calculados; no calculan nada.

**3. Páginas (`app/verificaciones/(material)/<id>/page.tsx`)** — Pegamento:
estado de formulario, conversión de texto a número, validación, y llamada al
motor dentro de un `useMemo`. Son client components porque todo se recalcula al
tipear.

Los paréntesis del directorio son un *route group* de Next: agrupan en el
sistema de archivos sin aparecer en la URL. `(hormigon)/muro-contencion/page.tsx`
sigue sirviendo `/verificaciones/muro-contencion`, igual que antes de ordenar
por material. Esto no es un detalle menor: `useCampo` persiste en `localStorage`
con la ruta como clave, así que cambiar una URL le borra a cualquiera los
valores que tenga cargados en esa verificación.

## Flujo de una verificación

```
Campo (string, useCampo → localStorage)
  → aNumero()                    texto a número, acepta coma decimal
  → validación                   si algo falta, useMemo devuelve null
  → derivarMateriales()          fck/fyk → fcd, fctm, fyd
  → calcularX()                  motor puro
  → ResultadoCheck / PanelFormulas / diagramas
```

Cuando la validación falla la página muestra un aviso genérico y no rompe.

## Persistencia — no hay base de datos

Todo vive en `localStorage`, con claves `magicing:v1:<ruta>:<campo>`.

- `lib/hooks/useCampo.ts` reemplaza a `useState` en los formularios.
- Lee con `useSyncExternalStore`: el servidor renderiza el valor por defecto y el
  navegador el guardado, sin romper la hidratación, y dos pestañas de la misma
  verificación quedan sincronizadas.
- El tema se guarda aparte en `magicing:tema`.
- **No hay migraciones.** Si alguna vez cambia el formato, subir el `v1` de la
  clave y descartar lo viejo.

## Navegación en tres niveles: área → sección → verificación

`lib/verificaciones/registry.ts` es la fuente única de la que salen la portada,
la barra lateral y el buscador. Tiene tres tablas:

- `registroAreas` — hoy sólo `estructural`. Es el primer nivel cuando hay más
  de una disciplina, porque no comparten normas ni vocabulario; con una sola, la
  portada lo saltea y lista las secciones directamente. La tabla se mantiene
  —y `/areas/[area]` sigue andando— para no rehacer la navegación el día que
  entre otra disciplina.
- `registroSecciones` — cada una declara su `area`: `hormigon-armado`,
  `estructuras-metalicas`, `madera`...
- `registroVerificaciones` — cada una declara su `seccion`. El tipo
  `IdVerificacion` las enumera a mano (no `string`) para que agregar una sin
  declarar su combinación de acciones rompa la compilación en vez de fallar
  en silencio.

## Agregar una verificación

1. Elegir la carpeta de material en `lib/calc/<material>/` (o su subcarpeta:
   `hormigon/vigas/`, `hormigon/cimentaciones/`...). Si el elemento no encaja
   en ninguna subcarpeta existente, va suelto en la raíz del material, como
   `fisuracion.ts` o `mensula-corta.ts`.
2. `<nombre>.ts` — interfaces de entrada/salida y la función. Cada fórmula
   cita su artículo donde se usa: `// Anejo 19, art. 6.2.2, ec. (6.2.a)`.
3. `<nombre>.test.ts` al lado, con casos contra la planilla o, si no existe,
   contra geometría exacta y propiedades verificables.
4. Entrada nueva en `lib/verificaciones/registry.ts`: el id en `IdVerificacion`,
   y el objeto en `registroVerificaciones` (`disponible: true` y `ruta`).
5. Entrada en `lib/verificaciones/combinaciones.ts` con su régimen de acciones
   — el compilador la va a reclamar si falta.
6. `app/verificaciones/(material)/<id>/page.tsx` y `layout.tsx` (título), en
   el route group del material que corresponda.
7. Diagrama en `components/verificaciones/<material>/` si aporta, o en
   `comun/` si sirve para cualquier verificación.

El índice, la barra lateral y el buscador salen solos del registry.

## Servidor MCP

`mcp/servidor.ts` expone las verificaciones a Claude (app de escritorio y
Claude Code) por stdio, en la máquina local: `npm run mcp`. Se registra en
`.mcp.json` (Claude Code, versionado) y en `claude_desktop_config.json` de la
app de escritorio, con rutas absolutas. Corre el TypeScript con `tsx`, sin
build: siempre usa el cálculo actual.

Tres herramientas: `listar_verificaciones`, `campos_de` y `calcular`. No
calcula nada propio: llama al mismo resolver que la página. Por eso una
verificación entra al MCP sólo si su página calcula con un resolver por campos.

Hoy cubre cimentaciones. Para sumar otra verificación:

1. Que su página calcule con un resolver en `lib/calc/` (ya lo hacen casi todas).
2. Declarar sus campos, como `lib/mcp/campos-cimentaciones.ts`. El test de
   `lib/mcp/` los compara contra los `useCampo` de la página.
3. Exportar `comprobarX()` desde su módulo de recomendaciones, con `evaluar()`
   del motor, y agregarla a `lib/mcp/cimentaciones.ts` (o a un módulo hermano).

No ve los proyectos guardados: viven en el localStorage del navegador.

## Modelo IFC

Desde la vista del proyecto, "Importar IFC" lee el archivo en el navegador y
crea un elemento por cada pieza estructural (`IfcBeam`, `IfcColumn`, `IfcSlab`,
`IfcWall`, `IfcFooting`, `IfcPile`, `IfcMember`, con sus subtipos). Sin backend.

- **Vínculo**: `ElementoProyecto.ifc` guarda GlobalId, clase y la sección que se
  pudo leer. Reimportar reconoce por GlobalId y no pisa nada. Es opcional y no
  subió `VERSION_FORMATO`; el salto a 2 queda para los vínculos entre elementos.
- **Sección**: sólo la que se lee sin interpretar (un único sólido extruido,
  perfil rectangular o circular; losas y zapatas, su espesor). Se muestra, no
  entra en los campos de ninguna verificación. Los recortes que Revit pone en
  las uniones (`IfcBooleanClippingResult`) se atraviesan hasta el sólido base.
  En vigas, el alto es el lado del perfil que queda vertical en el mundo
  (Revit apoya el perfil con su X vertical; otros exportadores con el Y).
- **Nombre**: la Marca de Revit ("Mark" o "Marca" en cualquier conjunto de
  propiedades) si viene; si no, el Name, que en Revit es "Familia:Tipo:Id". La
  Marca sólo llega exportando con "Exportar conjuntos de propiedades de Revit".
- **Clase declarada**: si la pieza trae el parámetro `IfcExportAs` con una de
  las clases que se leen, manda sobre la entidad. Revit 2026 puede no
  respetarlo al exportar (cabezales y pilotes salían como `IfcSlab BASESLAB`).
- **Sección desde parámetros**, sólo si la geometría no se puede leer (Revit
  exporta como malla las piezas unidas): `#Ancho`/`#Altura` en vigas y
  `#Profundidad` en cabezales (convención de las familias de la oficina),
  `Diameter` en pilotes y pilares. Nombres exactos, nada parecido.
- **El IFC no se guarda** (`lib/ifc/memoria.ts`): vive mientras la pestaña está
  abierta. Al recargar, el visor pide cargarlo de nuevo.
- **Estado** (`lib/proyectos/estado.ts`): se deriva cada vez, con el mismo
  resolver por campos que la página y el MCP. Hoy existe sólo para
  cimentaciones; el resto da "no evaluable".
- **Visor** (`lib/ifc/visor.ts`): three.js con web-ifc directo, sin That Open
  (no hace falta su formato ni su conversión para cargar, pintar y elegir).
  Colores de los tokens de `globals.css`. Se importa dinámicamente.
- **wasm**: `scripts/copiar-web-ifc.mjs` lo copia a `public/web-ifc/` antes de
  `dev` y `build` (no se versiona). Un solo hilo: el multihilo pide COOP/COEP.
- **Trampa de web-ifc 0.0.78**: la malla que llega a `StreamAllMeshes` no tiene
  `delete()`, aunque los tipos lo declaren. Llamarlo rompe la carga.

## CAD → Revit

`/cad-revit` lee una planta de fundaciones en DXF, en el navegador y por
partes (una planta real pesaba 332 MB por bloques sin usar), y la interpreta.
La geometría vive en Revit: MagicIng no la guarda, sólo la lee del CAD y la
exporta para que un script de Dynamo coloque las familias (pendiente).

- **El contorno no dibuja piezas**: da la vuelta a vigas y cabezales juntos, y
  los dos bordes de una viga suelen ser de polilíneas distintas. Por eso todo
  se reconstruye a partir de los **rótulos** ("CT9 (1800x800x750)", "VR4
  350x600"), reconocidos por lo que dicen y no por la capa.
- **Cabezales** (`cabezales.ts`): bordes paralelos separados por las medidas
  del rótulo que encierren pilotes; gana el de más perímetro dibujado. Un
  borde puede faltar (ahí entra una viga) y se infiere del opuesto.
- **Vigas** (`vigas.ts`): par de bordes separados por el ancho del rótulo; la
  viga sigue mientras al menos un borde esté dibujado (cruza la boca de una
  unión en T) y termina en la cara del cabezal, de cara a cara.
- **Manda el rótulo**: si lo dibujado mide otra cosa, se coloca con el rótulo
  y la diferencia va a la lista de avisos (criterio del usuario).
- **Unidad**: se deduce de los pilotes, no de `$INSUNITS` (una planta real
  declaraba metros y estaba en mm).
- **Zonas** (`interpretar.ts`): un DXF trae varios dibujos; los contornos a
  menos de 8 m forman una zona y se interpreta una.
- **Nodos** (CT6/7/8, pilar sobre viga): las vigas que se quedan cortas antes
  del pilote del nodo (hasta 1 m, alineadas) se prolongan hasta él: el nodo
  es parte de la viga.
- **Exportación** (`exportar.ts`): JSON en metros con las coordenadas del CAD
  sin corrimiento (el CAD se vincula en Revit origen a origen); cotas
  relativas al nivel, cara superior común en 0 salvo el desnivel que se cargue
  por cabezal; cada pilote con la cabeza 10 cm dentro de la pieza que tiene
  encima y 12 m de largo por defecto. Lo lee el script de Dynamo.

## Decisiones que conviene conocer

- **Un archivo de cálculo por verificación**, aunque compartan fórmulas. Cada
  hoja de la planilla tenía sus propios criterios de oficina y mezclarlos hacía
  perder la trazabilidad contra el Excel.
- **Los diagramas no calculan.** Reciben resultados. Un diagrama que recalcula es
  una segunda fuente de verdad que se desincroniza.
- **Los tests son de paridad, no de opinión.** Reproducen lo que da la planilla.
  Cuando se corrigió un error de la planilla, el test lo documenta explícitamente.
- **Los croquis pueden ser esquemáticos, los rótulos no.** El dibujo satura la
  cantidad de barras para seguir siendo legible; el texto siempre dice el número
  real.
- **Los imports dentro de `lib/calc/` usan el alias `@/...`, no rutas
  relativas.** Antes de ordenar por material eran relativos, y mover un
  archivo obligaba a recalcular la profundidad de cada `../`. `vitest.config.ts`
  resuelve el mismo alias que `tsconfig.json`, para que un test pueda importar
  igual que una página.
