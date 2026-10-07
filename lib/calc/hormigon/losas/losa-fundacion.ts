import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados, ResultadoFlexion } from "@/lib/calc/hormigon/comun/types";
import { calcularFlexion } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { corteDesdeCarga, distribucionPresiones, presionEn } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import {
  calcularPunzonamientoDescentrado,
  type ResultadoPunzonamientoDescentrado,
} from "@/lib/calc/hormigon/cimentaciones/punzonamiento-descentrado";

/**
 * Franja de una losa de fundación por el "método de las franjas", según el
 * Anejo 19: una línea de pilares tratada como viga sobre el terreno, con el
 * ancho tributario de la franja. Para toda la losa se repite por cada línea de
 * pilares, en las dos direcciones. Es un método de mano, no un análisis de
 * placa.
 *
 * Criterios decididos por el usuario el 2026-10-07, con el modelo de la
 * zapata combinada:
 * - Presión lineal (losa rígida) con γF·Nk; el peso propio no flecta porque
 *   lo equilibra su misma reacción. M > 0 tracciona la cara inferior.
 * - Cada cara se arma por metro con el motor de flexión (art. 6.1) y la
 *   mínima de la ec. (9.1) (art. 9.2.1.1). La superior se exige sólo si algún
 *   punto la tracciona.
 * - Separación máxima de las barras en losas: mín(300 mm; 3h), art. 9.3.1.1(3),
 *   pág. 146.
 * - Cortante sin armadura transversal a d de cada cara de pilar (art. 6.2.2).
 * - Punzonamiento de cada pilar (art. 6.4.4), descontando la reacción del
 *   terreno dentro del perímetro. A lo largo, los extremos de la franja son
 *   bordes de la losa y el perímetro se recorta cerca de ellos; a lo ancho la
 *   losa sigue, así que el perímetro nunca se recorta allí.
 * - Sin armadura de reparto: la otra dirección se arma con su propia franja.
 *   Su armadura inferior sólo entra en el ρl del punzonamiento.
 */

export interface PilarLosa {
  /** Distancia del extremo izquierdo de la franja al eje del pilar (m). */
  posicionM: number;
  /** Carga vertical característica (kN). */
  Nk: number;
}

export interface GeometriaFranjaLosa {
  /** Longitud de la franja, de punta a punta (m). */
  longitudM: number;
  /** Ancho tributario de la franja (m), típicamente la distancia entre ejes vecinos. */
  anchoTributarioM: number;
  H: number;
  recubrimiento: number;
  /** Lado de los pilares a lo largo de la franja (m). */
  pilarLargoM: number;
  /** Lado de los pilares a lo ancho de la franja (m). */
  pilarAnchoM: number;
}

export interface MallaLosa {
  diametroMm: number;
  /** Separación entre barras (m). */
  separacionM: number;
}

export interface DatosFranjaLosa {
  pilares: readonly PilarLosa[];
  inferior: MallaLosa;
  superior: MallaLosa;
  /** Inferior de la otra dirección, apoyada sobre la de la franja: sólo para el ρl del punzonamiento. */
  transversalInferior: MallaLosa;
}

export interface PuntoDiagramaLosa {
  xM: number;
  /** Cortante de cálculo en todo el ancho (kN). */
  vKN: number;
  /** Momento de cálculo en todo el ancho (kN·m); positivo tracciona la cara inferior. */
  mKNm: number;
}

export interface ResultadoCaraLosa {
  /** Momento de cálculo en todo el ancho, en valor absoluto (kN·m). */
  mEdKNm: number;
  mEdKNmPorM: number;
  xM: number;
  /** Falso si ningún punto tracciona esta cara: no se le exige armadura. */
  necesaria: boolean;
  /** Por metro de ancho (b = 1 m): As en cm²/m. */
  flexion: ResultadoFlexion;
  separacionMaxM: number;
  verificaSeparacion: boolean;
}

export interface ResultadoFranjaLosa {
  geotecnico: {
    pesoPropioKN: number;
    excentricidadM: number;
    dentroDelNucleo: boolean;
    sigmaKPa: number;
    verificaTension: boolean;
  };
  pilaresDentro: boolean;
  diagrama: PuntoDiagramaLosa[];
  inferior: ResultadoCaraLosa;
  superior: ResultadoCaraLosa;
  cortante: { vEdKN: number; vRdCKN: number; xM: number; verifica: boolean };
  punzonamiento: ResultadoPunzonamientoDescentrado[];
}

