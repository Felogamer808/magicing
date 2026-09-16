import { moduloSecanteGPa } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Control de deformaciones en Estado Límite de Servicio —
 * Anejo 19, art. 7.4, págs. 117-120.
 *
 * El articulado da dos caminos y acá están los dos, porque responden preguntas
 * distintas:
 *
 *  - art. 7.4.2: limitar la relación luz/canto. No calcula ninguna flecha: dice
 *    si el elemento es lo bastante peraltado como para poder omitir el cálculo.
 *    Es el chequeo de predimensionado.
 *  - art. 7.4.3: calcular la flecha e ir contra un límite. Interpola entre
 *    sección sin fisurar y fisurada con ζ, usa el módulo efectivo para meter la
 *    fluencia y suma la curvatura de retracción.
 *
 * Los dos trabajan en combinación **cuasipermanente**: art. 7.4.1(4) y (5).
 */

// ---------------------------------------------------------------------------
// art. 7.4.2 — relación luz/canto
// ---------------------------------------------------------------------------

export type SistemaEstructural =
  | "simplemente-apoyada"
  | "extremo-continua"
  | "vano-interior"
  | "losa-plana"
  | "voladizo";

/**
 * K de la tabla A19.7.4, pág. 118. Es el único sitio donde entra el esquema
 * estático en el método simplificado: multiplica de lleno a l/d, así que
 * equivocarse de fila cambia el resultado en la misma proporción.
 */
export const K_SISTEMA: Record<SistemaEstructural, number> = {
  "simplemente-apoyada": 1.0,
  "extremo-continua": 1.3,
  "vano-interior": 1.5,
  "losa-plana": 1.2,
  voladizo: 0.4,
};

export const NOMBRE_SISTEMA: Record<SistemaEstructural, string> = {
  "simplemente-apoyada": "Viga o losa simplemente apoyada",
  "extremo-continua": "Extremo de vano continuo",
  "vano-interior": "Vano interior",
  "losa-plana": "Losa apoyada en pilares (losa plana)",
  voladizo: "Voladizo",
};

export interface DatosLuzCanto {
  sistema: SistemaEstructural;
  /** Luz efectiva leff (m), art. 5.3.2.2(1) */
  luzEfM: number;
  /** Canto útil (m) */
  dM: number;
  fckMPa: number;
  fykMPa: number;
  /** Cuantía geométrica de tracción en centro de vano, ρ = As/(b·d) */
  rho: number;
  /** Cuantía geométrica de compresión ρ' (0 si no hay) */
  rhoComp: number;
  /** Armadura necesaria en ELU (cm²) */
  asReqCm2: number;
  /** Armadura realmente dispuesta (cm²) */
  asProvCm2: number;
  /** Sección en T o cajón con ala/alma > 3 */
  alaAnchaEnT: boolean;
  /** Soporta tabiques susceptibles de dañarse por deformación */
  soportaTabiques: boolean;
}

export interface ResultadoLuzCanto {
  k: number;
  /** Cuantía de referencia ρ0 = 10⁻³·√fck */
  rho0: number;
  /** True si mandó la (7.16.b), es decir ρ > ρ0 */
  usaRamaArmada: boolean;
  /** l/d de la ec. (7.16), antes de correcciones */
  ldBase: number;
  /** 310/σs de la ec. (7.17) */
  factorTension: number;
  /** 0,8 para ala ancha en T, 1 si no */
  factorAla: number;
  /** 7/leff u 8,5/leff para luces grandes con tabiques, 1 si no aplica */
  factorLuzLarga: number;
  /** l/d admisible, ya con las tres correcciones */
  ldAdm: number;
  /** l/d real del elemento */
  ldReal: number;
  verifica: boolean;
}

