import { describe, expect, it } from "vitest";
import {
  BETA_RECOMENDADO,
  calcularPunzonamiento,
  K_MAX_ARMADURA,
  perimetroDeControl,
  type ArmaduraLongitudinalPunzonamiento,
  type ArmaduraPunzonamientoDatos,
  type GeometriaPunzonamiento,
  type PosicionPilar,
} from "./punzonamiento";

/**
 * La planilla PUNZONADO.xlsx no sirve como referencia de paridad: mezcla el
 * perímetro crítico del EC2 con el vmin, la biela y el fywd de la EHE-08. Las
 * comprobaciones de acá son contra el articulado del Anejo 19 y contra
 * geometría exacta, y donde el número de la planilla se puede reproducir con la
 * fórmula del Anejo 19 el test lo dice.
 */

describe("perímetro de control: las tres fórmulas clásicas salen del caso general", () => {
  const cx = 0.3;
  const cy = 0.4;
  const d = 0.18;
  const r = 2 * d;

  /**
   * Ubica el pilar en el cuadrante positivo. `distX`/`distY` en null es "no
   * hay borde libre de ese lado": el pilar se aleja lo suficiente como para que
   * el recorte no tenga efecto, que es lo mismo que desactivarlo.
   */
  const caso = (distX: number | null, distY: number | null, radio = r) =>
    perimetroDeControl(
      {
        x0: distX ?? 10,
        y0: distY ?? 10,
        x1: (distX ?? 10) + cx,
        y1: (distY ?? 10) + cy,
      },
      radio,
      distX !== null,
      distY !== null
    );

  it("pilar interior: 2(cx + cy) + 4πd", () => {
    const u = caso(null, null).longitudM;
    expect(u).toBeCloseTo(2 * (cx + cy) + 4 * Math.PI * d, 9);
  });

  it("pilar de borde a ras: cx + 2cy + 2πd", () => {
    const u = caso(null, 0).longitudM;
    expect(u).toBeCloseTo(cx + 2 * cy + 2 * Math.PI * d, 9);
  });

  it("pilar de esquina a ras: cx + cy + πd", () => {
    const u = caso(0, 0).longitudM;
    expect(u).toBeCloseTo(cx + cy + Math.PI * d, 9);
  });

  /**
   * El caso que las fórmulas cerradas de manual no cubren y que sí aparece en
   * obra: la losa vuela más allá del pilar de fachada. El perímetro crece de
   * forma continua en los arcos a medida que el pilar se aleja del borde.
   */
  it("pilar de borde retirado: crece con la distancia al borde, sin saltos hasta 2d", () => {
    const largos = [0, 0.05, 0.1, 0.2, 0.3].map(
      (dist) => caso(null, dist).longitudM
    );
    for (let i = 1; i < largos.length; i++) {
      expect(largos[i]).toBeGreaterThan(largos[i - 1]);
    }
    // A un pelo de 2d todavía falta el tramo recto paralelo al borde, que es lo
    // único que entra de golpe: art. 6.4.2(4), el borde libre no computa.
    // El épsilon va muy chico a propósito: el arco recortado mide r·asin(dist/r)
    // y asin tiene pendiente infinita en 1, así que acercarse al borde "casi"
    // 2d deja un resto que decae como la raíz del épsilon, no como el épsilon.
    const casi = caso(null, r - 1e-12).longitudM;
    const justo = caso(null, r).longitudM;
    expect(justo - casi).toBeCloseTo(cx, 4);
  });

  it("más allá de 2d del borde el perímetro ya es el de un pilar interior", () => {
    const interior = caso(null, null).longitudM;
    expect(caso(null, r).longitudM).toBeCloseTo(interior, 9);
    expect(caso(null, 2 * r).longitudM).toBeCloseTo(interior, 9);
  });

  it("los tramos forman un trazo continuo y cierran donde corresponde", () => {
    const { tramos } = caso(null, null);
    const extremos = tramos.map((t) =>
      t.tipo === "recta"
        ? {
            desde: [t.x0, t.y0] as const,
            hasta: [t.x1, t.y1] as const,
          }
        : {
            desde: [t.cx + t.rM * Math.cos(t.desdeRad), t.cy + t.rM * Math.sin(t.desdeRad)] as const,
            hasta: [t.cx + t.rM * Math.cos(t.hastaRad), t.cy + t.rM * Math.sin(t.hastaRad)] as const,
          }
    );
    for (let i = 1; i < extremos.length; i++) {
      expect(extremos[i].desde[0]).toBeCloseTo(extremos[i - 1].hasta[0], 9);
      expect(extremos[i].desde[1]).toBeCloseTo(extremos[i - 1].hasta[1], 9);
    }
    // Y el último cierra contra el primero.
    const ultimo = extremos[extremos.length - 1];
    expect(ultimo.hasta[0]).toBeCloseTo(extremos[0].desde[0], 9);
    expect(ultimo.hasta[1]).toBeCloseTo(extremos[0].desde[1], 9);
  });

  it("la longitud coincide con la suma de los tramos que devuelve", () => {
    for (const bordes of [
      [null, null],
      [null, 0],
      [0, 0],
      [0.05, 0.12],
    ] as const) {
      const p = caso(bordes[0], bordes[1]);
      const suma = p.tramos.reduce(
        (acc, t) =>
          acc +
          (t.tipo === "recta"
            ? Math.hypot(t.x1 - t.x0, t.y1 - t.y0)
            : t.rM * (t.hastaRad - t.desdeRad)),
        0
      );
      expect(suma).toBeCloseTo(p.longitudM, 9);
    }
  });
});

