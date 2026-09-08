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
 * mitad hacia el de arriba) es la misma que usa alturasInfluencia en
 * viento.ts para integrar Pc — se recalcula acá con las mismas mitades para
 * que el peine de flechas de pc quede exactamente del alto que corresponde
 * a cada nivel. El suelo (z=0) es el vecino implícito del primer nivel, así
 * que su banda baja hasta la mitad del primer piso, no hasta su propia
 * cota: la otra mitad queda sin banda a propósito (reacciona directo en la
 * base, no se reparte a ningún nivel).
 */
function bandasPorNivel(niveles: NivelCargaViento[], valorDe: (n: NivelCargaViento) => number): Banda[] {
  return niveles.map((n, i) => {
    const anterior = niveles[i - 1];
    const siguiente = niveles[i + 1];
    const mitadInferior = anterior ? (n.zM - anterior.zM) / 2 : n.zM / 2;
    const mitadSuperior = siguiente ? (siguiente.zM - n.zM) / 2 : 0;
    return { nombre: n.nombre, bottomM: n.zM - mitadInferior, topM: n.zM + mitadSuperior, valor: valorDe(n) };
  });
}

/** Cotas donde una banda termina y empieza la siguiente, para trazar la separación entre niveles. */
function bordesDeNivel(niveles: NivelCargaViento[]): number[] {
  const cotas = new Set<number>();
  bandasPorNivel(niveles, () => 0).forEach((b) => {
    cotas.add(b.topM);
    cotas.add(b.bottomM);
  });
  return Array.from(cotas).sort((a, b) => a - b);
}

/**
 * Dos vistas del mismo perfil, apiladas: arriba pc como carga distribuida
 * (un peine de flechas por la altura de influencia de cada nivel), abajo Pc
 * ya integrada con Kd, una única flecha por nivel. Van apiladas y no lado a
 * lado —aunque el diagrama en sí es angosto— para que cada una ocupe todo
 * el ancho de la tarjeta en vez de la mitad: es lo que hace que el texto se
 * pueda leer. La tabla numérica tiene el detalle exacto; esto es para ver
 * de un vistazo cómo se reparte cada una en altura.
 */
export function DiagramaCargaViento({ alturaTotalM, niveles }: DiagramaCargaVientoProps) {
  const W = 260;
  const yTop = 20;
  const yBase = 24 + niveles.length * 26 + 40;
  const x0 = 150;
  const x1 = 182;
  const flechaMaxLargo = 90;
  const margenIzq = x0 - flechaMaxLargo - 40;

  const yDe = (zM: number) => yBase - Math.min(zM / alturaTotalM, 1) * (yBase - yTop);
  const yEstructura = yDe(alturaTotalM);

  const bandasPresion = bandasPorNivel(niveles, (n) => n.pcKNm2);
  const maxPresion = Math.max(...bandasPresion.map((b) => Math.abs(b.valor)), 1e-9);
  const maxLineal = Math.max(...niveles.map((n) => Math.abs(n.pcKNm)), 1e-9);
  const bordes = bordesDeNivel(niveles);

  const lineasDeSeparacion = (
    <>
      {bordes.map((zM) => (
        <path
          key={`borde-${zM}`}
          d={`M${margenIzq} ${yDe(zM)} L${x1} ${yDe(zM)}`}
          stroke="currentColor"
          strokeWidth="0.7"
          strokeDasharray="3 3"
          opacity="0.35"
        />
      ))}
    </>
  );

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
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-1.5">
        <p className="spec-label text-sm">Presión pc (kN/m²)</p>
        <svg viewBox={`0 0 ${W} ${yBase + 24}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
          <defs>
            <marker id="viento-peine-flecha" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
            </marker>
          </defs>

          {suelo}
          {estructura}
          {lineasDeSeparacion}

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
                      strokeWidth="1.6"
                      markerEnd="url(#viento-peine-flecha)"
                    />
                  );
                })}
                <path d={`M${xIni} ${yTopPx} L${xIni} ${yBottomPx}`} stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <text x={xIni - 5} y={yMedio + 4} textAnchor="end" className="fill-current font-mono font-medium" fontSize="11">
                  {b.nombre} · {fmt(b.valor)}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="max-w-xl text-center text-xs text-muted-foreground">
          Las líneas punteadas separan la altura de influencia de cada nivel. El tramo entre el
          suelo y la primera —medio piso— no tiene banda a propósito: esa franja reacciona directo
          en la base, no se reparte a ningún nivel.
        </p>
      </div>

      <div className="flex w-full max-w-xl flex-col items-center gap-1.5">
        <p className="spec-label text-sm">Carga lineal Pc (kN/m)</p>
        <svg viewBox={`0 0 ${W} ${yBase + 24}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
          <defs>
            <marker id="viento-lineal-flecha" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
            </marker>
          </defs>

          {suelo}
          {estructura}
          {lineasDeSeparacion}

          {/* cota de altura total */}
          <g stroke="currentColor" strokeWidth="1" opacity="0.75">
            <path d={`M${x1 + 10} ${yEstructura} L${x1 + 22} ${yEstructura}`} />
            <path d={`M${x1 + 10} ${yBase} L${x1 + 22} ${yBase}`} />
            <path
              d={`M${x1 + 16} ${yEstructura} L${x1 + 16} ${yBase}`}
              markerStart="url(#viento-lineal-flecha)"
              markerEnd="url(#viento-lineal-flecha)"
            />
          </g>
          <text
            x={x1 + 33}
            y={(yEstructura + yBase) / 2}
            textAnchor="middle"
            className="fill-current font-mono font-medium"
            fontSize="11"
            transform={`rotate(-90 ${x1 + 33} ${(yEstructura + yBase) / 2})`}
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
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                  opacity="0.3"
                />
                <path
                  d={`M${xIni} ${y} L${x0 - 2} ${y}`}
                  stroke="currentColor"
                  strokeWidth="2"
                  markerEnd="url(#viento-lineal-flecha)"
                />
                <text x={margenIzq} y={y - 5} textAnchor="start" className="fill-current font-mono font-medium" fontSize="12">
                  {n.nombre} · z={fmt(n.zM)} m
                </text>
                <text x={margenIzq} y={y + 12} textAnchor="start" className="fill-current font-mono" fontSize="11" opacity="0.75">
                  Pc {fmt(n.pcKNm)} kN/m
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="max-w-xl text-center text-sm text-muted-foreground">
        Arriba, pc como carga distribuida sobre la altura de influencia de cada nivel; abajo, Pc ya
        integrada (con Kd) como una única acción por nivel. Los largos son proporcionales dentro de
        cada gráfico, no una escala absoluta.
      </p>
    </div>
  );
}
