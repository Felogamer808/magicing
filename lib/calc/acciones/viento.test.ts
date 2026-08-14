import { describe, expect, it } from "vitest";
import { calcularCoeficientesPresion, calcularViento, coeficienteAltura } from "@/lib/calc/acciones/viento";

// Caso real de la hoja "VIENTO": edificio 26.7 x 22.9 x 53.1 m, zona costera,
// topografía normal, terreno tipo II, Kd=1, período de retorno 20 años, γ=1.

const datos = {
  alturaM: 53.1,
  aM: 26.7,
  bM: 22.9,
  velocidad: "Costero" as const,
  topografia: "Normal" as const,
  terreno: "II" as const,
  kd: 1,
  periodoRetornoAnios: 20,
  gamma: 1,
};

const niveles = [
  { nombre: "N1", zM: 3.19 },
  { nombre: "N2", zM: 6.23 },
  { nombre: "N3", zM: 8.97 },
];

describe("viento: coeficiente de altura", () => {
  it("reproduce kz en la coronación y en el primer nivel (terreno II)", () => {
    expect(coeficienteAltura("II", 53.1)).toBeCloseTo(1.11816217564031, 9);
    expect(coeficienteAltura("II", 3.19)).toBeCloseTo(0.775774139458275, 9);
  });

  it("aplica la ley de cada tipo de terreno", () => {
    expect(coeficienteAltura("I", 10)).toBeCloseTo(1, 9);
    expect(coeficienteAltura("II", 10)).toBeCloseTo(0.9, 9);
    expect(coeficienteAltura("III", 10)).toBeCloseTo(0.75, 9);
    expect(coeficienteAltura("IV", 10)).toBeCloseTo(0.6, 9);
  });
});

describe("viento: coeficientes de presión", () => {
  const c = calcularCoeficientesPresion(1);

  it("reproduce los coeficientes exteriores e interiores", () => {
    expect(c.ceBarlovento).toBeCloseTo(0.8, 9);
    expect(c.ceSotavento).toBeCloseTo(-0.5, 9);
    expect(c.ceOtrasCaras).toBeCloseTo(-0.5, 9);
    expect(c.ciSuccion).toBeCloseTo(-0.3, 9);
    expect(c.ciPresion).toBeCloseTo(0.3, 9);
  });

  it("reproduce el coeficiente total de arrastre", () => {
    expect(c.cTotal).toBeCloseTo(1.4, 9);
  });

  it("aplica el tope de succión interior que la planilla no llegaba a aplicar", () => {
    // Con γ pequeño la base queda por debajo de 0,2 y el tope entra en juego.
    const cChico = calcularCoeficientesPresion(0.7);
    expect(cChico.ciSuccion).toBeCloseTo(-0.2, 9);
    expect(cChico.ciPresion).toBeCloseTo(0.15, 9);
  });
});

describe("viento: presiones por nivel", () => {
  const r = calcularViento(datos, niveles);

  it("reproduce los factores generales", () => {
    expect(r.vkMs).toBeCloseTo(43.9, 9);
    expect(r.kt).toBeCloseTo(1, 9);
    expect(r.kk).toBeCloseTo(1, 9);
    expect(r.kzCoronacion).toBeCloseTo(1.11816217564031, 9);
  });

  it("reproduce las relaciones de dimensiones", () => {
    expect(r.lambdaA).toBeCloseTo(1.98876404494382, 9);
    expect(r.lambdaB).toBeCloseTo(2.31877729257642, 9);
    expect(r.relacionAB).toBeCloseTo(1.16593886462882, 9);
  });

  it("encadena velocidad, presión dinámica y presión de viento en el primer nivel", () => {
    const n1 = r.niveles[0];
    const vcEsperada = 43.9 * 0.775774139458275;
    expect(n1.vcMs).toBeCloseTo(vcEsperada, 9);
    expect(n1.qKgM2).toBeCloseTo(vcEsperada ** 2 / 16.3, 9);
    expect(n1.pcKNm2).toBeCloseTo(((vcEsperada ** 2 / 16.3) * 1.4) / 100, 9);
  });

  it("reparte las alturas de influencia como media distancia a cada vecino", () => {
    expect(r.niveles[0].hInflM).toBeCloseTo((6.23 - 3.19) / 2, 9);
    expect(r.niveles[1].hInflM).toBeCloseTo((6.23 - 3.19) / 2 + (8.97 - 6.23) / 2, 9);
    expect(r.niveles[2].hInflM).toBeCloseTo((8.97 - 6.23) / 2, 9);
  });

  it("la presión crece con la altura", () => {
    expect(r.niveles[1].pcKNm2).toBeGreaterThan(r.niveles[0].pcKNm2);
    expect(r.niveles[2].pcKNm2).toBeGreaterThan(r.niveles[1].pcKNm2);
  });

  it("el período de retorno de 50 años aumenta la velocidad un 15%", () => {
    const r50 = calcularViento({ ...datos, periodoRetornoAnios: 50 }, niveles);
    expect(r50.kk).toBeCloseTo(1.15, 9);
    expect(r50.niveles[0].vcMs).toBeCloseTo(r.niveles[0].vcMs * 1.15, 9);
  });
});
