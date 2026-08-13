import { describe, expect, it } from "vitest";
import {
  flexionEsviada,
  kcrit,
  longitudEficazM,
  tensionCritica,
  verificarFlexionSimple,
  verificarVuelco,
} from "./flexion";
import { propiedades, tensionFlexionMPa } from "./seccion";

describe("propiedades de la sección", () => {
  const s = { anchoM: 0.2, cantoM: 1.25 };

  it("inercias y módulos resistentes de la sección rectangular", () => {
    const p = propiedades(s);
    expect(p.iyM4).toBeCloseTo((0.2 * 1.25 ** 3) / 12, 12);
    expect(p.izM4).toBeCloseTo((1.25 * 0.2 ** 3) / 12, 12);
    expect(p.wyM3).toBeCloseTo((0.2 * 1.25 ** 2) / 6, 12);
  });

  it("el módulo de torsión no es el momento polar", () => {
    const p = propiedades(s);
    // Itor lleva la corrección de Saint-Venant y queda muy por debajo de Iy+Iz.
    expect(p.itorM4).toBeCloseTo(((1.25 * 0.2 ** 3) / 3) * (1 - (0.63 * 0.2) / 1.25), 12);
    expect(p.itorM4).toBeLessThan(p.iyM4 + p.izM4);
  });

  it("reproduce la tensión de flexión de la planilla", () => {
    // Hoja "Flexión simple", con inestabilidad: M = 400 kN·m sobre 0,20 × 1,25.
    const sigma = tensionFlexionMPa(400, propiedades(s).wyM3);
    expect(sigma).toBeCloseTo(7.68, 6);
  });
});

describe("flexión simple", () => {
  it("reproduce el caso de la planilla, MLE 0,196 × 0,98", () => {
    const r = verificarFlexionSimple(80, { anchoM: 0.196, cantoM: 0.98 }, 5.12);
    expect(r.sigmaMdMPa).toBeCloseTo(2.54996, 4);
    expect(r.aprovechamiento).toBeCloseTo(0.498039, 5);
    expect(r.verifica).toBe(true);
  });
});

describe("flexión esviada, ecs. (6.11) y (6.12)", () => {
  it("con momentos parecidos las dos expresiones coinciden", () => {
    const r = flexionEsviada(5, 5, 10, 10, 0.7);
    expect(r.aprovechamiento611).toBeCloseTo(r.aprovechamiento612, 12);
  });

  it("con una flexión dominante gobierna la que no la penaliza con km", () => {
    // σm,y grande: la ec. (6.11), que lleva σm,y a pelo, es la peor.
    const r = flexionEsviada(9, 1, 10, 10, 0.7);
    expect(r.aprovechamiento611).toBeGreaterThan(r.aprovechamiento612);
    expect(r.aprovechamiento).toBeCloseTo(0.9 + 0.7 * 0.1, 12);
  });

  it("reproduce la hoja de flexión esviada de la planilla", () => {
    /*
     * σm,x = 2,8512 y σm,y = 3,1012 MPa con fm,d igual en los dos ejes. La
     * planilla toma el máximo de las dos expresiones, igual que acá.
     */
    const fmd = 13.44;
    const r = flexionEsviada(2.8511851851851855, 3.1012345679012348, fmd, fmd, 0.7);
    expect(r.aprovechamiento).toBeCloseTo(
      Math.max(2.8511851851851855 / fmd + (0.7 * 3.1012345679012348) / fmd,
               (0.7 * 2.8511851851851855) / fmd + 3.1012345679012348 / fmd),
      12
    );
    expect(r.aprovechamiento612).toBeGreaterThan(r.aprovechamiento611);
  });

  it("km = 1 en secciones no rectangulares no perdona nada", () => {
    const rect = flexionEsviada(5, 5, 10, 10, 0.7);
    const otra = flexionEsviada(5, 5, 10, 10, 1);
    expect(otra.aprovechamiento).toBeGreaterThan(rect.aprovechamiento);
  });
});

