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
    expect(vinculoDe("fisuracion").campos(sinSegundaCapa).familia2).toBe("No");
  });
});

describe("vínculos desde la viga: fisuración", () => {
  /**
   * Las dos páginas hablan de barras, así que el arrastre es literal: lo que se
   * dibujó en la viga es lo que aparece del otro lado, sin conversión de por
   * medio donde se pueda perder una barra.
   */
  it("lleva las barras tal cual, sin convertir a separación", () => {
    const campos = vinculoDe("fisuracion").campos(viga);
    expect(campos.numero1).toBe("10");
    expect(campos.phi1).toBe("10");
    expect(campos).not.toHaveProperty("s1");
  });

  it("deja apagada la segunda familia cuando la viga no tiene segunda capa", () => {
    const campos = vinculoDe("fisuracion").campos(viga);
    expect(campos.familia2).toBe("No");
    expect(campos).not.toHaveProperty("numero2");
  });

  it("enciende y llena la segunda familia cuando existe", () => {
    const campos = vinculoDe("fisuracion").campos({
      ...viga, numeroPos2: "4", diametroPos2: "16",
    });
    expect(campos.familia2).toBe("Sí");
    expect(campos.numero2).toBe("4");
    expect(campos.phi2).toBe("16");
  });

  it("manda el recubrimiento al campo que usa esa página", () => {
    expect(vinculoDe("fisuracion").campos(viga).rg).toBe("0.04");
  });
});

describe("vínculos desde la viga: deformaciones", () => {
  it("lleva el canto útil y la armadura de tracción como barras", () => {
    const campos = vinculoDe("deformaciones").campos(viga);
    expect(Number(campos.d)).toBeCloseTo(0.655, 6);
    expect(campos.numeroAs).toBe("10");
    expect(campos.phiAs).toBe("10");
    expect(campos.capa2).toBe("No");
  });

  it("enciende la segunda capa cuando la viga la tiene", () => {
    const campos = vinculoDe("deformaciones").campos({
      ...viga, numeroPos2: "4", diametroPos2: "16",
    });
    expect(campos.capa2).toBe("Sí");
    expect(campos.numeroAs2).toBe("4");
    expect(campos.phiAs2).toBe("16");
  });

  /** La necesaria en ELU es una demanda, no un despiece: sigue siendo un área. */
  it("lleva la As necesaria como área, no como barras", () => {
    const campos = vinculoDe("deformaciones").campos(viga);
    expect(Number(campos.asReq)).toBeCloseTo(1.42, 6);
    expect(campos).not.toHaveProperty("numeroAsReq");
  });

  it("deja la armadura de compresión en cero: contarla es una decisión de quien calcula", () => {
    expect(vinculoDe("deformaciones").campos(viga).numeroAsComp).toBe("0");
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

  /**
   * Lo que el destino necesita sí o sí y la viga no puede dar se blanquea al
   * llegar: si quedara con el valor por defecto de la página, se vería una
   * flecha o una fisura calculadas con una luz y un momento de ejemplo.
   */
  it("blanquea en el destino los datos de servicio que no puede aportar", () => {
    expect(vinculoDe("fisuracion").blanquear).toContain("mqp");
    expect(vinculoDe("deformaciones").blanquear).toContain("mqp");
    expect(vinculoDe("deformaciones").blanquear).toContain("luz");
  });

  it("no blanquea nada que el vínculo sí esté llenando", () => {
    for (const v of VINCULOS_SERVICIO) {
      const escritos = Object.keys(v.campos(viga));
      for (const nombre of v.blanquear ?? []) {
        expect(escritos).not.toContain(nombre);
      }
    }
  });

  it("cada vínculo avisa qué falta cargar del otro lado", () => {
    for (const v of VINCULOS_SERVICIO) {
      expect(v.falta).toBeTruthy();
    }
  });
});
