import { aNumero } from "@/lib/verificaciones/formato";
import { calcularPretensado } from "@/lib/calc/hormigon/pretensado";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverPretensado(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    fc: num("fc"), fci: num("fci"), fcSitu: num("fcSitu"), fpu: num("fpu"),
    areaToron: num("areaToron"), fuerzaToron: num("fuerzaToron"), fyPasiva: num("fyPasiva"),
    luz: num("luz"),
    hS: num("hS"), bS: num("bS"), aS: num("aS"), iS: num("iS"), ygS: num("ygS"), perimS: num("perimS"),
    hC: num("hC"), bC: num("bC"), aC: num("aC"), iC: num("iC"), ygC: num("ygC"), perimC: num("perimC"),
    recPas: num("recPas"), recPret: num("recPret"),
    cargaMuerta: num("cargaMuerta"), sobrecarga: num("sobrecarga"), ev: num("ev"),
    torones: num("torones"), diamPas: num("diamPas"), nPas: num("nPas"),
    pInst: num("pInst"), pDif: num("pDif"), hr: num("hr"),
  };

  const positivos = [
    n.fc, n.fci, n.fcSitu, n.fpu, n.areaToron, n.fuerzaToron, n.fyPasiva, n.luz,
    n.hS, n.bS, n.aS, n.iS, n.ygS, n.perimS, n.hC, n.bC, n.aC, n.iC, n.ygC, n.perimC,
    n.recPret, n.torones, n.hr,
  ];
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  const noNegativos = [n.cargaMuerta, n.sobrecarga, n.ev, n.nPas, n.pInst, n.pDif, n.recPas];
  if (!noNegativos.every((x) => Number.isFinite(x) && x >= 0)) return null;
  // La armadura pasiva no puede quedar por encima del pretensado ni fuera de la sección.
  if (n.recPret >= n.hS || n.ygS >= n.hS || n.ygC >= n.hC) return null;

  try {
    return calcularPretensado({
      fcPremoldeadoMPa: n.fc,
      fciMPa: n.fci,
      fcInSituMPa: n.fcSitu,
      densidadKgM3: 2500,
      fpuMPa: n.fpu,
      epMPa: 195000,
      areaToronMm2: n.areaToron,
      fuerzaPorToronKN: n.fuerzaToron,
      fyPasivaMPa: n.fyPasiva,
      diametroPasivaMm: n.diamPas,
      cantidadPasiva: n.nPas,
      luzM: n.luz,
      simple: { hM: n.hS, bM: n.bS, areaM2: n.aS, iM4: n.iS, ygM: n.ygS, perimetroM: n.perimS },
      compuesta: { hM: n.hC, bM: n.bC, areaM2: n.aC, iM4: n.iC, ygM: n.ygC, perimetroM: n.perimC },
      recMecPasivaM: n.recPas,
      recMecPretensadoM: n.recPret,
      cargaMuertaKNm: n.cargaMuerta,
      sobrecargaKNm: n.sobrecarga,
      cargaEvKNm: n.ev,
      toronesInf: Math.round(n.torones),
      toronesSup: 0,
      perdidasInstantaneas: n.pInst / 100,
      perdidasDiferidas: n.pDif / 100,
      humedadRelativa: n.hr,
    });
  } catch {
    return null;
  }
}

export type ResueltoPretensado = NonNullable<ReturnType<typeof resolverPretensado>>;
