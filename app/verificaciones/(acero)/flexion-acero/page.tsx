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
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { CurvaFlexion } from "@/components/verificaciones/acero/CurvaFlexion";
import { DiagramaPandeoLateral } from "@/components/verificaciones/acero/DiagramaPandeoLateral";
import { OMEGA_B } from "@/lib/calc/acero/flexion";
import {
  type ResultadoFlexionCualquiera,
} from "@/lib/calc/acero/seleccion-articulo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverFlexionAcero } from "@/lib/calc/acero/resolver-flexion";
import { recomendarFlexionAcero } from "@/lib/verificaciones/recomendaciones/acero";

const meta = registroVerificaciones.find((v) => v.id === "flexion-acero")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "arriostramiento", titulo: "Arriostramiento" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Filas del panel "Ver cálculo", propias de cada artículo. */
function filasDe(r: ResultadoFlexionCualquiera) {
  if (r.articulo === "F8") {
    return [
      { etiqueta: "Mp = Fy·Z  (F8-1)", valor: `${fmt(r.mpKNm, 1)} kN·m` },
      { etiqueta: "D/t", valor: fmt(r.relacionDt, 1) },
      { etiqueta: "Límite compacta 0,07·E/Fy", valor: fmt(r.limiteCompacta, 1) },
      { etiqueta: "Límite no compacta 0,31·E/Fy", valor: fmt(r.limiteNoCompacta, 1) },
      { etiqueta: "Clasificación de la pared", valor: r.clase },
      { etiqueta: "Mn", valor: `${fmt(r.mnKNm, 1)} kN·m` },
      { etiqueta: `Mn/Ωb con Ωb = ${OMEGA_B}`, valor: `${fmt(r.admisibleKNm, 1)} kN·m` },
    ];
  }

  if (r.articulo === "F7") {
    return [
      { etiqueta: "Mp = Fy·Z  (F7-1)", valor: `${fmt(r.mpKNm, 1)} kN·m` },
      ...r.estados.map((e) => ({
        etiqueta: e.nombre + (e.esbeltez === undefined ? "" : ` · λ = ${fmt(e.esbeltez, 1)}`),
        valor:
          (e.mnKNm === Infinity ? "sin implementar" : `${fmt(e.mnKNm, 1)} kN·m`) +
          (e.clase === "no aplica" ? "" : ` — ${e.clase}`),
      })),
      { etiqueta: "Lp  (F7-12)", valor: `${fmt(r.lpM, 2)} m` },
      { etiqueta: "Lr  (F7-13)", valor: `${fmt(r.lrM, 2)} m` },
      { etiqueta: "Mn (el menor)", valor: `${fmt(r.mnKNm, 1)} kN·m` },
      { etiqueta: `Mn/Ωb con Ωb = ${OMEGA_B}`, valor: `${fmt(r.admisibleKNm, 1)} kN·m` },
    ];
  }

  return [
    { etiqueta: "Mp = Fy·Zx  (F2-1)", valor: `${fmt(r.mpKNm, 1)} kN·m` },
    { etiqueta: "Lp = 1,76·ry·√(E/Fy)  (F2-5)", valor: `${fmt(r.lpM, 3)} m` },
    { etiqueta: "Lr  (F2-6)", valor: `${fmt(r.lrM, 3)} m` },
    { etiqueta: "rts  (F2-7)", valor: `${fmt(r.rtsM * 100, 2)} cm` },
    { etiqueta: "c  (F2-8)", valor: fmt(r.c, 3) },
    { etiqueta: "ho (entre baricentros de alas)", valor: `${fmt(r.hoM * 100, 2)} cm` },
    {
      etiqueta: "Fcr  (F2-4)",
      valor: r.fcrPa === null ? "no aplica en esta zona" : `${fmt(r.fcrPa / 1e6, 1)} MPa`,
    },
    { etiqueta: "Mn", valor: `${fmt(r.mnKNm, 1)} kN·m` },
    { etiqueta: `Mn/Ωb con Ωb = ${OMEGA_B}`, valor: `${fmt(r.admisibleKNm, 1)} kN·m` },
    {
      etiqueta: "Esbeltez del ala",
      valor: `${fmt(r.compacta.esbeltezAla, 2)} — ${r.compacta.ala ? "compacta" : "no compacta"}`,
    },
    {
      etiqueta: "Esbeltez del alma h/tw",
      valor: `${fmt(r.compacta.esbeltezAlma, 2)} — ${r.compacta.alma ? "compacta" : "no compacta"}`,
    },
  ];
}

