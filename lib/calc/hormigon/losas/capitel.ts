/**
 * Punzonamiento de una losa maciza sobre un pilar con capitel.
 * Anejo 19, art. 6.4.2 (8) a (11), págs. 89-90, y la resistencia del art. 6.4.3.
 *
 * El capitel es un engrosamiento de la losa sobre el pilar, de canto h_H y que
 * sobresale l_H de la cara del pilar. Según cuánto sobresale respecto de su
 * canto, cambia dónde puede romper la losa:
 *
 *  - **Capitel chico, l_H ≤ 2·h_H** (fig. A19.6.17): la superficie de rotura a
 *    26,6° sale del pilar y atraviesa el capitel entero, así que sólo hay una
 *    sección crítica, en la losa, fuera del capitel. Pilar circular: r_cont =
 *    2d + l_H + 0,5c, ec. (6.33). Rectangular, el menor de las ecs. (6.34) y
 *    (6.35), con l1 ≤ l2 los lados del capitel.
 *  - **Capitel grande, l_H > 2·h_H** (fig. A19.6.18): dos secciones críticas.
 *    La de la losa, a 2d del borde del capitel, y la del capitel, a 2·d_H de la
 *    cara del pilar con d_H = d + h_H, art. 6.4.2 (10). Pilar circular: ecs.
 *    (6.36) y (6.37).
 *
 * Criterios del usuario (2026-10-26):
 *
 *  - Pilar interior, de borde y de esquina, rectangular o circular.
 *  - Sólo hormigón: el capitel se dimensiona para no necesitar armadura de
 *    punzonamiento. Si no alcanza, se agranda.
 *  - Las ecs. (6.34) y (6.35) son de pilar interior. En borde y esquina el
 *    perímetro del capitel chico rectangular se toma a 2d de su borde,
 *    recortado contra los bordes libres, que es la regla general del art.
 *    6.4.2 (1) y (4) con el capitel como área cargada.
 *  - La biela en u0 (art. 6.4.5 (3)) se comprueba en la cara del pilar con
 *    d_H, que es el canto que hay ahí. El pilar circular en borde o esquina se
 *    lleva a un cuadrado de igual área para las fórmulas de u0, que son de
 *    pilar rectangular.
 *
 * Mismo criterio que `punzonamiento.ts` para lo que no se modela: σcp, huecos
 * próximos y β por la ec. (6.39).
 */

import { factorEscalaK, tensionCortanteBase, tensionCortanteMinima } from "@/lib/calc/hormigon/comun/cortante";
import { GAMMA_C } from "@/lib/calc/hormigon/comun/coeficientes";
import {
  BETA_RECOMENDADO,
  cuantia,
  perimetroCaraPilar,
  perimetroDeControl,
  type ArmaduraLongitudinalPunzonamiento,
  type PerimetroControl,
  type PosicionPilar,
  type TramoPerimetro,
} from "./punzonamiento";

export type FormaPilar = "rectangular" | "circular";

export interface GeometriaCapitel {
  posicion: PosicionPilar;
  forma: FormaPilar;
  /** Canto útil de la losa en cada dirección (m); d = (dy + dz)/2, ec. (6.32). */
  dYM: number;
  dZM: number;
  /**
   * Lados del pilar (m), como en `punzonamiento.ts`: c1 perpendicular al borde,
   * c2 paralelo. Pilar circular: c1 es el diámetro y c2 no se usa.
   */
  c1M: number;
  c2M: number;
  /** De la cara del pilar al borde libre (m), como en `punzonamiento.ts`. */
  distBordeC1M: number;
  distBordeC2M: number;
  /**
   * Cuánto sobresale el capitel de la cara del pilar (m): l_H1 en la dirección
   * de c1 y l_H2 en la de c2. Del lado de un borde libre el capitel no pasa del
   * borde. Pilar circular: l_H1 es el único.
   */
  lH1M: number;
  lH2M: number;
  /** Canto del capitel debajo de la losa (m). */
  hHM: number;
}

export interface DatosCapitel {
  vEdKN: number;
  betaManual: number | null;
}

export interface SeccionCriticaCapitel {
  /** "losa": fuera del capitel, con d. "capitel": dentro, con d_H. */
  donde: "losa" | "capitel";
  /** De la ecuación del artículo, cuando la hay (r_cont desde el centro del pilar) */
  rContM: number | null;
  ecuacion: string;
  perimetro: PerimetroControl;
  uM: number;
  dM: number;
  rhoL: number;
  k: number;
  vRdCMPa: number;
  gobiernaVMin: boolean;
  vEdMPa: number;
  verifica: boolean;
  aprovechamiento: number;
}

