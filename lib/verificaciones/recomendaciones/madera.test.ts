import { describe, expect, it } from "vitest";
import { NOMBRE_CASO_VUELCO } from "@/lib/calc/madera/flexion";
import { NOMBRE_DURACION } from "@/lib/calc/madera/materiales";
import { NOMBRE_CLAVIJA, NOMBRE_ESPECIE_UNION } from "@/lib/calc/madera/uniones";
import { APOYOS, ESPECIES, REPARTO } from "@/lib/calc/madera/resolver-madera-axil";
import { ARRIOSTRADO, BORDES } from "@/lib/calc/madera/resolver-madera-flexion";
import { ELEMENTOS, EXIGENCIA } from "@/lib/calc/madera/resolver-madera-deformaciones";
import { CONFIGURACIONES } from "@/lib/calc/madera/resolver-madera-uniones";
import {
  recomendarMaderaAxil,
  recomendarMaderaDeformaciones,
  recomendarMaderaFlexion,
  recomendarMaderaUniones,
} from "./madera";

const MATERIAL = { tipo: "Madera maciza", servicio: "Clase 2", duracion: NOMBRE_DURACION.media };

describe("recomendaciones de madera", () => {
  it("compresión con pandeo excedida: cada propuesta cumple", () => {
    const r = recomendarMaderaAxil({
      ...MATERIAL, especie: ESPECIES[0], reparto: REPARTO[0], ancho: "0.1", canto: "0.2",
      ft0k: "14", fc0k: "21", fc90k: "2.5", e005: "7.4", traccion: "0", compresion: "120",
      lky: "3", lkz: "3", cargaApoyo: "20", anchoApoyo: "0.1", largoApoyo: "0.12", vuelo: "0.05", vecina: "1.2", apoyo: APOYOS[1],
    }).compresion ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("flexión excedida: más canto primero", () => {
    const r = recomendarMaderaFlexion({
      ...MATERIAL, reparto: REPARTO[0], ancho: "0.1", canto: "0.2", luz: "4", fmk: "24", e005: "7.4", g005: "0.46",
      my: "15", mz: "0", caso: NOMBRE_CASO_VUELCO["apoyada-distribuida"], borde: BORDES[0], arriostrado: ARRIOSTRADO[1],
    }).flexion ?? [];
    expect(r[0].accion).toMatch(/^h = /);
  });

  it("flecha excedida: claves por rótulo de cada flecha", () => {
    const r = recomendarMaderaDeformaciones({
      ...MATERIAL, ancho: "0.07", canto: "0.14", luz: "5.5", emean: "9.5", gmean: "0.594", qg: "0.2", qq: "0.1",
      pg: "0", pq: "0", psi2: "0.3", contraflecha: "0", elemento: ELEMENTOS[0], exigencia: EXIGENCIA[0],
    });
    const todas = Object.values(r).flat();
    expect(todas.length).toBeGreaterThan(0);
    for (const p of todas) expect(p!.utilizacion).toBeLessThanOrEqual(1);
  });

  it("unión excedida: más medios de unión primero", () => {
    const r = recomendarMaderaUniones({
      config: CONFIGURACIONES[1], clavija: NOMBRE_CLAVIJA.perno, especie: NOMBRE_ESPECIE_UNION.conifera,
      servicio: "Clase 2", duracion: NOMBRE_DURACION.media, d: "10", fuk: "400", t1: "38", t2: "65",
      rho1: "320", rho2: "320", angulo: "0", espesorChapa: "6", fax: "0", nMedios: "4", separacion: "70", planos: "2", fed: "25",
    }).union ?? [];
    expect(r[0].accion).toMatch(/^Medios de unión: /);
  });
});