export function calcularLuzCanto(datos: DatosLuzCanto): ResultadoLuzCanto {
  const {
    sistema, luzEfM, dM, fckMPa, fykMPa, rho, rhoComp,
    asReqCm2, asProvCm2, alaAnchaEnT, soportaTabiques,
  } = datos;

  const k = K_SISTEMA[sistema];
  const raizFck = Math.sqrt(fckMPa);
  const rho0 = 1e-3 * raizFck;

  // La rama se elige por ρ contra ρ0, no por si hay armadura de compresión:
  // la (7.16.b) es la de secciones muy armadas, donde ρ' ayuda de verdad.
  const usaRamaArmada = rho > rho0;
  const ldBase = usaRamaArmada
    ? // ec. (7.16.b). El denominador ρ−ρ' se satura en ρ0 si la compresión es
      // tan grande que lo deja por debajo: si no, la expresión se dispara y
      // devuelve un l/d admisible sin sentido físico.
      k *
      (11 +
        (1.5 * raizFck * rho0) / Math.max(rho - rhoComp, rho0) +
        (1 / 12) * raizFck * Math.sqrt(rhoComp / rho0))
    : // ec. (7.16.a)
      k * (11 + (1.5 * raizFck * rho0) / rho + 3.2 * raizFck * (rho0 / rho - 1) ** 1.5);

  // ec. (7.17): 310/σs ≈ 500/(fyk·As,req/As,prov). El Anejo no le pone tope —
  // algunos anejos nacionales lo limitan a 1,5—, así que se deja sin topar y se
  // muestra el valor, que es lo que permite darse cuenta si quedó alto.
  const relacionArmaduras = asReqCm2 > 0 && asProvCm2 > 0 ? asReqCm2 / asProvCm2 : 1;
  const factorTension = fykMPa > 0 ? 500 / (fykMPa * relacionArmaduras) : 1;

  const factorAla = alaAnchaEnT ? 0.8 : 1;

  // Las dos correcciones por luz grande son excluyentes: la de 8,5 m es la de
  // losas planas, la de 7 m es para todo lo demás. Sólo entran si hay tabiques
  // que se puedan dañar; sin ellos, el articulado no las pide.
  const esLosaPlana = sistema === "losa-plana";
  const luzUmbralM = esLosaPlana ? 8.5 : 7;
  const factorLuzLarga =
    soportaTabiques && luzEfM > luzUmbralM ? luzUmbralM / luzEfM : 1;

  const ldAdm = ldBase * factorTension * factorAla * factorLuzLarga;
  const ldReal = dM > 0 ? luzEfM / dM : Infinity;

  return {
    k, rho0, usaRamaArmada, ldBase,
    factorTension, factorAla, factorLuzLarga,
    ldAdm, ldReal,
    verifica: ldReal <= ldAdm,
  };
}

// ---------------------------------------------------------------------------
// art. 7.4.3 — flecha calculada
// ---------------------------------------------------------------------------

/**
 * Coeficiente k de a = k·L²·(1/r): convierte la curvatura de la sección crítica
 * en flecha. Sólo se listan los casos de valor exacto conocido; para esquemas
 * intermedios (vano extremo de una continua, por ejemplo) el coeficiente
 * depende del grado de empotramiento real y hay que cargarlo a mano.
 */
export const COEF_FLECHA: { id: string; nombre: string; valor: number }[] = [
  { id: "apoyada-uniforme", nombre: "Simplemente apoyada · carga uniforme", valor: 5 / 48 },
  { id: "apoyada-puntual", nombre: "Simplemente apoyada · puntual centrada", valor: 1 / 12 },
  { id: "empotrada-uniforme", nombre: "Biempotrada · carga uniforme", valor: 1 / 16 },
  { id: "voladizo-uniforme", nombre: "Voladizo · carga uniforme", valor: 1 / 4 },
  { id: "voladizo-puntual", nombre: "Voladizo · puntual en punta", valor: 1 / 3 },
];

