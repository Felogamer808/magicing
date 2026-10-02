"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { LeyendaTecnica } from "@/components/verificaciones/comun/LeyendaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { DiagramaCFT } from "@/components/verificaciones/acero/DiagramaCFT";
import { calcularSeccionMixta } from "@/lib/calc/acero/seccion-mixta";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisSeccionMixta,
} from "@/components/verificaciones/croquis/CroquisVarios";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "secciones-mixtas")!;

const ETAPAS = [
  { id: "materiales", titulo: "Materiales" },
  { id: "geometria", titulo: "Geometría" },
  { id: "solicitaciones", titulo: "Solicitaciones" },
  { id: "incendio", titulo: "Incendio" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function SeccionMixtaPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");

  const [es, setEs] = useCampo("es", "200000");
  const [fy, setFy] = useCampo("fy", "250");
  const [fc, setFc] = useCampo("fc", "30");
  const [ec, setEc] = useCampo("ec", "28000");

  const [dMm, setDMm] = useCampo("dMm", "300");
  const [tMm, setTMm] = useCampo("tMm", "9.5");
  const [lM, setLM] = useCampo("lM", "3");
  const [phiBarra, setPhiBarra] = useCampo("phiBarra", "12");
  const [nBarras, setNBarras] = useCampo("nBarras", "5");

  const [p, setP] = useCampo("p", "800");
  const [m, setM] = useCampo("m", "100");
  const [v, setV] = useCampo("v", "100");
  const [yG, setYG] = useCampo("yG", "92.5");
  const [lFuego, setLFuego] = useCampo("lFuego", "3");

  const resultado = useMemo(() => {
    const n = {
      es: aNumero(es), fy: aNumero(fy), fc: aNumero(fc), ec: aNumero(ec),
      dMm: aNumero(dMm), tMm: aNumero(tMm), lM: aNumero(lM),
      phiBarra: aNumero(phiBarra), nBarras: aNumero(nBarras),
      p: aNumero(p), m: aNumero(m), v: aNumero(v), yG: aNumero(yG), lFuego: aNumero(lFuego),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.es <= 0 || n.fy <= 0 || n.fc <= 0 || n.ec <= 0) return null;
    if (n.dMm <= 0 || n.tMm <= 0 || n.lM <= 0 || n.phiBarra <= 0 || n.nBarras <= 0) return null;
    if (n.tMm * 2 >= n.dMm || n.lFuego <= 0) return null;

    return {
      n,
      r: calcularSeccionMixta(
        { esKPa: n.es * 1000, fyKPa: n.fy * 1000, fcKPa: n.fc * 1000, ecKPa: n.ec * 1000 },
        { dMm: n.dMm, tMm: n.tMm, lM: n.lM, diametroBarraMm: n.phiBarra, numeroBarras: n.nBarras },
        { pKN: n.p, mKNm: n.m, vKN: n.v, yGMm: n.yG, temperaturaC: 600, longitudFuegoM: n.lFuego }
      ),
    };
  }, [es, fy, fc, ec, dMm, tMm, lM, phiBarra, nBarras, p, m, v, yG, lFuego]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: todos tienen que ser positivos y el espesor menor que el radio." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Pilares</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="materiales" numero={1} titulo="Materiales" descripcion="Acero del tubo y hormigón de relleno.">
          <div className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="es" etiqueta="Es" sufijo="MPa" valor={es} onChange={setEs} />
            <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
            <CampoNumerico id="fc" etiqueta="f'c" sufijo="MPa" valor={fc} onChange={setFc} />
            <CampoNumerico id="ec" etiqueta="Ec" sufijo="MPa" valor={ec} onChange={setEc} />
          </div>
        </Etapa>

        <Etapa id="geometria" numero={2} titulo="Geometría" descripcion="Tubo circular, armadura del núcleo y longitud del pilar.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="dMm" etiqueta="D" sufijo="mm" valor={dMm} onChange={setDMm} />
                <CampoNumerico id="tMm" etiqueta="t" sufijo="mm" valor={tMm} onChange={setTMm} />
                <CampoDiametro id="phiBarra" etiqueta="Ø armadura" valor={phiBarra} onChange={setPhiBarra} />
                <CampoNumerico id="nBarras" etiqueta="Nº barras" valor={nBarras} onChange={setNBarras} />
                <CampoNumerico id="yG" etiqueta="yG" sufijo="mm" valor={yG} onChange={setYG} />
                <CampoNumerico id="lM" etiqueta="L" sufijo="m" valor={lM} onChange={setLM} />
              </div>
            }
            dibujo={<CroquisSeccionMixta />}
          />
        </Etapa>

        <Etapa id="solicitaciones" numero={3} titulo="Solicitaciones" descripcion="De servicio: el método es de tensiones admisibles (ASD).">
          <div className="grid max-w-2xl grid-cols-3 gap-4">
            <CampoNumerico id="p" etiqueta="P" sufijo="kN" valor={p} onChange={setP} />
            <CampoNumerico id="m" etiqueta="M" sufijo="kN·m" valor={m} onChange={setM} />
            <CampoNumerico id="v" etiqueta="V" sufijo="kN" valor={v} onChange={setV} />
          </div>
        </Etapa>

        <Etapa id="incendio" numero={4} titulo="Situación de incendio" descripcion="Longitud de pandeo para la carga crítica con módulos reducidos.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="lFuego" etiqueta="Longitud de pandeo" sufijo="m" valor={lFuego} onChange={setLFuego} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Es · Fy", valor: `${es} · ${fy} MPa` },
              { etiqueta: "f'c · Ec", valor: `${fc} · ${ec} MPa` },
              { etiqueta: "Tubo D × t", valor: `${dMm} × ${tMm} mm, L = ${lM} m` },
              { etiqueta: "Armadura", valor: `${nBarras} Ø${phiBarra}` },
              { etiqueta: "P · M · V", valor: `${p} kN · ${m} kN·m · ${v} kN` },
              { etiqueta: "Longitud de pandeo en incendio", valor: `${lFuego} m` },
            ]}
            hipotesis={[
              "Sección circular rellena de hormigón (CFT).",
              "AISC 360 por tensiones admisibles (ASD), como la planilla original para este elemento.",
              "Armadura longitudinal mínima 0,4 % del área bruta.",
              "Incendio: Es,θ = 0,31·Es y Ec,θ = 0,15·Ec, valores fijos de la planilla para ~600 °C. Nfi,cr es una referencia, no una verificación.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={6} titulo="Resultados">
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
                  { etiqueta: "Pn/Ωc", valor: `${fmt(resultado.r.compresion.pAdmKN)} kN`, nota: `compresión ${resultado.r.compresion.clase.toLowerCase()}` },
                  { etiqueta: "Mn/Ωb", valor: `${fmt(resultado.r.flexion.mAdmKNm)} kN·m`, nota: `flexión ${resultado.r.flexion.clase.toLowerCase()}` },
                  { etiqueta: "Vn/Ωv", valor: `${fmt(resultado.r.corte.vAdmKN)} kN` },
                  { etiqueta: "Nfi,cr", valor: `${fmt(resultado.r.fuego.nfiCrKN)} kN`, nota: "referencia en incendio" },
                ]}
              />

              <Subgrupo titulo="Sección">
                <div className="space-y-4">
                  <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
                    <div className="flex justify-center">
                      <DiagramaCFT dMm={resultado.n.dMm} tMm={resultado.n.tMm} numeroBarras={resultado.n.nBarras} diametroBarraMm={resultado.n.phiBarra} />
                    </div>
                    <PanelMetricas
                      metricas={[
                        {
                          etiqueta: "Tubo de acero",
                          valor: `${fmt(resultado.r.propiedades.asM2 * 1e4, 1)} cm²`,
                          nota: `${fmt((resultado.r.propiedades.asM2 / resultado.r.propiedades.agM2) * 100, 1)} % del área bruta`,
                        },
                        {
                          etiqueta: "Núcleo de hormigón",
                          valor: `${fmt(resultado.r.propiedades.acM2 * 1e4, 1)} cm²`,
                          nota: `${fmt((resultado.r.propiedades.acM2 / resultado.r.propiedades.agM2) * 100, 1)} % del área bruta`,
                        },
                        {
                          etiqueta: "Armadura",
                          valor: `${fmt(resultado.r.propiedades.asrM2 * 1e4, 2)} cm²`,
                          nota: `${fmt((resultado.r.propiedades.asrM2 / resultado.r.propiedades.agM2) * 100, 2)} % — mínimo 0,4 %`,
                          destacada: !resultado.r.propiedades.verificaArmaduraMinima,
                        },
                      ]}
                    />
                  </div>
                  <LeyendaTecnica
                    entradas={[
                      { color: "var(--mat-acero)", etiqueta: "Tubo de acero", nota: `Fy ${fmt(resultado.n.fy, 0)} MPa`, rayado: true },
                      { color: "var(--mat-hormigon)", etiqueta: "Hormigón de relleno", nota: `f'c ${fmt(resultado.n.fc, 0)} MPa` },
                      { color: "var(--mat-armadura)", etiqueta: "Armadura longitudinal" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones resistentes">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Carga axial admisible"
                    verifica={resultado.r.compresion.verificaCompresion}
                    comparacion={{
                      real: { etiqueta: "P", valor: resultado.n.p },
                      limite: { etiqueta: "Pn/Ωc", valor: resultado.r.compresion.pAdmKN },
                      unidad: "kN", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Momento admisible"
                    verifica={resultado.r.flexion.verificaFlexion}
                    comparacion={{
                      real: { etiqueta: "M", valor: resultado.n.m },
                      limite: { etiqueta: "Mn/Ωb", valor: resultado.r.flexion.mAdmKNm },
                      unidad: "kN·m", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante admisible"
                    verifica={resultado.r.corte.verificaCorte}
                    comparacion={{
                      real: { etiqueta: "V", valor: resultado.n.v },
                      limite: { etiqueta: "Vn/Ωv", valor: resultado.r.corte.vAdmKN },
                      unidad: "kN", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la compresión"
                    filas={[
                      { etiqueta: "D/t", valor: fmt(resultado.r.compresion.relacionDT, 1) },
                      { etiqueta: "λp / λr", valor: `${fmt(resultado.r.compresion.lambdaP, 0)} / ${fmt(resultado.r.compresion.lambdaR, 0)}` },
                      { etiqueta: "Pno", valor: `${fmt(resultado.r.compresion.pnoKN)} kN` },
                      { etiqueta: "C3", valor: fmt(resultado.r.compresion.c3, 4) },
                      { etiqueta: "EI eff", valor: `${fmt(resultado.r.compresion.eiEffKNm2, 0)} kN·m²` },
                      { etiqueta: "Pe", valor: `${fmt(resultado.r.compresion.peKN)} kN` },
                      { etiqueta: "Pn", valor: `${fmt(resultado.r.compresion.pnKN)} kN` },
                    ]}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la flexión y el corte"
                    filas={[
                      { etiqueta: "Z", valor: `${fmt(resultado.r.flexion.zM3 * 1e6, 0)} cm³` },
                      { etiqueta: "Mp", valor: `${fmt(resultado.r.flexion.mpKNm)} kN·m` },
                      { etiqueta: "Lv", valor: `${fmt(resultado.r.corte.lvM, 2)} m` },
                      { etiqueta: "Fcr", valor: `${fmt(resultado.r.corte.fcrKPa / 1000, 0)} MPa` },
                      { etiqueta: "Vn", valor: `${fmt(resultado.r.corte.vnKN)} kN` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura mínima (0,4% de Ag)"
                    verifica={resultado.r.propiedades.verificaArmaduraMinima}
                    comparacion={{
                      real: { etiqueta: "As,r", valor: resultado.r.propiedades.asrM2 * 10000 },
                      limite: { etiqueta: "mínima", valor: resultado.r.propiedades.asrMinM2 * 10000 },
                      unidad: "cm²", exige: "≥", decimales: 2,
                    }}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Situación de incendio" detalle="referencia, no verificación">
                <div className="space-y-2">
                  <p className="font-mono text-base font-semibold tabular-nums">Nfi,cr = {fmt(resultado.r.fuego.nfiCrKN)} kN</p>
                  <p className="text-xs text-muted-foreground">
                    Carga crítica de pandeo con los módulos reducidos por temperatura
                    (Es,θ = 0,31·Es y Ec,θ = 0,15·Ec, valores fijos de la planilla para ~600 °C).
                    Es un valor de referencia: compararlo con la carga en situación de incendio.
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