describe("longitud eficaz de vuelco, tabla 6.1", () => {
  it("aplica la relación lef/l de cada caso", () => {
    expect(longitudEficazM(10, "apoyada-momento-constante", "centro-gravedad", 0.5)).toBeCloseTo(10, 9);
    expect(longitudEficazM(10, "apoyada-distribuida", "centro-gravedad", 0.5)).toBeCloseTo(9, 9);
    expect(longitudEficazM(10, "voladizo-distribuida", "centro-gravedad", 0.5)).toBeCloseTo(5, 9);
  });

  it("cargar el borde comprimido suma 2h y el traccionado descuenta 0,5h", () => {
    const comprimido = longitudEficazM(5.6, "apoyada-distribuida", "comprimido", 1.25);
    const traccionado = longitudEficazM(5.6, "apoyada-distribuida", "traccionado", 1.25);
    expect(comprimido).toBeCloseTo(0.9 * 5.6 + 2 * 1.25, 9);
    expect(traccionado).toBeCloseTo(0.9 * 5.6 - 0.5 * 1.25, 9);
    // El salto entre los dos es 2,5h: en una viga de canto es enorme.
    expect(comprimido - traccionado).toBeCloseTo(2.5 * 1.25, 9);
  });

  it("reproduce el lef de la planilla, 7,54 m", () => {
    expect(longitudEficazM(5.6, "apoyada-distribuida", "comprimido", 1.25)).toBeCloseTo(7.54, 9);
  });
});

describe("tensión crítica de vuelco", () => {
  const seccion = { anchoM: 0.2, cantoM: 1.25 };

  it("la ec. (6.32) reproduce el σcrit de la planilla", () => {
    const { simplificadaMPa } = tensionCritica(seccion, 7.54, 30, 6);
    expect(simplificadaMPa).toBeCloseTo(99.3103448, 5);
  });

  it("la ec. (6.32) es la general con G0,05 = E0,05/16", () => {
    /*
     * El 0,78 de la expresión simplificada no es empírico: sale de π/4 al meter
     * G = E/16 en la general. Con esa relación las dos coinciden salvo por la
     * corrección de Saint-Venant del módulo de torsión, que baja la general un
     * 5 %. Si el usuario carga un G0,05 lejos de E/16, las dos se separan, y esa
     * separación es la señal de que la simplificada no corresponde.
     */
    const e = 30;
    const { simplificadaMPa, generalMPa } = tensionCritica(seccion, 7.54, e, e / 16);
    expect(generalMPa / simplificadaMPa).toBeGreaterThan(0.9);
    expect(generalMPa / simplificadaMPa).toBeLessThan(1);
  });

  it("un G0,05 desproporcionado separa las dos expresiones", () => {
    // Los 6 GPa de la planilla contra los 1,875 que correspondería a E/16.
    const { simplificadaMPa, generalMPa } = tensionCritica(seccion, 7.54, 30, 6);
    expect(generalMPa).toBeGreaterThan(1.5 * simplificadaMPa);
  });

  it("alargar la viga baja la tensión crítica", () => {
    const corta = tensionCritica(seccion, 4, 30, 1.875).simplificadaMPa;
    const larga = tensionCritica(seccion, 12, 30, 1.875).simplificadaMPa;
    expect(larga).toBeLessThan(corta);
    expect(corta / larga).toBeCloseTo(3, 6);
  });
});

