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
import { calcularFlexion, OMEGA_B, SeccionFueraDeAlcance } from "@/lib/calc/aisc/flexion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "flexion-acero")!;

export default function FlexionAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [lb, setLb] = useCampo("lb", "3");
  const [cb, setCb] = useCampo("cb", "1");
  const [fy, setFy] = useCampo("fyFlexion", "250");
  const [e, setE] = useCampo("eFlexion", "200000");
  const [mRequerido, setMRequerido] = useCampo("mRequerido", "40");

  const { resultado, fueraDeAlcance } = useMemo(() => {
    const n = { lb: aNumero(lb), cb: aNumero(cb), fy: aNumero(fy), e: aNumero(e), m: aNumero(mRequerido) };
    if (!seccion.completos || !Object.values(n).every((x) => Number.isFinite(x) && x > 0)) {
      return { resultado: null, fueraDeAlcance: null };
    }

    try {
      return {
        resultado: calcularFlexion({
          familia: seccion.familia,
          params: seccion.params,
          lbM: n.lb,
          cb: n.cb,
          fyPa: n.fy * 1e6,
          ePa: n.e * 1e6,
          mRequeridoKNm: n.m,
        }),
        fueraDeAlcance: null,
      };
    } catch (error) {
      if (error instanceof SeccionFueraDeAlcance) return { resultado: null, fueraDeAlcance: error };
      return { resultado: null, fueraDeAlcance: null };
    }
  }, [seccion.familia, seccion.params, seccion.completos, lb, cb, fy, e, mRequerido]);

  const noCompacta = resultado && (!resultado.compacta.ala || !resultado.compacta.alma);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Vigas · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Artículo F2: flexión respecto del eje fuerte en perfiles I y canales compactos, por el
          método ASD (Ωb = 1,67). Manda el menor entre plastificación (Mp = Fy·Zx) y pandeo
          lateral-torsional, según cuánto valga Lb frente a Lp y Lr. Las secciones cerradas van
          por otros artículos.
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
              <CardTitle className="text-base">Arriostramiento y material</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="lb" etiqueta="Lb sin arriostrar" sufijo="m" valor={lb} onChange={setLb} />
              <CampoNumerico id="cb" etiqueta="Cb" valor={cb} onChange={setCb} />
              <CampoNumerico id="fyFlexion" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eFlexion" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solicitación</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="mRequerido"
                etiqueta="Momento requerido"
                sufijo="kN·m"
                valor={mRequerido}
                onChange={setMRequerido}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {fueraDeAlcance ? (
            <AvisoFueraDeAlcance error={fueraDeAlcance} />
          ) : !resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá la sección, Lb, Cb, el material y el momento con valores positivos.
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
                    etiqueta={`${resultado.designacion} — momento admisible`}
                    verifica={resultado.verifica === true}
                    detalle={`${fmt(aNumero(mRequerido), 1)} kN·m / ${fmt(resultado.admisibleKNm, 1)} kN·m · aprovechamiento ${fmt(
                      (resultado.aprovechamiento ?? 0) * 100,
                      1
                    )} %`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Zona: {resultado.zona}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Lp = {fmt(resultado.lpM, 2)} m · Lb = {fmt(aNumero(lb), 2)} m · Lr ={" "}
                      {fmt(resultado.lrM, 2)} m
                    </p>
                  </div>
                  {noCompacta && (
                    <p className="text-xs text-destructive">
                      La sección no es compacta con este Fy: el artículo F2 no la cubre y el
                      resultado no es válido. Correspondería F3 (ala no compacta) o F5 (alma
                      esbelta), todavía no implementados.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle</CardTitle>
                </CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Mp = Fy·Zx  (F2-1)", valor: `${fmt(resultado.mpKNm, 1)} kN·m` },
                      { etiqueta: "Lp = 1,76·ry·√(E/Fy)  (F2-5)", valor: `${fmt(resultado.lpM, 3)} m` },
                      { etiqueta: "Lr  (F2-6)", valor: `${fmt(resultado.lrM, 3)} m` },
                      { etiqueta: "rts  (F2-7)", valor: `${fmt(resultado.rtsM * 100, 2)} cm` },
                      { etiqueta: "c  (F2-8)", valor: fmt(resultado.c, 3) },
                      { etiqueta: "ho (entre baricentros de alas)", valor: `${fmt(resultado.hoM * 100, 2)} cm` },
                      {
                        etiqueta: "Fcr  (F2-4)",
                        valor:
                          resultado.fcrPa === null
                            ? "no aplica en esta zona"
                            : `${fmt(resultado.fcrPa / 1e6, 1)} MPa`,
                      },
                      { etiqueta: "Mn", valor: `${fmt(resultado.mnKNm, 1)} kN·m` },
                      { etiqueta: `Mn/Ωb con Ωb = ${OMEGA_B}`, valor: `${fmt(resultado.admisibleKNm, 1)} kN·m` },
                      {
                        etiqueta: "Esbeltez del ala",
                        valor: `${fmt(resultado.compacta.esbeltezAla, 2)} — ${resultado.compacta.ala ? "compacta" : "no compacta"}`,
                      },
                      {
                        etiqueta: "Esbeltez del alma h/tw",
                        valor: `${fmt(resultado.compacta.esbeltezAlma, 2)} — ${resultado.compacta.alma ? "compacta" : "no compacta"}`,
                      },
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