export interface ResultadoCapitel {
  tipo: "chico" | "grande";
  dM: number;
  dHM: number;
  beta: number;
  betaEsRecomendado: boolean;
  /** Biela en la cara del pilar, con d_H */
  caraPilar: { u0M: number; vEdMPa: number; vRdMaxMPa: number; verifica: boolean; aprovechamiento: number };
  secciones: SeccionCriticaCapitel[];
  verifica: boolean;
  /** Para el dibujo: el pilar y el capitel en coordenadas de la losa */
  planta: {
    forma: FormaPilar;
    pilar: { x0: number; y0: number; x1: number; y1: number };
    capitel: { x0: number; y0: number; x1: number; y1: number };
    hayBordeX: boolean;
    hayBordeY: boolean;
  };
}

/**
 * Círculo de radio r alrededor de (cx, cy), recortado contra los bordes libres
 * x = 0 e y = 0. Devuelve sólo lo que queda dentro de la losa: los bordes libres
 * no cuentan como perímetro (art. 6.4.2 (4)). Se barre por ángulo, que es
 * exacto a la precisión del paso y no necesita casos por posición.
 */
export function perimetroCircular(cx: number, cy: number, rM: number, recortaX: boolean, recortaY: boolean): PerimetroControl {
  const pasos = 7200;
  const paso = (2 * Math.PI) / pasos;
  const dentro = (a: number) => (!recortaX || cx + rM * Math.cos(a) >= -1e-12) && (!recortaY || cy + rM * Math.sin(a) >= -1e-12);
  // Arrancar en un ángulo que quede afuera, si hay alguno, para no partir un arco en dos.
  let inicio = 0;
  for (let i = 0; i < pasos; i++) if (!dentro(i * paso)) { inicio = i; break; }
  const tramos: TramoPerimetro[] = [];
  let longitudM = 0;
  let desde: number | null = null;
  for (let i = 0; i <= pasos; i++) {
    const a = (inicio + i) * paso;
    const adentro = i < pasos && dentro(a + paso / 2);
    if (adentro && desde === null) desde = a;
    if (!adentro && desde !== null) {
      tramos.push({ tipo: "arco", cx, cy, rM, desdeRad: desde, hastaRad: a });
      longitudM += rM * (a - desde);
      desde = null;
    }
  }
  return { longitudM, tramos };
}

