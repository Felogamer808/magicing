export interface SeccionMeta {
  id: string;
  nombre: string;
  descripcion: string;
  normasDisponibles: string[];
  ruta: string;
  disponible: boolean;
}

/**
 * Id de cada verificación. Se enumeran a mano, en vez de dejarlo en `string`,
 * porque hay tablas que tienen que cubrirlas a todas —la de combinaciones de
 * acciones, sin ir más lejos— y con `string` una verificación nueva se olvidaba
 * en silencio. Enumerado, el compilador la reclama.
 */
export type IdVerificacion =
  | "vigas-flexion-cortante"
  | "vigas-torsion"
  | "vigas-apeo"
  | "losas"
  | "secciones-mixtas"
  | "zapatas"
  | "zapata-corrida"
  | "zapata-medianeria"
  | "zapata-combinada"
  | "losa-fundacion"
  | "pilotes"
  | "cabezales"
  | "muros-contencion"
  | "fisuracion"
  | "viento"
  | "compresion-acero"
  | "flexion-acero"
  | "pretensado"
  | "corte-acero"
  | "flexo-compresion"
  | "soldaduras";

export interface VerificacionMeta {
  id: IdVerificacion;
  nombre: string;
  /** Material o familia a la que pertenece: primer nivel de navegación. */
  seccion: string;
  /** Tipo de elemento dentro de la sección: agrupa las tarjetas del listado. */
  categoria: string;
  descripcion: string;
  normasDisponibles: string[];
  ruta: string;
  disponible: boolean;
}

/**
 * Primer nivel de navegación: se elige el material antes que la verificación.
 * Las secciones sin verificaciones todavía se listan igual, para que el alcance
 * previsto de la herramienta se vea desde la portada.
 */
export const registroSecciones: SeccionMeta[] = [
  {
    id: "hormigon-armado",
    nombre: "Hormigón armado",
    descripcion:
      "Vigas, losas, cimentaciones, muros de contención y estado límite de servicio.",
    normasDisponibles: ["EC2", "EC7"],
    ruta: "/secciones/hormigon-armado",
    disponible: true,
  },
  {
    id: "estructuras-metalicas",
    nombre: "Estructuras metálicas",
    descripcion:
      "Perfiles de acero: compresión, flexión, corte y uniones soldadas o abulonadas.",
    normasDisponibles: ["AISC 360"],
    ruta: "/secciones/estructuras-metalicas",
    disponible: true,
  },
  {
    id: "acciones",
    nombre: "Acciones",
    descripcion: "Cargas sobre la estructura, independientes del material resistente.",
    normasDisponibles: ["CIRSOC 102"],
    ruta: "/secciones/acciones",
    disponible: true,
  },
  {
    id: "hormigon-pretensado",
    nombre: "Hormigón pretensado",
    descripcion:
      "Piezas pretesadas: tensiones en servicio, pérdidas, flexión última y flechas.",
    normasDisponibles: ["ACI 318"],
    ruta: "/secciones/hormigon-pretensado",
    disponible: true,
  },
  {
    id: "madera",
    nombre: "Estructuras de madera",
    descripcion: "Flexión, corte y estabilidad de piezas de madera maciza y laminada.",
    normasDisponibles: ["EC5"],
    ruta: "/secciones/madera",
    disponible: false,
  },
  {
    id: "mamposteria",
    nombre: "Mampostería",
    descripcion: "Muros portantes: compresión, pandeo y acciones en el plano.",
    normasDisponibles: ["EC6"],
    ruta: "/secciones/mamposteria",
    disponible: false,
  },
];

/**
 * Índice de verificaciones estructurales, en dos niveles: `seccion` es el
 * material (se elige primero, desde la portada) y `categoria` el tipo de
 * elemento dentro de ese material.
 *
 * Los dos niveles hacen falta porque el nombre de categoría no es único entre
 * materiales: "Vigas" existe tanto en hormigón armado como en metálicas, y
 * agrupar solo por categoría las mezclaría.
 */
