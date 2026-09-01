/**
 * Uniones abulonadas — AISC 360-22, artículo J3, por el método ASD, igual que
 * el resto de los módulos AISC de este repositorio. Se cubren conexiones de
 * contacto (no *slip-critical*), que son las de uso corriente en edificación
 * de baja altura.
 *
 * Un bulón puede fallar de tres maneras distintas, y las tres hay que
 * comprobarlas porque cualquiera puede gobernar según el espesor de las
 * chapas y el diámetro elegido:
 *
 * - **Corte del vástago (J3-1)**: depende sólo del bulón —diámetro y grado—,
 *   no de las chapas que conecta.
 * - **Aplastamiento u arrancamiento de la chapa (J3-6)**: depende de la
 *   chapa —espesor, Fu, distancia al borde— y no del grado del bulón. Con
 *   chapas de distinto espesor conviene revisar las dos: la más fina, o la
 *   de menor distancia al borde, suele ser la crítica.
 * - **Bloque de corte (J4-5)**: un modo de falla local en el extremo de la
 *   pieza conectada, que combina rotura por corte en un plano con rotura por
 *   tracción en el plano perpendicular.
 *
 * También se cubren las conexiones *slip-critical* del art. J3.8: además de
 * los estados límite de contacto de arriba —que siguen aplicando, porque si
 * la unión desliza termina apoyando en aplastamiento igual—, se agrega la
 * verificación de deslizamiento en sí.
 */

/** Coeficiente de seguridad ASD compartido: todos los φ = 0,75 de este capítulo emparejan con Ω = 1,5/0,75 = 2,00. */
export const OMEGA_J = 2.0;

export type GradoBulon = "A307" | "A325";

/** Tabla J3.2. Fnv no excluye hilos del plano de corte —el caso general y más desfavorable—. */
const FNV_PA: Record<GradoBulon, number> = { A307: 186e6, A325: 372e6 };
const FNT_PA: Record<GradoBulon, number> = { A307: 310e6, A325: 620e6 };

/** Área nominal del bulón, con el diámetro nominal —no el de raíz de rosca—. */
export function areaBulonM2(diametroMm: number): number {
  return (Math.PI * (diametroMm / 1000) ** 2) / 4;
}

/** Ec. (J3-1): Rn = Fnv·Ab, por bulón y por plano de corte. */
export function resistenciaCorteBulonKN(diametroMm: number, grado: GradoBulon): number {
  return (FNV_PA[grado] * areaBulonM2(diametroMm)) / 1000;
}

/** Forma en tracción de la ec. (J3-1): Rn = Fnt·Ab. */
export function resistenciaTraccionBulonKN(diametroMm: number, grado: GradoBulon): number {
  return (FNT_PA[grado] * areaBulonM2(diametroMm)) / 1000;
}

/* ------------------------------------------------------------------ *
 * Interacción tracción-corte de un mismo bulón, art. J3.7
 * ------------------------------------------------------------------ */

/**
 * Ec. (J3-3b): tensión de tracción nominal reducida por la presencia
 * simultánea de corte, forma ASD.
 *
 * F'nt = 1,3·Fnt − (Ω·fv/Fnv)·Fnt ≤ Fnt
 *
 * `fvPa` es la tensión de corte **requerida** en el vástago —la solicitación
 * real, de cargas de servicio—, no la admisible. El apunte sólo trae la
 * forma LRFD, ec. (J3-3a): F'nt = 1,3·Fnt − fv(Fnt/φFnv) ≤ Fnt con φ = 0,75.
 * La forma ASD (J3-3b) de la propia norma AISC 360 reemplaza fv/φ por Ω·fv:
 * son las dos caras de la misma ecuación, la que compara contra φFnv y la
 * que compara contra Fnv/Ω, igual que en todo el resto de este capítulo. Por
 * debajo de fv = 0,3·Fnv/Ω no hay penalización —F'nt topa en Fnt—, tal como
 * muestra el tramo plano del diagrama de interacción del apunte (figura
 * 8.16, con el quiebre en 0,3·φFnt / 0,3·φFnv).
 *
 * La resistencia de corte del bulón no se reduce: la interacción sólo
 * penaliza la tracción.
 */
export function fntReducidaPorCortePa(fntPa: number, fnvPa: number, fvPa: number): number {
  const reducida = 1.3 * fntPa - ((OMEGA_J * fvPa) / fnvPa) * fntPa;
  return Math.max(0, Math.min(reducida, fntPa));
}

export interface ResultadoInteraccionTraccionCorte {
  /** Tensión de corte requerida en el vástago, Pa. */
  fvReqPa: number;
  /** Fnt reducida por la ec. (J3-3b), Pa. */
  fntReducidaPa: number;
  /** Rn = F'nt·Ab, kN. */
  nominalKN: number;
  admisibleKN: number;
}

