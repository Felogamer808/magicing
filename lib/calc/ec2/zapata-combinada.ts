import type { MaterialesDerivados } from "./types";
import { factorEscalaK, tensionCortanteResistente } from "./zapata-aislada";

export interface ColumnaCombinada {
  /** Distancia desde el borde izquierdo de la zapata (x=0) al centro del pilar (m) */
  posicionM: number;
  /** Carga vertical característica (kN) */
  Nk: number;
}

export interface ArmadoPrincipalCombinada {
  diametroMm: number;
  /** Separación entre barras (m) */
  separacionM: number;
}

export interface ArmadoSecundarioCombinada {
  numero: number;
  diametroMm: number;
}

export interface ResultadoGeotecnicoCombinada {
  pesoPropioKN: number;
  sigmaKPa: number;
  verificaTension: boolean;
}

export interface ResultadoArmadoPrincipalCombinada {
  /** Momento máximo de diseño en esa cara (kN·m), en valor absoluto */
  mKNm: number;
  /** Posición donde ocurre el momento máximo, medida desde x=0 (m) */
  posicionM: number;
  asNecCm2PorM: number;
  asRealCm2PorM: number;
  verificaAs: boolean;
}

export interface ResultadoVigaSobreTerreno {
  excentricidadM: number;
  dentroDelNucleo: boolean;
  geotecnico: ResultadoGeotecnicoCombinada;
  dM: number;
  /** Armadura inferior (momento positivo: bajo/entre pilares y en los voladizos) */
  inferior: ResultadoArmadoPrincipalCombinada;
  /** Armadura superior (momento negativo: entre pilares, si el tramo es largo) */
  superior: ResultadoArmadoPrincipalCombinada;
  secundario: { asNecCm2: number; asRealCm2: number; verificaAs: boolean };
  /** Cortante máximo a lo largo de la pieza (EC2 6.2.2), en el punto más exigido */
  cortante: { vEdKN: number; vRdCKN: number; verificaCorte: boolean };
}

export type ResultadoZapataCombinada = ResultadoVigaSobreTerreno;

interface PuntoDiagrama {
  x: number;
  V: number;
  M: number;
}

/**
 * Diagrama de corte y momento tratando la pieza como una viga: carga
 * distribuida hacia arriba (reacción del suelo, ya factorizada) y cargas
 * puntuales hacia abajo en cada pilar (las cargas de los pilares, factorizadas).
 * Integración numérica (trapecios) para evitar errores de álgebra en la
 * expresión cerrada; convención estándar: M>0 = tracción en la cara inferior.
 */
function calcularDiagrama(
  A: number,
  B: number,
  sigmaEdge0KPa: number,
  sigmaEdgeAKPa: number,
  columnas: { x: number; NdKN: number }[],
  pasos = 4000
): PuntoDiagrama[] {
  const xs = new Set<number>();
  for (let i = 0; i <= pasos; i++) xs.add((A * i) / pasos);
  for (const c of columnas) xs.add(c.x);
  const xOrdenados = Array.from(xs).sort((a, b) => a - b);

  const w = (x: number) => B * (sigmaEdge0KPa + ((sigmaEdgeAKPa - sigmaEdge0KPa) * x) / A);

  const puntos: PuntoDiagrama[] = [{ x: 0, V: 0, M: 0 }];
  let V = 0;
  let M = 0;
  for (let i = 1; i < xOrdenados.length; i++) {
    const x0 = xOrdenados[i - 1];
    const x1 = xOrdenados[i];
    const dx = x1 - x0;
    // Carga distribuida entre x0 y x1 (trapecios).
    const dV = ((w(x0) + w(x1)) / 2) * dx;
    const Vmedio = V + dV / 2;
    M += Vmedio * dx;
    V += dV;
    // Salto de cortante si hay un pilar exactamente en x1.
    const columnaAqui = columnas.find((c) => Math.abs(c.x - x1) < 1e-9);
    if (columnaAqui) V -= columnaAqui.NdKN;
    puntos.push({ x: x1, V, M });
  }
  return puntos;
}

/**
 * Motor genérico: una franja de fundación (zapata combinada o franja de losa)
 * tratada como una viga sobre el terreno, cargada por N pilares. Reutilizado
 * tanto por "Zapata combinada" (2 pilares) como por "Losa de fundación"
 * (franja representativa con varios pilares en línea).
 */
