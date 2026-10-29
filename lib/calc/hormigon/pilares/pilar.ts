/**
 * Pilar de hormigón armado de sección rectangular, por el Anejo 19.
 *
 * Criterios decididos por el usuario el 2026-10-12:
 * - Segundo orden por la curvatura nominal (art. 5.8.8, pág. 63), sólo si λ
 *   supera a λlim (art. 5.8.3.1, ec. (5.13), pág. 56), en cada dirección.
 * - Longitud efectiva l0 = β·l por dirección, con β a elección (fig. A19.5.7).
 * - Imperfección ei = l0/400 (art. 5.2(7), pág. 46) sumada al momento de
 *   primer orden, y la excentricidad mínima e0 = máx(h/30; 20 mm) del
 *   art. 6.1(4) como piso. En la esviada, la imperfección y el mínimo van sólo
 *   en la dirección más desfavorable (art. 5.8.9(2)).
 * - Flexión esviada por la ec. (5.39), salvo que se cumpla la (5.38)
 *   (art. 5.8.9, pág. 65).
 * - Sin φef, A = 0,7 y φef = 2,14, que es el valor que da ese A: el mismo en
 *   λlim y en la curvatura.
 * - Cortante con cercos verticales y cot θ = 1 (art. 6.2.3, págs. 78-79), con
 *   el término k1·σcp del axil en VRd,c (art. 6.2.2, pág. 76).
 *
 * Criterios tomados del articulado al implementar:
 * - Pilar arriostrado: MEd = máx(M02 + NEd·ei; M0e + NEd·ei + M2; NEd·e0), con
 *   el M0e de la ec. (5.32). Sin arriostrar el máximo de M2 cae en el extremo
 *   donde está M02, así que MEd = máx(M02 + NEd·ei + M2; NEd·e0).
 * - c = 10 en la flecha e2, salvo con momento de primer orden constante en un
 *   pilar arriostrado, donde se toma el límite inferior 8 (art. 5.8.8.2(4)).
 *
 * La sección se integra con el bloque rectangular (art. 3.1.7(3), pág. 30) y
 * los dominios de deformación de la fig. A19.6.1: pivote en εcu3 mientras la
 * fibra neutra cae dentro de la sección y en εc3 a (1 − εc3/εcu3)·h cuando
 * sale, que es lo que limita la compresión casi centrada (art. 6.1(5)).
 *
 * "Dirección h" es la flexión que comprime una cara de ancho b: canto h. La
 * "dirección b" es la otra: canto b, ancho h.
 */