// Caso base: el de la hoja "Soportes interiores" de la planilla, con e = 20 cm,
// d = 18 cm, pilar de 30×30, fck 30, Fsd = 256 kN y β = 1,15.
const GEOMETRIA_BASE: GeometriaPunzonamiento = {
  posicion: "interior",
  dYM: 0.18,
  dZM: 0.18,
  c1M: 0.3,
  c2M: 0.3,
  distBordeC1M: 0,
  distBordeC2M: 0,
};

const LONGITUDINAL_BASE: ArmaduraLongitudinalPunzonamiento = {
  diametroYMm: 12,
  separacionYM: 0.15,
  diametroZMm: 12,
  separacionZM: 0.15,
};

const ARMADURA_BASE: ArmaduraPunzonamientoDatos = {
  diametroMm: 8,
  ramasPorPerimetro: 12,
  srM: 0.12,
  stM: 0.2,
  numeroPerimetros: 3,
  distPrimerPerimetroM: 0.08,
  alphaGrados: 90,
};

const MATERIALES = { fckMPa: 30, fykMPa: 500 };

function calcular(
  vEdKN: number,
  geometria: Partial<GeometriaPunzonamiento> = {},
  armadura: Partial<ArmaduraPunzonamientoDatos> = {},
  betaManual: number | null = null
) {
  return calcularPunzonamiento(
    MATERIALES,
    { ...GEOMETRIA_BASE, ...geometria },
    LONGITUDINAL_BASE,
    { vEdKN, betaManual },
    { ...ARMADURA_BASE, ...armadura }
  );
}

