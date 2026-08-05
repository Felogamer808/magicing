"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { LosaDiagrama } from "@/components/verificaciones/LosaDiagrama";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorNorma } from "@/components/verificaciones/SelectorNorma";
import { calcularLosa, calcularMomentoResistenteLosa, type ResultadoDireccionLosa } from "@/lib/calc/ec2/losa";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "losas")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

function TarjetaDireccion({
  titulo,
  r,
  diametroMm,
  separacionM,
  nota,
}: {
  titulo: string;
  r: ResultadoDireccionLosa;
  diametroMm: number;
  separacionM: number;
  nota?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResultadoCheck
          etiqueta={`Armado φ${fmt(diametroMm, 0)}/${fmt(separacionM * 100, 0)} cm`}
          verifica={r.verificaAs}
          detalle={`As real ${fmt(r.asRealCm2PorM)} cm²/m / As nec ${fmt(r.asNecCm2PorM)} cm²/m`}
        />
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
        <PanelFormulas
          titulo="Ver cálculo"
          filas={[
            { etiqueta: "d", valor: `${fmt(r.dM, 3)} m` },
            { etiqueta: "μ", valor: fmt(r.mu, 5) },
            { etiqueta: "ω", valor: fmt(r.omega, 5) },
            { etiqueta: "As por momento", valor: `${fmt(r.asCalculadoCm2PorM)} cm²/m` },
            { etiqueta: "As mín. mecánico", valor: `${fmt(r.asMinMecanicoCm2PorM)} cm²/m` },
            { etiqueta: "As mín. geométrico", valor: `${fmt(r.asMinGeometricoCm2PorM)} cm²/m` },
            { etiqueta: "Separación necesaria", valor: `${fmt(r.separacionNecM * 100, 1)} cm` },
            { etiqueta: "Separación máxima", valor: `${fmt(r.separacionMaxM * 100, 0)} cm` },
            { etiqueta: "Anclaje lb,neta", valor: `${fmt(r.lbNetaMm, 0)} mm` },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export default function LosasPage() {
  const [norma, setNorma] = useState("EC2");

  const [fck, setFck] = useState("30");
  const [fyk, setFyk] = useState("500");

  const [e, setE] = useState("0.15");
  const [rgPos, setRgPos] = useState("0.02");
  const [rgNeg, setRgNeg] = useState("0.02");

  const [mxPos, setMxPos] = useState("50");
  const [myPos, setMyPos] = useState("30");
  const [mxNeg, setMxNeg] = useState("40");
  const [myNeg, setMyNeg] = useState("20");

  const [phiPosX, setPhiPosX] = useState("12");
  const [sPosX, setSPosX] = useState("0.1");
  const [phiPosY, setPhiPosY] = useState("10");
  const [sPosY, setSPosY] = useState("0.15");
  const [phiNegX, setPhiNegX] = useState("12");
  const [sNegX, setSNegX] = useState("0.15");
  const [phiNegY, setPhiNegY] = useState("10");
  const [sNegY, setSNegY] = useState("0.15");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck), fyk: aNumero(fyk),
      e: aNumero(e), rgPos: aNumero(rgPos), rgNeg: aNumero(rgNeg),
      mxPos: aNumero(mxPos), myPos: aNumero(myPos), mxNeg: aNumero(mxNeg), myNeg: aNumero(myNeg),
      phiPosX: aNumero(phiPosX), sPosX: aNumero(sPosX),
      phiPosY: aNumero(phiPosY), sPosY: aNumero(sPosY),
      phiNegX: aNumero(phiNegX), sNegX: aNumero(sNegX),
      phiNegY: aNumero(phiNegY), sNegY: aNumero(sNegY),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0)) return null;
    if (v.e <= 0 || v.fck <= 0 || v.fyk <= 0) return null;
    if ([v.phiPosX, v.sPosX, v.phiPosY, v.sPosY, v.phiNegX, v.sNegX, v.phiNegY, v.sNegY].some((n) => n <= 0)) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { e: v.e, recubrimientoPositivo: v.rgPos, recubrimientoNegativo: v.rgNeg };

    const losa = calcularLosa(materiales, geometria, {
      momentoPositivoX: v.mxPos, momentoPositivoY: v.myPos,
      momentoNegativoX: v.mxNeg, momentoNegativoY: v.myNeg,
      armadoPositivoX: { diametroMm: v.phiPosX, separacionM: v.sPosX },
      armadoPositivoY: { diametroMm: v.phiPosY, separacionM: v.sPosY },
      armadoNegativoX: { diametroMm: v.phiNegX, separacionM: v.sNegX },
      armadoNegativoY: { diametroMm: v.phiNegY, separacionM: v.sNegY },
    });

    const resistente = calcularMomentoResistenteLosa(materiales, v.e, v.rgPos, {
      diametroMm: v.phiPosX, separacionM: v.sPosX,
    });

    return { losa, resistente, v };
  }, [fck, fyk, e, rgPos, rgNeg, mxPos, myPos, mxNeg, myNeg, phiPosX, sPosX, phiPosY, sPosY, phiNegX, sNegX, phiNegY, sNegY]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Losas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <SelectorNorma normas={meta.normasDisponibles} valor={norma} onChange={setNorma} />
      </div>

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader>
            <CardTitle className="text-base">Sección (escala vertical exagerada)</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <LosaDiagrama
              eM={resultado.v.e}
              recubrimientoPositivoM={resultado.v.rgPos}
              recubrimientoNegativoM={resultado.v.rgNeg}
              diametroPosXMm={resultado.v.phiPosX}
              diametroPosYMm={resultado.v.phiPosY}
              diametroNegXMm={resultado.v.phiNegX}
              diametroNegYMm={resultado.v.phiNegY}
              dPosXM={resultado.losa.positivo.x.dM}
              dPosYM={resultado.losa.positivo.y.dM}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="e" etiqueta="Espesor e" sufijo="m" valor={e} onChange={setE} />
              <CampoNumerico id="rgPos" etiqueta="rg positivos" sufijo="m" valor={rgPos} onChange={setRgPos} />
              <CampoNumerico id="rgNeg" etiqueta="rg negativos" sufijo="m" valor={rgNeg} onChange={setRgNeg} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Momentos de cálculo</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="mxPos" etiqueta="Mx +" sufijo="kN·m/m" valor={mxPos} onChange={setMxPos} />
              <CampoNumerico id="myPos" etiqueta="My +" sufijo="kN·m/m" valor={myPos} onChange={setMyPos} />
              <CampoNumerico id="mxNeg" etiqueta="Mx −" sufijo="kN·m/m" valor={mxNeg} onChange={setMxNeg} />
              <CampoNumerico id="myNeg" etiqueta="My −" sufijo="kN·m/m" valor={myNeg} onChange={setMyNeg} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Armado positivo</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="phiPosX" etiqueta="φ X" sufijo="mm" valor={phiPosX} onChange={setPhiPosX} />
                <CampoNumerico id="sPosX" etiqueta="s X" sufijo="m" valor={sPosX} onChange={setSPosX} />
                <CampoNumerico id="phiPosY" etiqueta="φ Y" sufijo="mm" valor={phiPosY} onChange={setPhiPosY} />
                <CampoNumerico id="sPosY" etiqueta="s Y" sufijo="m" valor={sPosY} onChange={setSPosY} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Armado negativo</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="phiNegX" etiqueta="φ X" sufijo="mm" valor={phiNegX} onChange={setPhiNegX} />
                <CampoNumerico id="sNegX" etiqueta="s X" sufijo="m" valor={sNegX} onChange={setSNegX} />
                <CampoNumerico id="phiNegY" etiqueta="φ Y" sufijo="mm" valor={phiNegY} onChange={setPhiNegY} />
                <CampoNumerico id="sNegY" etiqueta="s Y" sufijo="m" valor={sNegY} onChange={setSNegY} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores numéricos válidos para ver los resultados.
              </CardContent>
            </Card>
          ) : (
            <>
              <TarjetaDireccion
                titulo="Positivo — dirección X"
                r={resultado.losa.positivo.x}
                diametroMm={resultado.v.phiPosX}
                separacionM={resultado.v.sPosX}
                nota="Como en la planilla, el armado en X computa la malla general de Y más el refuerzo propio en X."
              />
              <TarjetaDireccion
                titulo="Positivo — dirección Y"
                r={resultado.losa.positivo.y}
                diametroMm={resultado.v.phiPosY}
                separacionM={resultado.v.sPosY}
              />
              <TarjetaDireccion
                titulo="Negativo — dirección X"
                r={resultado.losa.negativo.x}
                diametroMm={resultado.v.phiNegX}
                separacionM={resultado.v.sNegX}
              />
              <TarjetaDireccion
                titulo="Negativo — dirección Y"
                r={resultado.losa.negativo.y}
                diametroMm={resultado.v.phiNegY}
                separacionM={resultado.v.sNegY}
              />

              <Card>
                <CardHeader><CardTitle className="text-base">Momento resistente del armado positivo X</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-mono text-sm">
                    {fmt(resultado.resistente.momentoKNmPorM)} kN·m/m
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lo que resiste φ{fmt(resultado.v.phiPosX, 0)}/{fmt(resultado.v.sPosX * 100, 0)} cm por sí solo
                    (As {fmt(resultado.resistente.asRealCm2PorM)} cm²/m, d {fmt(resultado.resistente.dM, 3)} m),
                    sin contar la malla de Y.
                  </p>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                No incluye punzonamiento. La planilla usaba el recubrimiento de negativos para calcular
                el canto útil de la armadura positiva en X; acá se usa el de positivos, que es lo
                correcto (en la planilla ambos valían 0,02 m y el error quedaba oculto).
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
