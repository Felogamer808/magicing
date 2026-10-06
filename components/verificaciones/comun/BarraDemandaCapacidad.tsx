import { fmt } from "@/lib/verificaciones/formato";
import { AL_LIMITE } from "@/lib/verificaciones/recomendaciones/motor";

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
  /**
   * Repetir arriba de la barra la solicitación y la resistencia. Se apaga
   * cuando quien la monta ya las muestra —ResultadoCheck, por ejemplo—, para
   * no decir dos veces los mismos dos números.
   */
  mostrarValores?: boolean;
}

/** Utilización hasta la que la barra se estira para mostrar el exceso. */
const ESCALA_MAXIMA = 3;

export function BarraDemandaCapacidad({
  demanda,
  capacidad,
  unidad,
  etiquetaDemanda = "Solicitación",
  etiquetaCapacidad = "Resistencia",
  decimales = 2,
  mostrarValores = true,
}: BarraDemandaCapacidadProps) {
  const utilizacion = capacidad > 0 ? demanda / capacidad : Infinity;
  const verifica = Number.isFinite(utilizacion) && utilizacion <= 1;
  const alLimite = verifica && utilizacion >= AL_LIMITE;
  /*
   * Escala de la barra. Hasta 1 el riel entero es la capacidad. Por encima, el
   * riel se estira hasta la utilización para que el exceso se vea como exceso:
   * un 312 % dibujado como barra llena se confunde con un 100 %. La marca del
   * 100 % queda siempre visible, y pasado ESCALA_MAXIMA se recorta y se avisa.
   *
   * Los anchos se redondean a dos decimales porque van en estilos en línea, y
   * servidor y navegador no serializan igual el flotante crudo: React lo toma
   * como HTML distinto y avisa que no lo va a parchear.
   */
  const u = Number.isFinite(utilizacion) ? utilizacion : ESCALA_MAXIMA;
  const escala = u <= 1 ? 1 : Math.min(u, ESCALA_MAXIMA);
  const recortada = u > ESCALA_MAXIMA;
  const anchoAdmisible = ((1 / escala) * 100).toFixed(2);
  const anchoUsoAdmisible = ((Math.min(u, 1) / escala) * 100).toFixed(2);
  const anchoExceso = u > 1 ? (((Math.min(u, escala) - 1) / escala) * 100).toFixed(2) : "0";

  const color = !verifica
    ? "var(--destructive)"
    : alLimite
      ? "var(--mat-fuego)"
      : "var(--exito)";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div
          className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm tabular-nums ${
            mostrarValores ? "" : "hidden"
          }`}
        >
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
            utilización
          </span>
        </p>
      </div>

      <div
        className="relative h-2.5 rounded-full bg-muted"
        role="meter"
        aria-valuenow={Number.isFinite(utilizacion) ? Math.round(utilizacion * 100) : undefined}
        aria-valuemin={0}
        aria-valuemax={Math.round(escala * 100)}
        aria-label={`Utilización: ${etiquetaDemanda} ${fmt(demanda, decimales)} sobre ${etiquetaCapacidad} ${fmt(capacidad, decimales)}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-l-full transition-[width] duration-300"
          style={{ width: `${anchoUsoAdmisible}%`, backgroundColor: color }}
        />
        {u > 1 && (
          <div
            className="absolute inset-y-0 rounded-r-full transition-[width] duration-300"
            style={{
              left: `${anchoAdmisible}%`,
              width: `${anchoExceso}%`,
              backgroundColor: "var(--destructive)",
              // Rayado en el exceso: se distingue de la zona admisible sin depender del color.
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 3px, transparent 3px 7px)",
            }}
          />
        )}
        {u > 1 && (
          <div
            className="absolute -inset-y-1 w-px bg-foreground"
            style={{ left: `${anchoAdmisible}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {!Number.isFinite(utilizacion) ? (
          <span className="font-sans">Sin capacidad calculable con estos datos.</span>
        ) : verifica ? (
          <>
            Capacidad remanente{" "}
            <strong className="text-foreground">{fmt((1 - utilizacion) * 100, 0)} %</strong>
            {alLimite && (
              <span className="font-sans"> · queda poco margen: un cambio chico la deja al límite</span>
            )}
          </>
        ) : (
          <>
            Límite admisible 100 % · exceso sobre la capacidad{" "}
            <strong className="text-destructive">{fmt((utilizacion - 1) * 100, 0)} %</strong>
            {recortada && ` · escala recortada en ${fmt(ESCALA_MAXIMA * 100, 0)} %`}
          </>
        )}
      </p>
    </div>
  );
}
