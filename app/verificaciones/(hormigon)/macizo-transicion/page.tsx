"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
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
import { DiagramaMacizoTransicion } from "@/components/verificaciones/hormigon/DiagramaMacizoTransicion";
import {
  CroquisArmadoMacizo,
  CroquisGeometriaMacizo,
  type ElementoMacizo,
  type MedidasMacizo,
} from "@/components/verificaciones/hormigon/CroquisMacizo";
import type { ComprobacionTension } from "@/lib/calc/hormigon/macizo-transicion";
import { resolverMacizoTransicion } from "@/lib/calc/hormigon/resolver-macizo-transicion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "macizo-transicion")!;

const ETAPAS = [
  { id: "cargas", titulo: "Materiales y cargas" },
  { id: "geometria", titulo: "Geometría" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Qué parte de los dibujos corresponde a cada campo, para resaltarla con el foco. */
const ELEMENTO_DE_CAMPO: Record<string, ElementoMacizo> = {
  h: "h", ancho: "ancho", profundidad: "profundidad", recubrimiento: "recubrimiento",
  supPlano: "supPlano", supTransversal: "supTransversal", infPlano: "infPlano", infTransversal: "infTransversal",
  e: "e", bordeTraccionado: "borde",
  numeroU: "u", diametroU: "u", mandrilU: "u", patillaInferior: "u",
  diametroCerco: "cercos", ramasX: "cercos", ramasY: "cercos", separacionCercos: "cercos",
  numeroInferior: "inferior", diametroInferior: "inferior",
};

const PATILLA = { no: "Rama recta hasta abajo", si: "Rama con patilla inferior" } as const;

function CheckNudo({ etiqueta, c, detalle }: { etiqueta: string; c: ComprobacionTension; detalle: string }) {
  return (
    <ResultadoCheck
      etiqueta={etiqueta}
      verifica={c.verifica}
      detalle={detalle}
      comparacion={{
        real: { etiqueta: "σEd", valor: c.sigmaMPa },
        limite: { etiqueta: "σRd,max", valor: c.sigmaMaxMPa },
        unidad: "MPa", exige: "≤", decimales: 2,
      }}
    />
  );
}

export default function MacizoTransicionPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [nEd, setNEd] = useCampo("nEd", "1000");
  const [mEd, setMEd] = useCampo("mEd", "");

  const [h, setH] = useCampo("h", "0.8");
  const [ancho, setAncho] = useCampo("ancho", "0.5");
  const [profundidad, setProfundidad] = useCampo("profundidad", "0.6");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.03");
  const [supPlano, setSupPlano] = useCampo("supPlano", "0.5");
  const [supTransversal, setSupTransversal] = useCampo("supTransversal", "0.2");
  const [infPlano, setInfPlano] = useCampo("infPlano", "0.25");
  const [infTransversal, setInfTransversal] = useCampo("infTransversal", "0.6");
  const [e, setE] = useCampo("e", "0.125");
  const [bordeTraccionado, setBordeTraccionado] = useCampo("bordeTraccionado", "");

  const [numeroU, setNumeroU] = useCampo("numeroU", "4");
  const [diametroU, setDiametroU] = useCampo("diametroU", "16");
  const [mandrilU, setMandrilU] = useCampo("mandrilU", "");
  const [patillaInferior, setPatillaInferior] = useCampo("patillaInferior", "no");
  const [diametroCerco, setDiametroCerco] = useCampo("diametroCerco", "8");
  const [ramasX, setRamasX] = useCampo("ramasX", "2");
  const [ramasY, setRamasY] = useCampo("ramasY", "2");
  const [separacionCercos, setSeparacionCercos] = useCampo("separacionCercos", "0.15");
  const [numeroInferior, setNumeroInferior] = useCampo("numeroInferior", "4");
  const [diametroInferior, setDiametroInferior] = useCampo("diametroInferior", "12");

  const campos = useMemo(
    () => ({
      fck, fyk, nEd, mEd, h, ancho, profundidad, recubrimiento, supPlano, supTransversal, infPlano, infTransversal,
      e, bordeTraccionado, numeroU, diametroU, mandrilU, patillaInferior, diametroCerco, ramasX, ramasY, separacionCercos,
      numeroInferior, diametroInferior,
    }),
    [fck, fyk, nEd, mEd, h, ancho, profundidad, recubrimiento, supPlano, supTransversal, infPlano, infTransversal,
     e, bordeTraccionado, numeroU, diametroU, mandrilU, patillaInferior, diametroCerco, ramasX, ramasY, separacionCercos,
     numeroInferior, diametroInferior]
  );
  const resuelto = useMemo(() => resolverMacizoTransicion(campos), [campos]);
  const res = resuelto.ok ? resuelto : null;
  const r = res?.r;

  const [foco, setFoco] = useState<string | null>(null);
  const resaltar = foco ? (ELEMENTO_DE_CAMPO[foco] ?? null) : null;
  // El foco se sigue en un contenedor: los eventos de foco de React burbujean.
  const seguirFoco = {
    onFocus: (ev: FocusEvent<HTMLElement>) => setFoco(ev.target.id || null),
    onBlur: () => setFoco(null),
  };

  const avisos: AvisoRevision[] = [];
  if (!resuelto.ok) avisos.push({ tipo: "error", texto: resuelto.motivo });
  else {
    for (const [dir, t] of [["en el plano", resuelto.r.zonaCargada.traccionB], ["transversal", resuelto.r.zonaCargada.traccionD]] as const) {
      if (t.fueraDeRango && t.aM < t.bM - 1e-9) {
        avisos.push({ tipo: "aviso", texto: `Tracción transversal ${dir}: a > H/2, fuera del campo de la fig. A19.6.25 b).` });
      }
    }
  }

  // Para el dibujo, aunque falte algún dato.
  const n = (s: string, porDefecto: number) => {
    const x = aNumero(s);
    return Number.isFinite(x) && x > 0 ? x : porDefecto;
  };

  const medidas: MedidasMacizo = {
    hM: n(h, 0.8),
    anchoM: n(ancho, 0.5),
    profundidadM: n(profundidad, 0.6),
    recubrimientoM: n(recubrimiento, 0.03),
    supPlanoM: n(supPlano, 0.5),
    supTransversalM: n(supTransversal, 0.2),
    infPlanoM: n(infPlano, 0.25),
    infTransversalM: n(infTransversal, 0.6),
    excentricidadM: aNumero(e) || 0,
    bordeM: aNumero(bordeTraccionado) || 0,
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · Regiones D</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12" {...seguirFoco}>
        <Etapa id="cargas" numero={1} titulo="Materiales y cargas" descripcion="Lo que baja del pilar superior, mayorado.">
          <div className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
            <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            <CampoNumerico id="nEd" etiqueta="Nd" sufijo="kN" valor={nEd} onChange={setNEd} />
            <CampoNumerico id="mEd" etiqueta="Md (opcional)" sufijo="kN·m" valor={mEd} onChange={setMEd} />
          </div>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
            Md es el del pilar superior en el plano de la excentricidad: positivo si aleja la carga del eje del pilar
            inferior. En blanco cuenta como 0.
          </p>
        </Etapa>

        <Etapa id="geometria" numero={2} titulo="Geometría" descripcion="En planta, un lado de cada pieza en el plano de la excentricidad y otro transversal.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Macizo">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="h" etiqueta="Canto h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="ancho" etiqueta="En el plano" sufijo="m" valor={ancho} onChange={setAncho} />
                    <CampoNumerico id="profundidad" etiqueta="Transversal" sufijo="m" valor={profundidad} onChange={setProfundidad} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar superior">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="supPlano" etiqueta="En el plano" sufijo="m" valor={supPlano} onChange={setSupPlano} />
                    <CampoNumerico id="supTransversal" etiqueta="Transversal" sufijo="m" valor={supTransversal} onChange={setSupTransversal} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar inferior">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="infPlano" etiqueta="En el plano" sufijo="m" valor={infPlano} onChange={setInfPlano} />
                    <CampoNumerico id="infTransversal" etiqueta="Transversal" sufijo="m" valor={infTransversal} onChange={setInfTransversal} />
                    <CampoNumerico id="e" etiqueta="e entre ejes" sufijo="m" valor={e} onChange={setE} />
                    <CampoNumerico id="bordeTraccionado" etiqueta="Borde opuesto" sufijo="m" valor={bordeTraccionado} onChange={setBordeTraccionado} />
                  </div>
                </Subgrupo>
                <p className="text-xs text-muted-foreground">
                  &quot;Borde opuesto&quot; es lo que el macizo sobresale del pilar inferior del lado contrario a la carga; en
                  blanco, enrasados. Transversalmente los dos pilares se suponen centrados en el macizo.
                </p>
              </>
            }
            dibujo={<CroquisGeometriaMacizo m={medidas} resaltar={resaltar} />}
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Por planos, como un cabezal: la U en el plano de la excentricidad, cercos horizontales y la cara inferior.">
          <DatosConDibujo
            datos={
              <div className="space-y-4">
                <Subgrupo titulo="U invertida (plano XZ)">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="numeroU" etiqueta="Barras" valor={numeroU} onChange={setNumeroU} />
                    <CampoNumerico id="diametroU" etiqueta="Ø" sufijo="mm" valor={diametroU} onChange={setDiametroU} />
                    <CampoNumerico id="mandrilU" etiqueta="Mandril" sufijo="mm" valor={mandrilU} onChange={setMandrilU} />
                    <CampoSeleccion
                      id="patillaInferior"
                      etiqueta="Del lado de la carga"
                      valor={PATILLA[patillaInferior === "si" ? "si" : "no"]}
                      opciones={Object.values(PATILLA)}
                      onChange={(x) => setPatillaInferior(x === PATILLA.si ? "si" : "no")}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Una sola armadura: sube del pilar como esperas, gira arriba, cruza como tirante y baja por la cara
                    del lado de la carga, que es su anclaje. Viene del pilar (sus barras o esperas solapadas en el
                    pilar, no en el macizo). Mandril en blanco: el mínimo de la tabla A19.8.1.
                  </p>
                </Subgrupo>
                <Subgrupo titulo="Cercos horizontales (planos XY e YZ)">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="diametroCerco" etiqueta="Ø" sufijo="mm" valor={diametroCerco} onChange={setDiametroCerco} />
                    <CampoNumerico id="separacionCercos" etiqueta="Separación" sufijo="m" valor={separacionCercos} onChange={setSeparacionCercos} />
                    <CampoNumerico id="ramasX" etiqueta="Ramas en X" valor={ramasX} onChange={setRamasX} />
                    <CampoNumerico id="ramasY" etiqueta="Ramas en Y" valor={ramasY} onChange={setRamasY} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    En toda la altura del macizo. Las ramas en Y cosen la tracción de la carga que se abre en Y; las
                    ramas en X, la de la otra dirección si la hay.
                  </p>
                </Subgrupo>
                <Subgrupo titulo="Cara inferior">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="numeroInferior" etiqueta="Barras" valor={numeroInferior} onChange={setNumeroInferior} />
                    <CampoNumerico id="diametroInferior" etiqueta="Ø" sufijo="mm" valor={diametroInferior} onChange={setDiametroInferior} />
                  </div>
                </Subgrupo>
              </div>
            }
            dibujo={
              <CroquisArmadoMacizo
                m={medidas}
                resaltar={resaltar}
                armado={{
                  numeroU: n(numeroU, 0),
                  diametroUMm: n(diametroU, 16),
                  mandrilUMm: res ? res.v.mandrilU : n(mandrilU, 64),
                  patillaInferior: patillaInferior === "si",
                  diametroCercoMm: n(diametroCerco, 8),
                  separacionCercosM: n(separacionCercos, 0.15),
                  numeroInferior: n(numeroInferior, 0),
                  diametroInferiorMm: n(diametroInferior, 12),
                }}
              />
            }
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Nd · Md", valor: `${nEd} kN · ${mEd || "0"} kN·m` },
              { etiqueta: "Macizo", valor: `${ancho} × ${profundidad} m, h = ${h} m` },
              { etiqueta: "Pilar superior / inferior", valor: `${supPlano} × ${supTransversal} / ${infPlano} × ${infTransversal} m` },
              { etiqueta: "e entre ejes", valor: `${e} m` },
              ...(r ? [{ etiqueta: "e total = e + Md/Nd", valor: `${fmt(r.excentricidadTotalM, 3)} m`, derivado: true }] : []),
              ...(res ? [{ etiqueta: "fcd · fyd · ν'", valor: `${fmt(res.materiales.fcd, 2)} · ${fmt(res.materiales.fyd, 1)} MPa · ${fmt(res.r.nuPrima, 3)}`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Región D por bielas y tirantes, Anejo 19, art. 6.5, en el plano de la excentricidad.",
              "Nudo C, en la cabeza del pilar inferior: sólo compresión, σRd,max = k1·ν'·fcd con k1 = 1,0 (ec. 6.60, pág. 98). Su ancho y la tracción de las esperas Ts salen del equilibrio. Si la resultante entra en el pilar con ese ancho, no hay Ts ni tirante.",
              "Nudo B, bajo el pilar superior: k2 = 0,85 con tirante (ec. 6.61) o k1 sin él. Con Md, la carga ocupa un ancho c − 2·Md/Nd.",
              "Nudo A, tirante y esperas: k3 = 0,75 (ec. 6.62, pág. 99). ν' = 1 − fck/250 (ec. 6.57, pág. 97).",
              "Brazo z: del eje del tirante a la cara inferior del macizo, que es la cabeza del pilar inferior.",
              "Esperas y tirante son una U invertida continua que viene del pilar: en A la fuerza pasa por el doblado, cuyo mandril se verifica con la ec. (8.1) del art. 8.3 (3), pág. 122. La U lleva la mayor de Ts y T.",
              "T se ancla en la rama del lado de la carga, desde la cara interior del nudo B (art. 6.5.4 (7), pág. 100), por el eje de la barra (art. 8.4.3 (3)).",
              "Cercos horizontales en toda la altura: sus ramas cosen la tracción transversal del art. 6.5.3 (3). Separación máxima y cuantía mínima de la cara inferior por analogía con las vigas de gran canto, art. 9.7 (1) y (2), con el espesor igual al lado en Y.",
              "Carga concentrada del pilar superior sobre el macizo por el art. 6.7 (ec. 6.63, pág. 101), con las tracciones transversales del art. 6.5.3 (3).",
              "El pilar inferior queda con N = Nd y M = Nd·e total en su cabeza: se verifica en Pilares, con el reparto del momento entre la losa y la base.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!r || !res ? (
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
                  { etiqueta: "Ts esperas", valor: `${fmt(r.traccionEsperasKN, 0)} kN`, nota: r.sinTraccion ? "la resultante entra en el pilar" : "rama de la U" },
                  { etiqueta: "T tirante", valor: `${fmt(r.traccionTiranteKN, 0)} kN`, nota: `U: As ${fmt(r.asNecUCm2)} cm²` },
                  { etiqueta: "C pilar inferior", valor: `${fmt(r.compresionCKN, 0)} kN`, nota: `ancho ${fmt(r.anchoNudoCM, 3)} m` },
                  { etiqueta: "Para Pilares", valor: `M = ${fmt(r.mPilarInferiorKNm, 1)} kN·m`, nota: `N = ${fmt(r.nPilarInferiorKN, 0)} kN` },
                ]}
              />

              <Subgrupo titulo="Modelo de bielas y tirantes" detalle="bielas a trazos, tirantes llenos">
                <div className="mx-auto w-full max-w-md">
                  <DiagramaMacizoTransicion
                    hM={res.v.h}
                    anchoM={res.v.ancho}
                    supPlanoM={res.v.supPlano}
                    infPlanoM={res.v.infPlano}
                    bordeM={res.v.borde}
                    excentricidadM={r.excentricidadTotalM}
                    modelo={{
                      zM: r.zM,
                      yEsperasM: r.yEsperasM,
                      yNudoCM: r.yNudoCM,
                      anchoNudoCM: r.anchoNudoCM,
                      sinTraccion: r.sinTraccion,
                      nKN: res.v.nEd,
                      traccionEsperasKN: r.traccionEsperasKN,
                      traccionTiranteKN: r.traccionTiranteKN,
                      compresionCKN: r.compresionCKN,
                    }}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Nudos" detalle="art. 6.5.4">
                <div className="space-y-3">
                  {r.sinTraccion ? (
                    <CheckNudo etiqueta="Nudo C, cabeza del pilar inferior" c={r.nudoC} detalle="sólo compresión, k1 = 1,0" />
                  ) : (
                    <ResultadoCheck
                      etiqueta="Nudo C, cabeza del pilar inferior"
                      verifica={r.nudoC.verifica}
                      detalle="trabaja a k1·ν'·fcd; se compara el momento respecto de las esperas con el máximo que da el pilar"
                      comparacion={{
                        real: { etiqueta: "Nd·(yN − yT)", valor: res.v.nEd * (r.yCargaM - r.yEsperasM) },
                        limite: { etiqueta: "σ·b·D²/2", valor: (res.v.nEd * (r.yCargaM - r.yEsperasM)) / r.nudoC.aprovechamiento },
                        unidad: "kN·m", exige: "≤", decimales: 1,
                      }}
                    />
                  )}
                  <CheckNudo etiqueta="Nudo B, apoyo del pilar superior" c={r.nudoBApoyo} detalle={r.traccionTiranteKN > 0 ? "con tirante, k2 = 0,85" : "sólo compresión, k1 = 1,0"} />
                  <CheckNudo etiqueta="Nudo B, cara de la biela" c={r.nudoBBiela} detalle={`biela a ${fmt(r.anguloBielaBCGrados, 1)}°`} />
                  {r.nudoA && <CheckNudo etiqueta="Nudo A, tirante y esperas" c={r.nudoA} detalle={`k3 = 0,75; biela a ${fmt(r.anguloBielaACGrados, 1)}°`} />}
                </div>
              </Subgrupo>

              <Subgrupo titulo="U invertida" detalle="As = máx(Ts, T)/fyd; doblados, art. 8.3">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura de la U"
                    verifica={r.verificaU}
                    detalle={r.traccionEsperasKN >= r.traccionTiranteKN ? "manda la rama de las esperas" : "manda el tramo superior"}
                    comparacion={{
                      real: { etiqueta: "As nec", valor: r.asNecUCm2 },
                      limite: { etiqueta: `${numeroU}Ø${diametroU}`, valor: r.asRealUCm2 },
                      unidad: "cm²", exige: "≤", decimales: 2,
                    }}
                  />
                  {r.dobladoA && (
                    <ResultadoCheck
                      etiqueta="Doblado en A, de las esperas al tirante"
                      verifica={r.dobladoA.verifica}
                      detalle={`ec. (8.1): Fbt = ${fmt(r.dobladoA.fuerzaBarraKN, 1)} kN por barra, ab = ${fmt(r.dobladoA.abMm, 0)} mm; tabla A19.8.1: ${r.mandrilMinimoTablaMm} mm`}
                      comparacion={{
                        real: { etiqueta: "φm,min", valor: r.dobladoA.mandrilNecMm },
                        limite: { etiqueta: "mandril", valor: res.v.mandrilU },
                        unidad: "mm", exige: "≤", decimales: 0,
                      }}
                    />
                  )}
                  {r.dobladoB && (
                    <ResultadoCheck
                      etiqueta="Doblado en B, del tirante a la rama"
                      verifica={r.dobladoB.verifica}
                      detalle={`ec. (8.1): Fbt = ${fmt(r.dobladoB.fuerzaBarraKN, 1)} kN por barra`}
                      comparacion={{
                        real: { etiqueta: "φm,min", valor: r.dobladoB.mandrilNecMm },
                        limite: { etiqueta: "mandril", valor: res.v.mandrilU },
                        unidad: "mm", exige: "≤", decimales: 0,
                      }}
                    />
                  )}
                  {r.anclajeTirante && (
                    <ResultadoCheck
                      etiqueta="Anclaje de T en la rama del lado de la carga"
                      verifica={r.anclajeTirante.verifica}
                      detalle={`σsd = ${fmt(r.anclajeTirante.sigmaSdMPa, 0)} MPa; ${res.v.patillaInferior ? "con patilla inferior" : "rama recta hasta abajo"}`}
                      comparacion={{
                        real: { etiqueta: "lbd", valor: r.anclajeTirante.lbdMm },
                        limite: { etiqueta: "disponible", valor: r.anclajeTirante.disponibleMm },
                        unidad: "mm", exige: "≤", decimales: 0,
                      }}
                    />
                  )}
                  <PanelFormulas
                    titulo="Ver desarrollo del equilibrio"
                    filas={[
                      { etiqueta: "yN carga (desde el eje del pilar inferior)", valor: `${fmt(r.yCargaM, 3)} m` },
                      { etiqueta: "yT esperas", valor: `${fmt(r.yEsperasM, 3)} m` },
                      { etiqueta: "yC nudo C", valor: `${fmt(r.yNudoCM, 3)} m` },
                      { etiqueta: "z", valor: `${fmt(r.zM, 3)} m` },
                      { etiqueta: "Ts = C − Nd", valor: `${fmt(r.traccionEsperasKN, 1)} kN` },
                      { etiqueta: "T = Nd·(yN − yC)/z", sustitucion: `${fmt(res.v.nEd, 0)}·(${fmt(r.yCargaM, 3)} − ${fmt(r.yNudoCM, 3)})/${fmt(r.zM, 3)}`, valor: `${fmt(r.traccionTiranteKN, 1)} kN` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Cercos horizontales y cara inferior" detalle="art. 6.5.3 (3) y 9.7">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`Cercos, ramas en Y (${r.numeroCercos} cercos en la altura)`}
                    verifica={r.asCercosYCm2 >= r.asNecCercosYCm2}
                    detalle={r.asNecCercosYCm2 > 0 ? "tracción transversal de la carga que se abre en Y" : "en Y el pilar ocupa todo el ancho: no hay tracción"}
                    comparacion={{
                      real: { etiqueta: "As nec", valor: r.asNecCercosYCm2 },
                      limite: { etiqueta: "dispuesta", valor: r.asCercosYCm2 },
                      unidad: "cm²", exige: "≤", decimales: 2,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cercos, ramas en X"
                    verifica={r.asCercosXCm2 >= r.asNecCercosXCm2}
                    detalle={r.asNecCercosXCm2 > 0 ? "tracción transversal de la carga que se abre en X" : "en X el pilar ocupa todo el ancho: no hay tracción"}
                    comparacion={{
                      real: { etiqueta: "As nec", valor: r.asNecCercosXCm2 },
                      limite: { etiqueta: "dispuesta", valor: r.asCercosXCm2 },
                      unidad: "cm²", exige: "≤", decimales: 2,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Separación de los cercos"
                    verifica={r.verificaSeparacionCercos}
                    detalle="art. 9.7 (2): mín(300 mm; 2·espesor)"
                    comparacion={{
                      real: { etiqueta: "s", valor: res.v.separacionCercos * 1000 },
                      limite: { etiqueta: "s máx", valor: r.separacionMaxCercosM * 1000 },
                      unidad: "mm", exige: "≤", decimales: 0,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cara inferior"
                    verifica={r.verificaInferior}
                    detalle="art. 9.7 (1) por analogía: 0,001·Ac por m, no menos de 1,5 cm²/m"
                    comparacion={{
                      real: { etiqueta: "As mín", valor: r.asMinInferiorCm2PorM },
                      limite: { etiqueta: `${numeroInferior}Ø${diametroInferior}`, valor: r.asInferiorCm2PorM },
                      unidad: "cm²/m", exige: "≤", decimales: 2,
                    }}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Carga concentrada del pilar superior" detalle="art. 6.7, ec. (6.63)">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Compresión concentrada"
                    verifica={r.zonaCargada.verificaAplastamiento}
                    comparacion={{
                      real: { etiqueta: "Nd", valor: res.v.nEd },
                      limite: { etiqueta: "FRdu", valor: r.zonaCargada.fRduKN },
                      unidad: "kN", exige: "≤", decimales: 0,
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tracción transversal (art. 6.5.3 (3)):{" "}
                    {([["en el plano", r.zonaCargada.traccionB], ["transversal", r.zonaCargada.traccionD]] as const)
                      .map(([dir, t]) =>
                        // Si el pilar ocupa todo el ancho la carga no se abre y no hay tracción.
                        t.aM >= t.bM - 1e-9
                          ? `${dir}, el pilar ocupa todo el ancho y la carga no se abre`
                          : `${dir} T = ${fmt(t.tKN, 0)} kN → As = ${fmt(t.asNecCm2)} cm²`
                      )
                      .join("; ")}
                    .
                  </p>
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
