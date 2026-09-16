import { describe, expect, it } from "vitest";
import { VINCULOS_SERVICIO, type DatosVigaCompartidos } from "./vinculos";

const viga: DatosVigaCompartidos = {
  fck: "30",
  fyk: "500",
  b: "0.9",
  h: "0.7",
  recubrimiento: "0.04",
  numeroPos: "10",
  diametroPos: "10",
  numeroPos2: "0",
  diametroPos2: "10",
  diametroNeg: "12",
  dUtilM: 0.655,
  asNecPosCm2: 1.42,
  asRealPosCm2: 7.85,
};

const vinculoDe = (id: string) => VINCULOS_SERVICIO.find((v) => v.id === id)!;

describe("vínculos: destinos ofrecidos", () => {
  it("van sólo a las dos verificaciones de servicio", () => {
    expect(VINCULOS_SERVICIO.map((v) => v.id)).toEqual(["fisuracion", "deformaciones"]);
  });

  /**
   * Flexión y torsión no se encadenan entre sí: torsión ya resuelve la flexión
   * y el cortante de la misma viga, así que no son dos pasos sino dos formas de
   * calcular lo mismo. Quien tiene torsión arranca ahí.
   */
  it("no ofrece saltar de una verificación de ELU a la otra", () => {
    expect(VINCULOS_SERVICIO.map((v) => v.id)).not.toContain("vigas-torsion");
    expect(VINCULOS_SERVICIO.map((v) => v.id)).not.toContain("vigas-flexion-cortante");
  });

  /** La página de torsión no tiene 2ª capa y no debería tener que fingir una. */
  it("funciona sin los campos de segunda capa", () => {
    const sinSegundaCapa: DatosVigaCompartidos = { ...viga };
    delete sinSegundaCapa.numeroPos2;
    delete sinSegundaCapa.diametroPos2;
    for (const v of VINCULOS_SERVICIO) {
      expect(() => v.campos(sinSegundaCapa)).not.toThrow();
    }
    expect(vinculoDe("fisuracion").campos(sinSegundaCapa).phi2).toBe("0");
  });
});

describe("vínculos desde la viga: fisuración", () => {
  /**
   * La página de fisuración reconstruye el número de barras como n = b/s. Si la
   * separación que se le manda no es exactamente la inversa, la armadura que
   * aparece del otro lado no es la que se dibujó en la viga.
   */
  it("convierte barras a separación de forma que el destino recupere las mismas barras", () => {
    const campos = vinculoDe("fisuracion").campos(viga);
    const barrasRecuperadas = Number(viga.b) / Number(campos.s1);
    expect(barrasRecuperadas).toBeCloseTo(Number(viga.numeroPos), 6);
    expect(campos.phi1).toBe("10");
  });

  it("apaga la segunda familia cuando la viga no tiene segunda capa, sin dejar la separación en blanco", () => {
    const campos = vinculoDe("fisuracion").campos(viga);
    expect(campos.phi2).toBe("0");
    expect(campos).not.toHaveProperty("s2");
  });

  it("lleva la segunda familia cuando existe", () => {
    const campos = vinculoDe("fisuracion").campos({
      ...viga, numeroPos2: "4", diametroPos2: "16",
    });
    expect(campos.phi2).toBe("16");
    expect(Number(viga.b) / Number(campos.s2)).toBeCloseTo(4, 6);
  });

  it("manda el recubrimiento al campo que usa esa página", () => {
    expect(vinculoDe("fisuracion").campos(viga).rg).toBe("0.04");
  });
});

describe("vínculos desde la viga: deformaciones", () => {
  it("lleva el canto útil y las dos áreas de armadura que la viga ya calculó", () => {
    const campos = vinculoDe("deformaciones").campos(viga);
    expect(Number(campos.d)).toBeCloseTo(0.655, 6);
    expect(Number(campos.asProv)).toBeCloseTo(7.85, 6);
    expect(Number(campos.asReq)).toBeCloseTo(1.42, 6);
  });

  it("deja la armadura de compresión en cero: contarla es una decisión de quien calcula", () => {
    expect(vinculoDe("deformaciones").campos(viga).asComp).toBe("0");
  });

  it("arma d' con el recubrimiento y el radio de la barra superior", () => {
    const campos = vinculoDe("deformaciones").campos(viga);
    expect(Number(campos.dComp)).toBeCloseTo(0.04 + 12 / 2000, 6);
  });
});

describe("vínculos: lo que no se puede deducir no viaja", () => {
  /**
   * El momento que maneja la viga es de cálculo (ELU) y las dos verificaciones
   * de servicio piden el cuasipermanente. Pasarlo sería inflar fisuras y
   * flechas sin que se note, así que ningún vínculo puede escribir `mqp`.
   */
  it("ninguna verificación de servicio recibe un momento desde la viga", () => {
    for (const id of ["fisuracion", "deformaciones"]) {
      expect(vinculoDe(id).campos(viga)).not.toHaveProperty("mqp");
    }
  });

  it("deformaciones tampoco recibe luz ni fluencia: no son datos de la viga", () => {
    const campos = vinculoDe("deformaciones").campos(viga);
    expect(campos).not.toHaveProperty("luz");
    expect(campos).not.toHaveProperty("phi");
    expect(campos).not.toHaveProperty("epsilonCs");
  });

  it("cada vínculo avisa qué falta cargar del otro lado", () => {
    for (const v of VINCULOS_SERVICIO) {
      expect(v.falta).toBeTruthy();
    }
  });
});