describe("perímetro crítico, ec. (6.47)", () => {
  it("reproduce el u1 de la planilla para el pilar interior de 30×30 con d = 18", () => {
    const r = calcular(256);
    // La planilla da 346,19 cm por 4πd + 2(a0 + b0).
    expect(r.critico.u1M * 100).toBeCloseTo(346.1946, 3);
  });

  it("toma d como la media de los dos cantos útiles, ec. (6.32)", () => {
    const r = calcular(256, { dYM: 0.16, dZM: 0.2 });
    expect(r.dM).toBeCloseTo(0.18, 9);
  });

  it("k se topa en 2 y sale de la ec. (6.47)", () => {
    // Con d = 180 mm la expresión da 2,054: el tope de la ec. (6.47) manda, y
    // eso pasa en toda losa de edificio, porque k llega a 2 ya con d = 200 mm.
    expect(calcular(256).critico.k).toBe(2);
    // Para ver la expresión sin topar hay que irse a un canto de cimentación.
    expect(calcular(256, { dYM: 0.5, dZM: 0.5 }).critico.k).toBeCloseTo(
      1 + Math.sqrt(200 / 500),
      9
    );
  });

  it("ρl es la media geométrica de las dos direcciones y se topa en 0,02", () => {
    const r = calcular(256);
    expect(r.critico.rhoL).toBeCloseTo(Math.sqrt(r.critico.rhoLY * r.critico.rhoLZ), 12);
    // Ø12/15 sobre d = 0,18: 754 mm²/m.
    expect(r.critico.rhoL).toBeCloseTo(((Math.PI * 144) / 4 / 0.15) / 0.18e6, 9);

    const saturada = calcularPunzonamiento(
      MATERIALES,
      GEOMETRIA_BASE,
      { diametroYMm: 25, separacionYM: 0.07, diametroZMm: 25, separacionZM: 0.07 },
      { vEdKN: 256, betaManual: null },
      ARMADURA_BASE
    );
    expect(saturada.critico.rhoL).toBe(0.02);
  });

  it("la cuantía se exige en un ancho de c + 3d a cada lado", () => {
    const r = calcular(256);
    expect(r.critico.anchoCuantiaC1M).toBeCloseTo(0.3 + 6 * 0.18, 9);
  });

  /**
   * La diferencia de norma más grande contra la planilla: el vmin del Anejo 19
   * es 0,035·k^1,5·√fck y el de la EHE-08 que usa el Excel es 0,05·k^1,5·√fck,
   * un 43 % más alto. Acá manda el Anejo 19.
   */
  it("vmin es el del Anejo 19, no el de la EHE-08 de la planilla", () => {
    const r = calcular(256);
    const k = r.critico.k;
    expect(r.critico.vMinMPa).toBeCloseTo(0.035 * k ** 1.5 * Math.sqrt(30), 9);
    expect(r.critico.vMinMPa).toBeLessThan(0.05 * k ** 1.5 * Math.sqrt(30));
  });

  it("con cuantía pobre gobierna vmin y lo avisa", () => {
    const pobre = calcularPunzonamiento(
      MATERIALES,
      GEOMETRIA_BASE,
      { diametroYMm: 6, separacionYM: 0.3, diametroZMm: 6, separacionZM: 0.3 },
      { vEdKN: 256, betaManual: null },
      ARMADURA_BASE
    );
    expect(pobre.critico.gobiernaVMin).toBe(true);
    expect(pobre.critico.vRdCMPa).toBeCloseTo(pobre.critico.vMinMPa, 12);
  });

  it("vEd es β·VEd/(u1·d) y crece con la carga", () => {
    const r = calcular(256);
    expect(r.critico.vEdMPa).toBeCloseTo(
      (1.15 * 256) / (r.critico.u1M * 0.18) / 1000,
      9
    );
    expect(calcular(512).critico.vEdMPa).toBeCloseTo(2 * r.critico.vEdMPa, 9);
  });
});

describe("β", () => {
  it("por defecto toma el recomendado de la figura A19.6.21 según la posición", () => {
    for (const posicion of ["interior", "borde", "esquina"] as PosicionPilar[]) {
      const r = calcular(200, { posicion });
      expect(r.beta).toBe(BETA_RECOMENDADO[posicion]);
      expect(r.betaEsRecomendado).toBe(true);
    }
    expect(BETA_RECOMENDADO).toEqual({ interior: 1.15, borde: 1.4, esquina: 1.5 });
  });

  it("el manual gana sobre el recomendado", () => {
    const r = calcular(200, { posicion: "borde" }, {}, 1.8);
    expect(r.beta).toBe(1.8);
    expect(r.betaEsRecomendado).toBe(false);
  });
});

