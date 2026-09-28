/**
 * Punzonamiento de losas macizas en el apoyo sobre un pilar.
 * Anejo 19, art. 6.4 (págs. 86-96), con el armado del art. 9.4.3 (pág. 148).
 *
 * La comprobación son tres cortes distintos, en este orden:
 *
 *  1. **Cara del pilar (u0)** — agotamiento de la biela comprimida. Es el techo
 *     absoluto: si no pasa, no hay armadura que lo arregle, hay que agrandar el
 *     pilar o el canto. Art. 6.4.5(3), ec. (6.53).
 *  2. **Perímetro crítico (u1), a 2d** — si pasa, la losa se banca el
 *     punzonamiento sola. Art. 6.4.4(1), ec. (6.47).
 *  3. **Si no pasa** — armadura de punzonamiento por la ec. (6.52), topada en
 *     1,5·vRd,c, y el perímetro uout donde deja de hacer falta, ec. (6.54).
 *
 * ## Por qué los números no van a coincidir con la planilla PUNZONADO.xlsx
 *
 * La planilla mezcla dos normas: trae el perímetro crítico y la ec. (6.47) del
 * EC2, pero el mínimo vmin, la resistencia de la biela y el fywd de la armadura
 * son de la EHE-08, que está derogada. Acá es todo Anejo 19, y las tres
 * diferencias van del lado seguro:
 *
 * | | Planilla (EHE-08) | Acá (Anejo 19) |
 * |---|---|---|
 * | vmin | 0,075/γc · k^1,5 · √fck = 0,05·k^1,5·√fck | 0,035 · k^1,5 · √fck |
 * | Biela en u0 | 0,5·f1cd = 0,30·fcd | 0,4·ν·fcd, con ν = 0,6(1 − fck/250) |
 * | Acero de punzonado | fyα,d = 400 MPa | fywd,ef = 250 + 0,25d ≤ fyd |
 *
 * ## Lo que este módulo no hace
 *
 * - **σcp**: la ec. (6.47) suma k1·σcp por el axil o el pretensado que cruza la
 *   sección crítica. Se omite, que es el lado seguro porque en compresión ese
 *   término suma resistencia. Mismo criterio que `comun/cortante.ts`.
 * - **Huecos próximos** (art. 6.4.2(3)): si hay un hueco a menos de 6d hay que
 *   descontar la parte del perímetro que queda a la sombra. No se modela.
 * - **Capiteles** (art. 6.4.2(8) a (11)).
 * - **β por la ec. (6.39)**: se usan los valores recomendados de la figura
 *   A19.6.21, o uno cargado a mano. Ver `BETA_RECOMENDADO`.
 */

