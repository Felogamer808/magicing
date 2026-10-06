"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaVuelosVigaProps {
  AM: number;
  BM: number;
  hZapataM: number;
  bVigaM: number;
  /** Canto útil de la parrilla paralela a B (m). */
  dM: number;
}

/**
 * Qué son los "vuelos a los lados de la viga": en planta, las dos alas de la
 * zapata de medianería que sobresalen a cada lado de la viga; en el corte
 * transversal, esas alas como ménsulas que cuelgan de la viga, empujadas por
 * el terreno, con la sección de flexión (0,15·b dentro de la cara, art.
 * 9.8.2.2) y la de cortante (a d de la cara, art. 6.2.2).
 *
 * No calcula: sólo dibuja la geometría que ya está en los datos.
 */
export function DiagramaVuelosViga({ AM, BM, hZapataM, bVigaM, dM }: DiagramaVuelosVigaProps) {
  const vueloM = Math.max((BM - bVigaM) / 2, 0);

  // ---------------------------------------------------------------- planta
  const P = 150;
  const sP = P / Math.max(AM, BM);
  const px0 = 50;
  const py0 = 30;
  const wA = AM * sP;
  const hB = BM * sP;
  const yViga1 = py0 + (hB - bVigaM * sP) / 2;
  const yViga2 = yViga1 + bVigaM * sP;

  // ----------------------------------------------------------------- corte
  const C = 210;
  const sC = C / BM;
  const cx0 = px0 + wA + 70;
  const cyTerreno = 150;
  const hZ = Math.max(hZapataM * sC, 16);
  const cyZapata = cyTerreno - hZ;
  const xCara1 = cx0 + vueloM * sC;
  const xCara2 = xCara1 + bVigaM * sC;
  const hV = 40;
  const xFlex1 = xCara1 + 0.15 * bVigaM * sC;
  const xFlex2 = xCara2 - 0.15 * bVigaM * sC;
  const dC = dM * sC;
  const corteVisible = dM < vueloM;

  const flechaArriba = (x: number) =>
    `M${x} ${cyTerreno + 22} L${x} ${cyTerreno + 3} M${x - 3} ${cyTerreno + 8} L${x} ${cyTerreno + 3} L${x + 3} ${cyTerreno + 8}`;
  const flechas: number[] = [];
  for (let i = 0; i <= 8; i++) flechas.push(cx0 + 6 + (i * (C - 12)) / 8);

  const ancho = cx0 + C + 70;

  return (
    <svg viewBox={`0 0 ${ancho} 215`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <defs>
        <pattern id="rayado-vuelo" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 L0 6" stroke="currentColor" strokeWidth="1" opacity="0.45" />
        </pattern>
      </defs>

      {/* ============ PLANTA ============ */}
      <text x={px0} y={16} className="fill-current font-mono" fontSize="10" opacity="0.8">Planta</text>
      {/* límite */}
      <path d={`M${px0} ${py0 - 10} L${px0} ${py0 + hB + 10}`} stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.7" />
      <text x={px0 - 4} y={py0 + hB + 22} textAnchor="end" className="fill-current font-mono" fontSize="9" opacity="0.7">límite</text>
      {/* alas rayadas */}
      <rect x={px0} y={py0} width={wA} height={yViga1 - py0} fill="url(#rayado-vuelo)" />
      <rect x={px0} y={yViga2} width={wA} height={py0 + hB - yViga2} fill="url(#rayado-vuelo)" />
      {/* zapata */}
      <rect x={px0} y={py0} width={wA} height={hB} stroke="currentColor" strokeWidth="1.8" />
      {/* viga: entra por el centro y sigue hacia la zapata interior */}
      <rect x={px0} y={yViga1} width={wA + 34} height={yViga2 - yViga1} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.8" />
      <text x={px0 + wA + 4} y={yViga1 - 4} className="fill-current font-mono" fontSize="9">viga →</text>
      <text x={px0 + wA / 2} y={(py0 + yViga1) / 2 + 3} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">vuelo</text>
      <text x={px0 + wA / 2} y={(yViga2 + py0 + hB) / 2 + 3} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">vuelo</text>
      {/* cotas */}
      <text x={px0 + wA / 2} y={py0 + hB + 22} textAnchor="middle" className="fill-current font-mono" fontSize="9">A = {fmt(AM, 2)}</text>
      <text x={px0 + wA + 6} y={py0 + hB - 4} className="fill-current font-mono" fontSize="9">B = {fmt(BM, 2)}</text>
      {/* traza del corte */}
      <path d={`M${px0 + wA * 0.5} ${py0 - 12} L${px0 + wA * 0.5} ${py0 + hB + 8}`} stroke="var(--color-destructive)" strokeWidth="1" strokeDasharray="6 3" />
      <text x={px0 + wA * 0.5 + 3} y={py0 - 4} className="font-mono" fontSize="9" fill="var(--color-destructive)">corte</text>

      {/* ============ CORTE TRANSVERSAL ============ */}
      <text x={cx0} y={16} className="fill-current font-mono" fontSize="10" opacity="0.8">Corte (dirección B)</text>
      {/* zapata con las alas rayadas */}
      <rect x={cx0} y={cyZapata} width={C} height={hZ} stroke="currentColor" strokeWidth="1.8" />
      <rect x={cx0} y={cyZapata} width={xCara1 - cx0} height={hZ} fill="url(#rayado-vuelo)" />
      <rect x={xCara2} y={cyZapata} width={cx0 + C - xCara2} height={hZ} fill="url(#rayado-vuelo)" />
      {/* viga, que hace de pilar */}
      <rect x={xCara1} y={cyZapata - hV} width={xCara2 - xCara1} height={hV} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.8" />
      <text x={(xCara1 + xCara2) / 2} y={cyZapata - hV - 6} textAnchor="middle" className="fill-current font-mono" fontSize="9">viga b = {fmt(bVigaM, 2)}</text>
      {/* presión del terreno */}
      {flechas.map((x) => (
        <path key={x} d={flechaArriba(x)} stroke="currentColor" strokeWidth="1" opacity="0.6" />
      ))}
      <text x={cx0 + C / 2} y={cyTerreno + 34} textAnchor="middle" className="fill-current font-mono" fontSize="9" opacity="0.8">presión del terreno</text>
      {/* sección de flexión */}
      {[xFlex1, xFlex2].map((x) => (
        <path key={x} d={`M${x} ${cyZapata - 8} L${x} ${cyTerreno + 2}`} stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
      ))}
      <text x={xCara1 - 3} y={cyZapata - 12} textAnchor="end" className="fill-current font-mono" fontSize="8.5">flexión</text>
      {/* sección de cortante, a d de la cara */}
      {corteVisible &&
        [xCara1 - dC, xCara2 + dC].map((x) => (
          <path key={x} d={`M${x} ${cyZapata - 8} L${x} ${cyTerreno + 2}`} stroke="var(--color-destructive)" strokeWidth="1.2" strokeDasharray="3 2" />
        ))}
      {corteVisible && (
        <text x={xCara2 + dC + 3} y={cyZapata - 10} className="font-mono" fontSize="8.5" fill="var(--color-destructive)">cortante (a d)</text>
      )}
      {/* cota del vuelo */}
      <path d={`M${cx0} ${cyTerreno + 46} L${xCara1} ${cyTerreno + 46}`} stroke="currentColor" strokeWidth="0.8" />
      <text x={(cx0 + xCara1) / 2} y={cyTerreno + 58} textAnchor="middle" className="fill-current font-mono" fontSize="9">vuelo {fmt(vueloM, 2)}</text>
      <path d={`M${xCara2} ${cyTerreno + 46} L${cx0 + C} ${cyTerreno + 46}`} stroke="currentColor" strokeWidth="0.8" />
      <text x={(xCara2 + cx0 + C) / 2} y={cyTerreno + 58} textAnchor="middle" className="fill-current font-mono" fontSize="9">vuelo {fmt(vueloM, 2)}</text>
    </svg>
  );
}
