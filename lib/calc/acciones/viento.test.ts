import { describe, expect, it } from "vitest";
import {
  calcularCasoApertura,
  calcularFactorFormaGamma0,
  calcularViento,
  coeficienteAltura,
  coeficienteSeguridad,
  coeficientesExterioresLado,
  coeficientesInterioresPorCaso,
  generarNiveles,
} from "@/lib/calc/acciones/viento";

// Caso real de la hoja "VIENTO2025": edificio 77 x 35 x 14 m, γ0,a=0,94 (lado
// A, según el lado largo) y γ0,b=0,85 (lado B). Los valores esperados son los
// que produce esa hoja (Excel), comparados celda a celda hasta el último
// decimal disponible; sirven para garantizar paridad numérica con la norma.

describe("viento: coeficiente de altura (Tabla 6.2)", () => {
  it("aplica la ley de cada tipo de terreno", () => {
    expect(coeficienteAltura("I", 10)).toBeCloseTo(1, 9);
    expect(coeficienteAltura("II", 10)).toBeCloseTo(0.9, 9);
    expect(coeficienteAltura("III", 10)).toBeCloseTo(0.75, 9);
    expect(coeficienteAltura("IV", 10)).toBeCloseTo(0.6, 9);
  });

  it("reproduce kz en un nivel intermedio (terreno III, z=7 m)", () => {
    // Planilla: L44 = 0,75*((7/10)^0,17)
    expect(coeficienteAltura("III", 7)).toBeCloseTo(0.705875210398619, 9);
  });
});

describe("viento: coeficiente de seguridad Kk (Tabla 6.3)", () => {
  it("por estados límite depende del grupo", () => {
    expect(coeficienteSeguridad("estados-limite", "A")).toBeCloseTo(1.28, 9);
    expect(coeficienteSeguridad("estados-limite", "B")).toBeCloseTo(1.15, 9);
    expect(coeficienteSeguridad("estados-limite", "E2")).toBeCloseTo(0.8, 9);
  });

  it("por tensiones admisibles es siempre 1 (7.3.1)", () => {
    expect(coeficienteSeguridad("tensiones-admisibles", "A")).toBeCloseTo(1, 9);
    expect(coeficienteSeguridad("tensiones-admisibles", "E2")).toBeCloseTo(1, 9);
  });
});

describe("viento: factor de forma γ0 (fig. 8.2, ramas simples)", () => {
  it("reproduce el caso real de la planilla VIENTO2025 (77×35×14 m)", () => {
    const lambdaA = 14 / 77; // 0,1818...
    const lambdaB = 14 / 35; // 0,4
    const r = calcularFactorFormaGamma0(lambdaA, lambdaB);
    expect(r.ladoA).toBeCloseTo(0.94, 6);
    expect(r.ladoB).toBeCloseTo(0.85, 6);
  });

  it("reproduce el ejemplo 4 de la norma (13.13.2): λa=0,1875, λb=0,5", () => {
    const r = calcularFactorFormaGamma0(0.1875, 0.5);
    expect(r.ladoA).toBeCloseTo(1, 6); // "ACCION DE VIENTO PERPENDICULAR AL LADO MAYOR Sa": γ0=1
    expect(r.ladoB).toBeCloseTo(0.85, 6); // "... AL LADO MENOR Sb": γ0=0,85
  });

  it("interpola linealmente entre los quiebres del ábaco", () => {
    // Rama λa<0,5: quiebres en λb=0,25 (γ0=0,85) y λb=0,5 (γ0=1,00).
    expect(calcularFactorFormaGamma0(0.1, 0.375).ladoA).toBeCloseTo(0.925, 9);
    // Rama λb<1: quiebres en λa=0,2 (γ0=0,85) y λa=0,3 (γ0=1,00).
    expect(calcularFactorFormaGamma0(0.25, 0.1).ladoB).toBeCloseTo(0.925, 9);
  });

  it("devuelve null cuando λ sale del rango digitalizado: hay que leer la fig. 8.2", () => {
    // λa≥0,5 y λb≥1 son los ábacos densos (edificios altos), no digitalizados.
    expect(calcularFactorFormaGamma0(0.6, 0.3).ladoA).toBeNull();
    expect(calcularFactorFormaGamma0(0.1, 1.2).ladoB).toBeNull();
  });
});

