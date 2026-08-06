"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { AvisoFueraDeAlcance } from "@/components/verificaciones/AvisoFueraDeAlcance";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/SelectorSeccionAcero";
import { calcularFlexoCompresion } from "@/lib/calc/aisc/flexo-compresion";
import { SeccionFueraDeAlcance } from "@/lib/calc/aisc/flexion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "flexo-compresion")!;

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

  const { resultado, fueraDeAlcance } = useMemo(() => {
    const n = {
      lcx: aNumero(lcx), lcy: aNumero(lcy), lb: aNumero(lb), cb: aNumero(cb),
      fy: aNumero(fy), e: aNumero(e), p: aNumero(pRequerida),
      mrx: aNumero(mrx), mry: aNumero(mry),
    };
    const positivos = [n.lcx, n.lcy, n.lb, n.cb, n.fy, n.e, n.p];
    if (!seccion.completos || !positivos.every((x) => Number.isFinite(x) && x > 0)) {
      return { resultado: null, fueraDeAlcance: null };
    }
    if (![n.mrx, n.mry].every((x) => Number.isFinite(x) && x >= 0)) {
      return { resultado: null, fueraDeAlcance: null };
    }

    try {
      return {
        resultado: calcularFlexoCompresion({
          familia: seccion.familia,
          params: seccion.params,
          lcxM: n.lcx,
          lcyM: n.lcy,
          lbM: n.lb,
          cb: n.cb,
          fyPa: n.fy * 1e6,
          ePa: n.e * 1e6,
          pRequeridaKN: n.p,
          mrxKNm: n.mrx,
          mryKNm: n.mry,
        }),
        fueraDeAlcance: null,
      };
    } catch (error) {
      if (error instanceof SeccionFueraDeAlcance) return { resultado: null, fueraDeAlcance: error };
      return { resultado: null, fueraDeAlcance: null };
    }
  }, [seccion.familia, seccion.params, seccion.completos, lcx, lcy, lb, cb, fy, e, pRequerida, mrx, mry]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Barras · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Artículo H1.1. No agrega resistencias nuevas: combina la axial admisible del capítulo E
          con las dos flexionales del capítulo F. La ecuación cambia de forma según cuánto pese la
          axial — con Pr/Pc ≥ 0,2 manda H1-1a, por debajo H1-1b.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Longitudes y material</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="lcxFC" etiqueta="Lc eje fuerte" sufijo="m" valor={lcx} onChange={setLcx} />
              <CampoNumerico id="lcyFC" etiqueta="Lc eje débil" sufijo="m" valor={lcy} onChange={setLcy} />
              <CampoNumerico id="lbFC" etiqueta="Lb sin arriostrar" sufijo="m" valor={lb} onChange={setLb} />
              <CampoNumerico id="cbFC" etiqueta="Cb" valor={cb} onChange={setCb} />
              <CampoNumerico id="fyFC" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eFC" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solicitaciones</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="pFC" etiqueta="Compresión Pr" sufijo="kN" valor={pRequerida} onChange={setPRequerida} />
              <div />
              <CampoNumerico id="mrx" etiqueta="Momento Mrx" sufijo="kN·m" valor={mrx} onChange={setMrx} />
              <CampoNumerico id="mry" etiqueta="Momento Mry" sufijo="kN·m" valor={mry} onChange={setMry} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {fueraDeAlcance ? (
            <AvisoFueraDeAlcance error={fueraDeAlcance} />
          ) : !resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá la sección, las longitudes y el material con valores positivos. Los
                momentos pueden ser cero.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resultado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`${resultado.designacion} — interacción ${resultado.ecuacion}`}
                    verifica={resultado.verifica}
                    detalle={`${fmt(resultado.interaccion, 3)} ≤ 1,000 · Pr/Pc = ${fmt(resultado.relacionAxial, 3)}`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Aporte de cada término</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Axial {fmt(resultado.terminos.axial, 3)} · Flexión x{" "}
                      {fmt(resultado.terminos.flexionX, 3)} · Flexión y{" "}
                      {fmt(resultado.terminos.flexionY, 3)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resistencias que entran</CardTitle>
                </CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Pc = Pn/Ωc  (cap. E)", valor: `${fmt(resultado.pcKN, 1)} kN` },
                      { etiqueta: "Gobierna el pandeo por el eje", valor: resultado.gobiernaCompresion },
                      { etiqueta: "Mcx = Mnx/Ωb  (art. F2)", valor: `${fmt(resultado.mcxKNm, 1)} kN·m` },
                      { etiqueta: "Zona de pandeo lateral-torsional", valor: resultado.zonaFlexion },
                      { etiqueta: "Mcy = Mny/Ωb  (art. F6)", valor: `${fmt(resultado.mcyKNm, 1)} kN·m` },
                      { etiqueta: "Pr/Pc", valor: fmt(resultado.relacionAxial, 4) },
                      { etiqueta: "Ecuación aplicada", valor: resultado.ecuacion },
                      { etiqueta: "Interacción", valor: fmt(resultado.interaccion, 4) },
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
