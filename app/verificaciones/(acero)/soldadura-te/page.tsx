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
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisSeccionAcero } from "@/components/verificaciones/acero/CroquisSeccionAcero";
import { parametrosDe } from "@/lib/calc/acero/perfiles";
import type { Electrodo } from "@/lib/calc/acero/uniones";
import { resolverSoldaduraTe } from "@/lib/calc/acero/resolver-soldadura-te";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "soldadura-te")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección y cordón" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const ELECTRODOS: readonly Electrodo[] = ["E60", "E70", "E80"];

export default function SoldaduraTePage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("te-armada");
  const [lado, setLado] = useCampo("lado", "6");
  const [electrodo, setElectrodo] = useCampo("electrodo", "E60");
  const [reaccionIzq, setReaccionIzq] = useCampo("reaccionIzq", "20");
  const [reaccionDer, setReaccionDer] = useCampo("reaccionDer", "20");
  const [vRequerido, setVRequerido] = useCampo("vRequerido", "20");

  const campos = useMemo(
    () => ({ params: seccion.crudo, lado, electrodo, reaccionIzq, reaccionDer, vRequerido }),
    [seccion.crudo, lado, electrodo, reaccionIzq, reaccionDer, vRequerido]
  );
  const r = useMemo(() => resolverSoldaduraTe(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!r) avisos.push({ tipo: "error", texto: "Completá la T, el lado del cordón y las solicitaciones (las reacciones y V pueden ser 0)." });
  if (r && !r.ladoEnRango) {
    avisos.push({ tipo: "error", texto: `El lado del cordón es menor que el mínimo de la tabla J2.4 para el menor espesor unido: ${r.ladoMinimoMm} mm.` });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Uniones · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="seccion" numero={1} titulo="Sección y cordón" descripcion="La T armada y los dos filetes corridos, uno a cada lado del alma.">
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
                <CampoNumerico id="lado" etiqueta="Lado del filete" sufijo="mm" valor={lado} onChange={setLado} />
                <CampoSeleccion id="electrodo" etiqueta="Electrodo" valor={electrodo} opciones={ELECTRODOS} onChange={setElectrodo} />
              </div>
            }
          />
        </Etapa>

        <Etapa id="solicitacion" numero={2} titulo="Solicitación" descripcion="Por metro de viga y en combinación ASD. Las reacciones vienen de flexión; el corte, de la página de corte.">
          <div className="grid max-w-2xl grid-cols-3 gap-4">
            <CampoNumerico id="reaccionIzq" etiqueta="Reacción izquierda" sufijo="kN/m" valor={reaccionIzq} onChange={setReaccionIzq} />
            <CampoNumerico id="reaccionDer" etiqueta="Reacción derecha" sufijo="kN/m" valor={reaccionDer} onChange={setReaccionDer} />
            <CampoNumerico id="vRequerido" etiqueta="Corte de la viga V" sufijo="kN" valor={vRequerido} onChange={setVRequerido} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Cordón", valor: `2 filetes de ${lado} mm, ${electrodo}` },
              { etiqueta: "Reacciones", valor: `${reaccionIzq} / ${reaccionDer} kN/m` },
              { etiqueta: "V", valor: `${vRequerido} kN` },
            ]}
            hipotesis={[
              "Cuelgue: la losa apoya sobre el ala y el ala cuelga del alma; qi + qd tracciona los dos cordones, mitad cada uno.",
              "Momento desbalanceado (qi − qd)·bf/2, tomado por el par de cordones con brazo tw + garganta. Con cargas iguales se anula.",
              "Rasante V·Q/Ix con Q el momento estático del ala respecto del baricentro, repartido entre los dos cordones.",
              "Suma vectorial sobre la garganta contra 0,6·Fnw/2, como el cordón perimetral de la página de uniones. Lado mínimo por la tabla J2.4; en la junta en T no rige el lado máximo de borde.",
              "No se verifica el metal base. Pendiente: contrastar J2 contra el texto de AISC 360-16.",
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
                  { etiqueta: "Garganta", valor: `${fmt(r.gargantaMm, 2)} mm` },
                  { etiqueta: "Normal", valor: `${fmt(r.normalKNm, 1)} kN/m`, nota: "cordón más cargado" },
                  { etiqueta: "Rasante", valor: `${fmt(r.rasanteKNm, 1)} kN/m`, nota: "entre los dos cordones" },
                  { etiqueta: "τ / τadm", valor: `${fmt(r.aprovechamiento * 100, 0)} %` },
                ]}
              />

              <Subgrupo titulo="Cordón alma–ala" detalle={`2 filetes de ${fmt(aNumero(lado), 1)} mm, ${electrodo}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tensión en la garganta"
                    verifica={r.verifica}
                    comparacion={{
                      real: { etiqueta: "τ", valor: r.tauKPa / 1000 },
                      limite: { etiqueta: "τadm", valor: r.tauAdmKPa / 1000 },
                      unidad: "MPa", exige: "≤", decimales: 1,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Lado mínimo (tabla J2.4)"
                    verifica={r.ladoEnRango}
                    comparacion={{
                      real: { etiqueta: "lado", valor: aNumero(lado) },
                      limite: { etiqueta: "mínimo", valor: r.ladoMinimoMm },
                      unidad: "mm", exige: "≥", decimales: 1,
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del cordón"
                    filas={[
                      { etiqueta: "Garganta a = lado/√2", valor: `${fmt(r.gargantaMm, 2)} mm` },
                      { etiqueta: "Cuelgue por cordón (qi + qd)/2", valor: `${fmt(r.cuelgueKNm, 2)} kN/m` },
                      { etiqueta: "Momento desbalanceado (qi − qd)·bf/2", valor: `${fmt(r.momentoDesbalanceadoKNmM, 3)} kN·m/m` },
                      { etiqueta: "Brazo del par tw + a", valor: `${fmt(r.brazoM * 1000, 1)} mm` },
                      { etiqueta: "Normal en el cordón más cargado", valor: `${fmt(r.normalKNm, 2)} kN/m` },
                      { etiqueta: "Q del ala", valor: `${fmt(r.qAlaM3 * 1e6, 2)} cm³` },
                      { etiqueta: "Rasante V·Q/Ix", valor: `${fmt(r.rasanteKNm, 1)} kN/m` },
                      { etiqueta: "τ normal = N/a", valor: `${fmt(r.tauNormalKPa / 1000, 1)} MPa` },
                      { etiqueta: "τ paralela = (rasante/2)/a", valor: `${fmt(r.tauParaleloKPa / 1000, 1)} MPa` },
                      { etiqueta: "τ = √(τn² + τp²)", valor: `${fmt(r.tauKPa / 1000, 1)} MPa` },
                      { etiqueta: "τadm = 0,6·Fnw/2", valor: `${fmt(r.tauAdmKPa / 1000, 1)} MPa` },
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
