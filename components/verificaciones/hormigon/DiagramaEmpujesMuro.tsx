"use client";

/**
 * Empujes sobre un muro de contención, con el muro dibujado a escala.
 *
 * Los tres empujes tienen formas distintas y actúan a alturas distintas, y de
 * ahí sale que el vuelco lo gobierne casi siempre el suelo activo aunque la
 * sobrecarga parezca comparable en total: el triángulo del suelo empuja al
 * tercio inferior, con poco brazo respecto de la puntera, mientras que el
 * rectángulo de la sobrecarga lo hace a media altura. Verlos superpuestos es lo
 * que explica el reparto del momento volcador.
 *
 * El empuje pasivo se dibuja del otro lado porque resiste, no vuelca.
 */

interface Props {
  /** Altura total de la pieza construida, alzado más zapata. */
  alturaTotalM: number;
  /**
   * Altura de suelo retenido, que es sobre la que actúan los empujes. No tiene
   * por qué coincidir con la altura del muro: si el relleno no llega a la
   * coronación, el diagrama arranca más abajo.
   */
  alturaSueloActivoM: number;
  alturaMuroM: number;
  espesorMuroM: number;
  anchoZapataM: number;
  cantoZapataM: number;
  alturaSueloPasivoM: number;
  ka: number;
  kp: number;
  gammaKNm3: number;
  sobrecargaKPa: number;
  empujeSueloKN: number;
  empujeSobrecargaKN: number;
  empujePasivoKN: number;
}

