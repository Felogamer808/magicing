"use client";

import { useId } from "react";
import { CapaMaterial } from "@/components/verificaciones/croquis/Primitivas";

interface FilaDiagrama {
  numero: number;
  diametroMm: number;
}

interface ArmaduraDiagrama {
  /** Filas físicas, de la más cercana a la fibra traccionada hacia adentro. */
  capas: readonly FilaDiagrama[];
}

interface SeccionVigaDiagramaProps {
  bM: number;
  hM: number;
  recubrimientoM: number;
  dM: number;
  /** Canto útil hasta la armadura superior. Si viene, se acota a la derecha junto a d⁺. */
  dNegativoM?: number;
  armaduraPositiva: ArmaduraDiagrama;
  armaduraNegativa: ArmaduraDiagrama;
  diametroEstriboMm: number;
  /** Elemento a resaltar porque su campo tiene el foco. */
  resaltar?: ElementoSeccionViga | null;
  /**
   * Caras cuya armadura no entra en el ancho, según el cálculo. Se dibujan en
   * rojo con aviso: un dibujo prolijo de barras que no caben diría lo contrario
   * de lo que dice el resultado.
   */
  noEntra?: { inferior: boolean; superior: boolean };
  /** Omitir el resumen de armaduras al pie, cuando la página ya lo muestra. */
  sinResumen?: boolean;
  /**
   * Sección en T: el ala arriba (T) o abajo (T invertida). Con ala, bM es el
   * ancho del alma. Las barras de la cara del ala se dibujan repartidas en el
   * ancho eficaz, como las reparte el cálculo.
   */
  ala?: AlaDiagrama;
}

export interface AlaDiagrama {
  anchoM: number;
  espesorM: number;
  arriba: boolean;
  /** b_eff: se marca si es menor que el ancho real. */
  anchoEficazM?: number;
}

export type ElementoSeccionViga = "b" | "h" | "recubrimiento" | "inferior" | "superior" | "estribo" | "ala" | "hf";

