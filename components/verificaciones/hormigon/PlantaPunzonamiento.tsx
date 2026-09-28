"use client";

import type { PerimetroControl, PlantaPunzonamiento as Planta } from "@/lib/calc/hormigon/losas/punzonamiento";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Planta a escala del caso que se acaba de calcular: el pilar, los bordes libres
 * de la losa, el perímetro crítico realmente usado, uout y los perímetros de
 * armadura.
 *
 * El punto de todo el dibujo es el perímetro crítico. En un pilar de borde o de
 * esquina el perímetro no es el rectángulo redondeado del manual: se corta
 * contra el borde libre, y dónde lo corta depende de a qué distancia quedó el
 * pilar. Ese recorte es lo que explica por qué el mismo pilar con la misma carga
 * verifica adentro y no verifica en la fachada, y es exactamente lo que no se ve
 * en una planilla de cálculo.
 *
 * No calcula nada: los tramos vienen resueltos del módulo de cálculo, en metros.
 */

const MARGEN = 0.1;

interface Extremo {
  x: number;
  y: number;
}

function extremosDe(tramo: PerimetroControl["tramos"][number]): [Extremo, Extremo] {
  if (tramo.tipo === "recta") {
    return [
      { x: tramo.x0, y: tramo.y0 },
      { x: tramo.x1, y: tramo.y1 },
    ];
  }
  return [
    { x: tramo.cx + tramo.rM * Math.cos(tramo.desdeRad), y: tramo.cy + tramo.rM * Math.sin(tramo.desdeRad) },
    { x: tramo.cx + tramo.rM * Math.cos(tramo.hastaRad), y: tramo.cy + tramo.rM * Math.sin(tramo.hastaRad) },
  ];
}

/**
 * Los tramos vienen ordenados recorriendo el perímetro, así que el trazo sale
 * de una sola pasada. No se cierra con Z a propósito: cuando el borde libre lo
 * corta, el perímetro es una curva abierta y cerrarla dibujaría un tramo
 * apoyado en el borde que la norma justamente no computa.
 */
function pathDe(perimetro: PerimetroControl, aX: (x: number) => number, aY: (y: number) => number, escala: number): string {
  if (perimetro.tramos.length === 0) return "";
  const [inicio] = extremosDe(perimetro.tramos[0]);
  let d = `M${aX(inicio.x).toFixed(2)} ${aY(inicio.y).toFixed(2)}`;
  for (const tramo of perimetro.tramos) {
    const [, fin] = extremosDe(tramo);
    if (tramo.tipo === "recta") {
      d += ` L${aX(fin.x).toFixed(2)} ${aY(fin.y).toFixed(2)}`;
    } else {
      const r = (tramo.rM * escala).toFixed(2);
      // Barrido 0: al invertir el eje y para dibujar, el sentido antihorario del
      // cálculo se ve antihorario en pantalla. Arco grande 0: ningún tramo pasa
      // de un cuarto de vuelta.
      d += ` A${r} ${r} 0 0 0 ${aX(fin.x).toFixed(2)} ${aY(fin.y).toFixed(2)}`;
    }
  }
  return d;
}

interface PlantaPunzonamientoProps {
  planta: Planta;
  dM: number;
  u1M: number;
  /** Para rotular el perímetro crítico con su estado. */
  verificaCritico: boolean;
}

