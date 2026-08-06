"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/SelectorSeccionAcero";
import {
  calcularCorteSegunSeccion,
  type ResultadoCorteCualquiera,
} from "@/lib/calc/aisc/seleccion-articulo";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "corte-acero")!;

function filasDe(r: ResultadoCorteCualquiera) {
  if (r.articulo === "G5") {
    return [
      { etiqueta: "Ag", valor: `${fmt(r.areaM2 * 1e4, 2)} cm²` },
      { etiqueta: "D/t", valor: fmt(r.relacionDt, 1) },
      { etiqueta: "Fcr por largo  (G5-2a)", valor: `${fmt(r.fcrPandeoLargo / 1e6, 1)} MPa` },
      { etiqueta: "Fcr por pared  (G5-2b)", valor: `${fmt(r.fcrPandeoLocal / 1e6, 1)} MPa` },
      { etiqueta: "Tope 0,6·Fy", valor: `${fmt(r.topeFluencia / 1e6, 1)} MPa` },
      { etiqueta: "Fcr adoptada", valor: `${fmt(r.fcrPa / 1e6, 1)} MPa — ${r.gobierna}` },
      { etiqueta: "Vn = Fcr·Ag/2  (G5-1)", valor: `${fmt(r.vnKN, 1)} kN` },
      { etiqueta: `Vn/Ωv con Ωv = ${r.omegaV}`, valor: `${fmt(r.admisibleKN, 1)} kN` },
    ];
  }

  if (r.articulo === "G4") {
    return [
      { etiqueta: "Aw = 2·h·t", valor: `${fmt(r.awM2 * 1e4, 2)} cm²` },
      { etiqueta: "Esbeltez del alma h/t", valor: fmt(r.esbeltezAlma, 2) },
      { etiqueta: "kv (fijo en G4)", valor: fmt(r.kv, 2) },
      { etiqueta: "Cv2  (G2-9 a G2-11)", valor: fmt(r.cv2, 3) },
      { etiqueta: "Vn = 0,6·Fy·Aw·Cv2  (G4-1)", valor: `${fmt(r.vnKN, 1)} kN` },
      { etiqueta: `Vn/Ωv con Ωv = ${r.omegaV}`, valor: `${fmt(r.admisibleKN, 1)} kN` },
    ];
  }

  return [
    { etiqueta: "Aw = d·tw", valor: `${fmt(r.awM2 * 1e4, 2)} cm²` },
    { etiqueta: "Esbeltez del alma h/tw", valor: fmt(r.esbeltezAlma, 2) },
    { etiqueta: "kv", valor: fmt(r.kv, 2) },
    { etiqueta: "Cv1", valor: fmt(r.cv1, 3) },
    { etiqueta: "Vn = 0,6·Fy·Aw·Cv1  (G2-1)", valor: `${fmt(r.vnKN, 1)} kN` },
    { etiqueta: `Vn/Ωv con Ωv = ${r.omegaV}`, valor: `${fmt(r.admisibleKN, 1)} kN` },
  ];
}

export default function CorteAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [conRigidizadores, setConRigidizadores] = useCampo("conRigidizadores", "No");
  const [aRigidizadores, setARigidizadores] = useCampo("aRigidizadores", "1.5");
  const [lv, setLv] = useCampo("lv", "2");
  const [fy, setFy] = useCampo("fyCorte", "250");
  const [e, setE] = useCampo("eCorte", "200000");
  const [vRequerido, setVRequerido] = useCampo("vRequerido", "80");

  const resultado = useMemo(() => {
    const n = {
      a: aNumero(aRigidizadores),
      lv: aNumero(lv),
      fy: aNumero(fy),
      e: aNumero(e),
      v: aNumero(vRequerido),
    };
    const usaRigidizadores = conRigidizadores === "Sí";
    if (!seccion.completos || ![n.fy, n.e, n.v].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (usaRigidizadores && (!Number.isFinite(n.a) || n.a <= 0)) return null;
    if (seccion.familia === "tubo-redondo" && (!Number.isFinite(n.lv) || n.lv <= 0)) return null;

    try {
      return calcularCorteSegunSeccion({
        familia: seccion.familia,
        params: seccion.params,
        fyPa: n.fy * 1e6,
        ePa: n.e * 1e6,
        separacionRigidizadoresM: usaRigidizadores ? n.a : undefined,
        lvM: n.lv,
        vRequeridoKN: n.v,
      });
    } catch {
      return null;
    }
  }, [seccion.familia, seccion.params, seccion.completos, conRigidizadores, aRigidizadores, lv, fy, e, vRequerido]);

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
          <strong>G2</strong> en perfiles I y canales, sin acción de campo tensional;{" "}
          <strong>G4</strong> en tubos rectangulares y cajones, donde resisten las dos caras;{" "}
          <strong>G5</strong> en tubos redondos, que trabajan con media sección y necesitan la
          distancia del corte máximo al nulo. Ojo con el coeficiente de seguridad: solo las almas
          robustas de perfiles I laminados (h/tw ≤ 2,24·√(E/Fy)) van con Ωv = 1,50 por el art.
          G1(a). Los canales y los tubos usan siempre 1,67.
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
              {/* Los rigidizadores solo intervienen en G2: G4 fija kv = 5 y G5 no los usa. */}
              {seccion.familia !== "tubo-redondo" && seccion.familia !== "tubo-rectangular" && (
                <>
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
                </>
              )}
              {/* Lv es dato del diagrama de corte, no de la sección: solo lo pide G5. */}
              {seccion.familia === "tubo-redondo" && (
                <CampoNumerico
                  id="lv"
                  etiqueta="Lv (corte máximo a corte nulo)"
                  sufijo="m"
                  valor={lv}
                  onChange={setLv}
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
          {!resultado ? (
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
                    etiqueta={`${resultado.designacion} — corte admisible (art. ${resultado.articulo})`}
                    verifica={resultado.verifica === true}
                    detalle={`${fmt(aNumero(vRequerido), 1)} kN / ${fmt(resultado.admisibleKN, 1)} kN · aprovechamiento ${fmt(
                      (resultado.aprovechamiento ?? 0) * 100,
                      1
                    )} %`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    {resultado.articulo === "G2" && (
                      <>
                        <p className="font-medium">
                          {resultado.almaRobusta
                            ? "Alma robusta: entra por la excepción del art. G2.1(a)"
                            : "Fuera de la excepción del art. G2.1(a)"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Ωv = {fmt(resultado.omegaV, 2)} · h/tw = {fmt(resultado.esbeltezAlma, 1)} ·
                          Cv1 = {fmt(resultado.cv1, 3)}
                        </p>
                      </>
                    )}
                    {resultado.articulo === "G4" && (
                      <>
                        <p className="font-medium">Dos almas resisten el corte</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Ωv = {fmt(resultado.omegaV, 2)} · h/t = {fmt(resultado.esbeltezAlma, 1)} ·
                          Cv2 = {fmt(resultado.cv2, 3)}
                        </p>
                      </>
                    )}
                    {resultado.articulo === "G5" && (
                      <>
                        <p className="font-medium">Gobierna por {resultado.gobierna}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Ωv = {fmt(resultado.omegaV, 2)} · D/t = {fmt(resultado.relacionDt, 1)} ·
                          Fcr = {fmt(resultado.fcrPa / 1e6, 1)} MPa
                        </p>
                      </>
                    )}
                  </div>
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
