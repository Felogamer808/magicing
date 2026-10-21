import { describe, expect, it } from "vitest";
import { camposDe } from "@/lib/mcp/cimentaciones";
import { crearCalculo } from "@/lib/proyectos/modelo";
import { CAMPOS_DERIVADOS, camposDelPanel, completarDiametros, esDiametro, resultadoDelPanel } from "./armadura";
import { A_MANO } from "./proyecto";

/** CT9 (1800x800x750) como lo deja la planta: geometría cargada, lo demás vacío. */
const cabezalVacio = crearCalculo("cabezales", {
  ...{ fck: "30", fyk: "500", rg: "0.03", ladoX: "1.8", ladoY: "0.8", hCab: "0.75", dPilote: "0.5" },
  ...Object.fromEntries(A_MANO.cabezales.map((k) => [k, ""])),
});

describe("armadura en el panel", () => {
  it("muestra la armadura y no lo que deriva MagicIng de las cargas", () => {
    expect(camposDelPanel("cabezales").map((d) => d.clave)).toEqual([
      "nPrinc", "phiPrinc", "nSec", "phiSec", "nEstV", "phiEstV", "nCercos", "nEstH", "phiEstH",
    ]);
    expect(camposDelPanel("viga-centradora-pilotes").map((d) => d.clave)).toContain("excentricidad");
    expect(camposDelPanel("viga-centradora-pilotes").map((d) => d.clave)).not.toContain("n1d");
  });

  it("los derivados existen como campos de su verificación", () => {
    for (const [v, claves] of Object.entries(CAMPOS_DERIVADOS)) {
      const definidas = camposDe(v as Parameters<typeof camposDe>[0]).map((d) => d.clave);
      for (const k of claves) expect(definidas).toContain(k);
    }
  });

  it("reconoce los diámetros de barra, no el del pilote", () => {
    expect(["phiPrinc", "diametroCara", "diametroEstribo"].every(esDiametro)).toBe(true);
    expect(camposDelPanel("pilotes").map((d) => d.clave)).not.toContain("diametro");
  });

  /** Ø16 / Ø10 / Ø8 / Ø10: los de la página. Las cantidades siguen vacías. */
  it("completa los diámetros vacíos con los típicos, sin inventar cantidades", () => {
    const c = completarDiametros("cabezales", cabezalVacio.campos);
    expect(c).toMatchObject({ phiPrinc: "16", phiSec: "10", phiEstV: "8", phiEstH: "10", nPrinc: "", nEstV: "" });
    expect(completarDiametros("cabezales", { ...cabezalVacio.campos, phiPrinc: "20" }).phiPrinc).toBe("20");
  });

  it("sin cargar, dice qué falta", () => {
    const r = resultadoDelPanel(cabezalVacio);
    expect(r.estado).toBe("no-evaluable");
    expect(r.faltan[0]).toBe("G, Q y lado A del pilar (arriba)");
    expect(r.faltan).not.toContain("Nd pilar");
    expect(r.faltan.length).toBeGreaterThan(5);
  });

  /** Con 10 verticales Ø8 fallan los estribos (es lo que da la página con estos datos). */
  it("con todo cargado, da el estado y qué comprobaciones fallan", () => {
    const armado = crearCalculo("cabezales", {
      ...cabezalVacio.campos,
      ...{ norma: "EC2", anchoPilar: "0.3", ndPilar: "480", nPrinc: "7", phiPrinc: "16", nSec: "7", phiSec: "10" },
      ...{ nEstV: "10", phiEstV: "8", nCercos: "2", nEstH: "5", phiEstH: "10" },
    });
    const r = resultadoDelPanel(armado);
    expect(r.estado).toBe("no-verifica");
    expect(r.faltan).toEqual([]);
    expect(r.fallan.length).toBeGreaterThan(0);
  });
});
