"use client";

/**
 * Esquema de la pieza y su diagrama de torsor Mt(x).
 *
 * Mismo lenguaje visual que `DiagramasViga`, pero con un solo panel: acá no
 * hay flexión ni flecha, sólo torsor. El apoyo dibujado sigue a `condicion`:
 * empotramiento sólo en x=0 para "empotrada-libre", o un apoyo simple en
 * cada extremo para "apoyada-simetrica".
 */

import type { CargaTorsion, CondicionApoyoTorsion, ResultadoTorsion } from "@/lib/calc/estatica/torsion-viga";

interface Props {
  largoM: number;
  cargas: readonly CargaTorsion[];
  resultado: ResultadoTorsion;
  condicion: CondicionApoyoTorsion;
}

const ANCHO_MOVIL = 320;
const ANCHO_ESCRITORIO = 560;
const IZQ = 30;
const DER = 12;
const ALTO_ESQUEMA = 74;
const ALTO_PANEL = 100;
const ALTO = ALTO_ESQUEMA + ALTO_PANEL;
const AMPLITUD = 26;
const ROTULO_MIN = 24;
const ROTULO_MAX = ALTO_PANEL - 12;

const num = (n: number, d = 1) =>
  (Math.abs(n) < 5e-9 ? 0 : n).toLocaleString("es-AR", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });

export function DiagramaTorsion({ largoM, cargas, resultado, condicion }: Props) {
  return (
    <figure className="w-full">
      <Lienzo ancho={ANCHO_MOVIL} clase="h-auto w-full lg:hidden" largoM={largoM} cargas={cargas} resultado={resultado} condicion={condicion} />
      <Lienzo ancho={ANCHO_ESCRITORIO} clase="hidden h-auto w-full lg:block" largoM={largoM} cargas={cargas} resultado={resultado} condicion={condicion} />
    </figure>
  );
}

function Lienzo({ ancho, clase, largoM, cargas, resultado, condicion }: Props & { ancho: number; clase: string }) {
  const utilX = ancho - IZQ - DER;
  const px = (x: number) => IZQ + (x / largoM) * utilX;

  return (
    <svg
      viewBox={`0 0 ${ancho} ${ALTO}`}
      className={clase}
      role="img"
      aria-label={`Pieza de ${num(largoM, 2)} metros ${
        condicion === "empotrada-libre" ? "empotrada en x=0" : "apoyada en los dos extremos"
      }, con su diagrama de torsor`}
    >
      <Esquema largoM={largoM} cargas={cargas} px={px} condicion={condicion} />
      <Panel
        valores={resultado.puntos.map((p) => p.torsorKNm)}
        xs={resultado.puntos.map((p) => p.xM)}
        extremo={resultado.torsorMax}
        top={ALTO_ESQUEMA}
        ancho={ancho}
        px={px}
      />
    </svg>
  );
}

function Esquema({
  largoM,
  cargas,
  px,
  condicion,
}: {
  largoM: number;
  cargas: readonly CargaTorsion[];
  px: (x: number) => number;
  condicion: CondicionApoyoTorsion;
}) {
  const yViga = 56;
  const repartidas = cargas.filter((c) => c.tipo === "repartida");
  const picoMt = Math.max(1e-9, ...repartidas.map((c) => Math.abs(c.torsorPorMetroKNmM)));
  const altoMt = (mt: number) => 6 + (Math.abs(mt) / picoMt) * 14;

  return (
    <g>
      {repartidas.map((c, i) => {
        if (c.tipo !== "repartida") return null;
        const x0 = px(c.desdeM);
        const x1 = px(c.hastaM);
        const y0 = yViga - 8 - altoMt(c.torsorPorMetroKNmM);
        return (
          <g key={`mt${i}`}>
            <path
              d={`M${x0},${yViga - 8} L${x0},${y0} L${x1},${y0} L${x1},${yViga - 8} Z`}
              className="fill-sky-500/20 stroke-sky-600"
              strokeWidth={0.8}
            />
            <text x={(x0 + x1) / 2} y={y0 - 3} textAnchor="middle" className="fill-sky-700 text-[8px]">
              mt = {num(c.torsorPorMetroKNmM, 2)} kN·m/m
            </text>
          </g>
        );
      })}

      {cargas.map((c, i) => {
        if (c.tipo !== "puntual") return null;
        const x = px(c.xM);
        return (
          <g key={`t${i}`}>
            <path
              d={`M${x - 9},${yViga - 12} A 9 9 0 1 ${c.torsorKNm >= 0 ? 1 : 0} ${x + 9},${yViga - 12}`}
              className="fill-none stroke-foreground"
              strokeWidth={1.2}
            />
            <text x={x} y={yViga - 25} textAnchor="middle" className="fill-foreground text-[8px]">
              T0 = {num(c.torsorKNm, 2)} kN·m
            </text>
          </g>
        );
      })}

      <line x1={px(0)} y1={yViga} x2={px(largoM)} y2={yViga} className="stroke-foreground" strokeWidth={2} />

      {condicion === "empotrada-libre" ? (
        <Empotramiento x={px(0)} y={yViga} />
      ) : (
        <>
          <ApoyoSimple x={px(0)} y={yViga} />
          <ApoyoSimple x={px(largoM)} y={yViga} />
        </>
      )}

      <text x={px(largoM)} y={yViga + 18} textAnchor="end" className="fill-muted-foreground text-[8px]">
        L total = {num(largoM, 2)} m
      </text>
    </g>
  );
}

