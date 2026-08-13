"use client";

import type { ComponentesFlecha } from "@/lib/calc/ec5/deformaciones";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Componentes de la deformación, figura 7.1.
 *
 * Es el dibujo que explica por qué en madera hay tres comprobaciones de flecha
 * y no una. La contraflecha se descuenta sólo de la neta; la fluencia se suma
 * sólo a las finales. Con los números en una tabla eso se confunde
 * constantemente, y con las curvas superpuestas sobre la misma viga se lee de
 * un vistazo cuánto aporta cada término.
 *
 * Las flechas se dibujan amplificadas —si no, en una viga de 5 m serían dos
 * píxeles— y a escala común entre ellas, que es lo que permite compararlas.
 */

interface Props {
  componentes: ComponentesFlecha;
  contraflechaMm: number;
}

const ANCHO = 460;
const ALTO = 250;
const IZQ = 40;
const DER = ANCHO - 130;
const EJE = 96;

/** Parábola de flecha con vértice en el centro de la luz. */
function curva(flechaPx: number, y0: number): string {
  const puntos: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = IZQ + t * (DER - IZQ);
    // Forma de la elástica de carga uniforme, normalizada a 1 en el centro.
    const f = (16 / 5) * t * (1 - t) * (1 + t - t * t);
    puntos.push(`${x.toFixed(1)},${(y0 + flechaPx * f).toFixed(1)}`);
  }
  return puntos.join(" ");
}

export function DiagramaFlechas({ componentes: c, contraflechaMm }: Props) {
  const maxMm = Math.max(c.finalMm, contraflechaMm, 1);
  const escala = 110 / maxMm;

  const filas = [
    {
      etiqueta: "wc · contraflecha",
      valor: contraflechaMm,
      px: -contraflechaMm * escala,
      clase: "stroke-muted-foreground",
      guiones: "4 3",
    },
    {
      etiqueta: "winst · instantánea",
      valor: c.instantaneaTotalMm,
      px: c.instantaneaTotalMm * escala,
      clase: "stroke-primary",
      guiones: undefined,
    },
    {
      etiqueta: "wfin · final",
      valor: c.finalMm,
      px: c.finalMm * escala,
      clase: "stroke-amber-600",
      guiones: undefined,
    },
    {
      etiqueta: "wnet,fin · neta final",
      valor: c.netaFinalMm,
      px: c.netaFinalMm * escala,
      clase: "stroke-emerald-600",
      guiones: "6 3",
    },
  ];

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Flecha instantánea ${fmt(c.instantaneaTotalMm, 1)} y final ${fmt(c.finalMm, 1)} milímetros`}>
        {/* Línea que une los apoyos: la referencia de la ec. (7.2). */}
        <line x1={IZQ} y1={EJE} x2={DER} y2={EJE}
              className="stroke-foreground/60" strokeWidth={1.2} />
        <polygon points={`${IZQ},${EJE} ${IZQ - 7},${EJE + 12} ${IZQ + 7},${EJE + 12}`}
                 className="fill-muted-foreground" />
        <polygon points={`${DER},${EJE} ${DER - 7},${EJE + 12} ${DER + 7},${EJE + 12}`}
                 className="fill-muted-foreground" />

        {filas.map((f) =>
          Math.abs(f.px) < 0.4 ? null : (
            <polyline key={f.etiqueta} points={curva(f.px, EJE)} fill="none"
                      className={f.clase} strokeWidth={1.8} strokeDasharray={f.guiones} />
          )
        )}

        {/*
          Leyenda a la derecha. El paso de 30 px entre filas y los 18 que separan
          el valor de su rótulo no son holgura de más: con el paso apretado las
          cajas de texto de dos filas contiguas llegan a tocarse, que es de las
          cosas que no se ven a ojo y sí al medirlas.
        */}
        {filas.map((f, i) => (
          <g key={f.etiqueta}>
            <line x1={DER + 14} y1={30 + i * 30} x2={DER + 32} y2={30 + i * 30}
                  className={f.clase} strokeWidth={2.2} strokeDasharray={f.guiones} />
            <text x={DER + 36} y={30 + i * 30 + 4} className="fill-foreground text-[10.5px]">
              {fmt(f.valor, 1)} mm
            </text>
            <text x={DER + 14} y={30 + i * 30 + 18} className="fill-muted-foreground text-[9.5px]">
              {f.etiqueta}
            </text>
          </g>
        ))}

        {/* Desglose de la fluencia, abajo. */}
        <text x={IZQ} y={ALTO - 26} className="fill-muted-foreground text-[10.5px]">
          Fluencia: {fmt(c.fluenciaGMm, 1)} mm de la permanente
          {c.fluenciaQMm > 0 ? ` + ${fmt(c.fluenciaQMm, 1)} de la variable` : ""}
        </text>
        <text x={IZQ} y={ALTO - 12} className="fill-muted-foreground text-[10.5px]">
          Instantánea: {fmt(c.instantaneaGMm, 1)} mm permanente + {fmt(c.instantaneaQMm, 1)} variable
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Flechas amplificadas y a escala común entre sí. La contraflecha se descuenta sólo de
        wnet,fin, ec. (7.2); la fluencia se suma sólo a las finales.
      </figcaption>
    </figure>
  );
}
