"use client";

import { CotaH } from "@/components/verificaciones/croquis/Croquis";
import { SimboloApoyo } from "@/components/verificaciones/croquis/Primitivas";
import { propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Pandeo lateral-torsional, dibujado.
 *
 * La curva Mn–Lb dice cuánto se pierde; esto dice **qué pasa**, que es lo que
 * no se deduce de un número. La viga no se agota doblándose en su plano: el ala
 * comprimida se escapa de costado, arrastra el alma y la sección gira. Por eso
 * arriostrar el ala comprimida —y sólo ésa— cambia el resultado tanto, y por
 * eso Lb no es la luz sino la distancia entre arriostramientos.
 *
 * Tres vistas que se leen juntas:
 *
 *  1. **Alzado**, con los apoyos, los arriostramientos y la cota de Lb.
 *  2. **Planta del ala comprimida**, que es donde el escape se ve: entre dos
 *     arriostramientos el ala se arquea de costado.
 *  3. **Sección girada**, que muestra el giro que acompaña al desplazamiento.
 *
 * Nada de esto se calcula acá: la zona y las longitudes vienen resueltas.
 */

export type ZonaFlexion =
  | "plastificación (Lb ≤ Lp)"
  | "inelástica (Lp < Lb ≤ Lr)"
  | "elástica (Lb > Lr)";

interface Props {
  lbM: number;
  lpM: number;
  lrM: number;
  zona: ZonaFlexion;
  familia: Familia;
  params: ParametrosPerfil;
}

const ANCHO = 420;
const ALTO = 250;

/** Flecha lateral del dibujo, no del cálculo: satura para que el modo se vea. */
const AMPLITUD = 17;

export function DiagramaPandeoLateral({ lbM, lpM, lrM, zona, familia, params }: Props) {
  let p;
  try {
    p = propiedades(familia, params);
  } catch {
    // Parámetros incompletos: la página ya avisa, acá no se dibuja.
    return null;
  }
  const hM = p.hM;
  const bM = p.bM;
  if (!(lbM > 0) || !(hM > 0) || !(bM > 0)) return null;

  const x0 = 46;
  const x1 = ANCHO - 46;
  const largo = x1 - x0;
  const yAlzado = 58;
  const yPlanta = 158;

  // Con Lb ≤ Lp la viga plastifica antes de escaparse: el modo no llega a
  // desarrollarse y dibujarlo torcido diría algo falso.
  const plastifica = zona.startsWith("plastificación");
  const amplitud = plastifica ? 0 : AMPLITUD * (zona.startsWith("elástica") ? 1 : 0.6);

  /** Media onda entre arriostramientos, que es la forma modal más simple. */
  const onda = (y: number, amp: number) =>
    `M${x0} ${y} C${x0 + largo * 0.25} ${y - amp * 1.3}, ${x0 + largo * 0.75} ${y - amp * 1.3}, ${x1} ${y}`;

  const giroGrados = plastifica ? 0 : (amplitud / AMPLITUD) * 14;
  const hPx = 46;
  const bPx = Math.max(18, (bM / hM) * hPx);
  const tf = Math.max(3, hPx / 11);
  const cxSec = ANCHO - 54;
  const cySec = yPlanta + 48;

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" fill="none" aria-hidden="true">
        <defs>
          <marker id="pl-flecha" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* ---- 1. Alzado ---- */}
        <text x={x0} y={yAlzado - 46} className="fill-current font-mono" fontSize="9.5" opacity="0.6">
          ALZADO
        </text>
        <path
          d={`M${x0} ${yAlzado} H${x1}`}
          stroke="var(--mat-acero-borde)"
          strokeWidth="7"
          strokeLinecap="butt"
        />
        {/* El ala comprimida, que es la que se escapa. */}
        <path d={`M${x0} ${yAlzado - 5} H${x1}`} stroke="var(--mat-fuego)" strokeWidth="2.6" />
        <text
          x={x0 + largo / 2}
          y={yAlzado - 11}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9.5"
          style={{ fill: "var(--mat-fuego)" }}
        >
          ala comprimida
        </text>

        <g className="text-foreground">
          <SimboloApoyo x={x0} y={yAlzado + 4} tipo="articulado" escala={0.8} />
          <SimboloApoyo x={x1} y={yAlzado + 4} tipo="movil" escala={0.8} />
        </g>

        {/* Arriostramientos: lo que define Lb. */}
        {[x0, x1].map((x) => (
          <g key={x} stroke="var(--mat-cota)" strokeWidth="1.6">
            <path d={`M${x} ${yAlzado - 16} v-10`} />
            <path d={`M${x - 6} ${yAlzado - 26} h12`} />
          </g>
        ))}
        <text
          x={x0}
          y={yAlzado - 30}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9"
          style={{ fill: "var(--mat-cota)" }}
        >
          arriostrado
        </text>

        <CotaH x0={x0} x1={x1} y={yAlzado + 30} texto={`Lb = ${fmt(lbM, 2)} m`} />

        {/* ---- 2. Planta del ala comprimida ---- */}
        <text x={x0} y={yPlanta - 30} className="fill-current font-mono" fontSize="9.5" opacity="0.6">
          PLANTA DEL ALA COMPRIMIDA
        </text>
        <path d={`M${x0} ${yPlanta} H${x1}`} stroke="var(--border)" strokeWidth="1.2" strokeDasharray="5 4" />
        <path
          d={onda(yPlanta, amplitud)}
          stroke="var(--mat-fuego)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {amplitud > 0 && (
          <g className="text-[var(--mat-cota)]">
            <path
              d={`M${x0 + largo / 2} ${yPlanta} V${yPlanta - amplitud * 1.25}`}
              stroke="currentColor"
              strokeWidth="1"
              markerEnd="url(#pl-flecha)"
            />
            <text
              x={x0 + largo / 2}
              y={yPlanta - amplitud * 1.3 - 8}
              textAnchor="middle"
              className="fill-current font-mono"
              fontSize="9.5"
            >
              se escapa de costado
            </text>
          </g>
        )}
        {amplitud === 0 && (
          <text
            x={x0 + largo / 2}
            y={yPlanta - 9}
            textAnchor="middle"
            className="fill-current font-mono"
            fontSize="9.5"
            style={{ fill: "var(--exito)" }}
          >
            el ala no llega a escaparse
          </text>
        )}

        {/* ---- 3. Sección, girada lo que gira ---- */}
        <text
          x={cxSec}
          y={cySec - hPx / 2 - 14}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9.5"
          opacity="0.6"
        >
          SECCIÓN
        </text>
        <g transform={`translate(${cxSec} ${cySec}) rotate(${giroGrados})`}>
          <path
            d={`M${-bPx / 2} ${-hPx / 2} H${bPx / 2} V${-hPx / 2 + tf} H${2} V${hPx / 2 - tf} H${bPx / 2} V${hPx / 2} H${-bPx / 2} V${hPx / 2 - tf} H${-2} V${-hPx / 2 + tf} H${-bPx / 2} Z`}
            fill="var(--mat-acero)"
            stroke="var(--mat-acero-borde)"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d={`M${-bPx / 2} ${-hPx / 2 + tf / 2} H${bPx / 2}`}
            stroke="var(--mat-fuego)"
            strokeWidth="2.2"
          />
        </g>
        {giroGrados > 0 && (
          <text
            x={cxSec}
            y={cySec + hPx / 2 + 18}
            textAnchor="middle"
            className="fill-current font-mono"
            fontSize="9.5"
            style={{ fill: "var(--mat-cota)" }}
          >
            y gira
          </text>
        )}
      </svg>

      <figcaption className="text-xs leading-relaxed text-muted-foreground">
        {plastifica ? (
          <>
            Con <span className="font-mono">Lb = {fmt(lbM, 2)} m ≤ Lp = {fmt(lpM, 2)} m</span> la
            sección plastifica antes de que el ala se escape: el pandeo lateral no gobierna y
            arriostrar más no agrega nada.
          </>
        ) : (
          <>
            Entre arriostramientos el ala comprimida se arquea de costado y arrastra la sección, que
            gira. Por eso <span className="font-mono">Lb</span> no es la luz sino la distancia entre
            arriostramientos: un arriostramiento al medio la parte en dos y puede devolver la viga a
            la zona de plastificación —<span className="font-mono">Lp = {fmt(lpM, 2)} m</span>,{" "}
            <span className="font-mono">Lr = {fmt(lrM, 2)} m</span>—. Las flechas del dibujo están
            saturadas para que el modo se vea; no son la deformación real.
          </>
        )}
      </figcaption>
    </figure>
  );
}
