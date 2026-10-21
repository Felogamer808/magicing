"use client";

import { useState } from "react";
import { Copy, Download, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumeroOpcional } from "@/components/proyectos/CampoNumeroOpcional";
import { derivarCargas } from "@/lib/cad-revit/cargas";
import { descargasPilotes, maximaPorDiametro, modoPilotes } from "@/lib/cad-revit/descargas";
import { actualizarProyecto } from "@/lib/proyectos/modelo";
import type { CapacidadPilote, ModoPilotes, Proyecto, SueloPilotes } from "@/lib/proyectos/tipos";
import { fmt } from "@/lib/verificaciones/formato";

const mm = (m: number) => Math.round(m * 1000);
const kN = (n: number | null) => (n === null ? "—" : fmt(n, 1));

/**
 * Los pilotes de una planta traída del CAD. Por defecto, sólo las descargas
 * para la pilotera, con la tabla de capacidad por diámetro del proyecto si la
 * hay. Quien quiera verificarlos (terreno y armadura) lo activa acá.
 */
export function PilotesPlanta({ proyecto, guardar }: { proyecto: Proyecto; guardar: (p: Proyecto) => void }) {
  const [nuevoDiametro, setNuevoDiametro] = useState<number | undefined>(undefined);
  const [nuevaCarga, setNuevaCarga] = useState<number | undefined>(undefined);
  const [copiado, setCopiado] = useState(false);

  const descargas = descargasPilotes(proyecto);
  if (descargas.length === 0) return null;
  const modo = modoPilotes(proyecto);
  const tabla = [...(proyecto.pilotes?.capacidades ?? [])].sort((a, b) => a.diametroM - b.diametroM);
  const resumen = maximaPorDiametro(descargas);
  const faltan = descargas.filter((d) => d.nkKN === null).length;

  const cambiar = (p: Proyecto) => guardar(derivarCargas(actualizarProyecto(p, {})));
  const conPilotes = (cambios: { modo?: ModoPilotes; capacidades?: CapacidadPilote[] }) =>
    cambiar({ ...proyecto, pilotes: { ...proyecto.pilotes, ...cambios } });

  function suelo(clave: keyof SueloPilotes, n: number | undefined) {
    const nuevo = { ...proyecto.suelo, [clave]: n };
    if (n === undefined) delete nuevo[clave];
    cambiar({ ...proyecto, suelo: nuevo });
  }

  function agregar() {
    if (!nuevoDiametro || !nuevaCarga) return;
    const d = nuevoDiametro / 1000;
    conPilotes({ capacidades: [...tabla.filter((c) => mm(c.diametroM) !== nuevoDiametro), { diametroM: d, cargaKN: nuevaCarga }] });
    setNuevoDiametro(undefined);
    setNuevaCarga(undefined);
  }

  const csv = [
    "Pilote;Bajo;Diámetro (mm);Descarga (kN)",
    ...descargas.map((d) => [d.marca, d.bajo ?? "", d.diametroM === null ? "" : mm(d.diametroM), d.nkKN === null ? "" : fmt(d.nkKN, 1)].join(";")),
  ].join("\r\n");

  function bajarCsv() {
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `descargas-pilotes-${proyecto.nombre.replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const celda = "h-8 w-24 px-2 text-right tabular-nums";
  const boton = "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs transition-colors hover:bg-secondary";
  const opcion = (valor: ModoPilotes, titulo: string, detalle: string) => (
    <label
      className={`flex flex-1 cursor-pointer gap-2 rounded-md border p-3 ${modo === valor ? "border-primary bg-primary/5" : "border-input"}`}
    >
      <input type="radio" name="modo-pilotes" className="mt-1" checked={modo === valor} onChange={() => conPilotes({ modo: valor })} />
      <span>
        <span className="block font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
    </label>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pilotes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          {opcion("descargas", "Sólo descargas", "Para mandarle a la pilotera. Los pilotes no se verifican.")}
          {opcion("verificar", "Verificar", "Terreno y armadura de cada pilote, como cualquier otra pieza.")}
        </div>

        {modo === "verificar" && (
          <div className="flex flex-wrap items-end gap-3">
            <p className="w-full font-medium">Suelo</p>
            {(
              [
                ["friccionKNm2", "fs, fuste (kN/m²)"],
                ["puntaKNm2", "qp, punta (kN/m²)"],
                ["factorSeguridad", "FS"],
              ] as const
            ).map(([clave, etiqueta]) => (
              <label key={clave} className="space-y-1">
                <span className="block text-xs text-muted-foreground">{etiqueta}</span>
                <CampoNumeroOpcional etiqueta={etiqueta} className={celda} valor={proyecto.suelo?.[clave]} onCambio={(n) => suelo(clave, n)} />
              </label>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="font-medium">Tabla de la pilotera</p>
          <p className="text-xs text-muted-foreground">
            Hasta cuánto toma un pilote de cada diámetro, en servicio. Es de este proyecto. Con ella, MagicIng dice si el
            diámetro dibujado alcanza y cuál es el más chico que alcanzaría.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            {tabla.map((c) => (
              <span key={c.diametroM} className="flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs tabular-nums">
                ⌀{mm(c.diametroM)} → {fmt(c.cargaKN, 0)} kN
                <button
                  type="button"
                  aria-label={`Quitar ⌀${mm(c.diametroM)}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => conPilotes({ capacidades: tabla.filter((x) => x !== c) })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">⌀ (mm)</span>
              <CampoNumeroOpcional etiqueta="Diámetro nuevo (mm)" className={celda} valor={nuevoDiametro} onCambio={setNuevoDiametro} />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">Toma (kN)</span>
              <CampoNumeroOpcional etiqueta="Carga admisible del diámetro nuevo (kN)" className={celda} valor={nuevaCarga} onCambio={setNuevaCarga} />
            </label>
            <button type="button" className={boton} disabled={!nuevoDiametro || !nuevaCarga} onClick={agregar}>
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Descargas</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={boton}
                onClick={() => void navigator.clipboard.writeText(csv).then(() => setCopiado(true))}
              >
                <Copy className="h-3.5 w-3.5" />
                {copiado ? "Copiado" : "Copiar"}
              </button>
              <button type="button" className={boton} onClick={bajarCsv}>
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            En servicio: G + Q del pilar más el peso propio del cabezal, repartido entre sus pilotes.
            {faltan > 0 && ` Faltan ${faltan} porque su pilar todavía no tiene G y Q.`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left tabular-nums">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2 font-normal">Diámetro</th>
                  <th className="px-2 text-right font-normal">Pilotes</th>
                  <th className="px-2 text-right font-normal">Descarga máxima (kN)</th>
                  <th className="pl-2 text-right font-normal">Toma (kN)</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((g) => {
                  const toma = tabla.find((c) => mm(c.diametroM) === mm(g.diametroM))?.cargaKN ?? null;
                  const pasa = toma !== null && g.maximaKN !== null && g.maximaKN > toma;
                  return (
                    <tr key={g.diametroM} className="border-t">
                      <td className="py-1 pr-2 font-medium">⌀{mm(g.diametroM)}</td>
                      <td className="px-2 text-right">{g.cantidad}</td>
                      <td className={`px-2 text-right ${pasa ? "font-medium text-destructive" : ""}`}>{kN(g.maximaKN)}</td>
                      <td className="pl-2 text-right">{kN(toma)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">Pilote por pilote ({descargas.length})</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left tabular-nums">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2 font-normal">Pilote</th>
                    <th className="px-2 font-normal">Bajo</th>
                    <th className="px-2 text-right font-normal">⌀</th>
                    <th className="px-2 text-right font-normal">Descarga (kN)</th>
                    <th className="px-2 text-right font-normal">Toma (kN)</th>
                    <th className="pl-2 text-right font-normal">Alcanza con</th>
                  </tr>
                </thead>
                <tbody>
                  {descargas.map((d) => {
                    const pasa = d.admisibleKN !== null && d.nkKN !== null && d.nkKN > d.admisibleKN;
                    return (
                      <tr key={d.marca} className="border-t">
                        <td className="py-1 pr-2 font-medium">{d.marca}</td>
                        <td className="px-2 text-muted-foreground">{d.bajo ?? "—"}</td>
                        <td className="px-2 text-right">{d.diametroM === null ? "—" : mm(d.diametroM)}</td>
                        <td className={`px-2 text-right ${pasa ? "font-medium text-destructive" : ""}`}>{kN(d.nkKN)}</td>
                        <td className="px-2 text-right">{kN(d.admisibleKN)}</td>
                        <td className="pl-2 text-right">
                          {d.sugeridoM !== null ? `⌀${mm(d.sugeridoM)}` : d.nkKN !== null && tabla.length ? "ninguno" : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
