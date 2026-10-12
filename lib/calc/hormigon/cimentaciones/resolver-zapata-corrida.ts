import { aNumero } from "@/lib/verificaciones/formato";
import { GAMMA_C_ACCIDENTAL, GAMMA_S_ACCIDENTAL } from "@/lib/calc/hormigon/comun/coeficientes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";
import { EQUILIBRIOS, EXTREMOS_TIRANTE, POSICIONES_CORRIDA } from "@/lib/calc/hormigon/cimentaciones/rotulos-zapatas";
import { recomendarZapataCorrida } from "@/lib/verificaciones/recomendaciones/zapata-corrida";
import {
  recomendarArmaduraTirante,
  verificarTirante,
  type EntradaArmaduraTirante,
} from "@/lib/verificaciones/recomendaciones/armadura-tirante";

/**
 * Cálculo de la página de zapata corrida a partir de sus campos, tal como se
 * cargaron. Lo comparten la pantalla y el servidor MCP.
 */
export function resolverZapataCorrida(campos: Record<string, string>) {
  const texto = (clave: string) => campos[clave] ?? "";
  const num = (clave: string) => aNumero(texto(clave));

  const descentrado = texto("posicionMuro") === POSICIONES_CORRIDA[1];
  const conTirante = descentrado && texto("equilibrio") === EQUILIBRIOS[1];
  const extraordinariaActiva = texto("conExtraordinaria") === "Sí";
  const formaAnclaje: FormaAnclaje = texto("formaAnclaje") === "gancho" ? "gancho" : "recta";

  const v = {
    fck: num("fck"),
    fyk: num("fyk"),
    A: num("A"),
    H: num("H"),
    recubrimiento: num("recubrimiento"),
    anchoPilar: num("anchoPilar"),
    sigmaAdmisible: num("sigmaAdmisible"),
    Nk: num("Nk"),
    MkA: num("MkA"),
    diametroPrincipal: num("diametroPrincipal"),
    separacionPrincipal: num("separacionPrincipal"),
    numeroSecundario: num("numeroSecundario"),
    diametroSecundario: num("diametroSecundario"),
  };

  const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
  const geometriaValida = v.A > 0 && v.H > 0 && v.anchoPilar > 0 && v.anchoPilar <= v.A;
  const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
  const armadurasValidas =
    v.diametroPrincipal > 0 && v.separacionPrincipal > 0 && v.numeroSecundario > 0 && v.diametroSecundario > 0;
  const cargasValidas = v.Nk > 0;

  if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
    return null;
  }

  const borde = num("distanciaBorde");
  if (descentrado && !(borde >= 0 && borde + v.anchoPilar <= v.A + 1e-9)) return null;
  const brazo = num("brazoTirante");
  const phi = num("phiTerreno");
  const phiValido = phi > 0 && phi < 90;
  if (conTirante && !(brazo > 0 && phiValido)) return null;

  const hkA = num("HkA");
  if (!Number.isFinite(hkA)) return null;
  // Vacío es "igual a Nk"; si se carga, no puede superarlo.
  const nkPermanente = texto("NkPermanente").trim() === "" ? undefined : num("NkPermanente");
  if (nkPermanente !== undefined && !(nkPermanente >= 0 && nkPermanente <= v.Nk)) return null;

  const ext = extraordinariaActiva
    ? {
        Nk: num("NkExt"), MkA: num("MkAExt"), HkA: num("HkAExt"),
        perm: texto("NkPermanenteExt").trim() === "" ? undefined : num("NkPermanenteExt"),
      }
    : undefined;
  if (ext) {
    if (!(ext.Nk > 0) || !Number.isFinite(ext.MkA) || !Number.isFinite(ext.HkA)) return null;
    if (ext.perm !== undefined && !(ext.perm >= 0 && ext.perm <= ext.Nk)) return null;
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = {
    A: v.A, H: v.H, anchoPilar: v.anchoPilar, recubrimiento: v.recubrimiento,
    ...(descentrado ? { distanciaBorde: borde } : {}),
  };

  const datosZapata = {
    carga: {
      Nk: v.Nk, MkA: v.MkA, HkA: hkA,
      ...(nkPermanente !== undefined ? { NkPermanente: nkPermanente } : {}),
    },
    armadoPrincipal: { diametroMm: v.diametroPrincipal, separacionM: v.separacionPrincipal },
    armadoSecundario: { numero: v.numeroSecundario, diametroMm: v.diametroSecundario },
    formaAnclaje,
    ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
    // Sin φ′ válido el deslizamiento queda sin evaluar, no se inventa.
    ...(phiValido ? { phiGrados: phi } : {}),
    ...(ext
      ? {
          extraordinaria: {
            Nk: ext.Nk, MkA: ext.MkA, HkA: ext.HkA,
            ...(ext.perm !== undefined ? { NkPermanente: ext.perm } : {}),
          },
        }
      : {}),
  };
  const entrada = { fck: v.fck, fyk: v.fyk, geometria, sigmaAdmisibleKPa: v.sigmaAdmisible, datos: datosZapata };
  const zapata = calcularZapataCorrida(materiales, geometria, v.sigmaAdmisible, datosZapata);
  const recomendaciones = recomendarZapataCorrida(entrada);

  // Armadura del tirante: sólo si hay tirante y las barras son válidas.
  const t = {
    f: num("diametroTirante"), s: num("separacionTirante"),
    rec: num("recubrimientoTirante"), pata: num("pataTirante"),
  };
  const patillaTirante = texto("extremoTirante") === EXTREMOS_TIRANTE[1];
  const barrasValidas = t.f > 0 && t.s > 0 && t.rec >= 0 && (!patillaTirante || t.pata >= 0);
  const entradaTirante: EntradaArmaduraTirante | undefined =
    zapata.tirante && barrasValidas
      ? {
          fck: v.fck,
          fyk: v.fyk,
          tdKN: zapata.tirante.tdKN,
          barras: { tipo: "separacion", separacionM: t.s, diametroMm: t.f },
          anchoApoyoM: v.anchoPilar,
          recubrimientoM: t.rec,
          forma: patillaTirante ? "gancho" : "recta",
          pataMm: patillaTirante ? t.pata : 0,
          situacion: texto("adherenciaTirante") === "Mala" ? "mala" : "buena",
        }
      : undefined;
  const armaduraTirante = entradaTirante && verificarTirante(entradaTirante);
  const recomendacionesTirante = entradaTirante && recomendarArmaduraTirante(entradaTirante);
  // Las mismas barras del tirante con el Td y los materiales de la accidental.
  const tdExt = zapata.extraordinaria?.hormigon.tdTiranteKN;
  const armaduraTiranteExt =
    entradaTirante && tdExt != null
      ? verificarTirante({ ...entradaTirante, tdKN: tdExt, gammaC: GAMMA_C_ACCIDENTAL, gammaS: GAMMA_S_ACCIDENTAL })
      : undefined;

  return { v, entrada, entradaTirante, zapata, armaduraTirante, armaduraTiranteExt, recomendacionesTirante, recomendaciones };
}

export type ResueltoZapataCorrida = NonNullable<ReturnType<typeof resolverZapataCorrida>>;
