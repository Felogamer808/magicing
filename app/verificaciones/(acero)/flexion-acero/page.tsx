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
import { PanelLlevarDatos } from "@/components/verificaciones/comun/PanelLlevarDatos";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { CurvaFlexion } from "@/components/verificaciones/acero/CurvaFlexion";
import { DiagramaPandeoLateral } from "@/components/verificaciones/acero/DiagramaPandeoLateral";
import { OMEGA_B } from "@/lib/calc/acero/flexion";
import {
  type ResultadoFlexionCualquiera,
} from "@/lib/calc/acero/seleccion-articulo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverAlaMensula, resolverFlexionAcero } from "@/lib/calc/acero/resolver-flexion";
import { recomendarFlexionAcero } from "@/lib/verificaciones/recomendaciones/acero";

const meta = registroVerificaciones.find((v) => v.id === "flexion-acero")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "arriostramiento", titulo: "Arriostramiento" },
  { id: "ala", titulo: "Apoyo en el ala" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Filas del panel "Ver cálculo", propias de cada artículo. */
function filasDe(r: ResultadoFlexionCualquiera) {
  if (r.articulo === "F9") {
    return [
      { etiqueta: "Punta del alma", valor: r.puntaAlma },
      { etiqueta: "My = Fy·Sx  (F9-3)", valor: `${fmt(r.myKNm, 2)} kN·m` },
      ...r.estados.map((e) => ({
        etiqueta: `${e.nombre} · ${e.ecuacion}`,
        valor: (e.mnKNm === Infinity ? "no aplica" : `${fmt(e.mnKNm, 2)} kN·m`) + ` — ${e.detalle}`,
      })),
      { etiqueta: "B  (F9-11 / F9-12)", valor: fmt(r.coeficienteB, 3) },
      { etiqueta: "Mcr  (F9-10)", valor: `${fmt(r.mcrKNm, 1)} kN·m` },
      ...(r.lpM !== null && r.lrM !== null
        ? [
            { etiqueta: "Lp  (F9-8)", valor: `${fmt(r.lpM, 3)} m` },
            { etiqueta: "Lr  (F9-9)", valor: `${fmt(r.lrM, 3)} m` },
          ]
        : []),
      { etiqueta: "Mn (el menor)", valor: `${fmt(r.mnKNm, 2)} kN·m` },
      { etiqueta: `Mn/Ωb con Ωb = ${OMEGA_B}`, valor: `${fmt(r.admisibleKNm, 2)} kN·m` },
    ];
  }

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
  // Sólo en la T: qué lado comprime y qué carga la losa sobre cada ala.
  const [puntaAlma, setPuntaAlma] = useCampo("puntaAlma", "Comprimida");
  const [reaccionIzq, setReaccionIzq] = useCampo("reaccionIzq", "0");
  const [reaccionDer, setReaccionDer] = useCampo("reaccionDer", "0");
  const esTe = seccion.familia === "te-armada";
  const etapas = esTe ? ETAPAS : ETAPAS.filter((x) => x.id !== "ala");
  const numero = (id: string) => etapas.findIndex((x) => x.id === id) + 1;

  const campos = useMemo(
    () => ({
      familia: seccion.familia, params: seccion.crudo, lb, cb, fyFlexion: fy, eFlexion: e, mRequerido,
      puntaAlma, reaccionIzq, reaccionDer,
    }),
    [seccion.familia, seccion.crudo, lb, cb, fy, e, mRequerido, puntaAlma, reaccionIzq, reaccionDer]
  );
  const resultado = useMemo(() => resolverFlexionAcero(campos), [campos]);
  const ala = useMemo(() => resolverAlaMensula(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarFlexionAcero(campos), [campos]);

  const noCompacta =
    resultado?.articulo === "F2" && (!resultado.compacta.ala || !resultado.compacta.alma);
  const advertencia = resultado && "advertencia" in resultado ? resultado.advertencia : undefined;

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Completá la sección, Lb, Cb, el material y el momento con valores positivos." });
  if (noCompacta) avisos.push({ tipo: "error", texto: "La sección no es compacta con este Fy: F2 no la cubre. Correspondería F3 (ala no compacta) o F5 (alma esbelta), no implementados." });
  if (advertencia) avisos.push({ tipo: "aviso", texto: advertencia });
  if (esTe && !ala) avisos.push({ tipo: "error", texto: "Cargá las reacciones de la losa sobre cada lado del ala (0 si no apoya nada)." });
  if (ala && Math.abs(ala.torsionKNmM) > 1e-9) {
    avisos.push({
      tipo: "aviso",
      texto: `Las dos alas no cargan igual: la viga recibe una torsión de ${fmt(Math.abs(ala.torsionKNmM), 2)} kN·m/m que el art. F9 no cubre. Verificarla aparte.`,
    });
  }

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

      <IndiceEtapas etapas={etapas} />

      <div className="flex flex-col gap-12">
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="El perfil y el acero. La forma de la sección elige el artículo.">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
            conTe
          >
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fyFlexion" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eFlexion" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </div>
          </SelectorSeccionAcero>
        </Etapa>

        <Etapa
          id="arriostramiento"
          numero={numero("arriostramiento")}
          titulo="Arriostramiento"
          descripcion={
            esTe
              ? "Longitud sin arriostrar y qué lado de la T queda comprimido."
              : "Longitud sin arriostrar del ala comprimida y forma del diagrama de momentos."
          }
        >
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="lb" etiqueta="Lb sin arriostrar" sufijo="m" valor={lb} onChange={setLb} />
            {esTe ? (
              <CampoSeleccion
                id="puntaAlma"
                etiqueta="Punta del alma"
                valor={puntaAlma}
                opciones={["Comprimida", "Traccionada"]}
                onChange={setPuntaAlma}
              />
            ) : (
              <CampoNumerico id="cb" etiqueta="Cb" valor={cb} onChange={setCb} />
            )}
          </div>
          {esTe && (
            <p className="mt-3 max-w-xl text-xs text-muted-foreground">
              Biapoyada con el ala abajo, la punta del alma queda comprimida; en ménsula o con el ala
              arriba, traccionada. En la T el art. F9 no usa Cb: el diagrama de momentos no entra.
            </p>
          )}
        </Etapa>

        {esTe && (
          <Etapa
            id="ala"
            numero={numero("ala")}
            titulo="Apoyo de losa en el ala"
            descripcion="Reacción de la losa sobre cada lado del ala, por metro de viga y en combinación ASD. Se carga en la punta del ala, que es lo conservador."
          >
            <div className="grid max-w-xl grid-cols-2 gap-4">
              <CampoNumerico id="reaccionIzq" etiqueta="Reacción lado izquierdo" sufijo="kN/m" valor={reaccionIzq} onChange={setReaccionIzq} />
              <CampoNumerico id="reaccionDer" etiqueta="Reacción lado derecho" sufijo="kN/m" valor={reaccionDer} onChange={setReaccionDer} />
            </div>
          </Etapa>
        )}

        <Etapa id="solicitacion" numero={numero("solicitacion")} titulo="Solicitación" descripcion="Momento requerido de la combinación ASD.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="mRequerido" etiqueta="Momento requerido" sufijo="kN·m" valor={mRequerido} onChange={setMRequerido} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={numero("revision")} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: resultado ? resultado.designacion : "—" },
              { etiqueta: "Fy / E", valor: `${fy} / ${e} MPa` },
              esTe
                ? { etiqueta: "Lb · punta del alma", valor: `${lb} m · ${puntaAlma.toLowerCase()}` }
                : { etiqueta: "Lb · Cb", valor: `${lb} m · ${cb}` },
              ...(esTe ? [{ etiqueta: "Reacciones en el ala", valor: `${reaccionIzq} / ${reaccionDer} kN/m` }] : []),
              { etiqueta: "M requerido", valor: `${mRequerido} kN·m` },
              ...(resultado ? [{ etiqueta: "Artículo", valor: resultado.articulo, derivado: true }] : []),
            ]}
            hipotesis={[
              `AISC 360, capítulo F, por ASD (Ωb = ${OMEGA_B}).`,
              "F2 en perfiles I y canales: manda el menor entre plastificación y pandeo lateral-torsional. Sólo cubre secciones compactas.",
              "F7 en tubos rectangulares y cajones, con los cuatro estados límite.",
              "F8 en tubos redondos: no hay pandeo lateral y decide la esbeltez de la pared.",
              "F9 en tes: plastificación, pandeo lateral-torsional y pandeo local del ala o del alma, según qué lado comprima. Sin Cb.",
              ...(esTe
                ? [
                    "Ala en ménsula: faja de 1 m empotrada en la cara del alma, con la reacción en la punta. Flexión por F11-1 (Ωb = 1,67) y corte por J4.2(a) (Ω = 1,50).",
                    "Pendiente: contrastar los coeficientes del F9, F11 y J4.2 contra el texto de AISC 360-16.",
                  ]
                : []),
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={numero("resultados")} titulo="Resultados">
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
                    : resultado.lpM === null || resultado.lrM === null
                      ? { etiqueta: "Lb", valor: `${fmt(aNumero(lb), 2)} m`, nota: "punta del alma comprimida" }
                      : { etiqueta: "Lb", valor: `${fmt(aNumero(lb), 2)} m`, nota: `Lp ${fmt(resultado.lpM, 2)} · Lr ${fmt(resultado.lrM, 2)} m` },
                ]}
              />

              <Subgrupo
                titulo="Resistencia a flexión"
                detalle={
                  resultado.articulo === "F2"
                    ? `${resultado.designacion} · zona: ${resultado.zona}`
                    : resultado.articulo === "F7" || resultado.articulo === "F9"
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
                        puntaAlma={resultado.articulo === "F9" ? resultado.puntaAlma : undefined}
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

              {ala && (
                <Subgrupo
                  titulo="Ala en ménsula"
                  detalle={`vuelo ${fmt(ala.vueloM * 1000, 1)} mm desde la cara del alma · admite hasta ${fmt(ala.reaccionAdmisibleKNm, 1)} kN/m por lado`}
                >
                  <div className="space-y-3">
                    {([["izquierdo", ala.izquierdo], ["derecho", ala.derecho]] as const).map(([nombre, lado]) => (
                      <div key={nombre} className="space-y-2">
                        <ResultadoCheck
                          etiqueta={`Flexión del ala, lado ${nombre} (F11-1)`}
                          verifica={lado.verificaFlexion}
                          detalle={`q = ${fmt(lado.reaccionKNm, 1)} kN/m en la punta`}
                          comparacion={{
                            real: { etiqueta: "m = q·vuelo", valor: lado.momentoKNmM },
                            limite: { etiqueta: "Mn/Ωb", valor: ala.mAdmisibleKNmM },
                            unidad: "kN·m/m", exige: "≤", decimales: 2,
                          }}
                        />
                        <ResultadoCheck
                          etiqueta={`Corte del ala, lado ${nombre} (J4.2a)`}
                          verifica={lado.verificaCorte}
                          comparacion={{
                            real: { etiqueta: "q", valor: lado.reaccionKNm },
                            limite: { etiqueta: "Vn/Ω", valor: ala.vAdmisibleKNM },
                            unidad: "kN/m", exige: "≤", decimales: 1,
                          }}
                        />
                      </div>
                    ))}
                    <PanelFormulas
                      titulo="Ver desarrollo del ala"
                      filas={[
                        { etiqueta: "Vuelo = (bf − tw)/2", valor: `${fmt(ala.vueloM * 1000, 1)} mm` },
                        { etiqueta: "Mn = Fy·tf²/4 ≤ 1,6·Fy·tf²/6, faja de 1 m  (F11-1)", valor: `${fmt(ala.mnKNmM, 2)} kN·m/m` },
                        { etiqueta: `Mn/Ωb con Ωb = ${OMEGA_B}`, valor: `${fmt(ala.mAdmisibleKNmM, 2)} kN·m/m` },
                        { etiqueta: "Vn = 0,6·Fy·tf, faja de 1 m  (J4-3)", valor: `${fmt(ala.vnKNM, 0)} kN/m` },
                        { etiqueta: "Vn/Ω con Ω = 1,50", valor: `${fmt(ala.vAdmisibleKNM, 0)} kN/m` },
                        { etiqueta: "Reacción admisible por lado", valor: `${fmt(ala.reaccionAdmisibleKNm, 1)} kN/m` },
                        { etiqueta: "Torsión por cargas distintas = (qi − qd)·bf/2", valor: `${fmt(ala.torsionKNmM, 2)} kN·m/m` },
                      ]}
                    />
                  </div>
                </Subgrupo>
              )}

              {esTe && (
                <PanelLlevarDatos
                  titulo="Seguir con esta misma T"
                  destinos={[
                    {
                      titulo: "Corte en el alma, y de ahí a la soldadura alma–ala",
                      ruta: "/verificaciones/corte-acero",
                      lleva: "la T, el acero y las reacciones de la losa sobre el ala",
                      falta: "el corte V de la viga; desde ahí se sigue a la soldadura con todo junto",
                      campos: {
                        familia: "te-armada",
                        params: seccion.crudo,
                        fyCorte: fy,
                        eCorte: e,
                        reaccionIzq,
                        reaccionDer,
                      },
                      blanquear: ["vRequerido"],
                    },
                  ]}
                />
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
