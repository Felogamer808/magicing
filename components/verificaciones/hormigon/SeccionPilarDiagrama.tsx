"use client";

import { useRef } from "react";
import { barrasPilar, describirArmadoPilar, type ArmaduraPilar, type GeometriaPilar } from "@/lib/calc/hormigon/pilares/pilar";

/**
 * Sección del pilar a escala: hormigón, cerco y barras en las posiciones que
 * usa el cálculo (`barrasPilar`), cada una con su diámetro. Las ramas
 * interiores del cerco se dibujan repartidas, como las supone la comprobación
 * de barras sujetas.
 *
 * Con `edicion`, las esquinas y las caras se tocan para elegirlas, y la fila
 * elegida trae un tirador: acercarlo a la esquina agrega barras y alejarlo
 * las quita. El dibujo no decide nada; avisa y el editor ajusta los datos.
 */

/** Las cuatro esquinas, la fila de las caras de ancho b o la de las de ancho h. */
export type FilaPilar = "esquina" | "b" | "h";

export interface EdicionSeccionPilar {
  seleccion: FilaPilar | null;
  onSeleccionar: (fila: FilaPilar | null) => void;
  /** Barras por cara, con las esquinas, que pide el tirador; sin tope. */
  onArrastrar: (fila: "b" | "h", barrasCara: number) => void;
  /** Filas que no cumplen la separación del art. 8.2(2), en rojo. */
  fallan: { b: boolean; h: boolean };
}

interface Props {
  geometria: GeometriaPilar;
  armadura: ArmaduraPilar;
  edicion?: EdicionSeccionPilar;
  /** Más ancho, para editar con comodidad. */
  grande?: boolean;
}

const LADO = 220;
const MARGEN = 34;