export function PlantaPunzonamiento({ planta, dM, u1M, verificaCritico }: PlantaPunzonamientoProps) {
  const { pilar, hayBordeX, hayBordeY, u1, uOut, armadura } = planta;

  // El encuadre lo fija el perímetro más grande que se vaya a dibujar.
  const perimetros = [u1, ...(uOut ? [uOut] : []), ...armadura];
  const puntos = perimetros.flatMap((p) => p.tramos.flatMap((t) => extremosDe(t)));
  puntos.push({ x: pilar.x0, y: pilar.y0 }, { x: pilar.x1, y: pilar.y1 });

  const xMin = Math.min(...puntos.map((p) => p.x)) - MARGEN;
  const xMax = Math.max(...puntos.map((p) => p.x)) + MARGEN;
  const yMin = Math.min(...puntos.map((p) => p.y)) - MARGEN;
  const yMax = Math.max(...puntos.map((p) => p.y)) + MARGEN;

  const ANCHO = 440;
  const ALTO = 320;
  const escala = Math.min(ANCHO / (xMax - xMin), ALTO / (yMax - yMin));
  const anchoDibujo = (xMax - xMin) * escala;
  const altoDibujo = (yMax - yMin) * escala;
  const dx = (ANCHO - anchoDibujo) / 2;
  const dy = (ALTO - altoDibujo) / 2;

  const aX = (x: number) => dx + (x - xMin) * escala;
  // El eje y se invierte: en la losa crece hacia adentro y en el SVG hacia abajo.
  const aY = (y: number) => dy + (yMax - y) * escala;

  const pilarSvg = {
    x: aX(pilar.x0),
    y: aY(pilar.y1),
    ancho: (pilar.x1 - pilar.x0) * escala,
    alto: (pilar.y1 - pilar.y0) * escala,
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full max-w-[30rem] text-primary"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <pattern id="punz-borde" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>

        {/* Bordes libres de la losa, rayados del lado de afuera. */}
        {hayBordeY && (
          <g>
            <rect x={0} y={aY(0)} width={ANCHO} height={Math.max(ALTO - aY(0), 0)} fill="url(#punz-borde)" />
            <line x1={0} y1={aY(0)} x2={ANCHO} y2={aY(0)} stroke="currentColor" strokeWidth="1.8" />
          </g>
        )}
        {hayBordeX && (
          <g>
            <rect x={0} y={0} width={Math.max(aX(0), 0)} height={ALTO} fill="url(#punz-borde)" />
            <line x1={aX(0)} y1={0} x2={aX(0)} y2={ALTO} stroke="currentColor" strokeWidth="1.8" />
          </g>
        )}

        {/* Perímetros de armadura: los más finos, debajo de todo. */}
        {armadura.map((p, i) => (
          <path
            key={`arm-${i}`}
            d={pathDe(p, aX, aY, escala)}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.55"
          />
        ))}

        {/* uout: hasta acá hay que llegar con armadura. */}
        {uOut && (
          <path
            d={pathDe(uOut, aX, aY, escala)}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeDasharray="8 4"
            opacity="0.75"
          />
        )}

        {/* Perímetro crítico: el trazo principal, en el color del estado. */}
        <path
          d={pathDe(u1, aX, aY, escala)}
          strokeWidth="2.4"
          className={verificaCritico ? "stroke-emerald-600" : "stroke-destructive"}
        />

        {/* Pilar. */}
        <rect
          x={pilarSvg.x}
          y={pilarSvg.y}
          width={pilarSvg.ancho}
          height={pilarSvg.alto}
          fill="var(--color-muted)"
          fillOpacity="0.9"
          stroke="currentColor"
          strokeWidth="1.6"
        />

        {/* Cota del 2d desde la cara del pilar hasta el perímetro crítico. */}
        <g stroke="currentColor" strokeWidth="0.8" opacity="0.85">
          <path
            d={`M${pilarSvg.x + pilarSvg.ancho} ${pilarSvg.y + pilarSvg.alto / 2} L${pilarSvg.x + pilarSvg.ancho + 2 * dM * escala} ${pilarSvg.y + pilarSvg.alto / 2}`}
            markerStart="url(#croquis-flecha)"
            markerEnd="url(#croquis-flecha)"
          />
          {/*
            La cota cae encima de los perímetros de armadura, que son varias
            líneas finas. El halo del color de la tarjeta le abre lugar al texto
            sin tener que moverlo a un costado, donde ya no cotaría nada.
          */}
          <text
            x={pilarSvg.x + pilarSvg.ancho + dM * escala}
            y={pilarSvg.y + pilarSvg.alto / 2 - 5}
            textAnchor="middle"
            className="fill-current font-mono"
            fontSize="11"
            stroke="var(--color-card)"
            strokeWidth="3.5"
            paintOrder="stroke"
          >
            2d = {fmt(2 * dM * 100, 0)} cm
          </text>
        </g>

        <marker id="croquis-flecha" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
        </marker>
      </svg>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            className={`inline-block h-0.5 w-5 ${verificaCritico ? "bg-emerald-600" : "bg-destructive"}`}
          />
          perímetro crítico u1 = {fmt(u1M * 100, 0)} cm
        </li>
        {uOut && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t border-dashed border-current" />
            uout — hasta acá llega la fisura
          </li>
        )}
        {armadura.length > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t border-dotted border-current" />
            {armadura.length} perímetro{armadura.length === 1 ? "" : "s"} de armadura
          </li>
        )}
      </ul>
    </div>
  );
}
