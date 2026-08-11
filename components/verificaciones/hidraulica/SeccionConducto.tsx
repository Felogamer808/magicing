"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface Props {
  diametroM: number;
  llenado: number;
  alturaM: number;
  /** El caudal supera la capacidad: se dibuja el tope y se avisa. */
  desborda: boolean;
}

/**
 * Sección del conducto con el agua a la altura que da el cálculo.
 *
 * Es el dibujo que hace evidente de un vistazo lo que la planilla sólo dice con
 * un número: cuánto del conducto queda ocupado. El grado de llenado es el dato
 * que más se mira y el que limita casi siempre.
 */
export function SeccionConducto({ diametroM, llenado, alturaM, desborda }: Props) {
  const cx = 70;
  const cy = 70;
  const r = 52;

  // y del pelo de agua, medido desde arriba del círculo.
  const yAgua = cy + r - 2 * r * llenado;
  // Media cuerda del pelo de agua, por Pitágoras sobre el radio.
  const dy = yAgua - cy;
  const semicuerda = Math.sqrt(Math.max(r * r - dy * dy, 0));

  return (
    <svg
      viewBox="0 0 250 148"
      className="h-auto w-full max-w-[17rem] text-primary"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        {/* El agua se recorta contra el círculo para que no se salga del tubo. */}
        <clipPath id="conducto-interior">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      <g clipPath="url(#conducto-interior)">
        <rect
          x={cx - r}
          y={yAgua}
          width={2 * r}
          height={cy + r - yAgua}
          fill="currentColor"
          fillOpacity={desborda ? 0.3 : 0.18}
        />
      </g>

      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="2" />

      {/* Pelo de agua */}
      {llenado > 0 && llenado < 1 && (
        <path
          d={`M${cx - semicuerda} ${yAgua} L${cx + semicuerda} ${yAgua}`}
          stroke="currentColor"
          strokeWidth="1.4"
        />
      )}

      {/* Cota del diámetro, horizontal por el eje */}
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.75">
        <path d={`M${cx - r} ${cy + r + 14} L${cx + r} ${cy + r + 14}`} />
        <path d={`M${cx - r} ${cy + r + 10} L${cx - r} ${cy + r + 18}`} />
        <path d={`M${cx + r} ${cy + r + 10} L${cx + r} ${cy + r + 18}`} />
      </g>
      <text
        x={cx}
        y={cy + r + 28}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="10"
      >
        D = {fmt(diametroM)} m
      </text>

      {/* Cota de la altura de agua, vertical a la derecha del tubo */}
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.75">
        <path d={`M${cx + r + 16} ${yAgua} L${cx + r + 16} ${cy + r}`} />
        <path d={`M${cx + r + 12} ${yAgua} L${cx + r + 20} ${yAgua}`} />
        <path d={`M${cx + r + 12} ${cy + r} L${cx + r + 20} ${cy + r}`} />
      </g>
      <path
        d={`M${cx + semicuerda} ${yAgua} L${cx + r + 16} ${yAgua}`}
        stroke="currentColor"
        strokeWidth="0.6"
        strokeDasharray="2 2"
        opacity="0.5"
      />
      <text x={cx + r + 26} y={(yAgua + cy + r) / 2} className="fill-current font-mono" fontSize="10">
        y = {fmt(alturaM)} m
      </text>
      <text
        x={cx + r + 26}
        y={(yAgua + cy + r) / 2 + 12}
        className="fill-current font-mono"
        fontSize="9"
        opacity="0.7"
      >
        y/D = {fmt(llenado, 3)}
      </text>

      {desborda && (
        <text x={cx} y={16} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
          el conducto no da: entra en carga
        </text>
      )}
    </svg>
  );
}