export interface DatosFlecha {
  bM: number;
  hM: number;
  /** Canto útil de la armadura traccionada (m) */
  dM: number;
  /** Distancia de la fibra más comprimida a la armadura de compresión (m) */
  dCompM: number;
  /** Armadura de tracción (cm²) */
  asCm2: number;
  /** Armadura de compresión (cm²) */
  asCompCm2: number;
  fckMPa: number;
  fctmMPa: number;
  esGPa: number;
  /** Coeficiente de fluencia φ(∞,t0), art. 3.1.4 */
  phiFluencia: number;
  /** Deformación de retracción εcs, art. 3.1.4 (p.ej. 0,0003) */
  epsilonCs: number;
  /** Momento en combinación cuasipermanente (kN·m) */
  mqpKNm: number;
  /** Luz del vano (m) — en voladizo, el vuelo */
  luzM: number;
  /** Coeficiente k de a = k·L²·(1/r) */
  coefFlecha: number;
}

/** Propiedades de una sección homogeneizada, en un estado de fisuración. */
export interface EstadoSeccion {
  /** Profundidad de la fibra neutra desde la cara comprimida (m) */
  xM: number;
  /** Inercia homogeneizada (m⁴) */
  iM4: number;
  /** Momento estático de la armadura respecto al cdg, ec. (7.21) (m³) */
  sM3: number;
}

export interface ResultadoFlecha {
  /** Módulo secante Ecm (GPa) */
  ecmGPa: number;
  /** Módulo efectivo Ec,eff = Ecm/(1+φ), ec. (7.20) (GPa) */
  ecEffGPa: number;
  /** Relación de módulos efectiva αe = Es/Ec,eff */
  alphaE: number;
  /** Relación de módulos instantánea Es/Ecm */
  alphaECorto: number;
  sinFisurar: EstadoSeccion;
  fisurada: EstadoSeccion;
  /** Momento de fisuración Mcr = fctm·I_I/(h−x_I) (kN·m) */
  mcrKNm: number;
  /** ζ de la ec. (7.19); 0 si la sección no llega a fisurar */
  zeta: number;
  fisura: boolean;
  /** Curvatura de flexión interpolada, ec. (7.18) (1/m) */
  curvaturaFlexion: number;
  /** Curvatura de retracción interpolada, ec. (7.21) (1/m) */
  curvaturaRetraccion: number;
  /** Curvatura total (1/m) */
  curvaturaTotal: number;
  /** Flecha instantánea, con Ecm y β=1 (mm) */
  flechaInstantaneaMm: number;
  /** Flecha total a tiempo infinito, con fluencia y retracción (mm) */
  flechaTotalMm: number;
  /** Flecha diferida = total − instantánea (mm) */
  flechaDiferidaMm: number;
  /** Límite de apariencia L/250, art. 7.4.1(4) (mm) */
  limiteAparienciaMm: number;
  /** Límite de daño a elementos adyacentes L/500, art. 7.4.1(5) (mm) */
  limiteDanioMm: number;
  verificaApariencia: boolean;
  verificaDanio: boolean;
  verifica: boolean;
}

/**
 * Sección rectangular homogeneizada sin fisurar (estado I): entra todo el
 * hormigón, y la armadura pesa (αe−1) porque el hormigón que ocupa ya está
 * contado en b·h.
 */
function estadoSinFisurar(
  bM: number, hM: number, dM: number, dCompM: number,
  asM2: number, asCompM2: number, alphaE: number
): EstadoSeccion {
  const nMenosUno = alphaE - 1;
  const area = bM * hM + nMenosUno * (asM2 + asCompM2);
  const momentoEstatico =
    (bM * hM * hM) / 2 + nMenosUno * (asM2 * dM + asCompM2 * dCompM);
  const xM = area > 0 ? momentoEstatico / area : 0;

  const iM4 =
    (bM * hM ** 3) / 12 +
    bM * hM * (xM - hM / 2) ** 2 +
    nMenosUno * asM2 * (dM - xM) ** 2 +
    nMenosUno * asCompM2 * (xM - dCompM) ** 2;

  // S de la ec. (7.21): momento estático de la ARMADURA respecto al cdg de la
  // sección. La de compresión resta, porque está del otro lado del centro de
  // gravedad y su retracción coartada curva al revés.
  const sM3 = asM2 * (dM - xM) - asCompM2 * (xM - dCompM);

  return { xM, iM4, sM3 };
}

