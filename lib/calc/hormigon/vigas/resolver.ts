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

export interface ResueltoVigaFlexionCortante {
  v: EntradasVigaFlexionCortante;
  materiales: MaterialesDerivados;
  gruposPositiva: ArmaduraElegida[];
  gruposNegativa: ArmaduraElegida[];
  d: number;
  flexionPositiva: ResultadoFlexion;
  flexionNegativa: ResultadoFlexion;
  cortante: ResultadoCortante;
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

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
  const gruposPositiva = armarGrupos(v.numeroPos, v.diametroPos, v.numeroPos2, v.diametroPos2);
  const gruposNegativa = armarGrupos(v.numeroNeg, v.diametroNeg, v.numeroNeg2, v.diametroNeg2);
  const d = calcularCantoUtil(geometria, gruposPositiva);

  const flexionPositiva = calcularFlexion(materiales, geometria, d, {
    momento: v.momentoPos,
    armaduraReal: gruposPositiva,
  });
  const flexionNegativa = calcularFlexion(materiales, geometria, d, {
    momento: v.momentoNeg,
    armaduraReal: gruposNegativa,
  });
  const cortante = calcularCortante(materiales, geometria, d, flexionNegativa.asRealCm2, {
    vd: v.vd,
    diametroEstriboMm: v.diametroEstribo,
    numeroRamas: v.numeroRamas,
  });

  return { v, materiales, gruposPositiva, gruposNegativa, d, flexionPositiva, flexionNegativa, cortante };
}
