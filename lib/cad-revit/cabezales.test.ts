import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import { ubicarCabezales } from "./cabezales";
import { coberturaDelBorde, segmentos } from "./geometria";
import { pilotes, rotulos } from "./rotulos";

/**
 * `prueba.dxf`: dos CT9 (1800x800) de dos pilotes unidos por una VR4 de 350
 * —el contorno da la vuelta a los tres juntos, como en la planta real— y un
 * CT2 (800x800) suelto dibujado de 760 de ancho.
 */
const l = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
const pil = pilotes(l.entidades, "FUNDACIONES");
const segs = segmentos(l.entidades, "FUNDACIONES");
const r = ubicarCabezales(rotulos(l.entidades), pil, segs, 0.001);
const por = (x: number) => r.cabezales.find((c) => Math.abs(c.rect.centro[0] - x) < 1);

describe("ubicarCabezales", () => {
  /**
   * Del borde del cabezal que da a la viga sólo quedan los tramos a los lados
   * de la viga: tiene que encontrarlo igual, en su lugar exacto.
   */
  it("reconstruye cada cabezal del contorno corrido, con las medidas del rótulo", () => {
    expect(r.cabezales).toHaveLength(3);
    for (const x of [0, 6000]) {
      const c = por(x);
      expect(c?.nombre).toBe("CT9");
      expect(c?.origen).toBe("contorno");
      expect(c?.rect.centro[1]).toBeCloseTo(0, 6);
      // 1800 a lo largo de X, 800 a lo largo de Y, sin importar cómo se lo llame.
      const enX = c!.rect.angulo % 180 < 1 ? c!.rect.largo : c!.rect.ancho;
      expect(enX).toBe(1800);
      expect(c?.canto).toBe(750);
      expect(c?.pilotes).toHaveLength(2);
      expect(c?.dibujado).toBeUndefined();
    }
  });

  it("cada pilote queda en un solo cabezal y no sobra ninguno", () => {
    const usados = r.cabezales.flatMap((c) => c.pilotes);
    expect(new Set(usados).size).toBe(usados.length);
    expect(r.pilotesSueltos).toEqual([]);
  });

  it("la cobertura dice cuánto del borde está dibujado", () => {
    const c = por(0)!;
    // Perímetro 5200; falta la boca de la viga (350) en la cara que da a ella.
    expect(c.cobertura).toBeCloseTo((5200 - 350) / 5200, 3);
    expect(coberturaDelBorde({ ...c.rect, centro: [c.rect.centro[0] + 3000, 3000] }, segs, 25)).toBe(0);
  });

  /** CT12 de la planta real: dibujado 1156 de ancho, rótulo 1200. */
  it("si lo dibujado no coincide con el rótulo, usa el rótulo y lo avisa", () => {
    const ct2 = r.cabezales.find((c) => c.nombre === "CT2");
    expect(ct2?.rect.largo).toBe(800);
    expect(ct2?.rect.ancho).toBe(800);
    expect(ct2?.dibujado?.map(Math.round).sort()).toEqual([760, 800]);
    expect(r.avisos.map((a) => a.texto).join("\n")).toMatch(/CT2: dibujado .*760.*rótulo dice 800x800/);
  });
});
