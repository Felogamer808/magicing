"use client";

interface NivelCargaViento {
  nombre: string;
  zM: number;
  pcKNm: number;
  pcKNm2: number;
}

interface DiagramaCargaVientoProps {
  alturaTotalM: number;
  niveles: NivelCargaViento[];
}

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

interface Banda {
  nombre: string;
  bottomM: number;
  topM: number;
  valor: number;
}

/**
 * La altura de influencia de cada nivel (mitad hacia el vecino de abajo,
 * mitad hacia el de arriba) es la misma que usa calcularLado para integrar
 * Pc — se recalcula acá con las mismas mitades para que el peine de
 * flechas de pc quede exactamente del alto que corresponde a cada nivel.
 */
function bandasPorNivel(niveles: NivelCargaViento[], valorDe: (n: NivelCargaViento) => number): Banda[] {
  return niveles.map((n, i) => {
    const anterior = niveles[i - 1];
    const siguiente = niveles[i + 1];
    const mitadInferior = anterior ? (n.zM - anterior.zM) / 2 : 0;
    const mitadSuperior = siguiente ? (siguiente.zM - n.zM) / 2 : 0;
    return { nombre: n.nombre, bottomM: n.zM - mitadInferior, topM: n.zM + mitadSuperior, valor: valorDe(n) };
  });
}

/**
 * Dos vistas del mismo perfil, lado a lado: a la izquierda pc como carga
 * distribuida (un peine de flechas por la altura de influencia de cada
 * nivel), a la derecha Pc ya integrada con Kd, una única flecha por nivel.
 * La tabla numérica tiene el detalle exacto; esto es para ver de un
 * vistazo cómo se reparte cada una en altura.
 */
export function DiagramaCargaViento({ alturaTotalM, niveles }: DiagramaCargaVientoProps) {
  const W = 260;
  const yTop = 20;
  const yBase = 24 + niveles.length * 22 + 40;
  const x0 = 150;
  const x1 = 182;
  const flechaMaxLargo = 90;
  const margenIzq = x0 - flechaMaxLargo - 40;

  const yDe = (zM: number) => yBase - Math.min(zM / alturaTotalM, 1) * (yBase - yTop);
  const yEstructura = yDe(alturaTotalM);

  const bandasPresion = bandasPorNivel(niveles, (n) => n.pcKNm2);
  const maxPresion = Math.max(...bandasPresion.map((b) => Math.abs(b.valor)), 1e-9);
  const maxLineal = Math.max(...niveles.map((n) => Math.abs(n.pcKNm)), 1e-9);

  const suelo = (
    <>
      <path d={`M${margenIzq} ${yBase} L${x1 + 16} ${yBase}`} stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {Array.from({ length: 6 }).map((_, i) => (
        <path
          key={i}
          d={`M${margenIzq + i * 8} ${yBase + 6} L${margenIzq + i * 8 - 6} ${yBase}`}
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.4"
        />
      ))}
    </>
  );

  const estructura = (
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
  );

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-1">
          <p className="spec-label">Presión pc (kN/m²)</p>
          <svg viewBox={`0 0 ${W} ${yBase + 24}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
            <defs>
              <marker id="viento-peine-flecha" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor" />
              </marker>
            </defs>

            {suelo}
            {estructura}

            {bandasPresion.map((b) => {
              const yTopPx = yDe(b.topM);
              const yBottomPx = yDe(b.bottomM);
              const bandHeightPx = Math.max(yBottomPx - yTopPx, 1);
              const cantidad = Math.max(1, Math.round(bandHeightPx / 9));
              const largo = Math.max((Math.abs(b.valor) / maxPresion) * flechaMaxLargo, 12);
              const xIni = x0 - largo;
              const yMedio = (yTopPx + yBottomPx) / 2;
              return (
                <g key={b.nombre}>
                  {Array.from({ length: cantidad }).map((_, k) => {
                    const y = yTopPx + (bandHeightPx * (k + 0.5)) / cantidad;
                    return (
                      <path
                        key={k}
                        d={`M${xIni} ${y} L${x0 - 2} ${y}`}
                        stroke="currentColor"
                        strokeWidth="1.3"
                        markerEnd="url(#viento-peine-flecha)"
                      />
                    );
                  })}
                  <path d={`M${xIni} ${yTopPx} L${xIni} ${yBottomPx}`} stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                  <text x={xIni - 4} y={yMedio + 3} textAnchor="end" className="fill-current font-mono" fontSize="8">
                    {b.nombre} · {fmt(b.valor)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="spec-label">Carga lineal Pc (kN/m)</p>
          <svg viewBox={`0 0 ${W} ${yBase + 24}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
            <defs>
              <marker id="viento-lineal-flecha" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor" />
              </marker>
            </defs>

            {suelo}
            {estructura}

            {/* cota de altura total */}
            <g stroke="currentColor" strokeWidth="0.8" opacity="0.75">
              <path d={`M${x1 + 10} ${yEstructura} L${x1 + 22} ${yEstructura}`} />
              <path d={`M${x1 + 10} ${yBase} L${x1 + 22} ${yBase}`} />
              <path
                d={`M${x1 + 16} ${yEstructura} L${x1 + 16} ${yBase}`}
                markerStart="url(#viento-lineal-flecha)"
                markerEnd="url(#viento-lineal-flecha)"
              />
            </g>
            <text
              x={x1 + 32}
              y={(yEstructura + yBase) / 2}
              textAnchor="middle"
              className="fill-current font-mono"
              fontSize="8.5"
              transform={`rotate(-90 ${x1 + 32} ${(yEstructura + yBase) / 2})`}
            >
              h total = {fmt(alturaTotalM)} m
            </text>

            {niveles.map((n) => {
              const y = yDe(n.zM);
              const largo = Math.max((Math.abs(n.pcKNm) / maxLineal) * flechaMaxLargo, 12);
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
                    markerEnd="url(#viento-lineal-flecha)"
                  />
                  <text x={margenIzq} y={y - 4} textAnchor="start" className="fill-current font-mono" fontSize="9">
                    {n.nombre} · z={fmt(n.zM)} m
                  </text>
                  <text x={margenIzq} y={y + 10} textAnchor="start" className="fill-current font-mono" fontSize="8" opacity="0.7">
                    Pc {fmt(n.pcKNm)} kN/m
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <p className="max-w-lg text-center text-xs text-muted-foreground">
        A la izquierda, pc como carga distribuida sobre la altura de influencia de cada nivel; a la
        derecha, Pc ya integrada (con Kd) como una única acción por nivel. Los largos son
        proporcionales dentro de cada gráfico, no una escala absoluta.
      </p>
    </div>
  );
}