function Empotramiento({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y - 11} x2={x} y2={y + 11} className="stroke-foreground" strokeWidth={2} />
      {[-8, -4, 0, 4, 8].map((d) => (
        <line
          key={d}
          x1={x} y1={y + d} x2={x - 6} y2={y + d + 4}
          className="stroke-muted-foreground" strokeWidth={0.9}
        />
      ))}
    </g>
  );
}

/** Restringe el giro pero no lo empotra: el mismo triángulo que usa DiagramasViga para un apoyo simple. */
function ApoyoSimple({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x},${y} l-6,10 l12,0 Z`} className="fill-background stroke-foreground" strokeWidth={1.2} />
      <line x1={x - 8} y1={y + 12} x2={x + 8} y2={y + 12} className="stroke-foreground" strokeWidth={1.2} />
    </g>
  );
}

function Panel({
  valores,
  xs,
  extremo,
  top,
  ancho,
  px,
}: {
  valores: number[];
  xs: number[];
  extremo: { xM: number; valor: number };
  top: number;
  ancho: number;
  px: (x: number) => number;
}) {
  const yCero = top + 56;
  const pico = Math.max(...valores.map(Math.abs), Math.abs(extremo.valor));
  const escala = pico < 1e-9 ? 0 : AMPLITUD / pico;
  const py = (v: number) => yCero - v * escala;

  const puntos = valores.map((v, i) => `${px(xs[i]).toFixed(2)},${py(v).toFixed(2)}`).join(" ");
  const area = `M${px(xs[0]).toFixed(2)},${yCero} L${puntos.split(" ").join(" L")} L${px(
    xs[xs.length - 1]
  ).toFixed(2)},${yCero} Z`;

  const xe = px(extremo.xM);
  const ye = py(extremo.valor);
  const anclaje = xe < 60 ? "start" : xe > ancho - 60 ? "end" : "middle";
  const yRotulo = Math.min(top + ROTULO_MAX, Math.max(top + ROTULO_MIN, ye + (extremo.valor > 0 ? -7 : 13)));

  return (
    <g>
      <text x={IZQ} y={top + 10} className="fill-foreground text-[9px] font-medium">
        Torsor Mt
      </text>

      <path d={area} className="fill-primary/15" />
      <polyline points={puntos} className="fill-none stroke-primary" strokeWidth={1.4} />
      <line
        x1={px(xs[0])} y1={yCero} x2={px(xs[xs.length - 1])} y2={yCero}
        className="stroke-muted-foreground" strokeWidth={0.8}
      />

      {pico > 1e-9 && (
        <>
          <circle cx={xe} cy={ye} r={2.4} className="fill-primary" />
          <text x={xe} y={yRotulo} textAnchor={anclaje} className="fill-foreground text-[8px] font-medium">
            {num(extremo.valor, 2)} kN·m · x = {num(extremo.xM, 2)} m
          </text>
        </>
      )}
    </g>
  );
}
