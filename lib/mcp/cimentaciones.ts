import { CAMPOS_CIMENTACIONES, type DefinicionCampo, type IdCimentacion } from "@/lib/mcp/campos-cimentaciones";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { COMBINACION_POR_VERIFICACION } from "@/lib/verificaciones/combinaciones";
import { EDICIONES_NORMAS, NIVELES_VALIDACION, nombreNorma, validacionDe } from "@/lib/verificaciones/validacion";
import type { Comprobacion, Recomendacion } from "@/lib/verificaciones/recomendaciones/motor";
import { resolverZapataAislada } from "@/lib/calc/hormigon/cimentaciones/resolver-zapata-aislada";
import { resolverZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/resolver-zapata-corrida";
import { resolverZapataCombinada } from "@/lib/calc/hormigon/cimentaciones/resolver-zapata-combinada";
import { resolverVigaCentradora } from "@/lib/calc/hormigon/cimentaciones/resolver-viga-centradora";
import { resolverVigaAtado } from "@/lib/calc/hormigon/cimentaciones/resolver-viga-atado";
import { resolverLosaFundacion } from "@/lib/calc/hormigon/losas/resolver-losa-fundacion";
import { resolverPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-pilote";
import { resolverCabezal } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal";
import { comprobarZapataAislada } from "@/lib/verificaciones/recomendaciones/zapata-aislada";
import { comprobarZapataCorrida } from "@/lib/verificaciones/recomendaciones/zapata-corrida";
import { comprobarZapataCombinada } from "@/lib/verificaciones/recomendaciones/zapata-combinada";
import { comprobarVigaCentradora, recomendarVigaCentradora } from "@/lib/verificaciones/recomendaciones/zapata-viga-centradora";
import { comprobarVigaAtado, recomendarVigaAtado } from "@/lib/verificaciones/recomendaciones/viga-atado";
import { comprobarLosaFundacion, recomendarLosaFundacion } from "@/lib/verificaciones/recomendaciones/losa-fundacion";
import { comprobarPilote, recomendarPilote } from "@/lib/verificaciones/recomendaciones/pilotes";
import { comprobarCabezal, recomendarCabezal } from "@/lib/verificaciones/recomendaciones/cabezal-pilotes";
import { resolverCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-un-pilote";
import { comprobarCabezalUnPilote, recomendarCabezalUnPilote } from "@/lib/verificaciones/recomendaciones/cabezal-un-pilote";
import { comprobarArmaduraTirante } from "@/lib/verificaciones/recomendaciones/armadura-tirante";
import {
  comprobacionesExtraordinarias,
  filasExtraordinariasAislada,
  filasExtraordinariasCombinada,
  filasExtraordinariasCorrida,
} from "@/lib/verificaciones/hormigon-extraordinario";

/**
 * Las verificaciones de cimentaciones vistas desde el servidor MCP.
 *
 * No calcula nada propio: llama al mismo resolver que la página, con los
 * campos tal como los guardaría la página, y devuelve lo mismo que muestra la
 * pantalla —comprobaciones, utilizaciones y propuestas recalculadas— más el
 * resultado completo del motor para quien quiera el desarrollo.
 */

type Campos = Record<string, string>;
type Recomendaciones = Partial<Record<string, Recomendacion[]>>;

interface Calculado {
  comprobaciones: Comprobacion[];
  recomendaciones: Recomendaciones;
  /** Lo que devuelve el motor, entero: el desarrollo con todos sus números. */
  resultado: unknown;
  /** Par tirante–terreno, cuando lo hay: sus barras se comprueban aparte. */
  tirante?: { comprobaciones: Comprobacion[]; recomendaciones: Recomendaciones };
}

const tirante = (
  entrada: Parameters<typeof comprobarArmaduraTirante>[0] | undefined,
  recomendaciones: Recomendaciones | undefined
) => (entrada ? { tirante: { comprobaciones: comprobarArmaduraTirante(entrada) ?? [], recomendaciones: recomendaciones ?? {} } } : {});

const CALCULOS: Record<IdCimentacion, (c: Campos) => Calculado | null> = {
  zapatas: (c) => {
    const r = resolverZapataAislada(c);
    if (!r) return null;
    return {
      // El hormigón de la extraordinaria no pasa por las recomendaciones: se suma acá.
      comprobaciones: [
        ...(comprobarZapataAislada(r.entrada) ?? []),
        ...(r.zapata.extraordinaria
          ? comprobacionesExtraordinarias(filasExtraordinariasAislada(r.zapata.extraordinaria.hormigon, r.armaduraTiranteExt))
          : []),
      ],
      recomendaciones: r.recomendaciones,
      resultado: r.zapata,
      ...tirante(r.entradaTirante, r.recomendacionesTirante),
    };
  },
  "zapata-corrida": (c) => {
    const r = resolverZapataCorrida(c);
    if (!r) return null;
    return {
      comprobaciones: [
        ...(comprobarZapataCorrida(r.entrada) ?? []),
        ...(r.zapata.extraordinaria
          ? comprobacionesExtraordinarias(filasExtraordinariasCorrida(r.zapata.extraordinaria.hormigon, r.armaduraTiranteExt))
          : []),
      ],
      recomendaciones: r.recomendaciones,
      resultado: r.zapata,
      ...tirante(r.entradaTirante, r.recomendacionesTirante),
    };
  },
  "zapata-combinada": (c) => {
    const r = resolverZapataCombinada(c);
    if (!r) return null;
    return {
      comprobaciones: [
        ...(comprobarZapataCombinada(r.entrada) ?? []),
        ...(r.zapata.extraordinaria
          ? comprobacionesExtraordinarias(filasExtraordinariasCombinada(r.zapata.extraordinaria.hormigon, r.armaduraTiranteExt))
          : []),
      ],
      recomendaciones: r.recomendaciones,
      resultado: r.zapata,
      ...tirante(r.entradaTirante, r.recomendacionesTirante),
    };
  },
  "zapata-viga-centradora": (c) => {
    const r = resolverVigaCentradora(c);
    return r && { comprobaciones: comprobarVigaCentradora(c) ?? [], recomendaciones: recomendarVigaCentradora(c), resultado: r.r };
  },
  "viga-atado": (c) => {
    const r = resolverVigaAtado(c);
    return r && { comprobaciones: comprobarVigaAtado(c) ?? [], recomendaciones: recomendarVigaAtado(c), resultado: r.r };
  },
  "losa-fundacion": (c) => {
    const r = resolverLosaFundacion(c);
    return r && { comprobaciones: comprobarLosaFundacion(c) ?? [], recomendaciones: recomendarLosaFundacion(c), resultado: r.franja };
  },
  pilotes: (c) => {
    const r = resolverPilote(c);
    return r && { comprobaciones: comprobarPilote(c) ?? [], recomendaciones: recomendarPilote(c), resultado: r.pilote };
  },
  cabezales: (c) => {
    const r = resolverCabezal(c);
    return r && { comprobaciones: comprobarCabezal(c) ?? [], recomendaciones: recomendarCabezal(c), resultado: r.r };
  },
  "cabezal-un-pilote": (c) => {
    const r = resolverCabezalUnPilote(c);
    return r && { comprobaciones: comprobarCabezalUnPilote(c) ?? [], recomendaciones: recomendarCabezalUnPilote(c), resultado: r.r };
  },
};

export const IDS_CIMENTACIONES = Object.keys(CAMPOS_CIMENTACIONES) as IdCimentacion[];

export const esCimentacion = (id: string): id is IdCimentacion => id in CAMPOS_CIMENTACIONES;

/** Lo que hay que saber de una verificación antes de cargarle datos. */
export function fichaCimentacion(id: IdCimentacion) {
  const meta = registroVerificaciones.find((v) => v.id === id)!;
  const combinacion = COMBINACION_POR_VERIFICACION[id];
  const validacion = validacionDe(id);
  const normas = meta.normasDisponibles.map((n) => ({
    nombre: nombreNorma(n),
    ...(EDICIONES_NORMAS[n] ? { documento: EDICIONES_NORMAS[n].titulo, edicion: EDICIONES_NORMAS[n].edicion } : {}),
  }));
  return {
    id,
    nombre: meta.nombre,
    descripcion: meta.descripcion,
    normas,
    combinacion: { etiqueta: combinacion.etiqueta, detalle: combinacion.detalle },
    validacion: {
      nivel: NIVELES_VALIDACION[validacion.nivel].etiqueta,
      significado: NIVELES_VALIDACION[validacion.nivel].significado,
      ...(validacion.nota ? { nota: validacion.nota } : {}),
    },
  };
}

export function camposDe(id: IdCimentacion): readonly DefinicionCampo[] {
  return CAMPOS_CIMENTACIONES[id];
}

/**
 * Completa con los valores por defecto lo que no se pasó y rechaza lo que la
 * página no aceptaría: claves que no existen y opciones fuera de la lista.
 * Rechazar es a propósito: una clave mal escrita que se ignora en silencio
 * calcula con el valor por defecto y nadie se entera.
 */
export function completarCampos(id: IdCimentacion, dados: Record<string, string | number>) {
  const definicion = camposDe(id);
  const errores: string[] = [];
  const conocidas = new Set(definicion.map((c) => c.clave));
  for (const clave of Object.keys(dados)) {
    if (!conocidas.has(clave)) errores.push(`"${clave}" no es un campo de ${id}. Ver campos_de.`);
  }
  const campos: Campos = {};
  for (const c of definicion) {
    const dado = dados[c.clave];
    const valor = dado === undefined ? c.porDefecto : String(dado);
    if (c.opciones && !c.opciones.includes(valor)) {
      errores.push(`"${c.clave}" = "${valor}" no es una opción válida: ${c.opciones.join(" | ")}.`);
    }
    campos[c.clave] = valor;
  }
  const porDefecto = definicion.filter((c) => dados[c.clave] === undefined).map((c) => c.clave);
  return { campos, errores, porDefecto };
}

/** Calcula una verificación de cimentaciones con los campos dados. */
export function calcularCimentacion(id: IdCimentacion, dados: Record<string, string | number>) {
  const { campos, errores, porDefecto } = completarCampos(id, dados);
  if (errores.length) return { ok: false as const, errores };
  const calculado = CALCULOS[id](campos);
  if (!calculado) {
    return {
      ok: false as const,
      errores: [
        "Con estos datos la página no calcula: hay valores vacíos, no numéricos o fuera de rango (por ejemplo un pilar fuera de la zapata, o un Nk permanente mayor que Nk).",
      ],
    };
  }
  const fallan = calculado.comprobaciones.filter((c) => !c.cumple).map((c) => c.nombre);
  const fallanTirante = calculado.tirante?.comprobaciones.filter((c) => !c.cumple).map((c) => c.nombre) ?? [];
  return {
    ok: true as const,
    verificacion: fichaCimentacion(id),
    cumple: fallan.length === 0 && fallanTirante.length === 0,
    fallan: [...fallan, ...fallanTirante],
    camposUsados: campos,
    camposPorDefecto: porDefecto,
    ...calculado,
  };
}
