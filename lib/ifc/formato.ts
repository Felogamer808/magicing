import type { ClaseIfc, SeccionIfc } from "@/lib/proyectos/tipos";
import { fmt } from "@/lib/verificaciones/formato";

/** Cómo se llama cada clase IFC en la interfaz. */
export const ROTULO_CLASE: Record<ClaseIfc, string> = {
  IfcBeam: "Viga",
  IfcColumn: "Pilar",
  IfcSlab: "Losa",
  IfcWall: "Muro",
  IfcFooting: "Zapata",
  IfcPile: "Pilote",
  IfcMember: "Miembro",
};

/** "0,20 × 0,50 m", "Ø 0,30 m", "e = 0,20 m". */
export function describirSeccion(s: SeccionIfc): string {
  switch (s.tipo) {
    case "rectangular":
      return `${fmt(s.anchoM)} × ${fmt(s.altoM)} m`;
    case "circular":
      return `Ø ${fmt(s.diametroM)} m`;
    case "espesor":
      return `e = ${fmt(s.espesorM)} m`;
  }
}
