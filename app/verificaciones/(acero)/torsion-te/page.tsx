"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisSeccionAcero } from "@/components/verificaciones/acero/CroquisSeccionAcero";
import { parametrosDe } from "@/lib/calc/acero/perfiles";
import { G_ACERO_PA } from "@/lib/calc/acero/torsion-te";
import { resolverTorsionTe } from "@/lib/calc/acero/resolver-torsion-te";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "torsion-te")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function TorsionTePage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("te-armada");
  const [fy, setFy] = useCampo("fy", "250");
  const [luz, setLuz] = useCampo("luz", "1.175");
  const [reaccionIzq, setReaccionIzq] = useCampo("reaccionIzq", "30");
  const [reaccionDer, setReaccionDer] = useCampo("reaccionDer", "10");
  const [vRequerido, setVRequerido] = useCampo("vRequerido", "20");

  const campos = useMemo(
    () => ({ params: seccion.crudo, fy, luz, reaccionIzq, reaccionDer, vRequerido }),
    [seccion.crudo, fy, luz, reaccionIzq, reaccionDer, vRequerido]
  );
  const r = useMemo(() => resolverTorsionTe(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!r) avisos.push({ tipo: "error", texto: "Completá la T, Fy, la luz y las solicitaciones (las reacciones y V pueden ser 0)." });
  if (r && r.tKNm === 0) avisos.push({ tipo: "aviso", texto: "Las dos reacciones son iguales: no hay torsión, queda sólo el corte de flexión." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Vigas · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="La T armada y su acero.">
          <DatosConDibujo
            dibujo={<CroquisSeccionAcero familia="te-armada" params={seccion.params} />}
            datos={
              <div className="grid grid-cols-2 gap-4">
                {parametrosDe("te-armada").map((p) => (
                  <CampoNumerico
                    key={p.clave}
                    id={p.clave}
                    etiqueta={p.etiqueta}
                    sufijo={p.sufijo}
                    valor={seccion.paramsTexto[p.clave] ?? ""}
                    onChange={(v) => seccion.cambiarParam(p.clave, v)}
                  />
                ))}
                <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              </div>
            }
          />
        </Etapa>

        <Etapa
          id="solicitacion"
          numero={2}
          titulo="Solicitación"
          descripcion="En combinación ASD. La torsión sale de la diferencia entre las reacciones de la losa sobre cada lado del ala."
        >
          <div className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="luz" etiqueta="Luz L" sufijo="m" valor={luz} onChange={setLuz} />
            <CampoNumerico id="reaccionIzq" etiqueta="Reacción izquierda" sufijo="kN/m" valor={reaccionIzq} onChange={setReaccionIzq} />
            <CampoNumerico id="reaccionDer" etiqueta="Reacción derecha" sufijo="kN/m" valor={reaccionDer} onChange={setReaccionDer} />
            <CampoNumerico id="vRequerido" etiqueta="Corte V en el apoyo" sufijo="kN" valor={vRequerido} onChange={setVRequerido} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Fy", valor: `${fy} MPa` },
              { etiqueta: "Luz", valor: `${luz} m` },
              { etiqueta: "Reacciones", valor: `${reaccionIzq} / ${reaccionDer} kN/m` },
              { etiqueta: "V", valor: `${vRequerido} kN` },
            ]}
            hipotesis={[
              "Torsión repartida mt = |qi − qd|·bf/2, con las reacciones en las puntas del ala.",
              "Los dos extremos tienen el giro torsional impedido: la torsión máxima está en el apoyo, T = mt·L/2.",
              "Sólo torsión uniforme (Saint-Venant): en una T el alabeo es despreciable y no agrega tensión normal; la flexión se verifica en su página.",
              "En el alma se suma el corte de flexión en el eje neutro, V·Q/(Ix·tw): V y T máximos coinciden en el apoyo.",
              `Fluencia por corte del art. H3.3: 0,6·Fy/Ω con Ω = 1,67. G = ${fmt(G_ACERO_PA / 1e6, 0)} MPa. El giro es informativo.`,
              "Pendiente: contrastar H3.3 contra el texto de AISC 360-16.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!r ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionAutomatica />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "mt", valor: `${fmt(r.mtKNmM, 2)} kN·m/m` },
                  { etiqueta: "T en el apoyo", valor: `${fmt(r.tKNm, 3)} kN·m` },
                  { etiqueta: "τ máx", valor: `${fmt(r.tauMaxMPa, 1)} MPa`, nota: `en el ${r.gobierna}` },
                  { etiqueta: "Giro en el centro", valor: `${fmt(r.giroGrados, 2)}°`, nota: "informativo" },
                ]}
              />

              <Subgrupo titulo="Torsión y corte en el apoyo" detalle={`gobierna el ${r.gobierna}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Fluencia por corte (H3.3)"
                    verifica={r.verifica}
                    detalle={`alma: torsión ${fmt(r.tauTorsionAlmaMPa, 1)} + corte ${fmt(r.tauCorteMPa, 1)} MPa · ala: torsión ${fmt(r.tauTorsionAlaMPa, 1)} MPa`}
                    comparacion={{
                      real: { etiqueta: "τ máx", valor: r.tauMaxMPa },
                      limite: { etiqueta: "0,6·Fy/Ω", valor: r.tauAdmMPa },
                      unidad: "MPa", exige: "≤", decimales: 1,
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la torsión"
                    filas={[
                      { etiqueta: "mt = |qi − qd|·bf/2", valor: `${fmt(r.mtKNmM, 3)} kN·m/m` },
                      { etiqueta: "T = mt·L/2", valor: `${fmt(r.tKNm, 3)} kN·m` },
                      { etiqueta: "J", valor: `${fmt(r.jM4 * 1e8, 2)} cm⁴` },
                      { etiqueta: "τt alma = T·tw/J", valor: `${fmt(r.tauTorsionAlmaMPa, 1)} MPa` },
                      { etiqueta: "τt ala = T·tf/J", valor: `${fmt(r.tauTorsionAlaMPa, 1)} MPa` },
                      { etiqueta: "Q en el eje neutro", valor: `${fmt(r.qEjeNeutroM3 * 1e6, 2)} cm³` },
                      { etiqueta: "τv = V·Q/(Ix·tw)", valor: `${fmt(r.tauCorteMPa, 1)} MPa` },
                      { etiqueta: "τ alma = τt + τv", valor: `${fmt(r.tauAlmaMPa, 1)} MPa` },
                      { etiqueta: "0,6·Fy/1,67", valor: `${fmt(r.tauAdmMPa, 1)} MPa` },
                      { etiqueta: "φ = mt·L²/(8·G·J)", valor: `${fmt(r.giroGrados, 3)}°` },
                    ]}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
