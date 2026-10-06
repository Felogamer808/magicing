import { describe, expect, it } from "vitest";
import {
  actualizarElemento,
  actualizarProyecto,
  agregarElemento,
  armarArchivo,
  contarCalculos,
  convertirRetirados,
  crearCalculo,
  crearElemento,
  crearProyecto,
  eliminarCalculo,
  eliminarElemento,
  guardarCalculoEnElemento,
  leerArchivo,
  nombreDeArchivo,
} from "./modelo";
import { MATERIALES_POR_DEFECTO, VERSION_FORMATO } from "./tipos";

/** Proyecto con una viga y su cálculo de flexión, que es el caso de uso base. */
function proyectoConViga() {
  let p = crearProyecto("Edificio Los Cedros");
  const viga = crearElemento("V-203", "Nivel 4");
  p = agregarElemento(p, viga);
  p = guardarCalculoEnElemento(
    p,
    viga.id,
    crearCalculo("vigas-flexion-cortante", { fck: "30", b: "0,20" })
  );
  return { p, idViga: viga.id };
}

describe("crear", () => {
  it("un proyecto nuevo arranca vacío y con los materiales por defecto", () => {
    const p = crearProyecto("Edificio Los Cedros");
    expect(p.nombre).toBe("Edificio Los Cedros");
    expect(p.elementos).toEqual([]);
    expect(p.materiales).toEqual(MATERIALES_POR_DEFECTO);
    expect(p.id).toBeTruthy();
  });

  it("los ids son distintos entre sí", () => {
    const ids = new Set(Array.from({ length: 50 }, () => crearProyecto("x").id));
    expect(ids.size).toBe(50);
  });

  it("un nombre en blanco no deja el proyecto sin rótulo", () => {
    expect(crearProyecto("   ").nombre).toBe("Proyecto sin nombre");
    expect(crearElemento("  ").nombre).toBe("Elemento sin nombre");
  });

  it("la ubicación vacía no se guarda como cadena vacía", () => {
    expect(crearElemento("V-203", "   ").ubicacion).toBeUndefined();
    expect(crearElemento("V-203", "Nivel 4").ubicacion).toBe("Nivel 4");
  });
});

describe("elementos", () => {
  it("renombrar un elemento no le toca los cálculos", () => {
    const { p, idViga } = proyectoConViga();
    const renombrado = actualizarElemento(p, idViga, { nombre: "V-203A" });
    const viga = renombrado.elementos.find((e) => e.id === idViga)!;
    expect(viga.nombre).toBe("V-203A");
    expect(viga.calculos).toHaveLength(1);
    expect(viga.calculos[0].campos).toEqual({ fck: "30", b: "0,20" });
  });

  it("eliminar un elemento no toca a los demás", () => {
    const base = proyectoConViga();
    const idViga = base.idViga;
    let p = base.p;
    const otra = crearElemento("V-204");
    p = agregarElemento(p, otra);
    const sinViga = eliminarElemento(p, idViga);
    expect(sinViga.elementos.map((e) => e.nombre)).toEqual(["V-204"]);
  });

  it("no muta el proyecto que recibe", () => {
    const { p, idViga } = proyectoConViga();
    const antes = JSON.stringify(p);
    actualizarElemento(p, idViga, { nombre: "otra cosa" });
    eliminarElemento(p, idViga);
    expect(JSON.stringify(p)).toBe(antes);
  });
});

describe("guardar un cálculo", () => {
  /**
   * El comportamiento que define la función: volver a la misma viga, cambiarle
   * la armadura y guardar otra vez tiene que pisar, no acumular. Si acumulara,
   * la viga terminaría con cuatro "flexión y cortante" y ninguna forma de saber
   * cuál es la buena.
   */
  it("volver a guardar la misma verificación reemplaza en vez de acumular", () => {
    const { p, idViga } = proyectoConViga();
    const actualizado = guardarCalculoEnElemento(
      p,
      idViga,
      crearCalculo("vigas-flexion-cortante", { fck: "35", b: "0,25" })
    );
    const viga = actualizado.elementos.find((e) => e.id === idViga)!;
    expect(viga.calculos).toHaveLength(1);
    expect(viga.calculos[0].campos).toEqual({ fck: "35", b: "0,25" });
  });

  it("al reemplazar conserva el id y la fecha de creación originales", () => {
    const { p, idViga } = proyectoConViga();
    const original = p.elementos[0].calculos[0];
    const actualizado = guardarCalculoEnElemento(
      p,
      idViga,
      crearCalculo("vigas-flexion-cortante", { fck: "35" })
    );
    const guardado = actualizado.elementos[0].calculos[0];
    expect(guardado.id).toBe(original.id);
    expect(guardado.creado).toBe(original.creado);
  });

  it("una verificación distinta del mismo elemento se suma, no pisa", () => {
    const { p, idViga } = proyectoConViga();
    const conFisuracion = guardarCalculoEnElemento(
      p,
      idViga,
      crearCalculo("fisuracion", { w: "0,3" })
    );
    const viga = conFisuracion.elementos[0];
    expect(viga.calculos.map((c) => c.verificacion).sort()).toEqual([
      "fisuracion",
      "vigas-flexion-cortante",
    ]);
  });

  it("los campos se copian: cambiar el objeto de origen no toca lo guardado", () => {
    const campos = { fck: "30" };
    const calculo = crearCalculo("losas", campos);
    campos.fck = "40";
    expect(calculo.campos.fck).toBe("30");
  });

  it("eliminar un cálculo deja el elemento en pie", () => {
    const { p, idViga } = proyectoConViga();
    const idCalculo = p.elementos[0].calculos[0].id;
    const sinCalculo = eliminarCalculo(p, idViga, idCalculo);
    expect(sinCalculo.elementos).toHaveLength(1);
    expect(sinCalculo.elementos[0].calculos).toEqual([]);
  });

  it("cuenta los cálculos de todos los elementos", () => {
    const base = proyectoConViga();
    const idViga = base.idViga;
    let p = base.p;
    p = guardarCalculoEnElemento(p, idViga, crearCalculo("fisuracion", {}));
    const losa = crearElemento("L-102");
    p = agregarElemento(p, losa);
    p = guardarCalculoEnElemento(p, losa.id, crearCalculo("losas", {}));
    expect(contarCalculos(p)).toBe(3);
  });
});

