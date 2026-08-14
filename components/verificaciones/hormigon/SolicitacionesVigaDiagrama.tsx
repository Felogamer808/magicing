"use client";

import { useId } from "react";

interface SolicitacionesVigaDiagramaProps {
  /** Momento positivo de cálculo (kN·m) */
  momentoPositivoKNm: number;
  /** Momento negativo de cálculo, en valor absoluto (kN·m) */
  momentoNegativoKNm: number;
  /** Cortante de cálculo (kN) */
  cortanteKN: number;
  /** Momento torsor de cálculo (kN·m). Se omite el dibujo si no hay torsión. */
  torsorKNm?: number;
}

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/**
 * Croquis de las solicitaciones que pide el formulario, para que se vea qué es
 * cada valor antes de cargarlo: dónde actúa y qué cara tracciona.
 *
 * El diagrama de momentos se dibuja del lado traccionado, que es la convención
 * de obra: el negativo arriba, traccionando la cara superior sobre los apoyos, y
 * el positivo abajo, traccionando la inferior en el centro del vano. Las alturas
 * guardan la proporción real entre los dos momentos cargados.
 */
export function SolicitacionesVigaDiagrama({
  momentoPositivoKNm,
  momentoNegativoKNm,
  cortanteKN,
  torsorKNm,
}: SolicitacionesVigaDiagramaProps) {
  const flecha = useId();

  const W = 460;
  const x0 = 70;
  const x1 = 390;
  const centro = (x0 + x1) / 2;

  const hayTorsion = torsorKNm !== undefined && torsorKNm > 0;

  // Bandas verticales, cada una con su espacio propio para que nada se solape.
  const yTorsor = 26;
  const yViga = hayTorsion ? 58 : 34;
  const altoViga = 13;
  const yBaseApoyo = yViga + altoViga + 20;
  const yEtiquetaCorte = yBaseApoyo + 20;
  const yEje = yEtiquetaCorte + 52;

  const ALTO_MAX = 34;
  const maxM = Math.max(Math.abs(momentoPositivoKNm), Math.abs(momentoNegativoKNm), 1e-9);
  const hPos = (Math.abs(momentoPositivoKNm) / maxM) * ALTO_MAX;
  const hNeg = (Math.abs(momentoNegativoKNm) / maxM) * ALTO_MAX;

  const xInflexIzq = x0 + (x1 - x0) * 0.22;
  const xInflexDer = x1 - (x1 - x0) * 0.22;

  const alto = yEje + ALTO_MAX + 46;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id={flecha} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* Torsor: momento alrededor del eje de la viga */}
        {hayTorsion && (
          <g>
            <path
              d={`M${centro - 40} ${yTorsor + 8} A 26 14 0 1 1 ${centro + 40} ${yTorsor + 8}`}
              stroke="currentColor"
              strokeWidth="1.5"
              markerEnd={`url(#${flecha})`}
            />
            <text x={centro} y={yTorsor - 8} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
              Td {fmt(torsorKNm)} kN·m
            </text>
          </g>
        )}

        {/* Viga y apoyos */}
        <rect x={x0} y={yViga} width={x1 - x0} height={altoViga} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.5" />
        <path d={`M${x0} ${yViga + altoViga} L${x0 - 11} ${yBaseApoyo} L${x0 + 11} ${yBaseApoyo} Z`} stroke="currentColor" strokeWidth="1.4" />
        <circle cx={x1} cy={yViga + altoViga + 8} r="7" stroke="currentColor" strokeWidth="1.4" />
        {[x0, x1].map((x) => (
          <path key={x} d={`M${x - 15} ${yBaseApoyo} L${x + 15} ${yBaseApoyo}`} stroke="currentColor" strokeWidth="1.4" />
        ))}

        {/* Cortante: reacción vertical junto a cada apoyo */}
        {[x0 - 34, x1 + 34].map((x) => (
          <g key={x}>
            <path d={`M${x} ${yBaseApoyo} L${x} ${yViga + 2}`} stroke="currentColor" strokeWidth="1.6" markerEnd={`url(#${flecha})`} />
            <text x={x} y={yEtiquetaCorte} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
              Vd {fmt(cortanteKN)}
            </text>
            <text x={x} y={yEtiquetaCorte + 11} textAnchor="middle" className="fill-current font-mono" fontSize="7.5" opacity="0.65">
              kN
            </text>
          </g>
        ))}

        {/* Diagrama de momentos, con su eje propio */}
        <path d={`M${x0} ${yEje} L${x1} ${yEje}`} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />

        <path
          d={`M${x0} ${yEje - hNeg} Q${x0 + (xInflexIzq - x0) / 2} ${yEje - hNeg} ${xInflexIzq} ${yEje} L${x0} ${yEje} Z`}
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d={`M${x1} ${yEje - hNeg} Q${x1 - (x1 - xInflexDer) / 2} ${yEje - hNeg} ${xInflexDer} ${yEje} L${x1} ${yEje} Z`}
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d={`M${xInflexIzq} ${yEje} Q${centro} ${yEje + hPos * 2} ${xInflexDer} ${yEje} Z`}
          fill="currentColor"
          fillOpacity="0.28"
          stroke="currentColor"
          strokeWidth="1.3"
        />

        {/* Centrado en la zona de momento negativo, no en el apoyo: ahí se
            solapaba con la etiqueta del cortante. */}
        <text x={(x0 + xInflexIzq) / 2} y={yEje - hNeg - 8} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
          Mmax− {fmt(momentoNegativoKNm)}
        </text>
        <text x={(x0 + xInflexIzq) / 2} y={yEje - hNeg - 19} textAnchor="middle" className="fill-current font-mono" fontSize="7.5" opacity="0.65">
          tracciona arriba · kN·m
        </text>

        <text x={centro} y={yEje + hPos + 20} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
          Mmax+ {fmt(momentoPositivoKNm)}
        </text>
        <text x={centro} y={yEje + hPos + 31} textAnchor="middle" className="fill-current font-mono" fontSize="7.5" opacity="0.65">
          tracciona abajo · kN·m
        </text>
      </svg>

      <p className="max-w-lg text-center text-xs text-muted-foreground">
        Cada momento se dibuja del lado que tracciona, y su altura guarda la proporción con el
        otro. Vd es el cortante máximo, tomado junto al apoyo.
      </p>
    </div>
  );
}