/**
 * Resuelve la ec. (J3-3b) a partir del corte requerido en el bulón, en kN
 * —el mismo dato que ya exige el reparto elástico del grupo—, no de la
 * tensión directamente.
 */
export function interaccionTraccionCorteKN(opciones: {
  diametroMm: number;
  grado: GradoBulon;
  vReqKN: number;
  planosDeCorte: number;
}): ResultadoInteraccionTraccionCorte {
  const { diametroMm, grado, vReqKN, planosDeCorte } = opciones;
  const abM2 = areaBulonM2(diametroMm);
  const fvReqPa = (vReqKN * 1000) / (abM2 * planosDeCorte);
  const fntReducidaPa = fntReducidaPorCortePa(FNT_PA[grado], FNV_PA[grado], fvReqPa);
  const nominalKN = (fntReducidaPa * abM2) / 1000;
  return { fvReqPa, fntReducidaPa, nominalKN, admisibleKN: nominalKN / OMEGA_J };
}

/* ------------------------------------------------------------------ *
 * Deslizamiento en conexiones slip-critical, art. J3.8
 * ------------------------------------------------------------------ */

export type ClaseSuperficie = "A" | "B";

/** Coeficiente de fricción medio, según el tratamiento superficial (art. J3.8). */
const MU_CLASE: Record<ClaseSuperficie, number> = { A: 0.3, B: 0.5 };

export type TipoAgujeroDeslizamiento = "estandar" | "agrandado" | "ranuraAlargada";

/**
 * φ de la tabla del art. J3.8, según el tipo de agujero —agujeros
 * agrandados o ranura corta paralela a la fuerza comparten el mismo φ—.
 * Ω = 1,5/φ, la misma conversión de siempre entre las dos formas.
 */
const PHI_DESLIZAMIENTO: Record<TipoAgujeroDeslizamiento, number> = {
  estandar: 1.0,
  agrandado: 0.85,
  ranuraAlargada: 0.7,
};

/**
 * Du: multiplicador que corrige la pretensión mínima especificada a un
 * valor medio al instalar. Es una constante fija de la norma (AISC 360-22
 * J3.8), no depende del bulón, la clase de superficie ni el tipo de agujero.
 */
export const DU_DESLIZAMIENTO = 1.13;

/**
 * hf: factor por chapas de relleno (*fillers*) entre las piezas conectadas.
 * 1,0 sin relleno o con una sola chapa de relleno; 0,85 con dos o más.
 */
export function factorRelleno(chapasDeRelleno: number): number {
  return chapasDeRelleno >= 2 ? 0.85 : 1.0;
}

export interface ResultadoDeslizamiento {
  omega: number;
  /** Rn = μ·Du·hf·Tb·ns, ec. (J3-4), kN. */
  nominalKN: number;
  admisibleKN: number;
}

/**
 * Ec. (J3-4): resistencia a deslizamiento de un bulón en una conexión
 * *slip-critical*, Rn = μ·Du·hf·Tb·ns.
 *
 * `tbKN` es la pretensión mínima especificada del bulón, de la Tabla J3.1 de
 * la norma —no de este apunte, que sólo la menciona sin dar los valores—.
 * No se hardcodea acá: varía con diámetro y grado, y no hay una fuente
 * confiable de esos valores en métrico para no arriesgar un número de tabla
 * mal transcripto en un cálculo estructural. Se carga como dato, igual que
 * ya se hace en este módulo con el Fy del bloque de corte.
 *
 * Esta verificación se agrega a las de contacto —corte del vástago,
 * aplastamiento y arrancamiento—, no las reemplaza: si la unión llega a
 * deslizar, pasa a apoyar en aplastamiento igual, así que ese estado límite
 * sigue siendo necesario como respaldo.
 */
export function resistenciaDeslizamientoKN(opciones: {
  clase: ClaseSuperficie;
  tipoAgujero: TipoAgujeroDeslizamiento;
  tbKN: number;
  planosDeFriccion: number;
  chapasDeRelleno?: number;
}): ResultadoDeslizamiento {
  const { clase, tipoAgujero, tbKN, planosDeFriccion, chapasDeRelleno = 0 } = opciones;
  const omega = 1.5 / PHI_DESLIZAMIENTO[tipoAgujero];
  const nominalKN = MU_CLASE[clase] * DU_DESLIZAMIENTO * factorRelleno(chapasDeRelleno) * tbKN * planosDeFriccion;
  return { omega, nominalKN, admisibleKN: nominalKN / omega };
}

