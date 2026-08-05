export interface VerificacionMeta {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  normasDisponibles: string[];
  ruta: string;
  disponible: boolean;
}

/**
 * Índice de verificaciones estructurales. Cada categoría refleja las hojas de la
 * planilla original (CALCULOS TODO.xlsx). Solo "Vigas — Flexión y cortante" está
 * implementada por ahora; el resto queda listada como "Próximamente" para mostrar
 * el alcance final de la herramienta.
 */
export const registroVerificaciones: VerificacionMeta[] = [
  {
    id: "vigas-flexion-cortante",
    nombre: "Flexión y cortante",
    categoria: "Vigas",
    descripcion:
      "Armadura longitudinal por flexión (positiva y negativa) y armadura transversal por cortante.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/vigas-flexion-cortante",
    disponible: true,
  },
  {
    id: "vigas-torsion",
    nombre: "Vigas con torsión",
    categoria: "Vigas",
    descripcion: "Verificación combinada de flexión, cortante y torsión, con sección hueca equivalente.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/vigas-torsion",
    disponible: true,
  },
  {
    id: "vigas-apeo",
    nombre: "Vigas de apeo",
    categoria: "Vigas",
    descripcion: "Verificación de vigas de apeo y centradoras.",
    normasDisponibles: ["EC2"],
    ruta: "",
    disponible: false,
  },
  {
    id: "losas",
    nombre: "Losas",
    categoria: "Losas",
    descripcion: "Verificación de losas a flexión y punzonamiento.",
    normasDisponibles: ["EC2"],
    ruta: "",
    disponible: false,
  },
  {
    id: "secciones-mixtas",
    nombre: "Secciones mixtas",
    categoria: "Losas",
    descripcion: "Verificación de secciones mixtas hormigón-acero.",
    normasDisponibles: ["EC2", "EC4"],
    ruta: "",
    disponible: false,
  },
  {
    id: "zapatas",
    nombre: "Zapata aislada",
    categoria: "Cimentaciones",
    descripcion: "Verificación geotécnica y armado a flexión de una zapata aislada con momento biaxial.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-aislada",
    disponible: true,
  },
  {
    id: "zapata-corrida",
    nombre: "Zapata corrida",
    categoria: "Cimentaciones",
    descripcion: "Zapata continua bajo muro o línea de pilares: armado principal por metro corrido y armadura de reparto.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-corrida",
    disponible: true,
  },
  {
    id: "zapata-medianeria",
    nombre: "Zapata de medianería",
    categoria: "Cimentaciones",
    descripcion: "Zapata excéntrica junto a un límite de propiedad, sin poder volar hacia ese lado.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-medianeria",
    disponible: true,
  },
  {
    id: "zapata-combinada",
    nombre: "Zapata combinada",
    categoria: "Cimentaciones",
    descripcion: "Zapata que recibe dos pilares: se calcula como una viga sobre el terreno.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-combinada",
    disponible: true,
  },
  {
    id: "losa-fundacion",
    nombre: "Losa de fundación",
    categoria: "Cimentaciones",
    descripcion: "Losa continua apoyada sobre el terreno: método de franjas (una línea de pilares por vez).",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/losa-fundacion",
    disponible: true,
  },
  {
    id: "pilotes",
    nombre: "Pilotes",
    categoria: "Cimentaciones",
    descripcion: "Capacidad axial por fuste y punta, y verificación estructural de la sección.",
    normasDisponibles: ["EC2", "EC7"],
    ruta: "/verificaciones/pilotes",
    disponible: true,
  },
  {
    id: "cabezales",
    nombre: "Cabezales de pilotes",
    categoria: "Cimentaciones",
    descripcion: "Cabezales sobre 2 pilotes y sobre núcleos.",
    normasDisponibles: ["EC2"],
    ruta: "",
    disponible: false,
  },
  {
    id: "muros-contencion",
    nombre: "Muros de contención",
    categoria: "Contención",
    descripcion: "Verificación geotécnica y estructural de muros de contención.",
    normasDisponibles: ["EC2", "EC7"],
    ruta: "",
    disponible: false,
  },
  {
    id: "fisuracion",
    nombre: "Fisuración (ELS)",
    categoria: "Estado límite de servicio",
    descripcion: "Control de fisuración en vigas y losas.",
    normasDisponibles: ["EC2"],
    ruta: "",
    disponible: false,
  },
  {
    id: "viento",
    nombre: "Acción del viento",
    categoria: "Acciones",
    descripcion: "Cálculo de cargas de viento sobre la estructura.",
    normasDisponibles: ["EC1"],
    ruta: "",
    disponible: false,
  },
  {
    id: "soldaduras",
    nombre: "Soldaduras y chapas",
    categoria: "Uniones",
    descripcion: "Verificación de soldaduras e insertos metálicos, chapas de pilares.",
    normasDisponibles: ["EC3"],
    ruta: "",
    disponible: false,
  },
];

export function agruparPorCategoria(items: VerificacionMeta[]) {
  const grupos = new Map<string, VerificacionMeta[]>();
  for (const item of items) {
    const lista = grupos.get(item.categoria) ?? [];
    lista.push(item);
    grupos.set(item.categoria, lista);
  }
  return Array.from(grupos.entries());
}
