/**
 * Puente entre los campos de la página y el motor, para viga a flexión y
 * cortante.
 *
 * Vive acá y no dentro de la página por un motivo concreto: la memoria de
 * cálculo tiene que volver a correr un cálculo guardado meses después, y si
 * reimplementara la conversión de campos a entradas del motor, tarde o temprano
 * la memoria mostraría un número distinto del que muestra la pantalla. Un
 * documento que se firma no puede discrepar de la herramienta con la que se
 * hizo. Con el resolver compartido, discrepar es imposible: es el mismo código.
 *
 * Toma el texto de los campos tal como lo guarda `useCampo` y devuelve `null`
 * si no alcanza para calcular, igual que hacía la página.
 */

import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type {
  ArmaduraElegida,
  MaterialesDerivados,
  ResultadoCortante,
  ResultadoFlexion,
} from "@/lib/calc/hormigon/comun/types";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularFlexion,
} from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { aNumero } from "@/lib/verificaciones/formato";
import { BETA_1_EMPOTRAMIENTO_PARCIAL } from "@/lib/calc/hormigon/comun/coeficientes";
import {
  anchoEficazAla,
  calcularL0,
  LUCES_TRAMO_L0,
  rasanteAlaAlma,
  tramoL0DesdeCampo,
  type TramoL0,
  type AnchoEficaz,
  type GeometriaAla,
  type ResultadoRasante,
  type TipoSeccion,
} from "@/lib/calc/hormigon/vigas/seccion-t";
import { areaBarraCm2 } from "@/lib/calc/armaduras";

/** Lee el tipo de sección del campo; sin campo (cálculos viejos), rectangular. */
export function tipoSeccionDesdeCampo(valor: string | undefined): TipoSeccion {
  return valor === "t" || valor === "t-invertida" ? valor : "rectangular";
}

/** Arma los grupos de armadura para el motor: la 2ª capa sólo entra si tiene barras cargadas. */
export function armarGrupos(
  numero: number,
  diametroMm: number,
  numero2: number,
  diametroMm2: number
): ArmaduraElegida[] {
  const grupos: ArmaduraElegida[] = [{ numero, diametroMm }];
  if (numero2 > 0) grupos.push({ numero: numero2, diametroMm: diametroMm2 });
  return grupos;
}

export interface EntradasVigaFlexionCortante {
  fck: number;
  fyk: number;
  b: number;
  h: number;
  recubrimiento: number;
  momentoPos: number;
  numeroPos: number;
  diametroPos: number;
  numeroPos2: number;
  diametroPos2: number;
  momentoNeg: number;
  numeroNeg: number;
  diametroNeg: number;
  numeroNeg2: number;
  diametroNeg2: number;
  vd: number;
  diametroEstribo: number;
  numeroRamas: number;
}

/** La T con su ancho eficaz y el rasante del lado del ala comprimida. */
export interface ResueltoSeccionT {
  tipo: Exclude<TipoSeccion, "rectangular">;
  ala: GeometriaAla;
  /** De dónde salió l0: un caso de la fig. A19.5.2 o a mano */
  tramoL0: TramoL0;
  anchoEficaz: AnchoEficaz;
  /** Momento que comprime el ala: el positivo en la T, el negativo en la T invertida. */
  momentoAlaComprimidaKNm: number;
  /** Armadura transversal del ala que cruza la unión con el alma (cm²/m) */
  asTransversalAlaCm2PorM: number;
  /** null si ese momento es 0 o la sección está sobrearmada */
  rasante: ResultadoRasante | null;
}

export interface ResueltoVigaFlexionCortante {
  v: EntradasVigaFlexionCortante;
  /** null en la sección rectangular */
  seccionT: ResueltoSeccionT | null;
  materiales: MaterialesDerivados;
  gruposPositiva: ArmaduraElegida[];
  gruposNegativa: ArmaduraElegida[];
  /** Canto útil hasta la armadura inferior: momento positivo (m). */
  d: number;
  /** Canto útil hasta la armadura superior: momento negativo y cortante (m). */
  dNegativo: number;
  flexionPositiva: ResultadoFlexion;
  flexionNegativa: ResultadoFlexion;
  cortante: ResultadoCortante;
  /**
   * Momento con el que se dimensionó la armadura superior: el cargado o, en
   * construcción monolítica, β1·M+ si es mayor (Anejo 19, art. 9.2.1.2 (1)).
   */
  momentoNegativoCalculo: number;
  /** El mínimo de empotramiento parcial supera al momento negativo cargado. */
  gobiernaMinimoApoyo: boolean;
}

