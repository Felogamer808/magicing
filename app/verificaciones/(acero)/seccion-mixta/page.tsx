"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Badge } from "@/components/ui/badge";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { EncabezadoEtapa, IndiceEtapas } from "@/components/verificaciones/comun/HojaTecnica";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Pilares</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={[{ id: "datos", titulo: "Datos" }, { id: "resultados", titulo: "Resultados" }]} />


      <div className="border-t border-border/60 pt-5">
        <div className="py-4 text-sm text-muted-foreground">
          Válido para secciones circulares rellenas de hormigón. A diferencia del resto de la
          herramienta, este cálculo sigue AISC 360 por el método de tensiones admisibles (ASD),
          que es lo que usa la planilla original para este elemento.
        </div>
      </div>

      <div className="flex flex-col gap-12">
          <EncabezadoEtapa id="datos" numero={1} titulo="Datos" descripcion="Lo que define el elemento y sus acciones." />
        <div className="space-y-6">
          <div className="border-t border-border/60 pt-5">
            <div className="mb-3"><h3 className="text-sm font-medium">Materiales</h3></div>
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="es" etiqueta="Es" sufijo="MPa" valor={es} onChange={setEs} />
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="fc" etiqueta="f'c" sufijo="MPa" valor={fc} onChange={setFc} />
              <CampoNumerico id="ec" etiqueta="Ec" sufijo="MPa" valor={ec} onChange={setEc} />
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="mb-3"><h3 className="text-sm font-medium">Geometría</h3></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisSeccionMixta />
              </div>
              <CampoNumerico id="dMm" etiqueta="D" sufijo="mm" valor={dMm} onChange={setDMm} />
              <CampoNumerico id="tMm" etiqueta="t" sufijo="mm" valor={tMm} onChange={setTMm} />
              <CampoNumerico id="lM" etiqueta="L" sufijo="m" valor={lM} onChange={setLM} />
              <CampoDiametro id="phiBarra" etiqueta="Ø armadura" valor={phiBarra} onChange={setPhiBarra} />
              <CampoNumerico id="nBarras" etiqueta="Nº barras" valor={nBarras} onChange={setNBarras} />
              <CampoNumerico id="yG" etiqueta="yG" sufijo="mm" valor={yG} onChange={setYG} />
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="mb-3"><h3 className="text-sm font-medium">Solicitaciones de servicio</h3></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="p" etiqueta="P" sufijo="kN" valor={p} onChange={setP} />
              <CampoNumerico id="m" etiqueta="M" sufijo="kN·m" valor={m} onChange={setM} />
              <CampoNumerico id="v" etiqueta="V" sufijo="kN" valor={v} onChange={setV} />
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="mb-3"><h3 className="text-sm font-medium">Situación de incendio</h3></div>
            <div>
              <CampoNumerico id="lFuego" etiqueta="Longitud de pandeo" sufijo="m" valor={lFuego} onChange={setLFuego} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <EncabezadoEtapa id="resultados" numero={2} titulo="Resultados" />
          <ConclusionAutomatica />
          {!resultado ? (
            <div className="border-t border-border/60 pt-5">
              <div className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (el espesor debe ser menor que el radio).
              </div>
            </div>
          ) : (
            <>
              <div className="border-t border-border/60 pt-5">
                <div className="mb-3"><h3 className="text-sm font-medium">Sección</h3></div>
                <div className="space-y-4 py-2">
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
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-mono">Compresión: {resultado.r.compresion.clase}</Badge>
                    <Badge variant="secondary" className="font-mono">Flexión: {resultado.r.flexion.clase}</Badge>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <div className="mb-3"><h3 className="text-sm font-medium">Compresión</h3></div>
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
                    etiqueta="Armadura mínima (0,4% de Ag)"
                    verifica={resultado.r.propiedades.verificaArmaduraMinima}
                    comparacion={{
                  real: { etiqueta: "As,r", valor: resultado.r.propiedades.asrM2 * 10000 },
                  limite: { etiqueta: "mínima", valor: resultado.r.propiedades.asrMinM2 * 10000 },
                  unidad: "cm²", exige: "≥", decimales: 2,
                }}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
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
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <div className="mb-3"><h3 className="text-sm font-medium">Flexión y corte</h3></div>
                <div className="space-y-3">
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
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Z", valor: `${fmt(resultado.r.flexion.zM3 * 1e6, 0)} cm³` },
                      { etiqueta: "Mp", valor: `${fmt(resultado.r.flexion.mpKNm)} kN·m` },
                      { etiqueta: "Lv", valor: `${fmt(resultado.r.corte.lvM, 2)} m` },
                      { etiqueta: "Fcr", valor: `${fmt(resultado.r.corte.fcrKPa / 1000, 0)} MPa` },
                      { etiqueta: "Vn", valor: `${fmt(resultado.r.corte.vnKN)} kN` },
                    ]}
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <div className="mb-3"><h3 className="text-sm font-medium">Situación de incendio</h3></div>
                <div className="space-y-2">
                  <p className="font-mono text-sm">Nfi,cr = {fmt(resultado.r.fuego.nfiCrKN)} kN</p>
                  <p className="text-xs text-muted-foreground">
                    Carga crítica de pandeo con los módulos reducidos por temperatura
                    (Es,θ = 0,31·Es y Ec,θ = 0,15·Ec, valores fijos de la planilla para ~600 °C).
                    Es un valor de referencia: compararlo con la carga en situación de incendio.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
