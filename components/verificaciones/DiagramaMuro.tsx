"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaMuroProps {
  anchoZapataM: number;
  cantoZapataM: number;
  alturaMuroM: number;
  espesorMuroM: number;
  alturaSueloActivoM: number;
  /** Altura de suelo del lado pasivo, el que queda por delante de la puntera. */
  alturaSueloPasivoM: number;
  /** Vuelo por delante del alzado. Cero deja el alzado al ras del borde. */
  punteraM: number;
}

/** Separación mínima entre rótulos de nivel para que no se encimen (px de viewBox). */
const SEP_MIN_ROTULOS = 11;

interface NivelPreparado {
  cota: number;
  /** Altura real del nivel en el dibujo. */
  y: number;
  /** Altura a la que se escribe el rótulo, que puede estar corrida para no pisar otro. */
  yRotulo: number;
}

/**
 * Ordena los niveles de arriba hacia abajo, descarta los que coinciden y separa
 * los rótulos que quedarían encimados.
 *
 * Encimarse es el caso normal, no el raro: con el suelo activo enrasado con la
 * coronación, o el pasivo justo sobre la zapata, dos cotas caen en el mismo
 * píxel. Cuando un rótulo se corre, se dibuja su línea de referencia hasta la
 * altura verdadera para que siga estando claro a qué nivel pertenece.
 */
function prepararNiveles(crudos: { cota: number; y: number }[]): NivelPreparado[] {
  const unicos = new Map<string, { cota: number; y: number }>();
  for (const nivel of crudos) {
    const clave = nivel.cota.toFixed(3);
    if (!unicos.has(clave)) unicos.set(clave, nivel);
  }

  let ultimoRotulo = -Infinity;
  return [...unicos.values()]
    .sort((a, b) => a.y - b.y)
    .map((nivel) => {
      const yRotulo = Math.max(nivel.y, ultimoRotulo + SEP_MIN_ROTULOS);
      ultimoRotulo = yRotulo;
      return { ...nivel, yRotulo };
    });
}

/** Cota de nivel con el signo delante, y el cero marcado como origen. */
function etiquetaNivel(cota: number): string {
  return cota === 0 ? `±0,00` : `+${fmt(cota)}`;
}

/**
 * Sección del muro con el terreno de los dos lados y el diagrama triangular de
 * empuje activo, que crece con la profundidad: es lo que explica que la
 * resultante quede en el tercio inferior y no a media altura.
 *
 * El alzado se sitúa según la puntera, no pegado al borde: con puntera nula
 * queda al ras —el caso del muro contra un límite de propiedad— y al crecer se
 * corre hacia el talón. Sin eso el dibujo mostraba siempre la misma sección
 * aunque se cambiara el dato.
 *
 * A la derecha va la pica de niveles, con el origen en la cara inferior de la
 * zapata. Se toma ahí y no en el terreno porque es la única cota que no depende
 * de ningún dato de suelo: el resto de las alturas del cálculo (hAct y hPas)
 * están medidas desde ese mismo plano, así que el dibujo y los números hablan
 * del mismo origen.
 */
