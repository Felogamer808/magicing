# Arquitectura

Aplicación de una sola pieza, sin backend: todo el cálculo corre en el navegador.

## Mapa del proyecto

```
app/
  layout.tsx                       Fuentes, metadata, script de tema
  page.tsx                         Portada (server) → IndiceVerificaciones (client)
  globals.css                      Tokens de color, tema claro/oscuro, estilos de impresión
  verificaciones/
    layout.tsx                     Barra lateral (escritorio) + BarraMovil
    <id>/page.tsx                  Una página por verificación (client component)
    <id>/layout.tsx                Sólo el title de la pestaña (server)

components/
  ui/                              Primitivas de shadcn/ui — no editar a mano
  verificaciones/                  Piezas compartidas y diagramas
    croquis/                       Croquis chicos que acompañan cada tarjeta de datos
  TemaToggle.tsx                   Claro/oscuro + script que evita el destello inicial
  IndiceVerificaciones.tsx         Índice con buscador

lib/
  calc/
    ec2/                           Eurocódigo 2 (hormigón)
    aisc/                          AISC 360 (acero, mixtas, uniones)
    cirsoc/                        CIRSOC 102 (viento)
    armaduras.ts                   Serie comercial de diámetros
  hooks/useCampo.ts                Campos persistidos en localStorage
  verificaciones/
    registry.ts                    Índice de verificaciones (fuente única)
    combinaciones.ts               Con qué combinación trabaja cada una
  utils.ts                         cn() de shadcn
```

## Las tres capas

**1. Motor de cálculo (`lib/calc/`)** — Funciones puras, sin React. Reciben
interfaces de entrada y devuelven interfaces de resultado. Cada archivo tiene su
`*.test.ts` al lado, comparando contra valores reales de la planilla original.

Se puede trabajar acá **sin abrir nada de UI**, y es lo más barato en contexto.

**2. Presentación (`components/`)** — Diagramas SVG y piezas de formulario. Los
diagramas reciben números ya calculados; no calculan nada.

**3. Páginas (`app/verificaciones/<id>/page.tsx`)** — Pegamento: estado de
formulario, conversión de texto a número, validación, y llamada al motor dentro
de un `useMemo`. Son client components porque todo se recalcula al tipear.

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

## Agregar una verificación

1. `lib/calc/<norma>/<nombre>.ts` — interfaces de entrada/salida y la función.
2. `lib/calc/<norma>/<nombre>.test.ts` — casos contra la planilla.
3. Entrada nueva en `lib/verificaciones/registry.ts` (`disponible: true` y `ruta`).
4. Entrada en `lib/verificaciones/combinaciones.ts` con su régimen de acciones.
5. `app/verificaciones/<id>/page.tsx` y `layout.tsx` (título).
6. Diagrama en `components/verificaciones/` si aporta.

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
