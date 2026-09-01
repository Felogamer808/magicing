/**
 * Tracción — AISC 360-22, capítulo D, por el método ASD, igual que el resto de
 * los módulos AISC de este repositorio.
 *
 * Cubre las dos comprobaciones que manda el capítulo:
 *
 * - **Fluencia (D2a)**: Pn = Fy·Ag. Falla dúctil, con grandes deformaciones que
 *   avisan antes del colapso.
 * - **Rotura (D2b)**: Pn = Fu·Ae. Falla frágil, en la sección más chica que
 *   queda una vez descontados los agujeros —área neta, art. B4— y corregida
 *   por *shear lag* cuando la fuerza no entra por toda la sección —área
 *   efectiva, art. D3—.
 *
 * Con acero A36 (Fy 248 MPa, Fu 400 MPa) hace falta perder casi un cuarto de
 * la sección (Ae/Ag ≈ 0,744) antes de que la rotura llegue a gobernar sobre la
 * fluencia. Con aceros de mayor límite elástico la rotura gobierna con mucha
 * menos pérdida de sección, así que conviene mirar las dos.
 *
 * El *shear lag* que se implementa acá es el caso general de la tabla D3.1
 * —"Caso 2": cualquier sección conectada por menos que la totalidad de sus
 * elementos, con U = 1 − x̄/L—. Es la fórmula que cubre la enorme mayoría de
 * los casos reales (ángulos por una sola ala, perfiles conectados sólo por el
 * alma o sólo por las alas) y la que trae el propio apunte en su ejemplo. La
 * tabla D3.1 completa tiene casos más específicos —HSS redondos con chapa
 * pasante entre ellos, por ejemplo— que no están cubiertos: si se conoce el U
 * de un caso más específico, se puede cargar directo en vez del calculado.
 */