import { ES_MPA, FLUENCIA_EFICAZ_SIN_DATO, GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";
import { factorEscalaK, tensionCortanteResistente } from "@/lib/calc/hormigon/comun/cortante";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import { areaBarraCm2, DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { momentoResistente, type PuntoInteraccion } from "@/lib/calc/hormigon/muros/portante";

export type DireccionPilar = "h" | "b";
export const DIRECCIONES_PILAR: readonly DireccionPilar[] = ["h", "b"];

export { FLUENCIA_EFICAZ_SIN_DATO };

export interface GeometriaPilar {
  bM: number;
  hM: number;
  /** Altura libre entre coacciones (m). */
  alturaLibreM: number;
  /** Recubrimiento hasta el cerco (m). */
  recubrimientoM: number;
  /** Tamaño máximo del árido dg (mm), para la separación libre del art. 8.2(2). */
  tamanoMaximoAridoMm: number;
}

/**
 * Cuatro barras de esquina y, en cada par de caras opuestas, una fila de
 * intermedias con su propio diámetro. Simétrica: las dos caras de ancho b
 * llevan lo mismo, y las dos de ancho h también.
 */
export interface ArmaduraPilar {
  diametroEsquinaMm: number;
  /** Barras en cada cara de ancho b, contando las de esquina (≥ 2). */
  barrasCaraB: number;
  /** Ø de las intermedias de las caras de ancho b. */
  diametroCaraBMm: number;
  /** Barras en cada cara de ancho h, contando las de esquina (≥ 2). */
  barrasCaraH: number;
  /** Ø de las intermedias de las caras de ancho h. */
  diametroCaraHMm: number;
  diametroCercoMm: number;
  /** Separación en la zona corriente del pilar. */
  separacionCercosM: number;
  /** Separación junto a vigas y losas, y en los solapes, art. 9.5.3(4). */
  separacionCercosNudoM: number;
  /** Ramas de cerco paralelas a h: resisten el cortante de la dirección h. */
  ramasH: number;
  /** Ramas de cerco paralelas a b: resisten el cortante de la dirección b. */
  ramasB: number;
}

export interface EsfuerzosDireccion {
  /** l0 = β·l (fig. A19.5.7). */
  beta: number;
  arriostrado: boolean;
  /**
   * Momentos de primer orden en los extremos (kN·m), con el mismo signo si
   * traccionan la misma cara. No hace falta que |M02| ≥ |M01|: se ordenan.
   */
  m01KNm: number;
  m02KNm: number;
  /** Cortante de cálculo en esta dirección (kN). */
  vEdKN: number;
}

export interface EsfuerzosPilar {
  /** Axil de cálculo de compresión (kN), positivo. */
  nEdKN: number;
  h: EsfuerzosDireccion;
  b: EsfuerzosDireccion;
  /** φef; sin dato se toma FLUENCIA_EFICAZ_SIN_DATO. */
  fluenciaEficaz?: number;
}

export interface BloqueRectangular {
  lambda: number;
  eta: number;
  epsilonCu3: number;
  epsilonC3: number;
}

/** Bloque rectangular y deformaciones de la tabla A19.3.1, ecs. (3.19)-(3.22). */
export function bloqueRectangular(fckMPa: number): BloqueRectangular {
  if (fckMPa <= 50) return { lambda: 0.8, eta: 1, epsilonCu3: 0.0035, epsilonC3: 0.00175 };
  return {
    lambda: 0.8 - (fckMPa - 50) / 400,
    eta: 1 - (fckMPa - 50) / 200,
    epsilonCu3: (2.6 + 35 * ((90 - fckMPa) / 100) ** 4) / 1000,
    epsilonC3: (1.75 + 0.55 * ((fckMPa - 50) / 40)) / 1000,
  };
}

/** Barra proyectada sobre una dirección: distancia a la cara comprimida (m) y área (m²). */
export interface CapaPilar {
  uM: number;
  areaM2: number;
}

/**
 * Diagrama N–M de una sección rectangular con barras en cualquier posición,
 * para la rama de compresión (N ≥ 0). Las barras dentro del bloque comprimido
 * descuentan el hormigón que desplazan.
 */
export function diagramaInteraccionPilar(
  cantoM: number,
  anchoM: number,
  capas: readonly CapaPilar[],
  materiales: MaterialesDerivados
): PuntoInteraccion[] {
  const { fcd, fyd, fck } = materiales;
  const { lambda, eta, epsilonCu3, epsilonC3 } = bloqueRectangular(fck);
  const h = cantoM;
  // Profundidad del pivote C de la fig. A19.6.1.
  const uPivote = (1 - epsilonC3 / epsilonCu3) * h;

  const punto = (deformacion: (u: number) => number, profundidadBloque: number): PuntoInteraccion => {
    const a = Math.min(profundidadBloque, h);
    const sigmaC = eta * fcd;
    const fc = sigmaC * 1000 * anchoM * a;
    let n = fc;
    let m = fc * (h / 2 - a / 2);
    for (const c of capas) {
      let sigma = Math.max(Math.min(deformacion(c.uM) * ES_MPA, fyd), -fyd);
      if (c.uM < a && sigma > 0) sigma -= sigmaC;
      const f = sigma * 1000 * c.areaM2;
      n += f;
      m += f * (h / 2 - c.uM);
    }
    return { nRdKN: n, mRdKNm: Math.abs(m) };
  };

  const xs: number[] = [];
  for (let i = 1; i <= 200; i++) xs.push((h * i) / 200);
  for (let i = 1; i <= 80; i++) xs.push(h * 30 ** (i / 80));

  const puntos: PuntoInteraccion[] = [];
  for (const x of xs) {
    const p =
      x <= h
        ? punto((u) => (epsilonCu3 * (x - u)) / x, lambda * x)
        : punto((u) => (epsilonC3 * (x - u)) / (x - uPivote), h);
    if (p.nRdKN >= 0) puntos.push(p);
  }
  // Compresión uniforme εc3: el tope del diagrama.
  puntos.push({ ...punto(() => epsilonC3, h), mRdKNm: 0 });
  return puntos;
}

export interface ResultadoFlexionDireccion {
  cantoM: number;
  anchoM: number;
  radioGiroM: number;
  longitudEfectivaM: number;
  lambda: number;
  lambdaLimite: number;
  factorA: number;
  factorB: number;
  factorC: number;
  rm: number;
  ignoraSegundoOrden: boolean;
  /** Imperfección ei = l0/400 (m). */
  eiM: number;
  /** Excentricidad mínima e0 (m). */
  e0M: number;
  /** M02 y M01 ordenados, con M02 ≥ 0. */
  m02KNm: number;
  m01KNm: number;
  m0eKNm: number;
  /** d de la curvatura, ec. (5.35): h/2 + is. */
  dCurvaturaM: number;
  kr: number;
  kPhi: number;
  curvatura: number;
  c: number;
  e2M: number;
  m2KNm: number;
  /** Momento de cálculo con imperfección y mínimo, ec. (5.31). */
  mEdKNm: number;
  /** El mismo sin imperfección ni mínimo: el de la dirección acompañante en la esviada. */
  mEdSinImperfeccionKNm: number;
  /** Qué rama del máximo mandó. */
  gobierna: "extremo" | "segundo-orden" | "minimo";
  diagrama: PuntoInteraccion[];
  mRdKNm: number;
  verifica: boolean;
}

export interface ResultadoCortanteDireccion {
  vEdKN: number;
  dM: number;
  rhoL: number;
  sigmaCpMPa: number;
  vRdCKN: number;
  requiereCercos: boolean;
  zM: number;
  vRdSKN: number;
  vRdMaxKN: number;
  verifica: boolean;
}

export interface ResultadoEsviada {
  /** (5.38a) y (5.38b) a la vez: no hace falta la (5.39). */
  cumple538: boolean;
  relacionEsbelteces: number;
  relacionExcentricidades: number;
  nRdKN: number;
  exponente: number;
  /** Valor de la (5.39) en el peor de los dos repartos de la imperfección. */
  valor: number;
  verifica: boolean;
}

export interface ResultadoPilar {
  areaHormigonM2: number;
  asTotalCm2: number;
  numeroBarras: number;
  fluenciaEficaz: number;
  fluenciaAdoptada: boolean;
  axilReducido: number;
  cuantiaMecanica: number;
  nRdMaxKN: number;
  verificaAxil: boolean;
  flexion: Record<DireccionPilar, ResultadoFlexionDireccion>;
  esviada: ResultadoEsviada;
  cortante: Record<DireccionPilar, ResultadoCortanteDireccion>;
  armado: {
    /** h ≤ 4·b, art. 9.5.1(1): si no, es un muro. */
    esPilar: boolean;
    verificaDiametro: boolean;
    asMaximaCm2: number;
    verificaMaxima: boolean;
    /** fyc,d = mín(fyd; 400 MPa), art. 9.5.2(2). */
    fycdMPa: number;
    asMinimaCaraCm2: number;
    asCara: Record<DireccionPilar, number>;
    verificaMinimaCara: Record<DireccionPilar, boolean>;
    diametroCercoMinimoMm: number;
    verificaDiametroCerco: boolean;
    separacionMaximaM: number;
    /** 0,6·s,max junto a vigas y losas, y en los solapes, art. 9.5.3(4). */
    separacionZonaNudoM: number;
    verificaSeparacion: boolean;
    verificaSeparacionNudo: boolean;
    /** Mayor distancia de una barra a otra sujeta por un cerco (m), por cara. */
    distanciaLibre: Record<DireccionPilar, number>;
    verificaSujecion: boolean;
    /** Separación libre entre barras vecinas de cada cara, art. 8.2(2). */
    separacionBarras: Record<DireccionPilar, SeparacionBarrasCara>;
    verificaSeparacionBarras: boolean;
  };
}

/** Por cara: la menor distancia libre entre barras vecinas y la que exige el art. 8.2(2). */
export interface SeparacionBarrasCara {
  libreM: number;
  /** máx(Ø mayor de la cara; dg + 5 mm; 20 mm). */
  exigidaM: number;
  verifica: boolean;
}

/** Distancia del eje de una barra apoyada contra el cerco a la cara (m). */
const ejeDesdeCara = (g: GeometriaPilar, a: Pick<ArmaduraPilar, "diametroCercoMm">, diametroMm: number) =>
  g.recubrimientoM + a.diametroCercoMm / 1000 + diametroMm / 2000;

/** Diámetros que de verdad hay: las intermedias sólo si la cara tiene más de dos barras. */
export function diametrosLongitudinales(
  a: Pick<ArmaduraPilar, "diametroEsquinaMm" | "barrasCaraB" | "diametroCaraBMm" | "barrasCaraH" | "diametroCaraHMm">
): number[] {
  const usados = [a.diametroEsquinaMm];
  if (a.barrasCaraB > 2) usados.push(a.diametroCaraBMm);
  if (a.barrasCaraH > 2) usados.push(a.diametroCaraHMm);
  return usados;
}

/**
 * Una barra de la sección. El centro se mide desde la esquina de arriba a la
 * izquierda: x a lo largo de b, y a lo largo de h. "b" son las intermedias de
 * las caras de ancho b (arriba y abajo); "h", las de las caras de ancho h.
 */
export interface BarraPilar {
  xM: number;
  yM: number;
  diametroMm: number;
  fila: "esquina" | "b" | "h";
}

/**
 * Dónde cae cada barra. Todas apoyan contra el cerco; las intermedias se
 * reparten a paso constante entre los ejes de las esquinas. La usan el
 * cálculo y el dibujo, así que el dibujo es lo que se calcula.
 */
export function barrasPilar(g: GeometriaPilar, a: ArmaduraPilar): BarraPilar[] {
  const { bM, hM } = g;
  const e = ejeDesdeCara(g, a, a.diametroEsquinaMm);
  const barras: BarraPilar[] = [
    [e, e], [bM - e, e], [e, hM - e], [bM - e, hM - e],
  ].map(([xM, yM]) => ({ xM, yM, diametroMm: a.diametroEsquinaMm, fila: "esquina" as const }));
  const eb = ejeDesdeCara(g, a, a.diametroCaraBMm);
  for (let i = 1; i < a.barrasCaraB - 1; i++) {
    const xM = e + ((bM - 2 * e) * i) / (a.barrasCaraB - 1);
    barras.push({ xM, yM: eb, diametroMm: a.diametroCaraBMm, fila: "b" }, { xM, yM: hM - eb, diametroMm: a.diametroCaraBMm, fila: "b" });
  }
  const eh = ejeDesdeCara(g, a, a.diametroCaraHMm);
  for (let j = 1; j < a.barrasCaraH - 1; j++) {
    const yM = e + ((hM - 2 * e) * j) / (a.barrasCaraH - 1);
    barras.push({ xM: eh, yM, diametroMm: a.diametroCaraHMm, fila: "h" }, { xM: bM - eh, yM, diametroMm: a.diametroCaraHMm, fila: "h" });
  }
  return barras;
}

/**
 * Separación libre del art. 8.2(2) entre las barras vecinas de una cara:
 * la menor que hay y la que se exige. "dir" es la de la flexión, como en el
 * resto: la h mira las caras de ancho b.
 */
function separacionLibreCara(
  g: GeometriaPilar, a: ArmaduraPilar, dir: DireccionPilar, barrasCara: number
): SeparacionBarrasCara {
  const ancho = dir === "h" ? g.bM : g.hM;
  const fila = dir === "h" ? a.diametroCaraBMm : a.diametroCaraHMm;
  const e = ejeDesdeCara(g, a, a.diametroEsquinaMm);
  const paso = (ancho - 2 * e) / (barrasCara - 1);
  const libreM = barrasCara === 2
    ? paso - a.diametroEsquinaMm / 1000
    : Math.min(paso - (a.diametroEsquinaMm + fila) / 2000, barrasCara >= 4 ? paso - fila / 1000 : Infinity);
  const mayorMm = barrasCara === 2 ? a.diametroEsquinaMm : Math.max(a.diametroEsquinaMm, fila);
  const exigidaM = Math.max(mayorMm, g.tamanoMaximoAridoMm + 5, 20) / 1000;
  return { libreM, exigidaM, verifica: libreM >= exigidaM - 1e-9 };
}

/**
 * Cuántas barras entran como máximo en cada cara del par, con las esquinas,
 * sin bajar de la separación libre del art. 8.2(2). El editor no deja pasar
 * de acá, para que las barras no choquen.
 */
export function maximoBarrasCara(g: GeometriaPilar, a: ArmaduraPilar, dir: DireccionPilar): number {
  let n = 2;
  while (n < 100 && separacionLibreCara(g, a, dir, n + 1).verifica) n++;
  return n;
}

/** "4Ø20 + 4Ø16": las barras agrupadas por diámetro, de mayor a menor. */
export function describirArmadoPilar(barras: readonly BarraPilar[]): string {
  const cuenta = new Map<number, number>();
  for (const b of barras) cuenta.set(b.diametroMm, (cuenta.get(b.diametroMm) ?? 0) + 1);
  return [...cuenta].sort(([p], [q]) => q - p).map(([d, n]) => `${n}Ø${d}`).join(" + ");
}

/** Distancia de la barra a la cara comprimida en la dirección dada (m). */
const profundidad = (b: BarraPilar, dir: DireccionPilar) => (dir === "h" ? b.yM : b.xM);

/**
 * Barras de la cara traccionada en una dirección: las esquinas y la fila de
 * esa cara (para la dirección h, la de ancho b de abajo).
 */
function barrasCaraTraccionada(g: GeometriaPilar, a: ArmaduraPilar, dir: DireccionPilar): BarraPilar[] {
  const canto = dir === "h" ? g.hM : g.bM;
  const fila = dir === "h" ? "b" : "h";
  return barrasPilar(g, a).filter((b) => (b.fila === "esquina" || b.fila === fila) && profundidad(b, dir) > canto / 2);
}

/** Capas de barras para la flexión en una dirección: las que quedan a la misma profundidad se suman. */
export function capasPilar(g: GeometriaPilar, a: ArmaduraPilar, dir: DireccionPilar): CapaPilar[] {
  const capas = new Map<number, CapaPilar>();
  for (const b of barrasPilar(g, a)) {
    const uM = profundidad(b, dir);
    const clave = Math.round(uM * 1e9);
    const capa = capas.get(clave) ?? { uM, areaM2: 0 };
    capa.areaM2 += areaBarraCm2(b.diametroMm) / 1e4;
    capas.set(clave, capa);
  }
  return [...capas.values()];
}

/** Interpolación del exponente a de la ec. (5.39) para secciones rectangulares. */
export function exponenteEsviada(nEdSobreNRd: number): number {
  if (nEdSobreNRd <= 0.1) return 1;
  if (nEdSobreNRd <= 0.7) return 1 + ((nEdSobreNRd - 0.1) / 0.6) * 0.5;
  if (nEdSobreNRd <= 1) return 1.5 + ((nEdSobreNRd - 0.7) / 0.3) * 0.5;
  return 2;
}

/** Cortante en una dirección, art. 6.2: VRd,c con k1·σcp y cercos por la (6.8). */
export function cortantePilar(
  materiales: MaterialesDerivados,
  geometria: GeometriaPilar,
  armadura: ArmaduraPilar,
  esfuerzos: EsfuerzosPilar,
  dir: DireccionPilar
): ResultadoCortanteDireccion {
  const { fck, fcd, fyk } = materiales;
  const { bM, hM } = geometria;
  const sigmaCpMPa = Math.min(esfuerzos.nEdKN / (bM * hM * 1000), 0.2 * fcd);
  const nu1 = 0.6 * (1 - fck / 250);
  const fywd = fyk / GAMMA_S;
  const vEdKN = Math.abs(esfuerzos[dir].vEdKN);
  const bw = dir === "h" ? bM : hM;
  // d hasta el baricentro de la cara traccionada: esquinas y fila pueden tener Ø distinto.
  const traccionadas = barrasCaraTraccionada(geometria, armadura, dir);
  const asTraccionCm2 = traccionadas.reduce((suma, b) => suma + areaBarraCm2(b.diametroMm), 0);
  const dM = traccionadas.reduce((suma, b) => suma + areaBarraCm2(b.diametroMm) * profundidad(b, dir), 0) / asTraccionCm2;

  const rhoL = Math.min(asTraccionCm2 / 1e4 / (bw * dM), 0.02);
  // ecs. (6.2.a) y (6.2.b): k1·σcp con k1 = 0,15 suma a las dos.
  const vRdCKN = (tensionCortanteResistente(factorEscalaK(dM), rhoL, fck) + 0.15 * sigmaCpMPa) * bw * dM * 1000;
  const zM = 0.9 * dM;
  const ramas = dir === "h" ? armadura.ramasH : armadura.ramasB;
  const aswM2 = (ramas * areaBarraCm2(armadura.diametroCercoMm)) / 1e4;
  // ec. (6.8) y (6.9) con cot θ = 1 y αcw = 1 (sin pretensado).
  const vRdSKN = (aswM2 / armadura.separacionCercosM) * zM * fywd * 1000;
  const vRdMaxKN = (bw * zM * nu1 * fcd * 1000) / 2;
  const requiereCercos = vEdKN > vRdCKN;
  return {
    vEdKN, dM, rhoL, sigmaCpMPa, vRdCKN, requiereCercos, zM, vRdSKN, vRdMaxKN,
    verifica: vEdKN <= vRdMaxKN && (!requiereCercos || vEdKN <= vRdSKN),
  };
}

/** Art. 9.5.3(1): Ø del cerco ≥ máx(6 mm; Ø longitudinal / 4). */
export const diametroCercoMinimo = (diametroMm: number) => Math.max(6, diametroMm / 4);

/** Art. 9.5.3(3): s ≤ mín(15·Ø longitudinal; 300 mm; lado menor). */
export const separacionMaximaCercos = (diametroMm: number, bM: number, hM: number) =>
  Math.min((15 * diametroMm) / 1000, 0.3, Math.min(bM, hM));

/**
 * Separación llevada hacia abajo al múltiplo de 5 cm, criterio del usuario
 * del 2026-10-29: con 2,5 cm la del 9.5.3(3) quedaba casi siempre en el
 * límite (Ø ≥ 20 da 30 cm justos) y cualquier corrimiento en obra lo pasaba.
 * Nunca menos de 5 cm: si el cortante pide menos, se deja ahí y la
 * comprobación lo marca.
 */
export const redondearSeparacionCercos = (sM: number) =>
  Math.max(1, Math.floor(sM / 0.05 + 1e-9)) * 50 / 1000;

/** Debajo de esta separación se prueba con el Ø de cerco siguiente. */
const SEPARACION_MINIMA_RAZONABLE_M = 0.1;
/** Mayor Ø de cerco que se propone solo. */
const DIAMETRO_CERCO_MAXIMO_MM = 12;

export interface CercosAutomaticos {
  diametroCercoMm: number;
  separacionCercosM: number;
  separacionCercosNudoM: number;
  /** El cortante pidió una separación menor que la constructiva del 9.5.3(3). */
  gobiernaCortante: boolean;
}

/**
 * Cercos fijados por la armadura longitudinal, criterio del usuario del
 * 2026-10-28:
 * - Ø: el menor de la serie comercial que cumple el art. 9.5.3(1).
 * - s en la zona corriente: la del art. 9.5.3(3), o la que pide el cortante
 *   por la (6.8) si es menor. Si ésa baja de 10 cm, se sube un Ø (hasta 12).
 * - s junto a vigas, losas y solapes: 0,6·s,máx del art. 9.5.3(4), sin pasar
 *   la de la zona corriente.
 * Todas redondeadas hacia abajo a 5 cm. Las ramas siguen siendo un dato.
 */
export function cercosAutomaticos(
  materiales: MaterialesDerivados,
  geometria: GeometriaPilar,
  armadura: Omit<ArmaduraPilar, "diametroCercoMm" | "separacionCercosM" | "separacionCercosNudoM">,
  esfuerzos: EsfuerzosPilar
): CercosAutomaticos {
  const diametros = diametrosLongitudinales(armadura);
  const sMaxM = separacionMaximaCercos(Math.min(...diametros), geometria.bM, geometria.hM);
  const sConstructivaM = redondearSeparacionCercos(sMaxM);
  const sNudoM = redondearSeparacionCercos(0.6 * sMaxM);
  const minimo = diametroCercoMinimo(Math.max(...diametros));
  const candidatos: number[] = DIAMETROS_ARMADURA.filter((d) => d >= minimo && d <= DIAMETRO_CERCO_MAXIMO_MM);
  if (candidatos.length === 0) candidatos.push(DIAMETROS_ARMADURA.find((d) => d >= minimo) ?? Math.ceil(minimo));

  let elegido: CercosAutomaticos | undefined;
  for (const diametroCercoMm of candidatos) {
    // Con s = 1 m, VRd,s es lo que resiste cada metro de separación: s = VRd,s(1)/VEd.
    const prueba = { ...armadura, diametroCercoMm, separacionCercosM: 1, separacionCercosNudoM: 1 };
    let sCortanteM = Infinity;
    for (const dir of DIRECCIONES_PILAR) {
      const c = cortantePilar(materiales, geometria, prueba, esfuerzos, dir);
      if (c.requiereCercos) sCortanteM = Math.min(sCortanteM, c.vRdSKN / c.vEdKN);
    }
    const gobiernaCortante = sCortanteM < sConstructivaM;
    const separacionCercosM = gobiernaCortante ? redondearSeparacionCercos(sCortanteM) : sConstructivaM;
    elegido = {
      diametroCercoMm, separacionCercosM, separacionCercosNudoM: Math.min(sNudoM, separacionCercosM), gobiernaCortante,
    };
    if (!gobiernaCortante || separacionCercosM >= SEPARACION_MINIMA_RAZONABLE_M - 1e-9) break;
  }
  return elegido!;
}

export function calcularPilar(
  materiales: MaterialesDerivados,
  geometria: GeometriaPilar,
  armadura: ArmaduraPilar,
  esfuerzos: EsfuerzosPilar
): ResultadoPilar {
  const { fck, fcd, fyd } = materiales;
  const { bM, hM, alturaLibreM } = geometria;
  const { nEdKN } = esfuerzos;

  const areaHormigonM2 = bM * hM;
  const barras = barrasPilar(geometria, armadura);
  const numeroBarras = barras.length;
  const asTotalCm2 = barras.reduce((suma, b) => suma + areaBarraCm2(b.diametroMm), 0);
  const diametros = diametrosLongitudinales(armadura);

  const fluenciaAdoptada = esfuerzos.fluenciaEficaz === undefined;
  const fluenciaEficaz = esfuerzos.fluenciaEficaz ?? FLUENCIA_EFICAZ_SIN_DATO;

  const axilReducido = nEdKN / (areaHormigonM2 * fcd * 1000);
  const cuantiaMecanica = ((asTotalCm2 / 1e4) * fyd) / (areaHormigonM2 * fcd);

  // ------------------------------------------------- flexión por dirección
  const direccion = (dir: DireccionPilar): ResultadoFlexionDireccion => {
    const e = esfuerzos[dir];
    const canto = dir === "h" ? hM : bM;
    const ancho = dir === "h" ? bM : hM;
    const capas = capasPilar(geometria, armadura, dir);

    const radioGiroM = canto / Math.sqrt(12);
    const longitudEfectivaM = e.beta * alturaLibreM;
    const lambda = longitudEfectivaM / radioGiroM;

    // Ordenar: |M02| ≥ |M01| y M02 ≥ 0, conservando la relación de signos.
    let [m01, m02] = Math.abs(e.m01KNm) > Math.abs(e.m02KNm) ? [e.m02KNm, e.m01KNm] : [e.m01KNm, e.m02KNm];
    if (m02 < 0) [m01, m02] = [-m01, -m02];

    // ec. (5.13). Sin arriostrar, o sin momentos de extremo, rm = 1 (C = 0,7).
    const factorA = 1 / (1 + 0.2 * fluenciaEficaz);
    const factorB = 1 + Math.sqrt(1 + 2 * cuantiaMecanica);
    const rm = e.arriostrado && m02 > 0 ? m01 / m02 : 1;
    const factorC = 1.7 - rm;
    const lambdaLimite = axilReducido > 0 ? (20 * factorA * factorB * factorC) / Math.sqrt(axilReducido) : Infinity;
    const ignoraSegundoOrden = lambda <= lambdaLimite;

    const eiM = longitudEfectivaM / 400;
    const e0M = Math.max(canto / 30, 0.02);
    // ec. (5.32).
    const m0eKNm = Math.max(0.6 * m02 + 0.4 * m01, 0.4 * m02);

    // d de la curvatura, ec. (5.35): h/2 + is, con is el radio de giro de la armadura.
    const asM2 = capas.reduce((s, c) => s + c.areaM2, 0);
    const is = Math.sqrt(capas.reduce((s, c) => s + c.areaM2 * (c.uM - canto / 2) ** 2, 0) / asM2);
    const dCurvaturaM = canto / 2 + is;

    let kr = 0;
    let kPhi = 1;
    let curvatura = 0;
    let e2M = 0;
    const c = e.arriostrado && m02 > 0 && Math.abs(m01 - m02) < 1e-9 ? 8 : 10;
    if (!ignoraSegundoOrden) {
      // ecs. (5.34)-(5.37), con nbal = 0,4.
      const nu = 1 + cuantiaMecanica;
      kr = Math.min(Math.max((nu - axilReducido) / (nu - 0.4), 0), 1);
      const beta = 0.35 + fck / 200 - lambda / 150;
      kPhi = Math.max(1 + beta * fluenciaEficaz, 1);
      curvatura = (kr * kPhi * (fyd / ES_MPA)) / (0.45 * dCurvaturaM);
      e2M = (curvatura * longitudEfectivaM ** 2) / c;
    }
    const m2KNm = nEdKN * e2M;

    const imp = nEdKN * eiM;
    const minimo = nEdKN * e0M;
    const ramas = e.arriostrado
      ? { extremo: m02 + imp, segundo: m0eKNm + imp + m2KNm, sinImpExtremo: m02, sinImpSegundo: m0eKNm + m2KNm }
      : { extremo: m02 + imp + m2KNm, segundo: -Infinity, sinImpExtremo: m02 + m2KNm, sinImpSegundo: -Infinity };
    const mEdKNm = Math.max(ramas.extremo, ramas.segundo, minimo);
    const gobierna = mEdKNm === minimo ? "minimo" : mEdKNm === ramas.segundo ? "segundo-orden" : "extremo";
    const mEdSinImperfeccionKNm = Math.max(ramas.sinImpExtremo, ramas.sinImpSegundo, 0);

    const diagrama = diagramaInteraccionPilar(canto, ancho, capas, materiales);
    const mRdKNm = momentoResistente(diagrama, nEdKN);

    return {
      cantoM: canto, anchoM: ancho, radioGiroM, longitudEfectivaM, lambda, lambdaLimite,
      factorA, factorB, factorC, rm, ignoraSegundoOrden, eiM, e0M,
      m02KNm: m02, m01KNm: m01, m0eKNm, dCurvaturaM, kr, kPhi, curvatura, c, e2M, m2KNm,
      mEdKNm, mEdSinImperfeccionKNm, gobierna, diagrama, mRdKNm,
      verifica: mEdKNm <= mRdKNm,
    };
  };
  const flexion = { h: direccion("h"), b: direccion("b") };

  const nRdMaxKN = Math.max(...flexion.h.diagrama.map((p) => p.nRdKN));
  const verificaAxil = nEdKN <= nRdMaxKN;

  // ------------------------------------------------------- esviada, 5.8.9
  const fh = flexion.h;
  const fb = flexion.b;
  const relacionEsbelteces = Math.max(fh.lambda / fb.lambda, fb.lambda / fh.lambda);
  const exH = fh.mEdKNm / nEdKN / fh.cantoM;
  const exB = fb.mEdKNm / nEdKN / fb.cantoM;
  const relacionExcentricidades = exH > 0 && exB > 0 ? Math.min(exH / exB, exB / exH) : 0;
  const cumple538 = relacionEsbelteces <= 2 && relacionExcentricidades <= 0.2;
  // N_Rd = Ac·fcd + As·fyd, tal como lo define el art. 5.8.9(4).
  const nRdKN = (areaHormigonM2 * fcd + (asTotalCm2 / 1e4) * fyd) * 1000;
  const exponente = exponenteEsviada(nEdKN / nRdKN);
  const termino = (m: number, mRd: number) => (mRd > 0 ? (m / mRd) ** exponente : Infinity);
  const valor = Math.max(
    termino(fh.mEdKNm, fh.mRdKNm) + termino(fb.mEdSinImperfeccionKNm, fb.mRdKNm),
    termino(fh.mEdSinImperfeccionKNm, fh.mRdKNm) + termino(fb.mEdKNm, fb.mRdKNm)
  );
  const esviada: ResultadoEsviada = {
    cumple538, relacionEsbelteces, relacionExcentricidades, nRdKN, exponente, valor,
    verifica: cumple538 || valor <= 1,
  };

  const cortante = {
    h: cortantePilar(materiales, geometria, armadura, esfuerzos, "h"),
    b: cortantePilar(materiales, geometria, armadura, esfuerzos, "b"),
  };
  const e = ejeDesdeCara(geometria, armadura, armadura.diametroEsquinaMm);

  // ------------------------------------------------------- armado, 9.5
  const fycdMPa = Math.min(fyd, 400);
  const asMinimaCaraCm2 = ((0.05 * nEdKN) / (fycdMPa * 1000)) * 1e4;
  const areaFila = (n: number, d: number) => 2 * areaBarraCm2(armadura.diametroEsquinaMm) + (n - 2) * areaBarraCm2(d);
  const asCara = {
    h: areaFila(armadura.barrasCaraB, armadura.diametroCaraBMm),
    b: areaFila(armadura.barrasCaraH, armadura.diametroCaraHMm),
  };
  const asMaximaCm2 = 0.04 * areaHormigonM2 * 1e4;
  // art. 9.5.3(1) con el Ø mayor y 9.5.3(3) con el menor de la longitudinal.
  const diametroCercoMinimoMm = diametroCercoMinimo(Math.max(...diametros));
  const separacionMaximaM = separacionMaximaCercos(Math.min(...diametros), bM, hM);

  // art. 9.5.3(6): cada rama sujeta una barra de cada cara que atraviesa. Con
  // las ramas repartidas, la barra más alejada de una sujeta queda a la mitad
  // del mayor tramo entre sujetas.
  const distanciaLibre = (n: number, ramas: number, anchoCara: number) => {
    if (n <= 2) return 0;
    const paso = (anchoCara - 2 * e) / (n - 1);
    const sujetas = Math.min(Math.max(ramas, 2), n);
    const tramo = Math.ceil((n - 1) / (sujetas - 1));
    return Math.floor(tramo / 2) * paso;
  };
  const libre = {
    h: distanciaLibre(armadura.barrasCaraB, armadura.ramasH, bM),
    b: distanciaLibre(armadura.barrasCaraH, armadura.ramasB, hM),
  };

  // art. 8.2(2): entre barras vecinas de una cara, libre ≥ máx(Ø; dg + 5 mm; 20 mm).
  const separacionBarras = {
    h: separacionLibreCara(geometria, armadura, "h", armadura.barrasCaraB),
    b: separacionLibreCara(geometria, armadura, "b", armadura.barrasCaraH),
  };

  return {
    areaHormigonM2, asTotalCm2, numeroBarras, fluenciaEficaz, fluenciaAdoptada, axilReducido, cuantiaMecanica,
    nRdMaxKN, verificaAxil, flexion, esviada, cortante,
    armado: {
      esPilar: Math.max(bM, hM) <= 4 * Math.min(bM, hM),
      verificaDiametro: Math.min(...diametros) >= 12,
      asMaximaCm2,
      verificaMaxima: asTotalCm2 <= asMaximaCm2,
      fycdMPa,
      asMinimaCaraCm2,
      asCara,
      verificaMinimaCara: { h: asCara.h >= asMinimaCaraCm2, b: asCara.b >= asMinimaCaraCm2 },
      diametroCercoMinimoMm,
      verificaDiametroCerco: armadura.diametroCercoMm >= diametroCercoMinimoMm,
      separacionMaximaM,
      separacionZonaNudoM: 0.6 * separacionMaximaM,
      verificaSeparacion: armadura.separacionCercosM <= separacionMaximaM + 1e-9,
      verificaSeparacionNudo: armadura.separacionCercosNudoM <= 0.6 * separacionMaximaM + 1e-9,
      distanciaLibre: libre,
      verificaSujecion: libre.h <= 0.15 + 1e-9 && libre.b <= 0.15 + 1e-9,
      separacionBarras,
      verificaSeparacionBarras: separacionBarras.h.verifica && separacionBarras.b.verifica,
    },
  };
}