describe("cara del pilar, ec. (6.53)", () => {
  it("u0 en pilar interior es el perímetro del pilar", () => {
    expect(calcular(256).caraPilar.u0M).toBeCloseTo(4 * 0.3, 9);
  });

  it("u0 en borde es c2 + 3d, topado en c2 + 2c1", () => {
    const r = calcular(256, { posicion: "borde", c1M: 0.5, c2M: 0.4 });
    expect(r.caraPilar.u0M).toBeCloseTo(0.4 + 3 * 0.18, 9);
    expect(r.caraPilar.u0TopeM).toBeCloseTo(0.4 + 2 * 0.5, 9);

    // El tope no es decorativo: con un pilar poco profundo contra el borde es
    // el que manda, porque la biela no tiene contra qué apoyarse hacia afuera.
    const topado = calcular(256, { posicion: "borde", c1M: 0.2, c2M: 0.4 });
    expect(topado.caraPilar.u0M).toBeCloseTo(0.4 + 2 * 0.2, 9);
  });

  it("u0 en esquina es 3d, topado en c1 + c2", () => {
    expect(calcular(256, { posicion: "esquina" }).caraPilar.u0M).toBeCloseTo(3 * 0.18, 9);
    const topado = calcular(256, { posicion: "esquina", c1M: 0.2, c2M: 0.2 });
    expect(topado.caraPilar.u0M).toBeCloseTo(0.4, 9);
  });

  /**
   * La segunda diferencia de norma con la planilla: el Excel comprueba la biela
   * contra 0,5·f1cd = 0,30·fcd (EHE-08) y el Anejo 19 pide 0,4·ν·fcd, que para
   * fck 30 es un 30 % menos.
   */
  it("vRd,max es 0,4·ν·fcd con ν de la ec. (6.6)", () => {
    const r = calcular(256);
    const nu = 0.6 * (1 - 30 / 250);
    expect(r.caraPilar.nu).toBeCloseTo(nu, 12);
    expect(r.caraPilar.vRdMaxMPa).toBeCloseTo(0.4 * nu * 20, 9);
    expect(r.caraPilar.vRdMaxMPa).toBeLessThan(0.3 * 20);
  });

  it("es el techo absoluto: una carga enorme lo rompe aunque haya armadura", () => {
    const r = calcular(4000);
    expect(r.caraPilar.verifica).toBe(false);
  });
});

describe("armadura de punzonamiento, ec. (6.52)", () => {
  it("no se dimensiona nada si el perímetro crítico verifica solo", () => {
    const r = calcular(120);
    expect(r.critico.verifica).toBe(true);
    expect(r.armadura).toBeNull();
    expect(r.detallado).toBeNull();
  });

  it("fywd,ef = 250 + 0,25d, topado en fyd", () => {
    const r = calcular(400);
    expect(r.armadura!.fywdEfMPa).toBeCloseTo(250 + 0.25 * 180, 9);
    // Muy por debajo de los 400 MPa planos que usa la planilla.
    expect(r.armadura!.fywdEfMPa).toBeLessThan(400);

    // El tope de fyd sólo aparece con acero de límite elástico bajo: con B500
    // el 250 + 0,25d no lo alcanza en ningún canto de losa.
    const aceroBlando = calcularPunzonamiento(
      { fckMPa: 30, fykMPa: 240 },
      GEOMETRIA_BASE,
      LONGITUDINAL_BASE,
      { vEdKN: 400, betaManual: null },
      ARMADURA_BASE
    );
    expect(aceroBlando.armadura!.fywdEfMPa).toBeCloseTo(240 / 1.15, 9);
  });

  it("el Asw necesario es el que hace vRd,cs = vEd", () => {
    const r = calcular(400);
    const conElNecesario = calcular(400, {}, {
      diametroMm: 8,
      ramasPorPerimetro: r.armadura!.aswNecesariaMm2 / ((Math.PI * 64) / 4),
    });
    expect(conElNecesario.armadura!.vRdCsMPa).toBeCloseTo(r.critico.vEdMPa, 6);
  });

  it("armar de más no sirve: el tope es 1,5·vRd,c", () => {
    const r = calcular(400, {}, { diametroMm: 25, ramasPorPerimetro: 40 });
    expect(r.armadura!.vRdCsMPa).toBeCloseTo(K_MAX_ARMADURA * r.critico.vRdCMPa, 9);
  });

  it("marca fuera de alcance cuando vEd supera 1,5·vRd,c", () => {
    const r = calcular(1200);
    expect(r.critico.vEdMPa).toBeGreaterThan(K_MAX_ARMADURA * r.critico.vRdCMPa);
    expect(r.armadura!.fueraDeAlcance).toBe(true);
    expect(r.armadura!.verifica).toBe(false);
  });

  it("uout,ef es el perímetro donde vEd cae justo a vRd,c", () => {
    const r = calcular(400);
    const vEnUOut = (r.beta * 400) / (r.armadura!.uOutEfM * r.dM) / 1000;
    expect(vEnUOut).toBeCloseTo(r.critico.vRdCMPa, 9);
    // Y queda por fuera del crítico, que es lo que justifica armar.
    expect(r.armadura!.uOutEfM).toBeGreaterThan(r.critico.u1M);
    expect(r.armadura!.distUOutM).toBeGreaterThan(2 * r.dM);
  });

  it("la distancia de uout es coherente con el perímetro que devuelve", () => {
    const r = calcular(400);
    const u = perimetroDeControl(r.planta.pilar, r.armadura!.distUOutM, false, false).longitudM;
    expect(u).toBeCloseTo(r.armadura!.uOutEfM, 6);
  });

  it("el último perímetro armado tiene que caer a 1,5d o menos por dentro de uout", () => {
    const r = calcular(400);
    expect(r.armadura!.distUltimoPerimetroExigidaM).toBeCloseTo(
      r.armadura!.distUOutM - 1.5 * r.dM,
      9
    );
    const corto = calcular(400, {}, { numeroPerimetros: 2 });
    const largo = calcular(400, {}, { numeroPerimetros: 8 });
    expect(corto.armadura!.distUltimoPerimetroRealM).toBeLessThan(
      largo.armadura!.distUltimoPerimetroRealM
    );
    expect(largo.armadura!.alcanzaUOut).toBe(true);
  });
});