export interface ResultadoAplastamiento {
  /** Rn de aplastamiento, ec. (J3-6a) o (J3-6b) según el control de deformaciones. */
  aplastamientoKN: number;
  /** Rn de arrancamiento, ec. (J3-6c) o (J3-6d). */
  arrancamientoKN: number;
  /** El menor de los dos: el que gobierna esta chapa. */
  gobiernaKN: number;
  gobierna: "aplastamiento" | "arrancamiento";
}

/**
 * Resistencia de la chapa en la ec. (J3-6): el menor entre aplastamiento y
 * arrancamiento.
 *
 * `deformacionControlada` es la condición habitual —agujeros estándar, sin un
 * límite de servicio en la deformación del agujero— y da los coeficientes más
 * altos (2,4 y 1,2). La rama sin controlar (3,0 y 1,5) exige menos margen de
 * deformación pero es menos frecuente en la práctica de edificación.
 */
export function resistenciaChapaKN(opciones: {
  diametroMm: number;
  espesorMm: number;
  /** Distancia libre del agujero al borde de chapa o al agujero más cercano, en la dirección de la fuerza. */
  distanciaLibreMm: number;
  fuPa: number;
  deformacionControlada: boolean;
}): ResultadoAplastamiento {
  const { diametroMm: d, espesorMm: t, distanciaLibreMm: lc, fuPa, deformacionControlada } = opciones;
  const tM2 = t / 1000; // el producto d·t o lc·t se arma en metros para que el resultado salga en N sobre 1000 = kN
  const dM = d / 1000;
  const lcM = lc / 1000;

  const aplastamientoKN = ((deformacionControlada ? 2.4 : 3.0) * dM * tM2 * fuPa) / 1000;
  const arrancamientoKN = ((deformacionControlada ? 1.2 : 1.5) * lcM * tM2 * fuPa) / 1000;

  const gobiernaAplastamiento = aplastamientoKN <= arrancamientoKN;
  return {
    aplastamientoKN,
    arrancamientoKN,
    gobiernaKN: gobiernaAplastamiento ? aplastamientoKN : arrancamientoKN,
    gobierna: gobiernaAplastamiento ? "aplastamiento" : "arrancamiento",
  };
}

export interface ResultadoBulon {
  resistenciaCorteKN: number;
  resistenciaChapas: ResultadoAplastamiento[];
  /** El menor entre corte del vástago y aplastamiento/arrancamiento de todas las chapas. */
  nominalKN: number;
  modoDeFalla: "corte del vástago" | "chapa";
  admisibleKN: number;
}

/**
 * Resistencia de un bulón, considerando el vástago y cada chapa que atraviesa.
 *
 * Se pasan una o más chapas porque una unión de contacto típica tiene al
 * menos dos —la que se conecta y la chapa o perfil que la recibe—, y cada una
 * puede tener espesor, Fu o distancia al borde distintos. Gobierna la que dé
 * la resistencia más chica, no necesariamente la primera de la lista.
 */
export function resistenciaBulonKN(opciones: {
  diametroMm: number;
  grado: GradoBulon;
  planosDeCorte: number;
  chapas: Array<{
    espesorMm: number;
    distanciaLibreMm: number;
    fuPa: number;
    deformacionControlada: boolean;
  }>;
}): ResultadoBulon {
  const corteKN = resistenciaCorteBulonKN(opciones.diametroMm, opciones.grado) * opciones.planosDeCorte;

  const resistenciaChapas = opciones.chapas.map((c) =>
    resistenciaChapaKN({
      diametroMm: opciones.diametroMm,
      espesorMm: c.espesorMm,
      distanciaLibreMm: c.distanciaLibreMm,
      fuPa: c.fuPa,
      deformacionControlada: c.deformacionControlada,
    })
  );

  const minChapaKN = resistenciaChapas.length > 0 ? Math.min(...resistenciaChapas.map((r) => r.gobiernaKN)) : Infinity;

  const nominalKN = Math.min(corteKN, minChapaKN);

  return {
    resistenciaCorteKN: corteKN,
    resistenciaChapas,
    nominalKN,
    modoDeFalla: corteKN <= minChapaKN ? "corte del vástago" : "chapa",
    admisibleKN: nominalKN / OMEGA_J,
  };
}

/* ------------------------------------------------------------------ *
 * Reparto elástico en un grupo de bulones cargado excéntricamente
 * ------------------------------------------------------------------ */

export interface PosicionBulon {
  xM: number;
  yM: number;
}

export interface FuerzaBulon {
  posicion: PosicionBulon;
  vxKN: number;
  vyKN: number;
  vKN: number;
}

