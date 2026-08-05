"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorNorma } from "@/components/verificaciones/SelectorNorma";
import { calcularSeccionMixta } from "@/lib/calc/aisc/seccion-mixta";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "secciones-mixtas")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

function DiagramaCFT({ dMm, tMm, numeroBarras, diametroBarraMm }: { dMm: number; tMm: number; numeroBarras: number; diametroBarraMm: number }) {
  const R = 70;
  const cx = 86;
  const cy = 86;
  const rInt = R * (1 - (2 * tMm) / dMm);
  const rBarras = rInt * 0.72;
  const rBarra = Math.max(2.5, Math.min(6, (diametroBarraMm / dMm) * R * 1.6));
  const n = Math.max(1, Math.min(numeroBarras, 24));

  return (
    <svg viewBox="0 0 172 172" className="h-auto w-full max-w-[190px] text-primary" fill="none" aria-hidden="true">
      <circle cx={cx} cy={cy} r={R} stroke="currentColor" strokeWidth="2.5" fill="var(--color-muted)" fillOpacity="0.3" />
      <circle cx={cx} cy={cy} r={rInt} stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      {Array.from({ length: n }).map((_, i) => {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        return <circle key={i} cx={cx + rBarras * Math.cos(a)} cy={cy + rBarras * Math.sin(a)} r={rBarra} fill="currentColor" />;
      })}
      <text x={cx} y={cy + 3} textAnchor="middle" className="fill-current font-mono" fontSize="8" opacity="0.75">
        D {fmt(dMm, 0)}
      </text>
    </svg>
  );
}

export default function SeccionMixtaPage() {
  const [norma, setNorma] = useState("AISC 360");

  const [es, setEs] = useState("200000");
  const [fy, setFy] = useState("250");
  const [fc, setFc] = useState("30");
  const [ec, setEc] = useState("28000");

  const [dMm, setDMm] = useState("300");
  const [tMm, setTMm] = useState("9.5");
  const [lM, setLM] = useState("3");
  const [phiBarra, setPhiBarra] = useState("12");
  const [nBarras, setNBarras] = useState("5");

  const [p, setP] = useState("800");
  const [m, setM] = useState("100");
  const [v, setV] = useState("100");
  const [yG, setYG] = useState("92.5");
  const [lFuego, setLFuego] = useState("3");

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Pilares</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <SelectorNorma normas={meta.normasDisponibles} valor={norma} onChange={setNorma} />
      </div>

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Válido para secciones circulares rellenas de hormigón. A diferencia del resto de la
          herramienta, este cálculo sigue AISC 360 por el método de tensiones admisibles (ASD),
          que es lo que usa la planilla original para este elemento.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="es" etiqueta="Es" sufijo="MPa" valor={es} onChange={setEs} />
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="fc" etiqueta="f'c" sufijo="MPa" valor={fc} onChange={setFc} />
              <CampoNumerico id="ec" etiqueta="Ec" sufijo="MPa" valor={ec} onChange={setEc} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="dMm" etiqueta="D" sufijo="mm" valor={dMm} onChange={setDMm} />
              <CampoNumerico id="tMm" etiqueta="t" sufijo="mm" valor={tMm} onChange={setTMm} />
              <CampoNumerico id="lM" etiqueta="L" sufijo="m" valor={lM} onChange={setLM} />
              <CampoNumerico id="phiBarra" etiqueta="φ armadura" sufijo="mm" valor={phiBarra} onChange={setPhiBarra} />
              <CampoNumerico id="nBarras" etiqueta="Nº barras" valor={nBarras} onChange={setNBarras} />
              <CampoNumerico id="yG" etiqueta="yG" sufijo="mm" valor={yG} onChange={setYG} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solicitaciones de servicio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="p" etiqueta="P" sufijo="kN" valor={p} onChange={setP} />
              <CampoNumerico id="m" etiqueta="M" sufijo="kN·m" valor={m} onChange={setM} />
              <CampoNumerico id="v" etiqueta="V" sufijo="kN" valor={v} onChange={setV} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Situación de incendio</CardTitle></CardHeader>
            <CardContent>
              <CampoNumerico id="lFuego" etiqueta="Longitud de pandeo" sufijo="m" valor={lFuego} onChange={setLFuego} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (el espesor debe ser menor que el radio).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="drafting-marks">
                <CardHeader><CardTitle className="text-base">Sección</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-3 py-2">
                  <DiagramaCFT dMm={resultado.n.dMm} tMm={resultado.n.tMm} numeroBarras={resultado.n.nBarras} diametroBarraMm={resultado.n.phiBarra} />
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="font-mono">Compresión: {resultado.r.compresion.clase}</Badge>
                    <Badge variant="secondary" className="font-mono">Flexión: {resultado.r.flexion.clase}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Compresión</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Carga axial admisible"
                    verifica={resultado.r.compresion.verificaCompresion}
                    detalle={`P ${fmt(resultado.n.p)} kN / Pn/Ωc ${fmt(resultado.r.compresion.pAdmKN)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura mínima (0,4% de Ag)"
                    verifica={resultado.r.propiedades.verificaArmaduraMinima}
                    detalle={`As,r ${fmt(resultado.r.propiedades.asrM2 * 10000, 2)} cm² / mín ${fmt(resultado.r.propiedades.asrMinM2 * 10000, 2)} cm²`}
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Flexión y corte</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Momento admisible"
                    verifica={resultado.r.flexion.verificaFlexion}
                    detalle={`M ${fmt(resultado.n.m)} kN·m / Mn/Ωb ${fmt(resultado.r.flexion.mAdmKNm)} kN·m`}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante admisible"
                    verifica={resultado.r.corte.verificaCorte}
                    detalle={`V ${fmt(resultado.n.v)} kN / Vn/Ωv ${fmt(resultado.r.corte.vAdmKN)} kN`}
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Situación de incendio</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-mono text-sm">Nfi,cr = {fmt(resultado.r.fuego.nfiCrKN)} kN</p>
                  <p className="text-xs text-muted-foreground">
                    Carga crítica de pandeo con los módulos reducidos por temperatura
                    (Es,θ = 0,31·Es y Ec,θ = 0,15·Ec, valores fijos de la planilla para ~600 °C).
                    Es un valor de referencia: compararlo con la carga en situación de incendio.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