function distribuir(n: number, desde: number, hasta: number): number[] {
  if (n <= 1) return [(desde + hasta) / 2];
  const paso = (hasta - desde) / (n - 1);
  return Array.from({ length: n }, (_, i) => desde + i * paso);
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

function etiquetaArmadura({ capas }: ArmaduraDiagrama): string {
  if (capas.length === 0) return "—";
  return capas.map((c) => `${c.numero}Ø${c.diametroMm}`).join(" + ");
}

/** Radio del punto que representa la barra en el dibujo: no a escala, sólo referencia visual del diámetro. */
function radioDe(diametroMm: number): number {
  return Math.max(2.5, Math.min(6, diametroMm * 0.3));
}

/**
 * Ubica cada fila a partir del borde interior del estribo, apilando hacia
 * adentro de la sección. El paso entre filas es el radio de la anterior más
 * el de la siguiente y un espacio fijo: es un esquema, no un plano a escala,
 * así que no reproduce la separación libre real en milímetros.
 */
function ubicarFilas(capas: readonly FilaDiagrama[], bordeY: number, signo: 1 | -1) {
  let yAnterior = bordeY;
  let radioAnterior = 0;
  return capas.map((capa, i) => {
    const radio = radioDe(capa.diametroMm);
    const y = i === 0 ? bordeY + signo * radio : yAnterior + signo * (radioAnterior + 3 + radio);
    yAnterior = y;
    radioAnterior = radio;
    return { numero: capa.numero, radio, y };
  });
}

export function SeccionVigaDiagrama({
  bM,
  hM,
  recubrimientoM,
  dM,
  dNegativoM,
  armaduraPositiva,
  armaduraNegativa,
  diametroEstriboMm,
  resaltar = null,
  noEntra = { inferior: false, superior: false },
  sinResumen = false,
  ala,
}: SeccionVigaDiagramaProps) {
  const arrowId = useId();

  if (!(bM > 0) || !(hM > 0)) return null;

  const MAX_W = 230;
  const MAX_H = 210;
  const PAD_LEFT = 52;
  const PAD_TOP = 34;
  const PAD_RIGHT = 46;
  const conAla = ala !== undefined && ala.anchoM > bM && ala.espesorM > 0 && ala.espesorM < hM;
  // Con ala hay una cota más al pie, debajo de la del recubrimiento: la del
  // alma en la T y la del ala en la T invertida. Cada una del lado de lo que mide.
  const alaAbajo = conAla && !ala.arriba;
  const PAD_BOTTOM = (noEntra.inferior ? 40 : 28) + (conAla ? 26 : 0);

  const anchoTotalM = conAla ? ala.anchoM : bM;
  const escala = Math.min(MAX_W / anchoTotalM, MAX_H / hM);
  const w = bM * escala;
  const h = hM * escala;
  const wTotal = anchoTotalM * escala;

  // xa0..xa1 es el ancho total (el ala, si la hay); x0..x1, el alma centrada.
  const xa0 = PAD_LEFT;
  const xa1 = xa0 + wTotal;
  const x0 = xa0 + (wTotal - w) / 2;
  const y0 = PAD_TOP;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const hf = conAla ? ala.espesorM * escala : 0;
  const yAla0 = conAla ? (ala.arriba ? y0 : y1 - hf) : y0;
  const yAla1 = yAla0 + hf;

  const viewW = xa1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;
  const contornoT = conAla
    ? ala.arriba
      ? `M${xa0} ${y0} H${xa1} V${yAla1} H${x1} V${y1} H${x0} V${yAla1} H${xa0} Z`
      : `M${x0} ${y0} H${x1} V${yAla0} H${xa1} V${y1} H${xa0} V${yAla0} H${x0} Z`
    : undefined;

  const cover = Math.min(recubrimientoM * escala, w / 2 - 6, h / 2 - 6);
  const coverX0 = x0 + Math.max(cover, 4);
  const coverX1 = x1 - Math.max(cover, 4);
  const coverY0 = y0 + Math.max(cover, 4);
  const coverY1 = y1 - Math.max(cover, 4);

  // Filas de la armadura positiva: la 0 pegada al borde inferior, las siguientes hacia arriba.
  const filasPos = ubicarFilas(armaduraPositiva.capas, coverY1, -1);
  // Filas de la armadura negativa: la 0 pegada al borde superior, las siguientes hacia abajo.
  const filasNeg = ubicarFilas(armaduraNegativa.capas, coverY0, 1);

  // Las barras de la cara del ala se reparten en el ancho eficaz, centrado.
  const anchoBarrasAla = conAla ? Math.min(ala.anchoEficazM ?? ala.anchoM, ala.anchoM) * escala : w;
  const centro = (x0 + x1) / 2;
  const tramoBarras = (cara: "inferior" | "superior") =>
    conAla && (cara === "superior") === ala.arriba
      ? [centro - anchoBarrasAla / 2 + Math.max(cover, 4), centro + anchoBarrasAla / 2 - Math.max(cover, 4)]
      : [coverX0, coverX1];
  const [negX0, negX1] = tramoBarras("superior");
  const [posX0, posX1] = tramoBarras("inferior");
  const marcaEficaz = conAla && ala.anchoEficazM !== undefined && ala.anchoEficazM < ala.anchoM - 1e-9;

  const yCentroidePos = filasPos[0]?.y ?? coverY1;
  const yCentroideNeg = filasNeg[0]?.y ?? coverY0;

  const cota = (e: ElementoSeccionViga) =>
    resaltar === e
      ? { stroke: "var(--mat-cota)", strokeWidth: 1.6, opacity: 1 }
      : { stroke: "currentColor", strokeWidth: 1, opacity: 0.75 };
  const textoCota = (e: ElementoSeccionViga) =>
    resaltar === e ? { fill: "var(--mat-cota)", fontWeight: 700 } : {};
  const colorBarra = (cara: "inferior" | "superior") =>
    noEntra[cara] ? "var(--destructive)" : "var(--mat-armadura)";
  const halo = (cara: "inferior" | "superior") => resaltar === cara;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="h-auto w-full text-primary"
        fill="none"
        role="img"
        aria-label={`Sección de ${fmtM(bM)} por ${fmtM(hM)}, recubrimiento ${fmtM(recubrimientoM)}. Armadura inferior ${etiquetaArmadura(armaduraPositiva)}, superior ${etiquetaArmadura(armaduraNegativa)}, estribo Ø${diametroEstriboMm}.`}
      >
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* cota de arriba: el ancho de esa cara (el alma, o el ala en la T) */}
        {(() => {
          const [ca0, ca1, elemento, texto] = alaAbajo
            ? [x0, x1, "b" as const, `bw = ${fmtM(bM)}`]
            : [xa0, xa1, conAla ? ("ala" as const) : ("b" as const), conAla ? `ala = ${fmtM(ala!.anchoM)}` : `b = ${fmtM(bM)}`];
          return (
            <g>
              <g {...cota(elemento)}>
                <path d={`M${ca0} ${y0 - 16} L${ca0} ${y0 - 4}`} />
                <path d={`M${ca1} ${y0 - 16} L${ca1} ${y0 - 4}`} />
                <path d={`M${ca0} ${y0 - 10} L${ca1} ${y0 - 10}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
              </g>
              <text x={(ca0 + ca1) / 2} y={y0 - 18} textAnchor="middle" className="fill-current font-mono" fontSize="10.5" {...textoCota(elemento)}>
                {texto}
              </text>
            </g>
          );
        })()}
        {/* cota de abajo, con ala: el alma en la T, el ala en la T invertida */}
        {conAla && (() => {
          const [ca0, ca1, elemento, texto] = alaAbajo
            ? [xa0, xa1, "ala" as const, `ala = ${fmtM(ala.anchoM)}`]
            : [x0, x1, "b" as const, `bw = ${fmtM(bM)}`];
          return (
            <g>
              <g {...cota(elemento)}>
                <path d={`M${ca0} ${y1 + 18} L${ca0} ${y1 + 30}`} />
                <path d={`M${ca1} ${y1 + 18} L${ca1} ${y1 + 30}`} />
                <path d={`M${ca0} ${y1 + 24} L${ca1} ${y1 + 24}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
              </g>
              <text x={(ca0 + ca1) / 2} y={y1 + 36} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" {...textoCota(elemento)}>
                {texto}
              </text>
            </g>
          );
        })()}

        {/* cota h */}
        <g {...cota("h")}>
          <path d={`M${xa0 - 16} ${y0} L${xa0 - 4} ${y0}`} />
          <path d={`M${xa0 - 16} ${y1} L${xa0 - 4} ${y1}`} />
          <path
            d={`M${xa0 - 10} ${y0} L${xa0 - 10} ${y1}`}
            markerStart={`url(#${arrowId})`}
            markerEnd={`url(#${arrowId})`}
          />
        </g>
        <text
          x={PAD_LEFT - 22}
          y={(y0 + y1) / 2}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="10.5"
          transform={`rotate(-90 ${PAD_LEFT - 22} ${(y0 + y1) / 2})`}
          {...textoCota("h")}
        >
          h = {fmtM(hM)}
        </text>

        {/* sección de hormigón */}
        {contornoT ? (
          <CapaMaterial d={contornoT} material="hormigon" />
        ) : (
          <CapaMaterial x={x0} y={y0} ancho={w} alto={h} material="hormigon" />
        )}
        {/* hf, junto al vuelo del ala, del lado libre: después del relleno para que no lo tape */}
        {conAla && (
          <text x={xa0 + 2} y={ala.arriba ? yAla1 + 11 : yAla0 - 5} className="fill-current font-mono" fontSize="9.5" {...textoCota("hf")}>
            hf = {fmtM(ala.espesorM)}
          </text>
        )}
        {/* b_eff, si el ala real es más ancha */}
        {marcaEficaz && (
          <g stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.7">
            <path d={`M${centro - anchoBarrasAla / 2} ${yAla0 - 4} L${centro - anchoBarrasAla / 2} ${yAla1 + 4}`} />
            <path d={`M${centro + anchoBarrasAla / 2} ${yAla0 - 4} L${centro + anchoBarrasAla / 2} ${yAla1 + 4}`} />
          </g>
        )}

        {/* estribo */}
        <rect
          x={coverX0}
          y={coverY0}
          width={Math.max(coverX1 - coverX0, 0)}
          height={Math.max(coverY1 - coverY0, 0)}
          stroke="var(--mat-armadura)"
          strokeWidth={resaltar === "estribo" ? 2.6 : 1.4}
          rx="3"
        />

        {/* cota de recubrimiento, al pie, de la cara al estribo */}
        <g {...cota("recubrimiento")}>
          <path d={`M${x0} ${y1 + 4} L${x0} ${y1 + 14}`} />
          <path d={`M${coverX0} ${y1 + 4} L${coverX0} ${y1 + 14}`} />
          <path d={`M${x0} ${y1 + 10} L${coverX0} ${y1 + 10}`} />
        </g>
        <text x={coverX0 + 4} y={y1 + 13} className="fill-current font-mono" fontSize="9.5" {...textoCota("recubrimiento")}>
          r = {fmtM(recubrimientoM)}
        </text>

        {/* cota d: de la fibra comprimida al centroide de la armadura positiva */}
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6" strokeDasharray="2 2">
          <path d={`M${xa1 + 8} ${y0} L${xa1 + 8} ${yCentroidePos}`} />
        </g>
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6">
          <path d={`M${xa1} ${y0} L${xa1 + 12} ${y0}`} />
          <path d={`M${x1} ${yCentroidePos} L${xa1 + 12} ${yCentroidePos}`} />
        </g>
        <text x={xa1 + 14} y={(y0 + yCentroidePos) / 2 + 3} className="fill-current font-mono" fontSize="9.5">
          {dNegativoM !== undefined ? "d⁺" : "d"}
        </text>

        {/* cota d⁻: de la fibra inferior al centroide de la armadura superior */}
        {dNegativoM !== undefined && (
          <g>
            <g stroke="currentColor" strokeWidth="0.75" opacity="0.6" strokeDasharray="2 2">
              <path d={`M${xa1 + 26} ${y1} L${xa1 + 26} ${yCentroideNeg}`} />
            </g>
            <g stroke="currentColor" strokeWidth="0.75" opacity="0.6">
              <path d={`M${xa1} ${y1} L${xa1 + 30} ${y1}`} />
              <path d={`M${x1} ${yCentroideNeg} L${xa1 + 30} ${yCentroideNeg}`} />
            </g>
            <text x={xa1 + 32} y={(y1 + yCentroideNeg) / 2 + 3} className="fill-current font-mono" fontSize="9.5">
              d⁻
            </text>
          </g>
        )}

        {/* armadura negativa (superior), una fila por capa */}
        {filasNeg.map((fila, i) =>
          distribuir(fila.numero, negX0 + fila.radio, negX1 - fila.radio).map((x, j) => (
            <circle key={`neg-${i}-${j}`} cx={x} cy={fila.y} r={fila.radio} fill={colorBarra("superior")} stroke={halo("superior") ? "var(--mat-cota)" : "none"} strokeWidth="2" />
          ))
        )}

        {/* armadura positiva (inferior), una fila por capa */}
        {filasPos.map((fila, i) =>
          distribuir(fila.numero, posX0 + fila.radio, posX1 - fila.radio).map((x, j) => (
            <circle key={`pos-${i}-${j}`} cx={x} cy={fila.y} r={fila.radio} fill={colorBarra("inferior")} stroke={halo("inferior") ? "var(--mat-cota)" : "none"} strokeWidth="2" />
          ))
        )}
        {noEntra.superior && (
          <text x={(x0 + x1) / 2} y={y0 - 26} textAnchor="middle" fill="var(--destructive)" className="font-mono" fontSize="9.5">
            la armadura superior no entra en el ancho
          </text>
        )}
        {noEntra.inferior && (
          <text x={(x0 + x1) / 2} y={y1 + 30} textAnchor="middle" fill="var(--destructive)" className="font-mono" fontSize="9.5">
            la armadura inferior no entra en el ancho
          </text>
        )}
      </svg>

      {!sinResumen && (
      <dl className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>Positiva</dt>
        <dd className="text-right text-foreground">{etiquetaArmadura(armaduraPositiva)}</dd>
        <dt>Negativa</dt>
        <dd className="text-right text-foreground">{etiquetaArmadura(armaduraNegativa)}</dd>
        <dt>Estribo</dt>
        <dd className="text-right text-foreground">Ø{diametroEstriboMm}</dd>
        <dt>d</dt>
        <dd className="text-right text-foreground">{fmtM(dM)}</dd>
      </dl>
      )}
    </div>
  );
}
