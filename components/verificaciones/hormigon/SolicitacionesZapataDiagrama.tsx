"use client";

import { useId } from "react";

interface SolicitacionesZapataDiagramaProps {
  /** Ancho de la zapata en la dirección dibujada (m) */
  anchoM: number;
  /** Canto de la zapata (m) */
  cantoM: number;
  /** Ancho del pilar en esa dirección (m) */
  anchoPilarM: number;
  /** Carga vertical característica (kN) */
  nkKN: number;
  /** Momento característico en esa dirección (kN·m) */
  mkKNm: number;
  /** Presiones de cálculo bajo la zapata (kN/m²) */
  sigmaMaxKPa: number;
  sigmaMinKPa: number;
  /** Largo que apoya, medido desde el borde más cargado (m). Si falta, apoya toda la base. */
  longitudContactoM?: number;
}

const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Alzado de la zapata con las acciones que pide el formulario y la distribución
 * de presiones que producen.
 *
 * Es el dibujo que más aclara el cálculo: se ve que N baja por el pilar, que Mk
 * descentra la resultante, y que el suelo responde con un trapecio de presiones
 * cuyo desnivel entre bordes es justamente la excentricidad. Cuando el trapecio
 * se vuelve muy desigual, la zapata está trabajando cerca del límite del núcleo
 * central.
 */
export function SolicitacionesZapataDiagrama({
  anchoM,
  cantoM,
  anchoPilarM,
  nkKN,
  mkKNm,
  sigmaMaxKPa,
  sigmaMinKPa,
  longitudContactoM,
}: SolicitacionesZapataDiagramaProps) {
  const flecha = useId();
  // Con la resultante fuera de la base σmáx es infinita y el trapecio no tiene escala.
  if (!(anchoM > 0) || !(cantoM > 0) || !Number.isFinite(sigmaMaxKPa)) return null;

  const W = 420;
  const x0 = 60;
  const x1 = 360;
  const escala = (x1 - x0) / anchoM;
  const centro = (x0 + x1) / 2;

  const yPilarTop = 34;
  const yZapata = 96;
  const altoZapata = Math.max(cantoM * escala, 16);
  const yBase = yZapata + altoZapata;

  const pilarW = Math.min(anchoPilarM * escala, (x1 - x0) * 0.5);

  // El trapecio de presiones se dibuja hacia abajo desde la base.
  const MAX_PRESION_PX = 46;
  const pico = Math.max(Math.abs(sigmaMaxKPa), Math.abs(sigmaMinKPa), 1e-9);
  const hMax = (sigmaMaxKPa / pico) * MAX_PRESION_PX;
  const hMin = (sigmaMinKPa / pico) * MAX_PRESION_PX;

  const alto = yBase + MAX_PRESION_PX + 52;

  // Con despegue la cuña arranca donde empieza el contacto, no en el borde.
  const xContacto =
    longitudContactoM !== undefined && longitudContactoM < anchoM ? x1 - longitudContactoM * escala : x0;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id={flecha} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* Carga vertical bajando por el pilar */}
        <path d={`M${centro} ${yPilarTop - 26} L${centro} ${yPilarTop - 2}`} stroke="currentColor" strokeWidth="2" markerEnd={`url(#${flecha})`} />
        <text x={centro + 8} y={yPilarTop - 14} className="fill-current font-mono" fontSize="10.5">
          Nk {fmt(nkKN)} kN
        </text>

        {/* Momento aplicado en la base del pilar */}
        {Math.abs(mkKNm) > 0 && (
          <g>
            <path
              d={`M${centro - pilarW / 2 - 30} ${yPilarTop + 30} A 18 10 0 1 1 ${centro + pilarW / 2 + 30} ${yPilarTop + 30}`}
              stroke="currentColor"
              strokeWidth="1.4"
              markerEnd={`url(#${flecha})`}
              opacity="0.85"
            />
            <text x={centro} y={yPilarTop + 16} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
              Mk {fmt(mkKNm)} kN·m
            </text>
          </g>
        )}

        {/* Pilar y zapata */}
        <rect x={centro - pilarW / 2} y={yPilarTop + 34} width={pilarW} height={yZapata - yPilarTop - 34} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
        <rect x={x0} y={yZapata} width={x1 - x0} height={altoZapata} stroke="var(--mat-hormigon-borde)" strokeWidth="1.9" fill="var(--mat-hormigon)" />

        {/* Trapecio de presiones del terreno */}
        <path
          d={`M${xContacto} ${yBase} L${x1} ${yBase} L${x1} ${yBase + hMax} L${xContacto} ${yBase + hMin} Z`}
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const x = xContacto + (x1 - xContacto) * t;
          const h = hMin + (hMax - hMin) * t;
          return <path key={t} d={`M${x} ${yBase + h} L${x} ${yBase + 2}`} stroke="currentColor" strokeWidth="1" markerEnd={`url(#${flecha})`} opacity="0.75" />;
        })}

        <text x={x0} y={yBase + MAX_PRESION_PX + 20} textAnchor="start" className="fill-current font-mono" fontSize="10.5">
          σmín {fmt(sigmaMinKPa)}
        </text>
        <text x={x1} y={yBase + MAX_PRESION_PX + 20} textAnchor="end" className="fill-current font-mono" fontSize="10.5">
          σmáx {fmt(sigmaMaxKPa)}
        </text>
        <text x={centro} y={yBase + MAX_PRESION_PX + 34} textAnchor="middle" className="fill-current font-mono" fontSize="7.5" opacity="0.7">
          presiones de cálculo · kN/m²
        </text>

        {/* Cota del ancho */}
        <text x={centro} y={yZapata + altoZapata / 2 + 3} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.8">
          A = {fmt(anchoM, 2)} m
        </text>
      </svg>

      <p className="max-w-md text-center text-xs text-muted-foreground">
        Nk y Mk se cargan sin mayorar. El trapecio de abajo es la respuesta del terreno ya
        mayorada, que es la que dimensiona el armado: cuanto más desigual, mayor la
        excentricidad.
      </p>
    </div>
  );
}