export default function FlexionAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [lb, setLb] = useCampo("lb", "3");
  const [cb, setCb] = useCampo("cb", "1");
  const [fy, setFy] = useCampo("fyFlexion", "250");
  const [e, setE] = useCampo("eFlexion", "200000");
  const [mRequerido, setMRequerido] = useCampo("mRequerido", "40");

  const campos = useMemo(
    () => ({ familia: seccion.familia, params: seccion.crudo, lb, cb, fyFlexion: fy, eFlexion: e, mRequerido }),
    [seccion.familia, seccion.crudo, lb, cb, fy, e, mRequerido]
  );
  const resultado = useMemo(() => resolverFlexionAcero(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarFlexionAcero(campos), [campos]);

  const noCompacta =
    resultado?.articulo === "F2" && (!resultado.compacta.ala || !resultado.compacta.alma);
  const advertencia = resultado && "advertencia" in resultado ? resultado.advertencia : undefined;

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Completá la sección, Lb, Cb, el material y el momento con valores positivos." });
  if (noCompacta) avisos.push({ tipo: "error", texto: "La sección no es compacta con este Fy: F2 no la cubre. Correspondería F3 (ala no compacta) o F5 (alma esbelta), no implementados." });
  if (advertencia) avisos.push({ tipo: "aviso", texto: advertencia });

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
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="El perfil y el acero. La forma de la sección elige el artículo.">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          >
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fyFlexion" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eFlexion" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </div>
          </SelectorSeccionAcero>
        </Etapa>

        <Etapa id="arriostramiento" numero={2} titulo="Arriostramiento" descripcion="Longitud sin arriostrar del ala comprimida y forma del diagrama de momentos.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="lb" etiqueta="Lb sin arriostrar" sufijo="m" valor={lb} onChange={setLb} />
            <CampoNumerico id="cb" etiqueta="Cb" valor={cb} onChange={setCb} />
          </div>
        </Etapa>

        <Etapa id="solicitacion" numero={3} titulo="Solicitación" descripcion="Momento requerido de la combinación ASD.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="mRequerido" etiqueta="Momento requerido" sufijo="kN·m" valor={mRequerido} onChange={setMRequerido} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: resultado ? resultado.designacion : "—" },
              { etiqueta: "Fy / E", valor: `${fy} / ${e} MPa` },
              { etiqueta: "Lb · Cb", valor: `${lb} m · ${cb}` },
              { etiqueta: "M requerido", valor: `${mRequerido} kN·m` },
              ...(resultado ? [{ etiqueta: "Artículo", valor: resultado.articulo, derivado: true }] : []),
            ]}
            hipotesis={[
              `AISC 360, capítulo F, por ASD (Ωb = ${OMEGA_B}).`,
              "F2 en perfiles I y canales: manda el menor entre plastificación y pandeo lateral-torsional. Sólo cubre secciones compactas.",
              "F7 en tubos rectangulares y cajones, con los cuatro estados límite.",
              "F8 en tubos redondos: no hay pandeo lateral y decide la esbeltez de la pared.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
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
                  { etiqueta: "Mp", valor: `${fmt(resultado.mpKNm, 1)} kN·m` },
                  { etiqueta: "Mn", valor: `${fmt(resultado.mnKNm, 1)} kN·m`, nota: `art. ${resultado.articulo}` },
                  { etiqueta: "Mn/Ωb", valor: `${fmt(resultado.admisibleKNm, 1)} kN·m` },
                  resultado.articulo === "F8"
                    ? { etiqueta: "Pared", valor: resultado.clase, nota: `D/t = ${fmt(resultado.relacionDt, 1)}` }
                    : { etiqueta: "Lb", valor: `${fmt(aNumero(lb), 2)} m`, nota: `Lp ${fmt(resultado.lpM, 2)} · Lr ${fmt(resultado.lrM, 2)} m` },
                ]}
              />

              <Subgrupo
                titulo="Resistencia a flexión"
                detalle={
                  resultado.articulo === "F2"
                    ? `${resultado.designacion} · zona: ${resultado.zona}`
                    : resultado.articulo === "F7"
                      ? `${resultado.designacion} · gobierna ${resultado.gobierna}`
                      : `${resultado.designacion} · pared ${resultado.clase}`
                }
              >
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`Momento admisible (art. ${resultado.articulo})`}
                    verifica={resultado.verifica === true}
                    estado={noCompacta ? "no-evaluado" : undefined}
                    detalle={noCompacta ? "Sección no compacta: F2 no aplica (F3/F5 sin implementar)." : undefined}
                    comparacion={{
                      real: { etiqueta: "M requerido", valor: aNumero(mRequerido) },
                      limite: { etiqueta: "admisible", valor: resultado.admisibleKNm },
                      unidad: "kN·m", exige: "≤", decimales: 1,
                    }}
                    recomendaciones={rec.flexion}
                  />
                  {/*
                    F8 no depende de Lb —el tubo redondo no pandea lateralmente—, así
                    que la curva no tendría nada que mostrar y se omite.
                  */}
                  {resultado.articulo !== "F8" && (
                    <>
                      {/*
                        El dibujo del fenómeno va antes de la curva: primero qué
                        pasa, después cuánto cuesta. Sólo en F2, que es donde el
                        pandeo lateral-torsional existe.
                      */}
                      {resultado.articulo === "F2" && (
                        <DiagramaPandeoLateral
                          lbM={aNumero(lb)}
                          lpM={resultado.lpM}
                          lrM={resultado.lrM}
                          zona={resultado.zona}
                          familia={seccion.familia}
                          params={seccion.params}
                        />
                      )}
                      <CurvaFlexion
                        familia={seccion.familia}
                        params={seccion.params}
                        cb={aNumero(cb)}
                        fyPa={aNumero(fy) * 1e6}
                        ePa={aNumero(e) * 1e6}
                        lbM={aNumero(lb)}
                        lpM={resultado.lpM}
                        lrM={resultado.lrM}
                        mpKNm={resultado.mpKNm}
                        mnKNm={resultado.mnKNm}
                      />
                      <p className="text-xs text-muted-foreground">
                        Verde: hasta Lp manda la plastificación. Ámbar: entre Lp y Lr el pandeo
                        lateral-torsional va comiendo resistencia. Rojo: pasada Lr, régimen
                        elástico. El punto rojo es la longitud cargada.
                      </p>
                    </>
                  )}
                  <PanelFormulas titulo="Ver desarrollo de la flexión" filas={filasDe(resultado)} />
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