describe("viento: coeficientes exteriores (Tabla 8.1)", () => {
  it("reproduce Ce de barlovento y sotavento para γ0,a=0,94", () => {
    const ce = coeficientesExterioresLado(0.94, -0.4);
    expect(ce.barlovento).toBeCloseTo(0.8, 9);
    expect(ce.sotavento).toBeCloseTo(-0.42199999999999993, 12);
    expect(ce.lateralYTecho).toBeCloseTo(-0.4, 9);
  });

  it("reproduce Ce de sotavento para γ0,b=0,85", () => {
    const ce = coeficientesExterioresLado(0.85, -0.3);
    expect(ce.sotavento).toBeCloseTo(-0.30499999999999994, 12);
  });
});

describe("viento: coeficientes interiores por caso (Tabla 8.2)", () => {
  it("cerrada: reproduce sobrepresión y succión para γ0,a=0,94", () => {
    const ci = coeficientesInterioresPorCaso("cerrada", 0.94);
    expect(ci.general).toHaveLength(2);
    expect(ci.general[0]).toBeCloseTo(0.34680000000000005, 12); // Z109
    expect(ci.general[1]).toBeCloseTo(-0.2531999999999999, 12); // AA109
  });

  it("cerrada: aplica el tope -0,2 cuando la succión cruda queda floja (γ0,b=0,85)", () => {
    const ci = coeficientesInterioresPorCaso("cerrada", 0.85);
    expect(ci.general[0]).toBeCloseTo(0.41700000000000004, 12); // Z110
    // Cruda: -0,6*(1,3*0,85-0,8) = -0,183, entre -0,2 y 0 → se topa en -0,2.
    expect(ci.general[1]).toBeCloseTo(-0.2, 9); // AA110
  });

  it("dos-opuestas-direccion-viento: misma fórmula que cerrada", () => {
    const cerrada = coeficientesInterioresPorCaso("cerrada", 0.94);
    const dosDir = coeficientesInterioresPorCaso("dos-opuestas-direccion-viento", 0.94);
    expect(dosDir.general).toEqual(cerrada.general);
  });

  it("dos-opuestas-paralelas-viento: sobrepresión igual, succión con la fórmula sin el 0,6", () => {
    const ci = coeficientesInterioresPorCaso("dos-opuestas-paralelas-viento", 0.94);
    expect(ci.general[0]).toBeCloseTo(0.34680000000000005, 12); // AG146
    expect(ci.general[1]).toBeCloseTo(-0.42199999999999993, 12); // AK146 = -(1,3γ-0,8)
  });

  it("una pared abierta a barlovento: Ci=+0,8 fijo y la pared abierta con su propio valor", () => {
    const ci = coeficientesInterioresPorCaso("una-abierta-barlovento", 0.94);
    expect(ci.general).toEqual([0.8]);
    expect(ci.paredAbierta).toBeCloseTo(-0.2531999999999999, 12); // AD126
  });

  it("una pared abierta a sotavento: valores cruzados respecto al caso de barlovento", () => {
    const ci = coeficientesInterioresPorCaso("una-abierta-sotavento", 0.94);
    expect(ci.general[0]).toBeCloseTo(-0.42199999999999993, 12); // AA127
    expect(ci.paredAbierta).toBeCloseTo(0.34680000000000005, 12); // AB127
  });
});

describe("viento: combinación ce-ci por cara y coeficiente total (8.4)", () => {
  it("cerrada, lado A (γ=0,94): reproduce los candidatos de cTotal de la planilla", () => {
    const r = calcularCasoApertura("cerrada", 0.94, -0.4);

    const lateral = r.caras.find((c) => c.cara === "lateralYTecho")!;
    expect(lateral.candidatos[0]).toBeCloseTo(-0.7468000000000001, 9); // AM9
    expect(lateral.candidatos[1]).toBeCloseTo(-0.3, 9); // AR9, topado

    // AM11 y AR11 de la planilla.
    expect(r.cTotalCandidatos[0]).toBeCloseTo(1.222, 9);
    expect(r.cTotalCandidatos[1]).toBeCloseTo(1.3532, 9);
    expect(r.cTotalGobernante).toBeCloseTo(1.3532, 9);
  });

  it("cerrada, lado B (γ=0,85): reproduce los candidatos de cTotal de la planilla", () => {
    const r = calcularCasoApertura("cerrada", 0.85, -0.3);

    const lateral = r.caras.find((c) => c.cara === "lateralYTecho")!;
    expect(lateral.candidatos[0]).toBeCloseTo(-0.7170000000000001, 9); // AK41
    expect(lateral.candidatos[1]).toBeCloseTo(-0.3, 9); // AP41, topado

    // AM41 y AR41 de la planilla.
    expect(r.cTotalCandidatos[0]).toBeCloseTo(1.105, 9);
    expect(r.cTotalCandidatos[1]).toBeCloseTo(1.3, 9);
  });

  it("una pared abierta a barlovento, lado A: la cara lateral coincide con la planilla", () => {
    const r = calcularCasoApertura("una-abierta-barlovento", 0.94, -0.4);
    const lateral = r.caras.find((c) => c.cara === "lateralYTecho")!;
    expect(lateral.candidatos[0]).toBeCloseTo(-1.2000000000000002, 9); // AM18
  });

  it("el gobernante de cada cara es el candidato de mayor magnitud", () => {
    const r = calcularCasoApertura("cerrada", 0.94, -0.4);
    const sotavento = r.caras.find((c) => c.cara === "sotavento")!;
    expect(Math.abs(sotavento.gobernante)).toBeGreaterThanOrEqual(Math.abs(sotavento.candidatos[0]));
    expect(Math.abs(sotavento.gobernante)).toBeGreaterThanOrEqual(Math.abs(sotavento.candidatos[1]));
  });
});