/**
 * Método elástico del art. 8.2.1, con las posiciones ya referidas al
 * centroide del grupo (no al vértice de la chapa ni a ningún otro punto): es
 * la hipótesis del método, una chapa rígida que gira sobre el centroide del
 * grupo con los bulones respondiendo elásticamente.
 *
 * El bulón más exigido no siempre es el geométricamente más lejano: depende
 * de la combinación de Fx, Fy y M, así que se devuelven todos y se busca el
 * máximo aparte, en vez de asumir cuál gobierna.
 */
export function repartoElasticoBulones(
  bulones: PosicionBulon[],
  fxKN: number,
  fyKN: number,
  momentoKNm: number
): FuerzaBulon[] {
  const n = bulones.length;
  if (n === 0) return [];

  const ip = bulones.reduce((acc, b) => acc + b.xM ** 2 + b.yM ** 2, 0);

  return bulones.map((b) => {
    const vxKN = fxKN / n - (ip > 0 ? (momentoKNm / ip) * b.yM : 0);
    const vyKN = fyKN / n + (ip > 0 ? (momentoKNm / ip) * b.xM : 0);
    return { posicion: b, vxKN, vyKN, vKN: Math.sqrt(vxKN ** 2 + vyKN ** 2) };
  });
}

/** El bulón que recibe más corte del grupo, que es el que hay que verificar. */
export function bulonMasExigido(bulones: FuerzaBulon[]): FuerzaBulon | null {
  if (bulones.length === 0) return null;
  return bulones.reduce((a, b) => (b.vKN > a.vKN ? b : a));
}

/* ------------------------------------------------------------------ *
 * Bloque de corte, art. J4.3
 * ------------------------------------------------------------------ */

export interface AgujeroBloqueDeCorte {
  diametroMm: number;
  espesorMm: number;
}

export interface PlanoBloqueDeCorte {
  areaBrutaM2: number;
  agujeros: AgujeroBloqueDeCorte[];
}

/**
 * Área neta del plano, ec. (B4-3b) sin el término en zigzag: los planos de
 * corte y de tracción de un bloque de corte son casi siempre rectos —el
 * apunte no menciona cadenas en diagonal para este artículo—, así que no hace
 * falta la versión general de la ec. (B4-3b) que sí usa el área neta a
 * tracción del capítulo D.
 */
export function areaNetaBloqueM2(plano: PlanoBloqueDeCorte): number {
  const descuentoM2 = plano.agujeros.reduce(
    (acc, a) => acc + ((a.diametroMm + 2) * a.espesorMm) / 1e6,
    0
  );
  return plano.areaBrutaM2 - descuentoM2;
}

export interface ResultadoBloqueDeCorte {
  /** Rn por rotura en corte + tracción, primer término de la ec. (J4-5). */
  rnRoturaKN: number;
  /** Rn por fluencia en corte + rotura en tracción, segundo término (el tope). */
  rnFluenciaKN: number;
  /** El menor de los dos: Rn = min(...), ec. (J4-5). */
  nominalKN: number;
  admisibleKN: number;
}

/**
 * Ec. (J4-5): Rn = min(0,6·Fu·Anv + Ubs·Fu·Ant, 0,6·Fy·Agv + Ubs·Fu·Ant).
 *
 * El primer término es la falla real —rotura frágil en el plano de corte,
 * combinada con rotura en el plano de tracción—. El segundo es un tope que
 * evita que la fórmula devuelva más resistencia que la fluencia en corte de
 * la sección bruta, que físicamente no se puede superar antes de romper.
 *
 * Ubs = 1,0 cuando la tensión de tracción es uniforme en el plano que rompe
 * —el caso típico de una fila de bulones—, y 0,5 cuando no lo es —una sola
 * fila de bulones en un ángulo conectado por un ala, donde la tracción se
 * concentra hacia el borde—.
 */
export function calcularBloqueDeCorte(datos: {
  planoCorte: PlanoBloqueDeCorte;
  planoTraccion: PlanoBloqueDeCorte;
  ubs: 1.0 | 0.5;
  fyPa: number;
  fuPa: number;
}): ResultadoBloqueDeCorte {
  const { planoCorte, planoTraccion, ubs, fyPa, fuPa } = datos;

  const anvM2 = areaNetaBloqueM2(planoCorte);
  const antM2 = areaNetaBloqueM2(planoTraccion);

  const rnRoturaKN = (0.6 * fuPa * anvM2 + ubs * fuPa * antM2) / 1000;
  const rnFluenciaKN = (0.6 * fyPa * planoCorte.areaBrutaM2 + ubs * fuPa * antM2) / 1000;

  const nominalKN = Math.min(rnRoturaKN, rnFluenciaKN);

  return { rnRoturaKN, rnFluenciaKN, nominalKN, admisibleKN: nominalKN / OMEGA_J };
}
