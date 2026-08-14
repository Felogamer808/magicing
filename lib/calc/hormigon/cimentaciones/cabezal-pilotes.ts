import { GAMMA_G } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Cabezal sobre dos pilotes, resuelto con un modelo de bielas y tirantes: la
 * carga del pilar baja por dos bielas comprimidas hasta los pilotes y el
 * tirante inferior (la armadura principal) equilibra la componente horizontal.
 */

export interface GeometriaCabezal {
  /** Dimensión del pilar en la dirección que une los pilotes (m) */
  anchoPilarM: number;
  /** Lado del cabezal en la dirección que une los pilotes (m) */
  ladoXM: number;
  /** Lado del cabezal en la dirección transversal (m) */
  ladoYM: number;
  /** Canto del cabezal (m) */
  hM: number;
  /** Diámetro del pilote (m) */
  diametroPiloteM: number;
  /** Recubrimiento de la armadura de fundación (m) */
  recubrimientoM: number;
}

export interface ArmaduraCabezal {
  numero: number;
  diametroMm: number;
}

export interface EstribosCabezal {
  numero: number;
  diametroMm: number;
  /** Número de cercos por posición (sólo estribos verticales) */
  numeroCercos?: number;
}

export interface DatosCabezal {
  /** Carga de cálculo del pilar (kN) */
  ndPilarKN: number;
  armaduraPrincipal: ArmaduraCabezal;
  armaduraSecundaria: ArmaduraCabezal;
  estribosVerticales: EstribosCabezal;
  estribosHorizontales: EstribosCabezal;
}

export interface ResultadoArmaduraPrincipalCabezal {
  /** Separación entre ejes de pilotes, 2,5 veces el diámetro (m) */
  separacionPilotesM: number;
  /** Brazo desde el eje del pilote a la cara del pilar (m) */
  vM: number;
  dM: number;
  /** Peso propio del cabezal (kN) */
  pesoPropioKN: number;
  /** Carga de cálculo por pilote (kN) */
  ndPorPiloteKN: number;
  /** Tracción del tirante (kN) */
  tdKN: number;
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** Ancho necesario para alojar las barras en una fila (m) */
  bNecM: number;
  verificaBNec: boolean;
  /** Separación entre ejes de barras (mm) */
  separacionMm: number;
  lbIMm: number;
  lbNetaMm: number;
}

export interface ResultadoArmaduraSecundariaCabezal {
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  separacionMm: number;
  lbIIMm: number;
  lbNetaMm: number;
}

export interface ResultadoEstribosCabezal {
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** Separación entre estribos (m) */
  separacionM: number;
}

/**
 * Compresión en la biela inclinada y en el nudo sobre el pilote — art. 6.5.2 y
 * 6.5.4. Dimensionar el tirante no alcanza: hay que comprobar que el hormigón
 * aguante la biela que lo tracciona.
 */
export interface ResultadoBielasCabezal {
  /** Inclinación de la biela respecto de la horizontal (grados) */
  anguloBielaGrados: number;
  /** Compresión en la biela (MPa) */
  sigmaBielaMPa: number;
  /** Tope de la biela con tracción transversal, 0,6·ν'·fcd (MPa) */
  sigmaBielaMaxMPa: number;
  verificaBiela: boolean;
  /** Compresión en el nudo sobre el pilote (MPa) */
  sigmaNudoMPa: number;
  /** Tope del nudo con tirante anclado en una dirección, 0,85·ν'·fcd (MPa) */
  sigmaNudoMaxMPa: number;
  verificaNudo: boolean;
}

export interface ResultadoCabezal {
  principal: ResultadoArmaduraPrincipalCabezal;
  secundaria: ResultadoArmaduraSecundariaCabezal;
  estribosVerticales: ResultadoEstribosCabezal;
  estribosHorizontales: ResultadoEstribosCabezal;
  bielas: ResultadoBielasCabezal;
}

const areaCm2 = (n: number, diametroMm: number) => (n * Math.PI * (diametroMm / 10) ** 2) / 4;

