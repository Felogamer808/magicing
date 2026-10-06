import { aNumero } from "@/lib/verificaciones/formato";
import { calcularVigaApeoBielas, type CondicionAdherencia, type TransmisionCarga } from "@/lib/calc/hormigon/vigas/apeo-bielas";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

export const TRANSMISIONES = [
  "Directa (carga sobre la cara superior)",
  "Indirecta (pilar arranca del alma)",
  "Colgada (carga entrando por la cara inferior)",
] as const;

// Art. 8.4.2(2) y figura A19.8.2: la barra del tirante va al fondo del
// encofrado, así que salvo hormigonado desde abajo o pieza muy alta la
// condición es buena. Se deja elegible porque cambia el anclaje un 43 %.
export const ADHERENCIAS = ["Buena (fondo del encofrado)", "Mala"] as const;

export const ADHERENCIA_POR_ETIQUETA: Record<string, CondicionAdherencia> = {
  [ADHERENCIAS[0]]: "buena",
  [ADHERENCIAS[1]]: "mala",
};

export const TIPO_POR_ETIQUETA: Record<string, TransmisionCarga> = {
  [TRANSMISIONES[0]]: "directa",
  [TRANSMISIONES[1]]: "indirecta",
  [TRANSMISIONES[2]]: "colgada",
};

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverApeoBielas(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const tipo = TIPO_POR_ETIQUETA[campos.transmision ?? ""] ?? "directa";
  const adh = ADHERENCIA_POR_ETIQUETA[campos.adherencia ?? ""] ?? "buena";

  const n = {
    fck: num("fck"), fyk: num("fyk"), rg: num("rg"),
    luz: num("luz"), h: num("h"), b: num("b"), posCarga: num("posCarga"),
    anchoPilar: num("anchoPilar"),
    anchoApoyoIzq: num("anchoApoyoIzq"), anchoApoyoDer: num("anchoApoyoDer"),
    voladizoIzq: num("voladizoIzq"), voladizoDer: num("voladizoDer"),
    nd: num("nd"), qd: num("qd"),
    nTirante: num("nTirante"), phiTirante: num("phiTirante"), phiEstribo: num("phiEstribo"),
    nTirante2: num("nTirante2"), phiTirante2: num("phiTirante2"), dg: num("dg"),
    phiMallaH: num("phiMallaH"), sepMallaH: num("sepMallaH"),
    phiMallaV: num("phiMallaV"), sepMallaV: num("sepMallaV"),
    phiCuelgue: num("phiCuelgue"), sepCuelgue: num("sepCuelgue"),
    ramasCuelgue: num("ramasCuelgue"), cantoColgado: num("cantoColgado"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if ([n.fck, n.fyk, n.luz, n.h, n.b, n.anchoPilar, n.anchoApoyoIzq, n.anchoApoyoDer, n.nd].some((x) => x <= 0)) return null;
  if ([n.nTirante, n.phiTirante, n.phiEstribo, n.phiMallaH, n.sepMallaH, n.phiMallaV, n.sepMallaV].some((x) => x <= 0)) return null;
  if (n.nTirante < 2) return null;
  if (n.dg <= 0) return null;
  // Segunda capa: se activa con 0 barras apagada, y si se activa pide dos
  // barras como mínimo igual que la primera.
  if (n.nTirante2 > 0 && (n.nTirante2 < 2 || n.phiTirante2 <= 0)) return null;
  // El pilar tiene que caer dentro de la campos.luz, con su ancho completo apoyado.
  if (n.posCarga <= n.anchoPilar / 2 || n.posCarga >= n.luz - n.anchoPilar / 2) return null;
  // El canto útil tiene que quedar positivo, contando las dos capas.
  const ocupaM =
    n.rg +
    n.phiEstribo / 1000 +
    n.phiTirante / 1000 +
    (n.nTirante2 > 0 ? Math.max(n.phiTirante, n.phiTirante2, n.dg * 1000 + 5, 20) / 1000 + n.phiTirante2 / 1000 : 0);
  if (ocupaM >= n.h) return null;
  if (tipo !== "directa" && [n.phiCuelgue, n.sepCuelgue, n.ramasCuelgue].some((x) => x <= 0)) return null;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const r = calcularVigaApeoBielas(
    materiales,
    {
      luzM: n.luz, hM: n.h, bM: n.b, recubrimientoM: n.rg,
      posicionCargaM: n.posCarga, anchoPilarApeadoM: n.anchoPilar,
      anchoApoyoIzqM: n.anchoApoyoIzq, anchoApoyoDerM: n.anchoApoyoDer,
      voladizoIzqM: n.voladizoIzq, voladizoDerM: n.voladizoDer,
    },
    {
      ndPilarKN: n.nd,
      qdKNPorM: n.qd,
      transmision: tipo,
      tirante: { numero: n.nTirante, diametroMm: n.phiTirante },
      tiranteSegundaCapa:
        n.nTirante2 > 0 ? { numero: n.nTirante2, diametroMm: n.phiTirante2 } : undefined,
      diametroEstriboMm: n.phiEstribo,
      tamanoMaximoAridoM: n.dg,
      condicionAdherencia: adh,
      mallaHorizontal: { diametroMm: n.phiMallaH, separacionM: n.sepMallaH },
      mallaVertical: { diametroMm: n.phiMallaV, separacionM: n.sepMallaV },
      cuelgue:
        tipo === "directa"
          ? undefined
          : {
              diametroMm: n.phiCuelgue,
              separacionM: n.sepCuelgue,
              numeroRamas: n.ramasCuelgue,
              cantoElementoColgadoM: n.cantoColgado,
            },
    }
  );
  return { n, r, materiales };
}

export type ResueltoApeoBielas = NonNullable<ReturnType<typeof resolverApeoBielas>>;
