"use client";

/**
 * Cascada de pérdidas: de la tensión de tesado a la efectiva, restando una a una.
 *
 * Es la lectura que una tabla de cuatro números no da: se ve cuál pesa más y
 * cuánto queda al final. La fluencia puede salir negativa —cuando la carga
 * sostenida descomprime el hormigón a la altura del cordón, el acero recupera
 * tensión— y en ese caso el tramo se dibuja hacia arriba, que es lo que pasa.
 */

interface Props {
  tensionTrasTesadoMPa: number;
  esMPa: number;
  shMPa: number;
  crMPa: number;
  reMPa: number;
  tensionEfectivaMPa: number;
  admisibleMPa: number;
}

const ANCHO = 420;
const ALTO = 190;
const BASE = ALTO - 34;
const TECHO = 18;

const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaPerdidas({
  tensionTrasTesadoMPa,
  esMPa,
  shMPa,
  crMPa,
  reMPa,
  tensionEfectivaMPa,
  admisibleMPa,
}: Props) {
  const tramos = [
    { etiqueta: "ES", valor: esMPa, detalle: "acortamiento elástico" },
    { etiqueta: "SH", valor: shMPa, detalle: "contracción" },
    { etiqueta: "CR", valor: crMPa, detalle: "fluencia" },
    { etiqueta: "RE", valor: reMPa, detalle: "relajación" },
  ];

  const maximo = Math.max(tensionTrasTesadoMPa, admisibleMPa) * 1.08;
  const y = (mpa: number) => BASE - (mpa / maximo) * (BASE - TECHO);

  const anchoColumna = 46;
  const paso = (ANCHO - 60) / (tramos.length + 2);
  const xDe = (i: number) => 30 + paso * i + (paso - anchoColumna) / 2;

  // Cada tramo arranca donde terminó el anterior.
  let acumulado = tensionTrasTesadoMPa;
  const barras = tramos.map((t, i) => {
    const desde = acumulado;
    const hasta = acumulado - t.valor;
    acumulado = hasta;
    return { ...t, i: i + 1, desde, hasta };
  });

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Pérdidas: de ${fmt(tensionTrasTesadoMPa)} a ${fmt(tensionEfectivaMPa)} MPa`}>
        {/* Tensión admisible en el cordón: si la barra inicial la supera, no verifica. */}
        <line x1={20} y1={y(admisibleMPa)} x2={ANCHO - 8} y2={y(admisibleMPa)}
              className="stroke-destructive/70" strokeWidth={1} strokeDasharray="4 3" />
        <text x={ANCHO - 8} y={y(admisibleMPa) - 4} textAnchor="end"
              className="fill-destructive text-[9px]">
          admisible {fmt(admisibleMPa)} MPa
        </text>

        {/* Columna inicial: tensión tras el tesado. */}
        <rect x={xDe(0)} y={y(tensionTrasTesadoMPa)} width={anchoColumna}
              height={BASE - y(tensionTrasTesadoMPa)}
              className={tensionTrasTesadoMPa <= admisibleMPa ? "fill-primary/35 stroke-primary" : "fill-destructive/25 stroke-destructive"}
              strokeWidth={1.2} />
        <text x={xDe(0) + anchoColumna / 2} y={y(tensionTrasTesadoMPa) - 5} textAnchor="middle"
              className="fill-foreground text-[10px] tabular-nums">{fmt(tensionTrasTesadoMPa)}</text>
        <text x={xDe(0) + anchoColumna / 2} y={BASE + 12} textAnchor="middle"
              className="fill-muted-foreground text-[9px]">tesado</text>

        {/* Tramos de pérdida. */}
        {barras.map((b) => {
          const arriba = Math.min(y(b.desde), y(b.hasta));
          const alto = Math.abs(y(b.hasta) - y(b.desde));
          const recupera = b.valor < 0;
          return (
            <g key={b.etiqueta}>
              <rect x={xDe(b.i)} y={arriba} width={anchoColumna} height={Math.max(alto, 1)}
                    className={recupera ? "fill-emerald-600/30 stroke-emerald-700" : "fill-destructive/30 stroke-destructive/70"}
                    strokeWidth={1} />
              {/* Línea de continuidad hasta la columna siguiente. */}
              <line x1={xDe(b.i)} y1={y(b.desde)} x2={xDe(b.i) - (paso - anchoColumna)} y2={y(b.desde)}
                    className="stroke-muted-foreground/50" strokeWidth={0.8} strokeDasharray="2 2" />
              <text x={xDe(b.i) + anchoColumna / 2} y={arriba - 4} textAnchor="middle"
                    className="fill-foreground text-[9px] tabular-nums">
                {b.valor < 0 ? "+" : "−"}{fmt(Math.abs(b.valor))}
              </text>
              <text x={xDe(b.i) + anchoColumna / 2} y={BASE + 12} textAnchor="middle"
                    className="fill-muted-foreground text-[9px]">{b.etiqueta}</text>
            </g>
          );
        })}

        {/* Columna final. */}
        <rect x={xDe(tramos.length + 1)} y={y(tensionEfectivaMPa)} width={anchoColumna}
              height={BASE - y(tensionEfectivaMPa)}
              className="fill-primary/35 stroke-primary" strokeWidth={1.2} />
        <text x={xDe(tramos.length + 1) + anchoColumna / 2} y={y(tensionEfectivaMPa) - 5}
              textAnchor="middle" className="fill-foreground text-[10px] tabular-nums">
          {fmt(tensionEfectivaMPa)}
        </text>
        <text x={xDe(tramos.length + 1) + anchoColumna / 2} y={BASE + 12} textAnchor="middle"
              className="fill-muted-foreground text-[9px]">efectiva</text>

        <line x1={20} y1={BASE} x2={ANCHO - 8} y2={BASE} className="stroke-foreground/40" strokeWidth={1} />
        <text x={20} y={ALTO - 6} className="fill-muted-foreground text-[9px]">Tensión en el cordón (MPa)</text>
      </svg>
    </figure>
  );
}
