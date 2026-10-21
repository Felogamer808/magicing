/**
 * Descargas a pilotes, para mandarle a la pilotera.
 *
 * Por defecto la oficina no verifica los pilotes: le pasa a la pilotera la
 * descarga de cada uno y, como mucho, elige el diámetro (criterio del usuario,
 * 2026-10-21). La descarga es el Nk que ya deriva `derivarCargas` en el cálculo
 * del pilote —G + Q del pilar más el peso propio del cabezal, repartido; en un
 * nodo medianero, la reacción de la palanca—, así que no hay una segunda cuenta
 * que se pueda desfasar de la primera.
 *
 * Con la tabla de la pilotera del proyecto (carga admisible por diámetro) se
 * dice si el diámetro dibujado alcanza y cuál es el más chico que alcanzaría.
 */

import type { CapacidadPilote, ElementoProyecto, ModoPilotes, Proyecto } from "@/lib/proyectos/tipos";
import { aNumero } from "@/lib/verificaciones/formato";

/** Modo de los pilotes del proyecto: sin definir, sólo descargas. */
export const modoPilotes = (p: Proyecto): ModoPilotes => p.pilotes?.modo ?? "descargas";

export interface DescargaPilote {
  marca: string;
  /** La pieza que tiene encima. */
  bajo: string | null;
  diametroM: number | null;
  /** Descarga en servicio, kN, o null si falta cargar el pilar. */
  nkKN: number | null;
  /** Lo que toma ese diámetro según la tabla, o null si no está en la tabla. */
  admisibleKN: number | null;
  /** El diámetro más chico de la tabla que alcanza, o null si ninguno o falta la descarga. */
  sugeridoM: number | null;
}

/** Mismo diámetro, al milímetro. */
const igual = (a: number, b: number) => Math.abs(a - b) < 0.0005;

const numero = (t: string | undefined) => ((t ?? "").trim() === "" ? null : aNumero(t!));

export function capacidadDe(tabla: CapacidadPilote[], diametroM: number): number | null {
  return tabla.find((c) => igual(c.diametroM, diametroM))?.cargaKN ?? null;
}

export function diametroSugerido(tabla: CapacidadPilote[], nkKN: number): number | null {
  const alcanzan = tabla.filter((c) => c.cargaKN >= nkKN).map((c) => c.diametroM);
  return alcanzan.length ? Math.min(...alcanzan) : null;
}

/** Una fila por pilote de la planta, en el orden de las marcas. */
export function descargasPilotes(proyecto: Proyecto): DescargaPilote[] {
  const tabla = proyecto.pilotes?.capacidades ?? [];
  const orden = new Intl.Collator("es", { numeric: true });
  return proyecto.elementos
    .filter((e): e is ElementoProyecto & { cad: NonNullable<ElementoProyecto["cad"]> } => e.cad?.pieza === "pilote")
    .sort((a, b) => orden.compare(a.cad.marca, b.cad.marca))
    .map((e) => {
      const campos = e.calculos.find((c) => c.verificacion === "pilotes")?.campos;
      const diametroM = numero(campos?.diametro);
      const nkKN = numero(campos?.Nk);
      return {
        marca: e.cad.marca,
        bajo: e.cad.bajo ?? null,
        diametroM,
        nkKN,
        admisibleKN: diametroM === null ? null : capacidadDe(tabla, diametroM),
        sugeridoM: nkKN === null ? null : diametroSugerido(tabla, nkKN),
      };
    });
}

/** La descarga máxima por diámetro: lo que la pilotera mira primero. */
export function maximaPorDiametro(descargas: DescargaPilote[]): { diametroM: number; cantidad: number; maximaKN: number | null }[] {
  const grupos = new Map<number, DescargaPilote[]>();
  for (const d of descargas) {
    if (d.diametroM === null) continue;
    const clave = [...grupos.keys()].find((k) => igual(k, d.diametroM!)) ?? d.diametroM;
    grupos.set(clave, [...(grupos.get(clave) ?? []), d]);
  }
  return [...grupos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([diametroM, ds]) => {
      const cargadas = ds.map((d) => d.nkKN).filter((n): n is number => n !== null);
      return { diametroM, cantidad: ds.length, maximaKN: cargadas.length ? Math.max(...cargadas) : null };
    });
}
