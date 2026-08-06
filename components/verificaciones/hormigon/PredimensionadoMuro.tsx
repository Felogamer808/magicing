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
  /** Extremos de la horquilla 0,5–0,8·h para el ancho de zapata. */
  anchoZapataMinM: number;
  anchoZapataMaxM: number;
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

/**
 * Proporciones de referencia para un muro en ménsula, en función de la altura
 * total h:
 *
 *   hastial (alzado)   0,1·h        · mínimo constructivo de 25 cm
 *   zapata, ancho      0,5 a 0,8·h  · se toma 0,6·h, en el medio de la horquilla
 *   zapata, canto      0,1·h        · igual que el hastial
 *
 * El ancho de zapata es el que más varía: con suelo bueno y poca sobrecarga se
 * va al extremo bajo, y con suelo flojo hay que ir al alto. Por eso se devuelven
 * también los dos límites, para poder moverse dentro de la horquilla si el
 * vuelco no verifica.
 */
export function proponerDimensiones(alturaTotalM: number): DimensionesPropuestas {
  const h = alturaTotalM;
  const espesor = Math.max(aMultiplo(0.1 * h), 0.25);
  return {
    anchoZapataM: Math.max(aMultiplo(0.6 * h), 0.6),
    anchoZapataMinM: Math.max(aMultiplo(0.5 * h), 0.6),
    anchoZapataMaxM: Math.max(aMultiplo(0.8 * h), 0.6),
    cantoZapataM: espesor,
    alturaMuroM: aMultiplo(h - espesor),
    espesorMuroM: espesor,
  };
}

/** Flecha con rótulo, para señalar una parte del muro sin tapar el dibujo. */
function Senal({
  x, y, hacia, texto,
}: { x: number; y: number; hacia: "izquierda" | "derecha"; texto: string }) {
  const signo = hacia === "derecha" ? 1 : -1;
  const largo = 26;
  const xFin = x + signo * largo;
  return (
    <g>
      <line x1={xFin} y1={y} x2={x + signo * 3} y2={y} className="stroke-primary" strokeWidth={1.1} />
      <polygon
        points={`${x},${y} ${x + signo * 6},${y - 3} ${x + signo * 6},${y + 3}`}
        className="fill-primary"
      />
      <text x={xFin + signo * 3} y={y + 3} textAnchor={hacia === "derecha" ? "start" : "end"}
            className="fill-primary text-[9px]">
        {texto}
      </text>
    </g>
  );
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
          A = 0,5 a 0,8·h → {fmt(p.anchoZapataM)} m
        </text>

        <text x={xIzq + px(p.anchoZapataM) + 8} y={yTopZapata + px(p.cantoZapataM) / 2 + 3}
              className="fill-muted-foreground text-[9px]">
          canto 0,1·h = {fmt(p.cantoZapataM)} m
        </text>

        {/* Las tres partes, señaladas con su flecha. */}
        <Senal
          x={xIzq + px(puntera) + px(p.espesorMuroM)} y={yCoronacion + px(p.alturaMuroM) * 0.35}
          hacia="derecha" texto={`hastial · 0,1·h = ${fmt(p.espesorMuroM)} m`} />
        <Senal
          x={xIzq + px(puntera) / 2} y={yTopZapata + px(p.cantoZapataM) / 2}
          hacia="izquierda" texto="puntera" />
        <Senal
          x={xIzq + px(puntera) + px(p.espesorMuroM) + (px(p.anchoZapataM) - px(puntera) - px(p.espesorMuroM)) / 2}
          y={yTopZapata + px(p.cantoZapataM) / 2}
          hacia="derecha" texto="talón" />
      </svg>

      <button
        type="button"
        onClick={() => onAplicar(p)}
        className="w-full rounded-md border border-primary/50 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        Cargar estas dimensiones
      </button>
      <p className="text-xs text-muted-foreground">
        Es un punto de partida, no un resultado. El ancho de zapata es el que más se mueve: la
        horquilla va de {fmt(p.anchoZapataMinM)} a {fmt(p.anchoZapataMaxM)} m, y si el vuelco no
        verifica hay que ir hacia el extremo alto. Correr las tres comprobaciones igual.
      </p>
    </div>
  );
}