import { designacion, propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

/** Coeficientes de seguridad ASD, art. D2: 1,67 en fluencia, 2,00 en rotura. */
export const OMEGA_T_FLUENCIA = 1.67;
export const OMEGA_T_ROTURA = 2.0;

/**
 * Un agujero (o una fila de agujeros iguales) en la sección crítica.
 *
 * El descuento de la ec. (B4-3b) es (φnom + 2 mm)·t por agujero: el diámetro
 * nominal más 2 mm de holgura de perforación, multiplicado por el espesor del
 * elemento perforado. Ese espesor no tiene por qué coincidir con ningún
 * espesor de catálogo de la sección —puede ser sólo un ala, o una chapa
 * soldada aparte— así que se carga directo en vez de derivarlo de la familia.
 */
export interface AgujeroTraccion {
  diametroMm: number;
  espesorMm: number;
}

/**
 * Paso en diagonal de una cadena en zigzag, ec. (B4-3b): suma t·s²/(4g) por
 * cada escalón, donde `s` es el paso longitudinal entre agujeros consecutivos
 * y `g` el paso transversal entre las filas de agujeros que conecta.
 */
export interface PasoZigzag {
  sMm: number;
  gMm: number;
  espesorMm: number;
}

/**
 * Área neta, ec. (B4-3b): el área bruta menos los agujeros de la cadena más
 * lo que se recupera por cada escalón en diagonal.
 */
export function areaNetaM2(areaBrutaM2: number, agujeros: AgujeroTraccion[], zigzag: PasoZigzag[]): number {
  const descuentoM2 = agujeros.reduce(
    (acc, a) => acc + ((a.diametroMm + 2) * a.espesorMm) / 1e6,
    0
  );
  const recuperoM2 = zigzag.reduce(
    (acc, z) => acc + ((z.sMm ** 2 / (4 * z.gMm)) * z.espesorMm) / 1e6,
    0
  );
  return areaBrutaM2 - descuentoM2 + recuperoM2;
}

/**
 * Factor de *shear lag* del Caso 2 de la tabla D3.1, ec. base U = 1 − x̄/L.
 *
 * x̄ es la excentricidad entre el plano de conexión y el centro de gravedad de
 * la pieza; L es el largo de la conexión en la dirección de la fuerza. Cuanto
 * más corta la conexión o mayor la excentricidad, más U se aleja de 1 y más
 * castiga la rotura.
 */
export function factorUCaso2(xBarraMm: number, largoConexionMm: number): number {
  return largoConexionMm > 0 ? 1 - xBarraMm / largoConexionMm : 1;
}

export interface DatosTraccion {
  familia: Familia;
  params: ParametrosPerfil;
  /** Longitud de la barra, en metros, para la nota de esbeltez del art. D1. */
  lM: number;
  fyPa: number;
  fuPa: number;
  /** Agujeros de la sección crítica. Vacío o ausente: Ag = An. */
  agujeros?: AgujeroTraccion[];
  /** Escalones en diagonal de la cadena, si la sección crítica es en zigzag. */
  zigzag?: PasoZigzag[];
  /** Factor U ya calculado o de un caso específico de la tabla D3.1. 1 si se omite. */
  u?: number;
  /** Tracción requerida, en kN. Opcional: sólo para verificar. */
  pRequeridaKN?: number;
}

export interface ResultadoTraccion {
  designacion: string;
  areaBrutaM2: number;
  areaNetaM2: number;
  u: number;
  areaEfectivaM2: number;
  /** Radio de giro mínimo de la sección, para la esbeltez del art. D1. */
  rMinM: number;
  esbeltez: number;
  /** La norma sugiere no pasar de 300; no es un requisito duro. */
  superaEsbeltezRecomendada: boolean;
  pnFluenciaKN: number;
  admisibleFluenciaKN: number;
  pnRoturaKN: number;
  admisibleRoturaKN: number;
  /** El menor de los dos: el que gobierna la capacidad de la barra. */
  gobierna: "fluencia" | "rotura";
  admisibleKN: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

export function calcularTraccion(datos: DatosTraccion): ResultadoTraccion {
  const p = propiedades(datos.familia, datos.params);

  const areaBrutaM2 = p.areaM2;
  const agujeros = datos.agujeros ?? [];
  const zigzag = datos.zigzag ?? [];
  const areaNeta =
    agujeros.length === 0 && zigzag.length === 0 ? areaBrutaM2 : areaNetaM2(areaBrutaM2, agujeros, zigzag);

  const u = datos.u ?? 1;
  const areaEfectiva = areaNeta * u; // (D3-1)

  const rMinM = Math.min(p.rxM, p.ryM);
  const esbeltez = datos.lM / rMinM;

  const pnFluenciaKN = (datos.fyPa * areaBrutaM2) / 1000; // (D2-1)
  const admisibleFluenciaKN = pnFluenciaKN / OMEGA_T_FLUENCIA;

  const pnRoturaKN = (datos.fuPa * areaEfectiva) / 1000; // (D2-2)
  const admisibleRoturaKN = pnRoturaKN / OMEGA_T_ROTURA;

  const mandaFluencia = admisibleFluenciaKN <= admisibleRoturaKN;
  const admisibleKN = mandaFluencia ? admisibleFluenciaKN : admisibleRoturaKN;

  const requerida = datos.pRequeridaKN;

  return {
    designacion: designacion(datos.familia, datos.params),
    areaBrutaM2,
    areaNetaM2: areaNeta,
    u,
    areaEfectivaM2: areaEfectiva,
    rMinM,
    esbeltez,
    superaEsbeltezRecomendada: esbeltez > 300,
    pnFluenciaKN,
    admisibleFluenciaKN,
    pnRoturaKN,
    admisibleRoturaKN,
    gobierna: mandaFluencia ? "fluencia" : "rotura",
    admisibleKN,
    verifica: requerida === undefined ? null : requerida <= admisibleKN,
    aprovechamiento: requerida === undefined ? null : requerida / admisibleKN,
  };
}
