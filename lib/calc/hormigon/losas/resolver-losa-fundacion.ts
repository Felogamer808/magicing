import { aNumero } from "@/lib/verificaciones/formato";
import { calcularFranjaLosa } from "@/lib/calc/hormigon/losas/losa-fundacion";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverLosaFundacion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"),
    fyk: num("fyk"),
    longitud: num("longitud"),
    anchoTributario: num("anchoTributario"),
    H: num("H"),
    recubrimiento: num("recubrimiento"),
    pilarLargo: num("pilarLargo"),
    pilarAncho: num("pilarAncho"),
    sigmaAdmisible: num("sigmaAdmisible"),
    pos1: num("pos1"),
    Nk1: num("Nk1"),
    pos2: num("pos2"),
    Nk2: num("Nk2"),
    pos3: num("pos3"),
    Nk3: num("Nk3"),
    diametroInferior: num("diametroInferior"),
    separacionInferior: num("separacionInferior"),
    diametroSuperior: num("diametroSuperior"),
    separacionSuperior: num("separacionSuperior"),
    diametroTransversal: num("diametroTransversal"),
    separacionTransversal: num("separacionTransversal"),
  };

  const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
  const geometriaValida = v.longitud > 0 && v.anchoTributario > 0 && v.H > 0 && v.pilarLargo > 0 && v.pilarAncho > 0;
  const posicionesValidas = v.pos1 >= 0 && v.pos2 > v.pos1 && v.pos3 > v.pos2 && v.pos3 <= v.longitud;
  const cargasValidas = v.Nk1 > 0 && v.Nk2 > 0 && v.Nk3 > 0;
  const armadurasValidas =
    v.diametroInferior > 0 && v.separacionInferior > 0 && v.diametroSuperior > 0 && v.separacionSuperior > 0 &&
    v.diametroTransversal > 0 && v.separacionTransversal > 0;

  if (!todosValidos || !geometriaValida || !posicionesValidas || !cargasValidas || !armadurasValidas || v.sigmaAdmisible <= 0) {
    return null;
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });

  const franja = calcularFranjaLosa(
    materiales,
    {
      longitudM: v.longitud, anchoTributarioM: v.anchoTributario, H: v.H, recubrimiento: v.recubrimiento,
      pilarLargoM: v.pilarLargo, pilarAnchoM: v.pilarAncho,
    },
    v.sigmaAdmisible,
    {
      pilares: [
        { posicionM: v.pos1, Nk: v.Nk1 },
        { posicionM: v.pos2, Nk: v.Nk2 },
        { posicionM: v.pos3, Nk: v.Nk3 },
      ],
      inferior: { diametroMm: v.diametroInferior, separacionM: v.separacionInferior },
      superior: { diametroMm: v.diametroSuperior, separacionM: v.separacionSuperior },
      transversalInferior: { diametroMm: v.diametroTransversal, separacionM: v.separacionTransversal },
    }
  );

  return { franja, v };
}

export type ResueltoLosaFundacion = NonNullable<ReturnType<typeof resolverLosaFundacion>>;
