"use client";

/**
 * Esquema de la viga y sus tres diagramas: cortante, flector y deformada.
 *
 * Los cuatro paneles van apilados dentro de un mismo SVG y comparten la escala
 * horizontal. Eso es lo que hace que se puedan leer juntos —dónde se anula el
 * cortante es dónde el flector hace punta— y además es lo que lo vuelve legible
 * en un teléfono: apilado y angosto, sin scroll lateral.
 *
 * El flector se dibuja del lado traccionado, que es la convención con la que se
 * arma: positivo hacia abajo.
 *
 * Recibe el resultado ya calculado. No calcula nada.
 */

import type {
  CargaViga,
  NodoViga,
  ResultadoViga,
} from "@/lib/calc/estatica/viga-continua";

interface Props {
  largoM: number;
  nodos: readonly NodoViga[];
  cargas: readonly CargaViga[];
  resultado: ResultadoViga;
}

const ANCHO = 320;
const IZQ = 30;
const DER = 12;
const ALTO_ESQUEMA = 74;
const ALTO_PANEL = 78;
const ALTO = ALTO_ESQUEMA + 3 * ALTO_PANEL;

/** Media altura útil de cada panel: cuánto puede subir o bajar la curva. */
const AMPLITUD = 24;

const num = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

export function DiagramasViga({ largoM, nodos, cargas, resultado }: Props) {
  const utilX = ANCHO - IZQ - DER;
  const px = (x: number) => IZQ + (x / largoM) * utilX;

  const paneles = [
    {
      clave: "cortante" as const,
      titulo: "Cortante V",
      unidad: "kN",
      valores: resultado.puntos.map((p) => p.cortanteKN),
      extremo: resultado.cortanteMax,
      trazo: "stroke-sky-600",
      relleno: "fill-sky-500/15",
    },
    {
      clave: "momento" as const,
      titulo: "Flector M (del lado traccionado)",
      unidad: "kN·m",
      valores: resultado.puntos.map((p) => p.momentoKNm),
      extremo:
        Math.abs(resultado.momentoMin.valor) > Math.abs(resultado.momentoMax.valor)
          ? resultado.momentoMin
          : resultado.momentoMax,
      trazo: "stroke-primary",
      relleno: "fill-primary/15",
    },
    {
      clave: "flecha" as const,
      titulo: "Deformada δ",
      unidad: "mm",
      valores: resultado.puntos.map((p) => p.flechaMm),
      extremo: resultado.flechaMax,
      trazo: "stroke-emerald-600",
      relleno: "fill-emerald-500/10",
    },
  ];

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Viga de ${num(largoM, 2)} metros con sus diagramas de cortante, momento flector y deformada`}
      >
        <Esquema largoM={largoM} nodos={nodos} cargas={cargas} px={px} />

        {paneles.map((panel, k) => (
          <Panel
            key={panel.clave}
            titulo={panel.titulo}
            unidad={panel.unidad}
            valores={panel.valores}
            xs={resultado.puntos.map((p) => p.xM)}
            extremo={panel.extremo}
            // El flector se dibuja invertido para que quede del lado traccionado.
            invertido={panel.clave === "momento"}
            trazo={panel.trazo}
            relleno={panel.relleno}
            top={ALTO_ESQUEMA + k * ALTO_PANEL}
            px={px}
          />
        ))}
      </svg>
    </figure>
  );
}

// --------------------------------------------------------------------------

function Esquema({
  largoM,
  nodos,
  cargas,
  px,
}: {
  largoM: number;
  nodos: readonly NodoViga[];
  cargas: readonly CargaViga[];
  px: (x: number) => number;
}) {
  const yViga = 56;
  const distribuidas = cargas.filter((c) => c.tipo === "distribuida");
  const qPico = Math.max(
    1e-9,
    ...distribuidas.flatMap((c) => [Math.abs(c.qInicialKNm), Math.abs(c.qFinalKNm)])
  );
  // Alto del bloque de carga: proporcional a q, con un mínimo para que una carga
  // chiquita al lado de una grande igual se vea.
  const altoQ = (q: number) => 6 + (Math.abs(q) / qPico) * 16;

  return (
    <g>
      {distribuidas.map((c, i) => {
        if (c.tipo !== "distribuida") return null;
        const x0 = px(c.desdeM);
        const x1 = px(c.hastaM);
        const y0 = yViga - 8 - altoQ(c.qInicialKNm);
        const y1 = yViga - 8 - altoQ(c.qFinalKNm);
        return (
          <g key={`q${i}`}>
            <path
              d={`M${x0},${yViga - 8} L${x0},${y0} L${x1},${y1} L${x1},${yViga - 8} Z`}
              className="fill-sky-500/20 stroke-sky-600"
              strokeWidth={0.8}
            />
            <text
              x={(x0 + x1) / 2}
              y={Math.min(y0, y1) - 3}
              textAnchor="middle"
              className="fill-sky-700 text-[8px]"
            >
              {num(Math.max(Math.abs(c.qInicialKNm), Math.abs(c.qFinalKNm)), 2)} kN/m
            </text>
          </g>
        );
      })}

      {cargas.map((c, i) => {
        if (c.tipo === "puntual") {
          const x = px(c.xM);
          return (
            <g key={`p${i}`}>
              <line
                x1={x} y1={yViga - 30} x2={x} y2={yViga - 4}
                className="stroke-foreground" strokeWidth={1.2}
              />
              <path d={`M${x},${yViga - 2} l-3,-6 l6,0 Z`} className="fill-foreground" />
              <text x={x} y={yViga - 33} textAnchor="middle" className="fill-foreground text-[8px]">
                {num(c.pKN, 2)} kN
              </text>
            </g>
          );
        }
        if (c.tipo === "momento") {
          const x = px(c.xM);
          return (
            <g key={`m${i}`}>
              <path
                d={`M${x - 9},${yViga - 12} A 9 9 0 1 ${c.mKNm >= 0 ? 1 : 0} ${x + 9},${yViga - 12}`}
                className="fill-none stroke-foreground"
                strokeWidth={1.2}
              />
              <text x={x} y={yViga - 25} textAnchor="middle" className="fill-foreground text-[8px]">
                {num(c.mKNm, 2)} kN·m
              </text>
            </g>
          );
        }
        return null;
      })}

      <line
        x1={px(0)} y1={yViga} x2={px(largoM)} y2={yViga}
        className="stroke-foreground" strokeWidth={2}
      />

      {nodos.map((n, i) => (
        <Apoyo key={`a${i}`} x={px(n.xM)} y={yViga} tipo={n.apoyo} />
      ))}

      <text x={px(largoM)} y={yViga + 18} textAnchor="end" className="fill-muted-foreground text-[8px]">
        L total = {num(largoM, 2)} m
      </text>
    </g>
  );
}

function Apoyo({ x, y, tipo }: { x: number; y: number; tipo: NodoViga["apoyo"] }) {
  if (tipo === "libre") return null;
  if (tipo === "empotrado") {
    return (
      <g>
        <line x1={x} y1={y - 11} x2={x} y2={y + 11} className="stroke-foreground" strokeWidth={2} />
        {[-8, -4, 0, 4, 8].map((d) => (
          <line
            key={d}
            x1={x} y1={y + d} x2={x + (x < 40 ? -6 : 6)} y2={y + d + 4}
            className="stroke-muted-foreground" strokeWidth={0.9}
          />
        ))}
      </g>
    );
  }
  return (
    <g>
      <path d={`M${x},${y} l-6,10 l12,0 Z`} className="fill-background stroke-foreground" strokeWidth={1.2} />
      <line x1={x - 8} y1={y + 12} x2={x + 8} y2={y + 12} className="stroke-foreground" strokeWidth={1.2} />
    </g>
  );
}

// --------------------------------------------------------------------------

function Panel({
  titulo,
  unidad,
  valores,
  xs,
  extremo,
  invertido,
  trazo,
  relleno,
  top,
  px,
}: {
  titulo: string;
  unidad: string;
  valores: number[];
  xs: number[];
  extremo: { xM: number; valor: number };
  invertido: boolean;
  trazo: string;
  relleno: string;
  top: number;
  px: (x: number) => number;
}) {
  const yCero = top + 44;
  const pico = Math.max(...valores.map(Math.abs), Math.abs(extremo.valor));
  // Una viga descargada da todo cero: sin este piso la escala se iría a infinito.
  const escala = pico < 1e-9 ? 0 : AMPLITUD / pico;
  const signo = invertido ? 1 : -1;
  const py = (v: number) => yCero + signo * v * escala;

  const puntos = valores.map((v, i) => `${px(xs[i]).toFixed(2)},${py(v).toFixed(2)}`).join(" ");
  const area = `M${px(xs[0]).toFixed(2)},${yCero} L${puntos.split(" ").join(" L")} L${px(
    xs[xs.length - 1]
  ).toFixed(2)},${yCero} Z`;

  const xe = px(extremo.xM);
  const ye = py(extremo.valor);
  // La etiqueta del máximo se corre para adentro cuando el máximo cae en un borde.
  const anclaje = xe < 60 ? "start" : xe > ANCHO - 60 ? "end" : "middle";

  return (
    <g>
      <text x={IZQ} y={top + 12} className="fill-foreground text-[9px] font-medium">
        {titulo}
      </text>

      <path d={area} className={relleno} />
      <polyline points={puntos} className={`fill-none ${trazo}`} strokeWidth={1.4} />
      <line
        x1={px(xs[0])} y1={yCero} x2={px(xs[xs.length - 1])} y2={yCero}
        className="stroke-muted-foreground" strokeWidth={0.8}
      />

      {pico > 1e-9 && (
        <>
          <circle cx={xe} cy={ye} r={2.4} className={trazo.replace("stroke-", "fill-")} />
          <text
            x={xe}
            y={ye + (signo * extremo.valor > 0 ? 12 : -6)}
            textAnchor={anclaje}
            className="fill-foreground text-[8px] font-medium"
          >
            {num(extremo.valor, 2)} {unidad} · x = {num(extremo.xM, 2)} m
          </text>
        </>
      )}
    </g>
  );
}
