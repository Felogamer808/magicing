"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { calcularFlexion, OMEGA_B } from "@/lib/calc/aisc/flexion";
import { alturasDisponibles, type Familia } from "@/lib/calc/aisc/perfiles";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "flexion-acero")!;

/** F2 solo cubre secciones doblemente simétricas: el PNC simple queda afuera. */
const FAMILIAS_F2: Familia[] = ["PNI", "HEB", "2PNC"];

export default function FlexionAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");

  const [familia, setFamilia] = useCampo<Familia>("familiaFlexion", "PNI");
  const [altura, setAltura] = useCampo("alturaFlexion", "200");
  const [separacion, setSeparacion] = useCampo("separacionFlexion", "0");

  const [lb, setLb] = useCampo("lb", "3");
  const [cb, setCb] = useCampo("cb", "1");
  const [fy, setFy] = useCampo("fyFlexion", "250");
  const [e, setE] = useCampo("eFlexion", "200000");
  const [mRequerido, setMRequerido] = useCampo("mRequerido", "40");

  const alturas = useMemo(() => alturasDisponibles(familia).map(String), [familia]);

  const resultado = useMemo(() => {
    const n = {
      altura: aNumero(altura),
      separacion: aNumero(separacion),
      lb: aNumero(lb),
      cb: aNumero(cb),
      fy: aNumero(fy),
      e: aNumero(e),
      m: aNumero(mRequerido),
    };
    if (!FAMILIAS_F2.includes(familia)) return null;
    if (!alturas.includes(String(n.altura))) return null;
    if (![n.lb, n.cb, n.fy, n.e, n.m].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (!Number.isFinite(n.separacion) || n.separacion < 0) return null;

    return calcularFlexion({
      familia,
      altura: n.altura,
      separacionM: n.separacion,
      lbM: n.lb,
      cb: n.cb,
      fyPa: n.fy * 1e6,
      ePa: n.e * 1e6,
      mRequeridoKNm: n.m,
    });
  }, [familia, altura, separacion, lb, cb, fy, e, mRequerido, alturas]);

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
          Artículo F2: flexión respecto del eje fuerte en perfiles compactos y doblemente
          simétricos, por el método ASD (Ωb = 1,67). Manda el menor entre plastificación
          (Mp = Fy·Zx) y pandeo lateral-torsional, según cuánto valga Lb frente a Lp y Lr.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion
                id="familiaFlexion"
                etiqueta="Familia"
                valor={familia}
                opciones={FAMILIAS_F2}
                onChange={(v) => {
                  setFamilia(v as Familia);
                  const disponibles = alturasDisponibles(v as Familia);
                  if (!disponibles.includes(aNumero(altura))) setAltura(String(disponibles[0]));
                }}
              />
              <CampoSeleccion
                id="alturaFlexion"
                etiqueta="Altura"
                valor={altura}
                opciones={alturas}
                onChange={setAltura}
              />
              {familia === "2PNC" && (
                <div className="col-span-full">
                  <CampoNumerico
                    id="separacionFlexion"
                    etiqueta="Separación entre dorsos de alma"
                    sufijo="m"
                    valor={separacion}
                    onChange={setSeparacion}
                  />
                </div>
              )}
            </CardContent>
          </Card>

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
                Elegí un perfil del catálogo y completá Lb, Cb, material y momento con valores
                positivos.
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
                        etiqueta: "Esbeltez del ala b/2tf",
                        valor: `${fmt(resultado.compacta.esbeltezAla, 2)} — ${resultado.compacta.ala ? "compacta" : "no compacta"}`,
                      },
                      {
                        etiqueta: "Esbeltez del alma d/tw",
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
