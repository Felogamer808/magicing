import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularZapataCombinada } from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";
import { EQUILIBRIOS, EXTREMOS_TIRANTE, POSICIONES_COMBINADA } from "@/lib/calc/hormigon/cimentaciones/rotulos-zapatas";
import { recomendarZapataCombinada } from "@/lib/verificaciones/recomendaciones/zapata-combinada";
import {
  recomendarArmaduraTirante,
  verificarTirante,
  type EntradaArmaduraTirante,
} from "@/lib/verificaciones/recomendaciones/armadura-tirante";

/**
 * Cálculo de la página de zapata combinada a partir de sus campos, tal como
 * se cargaron. Lo comparten la pantalla y el servidor MCP.
 */
export function resolverZapataCombinada(campos: Record<string, string>) {
  const texto = (clave: string) => campos[clave] ?? "";
  const num = (clave: string) => aNumero(texto(clave));

  const descentrado = texto("posicionPilares") === POSICIONES_COMBINADA[1];
  const conTirante = descentrado && texto("equilibrio") === EQUILIBRIOS[1];
  const extraordinariaActiva = texto("conExtraordinaria") === "Sí";
  // Por defecto la página arranca en "gancho": sin dato, se respeta.
  const formaAnclaje: FormaAnclaje = texto("formaAnclaje") === "recta" ? "recta" : "gancho";

  const v = {
    fck: num("fck"), fyk: num("fyk"), sigmaAdmisible: num("sigmaAdmisible"),
    // "A" es el largo: se conserva la clave para no perder los datos guardados.
    L: num("A"), B: num("B"), H: num("H"), rec: num("recubrimiento"),
    pos1: num("pos1"), Nk1: num("Nk1"), cL1: num("cL1"), cB1: num("cB1"),
    pos2: num("pos2"), Nk2: num("Nk2"), cL2: num("cL2"), cB2: num("cB2"),
    MkL1: num("MkL1"), MkB1: num("MkB1"), HkL1: num("HkL1"), HkB1: num("HkB1"),
    MkL2: num("MkL2"), MkB2: num("MkB2"), HkL2: num("HkL2"), HkB2: num("HkB2"),
    nInf: num("numeroInferior"), fInf: num("diametroInferior"),
    nSup: num("numeroSuperior"), fSup: num("diametroSuperior"),
    fT: num("diametroTransversal"), sT: num("separacionTransversal"),
  };
  if (!Object.values(v).every((n) => Number.isFinite(n))) return null;
  const positivos = [v.fck, v.fyk, v.sigmaAdmisible, v.L, v.B, v.H, v.Nk1, v.Nk2, v.cL1, v.cB1, v.cL2, v.cB2, v.nInf, v.fInf, v.nSup, v.fSup, v.fT, v.sT];
  if (!positivos.every((n) => n > 0) || !(v.pos2 > v.pos1)) return null;
  const borde = num("distanciaBordeB");
  if (descentrado && !(borde >= 0)) return null;
  const brazo = num("brazoTirante");
  const phi = num("phiTerreno");
  const phiValido = phi > 0 && phi < 90;
  if (conTirante && !(brazo > 0 && phiValido)) return null;
  const permanente = (clave: string) => (texto(clave).trim() === "" ? undefined : num(clave));
  const nPerm1 = permanente("NkPermanente1");
  const nPerm2 = permanente("NkPermanente2");
  if (nPerm1 !== undefined && !(nPerm1 >= 0 && nPerm1 <= v.Nk1)) return null;
  if (nPerm2 !== undefined && !(nPerm2 >= 0 && nPerm2 <= v.Nk2)) return null;

  // Cargas extraordinarias de cada pilar; null si alguna no es válida.
  const cargasExt = (i: 1 | 2) => {
    const c = { Nk: num(`NkExt${i}`), MkL: num(`MkLExt${i}`), MkB: num(`MkBExt${i}`), HkL: num(`HkLExt${i}`), HkB: num(`HkBExt${i}`) };
    const p = permanente(`NkPermanenteExt${i}`);
    if (!(c.Nk > 0) || ![c.MkL, c.MkB, c.HkL, c.HkB].every(Number.isFinite)) return null;
    if (p !== undefined && !(p >= 0 && p <= c.Nk)) return null;
    return { ...c, ...(p !== undefined ? { NkPermanente: p } : {}) };
  };
  const ext1 = extraordinariaActiva ? cargasExt(1) : undefined;
  const ext2 = extraordinariaActiva ? cargasExt(2) : undefined;
  if (ext1 === null || ext2 === null) return null;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = { L: v.L, B: v.B, H: v.H, recubrimiento: v.rec, ...(descentrado ? { distanciaBordeB: borde } : {}) };
  const datos = {
    pilares: [
      {
        posicionM: v.pos1, Nk: v.Nk1, anchoLargoM: v.cL1, anchoAnchoM: v.cB1,
        MkL: v.MkL1, MkB: v.MkB1, HkL: v.HkL1, HkB: v.HkB1,
        ...(nPerm1 !== undefined ? { NkPermanente: nPerm1 } : {}),
      },
      {
        posicionM: v.pos2, Nk: v.Nk2, anchoLargoM: v.cL2, anchoAnchoM: v.cB2,
        MkL: v.MkL2, MkB: v.MkB2, HkL: v.HkL2, HkB: v.HkB2,
        ...(nPerm2 !== undefined ? { NkPermanente: nPerm2 } : {}),
      },
    ] as const,
    inferior: { numero: v.nInf, diametroMm: v.fInf },
    superior: { numero: v.nSup, diametroMm: v.fSup },
    transversal: { diametroMm: v.fT, separacionM: v.sT },
    formaAnclaje,
    ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
    // Sin φ′ válido el deslizamiento queda sin evaluar, no se inventa.
    ...(phiValido ? { phiGrados: phi } : {}),
    ...(ext1 && ext2 ? { extraordinaria: [ext1, ext2] as const } : {}),
  };
  const entrada = { fck: v.fck, fyk: v.fyk, geometria, sigmaAdmisibleKPa: v.sigmaAdmisible, datos };
  const zapata = calcularZapataCombinada(materiales, geometria, v.sigmaAdmisible, datos);
  const recomendaciones = recomendarZapataCombinada(entrada);

  // El tirante se verifica con el pilar que más tira; las mismas barras en los dos.
  const t = { f: num("diametroTirante"), n: num("numeroTirante"), rec: num("recubrimientoTirante"), pata: num("pataTirante") };
  const patillaTirante = texto("extremoTirante") === EXTREMOS_TIRANTE[1];
  const iMayor = zapata.tirante && Math.abs(zapata.tirante.porPilar[1].tkKN) > Math.abs(zapata.tirante.porPilar[0].tkKN) ? 1 : 0;
  const entradaTirante: EntradaArmaduraTirante | undefined =
    zapata.tirante && t.f > 0 && t.n > 0 && t.rec >= 0 && (!patillaTirante || t.pata >= 0)
      ? {
          fck: v.fck,
          fyk: v.fyk,
          tdKN: zapata.tirante.porPilar[iMayor].tdKN,
          barras: { tipo: "numero", numero: t.n, diametroMm: t.f },
          anchoApoyoM: iMayor === 0 ? v.cB1 : v.cB2,
          recubrimientoM: t.rec,
          forma: patillaTirante ? "gancho" : "recta",
          pataMm: patillaTirante ? t.pata : 0,
          situacion: texto("adherenciaTirante") === "Mala" ? "mala" : "buena",
        }
      : undefined;
  const armaduraTirante = entradaTirante && verificarTirante(entradaTirante);
  const recomendacionesTirante = entradaTirante && recomendarArmaduraTirante(entradaTirante);

  return { v, entrada, entradaTirante, zapata, armaduraTirante, recomendacionesTirante, iMayor, recomendaciones };
}

export type ResueltoZapataCombinada = NonNullable<ReturnType<typeof resolverZapataCombinada>>;
