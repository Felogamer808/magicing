"use client";

import { CotaV, Croquis, Referencia } from "./Croquis";

/**
 * Corte de un nervio de losa mixta con chapa colaborante: el hormigón se
 * apoya sobre la chapa y rellena el nervio, la chapa traza el perfil ondulado
 * y la barra adicional va suspendida cerca del fondo del nervio, no pegada a
 * la chapa. Sirve para las dos verificaciones —flexión y rasante— porque
 * comparten la misma geometría de entrada (dp, hc/hp, recubrimiento de la
 * barra).
 */
export function CroquisNervioSteelDeck() {
  const xLeft = 26;
  const x1 = 74; // fin de la cresta izquierda / arranque del alma
  const x2 = 94; // arranque del fondo del nervio
  const x3 = 150; // fin del fondo del nervio
  const x4 = 170; // fin del alma / arranque de la cresta derecha
  const xRight = 214;

  const yTop = 22; // cara superior del hormigón
  const yCresta = 64; // cresta del nervio: separa la capa maciza del nervio
  const yValle = 118; // cara inferior de la losa, fondo del nervio

  const chapaPath = `M${xLeft} ${yCresta} L${x1} ${yCresta} L${x2} ${yValle} L${x3} ${yValle} L${x4} ${yCresta} L${xRight} ${yCresta}`;
  const hormigonPath = `M${xLeft} ${yTop} L${xRight} ${yTop} L${xRight} ${yCresta} L${x4} ${yCresta} L${x3} ${yValle} L${x2} ${yValle} L${x1} ${yCresta} L${xLeft} ${yCresta} Z`;

  const xBarra = (x2 + x3) / 2;
  const yBarra = yValle - 16;

  return (
    <Croquis
      // Arranca en -20 y no en 0: los rótulos rotados de la izquierda ("h")
      // y la referencia de la barra necesitan ese margen o se recortan contra
      // el borde del viewBox.
      viewBox="-20 0 284 150"
      ancho="max-w-[19rem]"
      nota="El hormigón rellena el nervio hasta apoyarse en la chapa. dp es la profundidad del centroide de la chapa; la barra adicional va suspendida a su propio recubrimiento, no apoyada en la chapa."
    >
      <path d={hormigonPath} fill="var(--color-muted)" fillOpacity="0.4" stroke="currentColor" strokeWidth="1" opacity="0.85" />
      <path d={chapaPath} fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx={xBarra} cy={yBarra} r="4.5" fill="currentColor" />

      <CotaV x={xLeft - 14} y0={yTop} y1={yValle} texto="h" />
      <CotaV x={xRight + 14} y0={yTop} y1={yCresta} texto="hc" />
      <CotaV x={xRight + 32} y0={yTop} y1={yValle} texto="hp" />

      <Referencia x={40} y={yCresta - 8} hacia={[x1 + 6, yCresta - 2]} texto="chapa (Ap)" />
      <Referencia x={40} y={yBarra - 2} hacia={[xBarra - 6, yBarra]} texto="barra φ" anclaje="end" />

      <path
        d={`M${xBarra} ${yTop} L${xBarra} ${yBarra}`}
        stroke="currentColor"
        strokeWidth="0.7"
        strokeDasharray="2 2"
        opacity="0.55"
      />
      <text x={xBarra + 6} y={(yTop + yBarra) / 2} className="fill-current font-mono" fontSize="9.5" opacity="0.75">
        dp / d
      </text>

      <path
        d={`M${xBarra} ${yBarra} L${xBarra} ${yValle}`}
        stroke="currentColor"
        strokeWidth="0.7"
        strokeDasharray="2 2"
        opacity="0.55"
      />
      <text x={xBarra + 6} y={(yBarra + yValle) / 2 + 3} className="fill-current font-mono" fontSize="9.5" opacity="0.75">
        recub.
      </text>
    </Croquis>
  );
}
