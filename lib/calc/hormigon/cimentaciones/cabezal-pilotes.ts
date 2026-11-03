import { calcularAnclaje, mandrilMinimoMm, type FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
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
  /** Separación entre ejes de pilotes (m). Por defecto, 2,5·D. */
  separacionPilotesM?: number;
}

export interface ArmaduraCabezal {
  numero: number;
  diametroMm: number;
}

export interface EstribosCabezal {
  diametroMm: number;
  /** Separación entre estribos (m) */
  separacionM: number;
}

export interface DatosCabezal {
  /** Carga de cálculo del pilar (kN) */
  ndPilarKN: number;
  armaduraPrincipal: ArmaduraCabezal;
  armaduraSecundaria: ArmaduraCabezal;
  estribosVerticales: EstribosCabezal;
  estribosHorizontales: EstribosCabezal;
  /** Extremo del tirante sobre el pilote. Por defecto, barra recta. */
  formaAnclaje?: FormaAnclaje;
}

export interface ResultadoArmaduraPrincipalCabezal {
  /** Separación entre ejes de pilotes: 2D, 2,5D, 3D o la que se cargue (m) */
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
  /** Tensión del tirante en el anclaje, Td / As real con tope fyd (MPa) */
  sigmaSdAnclajeMPa: number;
  /** Longitud de anclaje necesaria, art. 8.4.4 ec. (8.4) (mm) */
  lbdMm: number;
  /**
   * Largo disponible sobre el eje de la barra desde el eje del pilote (criterio
   * del usuario, 2026-11-03) hasta el extremo de la barra; con patilla, recta +
   * doblez + la pata que entra en el canto (mm)
   */
  disponibleAnclajeMm: number;
  verificaAnclaje: boolean;
  /** Geometría de la patilla, sólo si el extremo es patilla a 90° */
  patilla: PatillaCabezal | null;
}

/**
 * Patilla a 90° del tirante, medida sobre el eje de la barra desde el eje del
 * pilote: recta hasta el doblez, el arco de radio (D + Ø)/2 y la pata vertical.
 */
export interface PatillaCabezal {
  /** Diámetro de mandril D, mínimo de la tabla A19.8.1 (mm) */
  mandrilMm: number;
  /** Del eje del pilote al inicio del doblez (mm) */
  rectaMm: number;
  /** Arco del doblez sobre el eje, ¼·π·(D + Ø)/2·2 (mm) */
  arcoMm: number;
  /** Pata vertical recta que hace falta para completar lbd (mm) */
  patillaNecMm: number;
  /** Pata vertical que entra en el canto, hasta H − rec (mm) */
  patillaDispMm: number;
}

export interface ResultadoArmaduraSecundariaCabezal {
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  separacionMm: number;
}

/**
 * Malla de una cara del cabezal, por metro: art. 9.7 (1) y (2) del Anejo 19,
 * vigas de gran canto, aplicado por analogía (criterio del usuario,
 * 2026-10-19). Cuenta sólo la rama exterior de cada cerco, la que está cerca
 * de la cara.
 */
export interface ResultadoEstribosCabezal {
  /** máx(0,1 %·espesor; 150 mm²/m) por cara y dirección (cm²/m) */
  asNecCm2: number;
  /** Rama exterior por metro, en una cara (cm²/m) */
  asRealCm2: number;
  verificaAs: boolean;
  /** Separación entre estribos (m) */
  separacionM: number;
  /**
   * Cuántos entran con esa separación: los verticales en el lado x menos
   * 0,2 m, los horizontales en el canto menos 0,15 m (los márgenes de la
   * planilla original)
   */
  numero: number;
  /** mín(300 mm; 2·espesor), art. 9.7 (2) (m) */
  separacionMaxM: number;
  verificaSeparacion: boolean;
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
  const formaAnclaje = datos.formaAnclaje ?? "recta";
  const { fck, fcd, fyk, fyd, fydEstribos } = materiales;

  const phiPrinc = armaduraPrincipal.diametroMm;
  const phiT = estribosVerticales.diametroMm;
  const phiL = estribosHorizontales.diametroMm;

  const separacionPilotesM = geometria.separacionPilotesM ?? 2.5 * diametroPiloteM;
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

