"use client";

import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramasViga } from "@/components/verificaciones/estatica/DiagramasViga";
import { EditorVigaLibre } from "@/components/verificaciones/estatica/EditorVigaLibre";
import { COMBINACIONES_LIBRE, calcularVigaLibre, type ResultadoVigaLibre } from "@/lib/calc/estatica/viga-libre";
import { datosDelModelo, leerModelo } from "@/lib/verificaciones/viga-libre-modelo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "viga-libre")!;

const ETAPAS = [
  { id: "viga", titulo: "Tramos y cargas" },
  { id: "rigidez", titulo: "Rigidez" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const NOMBRE_APOYO: Record<string, string> = {
  simple: "Apoyo simple",
  empotrado: "Empotramiento",
};

/** El −10⁻¹⁵ del solver se imprime "−0,00": se aplasta al formatear, como en el formulario. */
const sinCeroNegativo = (n: number) => (Math.abs(n) < 5e-9 ? 0 : n);

type Estado = ({ ok: true } & ResultadoVigaLibre) | { ok: false; motivo: string };

export default function VigaLibrePage() {
  const [norma, setNorma] = useCampo("norma", "Estática");
  const [crudo, setCrudo] = useCampo("modelo", "");
  const [combinacionId, setCombinacionId] = useCampo("combinacion", "elu");
  const [eGPa, setEGPa] = useCampo("eGPa", "30");
  const [iCm4, setICm4] = useCampo("iCm4", "540000");

  const modelo = leerModelo(crudo);
  const combinacion = COMBINACIONES_LIBRE.find((c) => c.id === combinacionId) ?? COMBINACIONES_LIBRE[0];
  // E en GPa son 10⁶ kN/m² e I en cm⁴ son 10⁻⁸ m⁴: el producto va por 10⁻² para dar kN·m².
  const eiKNm2 = aNumero(eGPa) * aNumero(iCm4) * 1e-2;

  const leido = datosDelModelo(modelo, eiKNm2);
  let estado: Estado;
  if (!leido.ok) {
    estado = leido;
  } else {
    try {
      estado = { ok: true, ...calcularVigaLibre(leido.datos, combinacion) };
    } catch (e) {
      estado = { ok: false, motivo: e instanceof Error ? e.message : "No se pudo resolver la viga." };
    }
  }

  const avisos: AvisoRevision[] = estado.ok ? [] : [{ tipo: "error", texto: estado.motivo }];
  const r = estado.ok ? estado.resultado : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Estática · Herramientas de análisis</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa
          id="viga"
          numero={1}
          titulo="Tramos y cargas"
          descripcion="Se arma tramo por tramo, con el apoyo de cada nudo. Un voladizo es un tramo con el extremo libre."
        >
          <div className="max-w-3xl">
            <EditorVigaLibre modelo={modelo} onChange={(m) => setCrudo(JSON.stringify(m))} />
          </div>
        </Etapa>

        <Etapa id="rigidez" numero={2} titulo="Rigidez" descripcion="Sólo escala la flecha mientras EI sea constante en toda la viga.">
          <div className="max-w-2xl space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="eGPa" etiqueta="Módulo E" sufijo="GPa" valor={eGPa} onChange={setEGPa} />
              <CampoNumerico id="iCm4" etiqueta="Inercia I" sufijo="cm⁴" valor={iCm4} onChange={setICm4} />
            </div>
            <p className="text-xs text-muted-foreground">
              EI = {Number.isFinite(eiKNm2) ? fmt(eiKNm2, 0) : "—"} kN·m². Con EI constante las
              reacciones y los diagramas de V y M no dependen de ella, ni siquiera en la continua.
            </p>
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Tramos", valor: modelo.tramos.map((t) => `${t.luz} m`).join(" + ") },
              { etiqueta: "Cargas", valor: `${modelo.cargas.filter((c) => c.caso === "G").length} G · ${modelo.cargas.filter((c) => c.caso === "Q").length} Q` },
              { etiqueta: "Combinación", valor: combinacion.nombre },
              { etiqueta: "EI", valor: Number.isFinite(eiKNm2) ? `${fmt(eiKNm2, 0)} kN·m²` : "—", derivado: true },
            ]}
            hipotesis={[
              "Rigidez directa con elementos de Euler-Bernoulli, el mismo motor que el formulario de vigas: exacto para cargas puntuales y distribuidas lineales.",
              "La combinación carga todos los tramos a la vez. Todavía no hay alternancia de la sobrecarga: el máximo negativo en apoyos y el positivo en vanos pueden quedar cortos en vigas continuas.",
              "γG = 1,35 y γQ = 1,5 en ELU, los mismos coeficientes del resto de la app.",
              "EI constante en toda la viga. Cargas positivas hacia abajo; el flector se dibuja del lado traccionado.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          <div className="space-y-8">
            <div className="max-w-xs">
              <CampoSeleccion
                id="combinacion"
                etiqueta="Combinación"
                valor={combinacion.nombre}
                opciones={COMBINACIONES_LIBRE.map((c) => c.nombre)}
                onChange={(n) => {
                  const c = COMBINACIONES_LIBRE.find((x) => x.nombre === n);
                  if (c) setCombinacionId(c.id);
                }}
              />
            </div>
            {!estado.ok || !r ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
                <EstadoVerificacionChip estado="datos-insuficientes" />
                <span className="text-muted-foreground">{estado.ok ? "" : estado.motivo}</span>
              </div>
            ) : (
              <div className="space-y-10">
                <PanelMetricas
                  horizontal
                  metricas={[
                    { etiqueta: "Momento máx. +", valor: `${fmt(sinCeroNegativo(r.momentoMax.valor), 2)} kN·m`, nota: `x = ${fmt(r.momentoMax.xM, 2)} m` },
                    { etiqueta: "Momento máx. −", valor: `${fmt(sinCeroNegativo(r.momentoMin.valor), 2)} kN·m`, nota: `x = ${fmt(r.momentoMin.xM, 2)} m` },
                    { etiqueta: "Cortante máx.", valor: `${fmt(sinCeroNegativo(r.cortanteMax.valor), 2)} kN`, nota: `x = ${fmt(r.cortanteMax.xM, 2)} m` },
                    combinacion.flechaConSentido
                      ? {
                          etiqueta: "Flecha máx.",
                          valor: `${fmt(sinCeroNegativo(r.flechaMax.valor), 2)} mm`,
                          nota: Number.isFinite(r.relacionLSobreFlecha) ? `L / ${fmt(r.relacionLSobreFlecha, 0)}` : "sin flecha",
                        }
                      : { etiqueta: "Flecha", valor: "—", nota: "elegir una combinación de servicio" },
                  ]}
                />
                <Subgrupo titulo="Diagramas">
                  <div className="space-y-2">
                    <DiagramasViga largoM={estado.entrada.largoM} nodos={estado.entrada.nodos} cargas={estado.entrada.cargas} resultado={r} />
                    <p className="text-xs text-muted-foreground">
                      Cargas ya multiplicadas por los coeficientes de la combinación. El flector se dibuja
                      del lado traccionado: lo que queda para abajo es momento positivo y se arma abajo.
                      {!combinacion.flechaConSentido && " La deformada de ELU no es una flecha: sólo muestra la forma."}
                    </p>
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Reacciones">
                  <div className="space-y-3 pt-0">
                    <div>
                      {r.reacciones
                        .filter((x) => x.tipo !== "libre")
                        .map((x) => (
                          <div key={x.xM} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
                            <span className="text-sm text-muted-foreground">{`${NOMBRE_APOYO[x.tipo]} en x = ${fmt(x.xM, 2)} m`}</span>
                            <span className="font-mono text-sm tabular-nums">
                              {x.tipo === "empotrado"
                                ? `${fmt(sinCeroNegativo(x.rKN), 2)} kN · ${fmt(sinCeroNegativo(x.mKNm), 2)} kN·m`
                                : `${fmt(sinCeroNegativo(x.rKN), 2)} kN`}
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reacción vertical positiva hacia arriba; momento de empotramiento positivo antihorario.
                      Cierre de equilibrio vertical: {fmt(Math.abs(r.desequilibrioKN), 6)} kN.
                    </p>
                  </div>
                </Subgrupo>
              </div>
            )}
          </div>
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
