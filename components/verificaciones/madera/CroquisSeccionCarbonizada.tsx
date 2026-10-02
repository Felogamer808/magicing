"use client";

import { CapaMaterial, IndicadorFuego } from "@/components/verificaciones/croquis/Primitivas";
import type { SeccionReducida } from "@/lib/calc/madera/fuego";
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
 * Las caras llegan una por una y no como un par de contadores. El método sólo
 * necesita **cuántas** arden —la sección eficaz sale igual si quema la cara de
 * arriba o la de abajo—, pero el dibujo tiene que mostrar las que se eligieron:
 * decirle a alguien que su viga arde por abajo cuando marcó arriba es mentirle
 * sobre lo único que el croquis existe para explicar.
 */

export interface CarasDibujo {
  izquierda: boolean;
  derecha: boolean;
  superior: boolean;
  inferior: boolean;
}

export type NombreCara = keyof CarasDibujo;

interface Props {
  anchoM: number;
  cantoM: number;
  reducida: SeccionReducida;
  caras: CarasDibujo;
  /** Sin esto las caras no son interactivas: es el modo para imprimir y para la memoria. */
  onToggleCara?: (cara: NombreCara) => void;
  /** Dibuja encima el contorno de la sección en frío, para comparar. */
  mostrarOriginal?: boolean;
  /**
   * Oculta el pie del dibujo. Se usa cuando van dos croquis juntos: la
   * explicación es la misma para los dos y repetirla duplica el texto más
   * largo del panel.
   */
  ocultarNota?: boolean;
}

const ANCHO = 340;
const ALTO = 215;
/** Ancho de la banda sensible al clic, a cada lado del borde. */
const ZONA = 13;

/**
 * Banda sensible sobre una cara. Se dibuja al final del SVG para quedar por
 * encima de los rellenos, y es transparente: lo que se ve es el indicador de
 * fuego, no el área de clic.
 */
function ZonaCara({
  cara,
  x,
  y,
  w,
  h,
  expuesta,
  onToggle,
}: {
  cara: NombreCara;
  x: number;
  y: number;
  w: number;
  h: number;
  expuesta: boolean;
  onToggle?: (cara: NombreCara) => void;
}) {
  if (!onToggle) return null;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="transparent"
      className="cursor-pointer"
      role="checkbox"
      aria-checked={expuesta}
      aria-label={`${ROTULO[cara]} expuesta al fuego`}
      tabIndex={0}
      onClick={() => onToggle(cara)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(cara);
        }
      }}
    />
  );
}

const ROTULO: Record<NombreCara, string> = {
  izquierda: "cara izquierda",
  derecha: "cara derecha",
  superior: "cara superior",
  inferior: "cara inferior",
};

export function CroquisSeccionCarbonizada({
  anchoM,
  cantoM,
  reducida,
  caras,
  onToggleCara,
  mostrarOriginal = false,
  ocultarNota = false,
}: Props) {
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

  const descuento = (expuesta: boolean, d: number) => (expuesta ? d : 0);
  const izqChar = descuento(caras.izquierda, dChar);
  const derChar = descuento(caras.derecha, dChar);
  const supChar = descuento(caras.superior, dChar);
  const infChar = descuento(caras.inferior, dChar);
  const izqEf = descuento(caras.izquierda, dEf);
  const derEf = descuento(caras.derecha, dEf);
  const supEf = descuento(caras.superior, dEf);
  const infEf = descuento(caras.inferior, dEf);

  const residual = {
    x: x0 + izqChar,
    y: y0 + supChar,
    w: Math.max(b - izqChar - derChar, 0),
    h: Math.max(h - supChar - infChar, 0),
  };
  const eficaz = {
    x: x0 + izqEf,
    y: y0 + supEf,
    w: Math.max(b - izqEf - derEf, 0),
    h: Math.max(h - supEf - infEf, 0),
  };

  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Sección eficaz en incendio: ${fmt(reducida.anchoEficazM, 3)} por ${fmt(reducida.cantoEficazM, 3)} metros`}
      >
        {/* De afuera hacia adentro: lo carbonizado, la capa caliente sin
            resistencia, y el núcleo que sigue trabajando. */}
        <CapaMaterial x={x0} y={y0} ancho={b} alto={h} material="carbon" />
        <CapaMaterial
          x={residual.x}
          y={residual.y}
          ancho={residual.w}
          alto={residual.h}
          material="calentada"
          rayado
        />
        <CapaMaterial x={eficaz.x} y={eficaz.y} ancho={eficaz.w} alto={eficaz.h} material="eficaz" />

        {/* Contorno de la sección en frío, para medir de un vistazo lo perdido. */}
        {mostrarOriginal && (
          <rect
            x={x0}
            y={y0}
            width={b}
            height={h}
            fill="none"
            stroke="var(--mat-madera-borde)"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
        )}

        {/* Exposición: ondas térmicas entrando por cada cara que arde. */}
        {caras.inferior && (
          <IndicadorFuego x0={x0} y0={y0 + h} x1={x0 + b} y1={y0 + h} haciaGrados={-90} />
        )}
        {caras.superior && <IndicadorFuego x0={x0} y0={y0} x1={x0 + b} y1={y0} haciaGrados={90} />}
        {caras.izquierda && <IndicadorFuego x0={x0} y0={y0} x1={x0} y1={y0 + h} haciaGrados={0} />}
        {caras.derecha && (
          <IndicadorFuego x0={x0 + b} y0={y0} x1={x0 + b} y1={y0 + h} haciaGrados={180} />
        )}

        {/* Cota de def, sobre la cara inferior si arde. */}
        {caras.inferior && dEf > 3 && (
          <>
            <line
              x1={cx + b / 4}
              y1={y0 + h}
              x2={cx + b / 4}
              y2={y0 + h - infEf}
              className="stroke-primary"
              strokeWidth={1.4}
            />
            <text
              x={cx + b / 4 + 6}
              y={y0 + h - infEf / 2 + 4}
              className="fill-primary text-[10.5px]"
            >
              def {fmt(reducida.profundidadEficazM * 1000, 1)} mm
            </text>
          </>
        )}

        {/* Las zonas sensibles van al final para quedar por encima de todo. */}
        <ZonaCara cara="superior" x={x0} y={y0 - ZONA} w={b} h={ZONA * 2}
                  expuesta={caras.superior} onToggle={onToggleCara} />
        <ZonaCara cara="inferior" x={x0} y={y0 + h - ZONA} w={b} h={ZONA * 2}
                  expuesta={caras.inferior} onToggle={onToggleCara} />
        <ZonaCara cara="izquierda" x={x0 - ZONA} y={y0} w={ZONA * 2} h={h}
                  expuesta={caras.izquierda} onToggle={onToggleCara} />
        <ZonaCara cara="derecha" x={x0 + b - ZONA} y={y0} w={ZONA * 2} h={h}
                  expuesta={caras.derecha} onToggle={onToggleCara} />
      </svg>
      {!ocultarNota && (
        <figcaption className="text-xs text-muted-foreground">
          {onToggleCara
            ? "Hacé clic en una cara para marcarla como expuesta. La capa intermedia no está carbonizada: son 7 mm de madera caliente a la que el art. 4.2.2(1) le supone resistencia y rigidez nulas."
            : "La capa intermedia no está carbonizada: son 7 mm de madera caliente a la que el art. 4.2.2(1) le supone resistencia y rigidez nulas. En tiempos cortos llega a ser la mitad del descuento total."}
        </figcaption>
      )}
    </figure>
  );
}
