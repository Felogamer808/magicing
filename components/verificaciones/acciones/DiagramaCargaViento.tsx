"use client";

interface NivelCargaViento {
  nombre: string;
  zM: number;
  pcKNm: number;
}

interface DiagramaCargaVientoProps {
  alturaTotalM: number;
  niveles: NivelCargaViento[];
}

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * Esquema final: la estructura de perfil, con una flecha por nivel
 * proporcional a la carga lineal Pc que le corresponde. La tabla numérica ya
 * tiene el dato; esto es para ver de un vistazo dónde se concentra la acción
 * del viento en altura.
 */
export function DiagramaCargaViento({ alturaTotalM, niveles }: DiagramaCargaVientoProps) {
  const W = 380;
  const yTop = 20;
  const yBase = 24 + niveles.length * 22 + 40;
  const x0 = 210;
  const x1 = 246;
  const flechaMaxLargo = 150;
  const margenIzq = x0 - flechaMaxLargo - 46;

  const maxPc = Math.max(...niveles.map((n) => Math.abs(n.pcKNm)), 1e-9);
  const yDe = (zM: number) => yBase - Math.min(zM / alturaTotalM, 1) * (yBase - yTop);
  const yEstructura = yDe(alturaTotalM);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${yBase + 24}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id="carga-viento-flecha" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* suelo */}
        <path d={`M${margenIzq} ${yBase} L${x1 + 16} ${yBase}`} stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            d={`M${margenIzq + i * 10} ${yBase + 6} L${margenIzq + i * 10 - 6} ${yBase}`}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.4"
          />
        ))}

        {/* estructura */}
        <rect
          x={x0}
          y={yEstructura}
          width={x1 - x0}
          height={yBase - yEstructura}
          stroke="currentColor"
          strokeWidth="1.6"
          fill="var(--color-muted)"
          fillOpacity="0.4"
        />

        {/* cota de altura total */}
        <g stroke="currentColor" strokeWidth="0.8" opacity="0.75">
          <path d={`M${x1 + 10} ${yEstructura} L${x1 + 22} ${yEstructura}`} />
          <path d={`M${x1 + 10} ${yBase} L${x1 + 22} ${yBase}`} />
          <path
            d={`M${x1 + 16} ${yEstructura} L${x1 + 16} ${yBase}`}
            markerStart="url(#carga-viento-flecha)"
            markerEnd="url(#carga-viento-flecha)"
          />
        </g>
        <text
          x={x1 + 32}
          y={(yEstructura + yBase) / 2}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9.5"
          transform={`rotate(-90 ${x1 + 32} ${(yEstructura + yBase) / 2})`}
        >
          h total = {fmt(alturaTotalM)} m
        </text>

        {niveles.map((n) => {
          const y = yDe(n.zM);
          const largo = Math.max((Math.abs(n.pcKNm) / maxPc) * flechaMaxLargo, 16);
          const xIni = x0 - largo;
          return (
            <g key={n.nombre}>
              <path
                d={`M${margenIzq} ${y} L${x0} ${y}`}
                stroke="currentColor"
                strokeWidth="0.7"
                strokeDasharray="2 2"
                opacity="0.3"
              />
              <path
                d={`M${xIni} ${y} L${x0 - 2} ${y}`}
                stroke="currentColor"
                strokeWidth="1.6"
                markerEnd="url(#carga-viento-flecha)"
              />
              <text x={margenIzq} y={y - 4} textAnchor="start" className="fill-current font-mono" fontSize="9.5">
                {n.nombre} · z={fmt(n.zM)} m
              </text>
              <text x={margenIzq} y={y + 10} textAnchor="start" className="fill-current font-mono" fontSize="8" opacity="0.7">
                Pc {fmt(n.pcKNm)} kN/m
              </text>
            </g>
          );
        })}
      </svg>
      <p className="max-w-lg text-center text-xs text-muted-foreground">
        Cada flecha es la carga lineal Pc de ese nivel; el largo es proporcional entre niveles, no
        una escala absoluta de kN/m.
      </p>
    </div>
  );
}
