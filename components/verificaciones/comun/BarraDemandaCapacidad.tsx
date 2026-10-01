import { fmt } from "@/lib/verificaciones/formato";

/**
 * Barra de demanda contra capacidad: cuánto de lo disponible se está usando.
 *
 * Un "7,39 ≤ 27,60 MPa — verifica" dice si pasa pero no dice por cuánto, y ese
 * margen es lo que decide si la pieza se puede afinar o si está al límite. La
 * barra lo muestra de un vistazo y el número lo dice exacto.
 *
 * El estado no se comunica sólo por color: va el porcentaje escrito, la palabra
 * del estado y un patrón de rayas cuando se pasa de 1,00. Un semáforo que sólo
 * es color no lo lee quien no distingue esos tonos, y en la hoja impresa en
 * blanco y negro no lo lee nadie.
 */

interface BarraDemandaCapacidadProps {
  /** Lo que se exige, en las unidades que sean. */
  demanda: number;
  /** Lo que resiste, en las mismas unidades. */
  capacidad: number;
  unidad?: string;
  etiquetaDemanda?: string;
  etiquetaCapacidad?: string;
  decimales?: number;
}

/** Umbral a partir del cual conviene avisar que queda poco margen. */
const AL_LIMITE = 0.9;

export function BarraDemandaCapacidad({
  demanda,
  capacidad,
  unidad,
  etiquetaDemanda = "Solicitación",
  etiquetaCapacidad = "Resistencia",
  decimales = 2,
}: BarraDemandaCapacidadProps) {
  const utilizacion = capacidad > 0 ? demanda / capacidad : Infinity;
  const verifica = Number.isFinite(utilizacion) && utilizacion <= 1;
  const alLimite = verifica && utilizacion >= AL_LIMITE;
  // Por encima de 1 la barra se llena y el exceso se dice con el número: una
  // barra que se saliera del riel no se podría comparar con las demás.
  const porcentajeDibujado = Math.min(Number.isFinite(utilizacion) ? utilizacion : 1, 1) * 100;

  const color = !verifica
    ? "var(--destructive)"
    : alLimite
      ? "var(--mat-fuego)"
      : "var(--exito)";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm tabular-nums">
          <span>
            <span className="text-[11px] text-muted-foreground">{etiquetaDemanda} </span>
            {fmt(demanda, decimales)}
          </span>
          <span>
            <span className="text-[11px] text-muted-foreground">{etiquetaCapacidad} </span>
            {fmt(capacidad, decimales)}
          </span>
          {unidad && <span className="text-[11px] text-muted-foreground">{unidad}</span>}
        </div>
        <p className="font-mono text-sm font-semibold tabular-nums" style={{ color }}>
          {Number.isFinite(utilizacion) ? `${fmt(utilizacion * 100, 0)} %` : "—"}
          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
            de la capacidad
          </span>
        </p>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={Number.isFinite(utilizacion) ? Math.round(utilizacion * 100) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Utilización: ${etiquetaDemanda} ${fmt(demanda, decimales)} sobre ${etiquetaCapacidad} ${fmt(capacidad, decimales)}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${porcentajeDibujado}%`,
            backgroundColor: color,
            // Rayado cuando no verifica: el exceso se distingue sin depender del color.
            backgroundImage: verifica
              ? undefined
              : "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 8px)",
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {!Number.isFinite(utilizacion) ? (
          "Sin capacidad calculable con estos datos."
        ) : verifica ? (
          <>
            Cumple, con un margen del{" "}
            <strong className="text-foreground">{fmt((1 - utilizacion) * 100, 0)} %</strong>.
            {alLimite && " Queda poco margen: cualquier cambio de carga la deja al límite."}
          </>
        ) : (
          <>
            No cumple: la solicitación supera la resistencia en{" "}
            <strong className="text-destructive">{fmt((utilizacion - 1) * 100, 0)} %</strong>.
          </>
        )}
      </p>
    </div>
  );
}
