"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { CampoMetros } from "@/components/cad-revit/CampoMetros";
import { ListaAvisos } from "@/components/cad-revit/ListaAvisos";
import { LeyendaEstados } from "@/components/cad-revit/LeyendaEstados";
import { LlevarAProyecto } from "@/components/cad-revit/LlevarAProyecto";
import { PanelPieza } from "@/components/cad-revit/PanelPieza";
import { PlantaInterpretada, type Seleccion } from "@/components/cad-revit/PlantaInterpretada";
import type { LecturaDxf, Punto } from "@/lib/dxf/leer";
import { exportarParaRevit, PENETRACION_PILOTE_M } from "@/lib/cad-revit/exportar";
import { modoPilotes } from "@/lib/cad-revit/descargas";
import { estadosDePlanta } from "@/lib/cad-revit/proyecto";
import { useProyectos } from "@/lib/proyectos/almacen";
import { interpretar, opcionesSugeridas, zonas, type OpcionesInterpretacion } from "@/lib/cad-revit/interpretar";

/** Cuánto entra la cabeza del pilote en la pieza de arriba (criterio del usuario). */

function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

const UNIDADES: { escala: number; nombre: string }[] = [
  { escala: 0.001, nombre: "milímetros" },
  { escala: 0.01, nombre: "centímetros" },
  { escala: 1, nombre: "metros" },
];

/** Las partes de un archivo, avisando cuánto se leyó. Un DXF de obra puede pesar cientos de MB. */
async function* partes(archivo: File, alAvanzar: (fraccion: number) => void) {
  const lector = archivo.stream().getReader();
  let leido = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) return;
    leido += value.length;
    alAvanzar(leido / archivo.size);
    yield value;
  }
}

/**
 * CAD → Revit: se sube la planta de fundaciones en DXF y MagicIng la
 * interpreta —pilotes, cabezales, vigas— y dice qué no cierra entre el dibujo
 * y los rótulos. Todo en el navegador: el archivo no sale de la computadora.
 *
 * La interpretación no se guarda: se rehace desde el archivo, que es la
 * fuente. Lo que se lleva a Revit es la exportación (paso siguiente).
 */
