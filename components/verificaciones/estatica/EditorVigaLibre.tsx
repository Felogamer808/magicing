"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { SimboloApoyo } from "@/components/verificaciones/croquis/Primitivas";
import { EsquemaVigaLibre, type SeleccionVigaLibre } from "@/components/verificaciones/estatica/EsquemaVigaLibre";
import type { TipoApoyo } from "@/lib/calc/estatica/viga-continua";
import type { CasoCarga } from "@/lib/calc/estatica/viga-libre";
import type { FilaCarga, ModeloVigaLibre, TipoCargaLibre } from "@/lib/verificaciones/viga-libre-modelo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";

interface EditorVigaLibreProps {
  modelo: ModeloVigaLibre;
  onChange: (modelo: ModeloVigaLibre) => void;
}

const conComa = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/**
 * La viga se arma sobre el dibujo: la barra agrega tramos y cargas, y al tocar
 * un apoyo, un tramo o una carga aparecen debajo sólo sus datos. No calcula.
 */
export function EditorVigaLibre({ modelo, onChange }: EditorVigaLibreProps) {
  const [seleccion, setSeleccion] = useState<SeleccionVigaLibre>(null);

  const luces = modelo.tramos.map((t) => aNumero(t.luz) || 0);
  const largo = luces.reduce((s, l) => s + l, 0);
  const inicioTramo = (i: number) => luces.slice(0, i).reduce((s, l) => s + l, 0);

  // Una carga nueva cae en el tramo elegido; si no hay ninguno, en toda la viga.
  const tramoActivo = seleccion?.tipo === "tramo" ? seleccion.indice : null;
  const desde = tramoActivo === null ? 0 : inicioTramo(tramoActivo);
  const hasta = tramoActivo === null ? largo : desde + luces[tramoActivo];

  const agregarCarga = (tipo: TipoCargaLibre) => {
    const nueva: FilaCarga =
      tipo === "distribuida"
        ? { tipo, caso: "G", x1: conComa(desde), x2: conComa(hasta), v1: "10", v2: "10" }
        : { tipo, caso: "G", x1: conComa((desde + hasta) / 2), x2: "", v1: tipo === "puntual" ? "50" : "20", v2: "" };
    onChange({ ...modelo, cargas: [...modelo.cargas, nueva] });
    setSeleccion({ tipo: "carga", indice: modelo.cargas.length });
  };

  const agregarTramo = () => {
    onChange({ ...modelo, tramos: [...modelo.tramos, { luz: "5", apoyoFinal: "simple" }] });
    setSeleccion({ tipo: "tramo", indice: modelo.tramos.length });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={agregarTramo}>
          <IconoTramo /> Tramo
        </Button>
        <Button variant="outline" size="sm" onClick={() => agregarCarga("distribuida")}>
          <IconoCarga tipo="distribuida" /> Distribuida
        </Button>
        <Button variant="outline" size="sm" onClick={() => agregarCarga("puntual")}>
          <IconoCarga tipo="puntual" /> Puntual
        </Button>
        <Button variant="outline" size="sm" onClick={() => agregarCarga("momento")}>
          <IconoCarga tipo="momento" /> Momento
        </Button>
      </div>

      <EsquemaVigaLibre modelo={modelo} seleccion={seleccion} onSeleccionar={setSeleccion} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-foreground" /> G permanente</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-brillante" /> Q variable</span>
        <span>Largo total {fmt(largo, 2)} m · x desde el extremo izquierdo</span>
      </div>

      <div className="min-h-24 rounded-md bg-muted/40 p-4">
        {seleccion === null && (
          <p className="text-sm text-muted-foreground">
            Tocá un apoyo, un tramo o una carga en el dibujo para editarlo.
          </p>
        )}
        {seleccion?.tipo === "nudo" && (
          <PanelNudo
            numero={seleccion.indice + 1}
            apoyo={seleccion.indice === 0 ? modelo.apoyoInicial : modelo.tramos[seleccion.indice - 1]?.apoyoFinal}
            ancho={(seleccion.indice === 0 ? modelo.anchoInicial : modelo.tramos[seleccion.indice - 1]?.anchoFinal) ?? ""}
            onChange={(cambio) =>
              onChange(
                seleccion.indice === 0
                  ? {
                      ...modelo,
                      ...(cambio.apoyo ? { apoyoInicial: cambio.apoyo } : {}),
                      ...(cambio.ancho !== undefined ? { anchoInicial: cambio.ancho } : {}),
                    }
                  : {
                      ...modelo,
                      tramos: modelo.tramos.map((t, k) =>
                        k === seleccion.indice - 1
                          ? {
                              ...t,
                              ...(cambio.apoyo ? { apoyoFinal: cambio.apoyo } : {}),
                              ...(cambio.ancho !== undefined ? { anchoFinal: cambio.ancho } : {}),
                            }
                          : t
                      ),
                    }
              )
            }
          />
        )}
        {seleccion?.tipo === "tramo" && modelo.tramos[seleccion.indice] && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-32">
              <CampoNumerico
                id="luz-tramo"
                etiqueta={`Luz del tramo ${seleccion.indice + 1}`}
                sufijo="m"
                valor={modelo.tramos[seleccion.indice].luz}
                onChange={(v) =>
                  onChange({ ...modelo, tramos: modelo.tramos.map((t, k) => (k === seleccion.indice ? { ...t, luz: v } : t)) })
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={modelo.tramos.length === 1}
              onClick={() => {
                onChange({ ...modelo, tramos: modelo.tramos.filter((_, k) => k !== seleccion.indice) });
                setSeleccion(null);
              }}
            >
              Quitar tramo
            </Button>
            <p className="basis-full text-xs text-muted-foreground">
              Con el tramo elegido, las cargas nuevas se ubican en él.
            </p>
          </div>
        )}
        {seleccion?.tipo === "carga" && modelo.cargas[seleccion.indice] && (
          <PanelCarga
            carga={modelo.cargas[seleccion.indice]}
            onChange={(cambio) =>
              onChange({ ...modelo, cargas: modelo.cargas.map((c, k) => (k === seleccion.indice ? { ...c, ...cambio } : c)) })
            }
            onQuitar={() => {
              onChange({ ...modelo, cargas: modelo.cargas.filter((_, k) => k !== seleccion.indice) });
              setSeleccion(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

const APOYOS: readonly { id: TipoApoyo; nombre: string }[] = [
  { id: "simple", nombre: "Simple" },
  { id: "empotrado", nombre: "Empotrado" },
  { id: "libre", nombre: "Libre" },
];

function PanelNudo({
  numero,
  apoyo,
  ancho,
  onChange,
}: {
  numero: number;
  apoyo: TipoApoyo | undefined;
  ancho: string;
  onChange: (cambio: { apoyo?: TipoApoyo; ancho?: string }) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Nudo {numero}</p>
      <div className="flex flex-wrap gap-2">
        {APOYOS.map((a) => (
          <Button key={a.id} variant={apoyo === a.id ? "default" : "outline"} size="sm" onClick={() => onChange({ apoyo: a.id })}>
            <svg viewBox="0 0 28 28" className="size-5" aria-hidden="true">
              {a.id === "libre" ? (
                <circle cx={14} cy={12} r={3} fill="none" stroke="currentColor" strokeWidth={1.5} />
              ) : (
                <SimboloApoyo x={a.id === "empotrado" ? 10 : 14} y={a.id === "empotrado" ? 14 : 8} tipo={a.id === "empotrado" ? "empotrado" : "articulado"} escala={0.75} />
              )}
            </svg>
            {a.nombre}
          </Button>
        ))}
      </div>
      {apoyo !== "libre" && (
        <div className="w-44 pt-1">
          <CampoNumerico
            id="ancho-apoyo"
            etiqueta="Ancho del apoyo"
            sufijo="m"
            valor={ancho}
            onChange={(v) => onChange({ ancho: v })}
            advertencia="Para llevar M y V a la cara al pasar a Vigas. En blanco, el eje."
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">Un extremo libre es un voladizo.</p>
    </div>
  );
}

const TIPOS: readonly { id: TipoCargaLibre; nombre: string }[] = [
  { id: "distribuida", nombre: "Distribuida" },
  { id: "puntual", nombre: "Puntual" },
  { id: "momento", nombre: "Momento" },
];

function PanelCarga({ carga, onChange, onQuitar }: { carga: FilaCarga; onChange: (c: Partial<FilaCarga>) => void; onQuitar: () => void }) {
  const casos: readonly CasoCarga[] = ["G", "Q"];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TIPOS.map((t) => (
          <Button key={t.id} variant={carga.tipo === t.id ? "default" : "outline"} size="sm" onClick={() => onChange({ tipo: t.id })}>
            <IconoCarga tipo={t.id} /> {t.nombre}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {casos.map((c) => (
          <Button key={c} variant={carga.caso === c ? "default" : "outline"} size="sm" onClick={() => onChange({ caso: c })}>
            {c === "G" ? "G permanente" : "Q variable"}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onQuitar}>
          Quitar carga
        </Button>
      </div>
      {carga.tipo === "distribuida" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CampoNumerico id="carga-x1" etiqueta="Desde" sufijo="m" valor={carga.x1} onChange={(v) => onChange({ x1: v })} />
          <CampoNumerico id="carga-x2" etiqueta="Hasta" sufijo="m" valor={carga.x2} onChange={(v) => onChange({ x2: v })} />
          <CampoNumerico id="carga-v1" etiqueta="q inicial" sufijo="kN/m" valor={carga.v1} onChange={(v) => onChange({ v1: v })} />
          <CampoNumerico id="carga-v2" etiqueta="q final" sufijo="kN/m" valor={carga.v2} onChange={(v) => onChange({ v2: v })} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CampoNumerico id="carga-x1" etiqueta="Posición x" sufijo="m" valor={carga.x1} onChange={(v) => onChange({ x1: v })} />
          <CampoNumerico
            id="carga-v1"
            etiqueta={carga.tipo === "puntual" ? "P (hacia abajo)" : "M (antihorario)"}
            sufijo={carga.tipo === "puntual" ? "kN" : "kN·m"}
            valor={carga.v1}
            onChange={(v) => onChange({ v1: v })}
          />
        </div>
      )}
    </div>
  );
}

function IconoTramo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M2 10 H22" strokeWidth={2.5} />
      <path d="M5 11 l-3 6 h6 Z M19 11 l-3 6 h6 Z" strokeWidth={1.3} />
    </svg>
  );
}

function IconoCarga({ tipo }: { tipo: TipoCargaLibre }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6}>
      {tipo === "distribuida" && <path d="M3 5 H21 M5 5 V15 M12 5 V15 M19 5 V15 M3 19 H21" />}
      {tipo === "puntual" && <path d="M12 3 V16 M8 12 L12 17 L16 12 M3 20 H21" />}
      {tipo === "momento" && <path d="M6 14 A6 6 0 1 1 18 14 M18 14 l-3 -1 M18 14 l1 -3 M3 20 H21" />}
    </svg>
  );
}