import {
  factorEscalaK,
  tensionCortanteBase,
  tensionCortanteMinima,
} from "@/lib/calc/hormigon/comun/cortante";
import { GAMMA_C, GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";

/**
 * Dónde está el pilar respecto de los bordes libres de la losa. Determina la
 * forma del perímetro crítico, la fórmula de u0 y el β recomendado.
 */
export type PosicionPilar = "interior" | "borde" | "esquina";

/**
 * β recomendados por la figura A19.6.21 (pág. 94 del BOE).
 *
 * Sólo valen si se cumplen las dos condiciones del art. 6.4.3(6): que la
 * estabilidad lateral **no** dependa de que losas y pilares trabajen como
 * pórtico, y que las luces de los vanos contiguos no difieran más del 25 %.
 * Fuera de eso hay que ir a la ec. (6.39) con el momento desequilibrado y
 * cargar el β a mano.
 */
export const BETA_RECOMENDADO: Record<PosicionPilar, number> = {
  interior: 1.15,
  borde: 1.4,
  esquina: 1.5,
};

/** kmáx de la ec. (6.52): techo de lo que se puede ganar armando. Art. 6.4.5(1). */
export const K_MAX_ARMADURA = 1.5;

/**
 * Tramo del perímetro de control, en coordenadas de la losa (m).
 *
 * El cálculo devuelve la geometría además de la longitud para que el croquis
 * dibuje el perímetro que se está usando y no una versión idealizada suya: con
 * un pilar retirado del borde, el perímetro se corta contra el borde libre en
 * un punto que no es evidente, y un dibujo genérico lo escondería.
 */
export type TramoPerimetro =
  | { tipo: "recta"; x0: number; y0: number; x1: number; y1: number }
  | { tipo: "arco"; cx: number; cy: number; rM: number; desdeRad: number; hastaRad: number };

export interface PerimetroControl {
  longitudM: number;
  tramos: TramoPerimetro[];
}

/**
 * Perímetro de control a distancia `rM` de la cara de un pilar rectangular,
 * recortado contra los bordes libres de la losa.
 *
 * Es la figura A19.6.13 (pilar interior) y la A19.6.15 (cerca de un borde o una
 * esquina) resueltas de una sola vez, en vez de tres fórmulas cerradas. Vale la
 * pena porque las fórmulas cerradas de manual sólo cubren el pilar **a ras** del
 * borde, y el pilar retirado del borde —una losa que vuela más allá del pilar de
 * fachada— es tan común como el otro. Con el recorte general, las tres fórmulas
 * clásicas salen como casos particulares (los tests las comprueban):
 *
 *     interior           2(cx + cy) + 4πd
 *     borde a ras        cx + 2cy + 2πd
 *     esquina a ras      cx + cy + πd
 *
 * y entre medio la curva es continua en los arcos. El único salto es cuando el
 * pilar se aleja del borde más de 2d: ahí el tramo recto paralelo al borde entra
 * de golpe al perímetro, porque hasta ese momento caía fuera de la losa. Es el
 * "en la medida en que el perímetro resultante (excluyendo los bordes libres)
 * sea inferior" del art. 6.4.2(4): más allá de 2d el pilar ya es interior.
 *
 * Ejes: los bordes libres son x = 0 e y = 0 y la losa ocupa el cuadrante
 * positivo. El pilar se pasa ya ubicado, en vez de dejar que la función lo
 * coloque: todos los perímetros de un mismo caso —u1, uout y los de armadura—
 * tienen que salir concéntricos, y si cada uno se posicionara según su propio
 * radio saldrían desplazados entre sí en el dibujo.
 */
export function perimetroDeControl(
  pilar: { x0: number; y0: number; x1: number; y1: number },
  rM: number,
  recortaX: boolean,
  recortaY: boolean
): PerimetroControl {
  const { x0, y0, x1, y1 } = pilar;

  // Ángulos donde cada borde libre corta los arcos de esquina. Sin borde de ese
  // lado el arco va entero, π/2.
  const cuarto = Math.PI / 2;
  /** El borde y = 0 corta los dos arcos de abajo cuando el pilar está a menos de rM. */
  const hastaY = !recortaY ? cuarto : Math.asin(Math.min(y0 / rM, 1));
  /** El borde x = 0 corta el arco de arriba a la izquierda por el mismo motivo. */
  const hastaX = !recortaX ? cuarto : Math.asin(Math.min(x0 / rM, 1));
  /** …y el de abajo a la izquierda lo corta por el otro extremo. */
  const desdeX = !recortaX ? 0 : Math.acos(Math.min(x0 / rM, 1));

  const tramos: TramoPerimetro[] = [];
  let longitudM = 0;

  const recta = (ax: number, ay: number, bx: number, by: number) => {
    tramos.push({ tipo: "recta", x0: ax, y0: ay, x1: bx, y1: by });
    longitudM += Math.hypot(bx - ax, by - ay);
  };
  /** `desde`/`hasta` en radianes absolutos, medidos desde el eje +x y antihorario. */
  const arco = (cx: number, cy: number, desde: number, hasta: number) => {
    if (hasta - desde <= 1e-12) return;
    tramos.push({ tipo: "arco", cx, cy, rM, desdeRad: desde, hastaRad: hasta });
    longitudM += rM * (hasta - desde);
  };

  // Los tramos rectos de arriba y de la derecha nunca se recortan: el pilar está
  // siempre del lado positivo de los dos bordes. Los otros dos existen sólo si
  // el pilar está lo bastante adentro como para que quepan.
  const hayRectaInferior = !recortaY || y0 >= rM;
  const hayRectaIzquierda = !recortaX || x0 >= rM;

  // Se recorre el perímetro en orden, antihorario desde la recta inferior, para
  // que el croquis pueda dibujarlo como un trazo continuo.
  if (hayRectaInferior) recta(x0, y0 - rM, x1, y0 - rM);
  arco(x1, y0, 2 * Math.PI - hastaY, 2 * Math.PI);
  recta(x1 + rM, y0, x1 + rM, y1);
  arco(x1, y1, 0, cuarto);
  recta(x1, y1 + rM, x0, y1 + rM);
  arco(x0, y1, cuarto, cuarto + hastaX);
  if (hayRectaIzquierda) recta(x0 - rM, y1, x0 - rM, y0);
  arco(x0, y0, Math.PI + desdeX, Math.PI + hastaY);

  return { longitudM, tramos };
}

export interface MaterialesPunzonamiento {
  fckMPa: number;
  /** fyk de la armadura de punzonamiento. */
  fykMPa: number;
}

export interface GeometriaPunzonamiento {
  posicion: PosicionPilar;
  /** Canto útil de la armadura en cada dirección (m). d = (dy + dz)/2, ec. (6.32). */
  dYM: number;
  dZM: number;
  /**
   * Lados del pilar (m). En borde y esquina, `c1M` es el lado **perpendicular**
   * al borde y `c2M` el paralelo, como en la figura A19.6.20: la fórmula de u0
   * del art. 6.4.5(3) los distingue.
   */
  c1M: number;
  c2M: number;
  /**
   * Distancia de la cara del pilar al borde libre (m). 0 = el pilar llega a ras
   * del borde. En esquina hay dos: `distBordeC1M` es la del borde perpendicular
   * a c1 y `distBordeC2M` la del otro.
   */
  distBordeC1M: number;
  distBordeC2M: number;
}

export interface ArmaduraLongitudinalPunzonamiento {
  /** Armadura de negativos en cada dirección, la que cose la fisura de punzonado. */
  diametroYMm: number;
  separacionYM: number;
  diametroZMm: number;
  separacionZM: number;
}

export interface ArmaduraPunzonamientoDatos {
  /** Diámetro de una rama de cerco (mm). */
  diametroMm: number;
  /** Ramas en un perímetro concéntrico al pilar. */
  ramasPorPerimetro: number;
  /** Separación radial entre perímetros, sr (m). */
  srM: number;
  /** Separación tangencial entre ramas dentro de un perímetro, st (m). */
  stM: number;
  /** Perímetros de armadura dispuestos. */
  numeroPerimetros: number;
  /** Distancia de la cara del pilar al primer perímetro (m). */
  distPrimerPerimetroM: number;
  /** Ángulo de la armadura con el plano de la losa (grados). 90 = cercos verticales. */
  alphaGrados: number;
}

export interface DatosPunzonamiento {
  /** Esfuerzo de punzonamiento de cálculo (kN). */
  vEdKN: number;
  /** null = usar el recomendado de la figura A19.6.21 según la posición. */
  betaManual: number | null;
}

export interface ResultadoCaraPilar {
  u0M: number;
  /** Tope de u0 que impone el art. 6.4.5(3) en borde y esquina. null en interior. */
  u0TopeM: number | null;
  vEdMPa: number;
  nu: number;
  vRdMaxMPa: number;
  verifica: boolean;
  aprovechamiento: number;
}

export interface ResultadoPerimetroCritico {
  perimetro: PerimetroControl;
  u1M: number;
  rhoLY: number;
  rhoLZ: number;
  rhoL: number;
  /** Ancho en el que esa cuantía tiene que existir de verdad: c + 3d a cada lado. Art. 6.4.4(1). */
  anchoCuantiaC1M: number;
  anchoCuantiaC2M: number;
  k: number;
  vMinMPa: number;
  vRdCMPa: number;
  /** true si gobierna vmin y no el término de la cuantía. */
  gobiernaVMin: boolean;
  vEdMPa: number;
  /** Si esto es true no hace falta armadura de punzonamiento. */
  verifica: boolean;
  aprovechamiento: number;
}

export interface ResultadoArmaduraPunzonamiento {
  /** fywd,ef = 250 + 0,25d ≤ fywd, art. 6.4.5(1) (MPa). */
  fywdEfMPa: number;
  fywdMPa: number;
  /** Área de armadura por perímetro necesaria para llegar a vEd (mm²). */
  aswNecesariaMm2: number;
  /** Área de armadura por perímetro dispuesta (mm²). */
  aswRealMm2: number;
  vRdCsMPa: number;
  /** Techo kmáx·vRd,c: más allá de esto armar no sirve. */
  vRdCsTopeMPa: number;
  /** true si ni con armadura infinita se llega: vEd > 1,5·vRd,c. */
  fueraDeAlcance: boolean;
  verifica: boolean;
  aprovechamiento: number;
  /** uout,ef = βVEd/(vRd,c·d), ec. (6.54), en m. */
  uOutEfM: number;
  /** Distancia desde la cara del pilar a la que ese perímetro cae, m. */
  distUOutM: number;
  /** Hasta dónde hay que llegar con armadura: distUOut − 1,5d, ec. (6.54). */
  distUltimoPerimetroExigidaM: number;
  /** Hasta dónde llega la armadura dispuesta. */
  distUltimoPerimetroRealM: number;
  alcanzaUOut: boolean;
}

export interface ResultadoDetalladoPunzonamiento {
  /** Al menos dos perímetros de cercos, art. 9.4.3(1). */
  verificaNumeroPerimetros: boolean;
  srMaxM: number;
  verificaSr: boolean;
  /** st ≤ 1,5d dentro de u1, art. 9.4.3(1). */
  stMaxM: number;
  verificaSt: boolean;
  /** El primer perímetro no puede pasarse de d/2 de la cara, art. 9.4.3(4). */
  distPrimerPerimetroMaxM: number;
  verificaPrimerPerimetro: boolean;
  /** Asw,min de una rama, ec. (9.11) (mm²). */
  aswMinRamaMm2: number;
  aswRamaMm2: number;
  verificaAswMin: boolean;
}

/**
 * Todo lo que el croquis en planta necesita para dibujar el caso real, en las
 * mismas coordenadas (m) en las que se calculó el perímetro.
 *
 * Va acá y no en el componente porque el dibujo tiene que mostrar el perímetro
 * que se usó para el número. Recalcularlo del lado del SVG sería una segunda
 * fuente de verdad, y con el recorte contra el borde libre es justo donde más
 * fácil se desincroniza.
 */
export interface PlantaPunzonamiento {
  pilar: { x0: number; y0: number; x1: number; y1: number };
  /** Hay borde libre en x = 0 / en y = 0. */
  hayBordeX: boolean;
  hayBordeY: boolean;
  u1: PerimetroControl;
  /** null cuando el perímetro crítico verifica y no hay nada que armar. */
  uOut: PerimetroControl | null;
  /** Perímetros de armadura dispuestos, del más cercano al pilar al más lejano. */
  armadura: PerimetroControl[];
}

export interface ResultadoPunzonamiento {
  dM: number;
  beta: number;
  betaEsRecomendado: boolean;
  /** true cuando el pilar quedó tan lejos del borde que el perímetro cierra igual que uno interior. */
  perimetroCierraComoInterior: boolean;
  caraPilar: ResultadoCaraPilar;
  critico: ResultadoPerimetroCritico;
  planta: PlantaPunzonamiento;
  /** null cuando el perímetro crítico verifica solo y no hay nada que dimensionar. */
  armadura: ResultadoArmaduraPunzonamiento | null;
  detallado: ResultadoDetalladoPunzonamiento | null;
}

/** Área de una barra, mm². */
function areaBarraMm2(diametroMm: number): number {
  return (Math.PI * diametroMm ** 2) / 4;
}

/**
 * Cuantía geométrica de una malla de Ø/s referida al canto útil.
 *
 * ρ = As/(b·d) y con separación uniforme As/b es el área por metro, así que el
 * ancho se cancela: ρ = (Aφ/s)/d. Lo que sí importa del ancho es dónde tiene que
 * estar puesta esa armadura, y eso lo informa `anchoCuantiaC*M`.
 */
function cuantia(diametroMm: number, separacionM: number, dM: number): number {
  const asMm2PorM = areaBarraMm2(diametroMm) / separacionM;
  return asMm2PorM / (dM * 1000 * 1000);
}

/**
 * u0, perímetro sobre el que se comprueba la biela. Art. 6.4.5(3), pág. 96.
 *
 * En borde y esquina no es el perímetro del pilar: la norma lo topa porque la
 * biela no se puede desarrollar hacia el borde libre.
 */
function perimetroCaraPilar(
  posicion: PosicionPilar,
  c1M: number,
  c2M: number,
  dM: number
): { u0M: number; u0TopeM: number | null } {
  if (posicion === "interior") return { u0M: 2 * (c1M + c2M), u0TopeM: null };
  if (posicion === "borde") {
    const tope = c2M + 2 * c1M;
    return { u0M: Math.min(c2M + 3 * dM, tope), u0TopeM: tope };
  }
  const tope = c1M + c2M;
  return { u0M: Math.min(3 * dM, tope), u0TopeM: tope };
}

/**
 * Distancia desde la cara del pilar a la que un perímetro concéntrico mide
 * `longitudM`, invirtiendo la forma del perímetro de control.
 *
 * Para un pilar interior el perímetro a distancia a vale 2(c1+c2) + 2πa, que se
 * despeja directo. En borde y esquina no hay forma cerrada porque el recorte
 * contra el borde cambia con a, así que se busca por bisección sobre la misma
 * función que construye el perímetro: un solo modelo geométrico para el número y
 * para el dibujo.
 */
function distanciaParaPerimetro(
  longitudM: number,
  pilar: { x0: number; y0: number; x1: number; y1: number },
  recortaX: boolean,
  recortaY: boolean
): number {
  const largoEn = (a: number) => perimetroDeControl(pilar, a, recortaX, recortaY).longitudM;
  let bajo = 1e-6;
  let alto = 1;
  // El perímetro crece con la distancia, así que basta con estirar el techo
  // hasta pasarse una vez.
  while (largoEn(alto) < longitudM && alto < 1e3) alto *= 2;
  for (let i = 0; i < 60; i++) {
    const medio = (bajo + alto) / 2;
    if (largoEn(medio) < longitudM) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

export function calcularPunzonamiento(
  materiales: MaterialesPunzonamiento,
  geometria: GeometriaPunzonamiento,
  longitudinal: ArmaduraLongitudinalPunzonamiento,
  datos: DatosPunzonamiento,
  armadura: ArmaduraPunzonamientoDatos
): ResultadoPunzonamiento {
  const { fckMPa, fykMPa } = materiales;
  const { posicion, c1M, c2M, distBordeC1M, distBordeC2M } = geometria;

  // Canto útil único de la sección de control, ec. (6.32).
  const dM = (geometria.dYM + geometria.dZM) / 2;

  const beta = datos.betaManual ?? BETA_RECOMENDADO[posicion];
  const vEdKN = datos.vEdKN;

  // --- 1. Cara del pilar, ec. (6.53) ---
  const { u0M, u0TopeM } = perimetroCaraPilar(posicion, c1M, c2M, dM);
  // ν de la ec. (6.6), pág. 76, y vRd,max = 0,4·ν·fcd del art. 6.4.5(3).
  const nu = 0.6 * (1 - fckMPa / 250);
  const vRdMaxMPa = 0.4 * nu * (fckMPa / GAMMA_C);
  // kN/(m·m) → kPa → MPa: dividir por 1000.
  const vEdCaraMPa = (beta * vEdKN) / (u0M * dM) / 1000;

  // --- 2. Perímetro crítico a 2d ---
  // El borde sólo existe donde la posición dice que existe. En un pilar
  // interior no hay recorte por más que se haya cargado una distancia.
  const recortaX = posicion === "esquina";
  const recortaY = posicion !== "interior";
  // El eje y es el perpendicular al borde principal. Sin borde de un lado, la
  // coordenada es libre: se usa 2d sólo para que el pilar quede dentro del
  // cuadrante positivo y el dibujo no arranque en negativo.
  const pilarRect = {
    x0: recortaX ? distBordeC2M : 2 * dM,
    y0: recortaY ? distBordeC1M : 2 * dM,
    x1: (recortaX ? distBordeC2M : 2 * dM) + c2M,
    y1: (recortaY ? distBordeC1M : 2 * dM) + c1M,
  };
  // El eje y es el perpendicular al borde principal, así que el lado del pilar
  // que corre en y es c1 y el que corre en x es c2.
  const perimetro = perimetroDeControl(pilarRect, 2 * dM, recortaX, recortaY);
  const u1M = perimetro.longitudM;
  const u1InteriorM = perimetroDeControl(pilarRect, 2 * dM, false, false).longitudM;
  const perimetroCierraComoInterior = posicion !== "interior" && u1M >= u1InteriorM - 1e-9;

  const rhoLY = cuantia(longitudinal.diametroYMm, longitudinal.separacionYM, dM);
  const rhoLZ = cuantia(longitudinal.diametroZMm, longitudinal.separacionZM, dM);
  // ρl = √(ρly·ρlz) ≤ 0,02, ec. (6.47).
  const rhoL = Math.min(Math.sqrt(rhoLY * rhoLZ), 0.02);

  const k = factorEscalaK(dM);
  const vBaseMPa = tensionCortanteBase(k, rhoL, fckMPa);
  const vMinMPa = tensionCortanteMinima(k, fckMPa);
  const vRdCMPa = Math.max(vBaseMPa, vMinMPa);
  const vEdCriticoMPa = (beta * vEdKN) / (u1M * dM) / 1000;

  const critico: ResultadoPerimetroCritico = {
    perimetro,
    u1M,
    rhoLY,
    rhoLZ,
    rhoL,
    anchoCuantiaC1M: c1M + 6 * dM,
    anchoCuantiaC2M: c2M + 6 * dM,
    k,
    vMinMPa,
    vRdCMPa,
    gobiernaVMin: vMinMPa > vBaseMPa,
    vEdMPa: vEdCriticoMPa,
    verifica: vEdCriticoMPa <= vRdCMPa,
    aprovechamiento: vRdCMPa > 0 ? vEdCriticoMPa / vRdCMPa : Infinity,
  };

  const caraPilar: ResultadoCaraPilar = {
    u0M,
    u0TopeM,
    vEdMPa: vEdCaraMPa,
    nu,
    vRdMaxMPa,
    verifica: vEdCaraMPa <= vRdMaxMPa,
    aprovechamiento: vRdMaxMPa > 0 ? vEdCaraMPa / vRdMaxMPa : Infinity,
  };

  if (critico.verifica) {
    return {
      dM,
      beta,
      betaEsRecomendado: datos.betaManual === null,
      perimetroCierraComoInterior,
      caraPilar,
      critico,
      planta: {
        pilar: pilarRect,
        hayBordeX: recortaX,
        hayBordeY: recortaY,
        u1: perimetro,
        uOut: null,
        armadura: [],
      },
      armadura: null,
      detallado: null,
    };
  }

  // --- 3. Armadura de punzonamiento, ec. (6.52) ---
  const fywdMPa = fykMPa / GAMMA_S;
  // fywd,ef = 250 + 0,25d con d en mm: el acero de punzonado no llega a plastificar
  // porque la fisura es corta y el anclaje queda dentro del canto de la losa.
  const fywdEfMPa = Math.min(250 + 0.25 * dM * 1000, fywdMPa);
  const senAlpha = Math.sin((armadura.alphaGrados * Math.PI) / 180);

  const vRdCsTopeMPa = K_MAX_ARMADURA * vRdCMPa;
  const fueraDeAlcance = vEdCriticoMPa > vRdCsTopeMPa;

  // Despeje de la (6.52) para el Asw que hace falta por perímetro:
  //   vEd = 0,75·vRd,c + 1,5·(d/sr)·Asw·fywd,ef·(1/(u1·d))·sen α
  const factorArmadura =
    (1.5 * (dM / armadura.srM) * fywdEfMPa * senAlpha) / (u1M * dM * 1e6);
  const aswNecesariaMm2 =
    factorArmadura > 0 ? Math.max(vEdCriticoMPa - 0.75 * vRdCMPa, 0) / factorArmadura : Infinity;

  const aswRealMm2 = areaBarraMm2(armadura.diametroMm) * armadura.ramasPorPerimetro;
  const vRdCsSinTopeMPa = 0.75 * vRdCMPa + factorArmadura * aswRealMm2;
  const vRdCsMPa = Math.min(vRdCsSinTopeMPa, vRdCsTopeMPa);

  // --- uout,ef, ec. (6.54) ---
  const uOutEfM = (beta * vEdKN) / (vRdCMPa * dM) / 1000;
  const distUOutM = distanciaParaPerimetro(uOutEfM, pilarRect, recortaX, recortaY);
  // El último perímetro armado tiene que caer a 1,5d o menos por dentro de uout.
  const distUltimoPerimetroExigidaM = Math.max(distUOutM - 1.5 * dM, 0);
  const distUltimoPerimetroRealM =
    armadura.distPrimerPerimetroM + (armadura.numeroPerimetros - 1) * armadura.srM;

  const armaduraResultado: ResultadoArmaduraPunzonamiento = {
    fywdEfMPa,
    fywdMPa,
    aswNecesariaMm2,
    aswRealMm2,
    vRdCsMPa,
    vRdCsTopeMPa,
    fueraDeAlcance,
    verifica: !fueraDeAlcance && vEdCriticoMPa <= vRdCsMPa,
    aprovechamiento: vRdCsMPa > 0 ? vEdCriticoMPa / vRdCsMPa : Infinity,
    uOutEfM,
    distUOutM,
    distUltimoPerimetroExigidaM,
    distUltimoPerimetroRealM,
    alcanzaUOut: distUltimoPerimetroRealM >= distUltimoPerimetroExigidaM,
  };

  // --- 4. Detalles de armado, art. 9.4.3 ---
  const aswRamaMm2 = areaBarraMm2(armadura.diametroMm);
  const cosAlpha = Math.cos((armadura.alphaGrados * Math.PI) / 180);
  // Ec. (9.11): Asw,min·(1,5·sen α + cos α)/(sr·st) ≥ 0,08·√fck/fyk, con sr y st
  // en mm para que Asw salga en mm².
  const aswMinRamaMm2 =
    ((0.08 * Math.sqrt(fckMPa)) / fykMPa) *
    ((armadura.srM * 1000 * armadura.stM * 1000) / (1.5 * senAlpha + cosAlpha));

  const detallado: ResultadoDetalladoPunzonamiento = {
    verificaNumeroPerimetros: armadura.numeroPerimetros >= 2,
    srMaxM: 0.75 * dM,
    verificaSr: armadura.srM <= 0.75 * dM,
    stMaxM: 1.5 * dM,
    verificaSt: armadura.stM <= 1.5 * dM,
    distPrimerPerimetroMaxM: 0.5 * dM,
    verificaPrimerPerimetro: armadura.distPrimerPerimetroM <= 0.5 * dM,
    aswMinRamaMm2,
    aswRamaMm2,
    verificaAswMin: aswRamaMm2 >= aswMinRamaMm2,
  };

  const perimetrosArmadura = Array.from({ length: Math.max(armadura.numeroPerimetros, 0) }, (_, i) =>
    perimetroDeControl(
      pilarRect,
      armadura.distPrimerPerimetroM + i * armadura.srM,
      recortaX,
      recortaY
    )
  );

  return {
    dM,
    beta,
    betaEsRecomendado: datos.betaManual === null,
    perimetroCierraComoInterior,
    caraPilar,
    critico,
    planta: {
      pilar: pilarRect,
      hayBordeX: recortaX,
      hayBordeY: recortaY,
      u1: perimetro,
      uOut: perimetroDeControl(pilarRect, distUOutM, recortaX, recortaY),
      armadura: perimetrosArmadura,
    },
    armadura: armaduraResultado,
    detallado,
  };
}
