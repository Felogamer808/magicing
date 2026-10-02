"use client";

/**
 * Estado de agotamiento de una sección de hormigón armado: deformaciones,
 * tensiones y las dos resultantes con su brazo.
 *
 * Es el dibujo que explica de dónde sale el resultado. Con μ, ω y As sueltos no
 * se ve dónde quedó la fibra neutra ni si el acero llega a fluir; acá se lee
 * directo, y si la sección está sobrearmada el bloque comprimido se ve invadir
 * el canto mientras la deformación del acero cae por debajo de la de fluencia.
 *
 * El bloque de compresiones es el rectangular equivalente del Eurocódigo: canto
 * 0,8·x y tensión fcd uniforme.
 *
 * Cada rótulo tiene su carril para que no se pisen: los títulos de columna
 * arriba, las cotas de x, 0,8x y d a la izquierda (separadas si quedan
 * cerca), la deformación del acero hacia la derecha —hacia la izquierda se
 * metía en la sección— y fcd sobre el bloque, no a la altura de C.
 */

interface Props {
  bM: number;
  hM: number;
  /** Canto útil. */
  dM: number;
  /** Profundidad de la fibra neutra. */
  xM: number;
  /** Brazo mecánico entre resultantes. */
  zM: number;
  deformacionAcero: number;
  /** Deformación de fluencia de la armadura, para saber si llega. */
  deformacionFluencia: number;
}

const ANCHO = 540;
const ALTO = 270;
const TOP = 58;
const BASE = ALTO - 22;
/** Separación mínima entre rótulos de un mismo carril, en unidades del dibujo. */
const SEPARACION_ROTULOS = 13;
/** Deformación del acero que ocupa el ancho entero de su triángulo. */
const DEFORMACION_ESCALA = 0.02;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Corre hacia abajo los rótulos que quedarían a menos de `min` del anterior. */
function separar(ys: readonly number[], min: number): number[] {
  const orden = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < orden.length; k++) {
    if (orden[k].y - orden[k - 1].y < min) orden[k].y = orden[k - 1].y + min;
  }
  const salida: number[] = [];
  for (const o of orden) salida[o.i] = o.y;
  return salida;
}

