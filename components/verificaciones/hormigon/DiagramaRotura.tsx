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

/** El ancho reserva sitio a las cotas de la izquierda y a las resultantes de la derecha. */
const ANCHO = 470;
const ALTO = 200;
const TOP = 26;
const BASE = ALTO - 30;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaRotura({
  bM, hM, dM, xM, zM, deformacionAcero, deformacionFluencia,
}: Props) {
  const alturaPx = BASE - TOP;
  const y = (m: number) => TOP + (m / hM) * alturaPx;

  const anchoSeccion = Math.min(96, (bM / hM) * alturaPx);
  // Se deja hueco a la izquierda para las cotas de x, 0,8x y d.
  const xSeccion = 46;

  // Tres columnas: sección, deformaciones y tensiones con las resultantes.
  const xDef = xSeccion + anchoSeccion + 46;
  const anchoDef = 74;
  const xTen = xDef + anchoDef + 54;
  const anchoTen = 68;

  const yX = y(Math.min(xM, hM));
  const yBloque = y(Math.min(0.8 * xM, hM));
  const yD = y(dM);
  const fluye = deformacionAcero >= deformacionFluencia;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Agotamiento: fibra neutra a ${fmt(xM * 100)} cm y deformación del acero ${fmt(deformacionAcero * 1000, 2)} por mil`}>
        {/* --- Sección --- */}
        <rect x={xSeccion} y={TOP} width={anchoSeccion} height={alturaPx}
              className="fill-primary/5 stroke-foreground/60" strokeWidth={1.3} />
        {/* Zona comprimida efectiva. */}
        <rect x={xSeccion} y={TOP} width={anchoSeccion} height={yBloque - TOP}
              className="fill-primary/35" />
        <line x1={xSeccion - 8} y1={yX} x2={xTen + anchoTen + 8} y2={yX}
              className="stroke-destructive" strokeWidth={1.1} strokeDasharray="5 3" />
        <text x={xSeccion + anchoSeccion / 2} y={BASE + 13} textAnchor="middle"
              className="fill-muted-foreground text-[10.5px]">
          sección
        </text>
        {/* Armadura traccionada. */}
        <circle cx={xSeccion + anchoSeccion * 0.25} cy={yD} r={2.6} className="fill-foreground" />
        <circle cx={xSeccion + anchoSeccion * 0.75} cy={yD} r={2.6} className="fill-foreground" />

        {/* --- Deformaciones --- */}
        <line x1={xDef} y1={TOP - 8} x2={xDef} y2={BASE + 8} className="stroke-foreground/40" strokeWidth={1} />
        <polygon points={`${xDef},${TOP} ${xDef + anchoDef},${TOP} ${xDef},${yX}`}
                 className="fill-primary/25 stroke-primary" strokeWidth={1} />
        <polygon points={`${xDef},${yX} ${xDef - (anchoDef * Math.min(deformacionAcero, 0.02)) / 0.02},${yD} ${xDef},${yD}`}
                 className="fill-destructive/20 stroke-destructive" strokeWidth={1} />
        <text x={xDef + anchoDef + 3} y={TOP + 4} className="fill-primary text-[10.5px]">3,5 ‰</text>
        <text x={xDef - (anchoDef * Math.min(deformacionAcero, 0.02)) / 0.02 - 3} y={yD + 3}
              textAnchor="end"
              className={`text-[10.5px] ${fluye ? "fill-emerald-700" : "fill-destructive font-medium"}`}>
          {fmt(deformacionAcero * 1000, 2)} ‰
        </text>
        <text x={xDef + anchoDef / 2} y={BASE + 13} textAnchor="middle"
              className="fill-muted-foreground text-[10.5px]">deformaciones</text>

        {/* --- Tensiones y resultantes --- */}
        <rect x={xTen} y={TOP} width={anchoTen} height={yBloque - TOP}
              className="fill-primary/30 stroke-primary" strokeWidth={1} />
        <text x={xTen + anchoTen + 4} y={(TOP + yBloque) / 2 + 3} className="fill-primary text-[10.5px]">
          fcd
        </text>
        {/* Resultante de compresión, en el centro del bloque. */}
        <line x1={xTen} y1={(TOP + yBloque) / 2} x2={xTen + anchoTen + 26} y2={(TOP + yBloque) / 2}
              className="stroke-primary" strokeWidth={1.6} />
        <text x={xTen + anchoTen + 30} y={(TOP + yBloque) / 2 + 3} className="fill-primary text-[10.5px]">C</text>
        {/* Resultante de tracción. */}
        <line x1={xTen} y1={yD} x2={xTen + anchoTen + 26} y2={yD}
              className="stroke-destructive" strokeWidth={1.6} />
        <text x={xTen + anchoTen + 30} y={yD + 3} className="fill-destructive text-[10.5px]">T</text>
        {/* Brazo mecánico. */}
        <line x1={xTen + anchoTen + 18} y1={(TOP + yBloque) / 2} x2={xTen + anchoTen + 18} y2={yD}
              className="stroke-foreground/60" strokeWidth={1} />
        <text x={xTen + anchoTen + 22} y={((TOP + yBloque) / 2 + yD) / 2}
              className="fill-muted-foreground text-[10.5px]">
          z = {fmt(zM * 100)} cm
        </text>
        <text x={xTen + anchoTen / 2} y={BASE + 13} textAnchor="middle"
              className="fill-muted-foreground text-[10.5px]">tensiones</text>

        {/* Cotas de x y del bloque. */}
        <text x={xSeccion - 6} y={yX + 3} textAnchor="end" className="fill-destructive text-[10.5px]">
          x = {fmt(xM * 100)}
        </text>
        <text x={xSeccion - 6} y={yBloque - 3} textAnchor="end" className="fill-primary text-[10.5px]">
          0,8x
        </text>
        <text x={xSeccion - 6} y={yD + 3} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          d = {fmt(dM * 100)}
        </text>

        <text x={ANCHO - 4} y={12} textAnchor="end"
              className={`text-[10.5px] ${fluye ? "fill-emerald-700" : "fill-destructive font-medium"}`}>
          {fluye ? "el acero fluye antes que rompa el hormigón" : "sobrearmada: el acero no llega a fluir"}
        </text>
      </svg>
    </figure>
  );
}
