import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularFluencia,
  cementoDesdeNombre,
  exposicionDesdeNombre,
  perimetroExpuestoM,
  tamanoTeoricoMm,
} from "@/lib/calc/hormigon/comun/diferidas";
import {
  calcularPilar,
  cercosAutomaticos,
  diametrosLongitudinales,
  type ArmaduraPilar,
  type CercosAutomaticos,
  type DireccionPilar,
  type EsfuerzosPilar,
  type GeometriaPilar,
} from "@/lib/calc/hormigon/pilares/pilar";

/** Casos de la figura A19.5.7, y uno libre para escribir β a mano. */
export const COACCIONES_PILAR = [
  "Biarticulado (β = 1,0)",
  "Articulado-empotrado (β = 0,7)",
  "Biempotrado (β = 0,5)",
  "En ménsula (β = 2,0)",
  "Otro (β a mano)",
] as const;

const BETA_COACCION: Record<string, number> = {
  [COACCIONES_PILAR[0]]: 1,
  [COACCIONES_PILAR[1]]: 0.7,
  [COACCIONES_PILAR[2]]: 0.5,
  [COACCIONES_PILAR[3]]: 2,
};

export const ARRIOSTRAMIENTO = ["Arriostrado", "Sin arriostrar"] as const;

export const MODOS_FLUENCIA = [
  "Sin dato (A = 0,7)",
  "φef conocido",
  "Calcular con el Apéndice B",
] as const;

/** dg sin dato: el árido de 20 mm habitual en edificación. */
export const TAMANO_ARIDO_POR_DEFECTO_MM = 20;

/**
 * Cercos fijados por la longitudinal (art. 9.5.3 y cortante) o cargados a
 * mano. Sin el campo se toman a mano: así se leen los cálculos guardados
 * antes de que existiera la opción.
 */
