# Auditoría del motor contra el Anejo 19

Fecha: 2026-08-05. Contrastado contra el Anejo 19 del Código Estructural
(RD 470/2021), vía la skill `codigo-estructural-hormigon`.

Corregidos los hallazgos 0, 1, 2, 3 y 5. Queda abierto sólo el 4, que no es un
error de transcripción sino un cambio de método completo y necesita decisión.

Impacto medido de las correcciones sobre los casos de referencia:

| Corrección | Antes | Después |
|---|---|---|
| Cortante sin estribos, viga plana ρl = 0,3 % | +43 % sobre la norma | conforme |
| `V_Rd,max`, viga 90×70 | 3.504,6 kN | 3.154,1 kN |
| Interacción torsión+cortante, caso de referencia | no se comprobaba | 1,284 → **no verifica** |
| Punzonamiento, zapata 3×3 H = 0,6 | aprovechamiento 0,34 en 2d | 0,57 en el crítico (0,94·d) |
| Bielas y nudos del cabezal | no se comprobaban | σ biela 6,66 / 10,56 MPa |

## Qué se auditó y qué no

Auditado a fondo:

- `materiales.ts`, `cortante.ts`
- `vigas-flexion-cortante.ts` — flexión y cortante completos
- `vigas-torsion.ts`
- `zapata-aislada.ts` — cortante y punzonamiento
- `fisuracion.ts`
- `losa.ts` — mínimos y separaciones
- `cabezal-pilotes.ts` — modelo de bielas y tirantes

**No auditado todavía**, y conviene hacerlo: `zapata-corrida.ts`,
`zapata-medianeria.ts`, `zapata-combinada.ts`, `losa-fundacion.ts`, `pilote.ts`,
y las armaduras complementarias de `vigas-complementos.ts` (anclaje, piel,
deformaciones).

**Fuera del alcance de esta skill**, porque no son hormigón EC2 y el articulado no
los cubre: `aisc/` (sección mixta, uniones), `cirsoc/` (viento) y la parte
geotécnica de `muro-contencion.ts` (EC7).

## Hallazgo 0 — Cortante sin estribos ✅ CORREGIDO

`C_Rd,c = 0,15/γc` y `v_min = 0,075/γc·k^1,5·√fck` mezclaban un valor inventado
con el mínimo de la EHE-08. Hasta **+43 %** de resistencia sobre el articulado
con cuantías bajas, del lado inseguro. Unificado contra art. 6.2.2, ec. (6.2.a)
y (6.2.b), pág. 76, en `lib/calc/ec2/cortante.ts`.

## Hallazgo 1 — `V_Rd,max` sobreestimado un 11 % ✅ CORREGIDO

`vigas-flexion-cortante.ts:158`

```ts
const vRdMax = 0.3 * fcd * b * d * 1000;
```

El articulado (art. 6.2.3(3), ec. (6.9), pág. 79) pide:

```
V_Rd,max = α_cw · b_w · z · ν1 · f_cd / (cotθ + tanθ)
```

Con α_cw = 1 (sin pretensado), θ = 45°, z = 0,9d y ν1 = 0,6 queda
**0,27·f_cd·b·d**, no 0,30.

El 0,30 es la fórmula de la **EHE-08** (`Vu1 = 0,30·f1cd·b0·d`), que usa `d`
donde el Anejo 19 usa el brazo `z = 0,9d`. De ahí sale exactamente la diferencia
del 11 %.

Detalle que conviene conservar: usar ν1 = 0,6 en vez de ν1 = 0,6(1−f_ck/250)
sólo vale si `f_ywd ≤ 0,8·f_ywk`. El motor ya topa `fydEstribos` en 400 MPa, que
para f_yk = 500 es justo 0,8·f_yk — o sea, el tope de 400 no es arbitrario, es lo
que habilita ν1 = 0,6. Si alguna vez se levanta ese tope, hay que bajar ν1 a
0,528 (para f_ck = 30) y `V_Rd,max` cae otro 12 %.

