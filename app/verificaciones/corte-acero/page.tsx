"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { AvisoFueraDeAlcance } from "@/components/verificaciones/AvisoFueraDeAlcance";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/SelectorSeccionAcero";
import { calcularCorte } from "@/lib/calc/aisc/corte";
import { SeccionFueraDeAlcance } from "@/lib/calc/aisc/flexion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "corte-acero")!;

export default function CorteAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [conRigidizadores, setConRigidizadores] = useCampo("conRigidizadores", "No");
  const [aRigidizadores, setARigidizadores] = useCampo("aRigidizadores", "1.5");
  const [fy, setFy] = useCampo("fyCorte", "250");
  const [e, setE] = useCampo("eCorte", "200000");
  const [vRequerido, setVRequerido] = useCampo("vRequerido", "80");

  const { resultado, fueraDeAlcance } = useMemo(() => {
    const n = { a: aNumero(aRigidizadores), fy: aNumero(fy), e: aNumero(e), v: aNumero(vRequerido) };
    const usaRigidizadores = conRigidizadores === "Sí";
    if (!seccion.completos || ![n.fy, n.e, n.v].every((x) => Number.isFinite(x) && x > 0)) {
      return { resultado: null, fueraDeAlcance: null };
    }
    if (usaRigidizadores && (!Number.isFinite(n.a) || n.a <= 0)) {
      return { resultado: null, fueraDeAlcance: null };
    }

    try {
      return {
        resultado: calcularCorte({
          familia: seccion.familia,
          params: seccion.params,
          fyPa: n.fy * 1e6,
          ePa: n.e * 1e6,
          separacionRigidizadoresM: usaRigidizadores ? n.a : undefined,
          vRequeridoKN: n.v,
        }),
        fueraDeAlcance: null,
      };
    } catch (error) {
      if (error instanceof SeccionFueraDeAlcance) return { resultado: null, fueraDeAlcance: error };
      return { resultado: null, fueraDeAlcance: null };
    }
  }, [seccion.familia, seccion.params, seccion.completos, conRigidizadores, aRigidizadores, fy, e, vRequerido]);

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
          Artículo G2, sin acción de campo tensional. Ojo con el coeficiente de seguridad: las
          almas robustas de perfiles I laminados (h/tw ≤ 2,24·√(E/Fy)) van con Ωv = 1,50 por el
          art. G1(a), no con el 1,67 general. Los canales quedan siempre fuera de esa excepción.
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
              <CardTitle className="text-base">Alma y material</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion
                id="conRigidizadores"
                etiqueta="Rigidizadores transversales"
                valor={conRigidizadores}
                opciones={["No", "Sí"]}
                onChange={setConRigidizadores}
              />
              {conRigidizadores === "Sí" && (
                <CampoNumerico
                  id="aRigidizadores"
                  etiqueta="Separación a"
                  sufijo="m"
                  valor={aRigidizadores}
                  onChange={setARigidizadores}
                />
              )}
              <CampoNumerico id="fyCorte" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="eCorte" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solicitación</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="vRequerido"
                etiqueta="Corte requerido"
                sufijo="kN"
                valor={vRequerido}
                onChange={setVRequerido}
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
                Completá la sección, el material y el corte con valores positivos.
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
                    etiqueta={`${resultado.designacion} — corte admisible`}
                    verifica={resultado.verifica === true}
                    detalle={`${fmt(aNumero(vRequerido), 1)} kN / ${fmt(resultado.admisibleKN, 1)} kN · aprovechamiento ${fmt(
                      (resultado.aprovechamiento ?? 0) * 100,
                      1
                    )} %`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {resultado.almaRobusta
                        ? "Alma robusta: entra por la excepción del art. G2.1(a)"
                        : "Fuera de la excepción del art. G2.1(a)"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Ωv = {fmt(resultado.omegaV, 2)} · h/tw = {fmt(resultado.esbeltezAlma, 1)} ·
                      Cv1 = {fmt(resultado.cv1, 3)}
                    </p>
                  </div>
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
                      { etiqueta: "Aw = d·tw", valor: `${fmt(resultado.awM2 * 1e4, 2)} cm²` },
                      { etiqueta: "Esbeltez del alma h/tw", valor: fmt(resultado.esbeltezAlma, 2) },
                      { etiqueta: "kv", valor: fmt(resultado.kv, 2) },
                      { etiqueta: "Cv1", valor: fmt(resultado.cv1, 3) },
                      { etiqueta: "Vn = 0,6·Fy·Aw·Cv1  (G2-1)", valor: `${fmt(resultado.vnKN, 1)} kN` },
                      { etiqueta: `Vn/Ωv con Ωv = ${resultado.omegaV}`, valor: `${fmt(resultado.admisibleKN, 1)} kN` },
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
