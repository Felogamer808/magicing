/**
 * Servidor MCP de MagicIng: expone las verificaciones de cimentaciones para
 * que Claude (app de escritorio o Claude Code) calcule con el mismo motor que
 * la web.
 *
 * Corre por stdio, en la máquina local: `npm run mcp`. Por stdout sólo viaja
 * el protocolo; cualquier mensaje para quien lo mira va por stderr.
 *
 * No guarda nada ni ve los proyectos de la web, que viven en el localStorage
 * del navegador: calcula con los datos que se le pasan.
 */

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import {
  calcularCimentacion,
  camposDe,
  esCimentacion,
  fichaCimentacion,
  IDS_CIMENTACIONES,
} from "@/lib/mcp/cimentaciones";

const servidor = new McpServer({ name: "magicing", version: "0.1.0" });

const texto = (valor: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(valor, null, 2) }] });
const error = (mensaje: string) => ({ ...texto({ error: mensaje }), isError: true });

const verificacion = z
  .string()
  .describe(`Id de la verificación: ${IDS_CIMENTACIONES.join(", ")}. Ver listar_verificaciones.`);

servidor.registerTool(
  "listar_verificaciones",
  {
    title: "Listar verificaciones de cimentaciones",
    description:
      "Las verificaciones de cimentaciones de MagicIng: id, nombre, norma con la que se resuelven, qué combinación de acciones esperan (cargas características o ya mayoradas) y su nivel de validación. Empezar por acá.",
    annotations: { readOnlyHint: true },
  },
  async () => texto(IDS_CIMENTACIONES.map(fichaCimentacion))
);

servidor.registerTool(
  "campos_de",
  {
    title: "Campos de una verificación",
    description:
      "Qué datos pide una verificación: clave, etiqueta, unidad, valor por defecto y opciones. Las unidades son las de la web: m, kN, kN·m, MPa, kN/m²; diámetros de barra en mm. Las opciones se pasan con el valor exacto de la lista.",
    inputSchema: z.object({ verificacion }),
    annotations: { readOnlyHint: true },
  },
  async ({ verificacion: id }) => {
    if (!esCimentacion(id)) return error(`"${id}" no es una verificación de cimentaciones: ${IDS_CIMENTACIONES.join(", ")}.`);
    return texto({ ...fichaCimentacion(id), campos: camposDe(id) });
  }
);

servidor.registerTool(
  "calcular",
  {
    title: "Calcular una verificación",
    description:
      "Calcula con el mismo motor que la página web. Los campos que no se pasan toman el valor por defecto de la página (la respuesta lista cuáles). Devuelve cada comprobación con su utilización, las propuestas recalculadas para lo que no cumple o queda justo, y el resultado completo del motor. Respetar la combinación de acciones de la verificación: unas esperan cargas características y otras ya mayoradas.",
    inputSchema: z.object({
      verificacion,
      campos: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .default({})
        .describe("Clave → valor, con las claves de campos_de. Números en las unidades de la web."),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ verificacion: id, campos }) => {
    if (!esCimentacion(id)) return error(`"${id}" no es una verificación de cimentaciones: ${IDS_CIMENTACIONES.join(", ")}.`);
    const r = calcularCimentacion(id, campos);
    return r.ok ? texto(r) : { ...texto(r), isError: true };
  }
);

// Sin await de nivel superior: el proyecto no es un módulo ES y tsx lo corre como CommonJS.
servidor.connect(new StdioServerTransport()).then(() => console.error("MagicIng MCP listo: cimentaciones."));