export function calcularCabezalDosPilotes(
  materiales: MaterialesDerivados,
  geometria: GeometriaCabezal,
  datos: DatosCabezal
): ResultadoCabezal {
  const { anchoPilarM, ladoXM, ladoYM, hM, diametroPiloteM, recubrimientoM } = geometria;
  const { ndPilarKN, armaduraPrincipal, armaduraSecundaria, estribosVerticales, estribosHorizontales } = datos;
  const { fck, fcd, fyk, fydEstribos } = materiales;

  const phiPrinc = armaduraPrincipal.diametroMm;
  const phiT = estribosVerticales.diametroMm;
  const phiL = estribosHorizontales.diametroMm;

  const separacionPilotesM = 2.5 * diametroPiloteM;
  const vM = separacionPilotesM / 2 - anchoPilarM / 2;
  const dM = hM - recubrimientoM - phiT / 1000 - phiPrinc / 2000;

  const pesoPropioKN = ladoXM * ladoYM * hM * 25;
  const ndPorPiloteKN = (ndPilarKN + GAMMA_G * pesoPropioKN) / 2;
  const tdKN = (ndPorPiloteKN * (vM + anchoPilarM / 4)) / (0.85 * dM);

  const asNecCm2 = (tdKN * 100 ** 2) / (fydEstribos * 1000);
  const asRealCm2 = areaCm2(armaduraPrincipal.numero, phiPrinc);

  // Bielas y nudos del modelo (art. 6.5.2 y 6.5.4). Dimensionar el tirante sin
  // comprobar el hormigón deja fuera justamente el modo en que suelen agotarse
  // los cabezales bajos: la biela es corta y muy inclinada, y la compresión se
  // concentra sobre el pilote.
  //
  // Se comprueban los dos que la geometría define sin ambigüedad: el nudo sobre
  // el pilote y la biela. El nudo superior bajo el pilar necesitaría las dos
  // dimensiones del pilar y acá sólo se carga el ancho; además rara vez gobierna,
  // porque el pilar ya está dimensionado para ese mismo axil con su propio fcd.
  const nuPrima = 1 - fck / 250;
  const anguloBiela = Math.atan((0.85 * dM) / (vM + anchoPilarM / 4));
  const areaPiloteM2 = (Math.PI * diametroPiloteM ** 2) / 4;

  // Nudo comprimido con el tirante anclado en una dirección: k2 = 0,85 (ec. 6.61).
  const sigmaNudoMPa = ndPorPiloteKN / (areaPiloteM2 * 1000);
  const sigmaNudoMaxMPa = 0.85 * nuPrima * fcd;

  // La biela baja inclinada y apoya sobre la proyección del pilote. Lleva
  // tracción transversal —es lo que toma el tirante—, así que su tope es el
  // reducido de la ec. (6.56), no fcd.
  const fBielaKN = ndPorPiloteKN / Math.sin(anguloBiela);
  const sigmaBielaMPa = fBielaKN / (areaPiloteM2 * Math.sin(anguloBiela) * 1000);
  const sigmaBielaMaxMPa = 0.6 * nuPrima * fcd;

  const bielas: ResultadoBielasCabezal = {
    anguloBielaGrados: (anguloBiela * 180) / Math.PI,
    sigmaBielaMPa,
    sigmaBielaMaxMPa,
    verificaBiela: sigmaBielaMPa <= sigmaBielaMaxMPa,
    sigmaNudoMPa,
    sigmaNudoMaxMPa,
    verificaNudo: sigmaNudoMPa <= sigmaNudoMaxMPa,
  };

  const bNecM =
    2 * (recubrimientoM + phiT / 1000 + phiL / 1000) +
    (armaduraPrincipal.numero * phiPrinc) / 1000 +
    (armaduraPrincipal.numero - 1) * Math.max(0.02, phiPrinc / 1000);

  const separacionPrincipalMm =
    ((ladoYM - 2 * recubrimientoM - phiPrinc / 1000 - (2 * phiL) / 1000) /
      (armaduraPrincipal.numero - 1)) *
    1000;

  const lbIMm = Math.max(1.3 * phiPrinc ** 2, (fyk * phiPrinc) / 20);
  const lbNetaMm = Math.max((lbIMm * asNecCm2) / asRealCm2, 10 * phiPrinc, 150, lbIMm / 3);

  // Secundaria: el 10% de la armadura principal realmente colocada.
  const phiSec = armaduraSecundaria.diametroMm;
  const asSecNecCm2 = 0.1 * asRealCm2;
  const asSecRealCm2 = areaCm2(armaduraSecundaria.numero, phiSec);
  const lbIISecMm = Math.max(1.4 * 1.3 * phiSec ** 2, (fyk * phiSec) / 14);
  const separacionSecundariaMm =
    ((ladoXM - 2 * recubrimientoM - phiSec / 1000 - (2 * phiL) / 1000 - (2 * phiPrinc) / 1000) /
      (armaduraSecundaria.numero - 1)) *
    1000;

  // Armadura de reparto en las caras: 0,4% del menor entre el ancho y medio canto.
  const anchoReferenciaM = Math.min(ladoYM, hM / 2);

  const asTNecCm2 = 100 ** 2 * 0.004 * anchoReferenciaM * ladoXM;
  const asTRealCm2 =
    (estribosVerticales.numeroCercos ?? 1) * 2 * areaCm2(estribosVerticales.numero, phiT);

  const asLNecCm2 = 100 ** 2 * 0.004 * anchoReferenciaM * hM;
  const asLRealCm2 = 2 * areaCm2(estribosHorizontales.numero, phiL);

  return {
    principal: {
      separacionPilotesM,
      vM,
      dM,
      pesoPropioKN,
      ndPorPiloteKN,
      tdKN,
      asNecCm2,
      asRealCm2,
      verificaAs: asRealCm2 >= asNecCm2,
      bNecM,
      verificaBNec: bNecM <= ladoYM,
      separacionMm: separacionPrincipalMm,
      lbIMm,
      lbNetaMm,
    },
    secundaria: {
      asNecCm2: asSecNecCm2,
      asRealCm2: asSecRealCm2,
      verificaAs: asSecRealCm2 >= asSecNecCm2,
      separacionMm: separacionSecundariaMm,
      lbIIMm: lbIISecMm,
      lbNetaMm: Math.max((lbIISecMm * asSecNecCm2) / asSecRealCm2, 10 * phiSec, 150, lbIISecMm / 3),
    },
    estribosVerticales: {
      asNecCm2: asTNecCm2,
      asRealCm2: asTRealCm2,
      verificaAs: asTRealCm2 >= asTNecCm2,
      separacionM: (ladoXM - 0.2) / Math.max(estribosVerticales.numero - 1, 1),
    },
    estribosHorizontales: {
      asNecCm2: asLNecCm2,
      asRealCm2: asLRealCm2,
      verificaAs: asLRealCm2 >= asLNecCm2,
      separacionM: (hM - 0.15) / Math.max(estribosHorizontales.numero - 1, 1),
    },
    bielas,
  };
}
