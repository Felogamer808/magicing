"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumeroOpcional } from "@/components/proyectos/CampoNumeroOpcional";
import { derivarCargas, ndPilar, PSI2_POR_DEFECTO } from "@/lib/cad-revit/cargas";
import { actualizarProyecto } from "@/lib/proyectos/modelo";
import type { ElementoProyecto, PilarCargado, Proyecto } from "@/lib/proyectos/tipos";
import { fmt } from "@/lib/verificaciones/formato";

const orden = new Intl.Collator("es", { numeric: true });

/**
 * Cargas de los pilares de una planta traída del CAD (el suelo, en PilotesPlanta). Es la única
 * entrada de cargas: de acá salen, derivados, el Nd de cada cabezal, el Nk de
 * cada pilote y los N₁d / N₂d de cada viga de atado (`derivarCargas`).
 */
export function CargasPlanta({ proyecto, guardar }: { proyecto: Proyecto; guardar: (p: Proyecto) => void }) {
  const piezas = proyecto.elementos
    .filter((e) => e.cad?.pieza === "cabezal" || e.cad?.pieza === "nodo")
    .sort((a, b) => orden.compare(a.cad!.marca, b.cad!.marca));
  if (piezas.length === 0) return null;

  const cambiar = (p: Proyecto) => guardar(derivarCargas(actualizarProyecto(p, {})));

  function pilar(e: ElementoProyecto, clave: keyof PilarCargado, n: number | undefined) {
    const nuevo = { ...e.pilar, [clave]: n };
    if (n === undefined) delete nuevo[clave];
    cambiar({ ...proyecto, elementos: proyecto.elementos.map((x) => (x.id === e.id ? { ...x, pilar: nuevo } : x)) });
  }


  const celda = "h-8 w-20 px-2 text-right tabular-nums";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cargas de los pilares</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          G y Q características, sin mayorar. De acá salen el Nd de cada cabezal (1,35·G + 1,5·Q), el Nk de cada pilote
          ((G + Q + peso propio del cabezal a 25 kN/m³) / nº de pilotes), los Nd de los extremos de cada viga de atado y el
          N₁d de cada centradora. Bajo el pilar medianero de una centradora con e cargada, al pilote le baja la reacción de
          la palanca en lugar de G + Q. El lado del pilar lo usan las verificaciones de cabezales.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Nd a mano</span>: si el pilar tiene combinaciones que 1,35·G + 1,5·Q
          no cubre —viento, por ejemplo—, cargá acá la envolvente ELU del modelo. Gana sobre la combinación en el cabezal y en
          las vigas de atado; el Nk de los pilotes sigue saliendo de G + Q.
        </p>
        <label className="flex items-center gap-3 text-xs">
          <span>
            <span className="font-medium">ψ2</span> de la combinación cuasipermanente (fisuración de las centradoras:
            Nqp = G + ψ2·Q). Vacío = {String(PSI2_POR_DEFECTO).replace(".", ",")}, vivienda y oficinas.
          </span>
          <CampoNumeroOpcional
            etiqueta="ψ2 del proyecto"
            className={celda}
            valor={proyecto.psi2}
            onCambio={(n) => cambiar({ ...proyecto, psi2: n })}
          />
        </label>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-normal">Pieza</th>
                <th className="px-1 font-normal">G (kN)</th>
                <th className="px-1 font-normal">Q (kN)</th>
                <th className="px-1 font-normal" title="Con un solo pilote, el lado según el largo del cabezal">Lado ∥ pilotes o x (m)</th>
                <th className="px-1 font-normal">Lado ⊥ o y (m)</th>
                <th className="px-1 font-normal">Nd a mano (kN)</th>
                <th className="pl-2 text-right font-normal">Nd usado (kN)</th>
              </tr>
            </thead>
            <tbody>
              {piezas.map((e) => {
                const nd = ndPilar(e.pilar);
                const conLado = e.calculos.some((c) => ["cabezales", "cabezal-un-pilote", "cabezal-n-pilotes"].includes(c.verificacion));
                return (
                  <tr key={e.id} className="border-t">
                    <td className="py-1 pr-2 font-medium">
                      {e.nombre}
                      {e.cad?.pieza === "nodo" && <span className="font-normal text-muted-foreground"> · sobre viga</span>}
                    </td>
                    {(["gKN", "qKN"] as const).map((clave) => (
                      <td key={clave} className="px-1">
                        <CampoNumeroOpcional
                          etiqueta={`${clave === "gKN" ? "G" : "Q"} de ${e.nombre}`}
                          className={celda}
                          valor={e.pilar?.[clave]}
                          onCambio={(n) => pilar(e, clave, n)}
                        />
                      </td>
                    ))}
                    {(["ladoPilotesM", "ladoTransversalM"] as const).map((clave) => (
                      <td key={clave} className="px-1">
                        {conLado ? (
                          <CampoNumeroOpcional
                            etiqueta={`${clave === "ladoPilotesM" ? "Lado paralelo a los pilotes" : "Lado transversal"} de ${e.nombre}`}
                            className={celda}
                            valor={e.pilar?.[clave]}
                            onCambio={(n) => pilar(e, clave, n)}
                          />
                        ) : (
                          <span className="block w-20 text-center text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-1">
                      <CampoNumeroOpcional
                        etiqueta={`Nd a mano de ${e.nombre}`}
                        className={celda}
                        valor={e.pilar?.ndKN}
                        onCambio={(n) => pilar(e, "ndKN", n)}
                      />
                    </td>
                    <td className="pl-2 text-right tabular-nums">
                      {nd === null ? "—" : fmt(nd, 1)}
                      {e.pilar?.ndKN !== undefined && <span className="block text-xs text-muted-foreground">a mano</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