const PASOS = 2000;

/** Área por metro de una malla (cm²/m). */
const areaPorMetroCm2 = (m: MallaLosa) => (Math.PI * (m.diametroMm / 10) ** 2) / 4 / m.separacionM;

export function calcularFranjaLosa(
  materiales: MaterialesDerivados,
  geometria: GeometriaFranjaLosa,
  sigmaAdmisibleKPa: number,
  datos: DatosFranjaLosa
): ResultadoFranjaLosa {
  const { longitudM: L, anchoTributarioM: B, H, recubrimiento, pilarLargoM: cx, pilarAnchoM: cy } = geometria;
  const { pilares } = datos;

  const pilaresDentro = pilares.every((p) => p.posicionM - cx / 2 >= -1e-9 && p.posicionM + cx / 2 <= L + 1e-9);

  // ----------------------------------------------------------- terreno
  const nTotal = pilares.reduce((a, p) => a + p.Nk, 0);
  const momento = pilares.reduce((a, p) => a + p.Nk * (p.posicionM - L / 2), 0);
  const pesoPropioKN = 25 * L * B * H;
  const cargaTotalKN = nTotal + pesoPropioKN;
  const excentricidadM = momento / cargaTotalKN;
  const dentroDelNucleo = Math.abs(excentricidadM) <= L / 6;
  const anchoEf = L - 2 * Math.abs(excentricidadM);
  const sigmaKPa = anchoEf > 0 ? cargaTotalKN / (anchoEf * B) : Infinity;
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa && dentroDelNucleo;

  // ---------------------------------------------------------- diagrama
  const excCalculo = momento / nTotal;
  const dist = distribucionPresiones(GAMMA_F * nTotal, L, B, excCalculo);
  const sDe = (x: number) => (excCalculo >= 0 ? x : L - x);
  const w = (x: number) => B * presionEn(dist, L, sDe(x));

  const cargas = pilares.map((p) => ({ x: p.posicionM, nd: GAMMA_F * p.Nk }));
  const xs = new Set<number>();
  for (let i = 0; i <= PASOS; i++) xs.add((L * i) / PASOS);
  for (const c of cargas) xs.add(c.x);
  const orden = [...xs].sort((a, b) => a - b);
  const puntos: PuntoDiagramaLosa[] = [{ xM: 0, vKN: 0, mKNm: 0 }];
  let V = 0;
  let M = 0;
  for (let i = 1; i < orden.length; i++) {
    const x0 = orden[i - 1];
    const x1 = orden[i];
    const dV = ((w(x0) + w(x1)) / 2) * (x1 - x0);
    M += (V + dV / 2) * (x1 - x0);
    V += dV;
    for (const c of cargas) if (Math.abs(c.x - x1) < 1e-9) V -= c.nd;
    puntos.push({ xM: x1, vKN: V, mKNm: M });
  }
  /** Valor interpolado en x. Las secciones que se piden nunca caen sobre un pilar, donde V salta. */
  const valorEn = (x: number, campo: "vKN" | "mKNm") => {
    const j = puntos.findIndex((p) => p.xM >= x);
    if (j <= 0) return puntos[Math.max(j, 0)][campo];
    const a = puntos[j - 1];
    const b = puntos[j];
    return a[campo] + ((b[campo] - a[campo]) * (x - a.xM)) / (b.xM - a.xM);
  };

  let mMax = { m: 0, x: 0 };
  let mMin = { m: 0, x: 0 };
  for (const p of puntos) {
    if (p.mKNm > mMax.m) mMax = { m: p.mKNm, x: p.xM };
    if (p.mKNm < mMin.m) mMin = { m: p.mKNm, x: p.xM };
  }

  // ----------------------------------------------------------- flexión
  const geoMetro = { b: 1, h: H, recubrimiento, diametroEstriboMm: 0 };
  const dDe = (m: MallaLosa) => H - recubrimiento - m.diametroMm / 2000;
  const dInf = dDe(datos.inferior);
  const dSup = dDe(datos.superior);
  const separacionMaxM = Math.min(0.3, 3 * H);
  const cara = (m: { m: number; x: number }, d: number, malla: MallaLosa, siempre: boolean): ResultadoCaraLosa => {
    const mEd = Math.abs(m.m);
    const f = calcularFlexion(materiales, geoMetro, d, {
      momento: mEd / B,
      armaduraReal: [{ numero: 1 / malla.separacionM, diametroMm: malla.diametroMm }],
    });
    // El motor de vigas cuenta barras enteras: en una malla por metro el área
    // real es la de la separación, no la de redondear 1/s hacia arriba.
    const asRealCm2 = areaPorMetroCm2(malla);
    return {
      mEdKNm: mEd,
      mEdKNmPorM: mEd / B,
      xM: m.x,
      necesaria: siempre || mEd > 1e-6,
      flexion: { ...f, asRealCm2, aprovechamiento: f.asNecCm2 / asRealCm2, verificaAs: !f.sobrearmada && asRealCm2 >= f.asNecCm2 },
      separacionMaxM,
      verificaSeparacion: malla.separacionM <= separacionMaxM + 1e-9,
    };
  };
  // La inferior se exige siempre: es la que reparte bajo los pilares.
  const inferior = cara(mMax, dInf, datos.inferior, true);
  const superior = cara(mMin, dSup, datos.superior, false);

  // ---------------------------------------------------------- cortante
  // Sin armadura transversal a d de cada cara de pilar, hacia los dos lados.
  // La cara traccionada en la sección define d y el ρl.
  let cortante = { vEdKN: 0, vRdCKN: Infinity, xM: 0, verifica: true };
  for (const p of pilares) {
    for (const lado of [-1, 1]) {
      const caraPilar = p.posicionM + (lado * cx) / 2;
      let traccionaAbajo = true;
      let d = dInf;
      let xSeccion = caraPilar + lado * d;
      if (valorEn(xSeccion, "mKNm") < 0) {
        traccionaAbajo = false;
        d = dSup;
        xSeccion = caraPilar + lado * d;
      }
      if (xSeccion <= 0 || xSeccion >= L) continue;
      const vEd = Math.abs(valorEn(xSeccion, "vKN"));
      const asReal = (traccionaAbajo ? inferior : superior).flexion.asRealCm2 * B;
      const c = corteDesdeCarga(materiales, B, d, vEd, asReal);
      if (c.vEdKN / c.vRdCKN > cortante.vEdKN / cortante.vRdCKN) {
        cortante = { vEdKN: c.vEdKN, vRdCKN: c.vRdCKN, xM: xSeccion, verifica: c.verificaCorte };
      }
    }
  }
  if (!Number.isFinite(cortante.vRdCKN)) cortante = { ...cortante, vRdCKN: 0 };

  // ----------------------------------------------------- punzonamiento
  // A lo ancho la losa sigue: se amplía el ancho hasta que el perímetro a 2d
  // no toque los costados, con la misma presión por m², para que no se
  // recorte contra un borde que no existe.
  const dT = H - recubrimiento - datos.inferior.diametroMm / 1000 - datos.transversalInferior.diametroMm / 2000;
  const dMedio = (dInf + dT) / 2;
  const anchoP = Math.max(B, cy + 4 * dMedio + 0.02);
  const punzonamiento = pilares.map((p) =>
    calcularPunzonamientoDescentrado(materiales, {
      A: L, B: anchoP, anchoPilarA: cx, anchoPilarB: cy,
      bordeA: p.posicionM - cx / 2, bordeB: (anchoP - cy) / 2,
      dA: dInf, dB: dT,
      nk: p.Nk, nkPresiones: (nTotal * anchoP) / B,
      mkA: 0, mkB: 0,
      excCalculoA: excCalculo, excCalculoB: 0,
      asRealACm2: areaPorMetroCm2(datos.inferior) * anchoP,
      asRealBCm2: areaPorMetroCm2(datos.transversalInferior) * L,
    })
  );

  // Diagrama aliviado para dibujar: no hacen falta 2000 puntos.
  const paso = Math.max(1, Math.floor(puntos.length / 200));
  const diagrama = puntos.filter((_, i) => i % paso === 0 || i === puntos.length - 1);

  return {
    geotecnico: { pesoPropioKN, excentricidadM, dentroDelNucleo, sigmaKPa, verificaTension },
    pilaresDentro,
    diagrama,
    inferior,
    superior,
    cortante,
    punzonamiento,
  };
}
