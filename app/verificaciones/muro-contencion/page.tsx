"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { DiagramaEmpujesMuro } from "@/components/verificaciones/hormigon/DiagramaEmpujesMuro";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { DiagramaMuro } from "@/components/verificaciones/DiagramaMuro";
import {
  CroquisApoyosMuro,
  CroquisGeometriaMuro,
  CroquisSueloMuro,
} from "@/components/verificaciones/croquis/CroquisMuro";
import { calcularMuroContencion } from "@/lib/calc/ec2/muro-contencion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "muros-contencion")!;

export default function MuroContencionPage() {
  const [norma, setNorma] = useCampo("norma", "EC7");

  const [gamma, setGamma] = useCampo("gamma", "18");
  const [phi, setPhi] = useCampo("phi", "34");
  const [c, setC] = useCampo("c", "5");
  const [sigmaAdm, setSigmaAdm] = useCampo("sigmaAdm", "100");

  const [anchoZap, setAnchoZap] = useCampo("anchoZap", "0.5");
  const [cantoZap, setCantoZap] = useCampo("cantoZap", "0.3");
  const [altMuro, setAltMuro] = useCampo("altMuro", "3.2");
  const [espMuro, setEspMuro] = useCampo("espMuro", "0.15");
  const [hAct, setHAct] = useCampo("hAct", "3.2");
  const [hPas, setHPas] = useCampo("hPas", "0");
  const [sobrecarga, setSobrecarga] = useCampo("sobrecarga", "5");

  const [l1Caso2, setL1Caso2] = useCampo("l1Caso2", "2");
  const [l1Caso3, setL1Caso3] = useCampo("l1Caso3", "0.95");
  const [l2Caso3, setL2Caso3] = useCampo("l2Caso3", "2.45");

  const resultado = useMemo(() => {
    const n = {
      gamma: aNumero(gamma), phi: aNumero(phi), c: aNumero(c), sigmaAdm: aNumero(sigmaAdm),
      anchoZap: aNumero(anchoZap), cantoZap: aNumero(cantoZap), altMuro: aNumero(altMuro),
      espMuro: aNumero(espMuro), hAct: aNumero(hAct), hPas: aNumero(hPas), sobrecarga: aNumero(sobrecarga),
      l1Caso2: aNumero(l1Caso2), l1Caso3: aNumero(l1Caso3), l2Caso3: aNumero(l2Caso3),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.gamma <= 0 || n.phi <= 0 || n.phi >= 90 || n.sigmaAdm <= 0) return null;
    if (n.anchoZap <= 0 || n.cantoZap <= 0 || n.altMuro <= 0 || n.espMuro <= 0 || n.hAct <= 0) return null;
    if (n.espMuro >= n.anchoZap) return null;
    if (n.l1Caso2 <= 0 || n.l2Caso3 <= 0) return null;

    return {
      n,
      r: calcularMuroContencion(
        { gammaKNm3: n.gamma, phiGrados: n.phi, cKPa: n.c, sigmaAdmisibleKPa: n.sigmaAdm },
        {
          anchoZapataM: n.anchoZap, cantoZapataM: n.cantoZap, alturaMuroM: n.altMuro,
          espesorMuroM: n.espMuro, alturaSueloActivoM: n.hAct, alturaSueloPasivoM: n.hPas,
          sobrecargaKPa: n.sobrecarga,
        },
        { l1Caso2M: n.l1Caso2, l1Caso3M: n.l1Caso3, l2Caso3M: n.l2Caso3 }
      ),
    };
  }, [gamma, phi, c, sigmaAdm, anchoZap, cantoZap, altMuro, espMuro, hAct, hPas, sobrecarga, l1Caso2, l1Caso3, l2Caso3]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Contención</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader><CardTitle className="text-base">Sección</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <DiagramaMuro
              anchoZapataM={resultado.n.anchoZap}
              cantoZapataM={resultado.n.cantoZap}
              alturaMuroM={resultado.n.altMuro}
              espesorMuroM={resultado.n.espMuro}
              alturaSueloActivoM={resultado.n.hAct}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Suelo</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <CroquisSueloMuro />
              </div>
              <CampoNumerico id="gamma" etiqueta="γ" sufijo="kN/m³" valor={gamma} onChange={setGamma} />
              <CampoNumerico id="phi" etiqueta="φ" sufijo="°" valor={phi} onChange={setPhi} />
              <CampoNumerico id="c" etiqueta="Cohesión c" sufijo="kPa" valor={c} onChange={setC} />
              <CampoNumerico id="sigmaAdm" etiqueta="σ adm." sufijo="kN/m²" valor={sigmaAdm} onChange={setSigmaAdm} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <CroquisGeometriaMuro />
              </div>
              <CampoNumerico id="anchoZap" etiqueta="A zapata" sufijo="m" valor={anchoZap} onChange={setAnchoZap} />
              <CampoNumerico id="cantoZap" etiqueta="H zapata" sufijo="m" valor={cantoZap} onChange={setCantoZap} />
              <CampoNumerico id="altMuro" etiqueta="H muro" sufijo="m" valor={altMuro} onChange={setAltMuro} />
              <CampoNumerico id="espMuro" etiqueta="Espesor muro" sufijo="m" valor={espMuro} onChange={setEspMuro} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Terreno y sobrecarga</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="hAct" etiqueta="h activo" sufijo="m" valor={hAct} onChange={setHAct} />
              <CampoNumerico id="hPas" etiqueta="h pasivo" sufijo="m" valor={hPas} onChange={setHPas} />
              <CampoNumerico id="sobrecarga" etiqueta="Sobrecarga" sufijo="kN/m²" valor={sobrecarga} onChange={setSobrecarga} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Posición de los apoyos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <CroquisApoyosMuro />
              </div>
              <CampoNumerico id="l1Caso2" etiqueta="L1 · altura del contrapiso" sufijo="m" valor={l1Caso2} onChange={setL1Caso2} />
              <CampoNumerico id="l1Caso3" etiqueta="L1 · altura del contrapiso" sufijo="m" valor={l1Caso3} onChange={setL1Caso3} />
              <CampoNumerico id="l2Caso3" etiqueta="L2 · contrapiso a losa" sufijo="m" valor={l2Caso3} onChange={setL2Caso3} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (el espesor del muro debe ser menor que el ancho de zapata).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Empujes sobre el muro</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <DiagramaEmpujesMuro
                    alturaTotalM={resultado.r.empujes.alturaTotalM}
                    alturaSueloActivoM={aNumero(hAct)}
                    alturaMuroM={aNumero(altMuro)}
                    espesorMuroM={aNumero(espMuro)}
                    anchoZapataM={aNumero(anchoZap)}
                    cantoZapataM={aNumero(cantoZap)}
                    alturaSueloPasivoM={aNumero(hPas)}
                    ka={resultado.r.empujes.ka}
                    kp={resultado.r.empujes.kp}
                    gammaKNm3={aNumero(gamma)}
                    sobrecargaKPa={aNumero(sobrecarga)}
                    empujeSueloKN={resultado.r.empujes.empujeSueloKN}
                    empujeSobrecargaKN={resultado.r.empujes.empujeSobrecargaKN}
                    empujePasivoKN={resultado.r.empujes.empujePasivoKN}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 1 — solo zapata</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Vuelco (FS ≥ 1,5)"
                    verifica={resultado.r.vuelco.verifica}
                    detalle={`FS ${fmt(resultado.r.vuelco.factorSeguridad)} · M estab ${fmt(resultado.r.empujes.momentoEstabilizadorKNm)} / M volc ${fmt(resultado.r.empujes.momentoVolcadorKNm)} kN·m/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Deslizamiento (FS ≥ 1,5)"
                    verifica={resultado.r.deslizamientoSoloZapata.verifica}
                    detalle={`FS ${fmt(resultado.r.deslizamientoSoloZapata.factorSeguridad)} · Fh adm ${fmt(resultado.r.deslizamientoSoloZapata.fhAdmKN)} / Fh máx ${fmt(resultado.r.deslizamientoSoloZapata.fhMaxKN)} kN/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCaso1.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCaso1.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Ka (con piso de 0,5)", valor: fmt(resultado.r.empujes.ka, 3) },
                      { etiqueta: "Kp", valor: fmt(resultado.r.empujes.kp, 3) },
                      { etiqueta: "Empuje del suelo", valor: `${fmt(resultado.r.empujes.empujeSueloKN)} kN/m` },
                      { etiqueta: "Empuje por sobrecarga", valor: `${fmt(resultado.r.empujes.empujeSobrecargaKN)} kN/m` },
                      { etiqueta: "Empuje pasivo", valor: `${fmt(resultado.r.empujes.empujePasivoKN)} kN/m` },
                      { etiqueta: "Peso alzado", valor: `${fmt(resultado.r.empujes.pesoMuroKN)} kN/m` },
                      { etiqueta: "Peso zapata", valor: `${fmt(resultado.r.empujes.pesoZapataKN)} kN/m` },
                      { etiqueta: "Peso suelo sobre zapata", valor: `${fmt(resultado.r.empujes.pesoSueloActivoKN)} kN/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 2 — apoyo en contrapiso</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Deslizamiento con el contrapiso apuntalando"
                    verifica={resultado.r.deslizamientoApoyoContrapiso.verifica}
                    detalle={`FS ${fmt(resultado.r.deslizamientoApoyoContrapiso.factorSeguridad)} · sólo pasa R1 = ${fmt(Math.abs(resultado.r.apoyoContrapiso.r1KN))} kN/m por rozamiento`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCasos23.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por el contrapiso</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 = {fmt(resultado.r.apoyoContrapiso.r1KN)} kN/m · R2 = {fmt(resultado.r.apoyoContrapiso.r2KN)} kN/m
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 3 — contrapiso y losa superior</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por las losas</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 (inferior) = {fmt(resultado.r.apoyoContrapisoYLosa.r1KN)} kN/m · R2 (superior) ={" "}
                      {fmt(resultado.r.apoyoContrapisoYLosa.r2KN)} kN/m
                    </p>
                  </div>
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCasos23.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Al calcular el momento estabilizador, la planilla tomaba el peso del alzado con brazo A/2 en
                lugar del centro de gravedad del propio alzado; acá se usa esp/2, coherente con el brazo del
                suelo sobre la zapata y con la otra hoja de muros. Eso reduce el momento estabilizador, así
                que el resultado es más conservador que el de la planilla.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
