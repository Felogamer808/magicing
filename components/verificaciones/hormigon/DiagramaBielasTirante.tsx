"use client";

/**
 * Modelo de bielas y tirantes de un cabezal de dos pilotes.
 *
 * El cabezal no trabaja como una viga: es una pieza de gran canto donde la carga
 * del pilar baja por dos bielas comprimidas inclinadas hasta los pilotes, y un
 * tirante horizontal en la cara inferior las cose. La armadura principal es ese
 * tirante, y su tracción sale de la geometría del triángulo, no de un momento
 * flector. Dibujarlo es lo que explica por qué la armadura no depende del canto
 * como en una viga sino de la inclinación de las bielas.
 *
 * La inclinación es lo que conviene mirar: cuanto más plana la biela —cabezal
 * bajo o pilotes muy separados— más tira del tirante para el mismo axil.
 */

interface Props {
  /** Separación entre ejes de pilotes. */
  separacionPilotesM: number;
  /** Brazo del eje del pilote a la cara del pilar. */
  vM: number;
  hM: number;
  dM: number;
  anchoPilarM: number;
  diametroPiloteM: number;
  /** Axil de cálculo que baja por el pilar. */
  ndPilarKN: number;
  ndPorPiloteKN: number;
  /** Tracción del tirante. */
  tdKN: number;
}

