"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaApeoVoladizoProps {
  hM: number;
  luzM: number;
  voladizoM: number;
  extremoLibreM: number;
  extremoLejanoM: number;
  zM: number;
  anchoCargaM: number;
  anchoApoyoCercanoM: number;
  anchoApoyoLejanoM: number;
  anchoElementoLejanoM: number;
  pKN: number;
  reaccionCercanaKN: number;
  reaccionLejanaMinKN: number;
  traccionTiranteKN: number;
}

/**
 * La viga de frente, con la carga en voladizo a la izquierda y el modelo de
 * bielas y tirantes encima: biela de la carga al apoyo cercano, tirante
 * superior hasta el apoyo lejano y biela de vuelta. Si el apoyo lejano se
 * levanta, el montante sobre él se dibuja lleno, como tirante; si no, a trazos,
 * como puntal.
 *
 * Dibuja a escala real en las dos direcciones: estas piezas son cortas y el
 * canto pesa en la lectura del modelo. No calcula nada.
 */
export function DiagramaApeoVoladizo({
  hM,
  luzM,
  voladizoM,
  extremoLibreM,
  extremoLejanoM,
  zM,
  anchoCargaM,
  anchoApoyoCercanoM,
  anchoApoyoLejanoM,
  anchoElementoLejanoM,
  pKN,
  reaccionCercanaKN,
  reaccionLejanaMinKN,
  traccionTiranteKN,
}: DiagramaApeoVoladizoProps) {
  const largoM = extremoLibreM + voladizoM + luzM + extremoLejanoM;
  const W = 320;
  const escala = W / Math.max(largoM, hM * 1.2);
  const x0 = 50;
  const y0 = 70;
  const hPx = hM * escala;
  const yBase = y0 + hPx;

  const x = (m: number) => x0 + m * escala;
  const xCarga = x(extremoLibreM);
  const xCerca = x(extremoLibreM + voladizoM);
  const xLejos = x(extremoLibreM + voladizoM + luzM);
  const xFin = x(largoM);

  const yTirante = yBase - zM * escala;
  const levanta = reaccionLejanaMinKN < 0;

  const alto = yBase + 70;

  return (
    <svg viewBox={`0 0 ${x0 + W + 60} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* elementos que bajan sobre la viga */}
      <rect x={xCarga - (anchoCargaM * escala) / 2} y={y0 - 36} width={anchoCargaM * escala} height={36}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <rect x={xLejos - (anchoElementoLejanoM * escala) / 2} y={y0 - 36} width={anchoElementoLejanoM * escala} height={36}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <text x={xCarga} y={y0 - 44} textAnchor="middle" className="fill-current font-mono" fontSize="11">
        P = {fmt(pKN, 0)} kN
      </text>

      {/* apoyos */}
      <rect x={xCerca - (anchoApoyoCercanoM * escala) / 2} y={yBase} width={anchoApoyoCercanoM * escala} height={30}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <rect x={xLejos - (anchoApoyoLejanoM * escala) / 2} y={yBase} width={anchoApoyoLejanoM * escala} height={30}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />

      {/* viga */}
      <rect x={x0} y={y0} width={xFin - x0} height={hPx} stroke="currentColor" strokeWidth="2.2" />

      {/* modelo */}
      <path d={`M${xCarga} ${yTirante} L${xCerca} ${yBase}`} stroke="currentColor" strokeWidth="1.8" strokeDasharray="6 4" />
      <path d={`M${xCerca} ${yBase} L${xLejos} ${yTirante}`} stroke="currentColor" strokeWidth="1.8" strokeDasharray="6 4" />
      <path d={`M${xCarga} ${yTirante} L${xLejos} ${yTirante}`} stroke="var(--color-destructive)" strokeWidth="2.6" />
      <path d={`M${xLejos} ${yTirante} L${xLejos} ${yBase}`} stroke={levanta ? "var(--color-destructive)" : "currentColor"}
            strokeWidth={levanta ? 2.6 : 1.8} strokeDasharray={levanta ? undefined : "6 4"} />
      {[xCarga, xCerca, xLejos].map((cx, i) => (
        <circle key={i} cx={cx} cy={i === 1 ? yBase : yTirante} r="3.5" fill="currentColor" />
      ))}
      <circle cx={xLejos} cy={yBase} r="3.5" fill="currentColor" />

      {/* Debajo del tirante: arriba se pisa con el borde de la viga, que está a d′. */}
      <text x={(xCarga + xLejos) / 2} y={yTirante + 14} textAnchor="middle" className="font-mono" fontSize="10.5" fill="var(--color-destructive)">
        T = {fmt(traccionTiranteKN, 0)} kN
      </text>

      {/* reacciones */}
      <text x={xCerca} y={yBase + 46} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
        R = {fmt(reaccionCercanaKN, 0)} kN
      </text>
      <text x={xLejos} y={yBase + 46} textAnchor="middle" className="font-mono" fontSize="10.5"
            fill={levanta ? "var(--color-destructive)" : "currentColor"}>
        R mín = {fmt(reaccionLejanaMinKN, 0)} kN
      </text>
      <text x={x0} y={alto - 6} className="fill-current font-mono" fontSize="9.5" opacity="0.7">
        h = {fmt(hM, 2)} m · z = {fmt(zM, 3)} m · L = {fmt(luzM, 2)} m · a = {fmt(voladizoM, 2)} m
      </text>
    </svg>
  );
}