export function calcularVigaSobreTerreno(
  materiales: MaterialesDerivados,
  longitudM: number,
  anchoM: number,
  H: number,
  recubrimiento: number,
  sigmaAdmisibleKPa: number,
  columnas: ColumnaCombinada[],
  armadoInferior: ArmadoPrincipalCombinada,
  armadoSuperior: ArmadoPrincipalCombinada,
  armadoSecundario: ArmadoSecundarioCombinada
): ResultadoVigaSobreTerreno {
  const A = longitudM;
  const B = anchoM;
  const { fcd, fyd, fydEstribos, fck } = materiales;

  const NkTotal = columnas.reduce((acc, c) => acc + c.Nk, 0);
  const pesoPropioKN = 25 * A * B * H;
  const xResultanteM = columnas.reduce((acc, c) => acc + c.Nk * c.posicionM, 0) / NkTotal;
  const excentricidadM = xResultanteM - A / 2;
  const dentroDelNucleo = Math.abs(excentricidadM) <= A / 6;

  const anchoEfectivoM = Math.max(A - 2 * Math.abs(excentricidadM), 0.01);
  const sigmaKPa = (NkTotal + pesoPropioKN) / (anchoEfectivoM * B);
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa && dentroDelNucleo;

  const d = H - recubrimiento - armadoInferior.diametroMm / 2000;

  const w0 = (B * A ** 2) / 6;
  const momentoExcentricidadKNm = NkTotal * excentricidadM;
  const sigmaEdge0KPa = (1.5 * NkTotal) / (A * B) - (1.5 * momentoExcentricidadKNm) / w0;
  const sigmaEdgeAKPa = (1.5 * NkTotal) / (A * B) + (1.5 * momentoExcentricidadKNm) / w0;

  const diagrama = calcularDiagrama(
    A,
    B,
    sigmaEdge0KPa,
    sigmaEdgeAKPa,
    columnas.map((c) => ({ x: c.posicionM, NdKN: 1.5 * c.Nk }))
  );

  let mPositivo = { M: 0, x: 0 };
  let mNegativo = { M: 0, x: 0 };
  let vMaxAbs = 0;
  for (const p of diagrama) {
    if (p.M > mPositivo.M) mPositivo = { M: p.M, x: p.x };
    if (p.M < mNegativo.M) mNegativo = { M: p.M, x: p.x };
    if (Math.abs(p.V) > vMaxAbs) vMaxAbs = Math.abs(p.V);
  }

  const armar = (
    momentoKNm: number,
    posicionM: number,
    armadura: ArmadoPrincipalCombinada
  ): ResultadoArmadoPrincipalCombinada => {
    const tdKN = momentoKNm / (0.85 * d);
    const asCalculadoCm2PorM = ((tdKN / (fydEstribos * 1000)) * 100 ** 2) / B;
    const asMinMecanicoCm2PorM = (100 ** 2 * 0.04 * 1 * H * fcd) / fyd;
    const asMinGeometricoCm2PorM = (100 ** 2 * 0.9 * 1 * H) / 1000;
    const asNecCm2PorM = Math.max(asCalculadoCm2PorM, asMinMecanicoCm2PorM, asMinGeometricoCm2PorM);
    const asRealCm2PorM = (Math.PI * (armadura.diametroMm / 10) ** 2) / 4 / armadura.separacionM;
    return {
      mKNm: momentoKNm,
      posicionM,
      asNecCm2PorM,
      asRealCm2PorM,
      verificaAs: asRealCm2PorM >= asNecCm2PorM,
    };
  };

  const inferior = armar(mPositivo.M, mPositivo.x, armadoInferior);
  const superior = armar(Math.abs(mNegativo.M), mNegativo.x, armadoSuperior);

  const asGeoSecundarioCm2 = (100 ** 2 * 0.9 * B * H) / 1000;
  const asRealPrincipalMax = Math.max(inferior.asRealCm2PorM, superior.asRealCm2PorM);
  const asNecSecundarioCm2 = Math.max(asGeoSecundarioCm2, 0.2 * asRealPrincipalMax * B);
  const asRealSecundarioCm2 = (armadoSecundario.numero * Math.PI * (armadoSecundario.diametroMm / 10) ** 2) / 4;

  const k = factorEscalaK(d);
  const rhoL = Math.max(inferior.asRealCm2PorM, superior.asRealCm2PorM) / (100 ** 2 * d);
  const vRdCKN = tensionCortanteResistente(k, rhoL, fck) * B * d * 1000;

  return {
    excentricidadM,
    dentroDelNucleo,
    geotecnico: { pesoPropioKN, sigmaKPa, verificaTension },
    dM: d,
    inferior,
    superior,
    secundario: {
      asNecCm2: asNecSecundarioCm2,
      asRealCm2: asRealSecundarioCm2,
      verificaAs: asRealSecundarioCm2 >= asNecSecundarioCm2,
    },
    cortante: { vEdKN: vMaxAbs, vRdCKN, verificaCorte: vMaxAbs <= vRdCKN },
  };
}

export interface GeometriaZapataCombinada {
  /** Longitud total de la zapata (m) */
  A: number;
  /** Ancho (m) */
  B: number;
  H: number;
  recubrimiento: number;
}

export interface DatosZapataCombinada {
  columna1: ColumnaCombinada;
  columna2: ColumnaCombinada;
  armadoInferior: ArmadoPrincipalCombinada;
  armadoSuperior: ArmadoPrincipalCombinada;
  armadoSecundario: ArmadoSecundarioCombinada;
}

export function calcularZapataCombinada(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataCombinada,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataCombinada
): ResultadoZapataCombinada {
  const { A, B, H, recubrimiento } = geometria;
  const { columna1, columna2, armadoInferior, armadoSuperior, armadoSecundario } = datos;
  return calcularVigaSobreTerreno(
    materiales,
    A,
    B,
    H,
    recubrimiento,
    sigmaAdmisibleKPa,
    [columna1, columna2],
    armadoInferior,
    armadoSuperior,
    armadoSecundario
  );
}
