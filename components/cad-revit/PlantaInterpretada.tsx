"use client";

import { useRef, useState } from "react";
import { Maximize } from "lucide-react";
import type { Punto } from "@/lib/dxf/leer";
import { esquinas } from "@/lib/cad-revit/geometria";
import type { Interpretacion } from "@/lib/cad-revit/interpretar";
import type { EstadosPlanta } from "@/lib/cad-revit/proyecto";
import type { EstadoElemento } from "@/lib/proyectos/estado";

export type Seleccion =
  | { tipo: "cabezal"; indice: number }
  | { tipo: "viga"; indice: number }
  | { tipo: "nodo"; indice: number }
  | null;

/** Colores por estado, los mismos que el modelo 3D y MarcaEstado. */
const CLASE_ESTADO: Record<EstadoElemento, string> = {
  verifica: "fill-exito/35 stroke-exito",
  "no-verifica": "fill-destructive/35 stroke-destructive",
  "sin-verificar": "fill-muted-foreground/35 stroke-muted-foreground",
  "no-evaluable": "fill-muted-foreground/10 stroke-muted-foreground/60",
};
/** Una pieza que no está en el proyecto elegido. */
const FUERA = "fill-none stroke-muted-foreground/60";

interface Vista {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * La planta tal como la entendió MagicIng, encima de lo dibujado: el contorno
 * en gris, cabezales y vigas en color, los avisos marcados. El plano no
 * calcula nada; recibe la interpretación.
 *
 * El dibujo tiene Y hacia arriba y el SVG hacia abajo: se invierte la Y al
 * dibujar, punto por punto, para que los textos no salgan espejados.
 */
export function PlantaInterpretada({
  interpretacion,
  seleccion,
  onSeleccionar,
  foco,
  estados,
}: {
  interpretacion: Interpretacion;
  seleccion: Seleccion;
  onSeleccionar: (s: Seleccion) => void;
  /** Punto que el plano tiene que mostrar centrado (un aviso elegido en la lista). */
  foco: Punto | null;
  /** Si hay un proyecto elegido: el estado de cada pieza, que manda sobre el color. */
  estados?: EstadosPlanta | null;
}) {
  const { zona, dibujo, pilotes, cabezales, vigas, nodos, avisos } = interpretacion;
  const margen = Math.max(zona.caja.max[0] - zona.caja.min[0], zona.caja.max[1] - zona.caja.min[1]) * 0.05;
  const completa: Vista = {
    x: zona.caja.min[0] - margen,
    y: -zona.caja.max[1] - margen,
    ancho: zona.caja.max[0] - zona.caja.min[0] + 2 * margen,
    alto: zona.caja.max[1] - zona.caja.min[1] + 2 * margen,
  };
  const [vista, setVista] = useState<Vista>(completa);
  const [focoVisto, setFocoVisto] = useState<Punto | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ x: number; y: number; vista: Vista; movido: boolean } | null>(null);

  // Un foco nuevo centra la vista en él, acercando. Se ajusta durante el
  // render (y no en un efecto) para no dibujar un cuadro con la vista vieja.
  if (foco && foco !== focoVisto) {
    setFocoVisto(foco);
    const ancho = Math.min(completa.ancho, completa.ancho / 4);
    const alto = (ancho * completa.alto) / completa.ancho;
    setVista({ x: foco[0] - ancho / 2, y: -foco[1] - alto / 2, ancho, alto });
  }

  const unidad = vista.ancho / 900; // grosor de línea: ~1 px en pantalla, haga el zoom que haga
  const P = (p: Punto) => `${p[0]},${-p[1]}`;
  const colorDe = (e: EstadoElemento | null) => (e ? CLASE_ESTADO[e] : FUERA);
  const elegido = (tipo: string, i: number) => seleccion?.tipo === tipo && seleccion.indice === i;

  function alRueda(e: React.WheelEvent<SVGSVGElement>) {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const px = vista.x + ((e.clientX - r.left) / r.width) * vista.ancho;
    const py = vista.y + ((e.clientY - r.top) / r.height) * vista.alto;
    setVista({ x: px - (px - vista.x) * f, y: py - (py - vista.y) * f, ancho: vista.ancho * f, alto: vista.alto * f });
  }

