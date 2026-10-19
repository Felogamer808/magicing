import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf, leerDxfPorPartes, limpiarTexto } from "@/lib/dxf/leer";

/**
 * `prueba.dxf`: dos CT9 unidos por una VR4 y un CT2 suelto dibujado de 760
 * aunque su rótulo dice 800, con las trampas de una planta
 * real: declara metros y está en mm, trae un bloque que no se usa, un HATCH,
 * un círculo en espacio papel y textos con formato de MTEXT.
 */
const texto = readFileSync(path.join(__dirname, "prueba.dxf"), "utf8");

describe("leerDxf", () => {
  const l = leerDxf(texto);

  it("lee sólo el espacio modelo: ni los bloques ni las láminas", () => {
    expect(l.entidades.filter((e) => e.tipo === "circulo")).toHaveLength(5);
    expect(l.entidades.filter((e) => e.tipo === "polilinea")).toHaveLength(3);
    expect(l.ignoradas).toEqual({ HATCH: 1 });
  });

  it("dice qué unidad declara el archivo, sin creerle", () => {
    expect(l.unidadDeclarada).toBe("metros");
  });

  it("lee las polilíneas cerradas con sus vértices en orden", () => {
    const contorno = l.entidades.find((e) => e.tipo === "polilinea" && e.capa === "FUNDACIONES");
    expect(contorno).toMatchObject({ cerrada: true, conArcos: false });
    expect(contorno?.tipo === "polilinea" && contorno.puntos[0]).toEqual([-900, -400]);
  });

  it("limpia el formato de los textos", () => {
    const textos = l.entidades.flatMap((e) => (e.tipo === "texto" ? [e.texto] : []));
    expect(textos).toContain("CT9 (1800x800x750)\nN.S.C.:");
    expect(textos).toContain("VR4\n350x600");
    expect(textos).toContain("LÍMITE DEL PREDIO");
  });

  /** El navegador lo lee por partes; cortar a mitad de un renglón no puede cambiar nada. */
  it("leído por partes da lo mismo que entero", async () => {
    const bytes = new TextEncoder().encode(texto);
    async function* partes() {
      for (let i = 0; i < bytes.length; i += 37) yield bytes.slice(i, i + 37);
    }
    expect(await leerDxfPorPartes(partes())).toEqual(l);
  });
});

describe("limpiarTexto", () => {
  it("saca alturas, fuentes y llaves, y convierte saltos y diámetros", () => {
    expect(limpiarTexto("{\\fArial|b0;\\H0.5x;P01}")).toBe("P01");
    expect(limpiarTexto("%%c500")).toBe("Ø500");
    expect(limpiarTexto("A\\PB")).toBe("A\nB");
  });
});
