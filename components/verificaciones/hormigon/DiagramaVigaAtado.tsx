"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaVigaAtadoProps {
  luzM: number;
  hVigaM: number;
  /** Axil de atado: se dibuja en los dos sentidos porque puede ser tracción o compresión. */
  axilKN: number;
  /** q₁ si hay compactación, 0 si no. */
  cargaKNPorM: number;
}

/**
 * Alzado de la viga de atado entre dos zapatas. Muestra lo que la viga hace:
 * tirar o empujar de una zapata a la otra con el mismo axil, y, si hay
 * compactación, la q₁ repartida en la luz libre.
 *
 * Las zapatas no van a escala con la viga: sólo marcan dónde termina la luz.
 * No calcula: recibe el axil ya resuelto.
 */
export function DiagramaVigaAtado({ luzM, hVigaM, axilKN, cargaKNPorM }: DiagramaVigaAtadoProps) {
  const anchoZapata = 70;
  const W = 260;
  const x0 = 20;
  const xIzq = x0 + anchoZapata;
  const xDer = xIzq + W;
  const escala = W / luzM;

  const yTerreno = 150;
  const hZ = 34;
  const hV = Math.min(Math.max(hVigaM * escala, 12), hZ);
  const yViga = yTerreno - hV;
  const yMedioViga = yViga + hV / 2;

  const flechaDoble = (xa: number, xb: number, y: number) =>
    `M${xa} ${y} L${xb} ${y} M${xa + 6} ${y - 4} L${xa} ${y} L${xa + 6} ${y + 4} M${xb - 6} ${y - 4} L${xb} ${y} L${xb - 6} ${y + 4}`;

  const conCarga = cargaKNPorM > 0;
  const flechitas = conCarga
    ? Array.from({ length: 7 }, (_, i) => xIzq + 12 + (i * (W - 24)) / 6)
    : [];

  return (
    <svg viewBox={`0 0 ${xDer + anchoZapata + x0} ${yTerreno + 56}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* terreno */}
      <path d={`M${x0 - 10} ${yTerreno} L${xDer + anchoZapata + 10} ${yTerreno}`} stroke="currentColor" strokeWidth="1" opacity="0.4" />

      {/* zapatas y pilares */}
      {[x0, xDer].map((x) => (
        <g key={x}>
          <rect x={x} y={yTerreno - hZ} width={anchoZapata} height={hZ} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
          <rect x={x + anchoZapata / 2 - 9} y={yTerreno - hZ - 56} width={18} height={56} stroke="var(--mat-hormigon-borde)" strokeWidth="1.4" fill="var(--mat-hormigon)" />
        </g>
      ))}

      {/* viga */}
      <rect x={xIzq} y={yViga} width={W} height={hV} stroke="var(--mat-hormigon-borde)" strokeWidth="1.8" fill="var(--mat-hormigon)" />
      <path d={`M${xIzq} ${yViga + 4} L${xDer} ${yViga + 4} M${xIzq} ${yTerreno - 4} L${xDer} ${yTerreno - 4}`} stroke="var(--mat-armadura)" strokeWidth="1.4" />

      {/* axil de atado, en los dos sentidos */}
      <path d={flechaDoble(xIzq + 24, xDer - 24, yMedioViga - hV / 2 - 22)} stroke="currentColor" strokeWidth="1.6" />
      <text x={(xIzq + xDer) / 2} y={yMedioViga - hV / 2 - 28} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
        ± N = {fmt(axilKN, 0)} kN
      </text>

      {/* q₁ de la compactación */}
      {conCarga && (
        <g>
          {flechitas.map((x) => (
            <path key={x} d={`M${x} ${yViga - 14} L${x} ${yViga - 2} M${x - 3} ${yViga - 6} L${x} ${yViga - 2} L${x + 3} ${yViga - 6}`} stroke="currentColor" strokeWidth="1.1" opacity="0.8" />
          ))}
          <path d={`M${xIzq + 12} ${yViga - 14} L${xDer - 12} ${yViga - 14}`} stroke="currentColor" strokeWidth="1.1" opacity="0.8" />
        </g>
      )}

      {/* cota de la luz */}
      <path d={`M${xIzq} ${yTerreno + 18} L${xDer} ${yTerreno + 18} M${xIzq} ${yTerreno + 12} L${xIzq} ${yTerreno + 24} M${xDer} ${yTerreno + 12} L${xDer} ${yTerreno + 24}`} stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <text x={(xIzq + xDer) / 2} y={yTerreno + 36} textAnchor="middle" className="fill-current font-mono" fontSize="10">
        L = {fmt(luzM, 2)} m{conCarga ? ` · q₁ = ${fmt(cargaKNPorM, 0)} kN/m` : ""}
      </text>
    </svg>
  );
}
