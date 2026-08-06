"use client";

/**
 * Predimensionado de un muro de contención en ménsula.
 *
 * Las proporciones son las de manual de oficina, expresadas en función de la
 * altura total H: sirven para arrancar con una geometría que suele verificar, no
 * para saltearse las comprobaciones. Una vez cargadas hay que correr vuelco,
 * deslizamiento y tensión igual.
 *
 * Se dibuja de cero y no se reproduce ninguna figura publicada: las relaciones
 * dimensionales son de dominio general, el dibujo que las ilustra no.
 */

interface Props {
  /** Altura total del muro, de la base de la zapata a la coronación. */
  alturaTotalM: number;
  /** Se dispara al aceptar las dimensiones propuestas. */
  onAplicar: (dimensiones: DimensionesPropuestas) => void;
}

export interface DimensionesPropuestas {
  anchoZapataM: number;
  cantoZapataM: number;
  alturaMuroM: number;
  espesorMuroM: number;
}

const ANCHO = 380;
const ALTO = 240;

const fmt = (n: number, d = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Redondeo a 5 cm, que es como se construye. */
const aMultiplo = (m: number) => Math.round(m / 0.05) * 0.05;

export function proponerDimensiones(alturaTotalM: number): DimensionesPropuestas {
  const h = alturaTotalM;
  return {
    // La zapata ronda 0,5·H de ancho; menos que eso suele no verificar a vuelco.
    anchoZapataM: Math.max(aMultiplo(0.5 * h), 0.6),
    // Canto de zapata y espesor del alzado, del orden de H/12, con mínimos
    // constructivos de 25 cm para poder armar y hormigonar.
    cantoZapataM: Math.max(aMultiplo(h / 12), 0.25),
    alturaMuroM: aMultiplo(h - Math.max(aMultiplo(h / 12), 0.25)),
    espesorMuroM: Math.max(aMultiplo(h / 12), 0.25),
  };
}

export function PredimensionadoMuro({ alturaTotalM, onAplicar }: Props) {
  const p = proponerDimensiones(alturaTotalM);
  const puntera = p.anchoZapataM / 3;

  const escala = Math.min(150 / alturaTotalM, 150 / p.anchoZapataM);
  const yBase = ALTO - 40;
  const xIzq = 120;
  const px = (m: number) => m * escala;

  const yTopZapata = yBase - px(p.cantoZapataM);
  const yCoronacion = yBase - px(alturaTotalM);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Predimensionado para ${fmt(alturaTotalM)} m de altura`}>
        {/* Zapata. */}
        <rect x={xIzq} y={yTopZapata} width={px(p.anchoZapataM)} height={px(p.cantoZapataM)}
              className="fill-primary/10 stroke-foreground/60" strokeWidth={1.3} />
        {/* Alzado, apoyado tras la puntera. */}
        <rect x={xIzq + px(puntera)} y={yCoronacion}
              width={px(p.espesorMuroM)} height={px(p.alturaMuroM)}
              className="fill-primary/10 stroke-foreground/60" strokeWidth={1.3} />

        {/* Cota de altura total. */}
        <line x1={xIzq - 26} y1={yCoronacion} x2={xIzq - 26} y2={yBase}
              className="stroke-muted-foreground" strokeWidth={1} />
        <text x={xIzq - 30} y={(yCoronacion + yBase) / 2} textAnchor="end"
              className="fill-muted-foreground text-[9px]">H = {fmt(alturaTotalM)} m</text>

        {/* Cota del ancho de zapata. */}
        <line x1={xIzq} y1={yBase + 16} x2={xIzq + px(p.anchoZapataM)} y2={yBase + 16}
              className="stroke-muted-foreground" strokeWidth={1} />
        <text x={xIzq + px(p.anchoZapataM) / 2} y={yBase + 28} textAnchor="middle"
              className="fill-muted-foreground text-[9px]">
          A ≈ 0,5·H = {fmt(p.anchoZapataM)} m
        </text>

        <text x={xIzq + px(p.anchoZapataM) + 8} y={yTopZapata + px(p.cantoZapataM) / 2 + 3}
              className="fill-muted-foreground text-[9px]">
          canto ≈ H/12 = {fmt(p.cantoZapataM)} m
        </text>
        <text x={xIzq + px(puntera) + px(p.espesorMuroM) + 8} y={yCoronacion + 12}
              className="fill-muted-foreground text-[9px]">
          espesor ≈ H/12 = {fmt(p.espesorMuroM)} m
        </text>
        <text x={xIzq + px(puntera) / 2} y={yTopZapata - 6} textAnchor="middle"
              className="fill-muted-foreground text-[9px]">
          puntera ≈ A/3
        </text>
      </svg>

      <button
        type="button"
        onClick={() => onAplicar(p)}
        className="w-full rounded-md border border-primary/50 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        Cargar estas dimensiones
      </button>
      <p className="text-xs text-muted-foreground">
        Es un punto de partida, no un resultado: son proporciones que suelen verificar. Hay que
        correr vuelco, deslizamiento y tensión igual, y ajustar desde ahí.
      </p>
    </div>
  );
}