export default function CadRevitPage() {
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lectura, setLectura] = useState<LecturaDxf | null>(null);
  const [opciones, setOpciones] = useState<OpcionesInterpretacion | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [foco, setFoco] = useState<Punto | null>(null);
  const [desniveles, setDesniveles] = useState<Record<number, number>>({});
  const [largoPilote, setLargoPilote] = useState(12);
  /** Proyecto donde se calcula la planta: "" hasta elegir uno. Pinta la planta por estado. */
  const [idProyecto, setIdProyecto] = useState("");
  const { proyectos } = useProyectos();

  async function cargar(f: File) {
    setError(null);
    setLectura(null);
    setSeleccion(null);
    setDesniveles({});
    setProgreso(0);
    setArchivo(f.name);
    try {
      // El lector se baja recién cuando hace falta.
      const { leerDxfPorPartes } = await import("@/lib/dxf/leer");
      let ultimo = 0;
      const l = await leerDxfPorPartes(
        partes(f, (x) => {
          if (x - ultimo > 0.02 || x === 1) setProgreso((ultimo = x));
        })
      );
      const sugeridas = opcionesSugeridas(l);
      if (!sugeridas) {
        setError("No se encontraron círculos en el dibujo: sin pilotes no se puede leer la planta. ¿Es una planta de fundaciones?");
        return;
      }
      setLectura(l);
      setOpciones({ ...sugeridas, zona: 0 });
    } catch {
      setError("No se pudo leer el archivo como DXF.");
    } finally {
      setProgreso(null);
      if (entrada.current) entrada.current.value = "";
    }
  }

  const capas = useMemo(() => {
    const cuenta = new Map<string, { contorno: number; circulos: number }>();
    for (const e of lectura?.entidades ?? []) {
      const c = cuenta.get(e.capa) ?? { contorno: 0, circulos: 0 };
      if (e.tipo === "polilinea" || e.tipo === "linea") c.contorno++;
      if (e.tipo === "circulo") c.circulos++;
      cuenta.set(e.capa, c);
    }
    return [...cuenta].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lectura]);

  const listaZonas = useMemo(
    () => (lectura && opciones ? zonas(lectura, opciones.capaContorno, opciones.escala) : []),
    [lectura, opciones]
  );
  const resultado = useMemo(() => (lectura && opciones ? interpretar(lectura, opciones) : null), [lectura, opciones]);
  const proyecto = proyectos.find((p) => p.id === idProyecto) ?? null;
  const estados = useMemo(() => (resultado && proyecto ? estadosDePlanta(resultado, proyecto) : null), [resultado, proyecto]);

  const cambiar = (c: Partial<OpcionesInterpretacion>) => {
    if (!opciones) return;
    setSeleccion(null);
    // Los desniveles van por índice de cabezal: otra interpretación, otros índices.
    setDesniveles({});
    setOpciones({ ...opciones, ...c, ...(c.capaContorno || c.escala ? { zona: 0 } : {}) });
  };
  const unidadDibujo = UNIDADES.find((u) => u.escala === opciones?.escala)?.nombre;
  const selector = "h-9 rounded-lg border border-input bg-transparent px-2 text-sm";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Herramienta</p>
          <h1 className="text-3xl font-semibold tracking-tight">CAD → Revit</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Subí la planta de fundaciones en DXF. MagicIng reconoce pilotes, cabezales y vigas a partir de los
            contornos y los rótulos, y te muestra lo que no cierra antes de llevarla a Revit. El archivo no sale de
            esta computadora.
          </p>
        </div>
        <input
          ref={entrada}
          type="file"
          accept=".dxf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void cargar(f);
          }}
        />
        <button
          type="button"
          disabled={progreso !== null}
          onClick={() => entrada.current?.click()}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {progreso !== null ? `Leyendo… ${Math.round(progreso * 100)} %` : lectura ? "Subir otro DXF" : "Subir DXF"}
        </button>
      </div>

      {error && <p className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}

      {!lectura && !error && progreso === null && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Si el DXF es muy pesado, suele ser por bloques que el dibujo no usa: un <strong>PURGE</strong> en AutoCAD
          antes de exportar lo achica mucho. Igual se puede subir tal cual.
        </p>
      )}

      {lectura && opciones && (
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="space-y-1">
            <span className="block text-muted-foreground">Capa de contornos</span>
            <select className={selector} value={opciones.capaContorno} onChange={(e) => cambiar({ capaContorno: e.target.value })}>
              {capas.filter(([, c]) => c.contorno > 0).map(([n, c]) => (
                <option key={n} value={n}>
                  {n} ({c.contorno})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-muted-foreground">Capa de pilotes</span>
            <select className={selector} value={opciones.capaPilotes} onChange={(e) => cambiar({ capaPilotes: e.target.value })}>
              {capas.filter(([, c]) => c.circulos > 0).map(([n, c]) => (
                <option key={n} value={n}>
                  {n} ({c.circulos} círculos)
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-muted-foreground">El dibujo está en</span>
            <select className={selector} value={opciones.escala} onChange={(e) => cambiar({ escala: Number(e.target.value) })}>
              {UNIDADES.map((u) => (
                <option key={u.escala} value={u.escala}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
          {listaZonas.length > 1 && (
            <label className="space-y-1">
              <span className="block text-muted-foreground">Zona del dibujo</span>
              <select className={selector} value={opciones.zona} onChange={(e) => cambiar({ zona: Number(e.target.value) })}>
                {listaZonas.map((z, i) => (
                  <option key={i} value={i}>
                    Zona {i + 1}: {Math.round(z.largoContorno * opciones.escala)} m de contorno
                  </option>
                ))}
              </select>
            </label>
          )}
          {lectura.unidadDeclarada && unidadDibujo && lectura.unidadDeclarada !== unidadDibujo && (
            <p className="basis-full text-xs text-muted-foreground">
              El archivo declara {lectura.unidadDeclarada}, pero por el tamaño de los pilotes está dibujado en {unidadDibujo}.
              Conviene corregir las unidades del DXF antes de insertarlo en otro programa.
            </p>
          )}
        </div>
      )}

      {resultado && opciones && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium">{archivo}</span>
              <span className="text-muted-foreground">
                {" "}
                · {resultado.pilotes.length} pilotes · {resultado.cabezales.length} cabezales · {resultado.vigas.length} vigas
                {resultado.nodos.length > 0 && ` · ${resultado.nodos.length} pilares sobre viga`}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label htmlFor="largo-pilote" className="text-muted-foreground">
                Largo de pilotes (m)
              </label>
              <CampoMetros id="largo-pilote" valor={largoPilote} onCambio={(n) => n > 0 && setLargoPilote(n)} />
              <button
                type="button"
                onClick={() =>
                  descargar(
                    `${(archivo ?? "planta").replace(/\.dxf$/i, "")}-revit.json`,
                    JSON.stringify(
                      exportarParaRevit(resultado, {
                        escala: opciones.escala,
                        largoPiloteM: largoPilote,
                        penetracionPiloteM: PENETRACION_PILOTE_M,
                        desniveles,
                        archivo: archivo ?? "",
                      }),
                      null,
                      2
                    )
                  )
                }
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Descargar para Revit
              </button>
            </div>
          </div>
          <LlevarAProyecto resultado={resultado} escala={opciones.escala} largoPiloteM={largoPilote} archivo={archivo ?? "planta.dxf"}
            destino={idProyecto}
            onDestino={setIdProyecto}
            desniveles={desniveles}
          />
          {estados && proyecto && <LeyendaEstados estados={estados} proyecto={proyecto.nombre} pilotesVerificados={modoPilotes(proyecto) === "verificar"} />}
          <details className="rounded-md border px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">Cómo llevarlo a Revit</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Bajá el script una sola vez:{" "}
                <a href="/revit/colocar-fundaciones-magicing.dyn" download className="text-foreground underline underline-offset-2">
                  colocar-fundaciones-magicing.dyn
                </a>{" "}
                (Revit 2026, Dynamo 3).
              </li>
              <li>Revisá la lista de diferencias y, si hace falta, el desnivel de algún cabezal. Después, Descargar para Revit.</li>
              <li>
                En Revit, vinculá el mismo DXF donde corresponda (con el nombre del archivo sin cambiar): las piezas se colocan encima de él, con
                su corrimiento y su giro. Después, Manage → Dynamo Player, abrí el script, elegí el archivo y el nivel, y corré.
              </li>
              <li>
                Si un tipo no existe (por ejemplo un CT nuevo), el script lo crea con las medidas del rótulo. Si ya colocó antes en ese
                modelo, no duplica: avisa.
              </li>
            </ol>
          </details>
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <PlantaInterpretada
              key={`${opciones.capaContorno}|${opciones.escala}|${opciones.zona}`}
              interpretacion={resultado}
              seleccion={seleccion}
              onSeleccionar={setSeleccion}
              foco={foco}
              estados={estados}
            />
            <aside className="space-y-4">
              <PanelPieza
                interpretacion={resultado}
                seleccion={seleccion}
                escala={opciones.escala}
                desniveles={desniveles}
                onDesnivel={(i, m) => setDesniveles((d) => ({ ...d, [i]: m }))}
              />
              <ListaAvisos avisos={resultado.avisos} onVer={(p) => setFoco([p[0], p[1]])} />
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
