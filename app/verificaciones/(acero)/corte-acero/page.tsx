"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import {
  type ResultadoCorteCualquiera,
} from "@/lib/calc/acero/seleccion-articulo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverCorteAcero } from "@/lib/calc/acero/resolver-corte";
import { recomendarCorteAcero } from "@/lib/verificaciones/recomendaciones/acero";

const meta = registroVerificaciones.find((v) => v.id === "corte-acero")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

function filasDe(r: ResultadoCorteCualquiera) {
  if (r.articulo === "G5") {
    return [
      { etiqueta: "Ag", valor: `${fmt(r.areaM2 * 1e4, 2)} cm²` },
      { etiqueta: "D/t", valor: fmt(r.relacionDt, 1) },
      { etiqueta: "Fcr por largo  (G5-2a)", valor: `${fmt(r.fcrPandeoLargo / 1e6, 1)} MPa` },
      { etiqueta: "Fcr por pared  (G5-2b)", valor: `${fmt(r.fcrPandeoLocal / 1e6, 1)} MPa` },
      { etiqueta: "Tope 0,6·Fy", valor: `${fmt(r.topeFluencia / 1e6, 1)} MPa` },
      { etiqueta: "Fcr adoptada", valor: `${fmt(r.fcrPa / 1e6, 1)} MPa — ${r.gobierna}` },
      { etiqueta: "Vn = Fcr·Ag/2  (G5-1)", valor: `${fmt(r.vnKN, 1)} kN` },
      { etiqueta: `Vn/Ωv con Ωv = ${r.omegaV}`, valor: `${fmt(r.admisibleKN, 1)} kN` },
    ];
  }

  if (r.articulo === "G4") {
    return [
      { etiqueta: "Aw = 2·h·t", valor: `${fmt(r.awM2 * 1e4, 2)} cm²` },
      { etiqueta: "Esbeltez del alma h/t", valor: fmt(r.esbeltezAlma, 2) },
      { etiqueta: "kv (fijo en G4)", valor: fmt(r.kv, 2) },
      { etiqueta: "Cv2  (G2-9 a G2-11)", valor: fmt(r.cv2, 3) },
      { etiqueta: "Vn = 0,6·Fy·Aw·Cv2  (G4-1)", valor: `${fmt(r.vnKN, 1)} kN` },
      { etiqueta: `Vn/Ωv con Ωv = ${r.omegaV}`, valor: `${fmt(r.admisibleKN, 1)} kN` },
    ];
  }

  return [
    { etiqueta: "Aw = d·tw", valor: `${fmt(r.awM2 * 1e4, 2)} cm²` },
    { etiqueta: "Esbeltez del alma h/tw", valor: fmt(r.esbeltezAlma, 2) },
    { etiqueta: "kv", valor: fmt(r.kv, 2) },
    { etiqueta: "Cv1", valor: fmt(r.cv1, 3) },
    { etiqueta: "Vn = 0,6·Fy·Aw·Cv1  (G2-1)", valor: `${fmt(r.vnKN, 1)} kN` },
    { etiqueta: `Vn/Ωv con Ωv = ${r.omegaV}`, valor: `${fmt(r.admisibleKN, 1)} kN` },
  ];
}

