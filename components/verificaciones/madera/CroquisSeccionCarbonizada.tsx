"use client";

import { CapaMaterial, IndicadorFuego } from "@/components/verificaciones/croquis/Primitivas";
import type { CarasExpuestas, SeccionReducida } from "@/lib/calc/madera/fuego";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Sección residual y eficaz en incendio, figura 4.1 del EC5-1-2.
 *
 * Tres contornos y no dos, que es lo que el dibujo tiene que dejar claro: la
 * sección original, la que queda después de quemarse dchar,n, y la eficaz, que
 * descuenta además una capa de 7 mm que **no está carbonizada** pero está
 * caliente y a la que la norma le supone resistencia nula. Esa capa intermedia
 * es la que se olvida, y en tiempos cortos llega a ser la mitad del descuento
 * total.
 *
 * Las caras que no arden se dibujan sin descuento, porque de eso depende casi
 * todo: una viga con losa encima pierde tres caras y no cuatro.
 */

interface Props {
  anchoM: number;
  cantoM: number;
  reducida: SeccionReducida;
  caras: CarasExpuestas;
}

const ANCHO = 340;
const ALTO = 215;

export function CroquisSeccionCarbonizada({ anchoM, cantoM, reducida, caras }: Props) {
  if (!(anchoM > 0) || !(cantoM > 0)) return null;

  const escala = Math.min(190 / anchoM, 190 / cantoM);
  const b = anchoM * escala;
  const h = cantoM * escala;
  const cx = ANCHO / 2 + 10;
  const cy = ALTO / 2;
  const x0 = cx - b / 2;
  const y0 = cy - h / 2;

  const dChar = reducida.profundidadCarbonizadaM * escala;
  const dEf = reducida.profundidadEficazM * escala;

  // Cada cara descuenta sólo si está expuesta. Con una sola cara en el canto se
  // adopta la inferior, que es el caso de la viga con losa encima.
  const izqChar = caras.enAnchura >= 1 ? dChar : 0;
  const derChar = caras.enAnchura >= 2 ? dChar : 0;
  const supChar = caras.enCanto >= 2 ? dChar : 0;
  const infChar = caras.enCanto >= 1 ? dChar : 0;

  const izqEf = caras.enAnchura >= 1 ? dEf : 0;
  const derEf = caras.enAnchura >= 2 ? dEf : 0;
  const supEf = caras.enCanto >= 2 ? dEf : 0;
  const infEf = caras.enCanto >= 1 ? dEf : 0;

  const residual = {
    x: x0 + izqChar, y: y0 + supChar,
    w: Math.max(b - izqChar - derChar, 0), h: Math.max(h - supChar - infChar, 0),
  };
  const eficaz = {
    x: x0 + izqEf, y: y0 + supEf,
    w: Math.max(b - izqEf - derEf, 0), h: Math.max(h - supEf - infEf, 0),
  };

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Sección eficaz en incendio: ${fmt(reducida.anchoEficazM, 3)} por ${fmt(reducida.cantoEficazM, 3)} metros`}>
        {/* De afuera hacia adentro: lo carbonizado, la capa caliente sin
            resistencia, y el núcleo que sigue trabajando. */}
        <CapaMaterial x={x0} y={y0} ancho={b} alto={h} material="carbon" />
        <CapaMaterial
          x={residual.x} y={residual.y} ancho={residual.w} alto={residual.h}
          material="calentada" rayado
        />
        <CapaMaterial
          x={eficaz.x} y={eficaz.y} ancho={eficaz.w} alto={eficaz.h}
          material="eficaz"
        />

        {/* Exposición: ondas térmicas entrando por cada cara que arde. */}
        {caras.enCanto >= 1 && (
          <IndicadorFuego x0={x0} y0={y0 + h} x1={x0 + b} y1={y0 + h} haciaGrados={-90} />
        )}
        {caras.enCanto >= 2 && (
          <IndicadorFuego x0={x0} y0={y0} x1={x0 + b} y1={y0} haciaGrados={90} />
        )}
        {caras.enAnchura >= 1 && (
          <IndicadorFuego x0={x0} y0={y0} x1={x0} y1={y0 + h} haciaGrados={0} />
        )}
        {caras.enAnchura >= 2 && (
          <IndicadorFuego x0={x0 + b} y0={y0} x1={x0 + b} y1={y0 + h} haciaGrados={180} />
        )}

        {/* Cota de def, sobre la cara inferior si arde. */}
        {caras.enCanto >= 1 && dEf > 3 && (
          <>
            <line x1={cx + b / 4} y1={y0 + h} x2={cx + b / 4} y2={y0 + h - infEf}
                  className="stroke-primary" strokeWidth={1.4} />
            <text x={cx + b / 4 + 6} y={y0 + h - infEf / 2 + 4}
                  className="fill-primary text-[10.5px]">
              def {fmt(reducida.profundidadEficazM * 1000, 1)} mm
            </text>
          </>
        )}

      </svg>
      <figcaption className="text-xs text-muted-foreground">
        La capa intermedia no está carbonizada: son 7 mm de madera caliente a la que el art.
        4.2.2(1) le supone resistencia y rigidez nulas. En tiempos cortos llega a ser la mitad del
        descuento total.
      </figcaption>
    </figure>
  );
}
