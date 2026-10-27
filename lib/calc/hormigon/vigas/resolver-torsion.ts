import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularTorsionVuelo, calcularVigaConTorsion } from "@/lib/calc/hormigon/vigas/torsion";
import { tipoSeccionDesdeCampo } from "@/lib/calc/hormigon/vigas/resolver";
import { anchoEficazAla, repartoTorsionT, type GeometriaAla } from "@/lib/calc/hormigon/vigas/seccion-t";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverVigaTorsion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"),
    fyk: num("fyk"),
    b: num("b"),
    h: num("h"),
    recubrimiento: num("recubrimiento"),
    momentoPos: num("momentoPos"),
    numeroPos: num("numeroPos"),
    diametroPos: num("diametroPos"),
    momentoNeg: num("momentoNeg"),
    numeroNeg: num("numeroNeg"),
    diametroNeg: num("diametroNeg"),
    vd: num("vd"),
    diametroEstribo: num("diametroEstribo"),
    numeroRamas: num("numeroRamas"),
    td: num("td"),
  };

  const todosValidos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
  const geometriaValida = v.b > 0 && v.h > 0;
  const materialesValidos = v.fck > 0 && v.fyk > 0;
  const armadurasValidas = v.numeroPos > 0 && v.diametroPos > 0 && v.numeroNeg > 0 && v.diametroNeg > 0;
  const cortanteValido = v.numeroRamas > 0 && v.diametroEstribo > 0;

  if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cortanteValido) {
    return null;
  }

  // Sección en T: el torsor se reparte entre el alma de canto total y los
  // dos vuelos eficaces según su rigidez no fisurada (art. 6.3.1 (3) y (4)).
  const tipo = tipoSeccionDesdeCampo(campos.tipoSeccion);
  let ala: GeometriaAla | null = null;
  if (tipo !== "rectangular") {
    ala = { anchoM: num("anchoAla"), espesorM: num("espesorAla"), l0M: num("l0") };
    if (!(ala.anchoM >= v.b && ala.espesorM > 0 && ala.espesorM < v.h && ala.l0M > 0)) return null;
  }
  const anchoEficaz = ala ? anchoEficazAla(v.b, ala) : null;
  const reparto = ala && anchoEficaz ? repartoTorsionT(v.b, v.h, anchoEficaz.vueloEficazM, ala.espesorM) : null;
  const tdAlma = reparto ? reparto.fraccionAlma * v.td : v.td;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento, diametroEstriboMm: v.diametroEstribo };

  // Del borde al eje de la barra de esquina, el mismo c del alma: fija el
  // espesor eficaz mínimo también en el vuelo.
  const distanciaEjeArmaduraM =
    v.recubrimiento + v.diametroEstribo / 1000 + Math.max(v.diametroPos, v.diametroNeg) / 2000;
  const vuelo =
    ala && anchoEficaz && reparto && anchoEficaz.vueloEficazM > 0
      ? calcularTorsionVuelo(materiales, anchoEficaz.vueloEficazM, ala.espesorM, reparto.fraccionVuelo * v.td, distanciaEjeArmaduraM)
      : null;

  return {
    v,
    seccionT: ala && anchoEficaz && reparto ? { tipo, ala, anchoEficaz, reparto, tdAlma, vuelo } : null,
    ...calcularVigaConTorsion(materiales, geometria, {
      ...(ala && anchoEficaz
        ? { ala: { anchoEficazM: anchoEficaz.anchoEficazM, espesorAlaM: ala.espesorM, alaArriba: tipo === "t" } }
        : {}),
      torsion: { td: tdAlma },
      momentoPositivo: v.momentoPos,
      momentoNegativo: v.momentoNeg,
      armaduraPositiva: { numero: v.numeroPos, diametroMm: v.diametroPos },
      armaduraNegativa: { numero: v.numeroNeg, diametroMm: v.diametroNeg },
      cortante: { vd: v.vd, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas },
    }),
  };
}

export type ResueltoVigaTorsion = NonNullable<ReturnType<typeof resolverVigaTorsion>>;
