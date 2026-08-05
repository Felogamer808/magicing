"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { PiloteDiagrama } from "@/components/verificaciones/PiloteDiagrama";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SelectorNorma } from "@/components/verificaciones/SelectorNorma";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { calcularPilote } from "@/lib/calc/ec2/pilote";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "pilotes")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export default function PilotesPage() {
  const [norma, setNorma] = useState("EC2");

  const [fck, setFck] = useState("25");
  const [fyk, setFyk] = useState("500");

  const [diametro, setDiametro] = useState("0.4");
  const [longitud, setLongitud] = useState("10");

  const [friccion, setFriccion] = useState("30");
  const [punta, setPunta] = useState("800");
  const [factorSeguridad, setFactorSeguridad] = useState("2.5");

  const [numero, setNumero] = useState("6");
  const [diametroBarra, setDiametroBarra] = useState("16");
  const [diametroEstribo, setDiametroEstribo] = useState("8");

  const [Nk, setNk] = useState("300");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      diametro: aNumero(diametro),
      longitud: aNumero(longitud),
      friccion: aNumero(friccion),
      punta: aNumero(punta),
      factorSeguridad: aNumero(factorSeguridad),
      numero: aNumero(numero),
      diametroBarra: aNumero(diametroBarra),
      diametroEstribo: aNumero(diametroEstribo),
      Nk: aNumero(Nk),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.diametro > 0 && v.longitud > 0;
    const geotecniaValida = v.friccion >= 0 && v.punta >= 0 && v.factorSeguridad > 0;
    const armaduraValida = v.numero > 0 && v.diametroBarra > 0 && v.diametroEstribo > 0;

    if (!todosValidos || !geometriaValida || !geotecniaValida || !armaduraValida || v.Nk <= 0) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });

    const pilote = calcularPilote(
      materiales,
      { diametroM: v.diametro, longitudM: v.longitud },
      { friccionKPa: v.friccion, puntaKPa: v.punta, factorSeguridad: v.factorSeguridad },
      { numero: v.numero, diametroMm: v.diametroBarra, diametroEstriboMm: v.diametroEstribo },
      { Nk: v.Nk }
    );

    return { pilote };
  }, [fck, fyk, diametro, longitud, friccion, punta, factorSeguridad, numero, diametroBarra, diametroEstribo, Nk]);

  const diagrama = useMemo(() => {
    const v = { diametro: aNumero(diametro), longitud: aNumero(longitud), numero: aNumero(numero), diametroBarra: aNumero(diametroBarra) };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    return { diametroM: v.diametro, longitudM: v.longitud, numeroBarras: v.numero, diametroBarraMm: v.diametroBarra };
  }, [diametro, longitud, numero, diametroBarra]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <SelectorNorma normas={meta.normasDisponibles} valor={norma} onChange={setNorma} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {diagrama && (
          <Card className="drafting-marks h-fit">
            <CardHeader>
              <CardTitle className="text-base">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-2">
              <PiloteDiagrama {...diagrama} />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Materiales</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Geometría</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="diametro" etiqueta="Diámetro" sufijo="m" valor={diametro} onChange={setDiametro} />
                <CampoNumerico id="longitud" etiqueta="Longitud" sufijo="m" valor={longitud} onChange={setLongitud} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parámetros geotécnicos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="friccion" etiqueta="fs (fuste)" sufijo="kN/m²" valor={friccion} onChange={setFriccion} />
                <CampoNumerico id="punta" etiqueta="qp (punta)" sufijo="kN/m²" valor={punta} onChange={setPunta} />
                <CampoNumerico id="factorSeguridad" etiqueta="FS" valor={factorSeguridad} onChange={setFactorSeguridad} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura y carga</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="numero" etiqueta="Nº barras" valor={numero} onChange={setNumero} />
                <CampoNumerico id="diametroBarra" etiqueta="φ" sufijo="mm" valor={diametroBarra} onChange={setDiametroBarra} />
                <CampoNumerico id="diametroEstribo" etiqueta="φ zuncho" sufijo="mm" valor={diametroEstribo} onChange={setDiametroEstribo} />
                <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
              </CardContent>
            </Card>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Capacidad geotécnica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Carga admisible"
                      verifica={resultado.pilote.geotecnico.verificaCapacidad}
                      detalle={`Nk ${fmt(aNumero(Nk))} kN / Q adm ${fmt(resultado.pilote.geotecnico.qAdmisibleKN)} kN`}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "Perímetro", valor: `${fmt(resultado.pilote.geotecnico.perimetroM, 3)} m` },
                        { etiqueta: "Área de punta", valor: `${fmt(resultado.pilote.geotecnico.areaTipM2, 3)} m²` },
                        { etiqueta: "Capacidad por fuste", valor: `${fmt(resultado.pilote.geotecnico.qSkinKN)} kN` },
                        { etiqueta: "Capacidad de punta", valor: `${fmt(resultado.pilote.geotecnico.qTipKN)} kN` },
                        { etiqueta: "Capacidad última", valor: `${fmt(resultado.pilote.geotecnico.qUltKN)} kN` },
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Verificación estructural</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Compresión simple"
                      verifica={resultado.pilote.estructural.verificaEstructural}
                      detalle={`Nd ${fmt(resultado.pilote.estructural.ndKN)} kN / Nrd ${fmt(resultado.pilote.estructural.nRdKN)} kN`}
                    />
                    <ResultadoCheck
                      etiqueta="Armadura mínima (EC2 9.5.2)"
                      verifica={resultado.pilote.estructural.verificaAsMin}
                      detalle={`As real ${fmt(resultado.pilote.estructural.areaAceroCm2)} cm² / As mín ${fmt(resultado.pilote.estructural.asMinCm2)} cm²`}
                    />
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                  Este tipo no viene de tu planilla — se calculó con la fórmula estática clásica (fuste +
                  punta) y compresión simple de EC2. No incluye pandeo, flexión, grupo de pilotes ni
                  ensayos de carga. Los valores de fs y qp deben salir de tu estudio de suelos. Revisar
                  antes de usar en obra.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