export function calcularCapitel(
  fckMPa: number,
  g: GeometriaCapitel,
  longitudinal: ArmaduraLongitudinalPunzonamiento,
  datos: DatosCapitel
): ResultadoCapitel {
  const circular = g.forma === "circular";
  const c1 = g.c1M;
  const c2 = circular ? g.c1M : g.c2M;
  const lH1 = g.lH1M;
  const lH2 = circular ? g.lH1M : g.lH2M;
  const dM = (g.dYM + g.dZM) / 2;
  const dHM = dM + g.hHM;
  const tipo = Math.max(lH1, lH2) <= 2 * g.hHM ? "chico" : "grande";
  const beta = datos.betaManual ?? BETA_RECOMENDADO[g.posicion];

  // Ubicación en la losa, como en `punzonamiento.ts`: bordes libres en x = 0 e
  // y = 0. Sin borde de un lado, el pilar se corre lo necesario para que todo
  // quede en el cuadrante positivo (sólo importa para el dibujo).
  const recortaX = g.posicion === "esquina";
  const recortaY = g.posicion !== "interior";
  const holgura = Math.max(lH1, lH2) + 2 * dHM + 0.1;
  const x0 = recortaX ? g.distBordeC2M : holgura;
  const y0 = recortaY ? g.distBordeC1M : holgura;
  const pilar = { x0, y0, x1: x0 + c2, y1: y0 + c1 };
  // El capitel no pasa del borde libre.
  const capitel = {
    x0: recortaX ? Math.max(x0 - lH2, 0) : x0 - lH2,
    y0: recortaY ? Math.max(y0 - lH1, 0) : y0 - lH1,
    x1: pilar.x1 + lH2,
    y1: pilar.y1 + lH1,
  };
  const cx = (pilar.x0 + pilar.x1) / 2;
  const cy = (pilar.y0 + pilar.y1) / 2;

  // --- Biela en la cara del pilar, art. 6.4.5 (3), con d_H ---
  // Circular: u0 = π·c en interior; en borde y esquina, el cuadrado de igual área.
  const ladoEquivalente = (Math.sqrt(Math.PI) / 2) * c1;
  const u0M =
    circular && g.posicion === "interior"
      ? Math.PI * c1
      : perimetroCaraPilar(g.posicion, circular ? ladoEquivalente : c1, circular ? ladoEquivalente : c2, dHM).u0M;
  const nu = 0.6 * (1 - fckMPa / 250);
  const vRdMaxMPa = 0.4 * nu * (fckMPa / GAMMA_C);
  const vEdCaraMPa = (beta * datos.vEdKN) / (u0M * dHM) / 1000;

  // --- Secciones críticas ---
  const seccion = (
    donde: "losa" | "capitel",
    perimetro: PerimetroControl,
    d: number,
    rContM: number | null,
    ecuacion: string
  ): SeccionCriticaCapitel => {
    // Misma armadura de negativos: con más canto la cuantía baja (ec. 6.47).
    const rhoL = Math.min(
      Math.sqrt(cuantia(longitudinal.diametroYMm, longitudinal.separacionYM, d) * cuantia(longitudinal.diametroZMm, longitudinal.separacionZM, d)),
      0.02
    );
    const k = factorEscalaK(d);
    const vBase = tensionCortanteBase(k, rhoL, fckMPa);
    const vMin = tensionCortanteMinima(k, fckMPa);
    const vRdCMPa = Math.max(vBase, vMin);
    const uM = perimetro.longitudM;
    const vEdMPa = (beta * datos.vEdKN) / (uM * d) / 1000;
    return {
      donde, rContM, ecuacion, perimetro, uM, dM: d, rhoL, k, vRdCMPa,
      gobiernaVMin: vMin > vBase, vEdMPa,
      verifica: vEdMPa <= vRdCMPa,
      aprovechamiento: vRdCMPa > 0 ? vEdMPa / vRdCMPa : Infinity,
    };
  };

  const secciones: SeccionCriticaCapitel[] = [];
  if (circular) {
    const r = (c1 / 2);
    if (tipo === "chico") {
      const rCont = 2 * dM + lH1 + r; // ec. (6.33)
      secciones.push(seccion("losa", perimetroCircular(cx, cy, rCont, recortaX, recortaY), dM, rCont, "(6.33)"));
    } else {
      const rExt = lH1 + 2 * dM + r; // ec. (6.36)
      const rInt = 2 * dHM + r; // ec. (6.37): 2(d + h_H) + 0,5c
      secciones.push(seccion("losa", perimetroCircular(cx, cy, rExt, recortaX, recortaY), dM, rExt, "(6.36)"));
      secciones.push(seccion("capitel", perimetroCircular(cx, cy, rInt, recortaX, recortaY), dHM, rInt, "(6.37)"));
    }
  } else if (tipo === "chico") {
    if (g.posicion === "interior") {
      const l1 = Math.min(c1 + 2 * lH1, c2 + 2 * lH2);
      const l2 = Math.max(c1 + 2 * lH1, c2 + 2 * lH2);
      const r634 = 2 * dM + 0.56 * Math.sqrt(l1 * l2);
      const r635 = 2 * dM + 0.69 * l1;
      const rCont = Math.min(r634, r635);
      secciones.push(seccion("losa", perimetroCircular(cx, cy, rCont, false, false), dM, rCont, r634 <= r635 ? "(6.34)" : "(6.35)"));
    } else {
      secciones.push(seccion("losa", perimetroDeControl(capitel, 2 * dM, recortaX, recortaY), dM, null, "2d del capitel"));
    }
  } else {
    secciones.push(seccion("losa", perimetroDeControl(capitel, 2 * dM, recortaX, recortaY), dM, null, "2d del capitel"));
    secciones.push(seccion("capitel", perimetroDeControl(pilar, 2 * dHM, recortaX, recortaY), dHM, null, "2·d_H del pilar"));
  }

  const caraPilar = {
    u0M,
    vEdMPa: vEdCaraMPa,
    vRdMaxMPa,
    verifica: vEdCaraMPa <= vRdMaxMPa,
    aprovechamiento: vRdMaxMPa > 0 ? vEdCaraMPa / vRdMaxMPa : Infinity,
  };

  return {
    tipo,
    dM,
    dHM,
    beta,
    betaEsRecomendado: datos.betaManual === null,
    caraPilar,
    secciones,
    verifica: caraPilar.verifica && secciones.every((s) => s.verifica),
    planta: { forma: g.forma, pilar, capitel, hayBordeX: recortaX, hayBordeY: recortaY },
  };
}
