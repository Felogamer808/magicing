/**
 * Primer nivel de navegación: la disciplina.
 *
 * Antes la portada abría directo en las secciones, que funcionaba mientras todo
 * era cálculo estructural. Al entrar hidráulica dejó de funcionar: no comparten
 * normas, ni vocabulario, ni la persona que las usa. Poner un nivel arriba evita
 * que quien viene a dimensionar un colector tenga que pasar por delante de seis
 * secciones de hormigón que no le sirven.
 */
export type IdArea = "estructural" | "hidraulica";

export interface AreaMeta {
  id: IdArea;
  nombre: string;
  descripcion: string;
  ruta: string;
}

export const registroAreas: AreaMeta[] = [
  {
    id: "estructural",
    nombre: "Cálculo estructural",
    descripcion:
      "Hormigón armado y pretensado, estructuras metálicas, cimentaciones y acciones sobre la estructura.",
    ruta: "/areas/estructural",
  },
  {
    id: "hidraulica",
    nombre: "Cálculo hidráulico",
    descripcion:
      "Escurrimiento en conductos y canales: caudal, velocidad y grado de llenado.",
    ruta: "/areas/hidraulica",
  },
];

export interface SeccionMeta {
  id: string;
  /** Disciplina a la que pertenece: primer nivel de navegación. */
  area: IdArea;
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
  | "vigas-apeo-bielas"
  | "mensula-corta"
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
  | "soldaduras"
  | "conducto-circular"
  | "propiedades-geometricas"
  | "formulario-vigas";

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
    area: "estructural",
    nombre: "Hormigón armado",
    descripcion:
      "Vigas, losas, cimentaciones, muros de contención y estado límite de servicio.",
    normasDisponibles: ["EC2", "EC7"],
    ruta: "/secciones/hormigon-armado",
    disponible: true,
  },
  {
    id: "estructuras-metalicas",
    area: "estructural",
    nombre: "Estructuras metálicas",
    descripcion:
      "Perfiles de acero: compresión, flexión, corte y uniones soldadas o abulonadas.",
    normasDisponibles: ["AISC 360"],
    ruta: "/secciones/estructuras-metalicas",
    disponible: true,
  },
  {
    id: "acciones",
    area: "estructural",
    nombre: "Acciones",
    descripcion: "Cargas sobre la estructura, independientes del material resistente.",
    normasDisponibles: ["CIRSOC 102"],
    ruta: "/secciones/acciones",
    disponible: true,
  },
  {
    id: "hormigon-pretensado",
    area: "estructural",
    nombre: "Hormigón pretensado",
    descripcion:
      "Piezas pretesadas: tensiones en servicio, pérdidas, flexión última y flechas.",
    normasDisponibles: ["ACI 318"],
    ruta: "/secciones/hormigon-pretensado",
    disponible: true,
  },
  {
    id: "conducciones",
    area: "hidraulica",
    nombre: "Conducciones",
    descripcion:
      "Escurrimiento en conductos y canales: caudal, velocidad y grado de llenado.",
    /*
     * Manning es una fórmula empírica, no un articulado: vale igual en cualquier
     * país. Lo que cambia con el reglamento son los límites que se le exigen al
     * resultado, y por eso van como dato de entrada. Cuando la sección adopte una
     * norma concreta, se declara acá y aparece como insignia.
     */
    normasDisponibles: [],
    ruta: "/secciones/conducciones",
    disponible: true,
  },
  {
    id: "herramientas",
    /*
     * Va en estructural y no en un área propia: es lo que se resuelve antes de
     * verificar una pieza, así que quien la busca ya está calculando estructura.
     * Un área de primer nivel con una sola sección adentro haría dar una vuelta
     * de más para llegar.
     */
    area: "estructural",
    nombre: "Herramientas de análisis",
    descripcion:
      "Lo que hay que resolver antes de verificar: propiedades de la sección y esfuerzos en la viga.",
    /*
     * Geometría y estática lineal no son articulado de ninguna norma: valen igual
     * bajo cualquier reglamento. Se declaran igual como insignia porque dicen con
     * qué se resolvió, que es lo que el usuario necesita saber para confiar en el
     * número.
     */
    normasDisponibles: ["Geometría", "Estática"],
    ruta: "/secciones/herramientas",
    disponible: true,
  },
  {
    id: "madera",
    area: "estructural",
    nombre: "Estructuras de madera",
    descripcion: "Flexión, corte y estabilidad de piezas de madera maciza y laminada.",
    normasDisponibles: ["EC5"],
    ruta: "/secciones/madera",
    disponible: false,
  },
  {
    id: "mamposteria",
    area: "estructural",
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
    id: "vigas-apeo-bielas",
    nombre: "Vigas de apeo — bielas y tirantes",
    seccion: "hormigon-armado",
    categoria: "Vigas",
    descripcion:
      "Apeo de pilar resuelto como región D: clasificación B/D, tirante, bielas, nudos, tracción transversal, malla de piel, anclaje con horquillas y armadura de cuelgue.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/vigas-apeo-bielas",
    disponible: true,
  },
  {
    id: "mensula-corta",
    nombre: "Ménsula corta",
    seccion: "hormigon-armado",
    categoria: "Ménsulas",
    descripcion:
      "Región D por bielas y tirantes: tirante por Anejo 19 y por la Instrucción española, nudo bajo la placa, biela, degollamiento, cercos de las dos familias, anclaje y despiece del marco.",
    normasDisponibles: ["EC2"],
    ruta: "/verificaciones/mensula-corta",
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
  {
    id: "conducto-circular",
    nombre: "Conducto circular",
    seccion: "conducciones",
    categoria: "Conducciones",
    descripcion:
      "Escurrimiento a superficie libre por Manning: altura de agua, velocidad y grado de llenado.",
    normasDisponibles: [],
    ruta: "/verificaciones/conducto-circular",
    disponible: true,
  },
  {
    id: "propiedades-geometricas",
    nombre: "Propiedades geométricas",
    seccion: "herramientas",
    categoria: "Secciones",
    descripcion:
      "Área, centroide, inercias, módulos resistentes, radios de giro y ejes principales de 16 formas paramétricas.",
    normasDisponibles: ["Geometría"],
    ruta: "/verificaciones/propiedades-geometricas",
    disponible: true,
  },
  {
    id: "formulario-vigas",
    nombre: "Formulario de vigas",
    seccion: "herramientas",
    categoria: "Estática",
    descripcion:
      "Reacciones, cortante, flector y flecha de 20 casos de viga —isostáticos, empotrados y continuos— resueltos por rigidez directa, no por tabla.",
    normasDisponibles: ["Estática"],
    ruta: "/verificaciones/formulario-vigas",
    disponible: true,
  },
];

export function buscarArea(id: string) {
  return registroAreas.find((a) => a.id === id);
}

export function seccionesDeArea(idArea: string) {
  return registroSecciones.filter((s) => s.area === idArea);
}

export function buscarSeccion(id: string) {
  return registroSecciones.find((s) => s.id === id);
}

/** Área a la que pertenece una sección, para poder volver desde adentro. */
export function areaDeSeccion(idSeccion: string) {
  const seccion = buscarSeccion(idSeccion);
  return seccion ? buscarArea(seccion.area) : undefined;
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
