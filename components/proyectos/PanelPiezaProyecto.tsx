"use client";

import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { CampoNumeroOpcional } from "@/components/proyectos/CampoNumeroOpcional";
import { CroquisCabezal } from "@/components/proyectos/CroquisCabezal";
import { MarcaEstado } from "@/components/proyectos/MarcaEstado";
import { derivarCargas, ndPilar } from "@/lib/cad-revit/cargas";
import { guardarCamposDeRuta } from "@/lib/hooks/useCampo";
import { camposDe, esCimentacion } from "@/lib/mcp/cimentaciones";
import { estadoDeElemento, ROTULO_ESTADO } from "@/lib/proyectos/estado";
import { useElementoDestino, useProyectoActivo } from "@/lib/proyectos/activo";
import { actualizarProyecto } from "@/lib/proyectos/modelo";
import type { CalculoGuardado, PilarCargado, PlantaGuardada, Proyecto } from "@/lib/proyectos/tipos";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

export type PiezaElegida = { tipo: "cabezal" | "viga" | "nodo"; indice: number; marca: string };

const mm = (m: number) => Math.round(m * 1000);

/** Los campos que todavía están vacíos, por su nombre en el formulario. */
function faltan(c: CalculoGuardado): string[] {
  if (!esCimentacion(c.verificacion)) return [];
  return camposDe(c.verificacion)
    // Sólo lo que entró vacío a propósito: un campo ausente toma su valor por defecto.
    .filter((d) => c.campos[d.clave] !== undefined && c.campos[d.clave].trim() === "")
    .map((d) => d.etiqueta);
}

/**
 * Lo que se hace con una pieza tocada en la planta: ver qué es y cómo está,
 * cargar el pilar que tiene encima y abrir su cálculo para la armadura.
 */
export function PanelPiezaProyecto({
  proyecto,
  guardar,
  planta,
  pieza,
}: {
  proyecto: Proyecto;
  guardar: (p: Proyecto) => void;
  planta: PlantaGuardada;
  pieza: PiezaElegida | null;
}) {
  const router = useRouter();
  const [, activar] = useProyectoActivo();
  const [, elegirDestino] = useElementoDestino();

  if (!pieza) {
    return (
      <p className="rounded-md border p-3 text-sm text-muted-foreground">
        Tocá un cabezal, una viga o un pilar sobre viga en la planta para cargarle el pilar y la armadura.
      </p>
    );
  }
  const elemento = proyecto.elementos.find((e) => e.cad?.marca === pieza.marca);
  if (!elemento) {
    return (
      <p className="rounded-md border p-3 text-sm text-muted-foreground">
        {pieza.marca} no está en el proyecto. Llevá la planta de nuevo desde CAD → Revit.
      </p>
    );
  }

  const r = planta.interpretacion;
  const e = planta.escala;
  const estado = estadoDeElemento(elemento);

  function pilar(clave: keyof PilarCargado, n: number | undefined) {
    const nuevo = { ...elemento!.pilar, [clave]: n };
    if (n === undefined) delete nuevo[clave];
    const p = { ...proyecto, elementos: proyecto.elementos.map((x) => (x.id === elemento!.id ? { ...x, pilar: nuevo } : x)) };
    guardar(derivarCargas(actualizarProyecto(p, {})));
  }

  function abrir(c: CalculoGuardado) {
    const meta = registroVerificaciones.find((v) => v.id === c.verificacion);
    if (!meta) return;
    guardarCamposDeRuta(meta.ruta, c.campos);
    activar(proyecto.id);
    elegirDestino(elemento!.id);
    router.push(meta.ruta);
  }

  // Qué es, en una línea.
  let descripcion = "";
  if (pieza.tipo === "cabezal") {
    const c = r.cabezales[pieza.indice];
    descripcion = `Cabezal ${c.medidas.map((x) => mm(x * e)).join(" × ")} mm · ${c.pilotes.length} ${c.pilotes.length === 1 ? "pilote" : "pilotes"} ⌀${c.pilotes.length ? mm(r.pilotes[c.pilotes[0]].diametro * e) : "—"}`;
  } else if (pieza.tipo === "viga") {
    const v = r.vigas[pieza.indice];
    const extremos = elemento.cad?.extremos?.filter(Boolean).join(" ↔ ");
    descripcion = `Viga ${mm(v.ancho * e)} × ${mm(v.alto * e)} mm · ${fmt(Math.hypot(v.fin[0] - v.inicio[0], v.fin[1] - v.inicio[1]) * e, 2)} m de cara a cara${extremos ? ` · ${extremos}` : ""}`;
  } else {
    descripcion = "Pilar sobre viga: descarga directo en su pilote";
  }

  const conPilar = pieza.tipo === "cabezal" || pieza.tipo === "nodo";
  const conLados = pieza.tipo === "cabezal" && elemento.calculos.length > 0;
  const nd = ndPilar(elemento.pilar);
  const celda = "h-8 w-24 px-2 text-right tabular-nums";
  const campo = (etiqueta: string, clave: keyof PilarCargado, unidad: string) => (
    <label className="flex items-center justify-between gap-3">
      <span>
        {etiqueta} <span className="text-xs text-muted-foreground">({unidad})</span>
      </span>
      <CampoNumeroOpcional
        etiqueta={`${etiqueta} de ${elemento.nombre}`}
        className={celda}
        valor={elemento.pilar?.[clave]}
        onCambio={(n) => pilar(clave, n)}
      />
    </label>
  );

  return (
    <div className="space-y-4 rounded-md border p-4 text-sm">
      <div className="space-y-1">
        <p className="text-base font-semibold">{elemento.nombre}</p>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
        <p className="flex items-center gap-1.5 text-xs">
          <MarcaEstado estado={estado} />
          {elemento.cad?.sinVerificacion ?? ROTULO_ESTADO[estado]}
        </p>
      </div>

      {conPilar && (
        <div className="space-y-2">
          <p className="font-medium">Pilar</p>
          {campo("G", "gKN", "kN")}
          {campo("Q", "qKN", "kN")}
          {conLados && (
            <>
              <CroquisCabezal
                cabezal={r.cabezales[pieza.indice]}
                pilotes={r.pilotes}
                escala={e}
                ladoAM={elemento.pilar?.ladoPilotesM}
                ladoBM={elemento.pilar?.ladoTransversalM}
              />
              {campo("Lado A", "ladoPilotesM", "m")}
              {campo("Lado B", "ladoTransversalM", "m")}
            </>
          )}
          {campo("Nd a mano", "ndKN", "kN")}
          <p className="text-xs text-muted-foreground">
            Nd = {nd === null ? "—" : `${fmt(nd, 1)} kN`}
            {elemento.pilar?.ndKN !== undefined ? " (a mano)" : nd !== null ? " (1,35·G + 1,5·Q)" : ""}. Dejá «Nd a mano» vacío salvo que
            una combinación del modelo (con viento, por ejemplo) supere a 1,35·G + 1,5·Q.
          </p>
        </div>
      )}

      {elemento.calculos.map((c) => {
        const meta = registroVerificaciones.find((v) => v.id === c.verificacion);
        const vacios = faltan(c);
        return (
          <div key={c.id} className="space-y-2">
            <button
              type="button"
              onClick={() => abrir(c)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Calculator className="h-4 w-4" />
              {meta?.nombre ?? c.verificacion}: armadura y resultado
            </button>
            {vacios.length > 0 && (
              <p className="text-xs text-muted-foreground">Falta cargar: {vacios.join(", ")}.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