const ANCHO = 460;
const ALTO = 250;
const Y_BASE = ALTO - 44;
const X_MURO = 210;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaEmpujesMuro({
  alturaTotalM, alturaSueloActivoM, alturaMuroM, espesorMuroM, anchoZapataM, cantoZapataM,
  alturaSueloPasivoM, ka, kp, gammaKNm3, sobrecargaKPa,
  empujeSueloKN, empujeSobrecargaKN, empujePasivoKN,
}: Props) {
  /*
   * La altura del dibujo es la mayor entre la del muro construido y la del suelo
   * retenido: no tienen por qué coincidir, y el diagrama de empujes se mide
   * desde la base de la zapata.
   */
  const alturaDibujoM = Math.max(alturaTotalM, cantoZapataM + alturaMuroM);
  const escala = Math.min(150 / alturaDibujoM, 120 / anchoZapataM);
  const py = (m: number) => Y_BASE - m * escala;
  const px = (m: number) => m * escala;

  // Presiones en la base, que fijan el ancho de cada diagrama.
  const presionSueloBase = ka * gammaKNm3 * alturaSueloActivoM;
  const presionSobrecarga = ka * sobrecargaKPa;
  const presionPasivaBase = kp * gammaKNm3 * alturaSueloPasivoM;
  const presionMax = Math.max(presionSueloBase + presionSobrecarga, presionPasivaBase, 1);
  const anchoDiagrama = 118;
  const pp = (kPa: number) => (kPa / presionMax) * anchoDiagrama;

  // El alzado apoya sobre la zapata, no sobre la base.
  const yTopZapata = py(cantoZapataM);
  const yCoronacionMuro = py(cantoZapataM + alturaMuroM);
  // El diagrama de empujes se dibuja desde donde arranca el suelo retenido.
  const yCoronacion = py(alturaSueloActivoM);

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Empujes sobre el muro: suelo ${fmt(empujeSueloKN, 0)} kN, sobrecarga ${fmt(empujeSobrecargaKN, 0)} kN, pasivo ${fmt(empujePasivoKN, 0)} kN`}>
        {/* Zapata y alzado. */}
        <rect x={X_MURO - px(anchoZapataM) * 0.35} y={yTopZapata}
              width={px(anchoZapataM)} height={px(cantoZapataM)}
              className="fill-primary/10 stroke-foreground/60" strokeWidth={1.3} />
        <rect x={X_MURO} y={yCoronacionMuro} width={px(espesorMuroM)} height={px(alturaMuroM)}
              className="fill-primary/10 stroke-foreground/60" strokeWidth={1.3} />

        {/* Terreno retenido, del lado del trasdós. */}
        <line x1={X_MURO + px(espesorMuroM)} y1={yCoronacion}
              x2={ANCHO - 10} y2={yCoronacion}
              className="stroke-foreground/40" strokeWidth={1} />
        {/* Terreno delantero, que da el empuje pasivo. */}
        <line x1={10} y1={py(alturaSueloPasivoM)} x2={X_MURO - px(anchoZapataM) * 0.35}
              y2={py(alturaSueloPasivoM)} className="stroke-foreground/40" strokeWidth={1} />

        {/*
          Los dos se apilan para que juntos den el trapecio real de presiones:
          la sobrecarga aporta un ancho constante pegado al muro y el suelo, un
          triángulo que arranca donde termina aquélla. A cualquier profundidad la
          suma de los dos anchos es la presión total ka·q + ka·γ·z, que es lo que
          importa leer. Los colores se mantienen separados para poder distinguir
          de dónde viene cada parte.
        */}
        <polygon
          points={`${X_MURO + px(espesorMuroM) + pp(presionSobrecarga)},${yCoronacion} ${X_MURO + px(espesorMuroM) + pp(presionSobrecarga) + pp(presionSueloBase)},${Y_BASE} ${X_MURO + px(espesorMuroM) + pp(presionSobrecarga)},${Y_BASE}`}
          className="fill-destructive/25 stroke-destructive" strokeWidth={1.2} />
        <line x1={X_MURO + px(espesorMuroM) + pp(presionSobrecarga) + pp(presionSueloBase) + 26} y1={py(alturaSueloActivoM / 3)}
              x2={X_MURO + px(espesorMuroM) + 4} y2={py(alturaSueloActivoM / 3)}
              className="stroke-destructive" strokeWidth={1.8} />
        <polygon points={`${X_MURO + px(espesorMuroM) + 4},${py(alturaSueloActivoM / 3)} ${X_MURO + px(espesorMuroM) + 13},${py(alturaSueloActivoM / 3) - 4} ${X_MURO + px(espesorMuroM) + 13},${py(alturaSueloActivoM / 3) + 4}`}
                 className="fill-destructive" />
        <text x={X_MURO + px(espesorMuroM) + pp(presionSobrecarga) + pp(presionSueloBase) + 30} y={py(alturaSueloActivoM / 3) + 3}
              className="fill-destructive text-[9px]">
          Ea = {fmt(empujeSueloKN, 0)} kN · h/3
        </text>

        {/* --- Empuje de la sobrecarga: rectángulo, resultante a media altura --- */}
        {sobrecargaKPa > 0 && (
          <>
            <rect x={X_MURO + px(espesorMuroM)} y={yCoronacion}
                  width={pp(presionSobrecarga)} height={Y_BASE - yCoronacion}
                  className="fill-amber-500/25 stroke-amber-600" strokeWidth={1.2} />
            <text x={X_MURO + px(espesorMuroM) + pp(presionSobrecarga) + pp(presionSueloBase) + 30}
                  y={py(alturaSueloActivoM * 0.72) + 3} className="fill-amber-700 text-[9px]">
              Eq = {fmt(empujeSobrecargaKN, 0)} kN · h/2
            </text>
          </>
        )}

        {/* --- Empuje pasivo, del lado que resiste --- */}
        {empujePasivoKN > 0 && (
          <>
            <polygon
              points={`${X_MURO - px(anchoZapataM) * 0.35},${py(alturaSueloPasivoM)} ${X_MURO - px(anchoZapataM) * 0.35 - pp(presionPasivaBase)},${Y_BASE} ${X_MURO - px(anchoZapataM) * 0.35},${Y_BASE}`}
              className="fill-emerald-600/25 stroke-emerald-700" strokeWidth={1.2} />
            <text x={X_MURO - px(anchoZapataM) * 0.35 - pp(presionPasivaBase) - 4}
                  y={py(alturaSueloPasivoM / 3) + 3} textAnchor="end"
                  className="fill-emerald-700 text-[9px]">
              Ep = {fmt(empujePasivoKN, 0)} kN
            </text>
          </>
        )}

        {/* Punto de vuelco: la puntera. */}
        <circle cx={X_MURO - px(anchoZapataM) * 0.35} cy={Y_BASE} r={3.5}
                className="fill-foreground" />
        <text x={X_MURO - px(anchoZapataM) * 0.35} y={Y_BASE + 15} textAnchor="middle"
              className="fill-muted-foreground text-[9px]">puntera</text>

        <line x1={6} y1={Y_BASE} x2={ANCHO - 6} y2={Y_BASE}
              className="stroke-foreground/50" strokeWidth={1.2} />

        <text x={8} y={16} className="fill-muted-foreground text-[9px]">
          ka = {fmt(ka, 3)} · kp = {fmt(kp, 2)} · γ = {fmt(gammaKNm3, 0)} kN/m³
        </text>
        <text x={8} y={ALTO - 6} className="fill-muted-foreground text-[9px]">
          El triángulo empuja al tercio inferior y el rectángulo a media altura: por eso pesan
          distinto en el vuelco.
        </text>
      </svg>
    </figure>
  );
}
