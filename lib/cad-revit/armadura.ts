/**
 * La armadura de una pieza de la planta, cargada desde el panel del proyecto
 * sin ir a la página de la verificación.
 *
 * Se muestran los campos que se cargan a mano (A_MANO) menos los que deriva
 * MagicIng de las cargas (Nd, Nk, lados del pilar, suelo): en la práctica, la
 * armadura —y la excentricidad de la centradora—. El resultado es el mismo
 * que pinta el 3D (`estadoDeCalculo`), con lo que falla o lo que falta.
 */

import { calcularCimentacion, camposDe, esCimentacion } from "@/lib/mcp/cimentaciones";
import type { DefinicionCampo } from "@/lib/mcp/campos-cimentaciones";
import { camposParaCalcular, estadoDeCalculo, type EstadoCalculo } from "@/lib/proyectos/estado";
import type { CalculoGuardado } from "@/lib/proyectos/tipos";
import { A_MANO } from "./proyecto";

/** Los campos que `derivarCargas` reescribe: no se editan en el panel. */
export const CAMPOS_DERIVADOS: Record<string, readonly string[]> = {
  cabezales: ["ndPilar", "anchoPilar"],
  "cabezal-un-pilote": ["ndPilar", "pilarX", "pilarY"],
  "cabezal-n-pilotes": ["ndPilar", "pilarA", "pilarB"],
  pilotes: ["Nk", "friccion", "punta", "factorSeguridad"],
  "viga-atado": ["n1d", "n2d"],
  "viga-centradora-pilotes": ["n1d", "nqp"],
};

/** Dónde se cargan los datos derivados que faltan, en vez de su nombre interno. */
const DONDE_SE_CARGAN: Record<string, string> = {
  cabezales: "G, Q y lado A del pilar (arriba)",
  "cabezal-un-pilote": "G, Q y lados A y B del pilar (arriba)",
  "cabezal-n-pilotes": "G, Q y lados A y B del pilar (arriba)",
  pilotes: "cargas del pilar y suelo (tarjeta Pilotes)",
  "viga-atado": "G y Q de los pilares de los extremos",
  "viga-centradora-pilotes": "G y Q del pilar medianero",
};

/** Diámetros comerciales de barra, mm. */
export const DIAMETROS_MM = [6, 8, 10, 12, 16, 20, 25, 32] as const;

/** Un campo de diámetro de barra (Ø): se elige de la lista, no se escribe. */
export const esDiametro = (clave: string) => /^(phi|diametro)/.test(clave);

/**
 * Detalles que también se eligen en el panel pero no entran vacíos: sin tocar
 * valen lo de la página (barra recta, horquillas del Ø de la superior típica).
 */
const OPCIONALES_EN_PANEL: Record<string, readonly string[]> = {
  "viga-centradora-pilotes": ["formaAnclaje", "diametroHorquilla"],
};

/** Los campos de la verificación que se cargan en el panel, en el orden de la página. */
export function camposDelPanel(verificacion: string): DefinicionCampo[] {
  if (!esCimentacion(verificacion)) return [];
  const aMano = [
    ...((A_MANO as Record<string, readonly string[]>)[verificacion] ?? []),
    ...(OPCIONALES_EN_PANEL[verificacion] ?? []),
  ];
  const derivados = CAMPOS_DERIVADOS[verificacion] ?? [];
  return camposDe(verificacion).filter((d) => aMano.includes(d.clave) && !derivados.includes(d.clave));
}

/**
 * Completa con el valor típico de la página los diámetros que siguen vacíos.
 * Se aplica al primer cambio en el panel: así un Ø no queda en blanco por
 * descuido —y la pieza "no evaluable"— sin inventar cantidades de barras,
 * que siguen vacías hasta que alguien las carga.
 */
export function completarDiametros(verificacion: string, campos: Record<string, string>): Record<string, string> {
  const salida = { ...campos };
  for (const d of camposDelPanel(verificacion)) {
    if (esDiametro(d.clave) && (salida[d.clave] ?? "").trim() === "") salida[d.clave] = d.porDefecto;
  }
  return salida;
}

export interface ResultadoPanel {
  estado: EstadoCalculo;
  /** Las comprobaciones que fallan, por su nombre. */
  fallan: string[];
  /** Los campos que faltan cargar, por su etiqueta. */
  faltan: string[];
}

export function resultadoDelPanel(c: CalculoGuardado): ResultadoPanel {
  const estado = estadoDeCalculo(c);
  if (!esCimentacion(c.verificacion)) return { estado, fallan: [], faltan: [] };
  // Lo que entró vacío a propósito; un campo ausente toma su valor por defecto.
  const vacios = camposDe(c.verificacion).filter((d) => c.campos[d.clave] !== undefined && c.campos[d.clave].trim() === "");
  const derivados = CAMPOS_DERIVADOS[c.verificacion] ?? [];
  const faltan = [
    ...(vacios.some((d) => derivados.includes(d.clave)) ? [DONDE_SE_CARGAN[c.verificacion]] : []),
    ...vacios.filter((d) => !derivados.includes(d.clave)).map((d) => d.etiqueta),
  ];
  const r = estado === "no-verifica" ? calcularCimentacion(c.verificacion, camposParaCalcular(c.campos)) : null;
  return { estado, fallan: r && r.ok ? r.fallan : [], faltan };
}
