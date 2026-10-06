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
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { DiagramaInteraccion } from "@/components/verificaciones/acero/DiagramaInteraccion";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverFlexoCompresion } from "@/lib/calc/acero/resolver-flexo-compresion";
import { recomendarFlexoCompresion } from "@/lib/verificaciones/recomendaciones/acero";

const meta = registroVerificaciones.find((v) => v.id === "flexo-compresion")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "longitudes", titulo: "Longitudes" },
  { id: "solicitaciones", titulo: "Solicitaciones" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function FlexoCompresionPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("HEB");

  const [lcx, setLcx] = useCampo("lcxFC", "4");
  const [lcy, setLcy] = useCampo("lcyFC", "4");
  const [lb, setLb] = useCampo("lbFC", "4");
  const [cb, setCb] = useCampo("cbFC", "1");
  const [fy, setFy] = useCampo("fyFC", "250");
  const [e, setE] = useCampo("eFC", "200000");

  const [pRequerida, setPRequerida] = useCampo("pFC", "400");
  const [mrx, setMrx] = useCampo("mrx", "40");
  const [mry, setMry] = useCampo("mry", "10");

  const campos = useMemo(
    () => ({ familia: seccion.familia, params: seccion.crudo, lcxFC: lcx, lcyFC: lcy, lbFC: lb, cbFC: cb, fyFC: fy, eFC: e, pFC: pRequerida, mrx, mry }),
    [seccion.familia, seccion.crudo, lcx, lcy, lb, cb, fy, e, pRequerida, mrx, mry]
  );
  const resultado = useMemo(() => resolverFlexoCompresion(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarFlexoCompresion(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Completá la sección, las longitudes y el material con valores positivos. La compresión y los momentos pueden ser cero." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Barras · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="El perfil y el acero.">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          >
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fyFC" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eFC" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </div>
          </SelectorSeccionAcero>
        </Etapa>

        <Etapa id="longitudes" numero={2} titulo="Longitudes y arriostramiento" descripcion="Lc para el pandeo por compresión (cap. E) y Lb, Cb para la flexión (cap. F).">
          <div className="grid max-w-2xl grid-cols-2 gap-4">
            <CampoNumerico id="lcxFC" etiqueta="Lc eje fuerte" sufijo="m" valor={lcx} onChange={setLcx} advertencia="Longitud efectiva de pandeo por compresión, Lc=K·L (cap. E), eje x" />
            <CampoNumerico id="lcyFC" etiqueta="Lc eje débil" sufijo="m" valor={lcy} onChange={setLcy} advertencia="Lo mismo que Lc eje fuerte, pero eje y" />
            <CampoNumerico id="lbFC" etiqueta="Lb sin arriostrar" sufijo="m" valor={lb} onChange={setLb} advertencia="Distancia entre arriostramientos del ala comprimida (cap. F); no tiene por qué coincidir con Lc" />
            <CampoNumerico id="cbFC" etiqueta="Cb" valor={cb} onChange={setCb} advertencia="Corrige Mn según la forma del diagrama de momentos en Lb; 1 es siempre válido y conservador" />
            <div className="col-span-2">
              <PanelAyuda titulo="Qué son Lc, Lb y Cb">
                <p>
                  <strong className="text-foreground">Lc eje fuerte / Lc eje débil.</strong> La
                  longitud efectiva de pandeo por compresión de cada eje (cap. E), Lc=K·L ya
                  cargada con K adentro. Son dos porque la barra puede estar arriostrada distinto
                  en cada dirección — por ejemplo, correas a media altura que la sujetan sólo en
                  el eje débil.
                </p>
                <p>
                  <strong className="text-foreground">Lb sin arriostrar.</strong> La distancia
                  entre los puntos que impiden que el ala comprimida se desplace lateralmente o
                  gire — el dato que entra en el pandeo lateral-torsional del cap. F. No tiene por
                  qué coincidir con ningún Lc: un arriostramiento puede frenar el giro del ala sin
                  frenar el pandeo por compresión de toda la sección, y viceversa.
                </p>
                <p>
                  <strong className="text-foreground">Cb.</strong> Corrige Mn del cap. F según la
                  forma del diagrama de momentos dentro de Lb (art. F1, ec. F1-1): un momento
                  uniforme en todo el tramo —el caso más desfavorable para el pandeo
                  lateral-torsional— da Cb=1; si el momento varía o cambia de signo dentro del
                  tramo, Cb sube (hasta 3) y la resistencia real es mayor. Cargar 1 siempre es
                  válido, aunque conservador.
                </p>
              </PanelAyuda>
            </div>
          </div>
        </Etapa>

        <Etapa id="solicitaciones" numero={3} titulo="Solicitaciones" descripcion="Con Pr = 0 la página verifica flexión biaxial pura, sin cargar una axial ficticia.">
          <div className="grid max-w-2xl grid-cols-2 gap-4">
            <CampoNumerico id="pFC" etiqueta="Compresión Pr (0 si es una viga)" sufijo="kN" valor={pRequerida} onChange={setPRequerida} />
            <div />
            <CampoNumerico id="mrx" etiqueta="Momento Mrx" sufijo="kN·m" valor={mrx} onChange={setMrx} />
            <CampoNumerico id="mry" etiqueta="Momento Mry" sufijo="kN·m" valor={mry} onChange={setMry} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: resultado ? resultado.designacion : "—" },
              { etiqueta: "Fy / E", valor: `${fy} / ${e} MPa` },
              { etiqueta: "Lc fuerte / débil", valor: `${lcx} / ${lcy} m` },
              { etiqueta: "Lb · Cb", valor: `${lb} m · ${cb}` },
              { etiqueta: "Pr · Mrx · Mry", valor: `${pRequerida} kN · ${mrx} · ${mry} kN·m` },
              ...(resultado ? [{ etiqueta: "Pr/Pc", valor: fmt(resultado.relacionAxial, 3), derivado: true }] : []),
            ]}
            hipotesis={[
              "AISC 360, art. H1.1, por ASD: combina la axial admisible del capítulo E con las dos flexionales del capítulo F, sin resistencias nuevas.",
              "Con Pr/Pc ≥ 0,2 manda la ec. H1-1a; por debajo, la H1-1b.",
              "Con Pr = 0 la H1-1b se reduce a Mrx/Mcx + Mry/Mcy ≤ 1: flexión biaxial pura.",
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
                  { etiqueta: "Pc = Pn/Ωc", valor: `${fmt(resultado.pcKN, 1)} kN`, nota: `pandeo eje ${resultado.gobiernaCompresion}` },
                  { etiqueta: "Mcx", valor: `${fmt(resultado.mcxKNm, 1)} kN·m`, nota: `art. ${resultado.articuloFlexion}` },
                  { etiqueta: "Mcy", valor: `${fmt(resultado.mcyKNm, 1)} kN·m` },
                  { etiqueta: "Pr/Pc", valor: fmt(resultado.relacionAxial, 3), nota: `ec. ${resultado.ecuacion}` },
                ]}
              />

              <Subgrupo titulo="Interacción axial-flexión" detalle={`${resultado.designacion} · ec. ${resultado.ecuacion}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`Interacción ${resultado.ecuacion}`}
                    verifica={resultado.verifica}
                    comparacion={{
                      real: { etiqueta: "interacción", valor: resultado.interaccion },
                      limite: { etiqueta: "límite", valor: 1 },
                      unidad: "", exige: "≤", decimales: 3,
                    }}
                    detalle={`Axial ${fmt(resultado.terminos.axial, 3)} · flexión x ${fmt(resultado.terminos.flexionX, 3)} · flexión y ${fmt(resultado.terminos.flexionY, 3)}`}
                    recomendaciones={rec.interaccion}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <DiagramaInteraccion
                      relacionAxial={resultado.relacionAxial}
                      terminoFlexion={resultado.terminos.flexionX + resultado.terminos.flexionY}
                      interaccion={resultado.interaccion}
                      ecuacion={resultado.ecuacion}
                      verifica={resultado.verifica}
                    />
                    <p className="text-xs text-muted-foreground">
                      El punto tiene que caer dentro de la envolvente. El quiebre en Pr/Pc = 0,2 es
                      donde la norma cambia de ecuación: arriba el momento entra afectado por 8/9,
                      abajo la axial cuenta a la mitad.
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver desarrollo de la interacción"
                    filas={[
                      { etiqueta: "Pc = Pn/Ωc  (cap. E)", valor: `${fmt(resultado.pcKN, 1)} kN` },
                      { etiqueta: "Gobierna el pandeo por el eje", valor: resultado.gobiernaCompresion },
                      { etiqueta: `Mcx = Mnx/Ωb  (art. ${resultado.articuloFlexion})`, valor: `${fmt(resultado.mcxKNm, 1)} kN·m` },
                      { etiqueta: "Gobierna la flexión", valor: resultado.zonaFlexion },
                      {
                        etiqueta: `Mcy = Mny/Ωb  (art. ${resultado.articuloFlexion === "F2" ? "F6" : resultado.articuloFlexion})`,
                        valor: `${fmt(resultado.mcyKNm, 1)} kN·m`,
                      },
                      { etiqueta: "Pr/Pc", valor: fmt(resultado.relacionAxial, 4) },
                      { etiqueta: "Ecuación aplicada", valor: resultado.ecuacion },
                      { etiqueta: "Interacción", valor: fmt(resultado.interaccion, 4) },
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