describe("viento: velocidad y presión dinámica por nivel", () => {
  const datos = {
    alturaM: 14,
    aM: 77,
    bM: 35,
    velocidad: "Costero" as const,
    topografia: "Normal" as const,
    terreno: "III" as const,
    metodo: "estados-limite" as const,
    grupo: "B" as const,
    ladoA: { gamma: 0.94, ceLateralYTecho: -0.4, kd: 0.8446601941747572 },
    ladoB: { gamma: 0.85, ceLateralYTecho: -0.3, kd: 0.8640776699029126 },
  };
  const niveles = [
    { nombre: "PB", zM: 3.5 },
    { nombre: "P1", zM: 7 },
    { nombre: "P2", zM: 10.5 },
    { nombre: "P3", zM: 14 },
  ];

  it("reproduce vk, kt y kk", () => {
    const r = calcularViento(datos, niveles);
    expect(r.vkMs).toBeCloseTo(43.9, 9);
    expect(r.kt).toBeCloseTo(1, 9);
    expect(r.kk).toBeCloseTo(1.15, 9); // Grupo B, estados límite (Tabla 6.3)
  });

  it("reproduce λa, λb y a/b", () => {
    const r = calcularViento(datos, niveles);
    expect(r.lambdaA).toBeCloseTo(14 / 77, 9);
    expect(r.lambdaB).toBeCloseTo(14 / 35, 9);
    expect(r.relacionAB).toBeCloseTo(77 / 35, 9);
  });

  it("reproduce vc en P3 (coronación) para el lado A: L21 de la planilla", () => {
    const r = calcularViento(datos, niveles);
    const p3 = r.ladoA.niveles.find((n) => n.nombre === "P3")!;
    expect(p3.vcMs).toBeCloseTo(33.86471445112395, 6);
  });

  it("reproduce vc en P3 para el lado B: L17 de la planilla", () => {
    const r = calcularViento(datos, niveles);
    const p3 = r.ladoB.niveles.find((n) => n.nombre === "P3")!;
    expect(p3.vcMs).toBeCloseTo(34.64321363390841, 6);
  });

  it("cada lado usa su propio kd, y por eso da una vc distinta al mismo nivel", () => {
    const r = calcularViento(datos, niveles);
    const p3A = r.ladoA.niveles.find((n) => n.nombre === "P3")!;
    const p3B = r.ladoB.niveles.find((n) => n.nombre === "P3")!;
    expect(p3A.vcMs).not.toBeCloseTo(p3B.vcMs, 3);
  });

  it("reparte las alturas de influencia como media distancia a cada vecino", () => {
    const r = calcularViento(datos, niveles);
    const [n0, n1, n2, n3] = r.ladoA.niveles;
    expect(n0.hInflM).toBeCloseTo((7 - 3.5) / 2, 9);
    expect(n1.hInflM).toBeCloseTo((7 - 3.5) / 2 + (10.5 - 7) / 2, 9);
    expect(n2.hInflM).toBeCloseTo((10.5 - 7) / 2 + (14 - 10.5) / 2, 9);
    expect(n3.hInflM).toBeCloseTo((14 - 10.5) / 2, 9);
  });
});

describe("viento: generarNiveles", () => {
  it("genera niveles equiespaciados entre la cota inicial y la coronación", () => {
    const niveles = generarNiveles(0, 10, 3);
    expect(niveles.map((n) => n.zM)).toEqual([0, 5, 10]);
  });

  it("con menos de 2 niveles devuelve sólo la coronación", () => {
    expect(generarNiveles(0, 10, 1)).toEqual([{ nombre: "N1", zM: 10 }]);
  });
});
