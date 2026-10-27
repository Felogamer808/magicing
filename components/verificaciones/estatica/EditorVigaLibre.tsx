"use client";

import { Button } from "@/components/ui/button";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import type { TipoApoyo } from "@/lib/calc/estatica/viga-continua";
import type { CasoCarga } from "@/lib/calc/estatica/viga-libre";
import type { FilaCarga, ModeloVigaLibre, TipoCargaLibre } from "@/lib/verificaciones/viga-libre-modelo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";

const APOYOS: readonly { id: TipoApoyo; nombre: string }[] = [
  { id: "simple", nombre: "Apoyo simple" },
  { id: "empotrado", nombre: "Empotramiento" },
  { id: "libre", nombre: "Libre (voladizo o nudo sin apoyo)" },
];

const TIPOS_CARGA: readonly { id: TipoCargaLibre; nombre: string }[] = [
  { id: "distribuida", nombre: "Distribuida" },
  { id: "puntual", nombre: "Puntual" },
  { id: "momento", nombre: "Momento" },
];

const CASOS: readonly { id: CasoCarga; nombre: string }[] = [
  { id: "G", nombre: "G · permanente" },
  { id: "Q", nombre: "Q · variable" },
];

const nombreApoyo = (a: TipoApoyo) => APOYOS.find((x) => x.id === a)!.nombre;
const idApoyo = (nombre: string) => APOYOS.find((x) => x.nombre === nombre)?.id;

interface EditorVigaLibreProps {
  modelo: ModeloVigaLibre;
  onChange: (modelo: ModeloVigaLibre) => void;
}

/**
 * Tramos con el apoyo de cada nudo y la lista de cargas. No calcula: arma el
 * modelo de textos que la página le pasa al motor.
 */
export function EditorVigaLibre({ modelo, onChange }: EditorVigaLibreProps) {
  const largo = modelo.tramos.reduce((s, t) => s + (aNumero(t.luz) || 0), 0);

  const cambiarTramo = (i: number, cambio: Partial<ModeloVigaLibre["tramos"][number]>) =>
    onChange({ ...modelo, tramos: modelo.tramos.map((t, k) => (k === i ? { ...t, ...cambio } : t)) });
  const cambiarCarga = (i: number, cambio: Partial<FilaCarga>) =>
    onChange({ ...modelo, cargas: modelo.cargas.map((c, k) => (k === i ? { ...c, ...cambio } : c)) });

  return (
    <div className="space-y-8">
      <Subgrupo titulo="Tramos y apoyos">
        <div className="space-y-4">
          <div className="max-w-xs">
            <CampoSeleccion
              id="apoyo-0"
              etiqueta="Nudo 1 (x = 0)"
              valor={nombreApoyo(modelo.apoyoInicial)}
              opciones={APOYOS.map((a) => a.nombre)}
              onChange={(n) => {
                const a = idApoyo(n);
                if (a) onChange({ ...modelo, apoyoInicial: a });
              }}
            />
          </div>
          {modelo.tramos.map((t, i) => (
            <div key={i} className="grid items-end gap-3 border-l-2 border-border pl-4 sm:grid-cols-[8rem_1fr_auto]">
              <CampoNumerico id={`luz-${i}`} etiqueta={`Tramo ${i + 1}`} sufijo="m" valor={t.luz} onChange={(v) => cambiarTramo(i, { luz: v })} />
              <CampoSeleccion
                id={`apoyo-${i + 1}`}
                etiqueta={`Nudo ${i + 2}`}
                valor={nombreApoyo(t.apoyoFinal)}
                opciones={APOYOS.map((a) => a.nombre)}
                onChange={(n) => {
                  const a = idApoyo(n);
                  if (a) cambiarTramo(i, { apoyoFinal: a });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={modelo.tramos.length === 1}
                onClick={() => onChange({ ...modelo, tramos: modelo.tramos.filter((_, k) => k !== i) })}
              >
                Quitar
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...modelo, tramos: [...modelo.tramos, { luz: "5", apoyoFinal: "simple" }] })}
            >
              Agregar tramo
            </Button>
            <span className="text-xs text-muted-foreground">Largo total {fmt(largo, 2)} m</span>
          </div>
        </div>
      </Subgrupo>

      <Subgrupo titulo="Cargas">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Las posiciones se miden desde el extremo izquierdo de la viga. Cargas positivas hacia abajo;
            momentos positivos antihorarios.
          </p>
          {modelo.cargas.map((c, i) => (
            <div key={i} className="grid items-end gap-3 border-l-2 border-border pl-4 sm:grid-cols-4">
              <CampoSeleccion
                id={`tipo-${i}`}
                etiqueta={`Carga ${i + 1}`}
                valor={TIPOS_CARGA.find((x) => x.id === c.tipo)!.nombre}
                opciones={TIPOS_CARGA.map((x) => x.nombre)}
                onChange={(n) => {
                  const tipo = TIPOS_CARGA.find((x) => x.nombre === n)?.id;
                  if (tipo) cambiarCarga(i, { tipo });
                }}
              />
              <CampoSeleccion
                id={`caso-${i}`}
                etiqueta="Caso"
                valor={CASOS.find((x) => x.id === c.caso)!.nombre}
                opciones={CASOS.map((x) => x.nombre)}
                onChange={(n) => {
                  const caso = CASOS.find((x) => x.nombre === n)?.id;
                  if (caso) cambiarCarga(i, { caso });
                }}
              />
              {c.tipo === "distribuida" ? (
                <>
                  <CampoNumerico id={`x1-${i}`} etiqueta="Desde" sufijo="m" valor={c.x1} onChange={(v) => cambiarCarga(i, { x1: v })} />
                  <CampoNumerico id={`x2-${i}`} etiqueta="Hasta" sufijo="m" valor={c.x2} onChange={(v) => cambiarCarga(i, { x2: v })} />
                  <CampoNumerico id={`v1-${i}`} etiqueta="q inicial" sufijo="kN/m" valor={c.v1} onChange={(v) => cambiarCarga(i, { v1: v })} />
                  <CampoNumerico id={`v2-${i}`} etiqueta="q final" sufijo="kN/m" valor={c.v2} onChange={(v) => cambiarCarga(i, { v2: v })} />
                </>
              ) : (
                <>
                  <CampoNumerico id={`x1-${i}`} etiqueta="Posición x" sufijo="m" valor={c.x1} onChange={(v) => cambiarCarga(i, { x1: v })} />
                  <CampoNumerico
                    id={`v1-${i}`}
                    etiqueta={c.tipo === "puntual" ? "P" : "M"}
                    sufijo={c.tipo === "puntual" ? "kN" : "kN·m"}
                    valor={c.v1}
                    onChange={(v) => cambiarCarga(i, { v1: v })}
                  />
                </>
              )}
              <div className="sm:col-span-4">
                <Button variant="ghost" size="sm" onClick={() => onChange({ ...modelo, cargas: modelo.cargas.filter((_, k) => k !== i) })}>
                  Quitar carga
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...modelo,
                cargas: [...modelo.cargas, { tipo: "distribuida", caso: "G", x1: "0", x2: String(largo).replace(".", ","), v1: "10", v2: "10" }],
              })
            }
          >
            Agregar carga
          </Button>
        </div>
      </Subgrupo>
    </div>
  );
}
