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
    descripcion:
      "Verificación completa de viga: flexión, cortante, armadura secundaria y de piel, anclaje y flecha.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/vigas-apeo",
    disponible: true,
  },
  {
    id: "losas",
    nombre: "Losas",
    categoria: "Losas",
    descripcion: "Armado a flexión en dos direcciones, con anclaje y momento resistente de la malla.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/losas",
    disponible: true,
  },
  {
    id: "secciones-mixtas",
    nombre: "Sección mixta (pilar CFT)",
    categoria: "Pilares",
    descripcion:
      "Tubo circular de acero relleno de hormigón: compresión, flexión, corte e incendio.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/seccion-mixta",
    disponible: true,
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
    nombre: "Cabezal de 2 pilotes",
    categoria: "Cimentaciones",
    descripcion: "Modelo de bielas y tirantes: armadura principal, secundaria y de reparto.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/cabezal-pilotes",
    disponible: true,
  },
  {
    id: "muros-contencion",
    nombre: "Muros de contención",
    categoria: "Contención",
    descripcion:
      "Vuelco, deslizamiento y tensión del suelo, para muro libre o apuntalado por contrapiso y losa.",
    normasDisponibles: ["EC7"],
    ruta: "/verificaciones/muro-contencion",
    disponible: true,
  },
  {
    id: "fisuracion",
    nombre: "Fisuración (ELS)",
    categoria: "Estado límite de servicio",
    descripcion: "Abertura característica de fisura por separación media, en vigas y losas.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/fisuracion",
    disponible: true,
  },
  {
    id: "viento",
    nombre: "Acción del viento",
    categoria: "Acciones",
    descripcion: "Velocidad de cálculo, presión dinámica y carga por nivel sobre el edificio.",
    normasDisponibles: ["CIRSOC 102"],
    ruta: "/verificaciones/viento",
    disponible: true,
  },
  {
    id: "soldaduras",
    nombre: "Soldaduras y chapas",
    categoria: "Uniones",
    descripcion: "Cordón de soldadura en perfil H y chapa de base con pernos de anclaje.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/uniones",
    disponible: true,
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
