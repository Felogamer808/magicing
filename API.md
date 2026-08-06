# API del motor de cálculo

No hay API HTTP ni rutas de servidor: la aplicación es enteramente cliente. La
única superficie pública es la del motor en `lib/calc/`, que se consume desde las
páginas y desde los tests.

## Contrato general

Toda función de cálculo es **pura**: mismos argumentos, mismo resultado, sin
estado ni efectos. El orden de argumentos sigue siempre el mismo patrón:

```ts
calcularX(materiales, geometria, [parámetros], datos) → Resultado
```

Los resultados incluyen tanto los valores intermedios como los booleanos de
verificación, para que la interfaz pueda mostrar el desarrollo completo.

Unidades: **m, kN, kN·m, MPa, cm²**; diámetros en **mm**. El sufijo del nombre
aclara la unidad cuando hay riesgo de confusión (`asNecCm2`, `dM`, `tdKN`).

## Punto de entrada común

```ts
// lib/calc/ec2/materiales.ts
derivarMateriales({ fck, fyk, fydEstribos? }): MaterialesDerivados
```

De `fck` y `fyk` deriva `fcd = fck/1,5`, `fctm = 0,3·fck^(2/3)`,
`fyd = fyk/1,15`, y `fydEstribos = mín(fyd, 400)`. Casi todas las funciones de
`ec2/` reciben su resultado como primer argumento.

## Eurocódigo 2 — `lib/calc/ec2/`

### Vigas

| Función | Archivo | Devuelve |
|---|---|---|
| `calcularCantoUtil(geometria, armaduraPositiva)` | `vigas-flexion-cortante.ts` | canto útil (m), contemplando capas |
| `calcularDisposicionArmadura(geometria, armadura)` | idem | capas, capacidad por fila, centroide |
| `calcularFlexion(materiales, geometria, d, datos)` | idem | `ResultadoFlexion` |
| `calcularCortante(materiales, geometria, d, asNegativaCm2, datos)` | idem | `ResultadoCortante` |
| `calcularTorsion(materiales, geometria, datos)` | `vigas-torsion.ts` | `ResultadoTorsion` |
| `calcularVigaConTorsion(materiales, geometria, datos)` | idem | flexión + cortante + torsión combinados |

Complementos en `vigas-complementos.ts`: `calcularArmaduraSecundaria`,
`calcularArmaduraPiel`, `calcularAnclajeMm`, `calcularDeformaciones`,
`calcularSeparacionBarrasCm`.

`DatosFlexion` acepta `asAdicionalCm2` y `DatosCortante` acepta
`a90AdicionalCm2PorM`: así la torsión suma su aporte sin duplicar el cálculo.

### Cortante sin armadura transversal — `cortante.ts`

Anejo 19, art. 6.2.2, ec. (6.2.a) y (6.2.b). Lo usan tanto las vigas como las
cimentaciones, y vive aparte justamente porque estuvo duplicado y las dos copias
se fueron con coeficientes distintos.

| Función | Devuelve (MPa, salvo `factorEscalaK`) |
|---|---|
| `factorEscalaK(dM)` | k = 1 + √(200/d) ≤ 2 |
| `tensionCortanteBase(k, rhoL, fck)` | término principal, C_Rd,c = 0,18/γc |
| `tensionCortanteMinima(k, fck)` | v_min = 0,035·k^(3/2)·√fck |
| `tensionCortanteResistente(k, rhoL, fck)` | el mayor de los dos |

### Losas

| Función | Devuelve |
|---|---|
| `calcularLosa(materiales, geometria, datos)` | armado positivo y negativo en X e Y |
| `calcularMomentoResistenteLosa(materiales, e, recubrimiento, armado)` | momento que resiste una malla dada |

### Cimentaciones

| Función | Archivo |
|---|---|
| `calcularZapataAislada(materiales, geometria, sigmaAdm, datos)` | `zapata-aislada.ts` |
| `calcularZapataCorrida(materiales, geometria, sigmaAdm, datos)` | `zapata-corrida.ts` |
| `calcularZapataMedianeria(materiales, geometria, sigmaAdm, datos)` | `zapata-medianeria.ts` |
| `calcularZapataCombinada(materiales, geometria, sigmaAdm, datos)` | `zapata-combinada.ts` |
| `calcularFranjaLosa(materiales, geometria, sigmaAdm, datos)` | `losa-fundacion.ts` |
| `calcularPilote(materiales, geometria, geotecnia, armadura, carga)` | `pilote.ts` |
| `calcularCabezalDosPilotes(materiales, geometria, datos)` | `cabezal-pilotes.ts` |

Compartidas y reutilizables desde `zapata-aislada.ts`: `calcularCorteUnidireccional`,
`calcularArmadoDesdePresion`, `calcularArmadoDireccion`.

`calcularVigaSobreTerreno` (en `zapata-combinada.ts`) es el motor común de zapata
combinada y franja de losa: resuelve la pieza como viga cargada por la reacción
del terreno, integrando el diagrama numéricamente.

### Otras

- `calcularMuroContencion(suelo, geometria, apoyos)` — vuelco, deslizamiento,
  tensión del terreno y reacciones de los tres casos. `FS_MINIMO = 1,5`.
- `calcularFisuracion(materiales, parametros, zona)` — abertura característica.
  `barrasPorMetro(ancho, separacion)` como auxiliar.

## AISC 360 — `lib/calc/aisc/`

- `calcularSeccionMixta(materiales, geometria, datos)` — pilar CFT por ASD.
  `calcularPropiedadesGeometricas(geometria)` expone áreas e inercias.
- `calcularSoldaduraH(perfil, ladoMm, electrodo, solicitaciones)` — cordón
  alrededor de un perfil H. `tensionAdmisibleSoldadura(electrodo)` y
  `ladoMinimoCordonMm(espesorMenor)` como auxiliares.
- `calcularChapaBase(materiales, geometria, datos)` — cinco verificaciones de
  chapa de base. `fuerzasEnPernos(momento, distancias)` reparte el momento entre
  filas y sirve por separado.

## CIRSOC 102 — `lib/calc/cirsoc/`

- `calcularViento(datos, niveles)` — velocidad de cálculo, presión y carga por
  nivel, y resultante sobre una cara.
- `coeficienteAltura(terreno, z)` — kz según rugosidad.
- `calcularCoeficientesPresion(gamma)` — exteriores, interiores y arrastre total.
- `generarNiveles(zInicial, zFinal, cantidad)` — niveles equiespaciados.

## Datos de armadura — `lib/calc/armaduras.ts`

- `DIAMETROS_ARMADURA` — serie comercial en mm, usada como sugerencia en los
  campos de diámetro.
- `areaBarraCm2(diametroMm)`, `esDiametroComercial(diametroMm)`.

## Registro de verificaciones — `lib/verificaciones/`

- `registroVerificaciones` y `agruparPorCategoria(items)` en `registry.ts`:
  fuente única del índice, la barra lateral y el buscador.
- `combinacionDe(idVerificacion)` en `combinaciones.ts`: régimen de acciones con
  que trabaja cada verificación (mayoradas, características, servicio).