export function resolverVigaFlexionCortante(
  campos: Record<string, string>
): ResueltoVigaFlexionCortante | null {
  const n = (nombre: string) => aNumero(campos[nombre] ?? "");

  const v: EntradasVigaFlexionCortante = {
    fck: n("fck"),
    fyk: n("fyk"),
    b: n("b"),
    h: n("h"),
    recubrimiento: n("recubrimiento"),
    momentoPos: n("momentoPos"),
    numeroPos: n("numeroPos"),
    diametroPos: n("diametroPos"),
    numeroPos2: n("numeroPos2"),
    diametroPos2: n("diametroPos2"),
    momentoNeg: n("momentoNeg"),
    numeroNeg: n("numeroNeg"),
    diametroNeg: n("diametroNeg"),
    numeroNeg2: n("numeroNeg2"),
    diametroNeg2: n("diametroNeg2"),
    vd: n("vd"),
    diametroEstribo: n("diametroEstribo"),
    numeroRamas: n("numeroRamas"),
  };

  const todosValidos = Object.values(v).every((x) => Number.isFinite(x) && x >= 0);
  const geometriaValida = v.b > 0 && v.h > 0;
  const materialesValidos = v.fck > 0 && v.fyk > 0;
  const armadurasValidas =
    v.numeroPos > 0 && v.diametroPos > 0 && v.numeroNeg > 0 && v.diametroNeg > 0;
  // La 2ª capa es opcional (0 barras = apagada), pero si tiene barras necesita diámetro.
  const segundasCapasValidas =
    (v.numeroPos2 === 0 || v.diametroPos2 > 0) && (v.numeroNeg2 === 0 || v.diametroNeg2 > 0);
  const cortanteValido = v.numeroRamas > 0 && v.diametroEstribo > 0;

  if (
    !todosValidos ||
    !geometriaValida ||
    !materialesValidos ||
    !armadurasValidas ||
    !segundasCapasValidas ||
    !cortanteValido
  ) {
    return null;
  }

  // Sección en T: b es el alma y el ala se carga aparte. En la T el ala va
  // arriba y la comprime el momento positivo; en la T invertida, abajo, y la
  // comprime el negativo.
  const tipo = tipoSeccionDesdeCampo(campos.tipoSeccion);
  let ala: GeometriaAla | null = null;
  let asTransversalAlaCm2PorM = 0;
  // l0 sale de la fig. A19.5.2 con las luces, o se carga a mano (lo único
  // que había antes: sin el campo del caso, los cálculos guardados no cambian).
  const tramoL0 = tramoL0DesdeCampo(campos.tramoL0);
  if (tipo !== "rectangular") {
    const lucesValidas = LUCES_TRAMO_L0[tramoL0].every((l) => n(l === "l1" ? "luz1" : "luz2") > 0);
    if (!lucesValidas) return null;
    const l0M = tramoL0 === "manual" ? n("l0") : calcularL0(tramoL0, n("luz1"), n("luz2"));
    ala = { anchoM: n("anchoAla"), espesorM: n("espesorAla"), l0M };
    const t = { diametro: n("diametroAla"), separacion: n("separacionAla"), capas: n("capasAla") };
    const alaValida = ala.anchoM >= v.b && ala.espesorM > 0 && ala.espesorM < v.h && ala.l0M > 0;
    const transversalValida = [t.diametro, t.separacion, t.capas].every((x) => Number.isFinite(x) && x > 0);
    if (!alaValida || !transversalValida) return null;
    asTransversalAlaCm2PorM = (t.capas * areaBarraCm2(t.diametro)) / t.separacion;
  }
  const anchoEficaz = ala ? anchoEficazAla(v.b, ala) : null;
  const alaArriba = tipo === "t";
  const seccionTPara = (positivo: boolean) =>
    anchoEficaz && ala
      ? { anchoEficazM: anchoEficaz.anchoEficazM, espesorAlaM: ala.espesorM, alaComprimida: positivo === alaArriba }
      : undefined;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento, diametroEstriboMm: v.diametroEstribo };
  // Las barras de la cara del ala se reparten en el ancho eficaz (art. 9.2.1.2 (2)).
  const geometriaCara = (positivo: boolean) => {
    const t = seccionTPara(positivo);
    return t && !t.alaComprimida ? { ...geometria, b: t.anchoEficazM } : geometria;
  };
  const gruposPositiva = armarGrupos(v.numeroPos, v.diametroPos, v.numeroPos2, v.diametroPos2);
  const gruposNegativa = armarGrupos(v.numeroNeg, v.diametroNeg, v.numeroNeg2, v.diametroNeg2);
  // Cada momento con su canto útil: d⁺ hasta la armadura inferior para el
  // positivo, d⁻ hasta la superior para el negativo. La planilla usaba d⁺ para
  // los dos. El cortante va con d⁻ porque su ρl ya sale de la armadura
  // superior: se verifica la sección de apoyo, y d y ρl tienen que referirse
  // a la misma armadura de tracción (Anejo 19, art. 6.2.2 (1)).
  const d = calcularCantoUtil(geometriaCara(true), gruposPositiva);
  const dNegativo = calcularCantoUtil(geometriaCara(false), gruposNegativa);

  const flexionPositiva = calcularFlexion(materiales, geometria, d, {
    momento: v.momentoPos,
    armaduraReal: gruposPositiva,
    seccionT: seccionTPara(true),
  });
  // En construcción monolítica el apoyo nunca se dimensiona por debajo de
  // β1·M+, aunque el cálculo dé un momento negativo menor o nulo. El campo es
  // texto como el resto: sin él —cálculos guardados antes de que existiera—
  // vale "no", para que la memoria rehaga esos cálculos con el mismo número.
  const monolitica = campos.monolitica === "si";
  const minimoApoyo = BETA_1_EMPOTRAMIENTO_PARCIAL * v.momentoPos;
  const gobiernaMinimoApoyo = monolitica && minimoApoyo > v.momentoNeg;
  const momentoNegativoCalculo = gobiernaMinimoApoyo ? minimoApoyo : v.momentoNeg;

  const flexionNegativa = calcularFlexion(materiales, geometria, dNegativo, {
    momento: momentoNegativoCalculo,
    armaduraReal: gruposNegativa,
    seccionT: seccionTPara(false),
  });
  const cortante = calcularCortante(materiales, geometria, dNegativo, flexionNegativa.asRealCm2, {
    vd: v.vd,
    diametroEstriboMm: v.diametroEstribo,
    numeroRamas: v.numeroRamas,
  });

  // Rasante entre ala y alma con el momento que comprime el ala (art. 6.2.4).
  let seccionT: ResueltoSeccionT | null = null;
  if (tipo !== "rectangular" && ala && anchoEficaz) {
    const flexionAla = alaArriba ? flexionPositiva : flexionNegativa;
    const momentoAlaComprimidaKNm = alaArriba ? v.momentoPos : momentoNegativoCalculo;
    const rasante =
      flexionAla.alaComprimida && momentoAlaComprimidaKNm > 0 && !flexionAla.sobrearmada
        ? rasanteAlaAlma({
            momentoKNm: momentoAlaComprimidaKNm,
            flexion: flexionAla.alaComprimida,
            anchoAlmaM: v.b,
            anchoEficazM: anchoEficaz.anchoEficazM,
            espesorAlaM: ala.espesorM,
            l0M: ala.l0M,
            fckMPa: materiales.fck,
            fcdMPa: materiales.fcd,
            fydMPa: materiales.fyd,
            fctmMPa: materiales.fctm,
            asTransversalRealCm2PorM: asTransversalAlaCm2PorM,
          })
        : null;
    seccionT = { tipo, ala, tramoL0, anchoEficaz, momentoAlaComprimidaKNm, asTransversalAlaCm2PorM, rasante };
  }

  return {
    v, seccionT, materiales, gruposPositiva, gruposNegativa, d, dNegativo, flexionPositiva, flexionNegativa, cortante,
    momentoNegativoCalculo, gobiernaMinimoApoyo,
  };
}