## Hallazgo 2 — Falta la interacción torsión + cortante ✅ CORREGIDO

`vigas-torsion.ts` verifica las bielas de torsión (`td ≤ tu1`) y
`vigas-flexion-cortante.ts` las de cortante (`vd ≤ vRdMax`), **cada una por
separado**. El articulado exige además (art. 6.3.2(4), ec. (6.29), pág. 86):

```
T_Ed / T_Rd,max + V_Ed / V_Rd,max ≤ 1,0
```

Una viga con `Td/Tu1 = 0,9` y `Vd/VRd,max = 0,9` pasa las dos comprobaciones
actuales y suma 1,8: **falla la norma y la herramienta dice que verifica**. Es el
hallazgo más fácil de disparar en un caso real, porque torsión y cortante suelen
ser máximos en la misma sección de apoyo.

## Hallazgo 3 — Punzonamiento: no se recorren los perímetros ✅ CORREGIDO

`zapata-aislada.ts:276` comprueba un único perímetro, el situado a 2d:

```ts
const u1M = 2 * (anchoPilarA + anchoPilarB) + 2 * Math.PI * 2 * dPromedioM;
```

Para bases de pilares el articulado (art. 6.4.4(2), ec. (6.50), pág. 95) pide
comprobar **los perímetros situados dentro de una distancia 2d**, con la
resistencia mayorada por `2d/a`:

```
v_Rd = C_Rd,c·k·(100·ρl·f_ck)^(1/3) · 2d/a  ≥  v_min · 2d/a
```

A `a = 2d` el factor vale 1 y la cuenta actual es correcta *para ese perímetro*.
El problema es que en zapatas rígidas —vuelo corto respecto del canto, que es el
caso habitual— el perímetro crítico suele caer en `a < 2d`, y ése no se está
comprobando. Hay que iterar `a` y quedarse con el mínimo.

Lo que sí está bien: `β = 1,15` para pilar interior es el valor simplificado del
art. 6.4.3(6), y aplicarlo sobre una zapata de carga centrada es conservador.

## Hallazgo 4 — Fisuración implementa el método de la EHE-08 🔶 requiere decisión

`fisuracion.ts` calcula:

```
s_m = 2c + 0,2s + 0,4·k1·φ·A_c,eficaz/A_s
ε_sm = σ_s/E_s·[1 − k2·(σ_sr/σ_s)²]  ≥ 0,4·σ_s/E_s
w_k = β · s_m · ε_sm
```

Es el art. 49.2.4 de la **EHE-08**. El Anejo 19 (art. 7.3.4, pág. 113) usa otra
formulación:

```
s_r,max = k3·c + k1·k2·k4·φ/ρ_p,eff       con k3 = 3,4 y k4 = 0,425
ε_sm − ε_cm = [σ_s − k_t·f_ct,eff/ρ_p,eff·(1+α_e·ρ_p,eff)]/E_s  ≥ 0,6·σ_s/E_s
w_k = s_r,max · (ε_sm − ε_cm)
```

No es un coeficiente distinto: es **otro método completo**, con otra área eficaz
y otro piso para la deformación media (0,6 en vez de 0,4). No se puede decir a
priori cuál da más sin correr los dos sobre casos concretos.

No lo toco porque cambiarlo es rehacer el módulo, y porque los dos métodos son
formulaciones calibradas y publicadas — no es un error de transcripción como los
anteriores. Pero la página dice "EC2" y está calculando con la norma derogada.

## Hallazgo 5 — Cabezal: faltan las comprobaciones de nudos y bielas ✅ CORREGIDO

`cabezal-pilotes.ts:114` resuelve el tirante:

```ts
const tdKN = (ndPorPiloteKN * (vM + anchoPilarM / 4)) / (0.85 * dM);
```

Es la fórmula de encepado rígido de la EHE (art. 58.4.1.2.1) y es un criterio
válido, así que se conserva. Lo que faltaba era lo que el Anejo 19 pide
alrededor: verificar la **compresión en las bielas y en los nudos**, que es
justamente donde suelen agotarse los cabezales bajos.

