"use client";

import { SimboloApoyo } from "@/components/verificaciones/croquis/Primitivas";
import type { ModeloVigaLibre } from "@/lib/verificaciones/viga-libre-modelo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";

export type SeleccionVigaLibre =
  | { tipo: "nudo"; indice: number }
  | { tipo: "tramo"; indice: number }
  | { tipo: "carga"; indice: number }
  | null;

interface EsquemaVigaLibreProps {
  modelo: ModeloVigaLibre;
  seleccion: SeleccionVigaLibre;
  onSeleccionar: (s: SeleccionVigaLibre) => void;
}

const ANCHO = 760;
const IZQ = 40;
const DER = 40;
const CARRIL = 32;
const ALTO_PUNTUAL = 44;

/** Color por caso: G en el del texto, Q en el azul brillante. */
const COLOR = { G: "text-foreground", Q: "text-brillante" } as const;

/**
 * La viga como se arma: apoyos, cargas y cotas, todo clicable. Cada distribuida
 * va en su propio carril, una encima de otra, para que dos que se pisan se
 * puedan elegir por separado. No calcula nada: dibuja el modelo de textos, y
 * lo que todavía no es un número no se dibuja.
 */
export function EsquemaVigaLibre({ modelo, seleccion, onSeleccionar }: EsquemaVigaLibreProps) {
  const luces = modelo.tramos.map((t) => Math.max(aNumero(t.luz) || 0, 0));
  const xs = [0];
  for (const l of luces) xs.push(xs[xs.length - 1] + l);
  const largo = xs[xs.length - 1] || 1;
  const px = (x: number) => IZQ + (Math.min(Math.max(x, 0), largo) / largo) * (ANCHO - IZQ - DER);

  const distribuidas = modelo.cargas.map((c, i) => ({ c, i })).filter(({ c }) => c.tipo === "distribuida");
  const puntuales = modelo.cargas.map((c, i) => ({ c, i })).filter(({ c }) => c.tipo !== "distribuida");
  const qPico = Math.max(1e-9, ...distribuidas.flatMap(({ c }) => [Math.abs(aNumero(c.v1) || 0), Math.abs(aNumero(c.v2) || 0)]));

  const altoCargas = distribuidas.length * CARRIL + (puntuales.length ? ALTO_PUNTUAL : 0);
  const yViga = 24 + altoCargas + 8;
  const alto = yViga + 70;

  const elegida = (tipo: "nudo" | "tramo" | "carga", indice: number) =>
    seleccion?.tipo === tipo && seleccion.indice === indice;
  const alClic = (s: SeleccionVigaLibre) => (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onSeleccionar(s);
  };
  const conTeclado = (s: SeleccionVigaLibre) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") alClic(s)(e);
  };
  const interactivo = (s: SeleccionVigaLibre, etiqueta: string) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": etiqueta,
    onClick: alClic(s),
    onKeyDown: conTeclado(s),
    className: "cursor-pointer outline-none",
  });

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${alto}`}
      className="h-auto w-full select-none rounded-md border border-border bg-card"
      onClick={() => onSeleccionar(null)}
    >
      {/* Tramos: una franja clicable con su cota debajo. */}
      {luces.map((l, i) => {
        const x0 = px(xs[i]);
        const x1 = px(xs[i + 1]);
        const sel = elegida("tramo", i);
        return (
          <g key={`t${i}`} {...interactivo({ tipo: "tramo", indice: i }, `Tramo ${i + 1}, ${fmt(l, 2)} m`)}>
            <rect x={x0} y={yViga - 10} width={Math.max(x1 - x0, 1)} height={46} className={sel ? "fill-primary/15" : "fill-transparent hover:fill-primary/5"} />
            <line x1={x0} x2={x1} y1={yViga + 30} y2={yViga + 30} className="stroke-muted-foreground" strokeWidth={0.8} />
            <line x1={x0} x2={x0} y1={yViga + 25} y2={yViga + 35} className="stroke-muted-foreground" strokeWidth={0.8} />
            <line x1={x1} x2={x1} y1={yViga + 25} y2={yViga + 35} className="stroke-muted-foreground" strokeWidth={0.8} />
            <text x={(x0 + x1) / 2} y={yViga + 50} textAnchor="middle" className={`text-[14px] ${sel ? "fill-primary font-semibold" : "fill-muted-foreground"}`}>
              {fmt(l, 2)} m
            </text>
          </g>
        );
      })}

      {/* Distribuidas, cada una en su carril. */}
      {distribuidas.map(({ c, i }, k) => {
        const desde = aNumero(c.x1);
        const hasta = aNumero(c.x2);
        const q1 = aNumero(c.v1);
        const q2 = aNumero(c.v2);
        if (![desde, hasta, q1, q2].every(Number.isFinite) || !(hasta > desde)) return null;
        const base = yViga - 6 - k * CARRIL;
        const alt = (q: number) => 5 + (Math.abs(q) / qPico) * (CARRIL - 9);
        const x0 = px(desde);
        const x1 = px(hasta);
        const sel = elegida("carga", i);
        const flechas = Math.max(2, Math.round((x1 - x0) / 40));
        return (
          <g key={`q${i}`} {...interactivo({ tipo: "carga", indice: i }, `Carga ${i + 1}`)} className={`cursor-pointer outline-none ${COLOR[c.caso]}`}>
            <path
              d={`M${x0},${base} L${x0},${base - alt(q1)} L${x1},${base - alt(q2)} L${x1},${base} Z`}
              fill="currentColor"
              fillOpacity={sel ? 0.35 : 0.12}
              stroke="currentColor"
              strokeWidth={sel ? 2 : 1}
            />
            {Array.from({ length: flechas + 1 }, (_, j) => {
              const x = x0 + ((x1 - x0) * j) / flechas;
              return <line key={j} x1={x} x2={x} y1={base - alt(q1 + ((q2 - q1) * j) / flechas)} y2={base} stroke="currentColor" strokeWidth={0.6} />;
            })}
            <text x={x0 + 6} y={base - 6} className="stroke-card text-[14px]" strokeWidth={3} paintOrder="stroke" fill="currentColor">
              {c.caso} {q1 === q2 ? fmt(q1, 2) : `${fmt(q1, 2)}→${fmt(q2, 2)}`} kN/m
            </text>
          </g>
        );
      })}

      {/* Puntuales y momentos, sobre los carriles. */}
      {puntuales.map(({ c, i }) => {
        const x0 = aNumero(c.x1);
        const v = aNumero(c.v1);
        if (!Number.isFinite(x0) || !Number.isFinite(v)) return null;
        const x = px(x0);
        const sel = elegida("carga", i);
        const ancho = sel ? 2.4 : 1.4;
        return (
          <g key={`p${i}`} {...interactivo({ tipo: "carga", indice: i }, `Carga ${i + 1}`)} className={`cursor-pointer outline-none ${COLOR[c.caso]}`}>
            <rect x={x - 14} y={yViga - altoCargas - 6} width={28} height={altoCargas + 4} className="fill-transparent" />
            {c.tipo === "puntual" ? (
              <>
                <line x1={x} x2={x} y1={yViga - altoCargas + 6} y2={yViga - 6} stroke="currentColor" strokeWidth={ancho} />
                <path d={`M${x},${yViga - 2} l-4,-8 l8,0 Z`} fill="currentColor" />
                <text x={x + 5} y={yViga - altoCargas + 10} className="text-[14px]" fill="currentColor">
                  {c.caso} {fmt(v, 2)} kN
                </text>
              </>
            ) : (
              <>
                <path
                  d={`M${x - 11},${yViga - 10} A 11 11 0 1 ${v >= 0 ? 1 : 0} ${x + 11},${yViga - 10}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={ancho}
                />
                <text x={x + 14} y={yViga - 20} className="text-[14px]" fill="currentColor">
                  {c.caso} {fmt(v, 2)} kN·m
                </text>
              </>
            )}
          </g>
        );
      })}

      <line x1={px(0)} x2={px(largo)} y1={yViga} y2={yViga} className="stroke-foreground" strokeWidth={3} />

      {/* Nudos: el apoyo y un círculo para elegirlo. */}
      {xs.map((x, i) => {
        const apoyo = i === 0 ? modelo.apoyoInicial : modelo.tramos[i - 1].apoyoFinal;
        const sel = elegida("nudo", i);
        return (
          <g key={`n${i}`} {...interactivo({ tipo: "nudo", indice: i }, `Nudo ${i + 1}`)}>
            <circle cx={px(x)} cy={yViga} r={13} className={sel ? "fill-primary/25 stroke-primary" : "fill-transparent stroke-transparent hover:fill-primary/10"} strokeWidth={1.5} />
            {apoyo === "libre" ? (
              <circle cx={px(x)} cy={yViga} r={3.5} className="fill-card stroke-foreground" strokeWidth={1.5} />
            ) : (
              <g className="text-foreground">
                <SimboloApoyo
                  x={px(x)}
                  y={yViga}
                  tipo={apoyo === "empotrado" ? "empotrado" : "articulado"}
                  ladoEmpotrado={i === 0 ? "izquierda" : "derecha"}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
