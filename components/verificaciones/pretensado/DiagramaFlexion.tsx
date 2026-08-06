"use client";

/**
 * Equilibrio de la sección en rotura: bloque de compresiones, fibra neutra y las
 * dos tracciones, con sus brazos.
 *
 * Sirve sobre todo para leer la ductilidad. Si `c` sube demasiado, la sección se
 * sobrearma y φ deja de valer 0,9; el dibujo lo muestra antes que el número,
 * porque se ve el bloque comprimido comiéndose el canto.
 */

interface Props {
  hM: number;
  bM: number;
  dpM: number;
  dsM: number;
  aM: number;
  cM: number;
  deformacionNeta: number;
  controladaPorTraccion: boolean;
  hayPasiva: boolean;
}

const ANCHO = 340;
const ALTO = 200;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaFlexion({
  hM,
  bM,
  dpM,
  dsM,
  aM,
  cM,
  deformacionNeta,
  controladaPorTraccion,
  hayPasiva,
}: Props) {
  const escala = Math.min(150 / bM, (ALTO - 56) / hM);
  const px = (m: number) => m * escala;

  /** Deja sitio a la izquierda para el diagrama de deformaciones y su cota. */
  const xIzq = 46;
  const yTop = 24;
  const yBase = yTop + px(hM);
  const anchoSeccion = px(bM);
  const xDer = xIzq + anchoSeccion;

  const yC = yTop + px(cM);
  const yDp = yTop + px(dpM);
  const yDs = yTop + px(dsM);

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Rotura: bloque comprimido de ${fmt(aM * 100)} cm y fibra neutra a ${fmt(cM * 100)} cm`}>
        {/* Sección. */}
        <rect x={xIzq} y={yTop} width={anchoSeccion} height={px(hM)}
              className="fill-primary/5 stroke-foreground/60" strokeWidth={1.3} />

        {/* Bloque rectangular de compresiones. */}
        <rect x={xIzq} y={yTop} width={anchoSeccion} height={px(aM)}
              className="fill-primary/40 stroke-primary" strokeWidth={1} />
        <text x={xIzq + anchoSeccion / 2} y={yTop + px(aM) / 2 + 3} textAnchor="middle"
              className="fill-foreground text-[9px]">
          a = {fmt(aM * 100)} cm
        </text>

        {/* Fibra neutra. */}
        <line x1={xIzq - 8} y1={yC} x2={xDer + 8} y2={yC}
              className="stroke-destructive" strokeWidth={1.2} strokeDasharray="5 3" />
        <text x={xDer + 11} y={yC + 3} className="fill-destructive text-[9px]">
          c = {fmt(cM * 100)} cm
        </text>

        {/* Tracción del pretensado. */}
        <line x1={xIzq - 6} y1={yDp} x2={xDer + 6} y2={yDp}
              className="stroke-primary" strokeWidth={1} />
        <circle cx={xIzq + anchoSeccion / 2} cy={yDp} r={3} className="fill-primary" />
        <text x={xDer + 11} y={yDp + 3} className="fill-primary text-[9px]">
          Tp · dp = {fmt(dpM * 100)} cm
        </text>

        {/* Tracción de la armadura pasiva, si la hay. */}
        {hayPasiva && Math.abs(dsM - dpM) > 1e-6 && (
          <>
            <circle cx={xIzq + anchoSeccion / 2 - 14} cy={yDs} r={2.4} className="fill-muted-foreground" />
            <circle cx={xIzq + anchoSeccion / 2 + 14} cy={yDs} r={2.4} className="fill-muted-foreground" />
            <text x={xDer + 11} y={yDs + 3} className="fill-muted-foreground text-[9px]">
              Ts · ds = {fmt(dsM * 100)} cm
            </text>
          </>
        )}

        {/* Diagrama de deformaciones, esquemático, a la izquierda. */}
        <line x1={xIzq - 18} y1={yTop} x2={xIzq - 18} y2={yBase}
              className="stroke-foreground/30" strokeWidth={0.8} />
        <polygon points={`${xIzq - 18},${yTop} ${xIzq - 6},${yTop} ${xIzq - 18},${yC}`}
                 className="fill-primary/25" />
        <text x={xIzq - 20} y={yTop + 8} textAnchor="end" className="fill-muted-foreground text-[8px]">
          0,003
        </text>

        {/* Lectura de ductilidad. */}
        <text x={xIzq} y={ALTO - 8}
              className={`text-[10px] ${controladaPorTraccion ? "fill-emerald-700" : "fill-destructive font-medium"}`}>
          εt = {fmt(deformacionNeta * 1000, 2)} ‰ —{" "}
          {controladaPorTraccion ? "controlada por tracción (φ = 0,9)" : "sobrearmada, φ reducido"}
        </text>
      </svg>
    </figure>
  );
}
