"use client";

/**
 * Diagrama de interacción del artículo H1.1: la envolvente bilineal y el punto
 * de trabajo encima.
 *
 * Es donde el dibujo gana más frente al número. La interacción da un escalar,
 * pero no dice si la barra está gobernada por la axial o por el momento, ni
 * cuánto se puede subir uno bajando el otro. La envolvente lo muestra: por
 * encima de Pr/Pc = 0,2 la recta es más tendida —el momento entra afectado por
 * 8/9— y por debajo se quiebra, porque la axial pasa a contar a la mitad.
 */

interface Props {
  relacionAxial: number;
  /** Suma de los dos términos de flexión, ya con su factor. */
  terminoFlexion: number;
  interaccion: number;
  ecuacion: "H1-1a" | "H1-1b";
  verifica: boolean;
}

const LADO = 250;
const IZQ = 46;
const BASE = LADO - 40;
const TOP = 16;
const DER = LADO - 14;

const fmt = (n: number, d = 3) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaInteraccion({
  relacionAxial, terminoFlexion, interaccion, ecuacion, verifica,
}: Props) {
  // El eje llega hasta 1,15 para que un punto que no verifica quede dentro.
  const tope = Math.max(1.15, relacionAxial * 1.1, terminoFlexion * 1.1);
  const x = (m: number) => IZQ + (m / tope) * (DER - IZQ);
  const y = (p: number) => BASE - (p / tope) * (BASE - TOP);

  /*
   * Envolvente. Por encima de 0,2 rige H1-1a: p + (8/9)·m = 1. Por debajo,
   * H1-1b: p/2 + m = 1. Las dos se cortan justo en p = 0,2, m = 0,9.
   */
  const envolvente = [
    `${x(1)},${y(0)}`,
    `${x(0.9)},${y(0.2)}`,
    `${x(0)},${y(1)}`,
  ];

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${LADO} ${LADO}`} className="h-auto w-full max-w-[280px]" role="img"
           aria-label={`Interacción ${fmt(interaccion)} por ${ecuacion}`}>
        {/* Zona segura, debajo de la envolvente. */}
        <polygon points={`${x(0)},${y(0)} ${envolvente.join(" ")}`}
                 className="fill-emerald-600/10" />

        <line x1={IZQ} y1={TOP - 6} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />

        {/* Quiebre en Pr/Pc = 0,2, que es donde cambia la ecuación. */}
        <line x1={IZQ} y1={y(0.2)} x2={x(0.9)} y2={y(0.2)}
              className="stroke-muted-foreground/50" strokeWidth={0.8} strokeDasharray="3 2" />
        <text x={IZQ - 5} y={y(0.2) + 3} textAnchor="end" className="fill-muted-foreground text-[9.5px]">0,2</text>
        <text x={IZQ - 5} y={y(1) + 3} textAnchor="end" className="fill-muted-foreground text-[9.5px]">1,0</text>
        <text x={x(1)} y={BASE + 12} textAnchor="middle" className="fill-muted-foreground text-[9.5px]">1,0</text>

        <polyline points={envolvente.join(" ")} fill="none" className="stroke-primary" strokeWidth={1.8} />

        {/* Punto de trabajo. */}
        <line x1={x(terminoFlexion)} y1={y(relacionAxial)} x2={x(terminoFlexion)} y2={BASE}
              className="stroke-muted-foreground/60" strokeWidth={0.8} strokeDasharray="2 2" />
        <line x1={x(terminoFlexion)} y1={y(relacionAxial)} x2={IZQ} y2={y(relacionAxial)}
              className="stroke-muted-foreground/60" strokeWidth={0.8} strokeDasharray="2 2" />
        <circle cx={x(terminoFlexion)} cy={y(relacionAxial)} r={4.5}
                className={verifica ? "fill-emerald-600" : "fill-destructive"} />

        <text x={IZQ - 40} y={(TOP + BASE) / 2} className="fill-muted-foreground text-[10.5px]">Pr/Pc</text>
        <text x={DER} y={LADO - 6} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          ΣMr/Mc
        </text>
        <text x={IZQ + 4} y={TOP + 2}
              className={`text-[10.5px] ${verifica ? "fill-emerald-700" : "fill-destructive font-medium"}`}>
          {ecuacion} = {fmt(interaccion)}
        </text>
      </svg>
    </figure>
  );
}