export function SeccionPilarDiagrama({ geometria: g, armadura: a, edicion, grande = false }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const arrastrando = useRef(false);

  const escala = LADO / Math.max(g.bM, g.hM);
  const w = g.bM * escala;
  const h = g.hM * escala;
  const x0 = MARGEN + (LADO - w) / 2;
  const y0 = MARGEN / 2 + (LADO - h) / 2;
  const rCerco = (g.recubrimientoM + a.diametroCercoMm / 2000) * escala;
  const barras = barrasPilar(g, a);
  const radio = (diametroMm: number) => Math.max((diametroMm / 2000) * escala, 2.2);

  // Ramas interiores: las paralelas a h cruzan de cara b a cara b, por las
  // mismas barras que supone la comprobación de sujeción.
  const e = (g.recubrimientoM + a.diametroCercoMm / 1000 + a.diametroEsquinaMm / 2000) * escala;
  const interiores = (n: number, ramas: number) =>
    ramas > 2 ? Array.from({ length: ramas - 2 }, (_, k) => Math.round(((k + 1) * (n - 1)) / (ramas - 1))) : [];
  const ramasParalelasH = interiores(a.barrasCaraB, a.ramasH).map((i) => x0 + e + ((w - 2 * e) * i) / (a.barrasCaraB - 1));
  const ramasParalelasB = interiores(a.barrasCaraH, a.ramasB).map((j) => y0 + e + ((h - 2 * e) * j) / (a.barrasCaraH - 1));

  const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  const armado = describirArmadoPilar(barras);

  const sel = edicion?.seleccion ?? null;
  const colorBarra = (fila: FilaPilar) =>
    fila !== "esquina" && edicion?.fallan[fila] ? "fill-destructive" : sel === fila ? "fill-primary" : "fill-foreground";
  const colorFranja = (fila: "b" | "h") =>
    `cursor-pointer outline-none ${sel === fila ? (edicion?.fallan[fila] ? "fill-destructive/10" : "fill-primary/10") : "fill-transparent hover:fill-primary/5"}`;

  const interactivo = (fila: FilaPilar, etiqueta: string) =>
    edicion
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": etiqueta,
          "aria-pressed": sel === fila,
          onClick: (ev: React.MouseEvent) => {
            ev.stopPropagation();
            edicion.onSeleccionar(fila);
          },
          onKeyDown: (ev: React.KeyboardEvent) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              edicion.onSeleccionar(fila);
            }
          },
        }
      : {};

  // Tirador de la fila elegida: sobre la primera intermedia de la cara de
  // arriba (fila b) o de la izquierda (fila h); sin intermedias, a mitad de cara.
  const tirador = (() => {
    if (!edicion || (sel !== "b" && sel !== "h")) return null;
    const n = sel === "b" ? a.barrasCaraB : a.barrasCaraH;
    const largo = (sel === "b" ? w : h) - 2 * e;
    const paso = n > 2 ? largo / (n - 1) : largo / 2;
    return sel === "b"
      ? { fila: sel, x: x0 + e + paso, y: y0 + e, largo }
      : { fila: sel, x: x0 + e, y: y0 + e + paso, largo };
  })();

  const moverTirador = (ev: React.PointerEvent) => {
    if (!arrastrando.current || !tirador || !edicion || !svg.current) return;
    const matriz = svg.current.getScreenCTM();
    if (!matriz) return;
    const punto = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matriz.inverse());
    const paso = tirador.fila === "b" ? punto.x - (x0 + e) : punto.y - (y0 + e);
    // Paso entre ejes → barras: n − 1 = largo / paso.
    const barrasCara = paso <= 1 ? 100 : Math.max(2, Math.round(tirador.largo / paso) + 1);
    edicion.onArrastrar(tirador.fila, barrasCara);
  };

  return (
    <figure className={`mx-auto w-full ${grande ? "max-w-[34rem]" : "max-w-[18rem]"}`}>
      <svg ref={svg} viewBox={`0 0 ${LADO + 2 * MARGEN} ${LADO + MARGEN + 8}`}
           className={`h-auto w-full ${edicion ? "touch-none select-none" : ""}`} role={edicion ? "group" : "img"}
           aria-label={`Sección ${fmt(g.bM)} × ${fmt(g.hM)} m con ${armado}`}
           onClick={edicion ? () => edicion.onSeleccionar(null) : undefined}>
        <rect x={x0} y={y0} width={w} height={h} fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth={1.6} />
        {edicion && (
          <>
            {/* Franjas clicables: arriba y abajo la fila b, a los costados la fila h. */}
            {[y0, y0 + h - 2 * e].map((y, k) => (
              <rect key={`fb${k}`} x={x0} y={y} width={w} height={2 * e} className={colorFranja("b")}
                    {...interactivo("b", "Fila de intermedias de las caras b")} />
            ))}
            {[x0, x0 + w - 2 * e].map((x, k) => (
              <rect key={`fh${k}`} x={x} y={y0 + 2 * e} width={2 * e} height={h - 4 * e} className={colorFranja("h")}
                    {...interactivo("h", "Fila de intermedias de las caras h")} />
            ))}
          </>
        )}
        <rect x={x0 + rCerco} y={y0 + rCerco} width={w - 2 * rCerco} height={h - 2 * rCerco} rx={4}
              fill="none" className="pointer-events-none stroke-foreground/70" strokeWidth={1.2} />
        {ramasParalelasH.map((x, k) => (
          <line key={`h${k}`} x1={x} y1={y0 + rCerco} x2={x} y2={y0 + h - rCerco} className="pointer-events-none stroke-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        ))}
        {ramasParalelasB.map((y, k) => (
          <line key={`b${k}`} x1={x0 + rCerco} y1={y} x2={x0 + w - rCerco} y2={y} className="pointer-events-none stroke-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        ))}
        {barras.map((b, k) => (
          <circle key={k} cx={x0 + b.xM * escala} cy={y0 + b.yM * escala} r={radio(b.diametroMm)}
                  className={`${colorBarra(b.fila)} ${!edicion ? "" : b.fila === "esquina" ? "cursor-pointer outline-none" : "pointer-events-none"}`}
                  {...(b.fila === "esquina" ? interactivo("esquina", "Barras de esquina") : {})} />
        ))}
        {tirador && (
          <circle
            cx={tirador.x} cy={tirador.y} r={9}
            className={`fill-background/60 stroke-primary ${tirador.fila === "b" ? "cursor-ew-resize" : "cursor-ns-resize"}`}
            strokeWidth={2}
            aria-hidden="true"
            onClick={(ev) => ev.stopPropagation()}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              ev.currentTarget.setPointerCapture(ev.pointerId);
              arrastrando.current = true;
            }}
            onPointerMove={moverTirador}
            onPointerUp={() => (arrastrando.current = false)}
            onPointerCancel={() => (arrastrando.current = false)}
          />
        )}
        <text x={x0 + w / 2} y={y0 + h + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
          b = {fmt(g.bM)} m
        </text>
        <text x={x0 - 10} y={y0 + h / 2} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]"
              transform={`rotate(-90 ${x0 - 10} ${y0 + h / 2})`}>
          h = {fmt(g.hM)} m
        </text>
      </svg>
      <figcaption className="text-center text-xs text-muted-foreground">
        {armado}. Dirección h: flexión que comprime una cara de ancho b. Las ramas interiores, punteadas.
      </figcaption>
    </figure>
  );
}
