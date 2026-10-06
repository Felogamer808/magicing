import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "./comun/materiales";
import {
  NOMBRE_CEMENTO,
  NOMBRE_EXPOSICION,
  calcularFluencia,
  calcularRetraccion,
  perimetroExpuestoM,
  tamanoTeoricoMm,
  type ClaseCemento,
  type ExposicionSeccion,
} from "./comun/diferidas";
import {
  COEF_FLECHA,
  K_SISTEMA,
  NOMBRE_SISTEMA,
  calcularFlecha,
  calcularLuzCanto,
  type SistemaEstructural,
} from "./deformaciones";

const SISTEMAS = Object.keys(K_SISTEMA) as SistemaEstructural[];
export const sistemaDesdeNombre = (nombre: string): SistemaEstructural =>
  SISTEMAS.find((s) => NOMBRE_SISTEMA[s] === nombre) ?? "simplemente-apoyada";

const CEMENTOS = Object.keys(NOMBRE_CEMENTO) as ClaseCemento[];
export const cementoDesdeNombre = (nombre: string): ClaseCemento =>
  CEMENTOS.find((c) => NOMBRE_CEMENTO[c] === nombre) ?? "N";

const EXPOSICIONES = Object.keys(NOMBRE_EXPOSICION) as ExposicionSeccion[];
export const exposicionDesdeNombre = (nombre: string): ExposicionSeccion =>
  EXPOSICIONES.find((e) => NOMBRE_EXPOSICION[e] === nombre) ?? "tres-caras";

/** Área de un grupo de barras, en cm². Devuelve 0 si los datos no sirven todavía. */
export function areaBarrasCm2(numeroTxt: string, diametroTxt: string): number {
  const numero = aNumero(numeroTxt);
  const diametroMm = aNumero(diametroTxt);
  if (!Number.isFinite(numero) || !Number.isFinite(diametroMm)) return 0;
  if (numero <= 0 || diametroMm <= 0) return 0;
  return (numero * Math.PI * diametroMm ** 2) / 4 / 100;
}

/**
 * Deformaciones a partir de los campos de la página, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado. Por eso arma también
 * lo derivado (área de barras, fluencia, retracción, coeficiente de flecha):
 * si cambia h o el número de barras, eso cambia con ellos.
 */
export function resolverDeformaciones(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const t = (clave: string) => campos[clave] ?? "";

  const asProvCm2 =
    areaBarrasCm2(t("numeroAs"), t("phiAs")) + (t("capa2") === "Sí" ? areaBarrasCm2(t("numeroAs2"), t("phiAs2")) : 0);
  const asCompCm2 = areaBarrasCm2(t("numeroAsComp"), t("phiAsComp"));

  const cemento = cementoDesdeNombre(t("cemento"));
  const exposicion = exposicionDesdeNombre(t("exposicion"));
  const h0Mm = tamanoTeoricoMm(num("b") * num("h"), perimetroExpuestoM(exposicion, num("b"), num("h")));
  const fluencia = calcularFluencia({ fckMPa: num("fck"), hrPct: num("hr"), t0Dias: num("t0"), claseCemento: cemento, h0Mm });
  const retraccion = calcularRetraccion({ fckMPa: num("fck"), hrPct: num("hr"), claseCemento: cemento, h0Mm });

  const sistema = sistemaDesdeNombre(t("sistema"));
  const esquemaElegido = COEF_FLECHA.find((c) => c.nombre === t("esquema"));
  const coefFlecha = esquemaElegido ? esquemaElegido.valor : num("coefManual");

  const n = {
    fck: num("fck"), fyk: num("fyk"), esGPa: num("esGPa"),
    b: num("b"), h: num("h"), d: num("d"), dComp: num("dComp"), luz: num("luz"),
    asProv: asProvCm2, asComp: asCompCm2, asReq: num("asReq"),
    mqp: num("mqp"), phi: fluencia.phi, epsilonCs: retraccion.epsilonCs,
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (n.fck <= 0 || n.fyk <= 0 || n.esGPa <= 0) return null;
  if (n.b <= 0 || n.h <= 0 || n.d <= 0 || n.luz <= 0) return null;
  if (n.d >= n.h) return null;
  if (n.asProv <= 0 || n.mqp <= 0) return null;
  if (!Number.isFinite(coefFlecha) || coefFlecha <= 0) return null;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  // ρ y ρ' del art. 7.4.2 son geométricas sobre b·d, con la armadura del
  // centro de vano (en voladizo, la del arranque).
  const rho = n.asProv / 1e4 / (n.b * n.d);
  const rhoComp = n.asComp / 1e4 / (n.b * n.d);

  return {
    n,
    rho,
    rhoComp,
    luzCanto: calcularLuzCanto({
      sistema,
      luzEfM: n.luz,
      dM: n.d,
      fckMPa: n.fck,
      fykMPa: n.fyk,
      rho,
      rhoComp,
      asReqCm2: n.asReq,
      asProvCm2: n.asProv,
      alaAnchaEnT: t("alaEnT") === "Sí",
      soportaTabiques: t("tabiques") === "Sí",
    }),
    flecha: calcularFlecha({
      bM: n.b,
      hM: n.h,
      dM: n.d,
      dCompM: n.dComp,
      asCm2: n.asProv,
      asCompCm2: n.asComp,
      fckMPa: n.fck,
      fctmMPa: materiales.fctm,
      esGPa: n.esGPa,
      phiFluencia: n.phi,
      epsilonCs: n.epsilonCs,
      mqpKNm: n.mqp,
      luzM: n.luz,
      coefFlecha,
    }),
  };
}

export type ResueltoDeformaciones = NonNullable<ReturnType<typeof resolverDeformaciones>>;
