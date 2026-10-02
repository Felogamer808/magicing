"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisRecubrimientoAnclaje } from "@/components/verificaciones/croquis/CroquisVarios";
import { DiagramaAnclaje, DiagramaSolape } from "@/components/verificaciones/hormigon/DiagramaAnclaje";
import {
  calcularAnclaje,
  calcularSolape,
  type FormaAnclaje,
  type SituacionAdherencia,
  type TipoEsfuerzo,
} from "@/lib/calc/hormigon/comun/anclaje";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "longitudes-anclaje")!;

const ETAPAS = [
  { id: "barra", titulo: "Barra" },
  { id: "solape", titulo: "Solape" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const SITUACIONES: Record<SituacionAdherencia, string> = { buena: "Buena", mala: "Mala" };
const FORMAS: Record<FormaAnclaje, string> = { recta: "Recta", gancho: "Gancho a 90°" };
const ESFUERZOS: Record<TipoEsfuerzo, string> = { traccion: "Tracción", compresion: "Compresión" };
const SI_NO = ["No", "Sí"] as const;

function porClave<T extends string>(mapa: Record<T, string>, nombre: string, porDefecto: T): T {
  const entrada = (Object.entries(mapa) as [T, string][]).find(([, v]) => v === nombre);
  return entrada ? entrada[0] : porDefecto;
}

export default function LongitudesAnclajePage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [diametro, setDiametro] = useCampo("diametro", "16");
  const [situacion, setSituacion] = useCampo<SituacionAdherencia>("situacion", "buena");
  const [forma, setForma] = useCampo<FormaAnclaje>("forma", "recta");
  const [esfuerzo, setEsfuerzo] = useCampo<TipoEsfuerzo>("esfuerzo", "traccion");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "30");

  const [solape, setSolape] = useCampo<(typeof SI_NO)[number]>("solape", "No");
  const [porcentajeSolapado, setPorcentajeSolapado] = useCampo("porcentajeSolapado", "50");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      diametro: aNumero(diametro),
      recubrimiento: aNumero(recubrimiento),
      porcentajeSolapado: aNumero(porcentajeSolapado),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    if (v.porcentajeSolapado > 100) return null;

    const anclaje = calcularAnclaje(
      { fckMPa: v.fck, fykMPa: v.fyk },
      { diametroMm: v.diametro, situacion, forma, esfuerzo, recubrimientoMm: v.recubrimiento }
    );

    const haySolape = solape === "Sí";
    const solapeR = haySolape ? calcularSolape(anclaje, v.diametro, v.porcentajeSolapado) : null;

    return { v, anclaje, solapeR };
  }, [fck, fyk, diametro, situacion, forma, esfuerzo, recubrimiento, solape, porcentajeSolapado]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: todos tienen que ser positivos y el % solapado no puede superar 100." });
  } else if (esfuerzo === "compresion" && forma === "gancho") {
    avisos.push({ tipo: "aviso", texto: "Los ganchos no cuentan en anclajes a compresión (art. 8.4.1(3)): el resultado es el mismo que con forma recta." });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · herramienta de cálculo</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="barra" numero={1} titulo="Barra y materiales" descripcion="La barra que se ancla y su situación en la pieza.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                  <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  <CampoDiametro id="diametro" etiqueta="Ø" valor={diametro} onChange={setDiametro} />
                  <CampoNumerico id="recubrimiento" etiqueta="cd" sufijo="mm" valor={recubrimiento} onChange={setRecubrimiento} />
                  <CampoSeleccion id="situacion" etiqueta="Adherencia" valor={SITUACIONES[situacion]} opciones={Object.values(SITUACIONES)} onChange={(v) => setSituacion(porClave(SITUACIONES, v, "buena"))} />
                  <CampoSeleccion id="forma" etiqueta="Forma" valor={FORMAS[forma]} opciones={Object.values(FORMAS)} onChange={(v) => setForma(porClave(FORMAS, v, "recta"))} />
                  <CampoSeleccion id="esfuerzo" etiqueta="Esfuerzo" valor={ESFUERZOS[esfuerzo]} opciones={Object.values(ESFUERZOS)} onChange={(v) => setEsfuerzo(porClave(ESFUERZOS, v, "traccion"))} />
                </div>
                <PanelAyuda titulo="Qué es cada dato">
                  <p>
                    <strong className="text-foreground">Adherencia.</strong> Buena: armadura inferior, o
                    cualquier barra con menos de 250 mm de hormigón fresco debajo. Mala: típicamente la
                    armadura superior de una pieza alta (fig. A19.8.2).
                  </p>
                  <p>
                    <strong className="text-foreground">cd.</strong> El menor entre el semiancho libre
                    entre barras y los recubrimientos lateral e inferior. Con cd &gt; 3Ø un gancho
                    acorta el anclaje; con poco recubrimiento, no.
                  </p>
                </PanelAyuda>
              </>
            }
            dibujo={<CroquisRecubrimientoAnclaje />}
          />
        </Etapa>

        <Etapa id="solape" numero={2} titulo="Solape" descripcion="Sólo si la barra empalma con otra por solape.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoSeleccion id="solape" etiqueta="¿Es un solape?" valor={solape} opciones={SI_NO} onChange={(v) => setSolape(v as (typeof SI_NO)[number])} />
            {solape === "Sí" && (
              <CampoNumerico id="porcentajeSolapado" etiqueta="% de barras solapadas en la sección" sufijo="%" valor={porcentajeSolapado} onChange={setPorcentajeSolapado} />
            )}
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Barra", valor: `Ø${diametro}, cd ${recubrimiento} mm` },
              { etiqueta: "Adherencia · forma", valor: `${SITUACIONES[situacion]} · ${FORMAS[forma]}` },
              { etiqueta: "Esfuerzo", valor: ESFUERZOS[esfuerzo] },
              ...(resultado ? [{ etiqueta: "fbd", valor: `${fmt(resultado.anclaje.fbdMPa, 2)} MPa`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Anejo 19, art. 8.4 (anclaje) y 8.7 (solape).",
              "σsd = fyd: la barra ancla toda su capacidad. Es lo más conservador; con As real mayor que la necesaria el anclaje real puede ser más corto.",
              "α3 y α5 = 1,0: no se descuenta confinamiento ni presión transversal que esta página no puede verificar.",
              "En compresión el mínimo es 0,6·lb,rqd y los ganchos no aportan.",
              "Separación libre máxima entre barras solapadas 4Ø (art. 8.7.2(3)); si no se cumple, se suma a l0.",
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
              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "lbd", valor: `${fmt(resultado.anclaje.lbdMm, 0)} mm`, nota: `${fmt(resultado.anclaje.lbdMm / resultado.v.diametro, 1)}·Ø` },
                  { etiqueta: "lb,rqd", valor: `${fmt(resultado.anclaje.lbRqdMm, 0)} mm` },
                  { etiqueta: "l0 solape", valor: resultado.solapeR ? `${fmt(resultado.solapeR.l0Mm, 0)} mm` : "—", nota: resultado.solapeR ? `${fmt(resultado.solapeR.l0Mm / resultado.v.diametro, 1)}·Ø` : "sin solape" },
                  { etiqueta: "Mandril mínimo", valor: `${fmt(resultado.anclaje.mandrilMinMm, 0)} mm` },
                ]}
              />

              <Subgrupo titulo="Longitud de anclaje">
                <div className="space-y-3">
                  <div className="mx-auto w-full max-w-xl">
                    <DiagramaAnclaje diametroMm={resultado.v.diametro} forma={forma} lbdMm={resultado.anclaje.lbdMm} mandrilMinMm={resultado.anclaje.mandrilMinMm} />
                  </div>
                  <PanelFormulas
                    titulo="Ver desarrollo del anclaje"
                    filas={[
                      { etiqueta: "fctd", valor: `${fmt(resultado.anclaje.fctdMPa, 2)} MPa` },
                      { etiqueta: "η1 · η2", valor: `${fmt(resultado.anclaje.eta1, 2)} · ${fmt(resultado.anclaje.eta2, 2)}` },
                      { etiqueta: "fbd", valor: `${fmt(resultado.anclaje.fbdMPa, 2)} MPa` },
                      { etiqueta: "σsd (= fyd)", valor: `${fmt(resultado.anclaje.sigmaSdMPa, 1)} MPa` },
                      { etiqueta: "lb,rqd", formula: "(Ø/4)·(σsd/fbd)", sustitucion: `(${fmt(resultado.v.diametro, 0)}/4)·(${fmt(resultado.anclaje.sigmaSdMPa, 1)}/${fmt(resultado.anclaje.fbdMPa, 2)})`, valor: `${fmt(resultado.anclaje.lbRqdMm, 0)} mm` },
                      { etiqueta: "α1 · α2", valor: `${fmt(resultado.anclaje.alfa1, 2)} · ${fmt(resultado.anclaje.alfa2, 2)}` },
                      { etiqueta: "lb,min", valor: `${fmt(resultado.anclaje.lbMinMm, 0)} mm` },
                      { etiqueta: "lbd", formula: "máx(lb,min ; α1·α2·lb,rqd)", sustitucion: `máx(${fmt(resultado.anclaje.lbMinMm, 0)} ; ${fmt(resultado.anclaje.alfa1, 2)}·${fmt(resultado.anclaje.alfa2, 2)}·${fmt(resultado.anclaje.lbRqdMm, 0)})`, valor: `${fmt(resultado.anclaje.lbdMm, 0)} mm` },
                    ]}
                  />
                </div>
              </Subgrupo>

              {resultado.solapeR && (
                <Subgrupo titulo="Longitud de solape" detalle={`α6 = ${fmt(resultado.solapeR.alfa6, 2)} con ${fmt(resultado.v.porcentajeSolapado, 0)} % solapado`}>
                  <div className="space-y-3">
                    <div className="mx-auto w-full max-w-xl">
                      <DiagramaSolape diametroMm={resultado.v.diametro} l0Mm={resultado.solapeR.l0Mm} />
                    </div>
                    <PanelFormulas
                      titulo="Ver desarrollo del solape"
                      filas={[
                        { etiqueta: "α6 (tabla A19.8.3)", valor: fmt(resultado.solapeR.alfa6, 3) },
                        { etiqueta: "l0,min", valor: `${fmt(resultado.solapeR.l0MinMm, 0)} mm` },
                        { etiqueta: "l0", formula: "máx(l0,min ; α1·α2·α6·lb,rqd)", sustitucion: `máx(${fmt(resultado.solapeR.l0MinMm, 0)} ; ${fmt(resultado.anclaje.alfa1, 2)}·${fmt(resultado.anclaje.alfa2, 2)}·${fmt(resultado.solapeR.alfa6, 2)}·${fmt(resultado.anclaje.lbRqdMm, 0)})`, valor: `${fmt(resultado.solapeR.l0Mm, 0)} mm` },
                      ]}
                    />
                  </div>
                </Subgrupo>
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
