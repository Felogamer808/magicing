import { calcularAnclaje, type FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { GAMMA_G } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Cabezal sobre tres o más pilotes, en cualquier disposición.
 *
 * Los encepados están fuera del Anejo 19 (art. 9.8.1, pág. 152): se resuelve
 * con el método general de bielas y tirantes (art. 6.5), como el de 2 pilotes,
 * del que este modelo es la generalización. Criterios del usuario
 * (2026-10-23):
 *
 * - El pilar está en el centro del grupo de pilotes y el cabezal es rígido:
 *   cada pilote recibe Ri = (Nd + γG·PP)/n.
 * - Tirante por dirección, con la sección de referencia a a/4 del eje del
 *   pilar (la misma del de 2 pilotes):
 *
 *     T = Σ Ri·(|ui| − a/4) / (0,85·d)
 *
 *   sobre los pilotes de un lado, el peor de los dos, en A y en B. Con 2
 *   pilotes es la fórmula del de 2; con 4 en cuadro, dos bandas de
 *   (N/4)·(s/2 − a/4)/(0,85·d). Un pilote dentro de a/4 no tira del tirante.
 * - En cada pilote, la biela (0,6·ν'·fcd) y el nudo, con k según cuántos
 *   tirantes ancla: k1 = 1,0 (ninguno), k2 = 0,85 (uno), k3 = 0,75 (dos),
 *   ecs. (6.60) a (6.62), págs. 99-100.
 * - Armadura inferior en A y en B, cada una contra su T, anclada por el
 *   art. 8.4 desde la cara interior del pilote más externo. Malla de caras del
 *   art. 9.7 por analogía, como el de 2, con el canto H como espesor: el
 *   bloque trabaja como placa (con el lado menor, un cabezal de 1,9 m pedía
 *   19 cm²/m por cara).
 * - Criterio de oficina, no del Anejo 19 (que no trae reglas de encepados):
 *   parrilla entre bandas ≥ 1/4 de la armadura de las bandas y armadura
 *   superior ≥ 1/10 de la inferior, en cada dirección. Son las de la
 *   EHE-08, art. 58.4.1.2.2, tomadas como práctica constructiva.
 *
 * La capa en A va abajo; la de B, encima: su canto útil es menor en φA.
 */

/** Centro de un pilote en los ejes del cabezal: A a lo largo, B a lo ancho, origen en el centro (m). */
export interface PiloteCabezal {
  aM: number;
  bM: number;
}

export interface GeometriaCabezalN {
  /** Lados del cabezal en A y en B (m) */
  ladoAM: number;
  ladoBM: number;
  hM: number;
  /** Lados del pilar en A y en B (m) */
  pilarAM: number;
  pilarBM: number;
  diametroPiloteM: number;
  recubrimientoM: number;
  pilotes: readonly PiloteCabezal[];
}

export interface BarrasCabezal {
  numero: number;
  diametroMm: number;
}

export interface DatosCabezalN {
  ndPilarKN: number;
  /** Armadura inferior paralela a A, repartida a lo ancho (B) */
  armaduraA: BarrasCabezal;
  /** Armadura inferior paralela a B, encima de la de A */
  armaduraB: BarrasCabezal;
  /** Cercos verticales de las caras: diámetro y separación */
  estriboVerticalMm: number;
  separacionVerticalM: number;
  /** Cercos horizontales de las caras, repartidos en el canto */
  estribosHorizontales: BarrasCabezal;
  /** Parrilla inferior entre bandas y malla superior: diámetro y separación, iguales en las dos direcciones */
  parrilla: MallaCabezal;
  superior: MallaCabezal;
  formaAnclaje?: FormaAnclaje;
}

export interface MallaCabezal {
  diametroMm: number;
  separacionM: number;
}

/** Una malla de criterio contra la armadura de referencia, en una dirección (cm²). */
export interface ResultadoCriterioCabezalN {
  asNecCm2: number;
  asRealCm2: number;
  verifica: boolean;
}

export interface ResultadoDireccionCabezalN {
  dM: number;
  /** Del eje del pilar al pilote más alejado en esta dirección, en el peor lado (m) */
  brazoMaxM: number;
  tdKN: number;
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** Ancho para alojar las barras en una fila, contra el otro lado (m) */
  bNecM: number;
  verificaBNec: boolean;
  separacionMm: number;
  sigmaSdAnclajeMPa: number;
  lbdMm: number;
  /** De la cara interior del pilote más externo al borde menos el recubrimiento (+ patilla) (mm) */
  disponibleAnclajeMm: number;
  verificaAnclaje: boolean;
}

export interface ResultadoPiloteCabezalN {
  aM: number;
  bM: number;
  /** Tirantes que ancla: 0, 1 o 2 */
  tirantes: number;
  anguloBielaGrados: number;
  sigmaBielaMPa: number;
  sigmaNudoMPa: number;
  sigmaNudoMaxMPa: number;
  verificaNudo: boolean;
}

export interface ResultadoMallaCabezalN {
  asNecCm2: number;
  asVerticalCm2: number;
  asHorizontalCm2: number;
  separacionHorizontalM: number;
  separacionMaxM: number;
  verifica: boolean;
}

export interface ResultadoCabezalN {
  pesoPropioKN: number;
  reaccionPiloteKN: number;
  /** El pilar está en el centro del grupo: su posición en los ejes del cabezal (m) */
  pilarAM: number;
  pilarBM: number;
  /** Todos los pilotes dentro del cabezal */
  geometriaValida: boolean;
  direccionA: ResultadoDireccionCabezalN;
  direccionB: ResultadoDireccionCabezalN;
  pilotes: ResultadoPiloteCabezalN[];
  /** El pilote con la biela más cargada respecto de su tope */
  sigmaBielaMaxMPa: number;
  verificaBielas: boolean;
  verificaNudos: boolean;
  malla: ResultadoMallaCabezalN;
  /** Parrilla entre bandas ≥ 1/4 de las bandas, en A y en B */
  parrillaA: ResultadoCriterioCabezalN;
  parrillaB: ResultadoCriterioCabezalN;
  /** Superior ≥ 1/10 de la inferior (bandas), en A y en B */
  superiorA: ResultadoCriterioCabezalN;
  superiorB: ResultadoCriterioCabezalN;
}

const areaCm2 = (n: number, diametroMm: number) => (n * Math.PI * (diametroMm / 10) ** 2) / 4;

export function calcularCabezalNPilotes(
  materiales: MaterialesDerivados,
  g: GeometriaCabezalN,
  datos: DatosCabezalN
): ResultadoCabezalN {
  const { fck, fcd, fyk, fyd, fydEstribos } = materiales;
  const { pilotes, diametroPiloteM: dp, recubrimientoM: rec } = g;
  const n = pilotes.length;
  const forma = datos.formaAnclaje ?? "recta";

  const pilarAM = pilotes.reduce((s, p) => s + p.aM, 0) / n;
  const pilarBM = pilotes.reduce((s, p) => s + p.bM, 0) / n;
  const geometriaValida =
    n >= 3 &&
    pilotes.every((p) => Math.abs(p.aM) + dp / 2 <= g.ladoAM / 2 + 1e-9 && Math.abs(p.bM) + dp / 2 <= g.ladoBM / 2 + 1e-9);

  const pesoPropioKN = g.ladoAM * g.ladoBM * g.hM * 25;
  const reaccionPiloteKN = (datos.ndPilarKN + GAMMA_G * pesoPropioKN) / n;

  const phiA = datos.armaduraA.diametroMm;
  const phiB = datos.armaduraB.diametroMm;
  const phiV = datos.estriboVerticalMm;
  const phiH = datos.estribosHorizontales.diametroMm;
  const dA = g.hM - rec - phiV / 1000 - phiA / 2000;
  const dB = dA - phiA / 2000 - phiB / 2000;

  const direccion = (
    eje: "aM" | "bM",
    centro: number,
    pilar: number,
    lado: number,
    otroLado: number,
    d: number,
    barras: BarrasCabezal
  ): ResultadoDireccionCabezalN => {
    const phi = barras.diametroMm;
    // Peor lado: Σ Ri·(|u| − a/4) de los pilotes que quedan más allá de a/4.
    const lados = [1, -1].map((s) => {
      const brazos = pilotes.map((p) => s * (p[eje] - centro) - pilar / 4).filter((x) => x > 0);
      return { suma: brazos.reduce((t, x) => t + x, 0), max: brazos.length ? Math.max(...brazos) + pilar / 4 : 0 };
    });
    const peor = lados[0].suma >= lados[1].suma ? lados[0] : lados[1];
    const tdKN = (reaccionPiloteKN * peor.suma) / (0.85 * d);
    const asNecCm2 = (tdKN * 100 ** 2) / (fydEstribos * 1000);
    const asRealCm2 = areaCm2(barras.numero, phi);

    const bNecM = 2 * (rec + phiV / 1000 + phiH / 1000) + (barras.numero * phi) / 1000 + (barras.numero - 1) * Math.max(0.02, phi / 1000);
    const separacionMm = ((otroLado - 2 * rec - phi / 1000 - (2 * phiH) / 1000) / (barras.numero - 1)) * 1000;

    // Anclaje, Anejo 19 art. 8.4, como el de 2 pilotes: σsd = Td/As con tope
    // fyd, buena adherencia; desde la cara interior del pilote más externo
    // (art. 6.5.4 (7), pág. 100) hasta el borde, en el lado más corto.
    const sigmaSdAnclajeMPa = Math.min((tdKN * 10) / asRealCm2, fyd);
    const cdMm = Math.min(rec * 1000, (separacionMm - phi) / 2);
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk, gammaC: materiales.gammaC, gammaS: materiales.gammaS },
      { diametroMm: phi, situacion: "buena", forma, esfuerzo: "traccion", recubrimientoMm: cdMm, sigmaSdMPa: sigmaSdAnclajeMPa }
    );
    const rectaM = Math.min(
      ...[1, -1].map((s) => lado / 2 - Math.max(...pilotes.map((p) => s * p[eje])) + dp / 2 - rec)
    );
    const pataM = forma === "gancho" ? Math.max(g.hM - 2 * rec, 0) : 0;
    const disponibleAnclajeMm = (rectaM + pataM) * 1000;

    return {
      dM: d,
      brazoMaxM: peor.max,
      tdKN,
      asNecCm2,
      asRealCm2,
      verificaAs: asRealCm2 >= asNecCm2,
      bNecM,
      verificaBNec: bNecM <= otroLado,
      separacionMm,
      sigmaSdAnclajeMPa,
      lbdMm,
      disponibleAnclajeMm,
      // Sin tirante no hay nada que anclar.
      verificaAnclaje: tdKN <= 0 || disponibleAnclajeMm >= lbdMm,
    };
  };

  const direccionA = direccion("aM", pilarAM, g.pilarAM, g.ladoAM, g.ladoBM, dA, datos.armaduraA);
  const direccionB = direccion("bM", pilarBM, g.pilarBM, g.ladoBM, g.ladoAM, dB, datos.armaduraB);

  // Bielas y nudos, art. 6.5.2 y 6.5.4. La biela baja del cuarto del pilar al
  // pilote, con el canto útil del tirante que ancla; si ancla los dos, el de
  // la capa de arriba (dB), que la deja más tendida.
  const nuPrima = 1 - fck / 250;
  const areaPiloteM2 = (Math.PI * dp ** 2) / 4;
  const sigmaBielaMaxMPa = 0.6 * nuPrima * fcd;
  const k = [1.0, 0.85, 0.75];
  const resultadosPilotes = pilotes.map((p): ResultadoPiloteCabezalN => {
    const ra = Math.max(Math.abs(p.aM - pilarAM) - g.pilarAM / 4, 0);
    const rb = Math.max(Math.abs(p.bM - pilarBM) - g.pilarBM / 4, 0);
    const tirantes = (ra > 0 ? 1 : 0) + (rb > 0 ? 1 : 0);
    const d = rb > 0 ? dB : dA;
    const angulo = Math.atan2(0.85 * d, Math.hypot(ra, rb));
    const sigmaNudoMPa = reaccionPiloteKN / (areaPiloteM2 * 1000);
    const sigmaNudoMaxMPa = k[tirantes] * nuPrima * fcd;
    return {
      aM: p.aM,
      bM: p.bM,
      tirantes,
      anguloBielaGrados: (angulo * 180) / Math.PI,
      sigmaBielaMPa: reaccionPiloteKN / (areaPiloteM2 * Math.sin(angulo) ** 2 * 1000),
      sigmaNudoMPa,
      sigmaNudoMaxMPa,
      verificaNudo: sigmaNudoMPa <= sigmaNudoMaxMPa,
    };
  });

  // Malla de caras, art. 9.7 (1) y (2), pág. 152, por analogía, con el canto
  // como espesor (criterio del usuario, 2026-10-23).
  const espesor = g.hM;
  const asNecCm2 = Math.max(0.001 * espesor * 1e4, 1.5);
  const separacionMaxM = Math.min(0.3, 2 * espesor);
  const separacionHorizontalM = (g.hM - 0.15) / Math.max(datos.estribosHorizontales.numero - 1, 1);
  const asVerticalCm2 = areaCm2(1, phiV) / datos.separacionVerticalM;
  const asHorizontalCm2 = areaCm2(1, phiH) / separacionHorizontalM;

  // Parrilla y superior, criterio de oficina: barras paralelas a una
  // dirección, repartidas a lo ancho del otro lado.
  const malla = (m: MallaCabezal, ancho: number) => areaCm2(Math.floor((ancho - 2 * rec) / m.separacionM + 1e-9) + 1, m.diametroMm);
  const criterio = (asNecCm2: number, asRealCm2: number): ResultadoCriterioCabezalN => ({
    asNecCm2,
    asRealCm2,
    verifica: asRealCm2 >= asNecCm2,
  });

  return {
    parrillaA: criterio(direccionA.asRealCm2 / 4, malla(datos.parrilla, g.ladoBM)),
    parrillaB: criterio(direccionB.asRealCm2 / 4, malla(datos.parrilla, g.ladoAM)),
    superiorA: criterio(direccionA.asRealCm2 / 10, malla(datos.superior, g.ladoBM)),
    superiorB: criterio(direccionB.asRealCm2 / 10, malla(datos.superior, g.ladoAM)),
    pesoPropioKN,
    reaccionPiloteKN,
    pilarAM,
    pilarBM,
    geometriaValida,
    direccionA,
    direccionB,
    pilotes: resultadosPilotes,
    sigmaBielaMaxMPa,
    verificaBielas: resultadosPilotes.every((p) => p.sigmaBielaMPa <= sigmaBielaMaxMPa),
    verificaNudos: resultadosPilotes.every((p) => p.verificaNudo),
    malla: {
      asNecCm2,
      asVerticalCm2,
      asHorizontalCm2,
      separacionHorizontalM,
      separacionMaxM,
      verifica:
        asVerticalCm2 >= asNecCm2 &&
        asHorizontalCm2 >= asNecCm2 &&
        datos.separacionVerticalM <= separacionMaxM &&
        separacionHorizontalM <= separacionMaxM,
    },
  };
}
