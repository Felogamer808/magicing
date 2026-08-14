/**
 * Compresión de miembros sin elementos esbeltos — AISC 360-16, artículo E3
 * (pandeo por flexión), por el método ASD, igual que el resto de los módulos AISC
 * de este repositorio.
 *
 * Reemplaza la hoja "Hoja2" de la planilla AISC 360.xlsx, que resolvía lo mismo
 * para un perfil por vez y leía las propiedades con HLOOKUP.
 */

import { designacion, propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

/** Coeficiente de seguridad para compresión, AISC 360-16 art. E1. */
export const OMEGA_C = 1.67;

export interface DatosCompresion {
  familia: Familia;
  /** Parámetros de la sección, en mm: altura de catálogo, o dimensiones y espesor. */
  params: ParametrosPerfil;
  /** Longitud efectiva de pandeo respecto del eje fuerte, Lc = K·L, en metros. */
  lcxM: number;
  /** Longitud efectiva de pandeo respecto del eje débil, en metros. */
  lcyM: number;
  /** Tensión de fluencia, en Pa. */
  fyPa: number;
  /** Módulo de elasticidad, en Pa. */
  ePa: number;
  /** Carga axial de compresión requerida, en kN. Opcional: solo para verificar. */
  pRequeridaKN?: number;
}

export interface PandeoEnUnEje {
  /** Radio de giro del eje considerado, en m. */
  rM: number;
  lcM: number;
  /** Esbeltez efectiva Lc/r. */
  esbeltez: number;
  /** Esbeltez límite 4,71·√(E/Fy) que separa pandeo inelástico de elástico. */
  esbeltezLimite: number;
  /** Tensión crítica de pandeo elástico, Fe, en Pa (ec. E3-4). */
  fePa: number;
  /** Tensión crítica, Fcr, en Pa (ec. E3-2 o E3-3). */
  fcrPa: number;
  /** Rama aplicada de la norma. */
  regimen: "inelástico (E3-2)" | "elástico (E3-3)";
  /** Resistencia nominal Pn = Fcr·Ag, en kN (ec. E3-1). */
  pnKN: number;
  /** Resistencia admisible Pn/Ωc, en kN. */
  admisibleKN: number;
}

export interface ResultadoCompresion {
  designacion: string;
  areaM2: number;
  ejeFuerte: PandeoEnUnEje;
  ejeDebil: PandeoEnUnEje;
  /** El eje que gobierna: el de menor resistencia admisible. */
  gobierna: "fuerte" | "débil";
  admisibleKN: number;
  /** Esbeltez mayor de las dos. La nota de usuario de E2 sugiere no pasar de 200. */
  esbeltezMaxima: number;
  superaEsbeltezRecomendada: boolean;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

/**
 * Tensión crítica del artículo E3. La frontera entre las dos ramas se escribe
 * como Lc/r ≤ 4,71·√(E/Fy); la norma da también la forma equivalente Fy/Fe ≤ 2,25.
 */
export function tensionCritica(esbeltez: number, fyPa: number, ePa: number) {
  const fePa = (Math.PI ** 2 * ePa) / esbeltez ** 2; // (E3-4)
  const esbeltezLimite = 4.71 * Math.sqrt(ePa / fyPa);

  const inelastico = esbeltez <= esbeltezLimite;
  const fcrPa = inelastico
    ? Math.pow(0.658, fyPa / fePa) * fyPa // (E3-2)
    : 0.877 * fePa; // (E3-3)

  return {
    fePa,
    fcrPa,
    esbeltezLimite,
    regimen: (inelastico ? "inelástico (E3-2)" : "elástico (E3-3)") as PandeoEnUnEje["regimen"],
  };
}

function pandeoEnEje(lcM: number, rM: number, areaM2: number, fyPa: number, ePa: number): PandeoEnUnEje {
  const esbeltez = lcM / rM;
  const { fePa, fcrPa, esbeltezLimite, regimen } = tensionCritica(esbeltez, fyPa, ePa);
  const pnKN = (fcrPa * areaM2) / 1000; // (E3-1)

  return {
    rM,
    lcM,
    esbeltez,
    esbeltezLimite,
    fePa,
    fcrPa,
    regimen,
    pnKN,
    admisibleKN: pnKN / OMEGA_C,
  };
}

export function calcularCompresion(datos: DatosCompresion): ResultadoCompresion {
  const p = propiedades(datos.familia, datos.params);

  const ejeFuerte = pandeoEnEje(datos.lcxM, p.rxM, p.areaM2, datos.fyPa, datos.ePa);
  const ejeDebil = pandeoEnEje(datos.lcyM, p.ryM, p.areaM2, datos.fyPa, datos.ePa);

  // Gobierna el menor: el pandeo se produce por donde la barra es más flexible.
  const mandaFuerte = ejeFuerte.admisibleKN <= ejeDebil.admisibleKN;
  const admisibleKN = mandaFuerte ? ejeFuerte.admisibleKN : ejeDebil.admisibleKN;
  const esbeltezMaxima = Math.max(ejeFuerte.esbeltez, ejeDebil.esbeltez);

  const requerida = datos.pRequeridaKN;

  return {
    designacion: designacion(datos.familia, datos.params),
    areaM2: p.areaM2,
    ejeFuerte,
    ejeDebil,
    gobierna: mandaFuerte ? "fuerte" : "débil",
    admisibleKN,
    esbeltezMaxima,
    superaEsbeltezRecomendada: esbeltezMaxima > 200,
    verifica: requerida === undefined ? null : requerida <= admisibleKN,
    aprovechamiento: requerida === undefined ? null : requerida / admisibleKN,
  };
}