describe("kcrit, ec. (6.34)", () => {
  it("no reduce nada por debajo de 0,75", () => {
    expect(kcrit(0.4)).toBe(1);
    expect(kcrit(0.75)).toBe(1);
  });

  it("tramo lineal entre 0,75 y 1,4", () => {
    expect(kcrit(1)).toBeCloseTo(1.56 - 0.75, 9);
    expect(kcrit(1.4)).toBeCloseTo(1.56 - 0.75 * 1.4, 9);
  });

  it("tramo de Euler por encima de 1,4", () => {
    expect(kcrit(2)).toBeCloseTo(0.25, 9);
  });

  it("el empalme en 0,75 tiene un escalón, y es de la norma", () => {
    /*
     * En λrel,m = 0,75 la rama lineal arranca en 1,56 − 0,75·0,75 = 0,9975, no
     * en 1: hay un salto del 0,25 % que trae la propia ec. (6.34). Se deja tal
     * cual, sin redondear el 1,56 para cerrarlo, porque el número de la norma es
     * el que hay que poder citar. El escalón es despreciable y va del lado
     * seguro —la resistencia baja, no sube—, pero conviene tenerlo escrito para
     * no perseguirlo como si fuera un error de código.
     */
    expect(1.56 - 0.75 * 0.75).toBeCloseTo(0.9975, 6);
    expect(kcrit(0.75)).toBe(1);
    expect(kcrit(0.7501)).toBeLessThan(1);
    expect(1 - kcrit(0.7501)).toBeLessThan(0.003);
  });

  it("el empalme en 1,4 cierra casi exacto", () => {
    // 1,56 − 0,75·1,4 = 0,510 contra 1/1,4² = 0,5102: 0,04 % de diferencia.
    expect(1.56 - 0.75 * 1.4).toBeCloseTo(1 / 1.4 ** 2, 3);
    expect(kcrit(1.3999)).toBeCloseTo(kcrit(1.4001), 3);
  });

  it("decrece siempre", () => {
    let previo = kcrit(0.5);
    for (let l = 0.6; l <= 3; l += 0.1) {
      const actual = kcrit(l);
      expect(actual).toBeLessThanOrEqual(previo + 1e-12);
      previo = actual;
    }
  });
});

describe("verificación de vuelco, ec. (6.33)", () => {
  const base = {
    seccion: { anchoM: 0.2, cantoM: 1.25 },
    luzM: 5.6,
    caso: "apoyada-distribuida" as const,
    borde: "comprimido" as const,
    e005GPa: 30,
    g005GPa: 6,
    fmkMPa: 20,
    fmdMPa: 14.4,
    sigmaMdMPa: 7.68,
  };

  it("reproduce la hoja de la planilla", () => {
    const r = verificarVuelco(base);
    expect(r.longitudEficazM).toBeCloseTo(7.54, 9);
    expect(r.sigmaCritMPa).toBeCloseTo(99.3103448, 5);
    expect(r.lambdaRelM).toBeCloseTo(0.4487637, 6);
    expect(r.kcrit).toBe(1);
    expect(r.aprovechamiento).toBeCloseTo(0.5333333, 6);
    expect(r.verifica).toBe(true);
  });

  it("una viga esbelta de canto sí ve reducida la resistencia", () => {
    const esbelta = verificarVuelco({
      ...base,
      seccion: { anchoM: 0.1, cantoM: 1.0 },
      luzM: 12,
    });
    expect(esbelta.lambdaRelM).toBeGreaterThan(0.75);
    expect(esbelta.kcrit).toBeLessThan(1);
    expect(esbelta.sinReduccion).toBe(false);
  });

  it("arriostrar el borde comprimido anula la reducción, art. 6.3.3(5)", () => {
    const suelta = verificarVuelco({ ...base, seccion: { anchoM: 0.1, cantoM: 1 }, luzM: 12 });
    const atada = verificarVuelco({
      ...base,
      seccion: { anchoM: 0.1, cantoM: 1 },
      luzM: 12,
      arriostrado: true,
    });
    expect(atada.kcrit).toBe(1);
    expect(atada.aprovechamiento).toBeLessThan(suelta.aprovechamiento);
  });

  it("cargar en el borde comprimido empeora la verificación", () => {
    const comprimido = verificarVuelco({ ...base, seccion: { anchoM: 0.1, cantoM: 1 }, luzM: 12 });
    const traccionado = verificarVuelco({
      ...base,
      seccion: { anchoM: 0.1, cantoM: 1 },
      luzM: 12,
      borde: "traccionado",
    });
    expect(comprimido.aprovechamiento).toBeGreaterThan(traccionado.aprovechamiento);
  });
});
