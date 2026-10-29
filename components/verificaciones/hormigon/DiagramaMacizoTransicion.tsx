"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaMacizoTransicionProps {
  hM: number;
  anchoM: number;
  supPlanoM: number;
  infPlanoM: number;
  /** Del borde del pilar inferior a la cara del macizo, del lado de las esperas (m) */
  bordeM: number;
  /** e total, del eje del pilar inferior a la carga (m) */
  excentricidadM: number;
  /** Con resultado: el modelo de bielas y tirantes encima */
  modelo?: {
    zM: number;
    yEsperasM: number;
    yNudoCM: number;
    anchoNudoCM: number;
    sinTraccion: boolean;
    nKN: number;
    traccionEsperasKN: number;
    traccionTiranteKN: number;
    compresionCKN: number;
  };
}

/**
 * El macizo en alzado, en el plano de la excentricidad: el pilar superior
 * encima, el inferior debajo y, si ya hay resultado, el modelo con las bielas
 * a trazos y los tirantes llenos, como en el esquema del usuario. Dibuja a
 * escala real en las dos direcciones, porque el reparto se lee en las
 * proporciones. No calcula nada.
 */
function RotuloNudo({ cx, cy, letra }: { cx: number; cy: number; letra: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="8" fill="var(--background, white)" stroke="currentColor" strokeWidth="1.4" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-current font-mono" fontSize="11" fontWeight={700}>
        {letra}
      </text>
    </g>
  );
}

export function DiagramaMacizoTransicion({
  hM,
  anchoM,
  supPlanoM,
  infPlanoM,
  bordeM,
  excentricidadM,
  modelo,
}: DiagramaMacizoTransicionProps) {
  const W = 220;
  const escala = W / Math.max(anchoM, hM);
  const x0 = 70;
  const yTop = 70;
  const hPx = hM * escala;
  const yBase = yTop + hPx;
  // Origen en el eje del pilar inferior.
  const yIni = -infPlanoM / 2 - bordeM;
  const x = (y: number) => x0 + (y - yIni) * escala;
  const alto = yBase + (modelo ? 150 : 110);

  const xCarga = x(excentricidadM);
  const conTraccion = modelo && !modelo.sinTraccion;
  const yTir = modelo ? yBase - modelo.zM * escala : 0;

  return (
    <svg viewBox={`0 0 ${x0 + anchoM * escala + 90} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* pilar superior */}
      <rect x={x(excentricidadM - supPlanoM / 2)} y={yTop - 44} width={supPlanoM * escala} height={44}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <path d={`M${xCarga} ${yTop - 62} L${xCarga} ${yTop - 6}`} stroke="currentColor" strokeWidth="1.6" markerEnd="url(#macizo-flecha)" />
      <defs>
        <marker id="macizo-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      <text x={xCarga + 6} y={yTop - 50} className="fill-current font-mono" fontSize="11">
        Nd{modelo ? ` = ${fmt(modelo.nKN, 0)} kN` : ""}
      </text>

      {/* macizo y pilar inferior */}
      <rect x={x(yIni)} y={yTop} width={anchoM * escala} height={hPx} stroke="currentColor" strokeWidth="2" />
      <rect x={x(-infPlanoM / 2)} y={yBase} width={infPlanoM * escala} height={48}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <path d={`M${x(0)} ${yBase + 4} L${x(0)} ${yBase + 44}`} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />

      {modelo && (
        <>
          {/* zona comprimida del nudo C */}
          <rect x={x(modelo.yNudoCM - modelo.anchoNudoCM / 2)} y={yBase - 3} width={modelo.anchoNudoCM * escala} height={6}
                fill="currentColor" opacity="0.35" />
          {/* bielas */}
          <path d={`M${xCarga} ${conTraccion ? yTir : yTop} L${x(modelo.yNudoCM)} ${yBase}`}
                stroke="currentColor" strokeWidth="1.8" strokeDasharray="6 4" />
          {conTraccion && (
            <>
              <path d={`M${x(modelo.yEsperasM)} ${yTir} L${x(modelo.yNudoCM)} ${yBase}`}
                    stroke="currentColor" strokeWidth="1.8" strokeDasharray="6 4" />
              {/* tirante y esperas */}
              <path d={`M${x(modelo.yEsperasM)} ${yTir} L${xCarga} ${yTir}`} stroke="var(--color-destructive)" strokeWidth="2.6" />
              <path d={`M${x(modelo.yEsperasM)} ${yBase + 48} L${x(modelo.yEsperasM)} ${yTir}`}
                    stroke="var(--color-destructive)" strokeWidth="2.6" />
              <text x={x(yIni + anchoM) + 6} y={yTir + 4} className="font-mono" fontSize="10" fill="var(--color-destructive)">
                T = {fmt(modelo.traccionTiranteKN, 0)} kN
              </text>
              <text x={x(modelo.yEsperasM) - 6} y={yTop + hPx / 2} textAnchor="end" className="font-mono" fontSize="10" fill="var(--color-destructive)">
                Ts = {fmt(modelo.traccionEsperasKN, 0)}
              </text>
              <RotuloNudo cx={x(modelo.yEsperasM) - 12} cy={yTir - 12} letra="A" />
              <circle cx={x(modelo.yEsperasM)} cy={yTir} r="3.5" fill="currentColor" />
            </>
          )}
          <circle cx={xCarga} cy={conTraccion ? yTir : yTop} r="3.5" fill="currentColor" />
          <RotuloNudo cx={xCarga + 12} cy={(conTraccion ? yTir : yTop) + 14} letra="B" />
          <circle cx={x(modelo.yNudoCM)} cy={yBase} r="3.5" fill="currentColor" />
          <RotuloNudo cx={x(modelo.yNudoCM) - 14} cy={yBase - 14} letra="C" />
          <text x={x(infPlanoM / 2) + 6} y={yBase + 22} className="fill-current font-mono" fontSize="10">
            C = {fmt(modelo.compresionCKN, 0)} kN
          </text>
        </>
      )}

      {/* cotas */}
      <text x={x(0)} y={yBase + 66} textAnchor="middle" className="fill-current font-mono" fontSize="10" opacity="0.8">
        e = {fmt(excentricidadM, 3)} m
      </text>
      <path d={`M${x(0)} ${yBase + 56} L${xCarga} ${yBase + 56}`} stroke="currentColor" strokeWidth="0.8" />
      <text x={x0 - 8} y={yTop + hPx / 2} textAnchor="end" className="fill-current font-mono" fontSize="10" opacity={conTraccion ? 0 : 0.8}>
        h = {fmt(hM, 2)}
      </text>
      <text x={x0} y={alto - 8} className="fill-current font-mono" fontSize="9.5" opacity="0.7">
        macizo {fmt(anchoM, 2)} × {fmt(hM, 2)} m{modelo ? ` · z = ${fmt(modelo.zM, 3)} m` : ""}
      </text>
      {modelo && (
        <g className="fill-current font-mono" fontSize="9.5" opacity="0.85">
          <text x={x0} y={alto - 52}>B: bajo el pilar superior (k2 con tirante, k1 sin él)</text>
          <text x={x0} y={alto - 38}>C: cabeza del pilar inferior, comprimido (k1)</text>
          {conTraccion && <text x={x0} y={alto - 24}>A: tirante y esperas (k3)</text>}
        </g>
      )}
    </svg>
  );
}