export const MODOS_CERCOS = ["Automáticos (art. 9.5.3)", "A mano"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverPilar(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"), fyk: num("fyk"),
    b: num("b"), h: num("h"), altura: num("altura"), rec: num("rec"),
    nEd: num("nEd"),
    m01H: num("m01H"), m02H: num("m02H"), vEdH: num("vEdH"),
    m01B: num("m01B"), m02B: num("m02B"), vEdB: num("vEdB"),
    phi: num("phi"), nCaraB: num("nCaraB"), nCaraH: num("nCaraH"),
    // Antes todas las barras tenían el Ø de `phi`, que ahora es el de las
    // esquinas: lo guardado sin las filas lleva ése mismo.
    phiCaraB: campos.phiCaraB === undefined ? num("phi") : num("phiCaraB"),
    phiCaraH: campos.phiCaraH === undefined ? num("phi") : num("phiCaraH"),
    dg: campos.dg === undefined ? TAMANO_ARIDO_POR_DEFECTO_MM : num("dg"),
    phiCerco: num("phiCerco"), sepCercos: num("sepCercos"),
    // Los cálculos guardados antes de la zona de nudo no la traen: la corriente.
    sepCercosNudo: campos.sepCercosNudo === undefined ? num("sepCercos") : num("sepCercosNudo"),
    ramasH: num("ramasH"), ramasB: num("ramasB"),
  };
  const cercosAuto = campos.cercos === MODOS_CERCOS[0];
  const enteros = [v.nCaraB, v.nCaraH, v.ramasH, v.ramasB];
  if (!enteros.every((x) => Number.isInteger(x) && x >= 2)) return null;
  const positivos = [v.fck, v.fyk, v.b, v.h, v.altura, v.rec, v.nEd, v.phi, v.dg];
  // El Ø de una fila sólo hace falta si la fila tiene barras.
  if (v.nCaraB > 2) positivos.push(v.phiCaraB);
  if (v.nCaraH > 2) positivos.push(v.phiCaraH);
  if (!cercosAuto) positivos.push(v.phiCerco, v.sepCercos, v.sepCercosNudo);
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![v.m01H, v.m02H, v.vEdH, v.m01B, v.m02B, v.vEdB].every(Number.isFinite)) return null;

  const beta = (dir: DireccionPilar) => {
    const sufijo = dir === "h" ? "H" : "B";
    const coaccion = campos[`coaccion${sufijo}`] ?? COACCIONES_PILAR[0];
    return BETA_COACCION[coaccion] ?? num(`beta${sufijo}`);
  };
  const betaH = beta("h");
  const betaB = beta("b");
  if (!(betaH > 0) || !(betaB > 0)) return null;

  // Fluencia: sin dato, la del A = 0,7 que admite el art. 5.8.3.1; cargada; o
  // φef = φ(∞,t0)·M0Eqp/M0Ed (ec. 5.19) con el φ del Apéndice B.
  const modoFluencia = campos.modoFluencia ?? MODOS_FLUENCIA[0];
  let fluenciaEficaz: number | undefined;
  let fluenciaBasica: number | undefined;
  let h0Mm: number | undefined;
  if (modoFluencia === MODOS_FLUENCIA[1]) {
    fluenciaEficaz = num("phiEf");
    if (!(fluenciaEficaz >= 0)) return null;
  } else if (modoFluencia === MODOS_FLUENCIA[2]) {
    const exposicion = exposicionDesdeNombre(campos.exposicion ?? "", "cuatro-caras");
    h0Mm = tamanoTeoricoMm(v.b * v.h, perimetroExpuestoM(exposicion, v.b, v.h));
    const relacion = num("relacionMqp");
    const hr = num("hr");
    const t0 = num("t0");
    if (!(relacion >= 0 && relacion <= 1) || !(hr > 0) || !(t0 > 0)) return null;
    fluenciaBasica = calcularFluencia({
      fckMPa: v.fck, hrPct: hr, t0Dias: t0, claseCemento: cementoDesdeNombre(campos.cemento ?? ""), h0Mm,
    }).phi;
    fluenciaEficaz = fluenciaBasica * relacion;
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria: GeometriaPilar = {
    bM: v.b, hM: v.h, alturaLibreM: v.altura, recubrimientoM: v.rec, tamanoMaximoAridoMm: v.dg,
  };
  const longitudinal = {
    diametroEsquinaMm: v.phi,
    barrasCaraB: v.nCaraB, diametroCaraBMm: v.phiCaraB,
    barrasCaraH: v.nCaraH, diametroCaraHMm: v.phiCaraH,
    ramasH: v.ramasH, ramasB: v.ramasB,
  };
  const esfuerzos: EsfuerzosPilar = {
    nEdKN: v.nEd,
    h: { beta: betaH, arriostrado: campos.arriostradoH !== ARRIOSTRAMIENTO[1], m01KNm: v.m01H, m02KNm: v.m02H, vEdKN: v.vEdH },
    b: { beta: betaB, arriostrado: campos.arriostradoB !== ARRIOSTRAMIENTO[1], m01KNm: v.m01B, m02KNm: v.m02B, vEdKN: v.vEdB },
    fluenciaEficaz,
  };

  // En automático, los cercos calculados reemplazan a los cargados también en
  // `v`: el dibujo y la revisión muestran los que se usan.
  let cercos: CercosAutomaticos | undefined;
  if (cercosAuto) {
    cercos = cercosAutomaticos(materiales, geometria, longitudinal, esfuerzos);
    v.phiCerco = cercos.diametroCercoMm;
    v.sepCercos = cercos.separacionCercosM;
    v.sepCercosNudo = cercos.separacionCercosNudoM;
  }
  // Las barras tienen que entrar con recubrimiento de los dos lados.
  const r = v.rec + v.phiCerco / 1000 + Math.max(...diametrosLongitudinales(longitudinal)) / 2000;
  if (2 * r >= Math.min(v.b, v.h)) return null;

  const armadura: ArmaduraPilar = {
    ...longitudinal,
    diametroCercoMm: v.phiCerco, separacionCercosM: v.sepCercos, separacionCercosNudoM: v.sepCercosNudo,
  };
  const r0 = calcularPilar(materiales, geometria, armadura, esfuerzos);

  return { v, geometria, armadura, r: r0, cercos, beta: { h: betaH, b: betaB }, fluencia: { modo: modoFluencia, basica: fluenciaBasica, h0Mm } };
}

export type ResueltoPilar = NonNullable<ReturnType<typeof resolverPilar>>;
