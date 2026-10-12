import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAMPOS_CIMENTACIONES, type IdCimentacion } from "./campos-cimentaciones";
import { calcularCimentacion, completarCampos, IDS_CIMENTACIONES } from "./cimentaciones";
import { EQUILIBRIOS, EXTREMOS_TIRANTE, POSICIONES_AISLADA, POSICIONES_COMBINADA, POSICIONES_CORRIDA } from "@/lib/calc/hormigon/cimentaciones/rotulos-zapatas";

const PAGINA: Record<IdCimentacion, string> = {
  zapatas: "zapata-aislada",
  "zapata-corrida": "zapata-corrida",
  "zapata-combinada": "zapata-combinada",
  "zapata-viga-centradora": "zapata-viga-centradora",
  "viga-atado": "viga-atado",
  "losa-fundacion": "losa-fundacion",
  pilotes: "pilotes",
  cabezales: "cabezal-pilotes",
};

/** Los valores por defecto que la página escribe con una constante en vez de un literal. */
const CONSTANTES: Record<string, string> = {
  "EQUILIBRIOS[0]": EQUILIBRIOS[0],
  "EXTREMOS_TIRANTE[0]": EXTREMOS_TIRANTE[0],
};
const POSICIONES: Partial<Record<IdCimentacion, string>> = {
  zapatas: POSICIONES_AISLADA[0],
  "zapata-corrida": POSICIONES_CORRIDA[0],
  "zapata-combinada": POSICIONES_COMBINADA[0],
};

/** Clave y valor por defecto de cada useCampo de la página, salvo la norma. */
function camposDeLaPagina(id: IdCimentacion): Record<string, string> {
  const fuente = readFileSync(join(process.cwd(), "app/verificaciones/(hormigon)", PAGINA[id], "page.tsx"), "utf8");
  const salida: Record<string, string> = {};
  for (const m of fuente.matchAll(/useCampo(?:<[^>]+>)?\("([^"]+)",\s*([^)]+)\)/g)) {
    if (m[1] === "norma") continue;
    const crudo = m[2].trim();
    salida[m[1]] = crudo.startsWith('"') ? JSON.parse(crudo) : crudo === "POSICIONES[0]" ? POSICIONES[id]! : CONSTANTES[crudo];
  }
  return salida;
}

describe("MCP de cimentaciones: los campos son los de la página", () => {
  for (const id of IDS_CIMENTACIONES) {
    it(`${id}: mismas claves y mismos valores por defecto`, () => {
      const pagina = camposDeLaPagina(id);
      const definidos = Object.fromEntries(CAMPOS_CIMENTACIONES[id].map((c) => [c.clave, c.porDefecto]));
      expect(definidos).toEqual(pagina);
    });
  }
});

describe("MCP de cimentaciones: calcula", () => {
  for (const id of IDS_CIMENTACIONES) {
    it(`${id}: con los valores por defecto da comprobaciones`, () => {
      const r = calcularCimentacion(id, {});
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.comprobaciones.length).toBeGreaterThan(0);
      for (const c of r.comprobaciones) expect(typeof c.nombre).toBe("string");
      expect(r.verificacion.normas.length).toBeGreaterThan(0);
    });
  }

  it("rechaza una clave que no existe, en vez de calcular con el valor por defecto", () => {
    const r = calcularCimentacion("pilotes", { diametr: 0.5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0]).toMatch(/diametr/);
  });

  it("rechaza una opción fuera de la lista", () => {
    const { errores } = completarCampos("zapatas", { formaAnclaje: "Patilla a 90°" });
    expect(errores[0]).toMatch(/recta \| gancho/);
  });

  it("acepta números y los pasa como texto, como los guarda la página", () => {
    const r = calcularCimentacion("pilotes", { Nk: 400 });
    expect(r.ok && r.camposUsados.Nk).toBe("400");
  });

  it("si los datos no dan un cálculo válido, lo dice", () => {
    const r = calcularCimentacion("zapatas", { Nk: "0" });
    expect(r.ok).toBe(false);
  });

  it("el par tirante–terreno trae las comprobaciones de sus barras", () => {
    const r = calcularCimentacion("zapatas", {
      posicionPilar: "Ubicación libre", distanciaBordeA: "0", equilibrioA: "Par tirante–terreno",
    });
    expect(r.ok && r.tirante?.comprobaciones.length).toBeGreaterThan(0);
  });

  it("con la extraordinaria trae también el hormigón de las tres zapatas", () => {
    for (const id of ["zapatas", "zapata-corrida", "zapata-combinada"] as const) {
      const r = calcularCimentacion(id, { conExtraordinaria: "Sí" });
      const ext = r.ok ? r.comprobaciones.filter((c) => c.clave.startsWith("ext.hormigon.")) : [];
      expect(ext.length, id).toBeGreaterThan(0);
      expect(ext.every((c) => c.nombre.endsWith("(extraordinaria)")), id).toBe(true);
    }
  });
});
