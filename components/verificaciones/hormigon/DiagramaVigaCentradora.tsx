"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaVigaCentradoraProps {
  AM: number;
  anchoPilarAM: number;
  distanciaColumnaLimiteM: number;
  luzM: number;
  hZapataM: number;
  hVigaM: number;
  nkKN: number;
  reaccionKN: number;
  descargaKN: number;
}

/**
 * Alzado de la palanca: el límite a la izquierda, la zapata de medianería con
 * el pilar contra él, la viga hasta la zapata interior y las tres fuerzas que
 * la equilibran. Se ve por qué funciona: R₁ cae en el centro de la zapata,
 * corrida hacia adentro respecto de Nk, y la diferencia la tira la interior.
 *
 * No calcula: recibe R₁ y ΔN ya resueltos.
 */
export function DiagramaVigaCentradora({
  AM,
  anchoPilarAM,
  distanciaColumnaLimiteM,
  luzM,
  hZapataM,
  hVigaM,
  nkKN,
  reaccionKN,
  descargaKN,
}: DiagramaVigaCentradoraProps) {
  const xColumnaM = distanciaColumnaLimiteM + anchoPilarAM / 2;
  const largoM = xColumnaM + luzM + AM / 2;
  const W = 330;
  const escala = W / largoM;
  const x0 = 40;
  const x = (m: number) => x0 + m * escala;

  const yTerreno = 150;
  const hZ = Math.max(hZapataM * escala, 14);
  const hV = Math.max(hVigaM * escala, 12);
  const yZapata = yTerreno - hZ;
  const yViga = yTerreno - hV;

  const xPilar = x(xColumnaM);
  const xCentroZapata = x(AM / 2);
  const xInterior = x(xColumnaM + luzM);
  const anchoInterior = AM * escala;

  const flechaAbajo = (cx: number, y1: number, y2: number) =>
    `M${cx} ${y1} L${cx} ${y2} M${cx - 4} ${y2 - 6} L${cx} ${y2} L${cx + 4} ${y2 - 6}`;
  const flechaArriba = (cx: number, y1: number, y2: number) =>
    `M${cx} ${y1} L${cx} ${y2} M${cx - 4} ${y2 + 6} L${cx} ${y2} L${cx + 4} ${y2 + 6}`;

  return (
    <svg viewBox={`0 0 ${x0 + W + 40} ${yTerreno + 64}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* límite de propiedad */}
      <path d={`M${x0} 20 L${x0} ${yTerreno + 30}`} stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.7" />
      {/* Abajo y del lado de afuera: arriba se pisa con la carga del pilar. */}
      <text x={x0 - 4} y={yTerreno + 28} textAnchor="end" className="fill-current font-mono" fontSize="9.5" opacity="0.7">límite</text>

      {/* zapatas y viga */}
      <rect x={x(0)} y={yZapata} width={AM * escala} height={hZ} stroke="var(--mat-hormigon-borde)" strokeWidth="1.8" fill="var(--mat-hormigon)" />
      <rect x={xInterior - anchoInterior / 2} y={yZapata} width={anchoInterior} height={hZ} stroke="var(--mat-hormigon-borde)" strokeWidth="1.4" strokeDasharray="5 3" fill="var(--mat-hormigon)" />
      <rect x={xPilar} y={yViga} width={xInterior - xPilar} height={hV} stroke="var(--mat-hormigon-borde)" strokeWidth="1.8" fill="var(--mat-hormigon)" />

      {/* pilar medianero */}
      <rect x={x(distanciaColumnaLimiteM)} y={yViga - 50} width={Math.max(anchoPilarAM * escala, 8)} height={50} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />

      {/* fuerzas */}
      <path d={flechaAbajo(xPilar, yViga - 88, yViga - 54)} stroke="currentColor" strokeWidth="1.6" />
      <text x={xPilar + 6} y={yViga - 76} className="fill-current font-mono" fontSize="10.5">Nk = {fmt(nkKN, 0)} kN</text>

      <path d={flechaArriba(xCentroZapata, yTerreno + 34, yTerreno + 4)} stroke="currentColor" strokeWidth="1.6" />
      <text x={xCentroZapata} y={yTerreno + 48} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
        R₁ = {fmt(reaccionKN, 0)} kN
      </text>

      <path d={flechaAbajo(xInterior, yTerreno + 4, yTerreno + 34)} stroke="currentColor" strokeWidth="1.6" />
      <text x={xInterior} y={yTerreno + 48} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
        ΔN = {fmt(descargaKN, 0)} kN
      </text>

      <text x={(xPilar + xInterior) / 2} y={yViga - 6} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.8">
        viga centradora · L = {fmt(luzM, 2)} m
      </text>
    </svg>
  );
}
