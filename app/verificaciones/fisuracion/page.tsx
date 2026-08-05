"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorNorma } from "@/components/verificaciones/SelectorNorma";
import { calcularFisuracion } from "@/lib/calc/ec2/fisuracion";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "fisuracion")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export default function FisuracionPage() {
  const [norma, setNorma] = useState("EC2");

  const [fck, setFck] = useState("30");
  const [fyk, setFyk] = useState("500");
  const [esGPa, setEsGPa] = useState("200");
  const [rg, setRg] = useState("0.02");
  const [k2, setK2] = useState("0.5");
  const [beta, setBeta] = useState("1.7");
  const [wAdm, setWAdm] = useState("0.3");

  const [h, setH] = useState("0.18");
  const [b, setB] = useState("1");
  const [mqp, setMqp] = useState("22");

  // Cada familia se define por separación (más habitual en losas) y diámetro.
  const [s1, setS1] = useState("0.15");
  const [phi1, setPhi1] = useState("8");
  const [s2, setS2] = useState("0.2");
  const [phi2, setPhi2] = useState("10");

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk), esGPa: aNumero(esGPa), rg: aNumero(rg),
      k2: aNumero(k2), beta: aNumero(beta), wAdm: aNumero(wAdm),
      h: aNumero(h), b: aNumero(b), mqp: aNumero(mqp),
      s1: aNumero(s1), phi1: aNumero(phi1), s2: aNumero(s2), phi2: aNumero(phi2),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.fck <= 0 || n.fyk <= 0 || n.esGPa <= 0 || n.h <= 0 || n.b <= 0) return null;
    if (n.s1 <= 0 || n.phi1 <= 0 || n.wAdm <= 0 || n.beta <= 0) return null;
    if (n.mqp <= 0) return null;

    const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
    const n1 = n.b / n.s1;
    const n2 = n.s2 > 0 && n.phi2 > 0 ? n.b / n.s2 : 0;

    return {
      n,
      n1,
      n2,
      r: calcularFisuracion(
        materiales,
        { recubrimientoM: n.rg, k2: n.k2, beta: n.beta, wAdmMm: n.wAdm, esGPa: n.esGPa },
        { hM: n.h, bM: n.b, n1, diametro1Mm: n.phi1, n2, diametro2Mm: n.phi2, mqpKNm: n.mqp }
      ),
    };
  }, [fck, fyk, esGPa, rg, k2, beta, wAdm, h, b, mqp, s1, phi1, s2, phi2]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Estado límite de servicio</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <SelectorNorma normas={meta.normasDisponibles} valor={norma} onChange={setNorma} />
      </div>

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          El momento a introducir es el de la combinación cuasipermanente, no el de cálculo:
          la fisuración se verifica en servicio. k2 vale 0,5 para carga mantenida o repetida
          y 1,0 para carga instantánea.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="esGPa" etiqueta="Es" sufijo="GPa" valor={esGPa} onChange={setEsGPa} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Parámetros de fisuración</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="rg" etiqueta="Recubrimiento" sufijo="m" valor={rg} onChange={setRg} />
              <CampoNumerico id="k2" etiqueta="k2" valor={k2} onChange={setK2} />
              <CampoNumerico id="beta" etiqueta="β" valor={beta} onChange={setBeta} />
              <CampoNumerico id="wAdm" etiqueta="w admisible" sufijo="mm" valor={wAdm} onChange={setWAdm} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sección y solicitación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="mqp" etiqueta="M cuasiperm." sufijo="kN·m" valor={mqp} onChange={setMqp} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Familia 1</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="phi1" etiqueta="φ" sufijo="mm" valor={phi1} onChange={setPhi1} />
                <CampoNumerico id="s1" etiqueta="Separación" sufijo="m" valor={s1} onChange={setS1} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Familia 2 (opcional)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="phi2" etiqueta="φ" sufijo="mm" valor={phi2} onChange={setPhi2} />
                <CampoNumerico id="s2" etiqueta="Separación" sufijo="m" valor={s2} onChange={setS2} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos. La familia 1 y el momento cuasipermanente son obligatorios.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Abertura de fisura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Abertura característica admisible"
                    verifica={resultado.r.verifica}
                    detalle={`wk ${fmt(resultado.r.wkMm, 3)} mm / w adm ${fmt(resultado.n.wAdm, 2)} mm`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">wk = β · sm · εsm</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {fmt(resultado.n.beta, 2)} × {fmt(resultado.r.smMm, 1)} mm × {resultado.r.epsilonSm.toExponential(3)}
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.r.dM, 3)} m` },
                      { etiqueta: "Recubrimiento al centro c", valor: `${fmt(resultado.r.cMm, 1)} mm` },
                      { etiqueta: "Separación entre barras s", valor: `${fmt(resultado.r.sMm, 1)} mm` },
                      { etiqueta: "Barras/m familia 1", valor: fmt(resultado.n1, 2) },
                      { etiqueta: "Barras/m familia 2", valor: fmt(resultado.n2, 2) },
                      { etiqueta: "As total", valor: `${fmt(resultado.r.asM2 * 10000, 2)} cm²` },
                      { etiqueta: "Ac eficaz", valor: `${fmt(resultado.r.acEficazM2 * 10000, 1)} cm²` },
                      { etiqueta: "Separación media de fisuras sm", valor: `${fmt(resultado.r.smMm, 1)} mm` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tensiones en la armadura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-mono text-xs text-muted-foreground">
                      σs = {fmt(resultado.r.sigmaSMPa, 1)} MPa · σsr (al fisurar) = {fmt(resultado.r.sigmaSrMPa, 1)} MPa
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Momento de fisuración", valor: `${fmt(resultado.r.mFisKNm, 2)} kN·m` },
                      { etiqueta: "εsm", valor: resultado.r.epsilonSm.toExponential(4) },
                    ]}
                  />
                  {resultado.r.sigmaSrMPa >= resultado.r.sigmaSMPa && (
                    <p className="text-xs text-muted-foreground">
                      σsr ≥ σs: con este momento la sección todavía no fisuraría. El cálculo aplica igual
                      el piso de 0,4·σs/Es que fija la norma.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
