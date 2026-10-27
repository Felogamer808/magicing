import { describe, expect, it } from "vitest";
import type { EsfuerzosTramo } from "@/lib/calc/estatica/viga-libre";
import type { TipoApoyo } from "@/lib/calc/estatica/viga-continua";
import {
  VINCULOS_SERVICIO,
  camposVigaCentradoraDesdeZapata,
  camposVigasDesdeTramo,
  l0DeTramo,
  type DatosVigaCompartidos,
} from "./vinculos";

describe("de zapata aislada con el pilar descentrado a viga centradora", () => {
  const medianeria = {
    fck: "25", A: "1,5", B: "2", Nk: "500", MkA: "40", MkB: "10", numeroB: "10", diametroB: "16",
    distanciaBordeA: "0,05", posicionPilar: "Ubicación libre",
    // No es de la zapata: no tiene que viajar.
    norma: "EC2",
  };

  it("lleva la zapata, el pilar y las cargas tal como están escritos", () => {
    const d = camposVigaCentradoraDesdeZapata(medianeria);
    expect(d.A).toBe("1,5");
    expect(d.Nk).toBe("500");
    expect(d.MkB).toBe("10");
    expect(d.numeroB).toBe("10");
    expect(d.norma).toBeUndefined();
    expect(d.posicionPilar).toBeUndefined();
  });

  it("la distancia de la cara al borde de inicio en A es la distancia al límite", () => {
    expect(camposVigaCentradoraDesdeZapata(medianeria).distanciaColumnaLimite).toBe("0,05");
  });

  it("invierte el signo de MkA: en la zapata es + hacia adentro, en la viga + hacia el límite", () => {
    expect(camposVigaCentradoraDesdeZapata(medianeria).MkA).toBe("-40");
    expect(camposVigaCentradoraDesdeZapata({ ...medianeria, MkA: "-12,5" }).MkA).toBe("12.5");
    expect(camposVigaCentradoraDesdeZapata({ ...medianeria, MkA: "0" }).MkA).toBe("0");
  });

  it("no inventa la luz de la viga", () => {
    expect(camposVigaCentradoraDesdeZapata(medianeria).luz).toBeUndefined();
  });
});

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
    expect(vinculoDe("fisuracion").campos(viga).rg).toBe("0.0400");
  });

  /**
   * En la viga el recubrimiento llega al estribo; el c de la ec. (7.11) es el
   * de la barra longitudinal. Sin sumar el estribo, d salía mayor que en la viga.
   */
  it("suma el estribo al recubrimiento", () => {
    expect(vinculoDe("fisuracion").campos({ ...viga, diametroEstribo: "8" }).rg).toBe("0.0480");
    // d' = 0,04 + 0,008 + 0,012/2
    expect(vinculoDe("deformaciones").campos({ ...viga, diametroEstribo: "8" }).dComp).toBe("0.0540");
  });
});

