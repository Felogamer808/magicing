"use client";

import { CampoNumeroOpcional } from "@/components/proyectos/CampoNumeroOpcional";
import { MarcaEstado } from "@/components/proyectos/MarcaEstado";
import { camposDelPanel, DIAMETROS_MM, esDiametro, resultadoDelPanel } from "@/lib/cad-revit/armadura";
import { ROTULO_ESTADO } from "@/lib/proyectos/estado";
import type { CalculoGuardado } from "@/lib/proyectos/tipos";
import { aNumero } from "@/lib/verificaciones/formato";

const selector = "h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums";

/**
 * La armadura de una pieza, cargada en el panel del proyecto, con su
 * resultado al lado: el mismo que pinta el 3D.
 */
export function ArmaduraPanel({
  calculo,
  nombre,
  onCambiar,
}: {
  calculo: CalculoGuardado;
  /** Para las etiquetas accesibles: "nº de barras de CT9-1". */
  nombre: string;
  onCambiar: (cambios: Record<string, string>) => void;
}) {
  const campos = camposDelPanel(calculo.verificacion);
  const r = resultadoDelPanel(calculo);
  const valor = (clave: string) => calculo.campos[clave] ?? "";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {campos.map((d) => {
          const etiqueta = `${d.etiqueta}${d.unidad ? ` (${d.unidad})` : ""}`;
          let control;
          if (esDiametro(d.clave)) {
            control = (
              <select
                aria-label={`${d.etiqueta} de ${nombre}`}
                className={selector}
                value={valor(d.clave)}
                onChange={(e) => onCambiar({ [d.clave]: e.target.value })}
              >
                <option value="">Ø —</option>
                {DIAMETROS_MM.map((n) => (
                  <option key={n} value={String(n)}>
                    Ø{n}
                  </option>
                ))}
              </select>
            );
          } else if (d.opciones) {
            control = (
              <select
                aria-label={`${d.etiqueta} de ${nombre}`}
                className={`${selector} w-32 text-left`}
                value={valor(d.clave) || d.porDefecto}
                onChange={(e) => onCambiar({ [d.clave]: e.target.value })}
              >
                {d.opciones.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            );
          } else {
            const t = valor(d.clave).trim();
            control = (
              <CampoNumeroOpcional
                etiqueta={`${d.etiqueta} de ${nombre}`}
                className="h-8 w-24 px-2 text-right tabular-nums"
                valor={t === "" ? undefined : aNumero(t)}
                onCambio={(n) => onCambiar({ [d.clave]: n === undefined ? "" : String(n) })}
              />
            );
          }
          return (
            <label key={d.clave} className="flex items-center justify-between gap-3">
              <span className="text-sm">{etiqueta}</span>
              {control}
            </label>
          );
        })}
      </div>

      <div className="space-y-1 rounded-md bg-secondary/50 p-2 text-xs" role="status">
        <p className="flex items-center gap-1.5 font-medium">
          <MarcaEstado estado={r.estado} />
          {r.estado === "no-evaluable" && r.faltan.length ? "Falta cargar" : ROTULO_ESTADO[r.estado]}
        </p>
        {r.faltan.length > 0 && <p className="text-muted-foreground">{r.faltan.join(", ")}.</p>}
        {r.fallan.length > 0 && <p className="text-muted-foreground">Fallan: {r.fallan.join(", ")}.</p>}
      </div>
    </div>
  );
}