  function alMover(e: React.PointerEvent<SVGSVGElement>) {
    const a = arrastre.current;
    const r = svg.current?.getBoundingClientRect();
    if (!a || !r) return;
    const dx = ((e.clientX - a.x) / r.width) * a.vista.ancho;
    const dy = ((e.clientY - a.y) / r.height) * a.vista.alto;
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 3) a.movido = true;
    setVista({ ...a.vista, x: a.vista.x - dx, y: a.vista.y - dy });
  }

  // Un clic elige; arrastrar para mover el plano no.
  const elegir = (s: Seleccion) => () => {
    if (!arrastre.current?.movido) onSeleccionar(s);
  };

  return (
    // La caja toma la proporción de la planta: una planta ancha en una caja
    // alta queda chica y rodeada de vacío.
    <div
      className="relative max-h-[75vh] min-h-[18rem] w-full overflow-hidden rounded-md border bg-background"
      style={{ aspectRatio: `${completa.ancho} / ${completa.alto}` }}
    >
      <svg
        ref={svg}
        className="h-full w-full touch-none select-none"
        viewBox={`${vista.x} ${vista.y} ${vista.ancho} ${vista.alto}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={alRueda}
        onPointerDown={(e) => {
          arrastre.current = { x: e.clientX, y: e.clientY, vista, movido: false };
        }}
        onPointerMove={alMover}
        onPointerUp={() => {
          setTimeout(() => (arrastre.current = null));
        }}
        onPointerLeave={() => (arrastre.current = null)}
        onClick={elegir(null)}
        role="img"
        aria-label="Planta de fundaciones interpretada"
      >
        {/* Lo dibujado, de fondo. */}
        <g className="stroke-muted-foreground/50" fill="none" strokeWidth={unidad}>
          {dibujo.map((e, i) =>
            e.tipo === "polilinea" ? (
              <polyline key={i} points={[...e.puntos, ...(e.cerrada ? [e.puntos[0]] : [])].map(P).join(" ")} />
            ) : e.tipo === "linea" ? (
              <line key={i} x1={e.a[0]} y1={-e.a[1]} x2={e.b[0]} y2={-e.b[1]} />
            ) : null
          )}
        </g>

        {vigas.map((v, i) => {
          const dx = v.fin[0] - v.inicio[0];
          const dy = v.fin[1] - v.inicio[1];
          const l = Math.hypot(dx, dy) || 1;
          const n: Punto = [(-dy / l) * (v.ancho / 2), (dx / l) * (v.ancho / 2)];
          const franja: Punto[] = [
            [v.inicio[0] + n[0], v.inicio[1] + n[1]],
            [v.fin[0] + n[0], v.fin[1] + n[1]],
            [v.fin[0] - n[0], v.fin[1] - n[1]],
            [v.inicio[0] - n[0], v.inicio[1] - n[1]],
          ];
          return (
            <g key={`v${i}`} onClick={(e) => (e.stopPropagation(), elegir({ tipo: "viga", indice: i })())} className="cursor-pointer">
              <polygon
                points={franja.map(P).join(" ")}
                className={estados ? colorDe(estados.vigas[i]) : elegido("viga", i) ? "fill-exito/50 stroke-exito" : "fill-exito/20 stroke-exito/70"}
                strokeWidth={unidad * (elegido("viga", i) ? 2.5 : 1)}
              />
              <line x1={v.inicio[0]} y1={-v.inicio[1]} x2={v.fin[0]} y2={-v.fin[1]} className={estados ? "stroke-foreground/40" : "stroke-exito"} strokeWidth={unidad} strokeDasharray={`${unidad * 6} ${unidad * 4}`} />
            </g>
          );
        })}

        {cabezales.map((c, i) => (
          <polygon
            key={`c${i}`}
            points={esquinas(c.rect).map(P).join(" ")}
            onClick={(e) => (e.stopPropagation(), elegir({ tipo: "cabezal", indice: i })())}
            className={`cursor-pointer ${estados ? colorDe(estados.cabezales[i]) : elegido("cabezal", i) ? "fill-primary/45 stroke-primary" : "fill-primary/15 stroke-primary"}`}
            strokeWidth={unidad * (elegido("cabezal", i) ? 3 : 1.5)}
          />
        ))}

        <g className="stroke-foreground/70" fill="none" strokeWidth={unidad}>
          {pilotes.map((p, i) => (
            <circle
              key={`p${i}`}
              cx={p.centro[0]}
              cy={-p.centro[1]}
              r={p.diametro / 2}
              className={estados ? colorDe(estados.pilotes[i]) : undefined}
            />
          ))}
        </g>

        {nodos.map((n, i) => {
          const p = n.pilotes.length ? pilotes[n.pilotes[0]].centro : n.rotulo;
          return (
            <rect
              key={`n${i}`}
              x={p[0] - unidad * 7}
              y={-p[1] - unidad * 7}
              width={unidad * 14}
              height={unidad * 14}
              transform={`rotate(45 ${p[0]} ${-p[1]})`}
              onClick={(e) => (e.stopPropagation(), elegir({ tipo: "nodo", indice: i })())}
              className={`cursor-pointer ${elegido("nodo", i) ? "fill-brillante stroke-foreground" : "fill-brillante/60 stroke-brillante"}`}
              strokeWidth={unidad}
            />
          );
        })}

        {/* Avisos: un anillo donde está lo que hay que revisar. */}
        <g className="stroke-destructive" fill="none" strokeWidth={unidad * 2.5}>
          {avisos.map((a, i) => (
            <circle key={`a${i}`} cx={a.posicion[0]} cy={-a.posicion[1]} r={unidad * 22} />
          ))}
        </g>

        {/* Nombres, del tamaño de la vista para que se lean a cualquier zoom. */}
        <g className="fill-foreground" fontSize={unidad * 11} style={{ pointerEvents: "none" }}>
          {cabezales.map((c, i) => (
            <text key={`tc${i}`} x={c.rect.centro[0]} y={-c.rect.centro[1]} textAnchor="middle" dominantBaseline="middle">
              {c.nombre}
            </text>
          ))}
          {vigas.map((v, i) => (
            <text key={`tv${i}`} x={(v.inicio[0] + v.fin[0]) / 2} y={-(v.inicio[1] + v.fin[1]) / 2 - unidad * 6} textAnchor="middle">
              {v.nombre}
            </text>
          ))}
        </g>
      </svg>
      <button
        type="button"
        onClick={() => setVista(completa)}
        className="absolute top-2 right-2 flex h-8 items-center gap-1.5 rounded-md border border-input bg-background/90 px-2 text-xs hover:bg-secondary"
      >
        <Maximize className="h-3.5 w-3.5" />
        Ver todo
      </button>
    </div>
  );
}