  // Anclaje del tirante, Anejo 19 art. 8.4 (criterio del usuario, 2026-10-19,
  // el mismo de la zapata aislada): σsd = Td / As real con tope fyd, buena
  // adherencia (barras inferiores, fig. A19.8.2), α3 = α5 = 1.
  // cd = mín(recubrimiento, media separación libre) — fig. A19.8.3.
  const sigmaSdAnclajeMPa = Math.min((tdKN * 10) / asRealCm2, fyd);
  const cdMm = Math.min(recubrimientoM * 1000, (separacionPrincipalMm - phiPrinc) / 2);
  const { lbdMm } = calcularAnclaje(
    { fckMPa: fck, fykMPa: fyk, gammaC: materiales.gammaC, gammaS: materiales.gammaS },
    { diametroMm: phiPrinc, situacion: "buena", forma: formaAnclaje, esfuerzo: "traccion", recubrimientoMm: cdMm, sigmaSdMPa: sigmaSdAnclajeMPa }
  );
  // Se mide desde el eje del pilote, donde el modelo cierra el tirante: más
  // conservador que la cara interior que admite el art. 6.5.4 (7) (criterio
  // del usuario, 2026-11-03). Sobre el eje de la barra y con el doblez incluido
  // (fig. A19.8.1): con patilla a 90°, el mandril D es el mínimo de la tabla
  // A19.8.1 y la pata sube hasta H − rec.
  const voladoM = ladoXM / 2 - separacionPilotesM / 2 - recubrimientoM;
  let patilla: PatillaCabezal | null = null;
  let disponibleAnclajeMm = voladoM * 1000;
  if (formaAnclaje === "gancho") {
    const mandrilMm = mandrilMinimoMm(phiPrinc);
    const radioEjeMm = (mandrilMm + phiPrinc) / 2;
    const rectaMm = Math.max(voladoM * 1000 - phiPrinc / 2 - radioEjeMm, 0);
    const arcoMm = (Math.PI / 2) * radioEjeMm;
    const patillaDispMm = Math.max((hM - 2 * recubrimientoM) * 1000 - phiPrinc / 2 - radioEjeMm, 0);
    const patillaNecMm = Math.max(lbdMm - rectaMm - arcoMm, 0);
    patilla = { mandrilMm, rectaMm, arcoMm, patillaNecMm, patillaDispMm };
    disponibleAnclajeMm = rectaMm + arcoMm + patillaDispMm;
  }

  // Secundaria: el 10% de la armadura principal realmente colocada.
  const phiSec = armaduraSecundaria.diametroMm;
  const asSecNecCm2 = 0.1 * asRealCm2;
  const asSecRealCm2 = areaCm2(armaduraSecundaria.numero, phiSec);
  const separacionSecundariaMm =
    ((ladoXM - 2 * recubrimientoM - phiSec / 1000 - (2 * phiL) / 1000 - (2 * phiPrinc) / 1000) /
      (armaduraSecundaria.numero - 1)) *
    1000;

  // Armadura de las caras. Los encepados están fuera del Anejo 19 (art.
  // 9.8.1); con la luz entre pilotes menor que 3 veces el canto el cabezal es
  // una viga de gran canto (art. 5.3.1 (3)) y se le aplica por analogía el
  // art. 9.7 (pág. 152): malla ortogonal cerca de cada cara con
  // A_s,dbmin = 0,001·A_c por cara y dirección, ≥ 150 mm²/m, y separación
  // ≤ mín(300 mm; 2·espesor). Criterio del usuario, 2026-10-19: reemplaza el
  // 0,4 % de min(B, h/2) de la planilla original, que no tenía artículo.
  // El espesor de la "viga" es el lado transversal: las caras son las dos
  // paralelas a la línea de pilotes.
  // Se cargan Ø y separación (criterio del usuario, 2026-11-03); la cantidad
  // sale de repartirlos con los márgenes de la planilla original.
  const separacionVM = estribosVerticales.separacionM;
  const separacionHM = estribosHorizontales.separacionM;
  const numeroV = Math.floor(Math.max(ladoXM - 0.2, 0) / separacionVM + 1e-9) + 1;
  const numeroH = Math.floor(Math.max(hM - 0.15, 0) / separacionHM + 1e-9) + 1;
  const asCaraNecCm2 = Math.max(0.001 * ladoYM * 1e4, 1.5);
  const separacionMaxM = Math.min(0.3, 2 * ladoYM);
  const asTRealCm2 = areaCm2(1, phiT) / separacionVM;
  const asLRealCm2 = areaCm2(1, phiL) / separacionHM;

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
      sigmaSdAnclajeMPa,
      lbdMm,
      disponibleAnclajeMm,
      verificaAnclaje: disponibleAnclajeMm >= lbdMm,
      patilla,
    },
    secundaria: {
      asNecCm2: asSecNecCm2,
      asRealCm2: asSecRealCm2,
      verificaAs: asSecRealCm2 >= asSecNecCm2,
      separacionMm: separacionSecundariaMm,
    },
    estribosVerticales: {
      asNecCm2: asCaraNecCm2,
      asRealCm2: asTRealCm2,
      verificaAs: asTRealCm2 >= asCaraNecCm2,
      separacionM: separacionVM,
      numero: numeroV,
      separacionMaxM,
      verificaSeparacion: separacionVM <= separacionMaxM,
    },
    estribosHorizontales: {
      asNecCm2: asCaraNecCm2,
      asRealCm2: asLRealCm2,
      verificaAs: asLRealCm2 >= asCaraNecCm2,
      separacionM: separacionHM,
      numero: numeroH,
      separacionMaxM,
      verificaSeparacion: separacionHM <= separacionMaxM,
    },
    bielas,
  };
}
