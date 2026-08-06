@AGENTS.md

# MagicIng — instrucciones permanentes

Este archivo se carga en **cada** conversación, así que se mantiene corto a
propósito. El detalle vive en documentos que se leen sólo cuando hacen falta:

| Necesito saber… | Leer |
|---|---|
| Dónde vive cada cosa, cómo se agrega una verificación | `ARCHITECTURE.md` |
| Firma de las funciones de cálculo | `API.md` |
| Convenciones de estilo, nombres, unidades | `STYLEGUIDE.md` |
| Qué falta y qué se decidió no hacer | `TODO.md` |
| Qué dice la norma (articulado, fórmulas, coeficientes) | skill `codigo-estructural-hormigon` |

La skill trae el Anejo 19 del Código Estructural (RD 470/2021), que es la
transposición española del EC2: misma formulación y casi la misma numeración.
**Ante cualquier coeficiente o fórmula, consultarla antes que la memoria**, y
citar apartado y página.

Hay una segunda skill, `jimenez-montoya`, con el manual clásico: sirve para el
*criterio* (de dónde sale una fórmula, cómo se predimensiona, ejemplos
resueltos), **nunca para el número**, porque sigue la EHE-08 derogada. No está
versionada, por derechos de autor.

No hay base de datos: la persistencia es `localStorage` (ver `ARCHITECTURE.md`).

## Forma de trabajar

0. **Traer los cambios antes de tocar nada.** El proyecto se edita desde más de
   una computadora, así que al empezar una sesión: `git pull`. Si hay cambios que
   bajar, decir qué llegó antes de seguir. Si el pull no es limpio, parar y
   avisar: nunca resolver un conflicto sin preguntar.
1. **Decir primero qué archivos voy a inspeccionar**, y limitarme a esos.
2. **No recorrer el proyecto entero** salvo que sea indispensable. Para ubicar
   algo, usar `ARCHITECTURE.md` o `grep`, no lecturas completas.
3. **Modificar sólo los archivos afectados.** Preferir ediciones puntuales antes
   que reescribir un archivo completo.
4. **Partir las tareas grandes en pasos**, con verificación y commit por paso.
5. **Usar Git** para entender lo reciente (`git log --oneline -10`,
   `git diff`) en vez de releer archivos.
6. **Si el contexto crece demasiado**, cortar y entregar un resumen técnico
   (formato abajo) para seguir en un chat nuevo. No esperar a quedarme sin
   espacio a mitad de una tarea.
7. **Respuestas concisas** salvo que se pida explicación detallada.
8. **Preguntar antes de asumir.** En decisiones de criterio de ingeniería
   (coeficientes, combinaciones, hipótesis) preguntar siempre: un valor
   plausible pero equivocado no da error, da un resultado mal dimensionado.
9. **Mantener la arquitectura existente** salvo pedido explícito de refactor.

## Verificar antes de dar algo por hecho

```bash
npm run lint    # ESLint, incluidas las reglas de React Hooks
npm run test    # Vitest sobre lib/ (no toca UI)
npm run build   # tipos + build de producción
```

- Los tests comparan contra valores reales de la planilla original. **Si un test
  falla, la sospecha va primero al código nuevo, no al test.**
- `npm run build` falla con `EPERM` si el servidor de desarrollo está corriendo:
  borrar `.next` o parar el servidor.
- Para verificar en el navegador, el servidor se levanta con la configuración
  `web` de `.claude/launch.json`, nunca con Bash.

## Trampas conocidas de este entorno

- **No editar archivos con PowerShell.** `Get-Content`/`Set-Content` en
  PowerShell 5.1 rompen la codificación y destruyen tildes y símbolos griegos
  (`Cordón` → `CordÃ³n`, `φ` → `Ï†`). Para cambios masivos, usar Node
  (`node script.mjs`), que maneja UTF-8 nativo.
- **Los archivos tienen CRLF.** Un regex con `;\n` no matchea; usar `;\r?\n` o
  trabajar por líneas.
- **Los mensajes de commit multilínea van por archivo** (`git commit -F msg.txt`).
  Pasarlos con `-m` y comillas dobles los corta en PowerShell.
- `git push` escribe en stderr y PowerShell lo reporta como error aunque haya
  funcionado: confirmar comparando `git rev-parse HEAD` con `origin/main`.

## Convenciones

Resumen; el detalle está en `STYLEGUIDE.md`.

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
  shadcn/ui sobre Base UI · Vitest.
- **Idioma**: todo en español — identificadores, comentarios, interfaz. La
  terminología es la de la planilla original, para no reaprender nombres.
- **Unidades**: m, kN, kN·m, MPa, cm². Diámetros de barra en mm. El nombre lleva
  la unidad cuando puede confundir (`asNecCm2`, `momentoKNm`, `dM`).
- **Motor sin React**: `lib/calc/` son funciones puras con sus tests al lado.
  Nada de hooks, estado ni JSX ahí.
- **TypeScript**: `strict`. Sin `any`. Interfaces exportadas para entrada y
  salida de cada cálculo.
- **Componentes**: uno por archivo, `PascalCase`, en `components/verificaciones/`.
  No definirlos dentro de una página.
- **Git**: rama `main`, commits en español explicando *por qué*, no *qué*.
  Terminar con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Resumen técnico al cerrar una funcionalidad

```markdown
## Resumen: <funcionalidad>
- **Archivos modificados**: …
- **Decisiones tomadas**: … (sobre todo las de criterio de ingeniería)
- **Dependencias nuevas**: … (o "ninguna")
- **Migraciones / cambios de datos persistidos**: … (o "ninguna")
- **Verificación**: lint / test / build / navegador
- **Pendiente**: …
```

No hay endpoints HTTP en el proyecto; si alguna vez se agregan, incluirlos en el
resumen.