export default function CorteAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [conRigidizadores, setConRigidizadores] = useCampo("conRigidizadores", "No");
  const [aRigidizadores, setARigidizadores] = useCampo("aRigidizadores", "1.5");
  const [lv, setLv] = useCampo("lv", "2");
  const [fy, setFy] = useCampo("fyCorte", "250");
  const [e, setE] = useCampo("eCorte", "200000");
  const [vRequerido, setVRequerido] = useCampo("vRequerido", "80");

  const campos = useMemo(
    () => ({ familia: seccion.familia, params: seccion.crudo, conRigidizadores, aRigidizadores, lv, fyCorte: fy, eCorte: e, vRequerido }),
    [seccion.familia, seccion.crudo, conRigidizadores, aRigidizadores, lv, fy, e, vRequerido]
  );
  const resultado = useMemo(() => resolverCorteAcero(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarCorteAcero(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Completá la sección, el material y el corte con valores positivos." });

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
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="El perfil, el acero y lo que define cómo trabaja el alma.">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          >
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fyCorte" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eCorte" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
              {/* Los rigidizadores solo intervienen en G2: G4 fija kv = 5 y G5 no los usa. */}
              {seccion.familia !== "tubo-redondo" && seccion.familia !== "tubo-rectangular" && (
                <>
                  <CampoSeleccion
                    id="conRigidizadores"
                    etiqueta="Rigidizadores transversales"
                    valor={conRigidizadores}
                    opciones={["No", "Sí"]}
                    onChange={setConRigidizadores}
                  />
                  {conRigidizadores === "Sí" && (
                    <CampoNumerico id="aRigidizadores" etiqueta="Separación a" sufijo="m" valor={aRigidizadores} onChange={setARigidizadores} />
                  )}
                </>
              )}
              {/* Lv es dato del diagrama de corte, no de la sección: solo lo pide G5. */}
              {seccion.familia === "tubo-redondo" && (
                <CampoNumerico id="lv" etiqueta="Lv (corte máximo a corte nulo)" sufijo="m" valor={lv} onChange={setLv} />
              )}
            </div>
          </SelectorSeccionAcero>
        </Etapa>

        <Etapa id="solicitacion" numero={2} titulo="Solicitación" descripcion="Corte requerido de la combinación ASD.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="vRequerido" etiqueta="Corte requerido" sufijo="kN" valor={vRequerido} onChange={setVRequerido} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: resultado ? resultado.designacion : "—" },
              { etiqueta: "Fy / E", valor: `${fy} / ${e} MPa` },
              ...(seccion.familia === "tubo-redondo"
                ? [{ etiqueta: "Lv", valor: `${lv} m` }]
                : seccion.familia !== "tubo-rectangular"
                  ? [{ etiqueta: "Rigidizadores", valor: conRigidizadores === "Sí" ? `a = ${aRigidizadores} m` : "sin rigidizadores" }]
                  : []),
              { etiqueta: "V requerido", valor: `${vRequerido} kN` },
              ...(resultado ? [{ etiqueta: "Artículo", valor: resultado.articulo, derivado: true }] : []),
            ]}
            hipotesis={[
              "AISC 360, capítulo G, por resistencias admisibles: Vn/Ωv.",
              "G2 en perfiles I y canales, sin acción de campo tensional.",
              "G4 en tubos rectangulares y cajones: resisten las dos caras, con kv = 5.",
              "G5 en tubos redondos: trabaja media sección y entra la distancia Lv del corte máximo al nulo.",
              "Ωv = 1,50 sólo en almas robustas de perfiles I laminados (h/tw ≤ 2,24·√(E/Fy), art. G1(a)); canales y tubos van siempre con 1,67.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!resultado ? (
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
                  { etiqueta: "Vn", valor: `${fmt(resultado.vnKN, 1)} kN`, nota: `art. ${resultado.articulo}` },
                  { etiqueta: "Vn/Ωv", valor: `${fmt(resultado.admisibleKN, 1)} kN` },
                  { etiqueta: "Ωv", valor: fmt(resultado.omegaV, 2) },
                  resultado.articulo === "G5"
                    ? { etiqueta: "D/t", valor: fmt(resultado.relacionDt, 1) }
                    : { etiqueta: resultado.articulo === "G4" ? "h/t" : "h/tw", valor: fmt(resultado.esbeltezAlma, 1) },
                ]}
              />

              <Subgrupo titulo="Resistencia a corte" detalle={`${resultado.designacion} · art. ${resultado.articulo}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`Corte admisible (art. ${resultado.articulo})`}
                    verifica={resultado.verifica === true}
                    comparacion={{
                      real: { etiqueta: "V requerido", valor: aNumero(vRequerido) },
                      limite: { etiqueta: "admisible", valor: resultado.admisibleKN },
                      unidad: "kN", exige: "≤", decimales: 1,
                    }}
                    recomendaciones={rec.corte}
                  />
                  <p className="text-xs text-muted-foreground">
                    {resultado.articulo === "G2" &&
                      (resultado.almaRobusta
                        ? "Alma robusta: entra por la excepción del art. G2.1(a)."
                        : "Fuera de la excepción del art. G2.1(a).")}
                    {resultado.articulo === "G4" && "Dos almas resisten el corte."}
                    {resultado.articulo === "G5" && `Gobierna por ${resultado.gobierna}.`}
                  </p>
                  <PanelFormulas titulo="Ver desarrollo del corte" filas={filasDe(resultado)} />
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