export const registroVerificaciones: VerificacionMeta[] = [
  {
    id: "vigas-flexion-cortante",
    nombre: "Flexión y cortante",
    seccion: "hormigon-armado",
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
    seccion: "hormigon-armado",
    categoria: "Vigas",
    descripcion: "Verificación combinada de flexión, cortante y torsión, con sección hueca equivalente.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/vigas-torsion",
    disponible: true,
  },
  {
    id: "vigas-apeo",
    nombre: "Vigas de apeo",
    seccion: "hormigon-armado",
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
    seccion: "hormigon-armado",
    categoria: "Losas",
    descripcion: "Armado a flexión en dos direcciones, con anclaje y momento resistente de la malla.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/losas",
    disponible: true,
  },
  {
    id: "secciones-mixtas",
    nombre: "Sección mixta (pilar CFT)",
    seccion: "estructuras-metalicas",
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
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Verificación geotécnica y armado a flexión de una zapata aislada con momento biaxial.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-aislada",
    disponible: true,
  },
  {
    id: "zapata-corrida",
    nombre: "Zapata corrida",
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Zapata continua bajo muro o línea de pilares: armado principal por metro corrido y armadura de reparto.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-corrida",
    disponible: true,
  },
  {
    id: "zapata-medianeria",
    nombre: "Zapata de medianería",
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Zapata excéntrica junto a un límite de propiedad, sin poder volar hacia ese lado.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-medianeria",
    disponible: true,
  },
  {
    id: "zapata-combinada",
    nombre: "Zapata combinada",
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Zapata que recibe dos pilares: se calcula como una viga sobre el terreno.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/zapata-combinada",
    disponible: true,
  },
  {
    id: "losa-fundacion",
    nombre: "Losa de fundación",
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Losa continua apoyada sobre el terreno: método de franjas (una línea de pilares por vez).",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/losa-fundacion",
    disponible: true,
  },
  {
    id: "pilotes",
    nombre: "Pilotes",
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Capacidad axial por fuste y punta, y verificación estructural de la sección.",
    normasDisponibles: ["EC2", "EC7"],
    ruta: "/verificaciones/pilotes",
    disponible: true,
  },
  {
    id: "cabezales",
    nombre: "Cabezal de 2 pilotes",
    seccion: "hormigon-armado",
    categoria: "Cimentaciones",
    descripcion: "Modelo de bielas y tirantes: armadura principal, secundaria y de reparto.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/cabezal-pilotes",
    disponible: true,
  },
  {
    id: "muros-contencion",
    nombre: "Muros de contención",
    seccion: "hormigon-armado",
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
    seccion: "hormigon-armado",
    categoria: "Estado límite de servicio",
    descripcion: "Abertura característica de fisura por separación media, en vigas y losas.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/fisuracion",
    disponible: true,
  },
  {
    id: "viento",
    nombre: "Acción del viento",
    seccion: "acciones",
    categoria: "Acciones",
    descripcion: "Velocidad de cálculo, presión dinámica y carga por nivel sobre el edificio.",
    normasDisponibles: ["CIRSOC 102"],
    ruta: "/verificaciones/viento",
    disponible: true,
  },
  {
    id: "compresion-acero",
    nombre: "Compresión (pandeo por flexión)",
    seccion: "estructuras-metalicas",
    categoria: "Barras",
    descripcion:
      "Pandeo por flexión en los dos ejes de un perfil laminado, con el catálogo de PNI, PNC, HEB y 2PNC.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/compresion-acero",
    disponible: true,
  },
  {
    id: "flexion-acero",
    nombre: "Flexión en vigas",
    seccion: "estructuras-metalicas",
    categoria: "Vigas",
    descripcion:
      "Momento resistente por plastificación y pandeo lateral-torsional, según la longitud sin arriostrar.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/flexion-acero",
    disponible: true,
  },
  {
    id: "pretensado",
    nombre: "Pieza pretesada",
    seccion: "hormigon-pretensado",
    categoria: "Vigas y losas",
    descripcion:
      "Tensiones en servicio, pérdidas instantáneas y diferidas, flexión última, cuantía mínima y flechas.",
    normasDisponibles: ["ACI 318"],
    ruta: "/verificaciones/pretensado",
    disponible: true,
  },
  {
    id: "corte-acero",
    nombre: "Corte en el alma",
    seccion: "estructuras-metalicas",
    categoria: "Vigas",
    descripcion:
      "Resistencia al corte del alma, con y sin rigidizadores transversales, y el Ωv reducido de las almas robustas.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/corte-acero",
    disponible: true,
  },
  {
    id: "flexo-compresion",
    nombre: "Flexo-compresión",
    seccion: "estructuras-metalicas",
    categoria: "Barras",
    descripcion:
      "Interacción de compresión y flexión en dos ejes, combinando las admisibles de los capítulos E y F.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/flexo-compresion",
    disponible: true,
  },
  {
    id: "soldaduras",
    nombre: "Soldaduras y chapas",
    seccion: "estructuras-metalicas",
    categoria: "Uniones",
    descripcion: "Cordón de soldadura en perfil H y chapa de base con pernos de anclaje.",
    normasDisponibles: ["AISC 360"],
    ruta: "/verificaciones/uniones",
    disponible: true,
  },
];

export function buscarSeccion(id: string) {
  return registroSecciones.find((s) => s.id === id);
}

export function verificacionesDeSeccion(idSeccion: string) {
  return registroVerificaciones.filter((v) => v.seccion === idSeccion);
}

export function agruparPorCategoria(items: VerificacionMeta[]) {
  const grupos = new Map<string, VerificacionMeta[]>();
  for (const item of items) {
    const lista = grupos.get(item.categoria) ?? [];
    lista.push(item);
    grupos.set(item.categoria, lista);
  }
  return Array.from(grupos.entries());
}