const ANCHO = 440;
const ALTO = 250;
const MARGEN_X = 46;
const Y_TOP = 58;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaBielasTirante({
  separacionPilotesM, vM, hM, dM, anchoPilarM, diametroPiloteM,
  ndPilarKN, ndPorPiloteKN, tdKN,
}: Props) {
  // El cabezal vuela medio diámetro de pilote a cada lado del eje.
  const anchoTotalM = separacionPilotesM + diametroPiloteM;
  const escala = Math.min((ANCHO - 2 * MARGEN_X) / anchoTotalM, 108 / hM);

  const xCentro = ANCHO / 2;
  const yTop = Y_TOP;
  const yBase = yTop + hM * escala;
  const mediaSep = (separacionPilotesM / 2) * escala;

  const xIzqCabezal = xCentro - (anchoTotalM / 2) * escala;
  const anchoCabezalPx = anchoTotalM * escala;

  /*
   * Nudos del modelo, tal como los toma el cálculo: la biela no arranca del eje
   * del pilar sino de un cuarto de su ancho hacia afuera, y el brazo vertical no
   * es el canto útil entero sino 0,85·d. De ahí sale
   * Td = Nd,pilote·(v + a/4)/(0,85·d), y por eso el ángulo dibujado es más
   * tendido que el que daría unir simplemente el eje del pilar con el pilote.
   */
  const brazoHorizontalM = vM + anchoPilarM / 4;
  const brazoVerticalM = 0.85 * dM;

  const yTirante = yTop + dM * escala;
  const yNudoSuperior = yTop + (dM - brazoVerticalM) * escala;
  const xPiloteIzq = xCentro - mediaSep;
  const xPiloteDer = xCentro + mediaSep;
  const desplazamientoNudo = (anchoPilarM / 4) * escala;

  const anguloGrados = (Math.atan2(brazoVerticalM, brazoHorizontalM) * 180) / Math.PI;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Bielas a ${fmt(anguloGrados)} grados y tirante de ${fmt(tdKN, 0)} kN`}>
        {/* Cabezal. */}
        <rect x={xIzqCabezal} y={yTop} width={anchoCabezalPx} height={hM * escala}
              className="fill-primary/5 stroke-foreground/60" strokeWidth={1.3} />

        {/* Pilar y su carga. */}
        <rect x={xCentro - (anchoPilarM / 2) * escala} y={yTop - 26}
              width={anchoPilarM * escala} height={26}
              className="fill-muted-foreground/20 stroke-foreground/60" strokeWidth={1.2} />
        <line x1={xCentro} y1={yTop - 52} x2={xCentro} y2={yTop - 28}
              className="stroke-foreground" strokeWidth={1.8} />
        <polygon points={`${xCentro},${yTop - 26} ${xCentro - 5},${yTop - 35} ${xCentro + 5},${yTop - 35}`}
                 className="fill-foreground" />
        <text x={xCentro + 8} y={yTop - 40} className="fill-foreground text-[10.5px]">
          Nd = {fmt(ndPilarKN, 0)} kN
        </text>

        {/* Pilotes. */}
        {[xPiloteIzq, xPiloteDer].map((cx, i) => (
          <g key={i}>
            <rect x={cx - (diametroPiloteM / 2) * escala} y={yBase}
                  width={diametroPiloteM * escala} height={30}
                  className="fill-muted-foreground/20 stroke-foreground/60" strokeWidth={1.2} />
            <line x1={cx} y1={yBase + 46} x2={cx} y2={yBase + 32}
                  className="stroke-primary" strokeWidth={1.8} />
            <polygon points={`${cx},${yBase + 30} ${cx - 5},${yBase + 39} ${cx + 5},${yBase + 39}`}
                     className="fill-primary" />
          </g>
        ))}
        <text x={xPiloteIzq} y={yBase + 58} textAnchor="middle" className="fill-primary text-[10.5px]">
          {fmt(ndPorPiloteKN, 0)} kN
        </text>
        <text x={xPiloteDer} y={yBase + 58} textAnchor="middle" className="fill-primary text-[10.5px]">
          {fmt(ndPorPiloteKN, 0)} kN
        </text>

        {/* Bielas comprimidas, desde el cuarto del ancho del pilar hasta cada pilote. */}
        {[-1, 1].map((signo) => (
          <line key={signo}
                x1={xCentro + signo * desplazamientoNudo} y1={yNudoSuperior}
                x2={signo < 0 ? xPiloteIzq : xPiloteDer} y2={yTirante}
                className="stroke-primary" strokeWidth={5} strokeLinecap="round" opacity={0.5} />
        ))}
        <text x={(xCentro + xPiloteIzq) / 2 - 34} y={(yNudoSuperior + yTirante) / 2}
              className="fill-primary text-[10.5px]">
          biela {fmt(anguloGrados)}°
        </text>

        {/* Tirante traccionado. */}
        <line x1={xPiloteIzq} y1={yTirante} x2={xPiloteDer} y2={yTirante}
              className="stroke-destructive" strokeWidth={5} strokeLinecap="round" />
        <text x={xCentro} y={yTirante + 18} textAnchor="middle"
              className="fill-destructive text-[11.5px] font-medium">
          tirante Td = {fmt(tdKN, 0)} kN
        </text>

        {/* Nudos. */}
        {[-1, 1].map((s) => (
          <circle key={s} cx={xCentro + s * desplazamientoNudo} cy={yNudoSuperior} r={3.5}
                  className="fill-foreground" />
        ))}
        <circle cx={xPiloteIzq} cy={yTirante} r={3.5} className="fill-foreground" />
        <circle cx={xPiloteDer} cy={yTirante} r={3.5} className="fill-foreground" />

        {/* Cotas: los dos brazos del modelo, no las dimensiones brutas. */}
        <line x1={xCentro - desplazamientoNudo} y1={yTirante + 30} x2={xPiloteIzq} y2={yTirante + 30}
              className="stroke-muted-foreground" strokeWidth={1} />
        <text x={(xCentro - desplazamientoNudo + xPiloteIzq) / 2} y={yTirante + 42} textAnchor="middle"
              className="fill-muted-foreground text-[10.5px]">
          v + a/4 = {fmt(brazoHorizontalM * 100)} cm
        </text>
        <line x1={xIzqCabezal - 12} y1={yNudoSuperior} x2={xIzqCabezal - 12} y2={yTirante}
              className="stroke-muted-foreground" strokeWidth={1} />
        <text x={xIzqCabezal - 15} y={(yNudoSuperior + yTirante) / 2} textAnchor="end"
              className="fill-muted-foreground text-[10.5px]">
          0,85·d
        </text>

        <text x={MARGEN_X - 34} y={ALTO - 6} className="fill-muted-foreground text-[10.5px]">
          Td = Nd,pilote · (v + a/4) / (0,85·d): cuanto más plana la biela, más tira el tirante.
        </text>
      </svg>
    </figure>
  );
}