describe("detalles de armado, art. 9.4.3", () => {
  it("exige dos perímetros como mínimo", () => {
    expect(calcular(400, {}, { numeroPerimetros: 1 }).detallado!.verificaNumeroPerimetros).toBe(false);
    expect(calcular(400, {}, { numeroPerimetros: 2 }).detallado!.verificaNumeroPerimetros).toBe(true);
  });

  it("sr ≤ 0,75d y st ≤ 1,5d", () => {
    const r = calcular(400);
    expect(r.detallado!.srMaxM).toBeCloseTo(0.75 * 0.18, 9);
    expect(r.detallado!.stMaxM).toBeCloseTo(1.5 * 0.18, 9);
    expect(r.detallado!.verificaSr).toBe(true);
    expect(calcular(400, {}, { srM: 0.2 }).detallado!.verificaSr).toBe(false);
    expect(calcular(400, {}, { stM: 0.4 }).detallado!.verificaSt).toBe(false);
  });

  it("el primer perímetro no se puede pasar de d/2 de la cara del pilar", () => {
    const r = calcular(400);
    expect(r.detallado!.distPrimerPerimetroMaxM).toBeCloseTo(0.09, 9);
    expect(r.detallado!.verificaPrimerPerimetro).toBe(true);
    expect(calcular(400, {}, { distPrimerPerimetroM: 0.12 }).detallado!.verificaPrimerPerimetro).toBe(false);
  });

  it("Asw,min de una rama sale de la ec. (9.11)", () => {
    const r = calcular(400);
    // Cercos verticales: 1,5·sen 90 + cos 90 = 1,5.
    expect(r.detallado!.aswMinRamaMm2).toBeCloseTo(
      ((0.08 * Math.sqrt(30)) / 500) * ((120 * 200) / 1.5),
      6
    );
    expect(r.detallado!.aswRamaMm2).toBeCloseTo((Math.PI * 64) / 4, 9);
  });
});

describe("posición del pilar y bordes libres", () => {
  it("el mismo pilar y la misma carga son más exigentes en borde que en interior", () => {
    const interior = calcular(300, { posicion: "interior" });
    const borde = calcular(300, { posicion: "borde" });
    const esquina = calcular(300, { posicion: "esquina" });
    expect(borde.critico.vEdMPa).toBeGreaterThan(interior.critico.vEdMPa);
    expect(esquina.critico.vEdMPa).toBeGreaterThan(borde.critico.vEdMPa);
  });

  it("un pilar de borde retirado más de 2d se comporta como interior y lo declara", () => {
    const rasante = calcular(300, { posicion: "borde", distBordeC1M: 0 });
    const retirado = calcular(300, { posicion: "borde", distBordeC1M: 0.5 });
    const interior = calcular(300, { posicion: "interior" });
    expect(rasante.perimetroCierraComoInterior).toBe(false);
    expect(retirado.perimetroCierraComoInterior).toBe(true);
    expect(retirado.critico.u1M).toBeCloseTo(interior.critico.u1M, 9);
    // El β y el u0 siguen siendo los de borde: los define la posición declarada,
    // no la geometría del perímetro.
    expect(retirado.beta).toBe(BETA_RECOMENDADO.borde);
  });

  it("en un pilar interior la distancia al borde cargada no afecta nada", () => {
    const sin = calcular(300, { posicion: "interior", distBordeC1M: 0 });
    const con = calcular(300, { posicion: "interior", distBordeC1M: 0.4, distBordeC2M: 0.4 });
    expect(con.critico.u1M).toBeCloseTo(sin.critico.u1M, 12);
  });
});