export function DiagramaRotura({
  bM, hM, dM, xM, zM, deformacionAcero, deformacionFluencia,
}: Props) {
  const alturaPx = BASE - TOP;
  const y = (m: number) => TOP + (m / hM) * alturaPx;

  const xSeccion = 84;
  const anchoSeccion = Math.min(96, (bM / hM) * alturaPx);

  // Deformaciones: compresión a la izquierda del eje, tracción a la derecha.
  const xDef = xSeccion + anchoSeccion + 58;
  const anchoDef = 80;
  const anchoComp = (anchoDef * 0.0035) / DEFORMACION_ESCALA;
  const anchoTrac = (anchoDef * Math.min(deformacionAcero, DEFORMACION_ESCALA)) / DEFORMACION_ESCALA;

  const xTen = xDef + anchoDef + 66;
  const anchoTen = 60;

  const yX = y(Math.min(xM, hM));
  const yBloque = y(Math.min(0.8 * xM, hM));
  const yD = y(dM);
  const yC = (TOP + yBloque) / 2;
  const fluye = deformacionAcero >= deformacionFluencia;

  const [rotX, rotBloque, rotD] = separar([yX + 3, yBloque + 3, yD + 3], SEPARACION_ROTULOS);
  const yTitulos = TOP - 26;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Agotamiento: fibra neutra a ${fmt(xM * 100)} cm y deformación del acero ${fmt(deformacionAcero * 1000, 2)} por mil, ${fluye ? "por encima" : "por debajo"} de la de fluencia`}>
        <text x={4} y={14} className={`text-[11px] ${fluye ? "fill-exito" : "fill-destructive font-medium"}`}>
          {fluye ? "El acero fluye antes de que rompa el hormigón" : "Sobrearmada: el acero no llega a fluir"}
        </text>

        {/* Títulos de columna, en su propio carril. */}
        {[
          [xSeccion + anchoSeccion / 2, "sección"],
          [xDef, "deformaciones"],
          [xTen + anchoTen / 2, "tensiones"],
        ].map(([x, t]) => (
          <text key={t} x={x} y={yTitulos} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
            {t}
          </text>
        ))}

        {/* --- Sección --- */}
        <rect x={xSeccion} y={TOP} width={anchoSeccion} height={alturaPx}
              fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth={1.3} />
        <rect x={xSeccion} y={TOP} width={anchoSeccion} height={yBloque - TOP}
              className="fill-primary/35" />
        <circle cx={xSeccion + anchoSeccion * 0.25} cy={yD} r={3} fill="var(--mat-armadura)" />
        <circle cx={xSeccion + anchoSeccion * 0.75} cy={yD} r={3} fill="var(--mat-armadura)" />

        {/* Fibra neutra: cruza sección y deformaciones, no la columna de tensiones. */}
        <line x1={xSeccion - 6} y1={yX} x2={xDef + anchoDef} y2={yX}
              className="stroke-destructive" strokeWidth={1.1} strokeDasharray="5 3" />

        {/* Cotas a la izquierda, con su línea de referencia si hubo que correrlas. */}
        {[
          [yX, rotX, `x = ${fmt(xM * 100)} cm`, "fill-destructive"],
          [yBloque, rotBloque, `0,8x = ${fmt(0.8 * xM * 100)} cm`, "fill-primary"],
          [yD, rotD, `d = ${fmt(dM * 100)} cm`, "fill-muted-foreground"],
        ].map(([yReal, yRot, t, clase]) => (
          <g key={t as string}>
            <path d={`M${xSeccion - 4} ${yReal} L${xSeccion - 10} ${(yRot as number) - 3}`}
                  className="stroke-foreground/40" strokeWidth={0.8} />
            <text x={xSeccion - 12} y={yRot as number} textAnchor="end" className={`text-[10.5px] ${clase}`}>
              {t}
            </text>
          </g>
        ))}

        {/* --- Deformaciones --- */}
        <line x1={xDef} y1={TOP - 6} x2={xDef} y2={BASE + 6} className="stroke-foreground/40" strokeWidth={1} />
        <polygon points={`${xDef},${TOP} ${xDef - anchoComp},${TOP} ${xDef},${yX}`}
                 className="fill-primary/25 stroke-primary" strokeWidth={1} />
        <text x={xDef - anchoComp - 4} y={TOP + 4} textAnchor="end" className="fill-primary text-[10.5px]">
          3,5 ‰
        </text>
        <polygon points={`${xDef},${yX} ${xDef + anchoTrac},${yD} ${xDef},${yD}`}
                 className="fill-destructive/20 stroke-destructive" strokeWidth={1} />
        {/* Debajo del triángulo: a su derecha chocaba con la línea de T. */}
        <text x={xDef + 4} y={yD + 16}
              className={`text-[10.5px] ${fluye ? "fill-exito" : "fill-destructive font-medium"}`}>
          εs = {fmt(deformacionAcero * 1000, 2)} ‰
        </text>

        {/* --- Tensiones y resultantes --- */}
        <rect x={xTen} y={TOP} width={anchoTen} height={yBloque - TOP}
              className="fill-primary/30 stroke-primary" strokeWidth={1} />
        {/* fcd como cota sobre el bloque: a media altura chocaba con C. */}
        <path d={`M${xTen} ${TOP - 5} L${xTen + anchoTen} ${TOP - 5}`} className="stroke-primary" strokeWidth={0.8} />
        <text x={xTen + anchoTen / 2} y={TOP - 9} textAnchor="middle" className="fill-primary text-[10.5px]">
          fcd
        </text>
        <line x1={xTen + anchoTen / 2} y1={yC} x2={xTen + anchoTen + 30} y2={yC}
              className="stroke-primary" strokeWidth={1.6} />
        <text x={xTen + anchoTen + 34} y={yC + 4} className="fill-primary text-[11px] font-semibold">C</text>
        <line x1={xTen} y1={yD} x2={xTen + anchoTen + 30} y2={yD}
              className="stroke-destructive" strokeWidth={1.6} />
        <text x={xTen + anchoTen + 34} y={yD + 4} className="fill-destructive text-[11px] font-semibold">T</text>
        {/* Brazo mecánico, con su rótulo girado para no invadir C ni T. */}
        <line x1={xTen + anchoTen + 20} y1={yC} x2={xTen + anchoTen + 20} y2={yD}
              className="stroke-foreground/60" strokeWidth={1} />
        <text x={xTen + anchoTen + 52} y={(yC + yD) / 2}
              textAnchor="middle"
              transform={`rotate(-90 ${xTen + anchoTen + 52} ${(yC + yD) / 2})`}
              className="fill-muted-foreground text-[10.5px]">
          z = {fmt(zM * 100)} cm
        </text>
      </svg>
    </figure>
  );
}