export function DiagramaMuro({
  anchoZapataM, cantoZapataM, alturaMuroM, espesorMuroM,
  alturaSueloActivoM, alturaSueloPasivoM, punteraM,
}: DiagramaMuroProps) {
  const totalH = alturaMuroM + cantoZapataM;
  const escala = Math.min(200 / totalH, 150 / Math.max(anchoZapataM, 0.1));
  const zapW = anchoZapataM * escala;
  const zapH = cantoZapataM * escala;
  const muroW = espesorMuroM * escala;
  const muroH = alturaMuroM * escala;

  // La cota de H se corrió al extremo izquierdo para dejar entre ella y el muro
  // el hueco donde ahora se dibuja el terreno del lado pasivo.
  const xCota = 20;
  const xSueloPas = 36;
  const x0 = 112;
  // Borde delantero de la zapata; el alzado arranca una puntera más adentro.
  const xMuro = x0 + Math.max(punteraM, 0) * escala;
  const talonM = Math.max(anchoZapataM - punteraM - espesorMuroM, 0);
  const yBase = 24 + muroH + zapH;

  const xSueloDer = x0 + zapW + 56;
  const xPica = xSueloDer + 14;

  const nFlechas = 4;
  const hActPx = Math.min(alturaSueloActivoM * escala, muroH + zapH);
  const hPasPx = Math.min(Math.max(alturaSueloPasivoM, 0) * escala, muroH + zapH);

  const niveles = prepararNiveles([
    { cota: 0, y: yBase },
    { cota: cantoZapataM, y: yBase - zapH },
    { cota: totalH, y: 24 },
    { cota: alturaSueloActivoM, y: yBase - hActPx },
    ...(alturaSueloPasivoM > 0 ? [{ cota: alturaSueloPasivoM, y: yBase - hPasPx }] : []),
  ]);

  // Las líneas de referencia arrancan pasadas las flechas de empuje, que son lo
  // más ancho que hay del lado activo, para no cruzarlas.
  const xGuia = xMuro + muroW + 42;
  const nHachasPas = Math.max(Math.floor((xMuro - xSueloPas) / 12), 1);

  return (
    <svg viewBox={`0 0 ${xPica + 78} ${yBase + 34}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* terreno del lado activo (derecha) */}
      <path d={`M${xMuro + muroW} ${yBase - hActPx} L${xSueloDer} ${yBase - hActPx}`} stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      {Array.from({ length: 10 }).map((_, i) => (
        <path key={i} d={`M${xMuro + muroW + i * 12} ${yBase - hActPx} L${xMuro + muroW + i * 12 - 5} ${yBase - hActPx - 6}`} stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
      ))}

      {/* terreno del lado pasivo (izquierda), rayado hacia el otro lado */}
      {alturaSueloPasivoM > 0 && (
        <>
          <path d={`M${xSueloPas} ${yBase - hPasPx} L${xMuro} ${yBase - hPasPx}`} stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
          {Array.from({ length: nHachasPas }).map((_, i) => (
            <path key={i} d={`M${xSueloPas + i * 12} ${yBase - hPasPx} L${xSueloPas + i * 12 + 5} ${yBase - hPasPx - 6}`} stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
          ))}
        </>
      )}

      {/* diagrama triangular de empuje */}
      {Array.from({ length: nFlechas }).map((_, i) => {
        const t = (i + 1) / (nFlechas + 1);
        const y = yBase - hActPx + t * hActPx;
        const len = 10 + 26 * t;
        return (
          <path key={i} d={`M${xMuro + muroW + len} ${y} L${xMuro + muroW + 3} ${y}`} stroke="currentColor" strokeWidth="1.1" markerEnd="url(#arrMuro)" opacity="0.8" />
        );
      })}
      <defs>
        <marker id="arrMuro" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0 0 L5 3 L0 6 Z" fill="currentColor" />
        </marker>
      </defs>

      {/* alzado y zapata */}
      <rect x={xMuro} y={24} width={muroW} height={muroH} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.45" />
      <rect x={x0} y={24 + muroH} width={zapW} height={zapH} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.45" />

      {/* cota altura */}
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <path d={`M${xCota - 6} 24 L${xCota + 6} 24`} />
        <path d={`M${xCota - 6} ${yBase} L${xCota + 6} ${yBase}`} />
        <path d={`M${xCota} 24 L${xCota} ${yBase}`} />
      </g>
      <text x={xCota - 9} y={(24 + yBase) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" transform={`rotate(-90 ${xCota - 9} ${(24 + yBase) / 2})`}>
        H = {fmt(totalH)} m
      </text>
      <text x={x0 + zapW / 2} y={yBase + 20} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        A = {fmt(anchoZapataM)} m
      </text>

      {/* pica de niveles */}
      <text x={xPica + 8} y={15} className="fill-current font-mono" fontSize="7.5" opacity="0.6">
        NIVELES (m)
      </text>
      <path d={`M${xPica} 20 L${xPica} ${yBase + 4}`} stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
      {niveles.map((nivel) => (
        <g key={nivel.cota}>
          <path d={`M${xGuia} ${nivel.y} L${xPica} ${nivel.y}`} stroke="currentColor" strokeWidth="0.6" strokeDasharray="2.5 2.5" opacity="0.5" />
          <path d={`M${xPica - 3.5} ${nivel.y - 5} L${xPica + 3.5} ${nivel.y - 5} L${xPica} ${nivel.y} Z`} fill="currentColor" stroke="none" opacity="0.8" />
          {nivel.yRotulo !== nivel.y && (
            <path d={`M${xPica} ${nivel.y} L${xPica + 6} ${nivel.yRotulo - 3}`} stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
          )}
          <text x={xPica + 8} y={nivel.yRotulo} className="fill-current font-mono" fontSize="9">
            {etiquetaNivel(nivel.cota)}
          </text>
          {nivel.cota === 0 && (
            <text x={xPica + 8} y={nivel.yRotulo + 9} className="fill-current font-mono" fontSize="7" opacity="0.65">
              cara inf. zapata
            </text>
          )}
        </g>
      ))}

      {/*
        Cotas de las dos alas de la zapata. Se rotulan sobre la propia zapata
        para no chocar con la cota de A, que va debajo. La puntera solo se
        acota cuando existe: con vuelo nulo no hay nada que medir.
      */}
      {punteraM > 0 && (
        <text x={x0 + (punteraM * escala) / 2} y={24 + muroH - 4} textAnchor="middle"
              className="fill-current font-mono" fontSize="8.5" opacity="0.75">
          p {fmt(punteraM)}
        </text>
      )}
      {talonM > 0 && (
        <text x={xMuro + muroW + (talonM * escala) / 2} y={24 + muroH - 4} textAnchor="middle"
              className="fill-current font-mono" fontSize="8.5" opacity="0.75">
          t {fmt(talonM)}
        </text>
      )}
    </svg>
  );
}