Se agregaron las dos comprobaciones que la geometría define sin ambigüedad:

- **Biela** (art. 6.5.2(2), ec. (6.56)): lleva tracción transversal —es lo que
  toma el tirante—, así que su tope es `0,6·ν'·f_cd` con `ν' = 1 − f_ck/250`, no
  `f_cd`. La fuerza es `N_pilote/senθ` repartida sobre la proyección del pilote,
  o sea `σ = N_pilote/(A_pilote·sen²θ)`: por eso la biela se agota mucho antes
  que el nudo cuando queda tendida.
- **Nudo sobre el pilote** (art. 6.5.4(4)b, ec. (6.61)): está comprimido con el
  tirante anclado en una dirección, `k2 = 0,85` → tope `0,85·ν'·f_cd`.

**No** se comprueba el nudo superior bajo el pilar (CCC, `k1 = 1,0`): haría falta
la segunda dimensión del pilar y el formulario sólo carga el ancho. Además rara
vez gobierna, porque el pilar ya está dimensionado para ese mismo axil con su
propio `f_cd`. Si algún día se agrega la segunda dimensión, es la comprobación
que falta.

## Conformes ✅

| Punto | Estado |
|---|---|
| `f_cd = f_ck/1,5`, `f_yd = f_yk/1,15` | art. 2.4.2.4, conforme |
| `f_ctm = 0,30·f_ck^(2/3)` | art. 3.1.2, conforme para ≤ C50/60 |
| Tope `f_ywd ≤ 400 MPa` | es `0,8·f_ywk`, habilita ν1 = 0,6 (nota del art. 6.2.3(3)) |
| Armadura transversal de torsión `At = T/(2·A_k·f_ywd·cotθ)` | art. 6.3.2, ec. (6.26)/(6.27), exacto |
| Armadura longitudinal de torsión | ec. (6.28); usa `fydEstribos` en vez de `fyd`, conservador |
| `T_Rd,max` de torsión | 0,36·f_cd·A_e·t contra 0,528 del articulado: **32 % conservador** |
| Separación máxima de estribos (regla por tramos) | criterio EHE-08, más restrictivo que el 0,75d plano del art. 9.2.2(6) |
| `A_90,min = f_ctm·b/(7,5·f_ywd)` | da ~10 % más que `ρ_w,min = 0,08√f_ck/f_yk` (ec. 9.5): conservador |
| `A_s,min` de flexión (mecánico 0,045 + geométrico 2,8‰) | ~80 % por encima del art. 9.2.1.1: conservador |
| Separación máxima en losas `mín(3e, 30 cm)` | art. 9.3.1.1(3), exacto |
| `k = 1 + √(200/d) ≤ 2` y `ρ_l ≤ 0,02` | art. 6.2.2(1), exacto |

## Patrón

Cinco de los seis hallazgos tienen el mismo origen: **la planilla decía seguir el
Eurocódigo pero venía de la EHE-08**. Donde la EHE es más exigente el motor quedó
conservador y no molesta; donde es más laxa (`v_min`, `V_Rd,max`) quedó del lado
inseguro. Conviene tratar cualquier constante heredada de la planilla como
sospechosa hasta contrastarla contra el articulado.

## Orden sugerido para resolverlos

1. **Hallazgo 2** (interacción torsión+cortante) — es una comprobación nueva de
   pocas líneas y hoy puede dar por buena una viga que no lo es.
2. **Hallazgo 1** (`V_Rd,max`) — cambiar 0,30 por 0,27 y documentar la
   dependencia con el tope de 400 MPa.
3. **Hallazgo 3** (perímetros de punzonamiento) — iterar `a` dentro de 2d.
4. **Hallazgo 5** (nudos del cabezal) — verificación nueva.
5. **Hallazgo 4** (fisuración) — el más caro; decidir primero si se migra.