/**
 * Sección fisurada (estado II): el hormigón traccionado no cuenta. La fibra
 * neutra sale de igualar momentos estáticos respecto de ella,
 * b·x²/2 + (αe−1)·As'·(x−d') = αe·As·(d−x).
 */
function estadoFisurado(
  bM: number, dM: number, dCompM: number,
  asM2: number, asCompM2: number, alphaE: number
): EstadoSeccion {
  const a = bM / 2;
  const b = (alphaE - 1) * asCompM2 + alphaE * asM2;
  const c = -((alphaE - 1) * asCompM2 * dCompM + alphaE * asM2 * dM);
  const xM = a > 0 ? (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a) : 0;

  const iM4 =
    (bM * xM ** 3) / 3 +
    (alphaE - 1) * asCompM2 * (xM - dCompM) ** 2 +
    alphaE * asM2 * (dM - xM) ** 2;

  const sM3 = asM2 * (dM - xM) - asCompM2 * (xM - dCompM);

  return { xM, iM4, sM3 };
}

/**
 * β de la ec. (7.19): 0,5 con carga mantenida, 1,0 con carga instantánea. La
 * flecha a largo plazo va con 0,5 (la colaboración del hormigón entre fisuras
 * se degrada); la instantánea, con 1,0.
 */
const BETA_MANTENIDA = 0.5;
const BETA_INSTANTANEA = 1.0;