describe("materiales del proyecto", () => {
  it("se cambian en un solo lugar", () => {
    const { p } = proyectoConViga();
    const conH35 = actualizarProyecto(p, {
      materiales: { ...p.materiales, fckMPa: 35 },
    });
    expect(conH35.materiales.fckMPa).toBe(35);
    expect(conH35.materiales.fykMPa).toBe(MATERIALES_POR_DEFECTO.fykMPa);
  });
});

describe("archivo de proyecto", () => {
  it("lo exportado se vuelve a leer igual", () => {
    const { p } = proyectoConViga();
    const texto = JSON.stringify(armarArchivo([p]));
    const leido = leerArchivo(texto);
    expect(leido.ok).toBe(true);
    expect(leido.proyectos).toHaveLength(1);
    expect(leido.proyectos[0]).toEqual(p);
  });

  it("el archivo declara formato y versión", () => {
    const archivo = armarArchivo([]);
    expect(archivo.formato).toBe("magicing-proyectos");
    expect(archivo.version).toBe(VERSION_FORMATO);
  });

  it("rechaza lo que no es JSON", () => {
    const r = leerArchivo("esto no es json {");
    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain("JSON");
  });

  it("rechaza un JSON que no sea una exportación de MagicIng", () => {
    const r = leerArchivo(JSON.stringify({ hola: "mundo" }));
    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain("MagicIng");
  });

  /**
   * El caso que justifica validar en vez de confiar: un archivo exportado por
   * una versión futura. Dejarlo entrar llenaría el almacén de objetos a los que
   * les faltan campos, y la pantalla se rompería sin decir por qué.
   */
  it("rechaza un archivo de una versión más nueva y lo dice", () => {
    const r = leerArchivo(
      JSON.stringify({ formato: "magicing-proyectos", version: 99, proyectos: [] })
    );
    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain("99");
    expect(r.mensaje).toMatch(/nueva/i);
  });

  it("descarta los proyectos incompletos y avisa cuántos", () => {
    const { p } = proyectoConViga();
    const texto = JSON.stringify({
      formato: "magicing-proyectos",
      version: VERSION_FORMATO,
      proyectos: [p, { id: "x" }, { nombre: "sin id" }],
    });
    const r = leerArchivo(texto);
    expect(r.ok).toBe(true);
    expect(r.proyectos).toHaveLength(1);
    expect(r.mensaje).toContain("2");
  });

  it("un archivo sin ningún proyecto legible no se da por bueno", () => {
    const r = leerArchivo(
      JSON.stringify({ formato: "magicing-proyectos", version: 1, proyectos: [{ id: "x" }] })
    );
    expect(r.ok).toBe(false);
  });

  it("rechaza un elemento cuyos cálculos no tienen la forma esperada", () => {
    const { p } = proyectoConViga();
    const roto = {
      ...p,
      elementos: [{ id: "e1", nombre: "V-1", calculos: [{ id: "c1" }] }],
    };
    const r = leerArchivo(
      JSON.stringify({ formato: "magicing-proyectos", version: 1, proyectos: [roto] })
    );
    expect(r.ok).toBe(false);
  });
});

describe("nombre del archivo exportado", () => {
  it("saca tildes, espacios y símbolos, y le pone la fecha", () => {
    const p = crearProyecto("Edificio Los Cedros — Etapa 2");
    const nombre = nombreDeArchivo(p);
    expect(nombre).toMatch(/^magicing-edificio-los-cedros-etapa-2-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("sin proyecto, usa un nombre genérico", () => {
    expect(nombreDeArchivo(null)).toMatch(/^magicing-proyectos-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("un nombre que queda vacío al limpiarlo no produce un archivo sin nombre", () => {
    expect(nombreDeArchivo(crearProyecto("···"))).toMatch(/^magicing-proyecto-/);
  });
});

describe("convertirRetirados — la zapata de medianería pasa a zapata aislada", () => {
  const conMedianeria = () => {
    const p = crearProyecto("Obra");
    const e = crearElemento("Z-1");
    const c = {
      ...crearCalculo("zapatas", { A: "2,5", B: "1,2", anchoPilarB: "0,4", distanciaColumnaLimite: "0,05", Nk: "300" }),
      verificacion: "zapata-medianeria",
    } as unknown as ReturnType<typeof crearCalculo>;
    return [{ ...p, elementos: [{ ...e, calculos: [c] }] }];
  };

  it("cambia la verificación y ubica el pilar donde estaba", () => {
    const [p] = convertirRetirados(conMedianeria());
    const c = p.elementos[0].calculos[0];
    expect(c.verificacion).toBe("zapatas");
    expect(c.campos.posicionPilar).toBe("Ubicación libre");
    expect(c.campos.distanciaBordeA).toBe("0,05");
    // En B el pilar queda centrado: (1,2 − 0,4)/2.
    expect(c.campos.distanciaBordeB).toBe("0.4");
    expect(c.campos.distanciaColumnaLimite).toBeUndefined();
    expect(c.campos.Nk).toBe("300");
  });

  it("no toca proyectos sin cálculos retirados", () => {
    const p = [crearProyecto("Obra")];
    expect(convertirRetirados(p)).toBe(p);
  });
});
