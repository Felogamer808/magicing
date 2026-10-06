import { servicioDesdeEtiqueta, tipoDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { componentesFlecha, comprobarFlechas, flechaDistribuidaMm, flechaPuntualMm, type TipoElemento } from "@/lib/calc/madera/deformaciones";
import { aNumero } from "@/lib/verificaciones/formato";
import { kdef } from "@/lib/calc/madera/materiales";
import { propiedades } from "@/lib/calc/madera/seccion";

export const ELEMENTOS = ["Viga sobre dos apoyos", "Voladizo"] as const;

export const elementoDesde = (e: string): TipoElemento =>
  e === ELEMENTOS[1] ? "voladizo" : "dos-apoyos";

export const EXIGENCIA = ["Estricto (tabiquería o acabados frágiles)", "Laxo (sin elementos frágiles)"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaDeformaciones(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const b = num("ancho");
  const h = num("canto");
  const l = num("luz");
  const e = num("emean");
  const g = num("gmean");
  const psi = num("psi2");
  const wc = num("contraflecha");
  const cargas = [num("qg"), num("qq"), num("pg"), num("pq")];

  if (![b, h, l, e, g].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![psi, wc, ...cargas].every((x) => Number.isFinite(x) && x >= 0)) return null;

  const t = tipoDesdeEtiqueta(campos.tipo);
  const cs = servicioDesdeEtiqueta(campos.servicio);
  const factorKdef = kdef(t, cs);
  const props = propiedades({ anchoM: b, cantoM: h });

  const [qgN, qqN, pgN, pqN] = cargas;
  const distG = flechaDistribuidaMm(qgN, l, e, g, props.iyM4, h);
  const distQ = flechaDistribuidaMm(qqN, l, e, g, props.iyM4, h);
  const puntG = flechaPuntualMm(pgN, l, e, g, props.iyM4, h);
  const puntQ = flechaPuntualMm(pqN, l, e, g, props.iyM4, h);

  const componentes = componentesFlecha({
    instantaneaGMm: distG.totalMm + puntG.totalMm,
    instantaneaQMm: distQ.totalMm + puntQ.totalMm,
    kdef: factorKdef,
    psi2: psi,
    contraflechaMm: wc,
  });

  const comprobaciones = comprobarFlechas(
    componentes, l, elementoDesde(campos.elemento), campos.exigencia === EXIGENCIA[0]
  );

  return {
    b, h, l, t, cs, factorKdef, props, componentes, comprobaciones, wc,
    distG, distQ, puntG, puntQ,
    cortanteMm: distG.cortanteMm + distQ.cortanteMm + puntG.cortanteMm + puntQ.cortanteMm,
    relacionEG: e / g,
  };
  // La duración de la carga no entra: kdef sólo depende de la clase de
  // campos.servicio, tabla 3.2. El desplegable se muestra igual porque el bloque de
  // material es el mismo en todas las páginas de la sección.
}

export type ResueltoMaderaDeformaciones = NonNullable<ReturnType<typeof resolverMaderaDeformaciones>>;
