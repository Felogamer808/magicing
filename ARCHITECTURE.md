# Arquitectura

Aplicación de una sola pieza, sin backend: todo el cálculo corre en el navegador.

## Mapa del proyecto

```
app/
  layout.tsx                       Fuentes, metadata, script de tema
  page.tsx                         Portada: elegir área (server)
  globals.css                      Tokens de color, tema claro/oscuro, estilos de impresión
  areas/[area]/page.tsx            Secciones de un área (estructural | hidraulica)
  secciones/[seccion]/page.tsx     Índice de verificaciones de una sección
  verificaciones/
    layout.tsx                     Barra lateral (escritorio) + BarraMovil
    (hormigon)/<id>/page.tsx       Route group: no aparece en la URL, sólo agrupa
    (acero)/<id>/page.tsx
    (madera)/<id>/page.tsx
    (pretensado)/<id>/page.tsx
    (hidraulica)/<id>/page.tsx
    (acciones)/<id>/page.tsx
    (herramientas)/<id>/page.tsx

components/
  ui/                              Primitivas de shadcn/ui — no editar a mano
  verificaciones/
    comun/                         ResultadoCheck, PanelFormulas, CampoNumerico,
                                    BarraAcciones, AvisoCombinacion... lo que usa
                                    cualquier verificación sin importar el material
    croquis/                       Croquis chicos que acompañan cada tarjeta de datos
    hormigon/  acero/  madera/     Diagramas específicos de un material
    pretensado/  hidraulica/
    estatica/  geometria/          Diagramas de las herramientas de análisis
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
    hidraulica/                    Manning en conducto circular
    geometria/                     Propiedades de sección, catálogo de perfiles
    estatica/                      Vigas continuas por rigidez directa
    armaduras.ts                   Serie comercial de diámetros (todo hormigón armado)
  hooks/useCampo.ts                Campos persistidos en localStorage
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
que cumplirse sí o sí — así arrancó `hidraulica/`).

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

- `registroAreas` — hoy `estructural` e `hidraulica`. Es lo primero que se
  elige, porque las dos disciplinas no comparten normas ni vocabulario.
- `registroSecciones` — cada una declara su `area`. `hormigon-armado`,
  `estructuras-metalicas`, `madera`... del lado estructural; `conducciones`
  del lado hidráulico.
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