describe("vínculos desde la viga: sección en T", () => {
  const seccionT = { tipoSeccion: "t-invertida", anchoAla: "1.2", espesorAla: "0.2", tramoL0: "simple", luz1: "6", luz2: "6", l0: "6" };

  it("la T viaja a las dos páginas con su ala, y fisuración con momento positivo", () => {
    const f = vinculoDe("fisuracion").campos({ ...viga, seccionT });
    expect(f).toMatchObject(seccionT);
    expect(f.signoMomento).toBe("positivo");
    expect(vinculoDe("deformaciones").campos({ ...viga, seccionT })).toMatchObject(seccionT);
  });

  it("una viga rectangular deja rectangular el destino", () => {
    expect(vinculoDe("fisuracion").campos(viga).tipoSeccion).toBe("rectangular");
    expect(vinculoDe("deformaciones").campos(viga).tipoSeccion).toBe("rectangular");
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

describe("de la viga libre a vigas: caso de l0 (fig. A19.5.2)", () => {
  // Sólo importan el número de tramo y los momentos de los extremos.
  const tramo = (t: number, extremos: [number, number][] = []): EsfuerzosTramo => ({
    tramo: t, luzM: 0, momentoPosKNm: 0, momentoNegKNm: 0, vdKN: 0, vBordeKN: 0, vdCentroKN: 0, inicioLeyM: 0,
    extremos: extremos.map(([nudo, m]) => ({ nudo, momentoCaraKNm: m, minimoEmpotramientoKNm: 0, vBordeKN: 0, vdKN: 0, distanciaVdM: 0 })),
  });
  const viga = (lucesM: number[], apoyos: TipoApoyo[]) => ({ lucesM, apoyos });

  it("con la T, el caso sale de cuántos extremos tienen continuidad", () => {
    const tres = viga([6, 7, 6], ["simple", "simple", "simple", "simple"]);
    expect(l0DeTramo(viga([6], ["simple", "simple"]), tramo(1), true)).toMatchObject({ tramoL0: "simple", luz1M: 6, avisos: [] });
    expect(l0DeTramo(tres, tramo(1), true)).toMatchObject({ tramoL0: "extremo", luz1M: 6, avisos: [] });
    expect(l0DeTramo(tres, tramo(2), true)).toMatchObject({ tramoL0: "interior", luz1M: 7, avisos: [] });
  });

  it("un empotramiento cuenta como continuidad", () => {
    expect(l0DeTramo(viga([6], ["empotrado", "simple"]), tramo(1), true).tramoL0).toBe("extremo");
    expect(l0DeTramo(viga([6], ["empotrado", "empotrado"]), tramo(1), true).tramoL0).toBe("interior");
  });

  it("con la T invertida va el apoyo que gobierna el M⁻, con las luces de los dos lados", () => {
    const tres = viga([6, 7, 5], ["simple", "simple", "simple", "simple"]);
    expect(l0DeTramo(tres, tramo(2, [[2, 100], [3, 120]]), false)).toMatchObject({ tramoL0: "apoyo", luz1M: 7, luz2M: 5 });
    expect(l0DeTramo(tres, tramo(2, [[2, 130], [3, 120]]), false)).toMatchObject({ tramoL0: "apoyo", luz1M: 7, luz2M: 6 });
  });

  it("un empotramiento de extremo en la T invertida se toma simétrico y se avisa", () => {
    const r = l0DeTramo(viga([6], ["empotrado", "simple"]), tramo(1, [[1, 80]]), false);
    expect(r).toMatchObject({ tramoL0: "apoyo", luz1M: 6, luz2M: 6 });
    expect(r.avisos).toHaveLength(1);
  });

  it("un voladizo manda su largo y el vano contiguo; aislado, l0 a mano igual a su largo", () => {
    const conVano = viga([6, 2], ["simple", "simple", "libre"]);
    expect(l0DeTramo(conVano, tramo(2), true)).toMatchObject({ tramoL0: "voladizo", luz1M: 2, luz2M: 6, avisos: [] });
    // El apoyo junto al voladizo, con la T invertida, es también el caso voladizo.
    expect(l0DeTramo(conVano, tramo(1, [[2, 50]]), false)).toMatchObject({ tramoL0: "voladizo", luz1M: 2, luz2M: 6 });
    expect(l0DeTramo(viga([2], ["empotrado", "libre"]), tramo(1), true)).toMatchObject({ tramoL0: "manual", l0M: 2 });
  });

  it("fuera de la nota se manda igual y se avisa", () => {
    expect(l0DeTramo(viga([4, 7], ["simple", "simple", "simple"]), tramo(1), true).avisos).toHaveLength(1);
    expect(l0DeTramo(viga([4, 7], ["simple", "simple", "simple"]), tramo(2), true).avisos).toHaveLength(1);
    expect(l0DeTramo(viga([6, 3.5], ["simple", "simple", "libre"]), tramo(2), true)).toMatchObject({ tramoL0: "voladizo" });
    expect(l0DeTramo(viga([6, 3.5], ["simple", "simple", "libre"]), tramo(2), true).avisos).toHaveLength(1);
  });

  it("los campos llevan el caso y las luces; sin l2 no se pisa la que había", () => {
    const c = camposVigasDesdeTramo(tramo(1), { tramoL0: "extremo", luz1M: 6, luz2M: 0, avisos: [] });
    expect(c).toMatchObject({ tramoL0: "extremo", luz1: "6.00", avisoL0: "" });
    expect(c).not.toHaveProperty("luz2");
    expect(c).not.toHaveProperty("l0");
  });
});
