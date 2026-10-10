import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularZapataAislada } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { EQUILIBRIOS, EXTREMOS_TIRANTE, POSICIONES_AISLADA } from "@/lib/calc/hormigon/cimentaciones/rotulos-zapatas";
import { recomendarZapataAislada } from "@/lib/verificaciones/recomendaciones/zapata-aislada";
import {
  recomendarArmaduraTirante,
  verificarTirante,
  type EntradaArmaduraTirante,
} from "@/lib/verificaciones/recomendaciones/armadura-tirante";

/**
 * Cálculo de la página de zapata aislada a partir de sus campos, tal como se
 * cargaron. Lo comparten la pantalla y el servidor MCP: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverZapataAislada(campos: Record<string, string>) {
  const texto = (clave: string) => campos[clave] ?? "";
  const num = (clave: string) => aNumero(texto(clave));

  const descentrado = texto("posicionPilar") === POSICIONES_AISLADA[1];
  const conTirante = descentrado && texto("equilibrioA") === EQUILIBRIOS[1];
  const extraordinariaActiva = texto("conExtraordinaria") === "Sí";
  const formaAnclaje: FormaAnclaje = texto("formaAnclaje") === "gancho" ? "gancho" : "recta";

  const v = {
    fck: num("fck"),
    fyk: num("fyk"),
    A: num("A"),
    B: num("B"),
    H: num("H"),
    recubrimiento: num("recubrimiento"),
    anchoPilarA: num("anchoPilarA"),
    anchoPilarB: num("anchoPilarB"),
    sigmaAdmisible: num("sigmaAdmisible"),
    Nk: num("Nk"),
    MkA: num("MkA"),
    MkB: num("MkB"),
    numeroA: num("numeroA"),
    diametroA: num("diametroA"),
    numeroB: num("numeroB"),
    diametroB: num("diametroB"),
  };

  const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
  const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0 && v.anchoPilarA > 0 && v.anchoPilarB > 0;
  const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
  const armadurasValidas = v.numeroA > 0 && v.diametroA > 0 && v.numeroB > 0 && v.diametroB > 0;
  const cargasValidas = v.Nk > 0;

  if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
    return null;
  }

  // Con ubicación libre, el pilar tiene que quedar dentro de la zapata.
  const bordeA = num("distanciaBordeA");
  const bordeB = num("distanciaBordeB");
  if (descentrado) {
    if (!(bordeA >= 0 && bordeA + v.anchoPilarA <= v.A + 1e-9)) return null;
    if (!(bordeB >= 0 && bordeB + v.anchoPilarB <= v.B + 1e-9)) return null;
  }

  const brazo = num("brazoTirante");
  const phi = num("phiTerreno");
  const phiValido = phi > 0 && phi < 90;
  if (conTirante && !(brazo > 0 && phiValido)) return null;

  const hkA = num("HkA");
  const hkB = num("HkB");
  if (!Number.isFinite(hkA) || !Number.isFinite(hkB)) return null;
  // Vacío es "igual a Nk"; si se carga, no puede superarlo.
  const nkPermanente = texto("NkPermanente").trim() === "" ? undefined : num("NkPermanente");
  if (nkPermanente !== undefined && !(nkPermanente >= 0 && nkPermanente <= v.Nk)) return null;

  const ext = extraordinariaActiva
    ? {
        Nk: num("NkExt"), MkA: num("MkAExt"), MkB: num("MkBExt"), HkA: num("HkAExt"), HkB: num("HkBExt"),
        perm: texto("NkPermanenteExt").trim() === "" ? undefined : num("NkPermanenteExt"),
      }
    : undefined;
  if (ext) {
    if (!(ext.Nk > 0) || ![ext.MkA, ext.MkB, ext.HkA, ext.HkB].every(Number.isFinite)) return null;
    if (ext.perm !== undefined && !(ext.perm >= 0 && ext.perm <= ext.Nk)) return null;
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = {
    A: v.A,
    B: v.B,
    H: v.H,
    anchoPilarA: v.anchoPilarA,
    anchoPilarB: v.anchoPilarB,
    recubrimiento: v.recubrimiento,
    ...(descentrado ? { distanciaBordeA: bordeA, distanciaBordeB: bordeB } : {}),
  };

  const datosZapata = {
    cargas: {
      Nk: v.Nk, MkA: v.MkA, MkB: v.MkB, HkA: hkA, HkB: hkB,
      ...(nkPermanente !== undefined ? { NkPermanente: nkPermanente } : {}),
    },
    armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
    armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
    formaAnclaje,
    ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
    // Sin φ′ válido el deslizamiento queda sin evaluar, no se inventa.
    ...(phiValido ? { phiGrados: phi } : {}),
    ...(ext
      ? {
          extraordinaria: {
            Nk: ext.Nk, MkA: ext.MkA, MkB: ext.MkB, HkA: ext.HkA, HkB: ext.HkB,
            ...(ext.perm !== undefined ? { NkPermanente: ext.perm } : {}),
          },
        }
      : {}),
  };
  const entrada = { fck: v.fck, fyk: v.fyk, geometria, sigmaAdmisibleKPa: v.sigmaAdmisible, datos: datosZapata };
  const zapata = calcularZapataAislada(materiales, geometria, v.sigmaAdmisible, datosZapata);
  const recomendaciones = recomendarZapataAislada(entrada);

  // Armadura del tirante: sólo si hay tirante y las barras son válidas.
  const t = {
    f: num("diametroTirante"), n: num("numeroTirante"),
    rec: num("recubrimientoTirante"), pata: num("pataTirante"),
  };
  const patillaTirante = texto("extremoTirante") === EXTREMOS_TIRANTE[1];
  const barrasValidas = t.f > 0 && t.n > 0 && t.rec >= 0 && (!patillaTirante || t.pata >= 0);
  const entradaTirante: EntradaArmaduraTirante | undefined =
    zapata.tirante && barrasValidas
      ? {
          fck: v.fck,
          fyk: v.fyk,
          tdKN: zapata.tirante.tdKN,
          barras: { tipo: "numero", numero: t.n, diametroMm: t.f },
          anchoApoyoM: v.anchoPilarA,
          recubrimientoM: t.rec,
          forma: patillaTirante ? "gancho" : "recta",
          pataMm: patillaTirante ? t.pata : 0,
          situacion: texto("adherenciaTirante") === "Mala" ? "mala" : "buena",
        }
      : undefined;
  const armaduraTirante = entradaTirante && verificarTirante(entradaTirante);
  const recomendacionesTirante = entradaTirante && recomendarArmaduraTirante(entradaTirante);

  return { v, entrada, entradaTirante, zapata, armaduraTirante, recomendacionesTirante, recomendaciones };
}

export type ResueltoZapataAislada = NonNullable<ReturnType<typeof resolverZapataAislada>>;