describe("monotonías de sanidad", () => {
  it("más canto útil siempre alivia", () => {
    const flaca = calcular(400, { dYM: 0.14, dZM: 0.14 });
    const gruesa = calcular(400, { dYM: 0.24, dZM: 0.24 });
    expect(gruesa.critico.aprovechamiento).toBeLessThan(flaca.critico.aprovechamiento);
    expect(gruesa.caraPilar.aprovechamiento).toBeLessThan(flaca.caraPilar.aprovechamiento);
  });

  it("más cuantía de negativos sube vRd,c, pero con rendimiento decreciente", () => {
    const poca = calcularPunzonamiento(
      MATERIALES, GEOMETRIA_BASE,
      { diametroYMm: 10, separacionYM: 0.2, diametroZMm: 10, separacionZM: 0.2 },
      { vEdKN: 400, betaManual: null }, ARMADURA_BASE
    );
    const mucha = calcularPunzonamiento(
      MATERIALES, GEOMETRIA_BASE,
      { diametroYMm: 16, separacionYM: 0.1, diametroZMm: 16, separacionZM: 0.1 },
      { vEdKN: 400, betaManual: null }, ARMADURA_BASE
    );
    expect(mucha.critico.vRdCMPa).toBeGreaterThan(poca.critico.vRdCMPa);
    // La raíz cúbica de la ec. (6.47): duplicar la cuantía no duplica vRd,c.
    expect(mucha.critico.vRdCMPa).toBeLessThan(2 * poca.critico.vRdCMPa);
  });

  it("un pilar más grande alivia las dos comprobaciones", () => {
    const chico = calcular(400, { c1M: 0.25, c2M: 0.25 });
    const grande = calcular(400, { c1M: 0.6, c2M: 0.6 });
    expect(grande.critico.aprovechamiento).toBeLessThan(chico.critico.aprovechamiento);
    expect(grande.caraPilar.aprovechamiento).toBeLessThan(chico.caraPilar.aprovechamiento);
  });
});

describe("geometría en planta para el croquis", () => {
  /**
   * El pilar se ubica una sola vez y todos los perímetros se construyen sobre
   * esa posición. Antes no era así —cada perímetro se colocaba según su propio
   * radio— y los perímetros de un mismo caso salían descentrados entre sí en el
   * dibujo, aunque los números estuvieran bien.
   */
  it("los perímetros de un mismo caso son concéntricos y van creciendo", () => {
    const r = calcular(400, { posicion: "borde", distBordeC1M: 0.05 });
    const { planta } = r;
    expect(planta.pilar.x1 - planta.pilar.x0).toBeCloseTo(0.3, 9);
    expect(planta.pilar.y0).toBeCloseTo(0.05, 9);

    const largos = [
      ...planta.armadura.map((p) => p.longitudM),
      planta.u1.longitudM,
      planta.uOut!.longitudM,
    ];
    // Los de armadura están todos dentro de u1 con la separación del caso base,
    // y uout queda por fuera porque es donde vEd cae a vRd,c.
    for (let i = 1; i < largos.length; i++) {
      expect(largos[i]).toBeGreaterThan(largos[i - 1]);
    }
  });

  it("declara qué bordes libres hay, que es lo que el dibujo tiene que trazar", () => {
    expect(calcular(400).planta).toMatchObject({ hayBordeX: false, hayBordeY: false });
    expect(calcular(400, { posicion: "borde" }).planta).toMatchObject({
      hayBordeX: false,
      hayBordeY: true,
    });
    expect(calcular(400, { posicion: "esquina" }).planta).toMatchObject({
      hayBordeX: true,
      hayBordeY: true,
    });
  });

  it("sin armadura que dimensionar la planta trae sólo el perímetro crítico", () => {
    const r = calcular(120);
    expect(r.planta.uOut).toBeNull();
    expect(r.planta.armadura).toEqual([]);
    expect(r.planta.u1.tramos.length).toBeGreaterThan(0);
  });
});
