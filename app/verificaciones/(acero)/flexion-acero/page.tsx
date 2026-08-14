"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { CurvaFlexion } from "@/components/verificaciones/acero/CurvaFlexion";
import { OMEGA_B } from "@/lib/calc/aisc/flexion";
import {
  calcularFlexionSegunSeccion,
  type ResultadoFlexionCualquiera,
} from "@/lib/calc/aisc/seleccion-articulo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "flexion-acero")!;

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

  const resultado = useMemo(() => {
    const n = { lb: aNumero(lb), cb: aNumero(cb), fy: aNumero(fy), e: aNumero(e), m: aNumero(mRequerido) };
    if (!seccion.completos || !Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

    try {
      return calcularFlexionSegunSeccion({
        familia: seccion.familia,
        params: seccion.params,
        lbM: n.lb,
        cb: n.cb,
        fyPa: n.fy * 1e6,
        ePa: n.e * 1e6,
        mRequeridoKNm: n.m,
      });
    } catch {
      return null;
    }
  }, [seccion.familia, seccion.params, seccion.completos, lb, cb, fy, e, mRequerido]);

  const noCompacta =
    resultado?.articulo === "F2" && (!resultado.compacta.ala || !resultado.compacta.alma);
  const advertencia = resultado && "advertencia" in resultado ? resultado.advertencia : undefined;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
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
          El artículo lo elige la forma de la sección, y siempre por el método ASD (Ωb = 1,67):
          <strong> F2</strong> en perfiles I y canales, donde manda el menor entre plastificación y
          pandeo lateral-torsional; <strong>F7</strong> en tubos rectangulares y cajones, con los
          cuatro estados límite; <strong>F8</strong> en tubos redondos, donde no hay pandeo
          lateral y decide la esbeltez de la pared.
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
          {!resultado ? (
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
                    etiqueta={`${resultado.designacion} — momento admisible (art. ${resultado.articulo})`}
                    verifica={resultado.verifica === true}
                    detalle={`${fmt(aNumero(mRequerido), 1)} kN·m / ${fmt(resultado.admisibleKNm, 1)} kN·m · aprovechamiento ${fmt(
                      (resultado.aprovechamiento ?? 0) * 100,
                      1
                    )} %`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    {resultado.articulo === "F2" && (
                      <>
                        <p className="font-medium">Zona: {resultado.zona}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Lp = {fmt(resultado.lpM, 2)} m · Lb = {fmt(aNumero(lb), 2)} m · Lr ={" "}
                          {fmt(resultado.lrM, 2)} m
                        </p>
                      </>
                    )}
                    {resultado.articulo === "F7" && (
                      <>
                        <p className="font-medium">Gobierna: {resultado.gobierna}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Lp = {fmt(resultado.lpM, 2)} m · Lb = {fmt(aNumero(lb), 2)} m · Lr ={" "}
                          {fmt(resultado.lrM, 2)} m
                        </p>
                      </>
                    )}
                    {resultado.articulo === "F8" && (
                      <>
                        <p className="font-medium">Pared {resultado.clase}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          D/t = {fmt(resultado.relacionDt, 1)} · compacta hasta{" "}
                          {fmt(resultado.limiteCompacta, 1)} · no compacta hasta{" "}
                          {fmt(resultado.limiteNoCompacta, 1)}
                        </p>
                      </>
                    )}
                  </div>
                  {advertencia && <p className="text-xs text-destructive">{advertencia}</p>}
                  {/*
                    F8 no depende de Lb —el tubo redondo no pandea lateralmente—, así
                    que la curva no tendría nada que mostrar y se omite.
                  */}
                  {resultado.articulo !== "F8" && (
                    <>
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
                  <PanelFormulas titulo="Ver cálculo" filas={filasDe(resultado)} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
