"use client";

import type { ResultadoCapitel, SeccionCriticaCapitel } from "@/lib/calc/hormigon/losas/capitel";
import type { PerimetroControl } from "@/lib/calc/hormigon/losas/punzonamiento";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Planta a escala del capitel: el pilar, el capitel, los bordes libres y las
 * secciones críticas que se usaron, cada una en el color de su estado.
 *
 * Los perímetros circulares pueden ser una vuelta entera, así que los arcos se
 * dibujan como poligonales finas en vez de con el comando A del SVG, que no
 * dibuja un círculo completo de un solo arco.
 */

const MARGEN = 0.1;

function puntosDe(p: PerimetroControl): { x: number; y: number }[][] {
  return p.tramos.map((t) => {
    if (t.tipo === "recta") return [{ x: t.x0, y: t.y0 }, { x: t.x1, y: t.y1 }];
    const n = Math.max(8, Math.ceil(((t.hastaRad - t.desdeRad) / (2 * Math.PI)) * 180));
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = t.desdeRad + ((t.hastaRad - t.desdeRad) * i) / n;
      return { x: t.cx + t.rM * Math.cos(a), y: t.cy + t.rM * Math.sin(a) };
    });
  });
}

interface PlantaCapitelProps {
  resultado: ResultadoCapitel;
}

export function PlantaCapitel({ resultado }: PlantaCapitelProps) {
  const { planta, secciones } = resultado;
  const { pilar, capitel, hayBordeX, hayBordeY, forma } = planta;
  const circular = forma === "circular";

  const trazos = secciones.map((s) => ({ s, partes: puntosDe(s.perimetro) }));
  const todos = trazos.flatMap((t) => t.partes.flat());
  todos.push({ x: capitel.x0, y: capitel.y0 }, { x: capitel.x1, y: capitel.y1 });
  const xMin = Math.min(...todos.map((p) => p.x), hayBordeX ? 0 : Infinity) - MARGEN;
  const xMax = Math.max(...todos.map((p) => p.x)) + MARGEN;
  const yMin = Math.min(...todos.map((p) => p.y), hayBordeY ? 0 : Infinity) - MARGEN;
  const yMax = Math.max(...todos.map((p) => p.y)) + MARGEN;

  const ANCHO = 440;
  const ALTO = 340;
  const escala = Math.min(ANCHO / (xMax - xMin), ALTO / (yMax - yMin));
  const dx = (ANCHO - (xMax - xMin) * escala) / 2;
  const dy = (ALTO - (yMax - yMin) * escala) / 2;
  const aX = (x: number) => dx + (x - xMin) * escala;
  const aY = (y: number) => dy + (yMax - y) * escala;
  const camino = (partes: { x: number; y: number }[][]) =>
    partes.map((pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${aX(p.x).toFixed(1)} ${aY(p.y).toFixed(1)}`).join(" ")).join(" ");

  const cx = (pilar.x0 + pilar.x1) / 2;
  const cy = (pilar.y0 + pilar.y1) / 2;
  const rPilar = (pilar.x1 - pilar.x0) / 2;
  const rCapitel = rPilar + (capitel.x1 - pilar.x1);
  const color = (s: SeccionCriticaCapitel) => (s.verifica ? "stroke-exito" : "stroke-destructive");

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full max-w-[30rem] text-primary" fill="none" aria-hidden="true">
        <defs>
          <pattern id="capitel-borde" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>
        {hayBordeY && (
          <g>
            <rect x={0} y={aY(0)} width={ANCHO} height={Math.max(ALTO - aY(0), 0)} fill="url(#capitel-borde)" />
            <line x1={0} y1={aY(0)} x2={ANCHO} y2={aY(0)} stroke="currentColor" strokeWidth="1.8" />
          </g>
        )}
        {hayBordeX && (
          <g>
            <rect x={0} y={0} width={Math.max(aX(0), 0)} height={ALTO} fill="url(#capitel-borde)" />
            <line x1={aX(0)} y1={0} x2={aX(0)} y2={ALTO} stroke="currentColor" strokeWidth="1.8" />
          </g>
        )}

        {/* Capitel: el engrosamiento bajo la losa. */}
        {circular ? (
          <circle cx={aX(cx)} cy={aY(cy)} r={rCapitel * escala} fill="var(--mat-hormigon)" fillOpacity="0.45" stroke="var(--mat-hormigon-borde)" strokeDasharray="5 3" />
        ) : (
          <rect
            x={aX(capitel.x0)}
            y={aY(capitel.y1)}
            width={(capitel.x1 - capitel.x0) * escala}
            height={(capitel.y1 - capitel.y0) * escala}
            fill="var(--mat-hormigon)"
            fillOpacity="0.45"
            stroke="var(--mat-hormigon-borde)"
            strokeDasharray="5 3"
          />
        )}

        {trazos.map(({ s, partes }) => (
          <path key={s.donde} d={camino(partes)} strokeWidth={s.donde === "losa" ? 2.4 : 1.8} strokeDasharray={s.donde === "capitel" ? "6 3" : undefined} className={color(s)} />
        ))}

        {circular ? (
          <circle cx={aX(cx)} cy={aY(cy)} r={rPilar * escala} fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" />
        ) : (
          <rect
            x={aX(pilar.x0)}
            y={aY(pilar.y1)}
            width={(pilar.x1 - pilar.x0) * escala}
            height={(pilar.y1 - pilar.y0) * escala}
            fill="var(--mat-hormigon)"
            stroke="var(--mat-hormigon-borde)"
            strokeWidth="1.6"
          />
        )}
      </svg>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 border border-dashed border-current opacity-60" />
          capitel
        </li>
        {secciones.map((s) => (
          <li key={s.donde} className="flex items-center gap-1.5">
            <span className={`inline-block h-0.5 w-5 ${s.verifica ? "bg-exito" : "bg-destructive"}`} />
            {s.donde === "losa" ? "en la losa" : "en el capitel"}: u = {fmt(s.uM * 100, 0)} cm
          </li>
        ))}
      </ul>
    </div>
  );
}
