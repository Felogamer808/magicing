# Guía de estilo

## Idioma

Todo en español: identificadores, comentarios, interfaz y mensajes de commit. La
terminología es la de la planilla original (`Mmax+`, `As,nec`, `fyd ByT`,
`ramas`) para no tener que reaprender nombres al migrar desde el Excel.

Los nombres de la norma se dejan como están, aunque no sean español: `fck`,
`fyd`, `VRd,c`, `Ka`.

## Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase`, un componente por archivo | `SeccionVigaDiagrama.tsx` |
| Funciones de cálculo | `calcularX` | `calcularZapataAislada` |
| Interfaces de entrada | `DatosX`, `GeometriaX`, `MaterialesX` | `DatosCortante` |
| Interfaces de salida | `ResultadoX` | `ResultadoFlexion` |
| Booleanos de verificación | `verificaX` | `verificaAs`, `verificaCorte` |
| Hooks | `useX` | `useCampo` |
| Constantes de módulo | `MAYUSCULA_CON_GUIONES` | `DIAMETROS_ARMADURA` |

### Unidades en el nombre

Cuando el valor puede confundirse, la unidad va al final del identificador:

```ts
asNecCm2        // cm²
asNecCm2PorM    // cm²/m
momentoKNm      // kN·m
dM              // m
diametroMm      // mm
sigmaKPa        // kN/m²
```

Sin sufijo sólo cuando es adimensional (`mu`, `omega`, `k`, `rhoL`) o
inequívoco por contexto.

## TypeScript

- `strict` activado. **Sin `any`.**
- Interfaces exportadas para entrada y salida de cada cálculo: son el contrato
  contra el que se escriben los tests.
- Sin clases: funciones y objetos planos.
- `readonly` en datos que no deben mutarse (`DIAMETROS_ARMADURA`).
- Sobrecargas sólo cuando la inferencia falla de verdad (`useCampo` las necesita
  porque el valor inicial es un literal y TypeScript infiere el tipo literal).

## Componentes

- **Uno por archivo**, en `components/verificaciones/`. No definirlos dentro de
  una página.
- Los diagramas **reciben resultados, no los calculan**.
- Props explícitas con interfaz nombrada; nada de `props: any`.
- `"use client"` sólo donde hace falta estado o efectos.
- Los componentes de `components/ui/` los genera shadcn: **no editarlos a mano**,
  porque un `shadcn add` posterior los sobrescribe. Si hay que cambiar el
  comportamiento, envolverlos (así se hizo con `PanelFormulas`).

## Estado de formulario

- `useCampo("nombre", "valorPorDefecto")` en lugar de `useState`, para que el
  dato sobreviva a recargas y navegaciones.
- Los campos guardan **texto**, no números: se convierten con `aNumero()` al
  calcular. Así se puede escribir "0," sin que el campo pelee con el usuario.
- `aNumero()` acepta coma decimal.

## SVG y croquis

- `viewBox` siempre; nunca `width`/`height` fijos.
- Color con `currentColor` y relleno con `var(--color-muted)`, para que el tema
  claro/oscuro funcione solo.
- `aria-hidden="true"` en los diagramas: la información también está en texto.
- `fontSize` mínimo 10 en croquis chicos, o los rótulos no se leen.
- El dibujo puede saturar cantidades para seguir siendo legible, pero **el rótulo
  dice siempre el número real**.

## Estilos

- Tailwind v4 con tokens definidos en `globals.css`. Usar los tokens
  (`text-muted-foreground`, `border-border`), no colores literales.
- Excepción vigente: el verde de "Verifica" usa `emerald-600` directo, porque no
  hay token semántico de éxito.
- Grillas de formulario: arrancar en 1 o 2 columnas y expandir con `sm:`/`lg:`.
  Tres columnas fijas cortan las etiquetas en un teléfono.
- `print:hidden` en lo que no debe salir impreso.

## Formato de números en pantalla

```ts
const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
```

Locale `es-AR`: coma decimal y punto de miles. Los números van con
`tabular-nums` para que no cambien de ancho al recalcular en vivo.

## Tests

- Vitest, un `*.test.ts` al lado del módulo.
- Los casos vienen de la planilla original, con los valores de entrada anotados
  en un comentario arriba.
- `toBeCloseTo` con la precisión que corresponda; comparar flotantes con
  igualdad exacta es frágil.
- Cuando se corrige un error de la planilla, el test lo dice explícitamente y
  explica por qué el valor nuevo es el correcto.
- Los cálculos que **no** salieron de la planilla (método general de norma) llevan
  tests de sanidad y monotonía además de los valores calculados a mano.

## Comentarios

Explican **por qué**, no qué. El qué se lee en el código.

```ts
// La planilla usa el fyd limitado ("fyd ByT", el mismo criterio que los estribos
// de vigas) para pasar de tracción de cálculo a área de acero, no el fyd pleno.
const asCalculadoCm2 = (tdKN / (fydEstribos * 1000)) * 100 ** 2;
```

Vale especialmente para los criterios de oficina heredados del Excel: sin la nota
parecen números arbitrarios.

## Git

- Rama `main`. Commits en español, en imperativo, explicando el motivo.
- Un commit por unidad de trabajo verificable (lint + test + build en verde).
- Mensajes multilínea por archivo: `git commit -F mensaje.txt`.
- Terminar con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- No se versionan planillas ni PDFs de normas: están en `.gitignore` por tamaño y
  por derechos de autor.