export function calcularFlecha(datos: DatosFlecha): ResultadoFlecha {
  const {
    bM, hM, dM, dCompM, asCm2, asCompCm2,
    fckMPa, fctmMPa, esGPa, phiFluencia, epsilonCs,
    mqpKNm, luzM, coefFlecha,
  } = datos;

  const asM2 = asCm2 / 1e4;
  const asCompM2 = asCompCm2 / 1e4;

  const ecmGPa = moduloSecanteGPa(fckMPa);
  // ec. (7.20): la fluencia se mete ablandando el hormigón, no tocando la carga.
  const ecEffGPa = ecmGPa / (1 + phiFluencia);
  const alphaE = esGPa / ecEffGPa;
  const alphaECorto = esGPa / ecmGPa;

  // Largo plazo: homogeneizado con αe efectivo (el hormigón fluye, el acero no,
  // así que la armadura pesa más que a tiempo cero).
  const sinFisurar = estadoSinFisurar(bM, hM, dM, dCompM, asM2, asCompM2, alphaE);
  const fisurada = estadoFisurado(bM, dM, dCompM, asM2, asCompM2, alphaE);

  // Mcr con el módulo resistente de la sección sin fisurar, fibra traccionada.
  // fctm en MPa = MN/m², y el momento sale en MN·m: ×1000 para kN·m.
  const wM3 = hM > sinFisurar.xM ? sinFisurar.iM4 / (hM - sinFisurar.xM) : 0;
  const mcrKNm = fctmMPa * wM3 * 1000;

  const fisura = mqpKNm > mcrKNm && mcrKNm > 0;
  // ec. (7.19) con Mcr/M en lugar de σsr/σs (NOTA del art. 7.4.3(3)).
  const zeta = fisura ? 1 - BETA_MANTENIDA * (mcrKNm / mqpKNm) ** 2 : 0;

  // Curvaturas de flexión: M/(E·I) en cada estado, con E en MPa=MN/m² y M en
  // MN·m, da 1/m directo.
  const mqpMNm = mqpKNm / 1000;
  const ecEffMPa = ecEffGPa * 1000;
  const curvaturaI = sinFisurar.iM4 > 0 ? mqpMNm / (ecEffMPa * sinFisurar.iM4) : 0;
  const curvaturaII = fisurada.iM4 > 0 ? mqpMNm / (ecEffMPa * fisurada.iM4) : 0;
  // ec. (7.18)
  const curvaturaFlexion = zeta * curvaturaII + (1 - zeta) * curvaturaI;

  // ec. (7.21) en los dos estados, interpolada con la misma (7.18).
  const curvaturaRetraccionI =
    sinFisurar.iM4 > 0 ? (epsilonCs * alphaE * sinFisurar.sM3) / sinFisurar.iM4 : 0;
  const curvaturaRetraccionII =
    fisurada.iM4 > 0 ? (epsilonCs * alphaE * fisurada.sM3) / fisurada.iM4 : 0;
  const curvaturaRetraccion =
    zeta * curvaturaRetraccionII + (1 - zeta) * curvaturaRetraccionI;

  const curvaturaTotal = curvaturaFlexion + curvaturaRetraccion;
  const flechaTotalMm = coefFlecha * luzM ** 2 * curvaturaTotal * 1000;

  // Instantánea: mismo planteo pero sin fluencia (Ecm) ni retracción, y con
  // β=1. Hace falta para la flecha diferida, que es la que va contra L/500.
  const sinFisurarCorto = estadoSinFisurar(bM, hM, dM, dCompM, asM2, asCompM2, alphaECorto);
  const fisuradaCorto = estadoFisurado(bM, dM, dCompM, asM2, asCompM2, alphaECorto);
  const wCortoM3 =
    hM > sinFisurarCorto.xM ? sinFisurarCorto.iM4 / (hM - sinFisurarCorto.xM) : 0;
  const mcrCortoKNm = fctmMPa * wCortoM3 * 1000;
  const zetaCorto =
    mqpKNm > mcrCortoKNm && mcrCortoKNm > 0
      ? 1 - BETA_INSTANTANEA * (mcrCortoKNm / mqpKNm) ** 2
      : 0;
  const ecmMPa = ecmGPa * 1000;
  const curvaturaCortoI =
    sinFisurarCorto.iM4 > 0 ? mqpMNm / (ecmMPa * sinFisurarCorto.iM4) : 0;
  const curvaturaCortoII =
    fisuradaCorto.iM4 > 0 ? mqpMNm / (ecmMPa * fisuradaCorto.iM4) : 0;
  const curvaturaCorto = zetaCorto * curvaturaCortoII + (1 - zetaCorto) * curvaturaCortoI;
  const flechaInstantaneaMm = coefFlecha * luzM ** 2 * curvaturaCorto * 1000;

  // Flecha diferida: lo que le queda por bajar al elemento DESPUÉS de la flecha
  // instantánea. Tomarla como total − instantánea equivale a suponer que los
  // tabiques se levantan apenas desencofrado, con la instantánea ya producida;
  // es la hipótesis habitual y del lado de la seguridad. Si se construyen más
  // tarde, la parte que los daña es menor.
  const flechaDiferidaMm = Math.max(flechaTotalMm - flechaInstantaneaMm, 0);

  const limiteAparienciaMm = (luzM / 250) * 1000;
  const limiteDanioMm = (luzM / 500) * 1000;
  const verificaApariencia = flechaTotalMm <= limiteAparienciaMm;
  const verificaDanio = flechaDiferidaMm <= limiteDanioMm;

  return {
    ecmGPa, ecEffGPa, alphaE, alphaECorto,
    sinFisurar, fisurada, mcrKNm, zeta, fisura,
    curvaturaFlexion, curvaturaRetraccion, curvaturaTotal,
    flechaInstantaneaMm, flechaTotalMm, flechaDiferidaMm,
    limiteAparienciaMm, limiteDanioMm,
    verificaApariencia, verificaDanio,
    verifica: verificaApariencia && verificaDanio,
  };
}
