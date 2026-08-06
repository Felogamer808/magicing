"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ZapataCombinadaDiagrama } from "@/components/verificaciones/ZapataCombinadaDiagrama";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { calcularZapataCombinada } from "@/lib/calc/ec2/zapata-combinada";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-combinada")!;

export default function ZapataCombinadaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "6");
  const [B, setB] = useCampo("B", "1.2");
  const [H, setH] = useCampo("H", "0.6");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "200");

  const [pos1, setPos1] = useCampo("pos1", "1");
  const [Nk1, setNk1] = useCampo("Nk1", "250");
  const [pos2, setPos2] = useCampo("pos2", "5");
  const [Nk2, setNk2] = useCampo("Nk2", "350");

  const [diametroInferior, setDiametroInferior] = useCampo("diametroInferior", "16");
  const [separacionInferior, setSeparacionInferior] = useCampo("separacionInferior", "0.15");
  const [diametroSuperior, setDiametroSuperior] = useCampo("diametroSuperior", "12");
  const [separacionSuperior, setSeparacionSuperior] = useCampo("separacionSuperior", "0.15");
  const [numeroSecundario, setNumeroSecundario] = useCampo("numeroSecundario", "6");
  const [diametroSecundario, setDiametroSecundario] = useCampo("diametroSecundario", "10");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      B: aNumero(B),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      pos1: aNumero(pos1),
      Nk1: aNumero(Nk1),
      pos2: aNumero(pos2),
      Nk2: aNumero(Nk2),
      diametroInferior: aNumero(diametroInferior),
      separacionInferior: aNumero(separacionInferior),
      diametroSuperior: aNumero(diametroSuperior),
      separacionSuperior: aNumero(separacionSuperior),
      numeroSecundario: aNumero(numeroSecundario),
      diametroSecundario: aNumero(diametroSecundario),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0;
    const posicionesValidas = v.pos1 >= 0 && v.pos2 > v.pos1 && v.pos2 <= v.A;
    const cargasValidas = v.Nk1 > 0 && v.Nk2 > 0;
    const armadurasValidas =
      v.diametroInferior > 0 && v.separacionInferior > 0 && v.diametroSuperior > 0 && v.separacionSuperior > 0 &&
      v.numeroSecundario > 0 && v.diametroSecundario > 0;

    if (!todosValidos || !geometriaValida || !posicionesValidas || !cargasValidas || !armadurasValidas || v.sigmaAdmisible <= 0) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });

    const zapata = calcularZapataCombinada(
      materiales,
      { A: v.A, B: v.B, H: v.H, recubrimiento: v.recubrimiento },
      v.sigmaAdmisible,
      {
        columna1: { posicionM: v.pos1, Nk: v.Nk1 },
        columna2: { posicionM: v.pos2, Nk: v.Nk2 },
        armadoInferior: { diametroMm: v.diametroInferior, separacionM: v.separacionInferior },
        armadoSuperior: { diametroMm: v.diametroSuperior, separacionM: v.separacionSuperior },
        armadoSecundario: { numero: v.numeroSecundario, diametroMm: v.diametroSecundario },
      }
    );

    return { zapata };
  }, [
    fck, fyk, A, B, H, recubrimiento, sigmaAdmisible,
    pos1, Nk1, pos2, Nk2,
    diametroInferior, separacionInferior, diametroSuperior, separacionSuperior, numeroSecundario, diametroSecundario,
  ]);

  const diagrama = useMemo(() => {
    const v = { A: aNumero(A), H: aNumero(H), pos1: aNumero(pos1), pos2: aNumero(pos2) };
    if (!Object.values(v).every((n) => Number.isFinite(n)) || v.A <= 0 || v.H <= 0) return null;
    return { AM: v.A, HM: v.H, posicionCol1M: v.pos1, posicionCol2M: v.pos2 };
  }, [A, H, pos1, pos2]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {diagrama && (
        <Card className="drafting-marks">
          <CardHeader>
            <CardTitle className="text-base">Elevación</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <ZapataCombinadaDiagrama {...diagrama} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiales y suelo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="sigmaAdmisible" etiqueta="σ suelo adm." sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="A" etiqueta="A (largo)" sufijo="m" valor={A} onChange={setA} />
              <CampoNumerico id="B" etiqueta="B (ancho)" sufijo="m" valor={B} onChange={setB} />
              <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
              <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilar 1</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="pos1" etiqueta="Posición" sufijo="m" valor={pos1} onChange={setPos1} />
                <CampoNumerico id="Nk1" etiqueta="Nk" sufijo="kN" valor={Nk1} onChange={setNk1} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilar 2</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="pos2" etiqueta="Posición" sufijo="m" valor={pos2} onChange={setPos2} />
                <CampoNumerico id="Nk2" etiqueta="Nk" sufijo="kN" valor={Nk2} onChange={setNk2} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado inferior</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="diametroInferior" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroInferior} onChange={setDiametroInferior} />
                <CampoNumerico id="separacionInferior" etiqueta="Separación" sufijo="m" valor={separacionInferior} onChange={setSeparacionInferior} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado superior</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="diametroSuperior" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroSuperior} onChange={setDiametroSuperior} />
                <CampoNumerico id="separacionSuperior" etiqueta="Separación" sufijo="m" valor={separacionSuperior} onChange={setSeparacionSuperior} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Armadura de reparto</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="numeroSecundario" etiqueta="Nº barras/m" valor={numeroSecundario} onChange={setNumeroSecundario} />
              <CampoNumerico id="diametroSecundario" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroSecundario} onChange={setDiametroSecundario} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores numéricos válidos para ver los resultados. La posición del pilar 2 debe ser mayor que la del pilar 1 y no superar A.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verificación geotécnica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tensión admisible del suelo"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    detalle={`σ ${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m² / σ adm ${fmt(aNumero(sigmaAdmisible))} kN/m²`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.excentricidadM, 3)} m` },
                      { etiqueta: "Núcleo central (±A/6)", valor: resultado.zapata.dentroDelNucleo ? "Dentro" : "Fuera" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado inferior (momento positivo)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.zapata.inferior.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.inferior.asRealCm2PorM)} cm²/m / As nec ${fmt(resultado.zapata.inferior.asNecCm2PorM)} cm²/m`}
                  />
                  <p className="text-xs text-muted-foreground">
                    M = {fmt(resultado.zapata.inferior.mKNm)} kN·m, en x = {fmt(resultado.zapata.inferior.posicionM, 2)} m
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado superior (momento negativo)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.zapata.superior.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.superior.asRealCm2PorM)} cm²/m / As nec ${fmt(resultado.zapata.superior.asNecCm2PorM)} cm²/m`}
                  />
                  <p className="text-xs text-muted-foreground">
                    M = {fmt(resultado.zapata.superior.mKNm)} kN·m, en x = {fmt(resultado.zapata.superior.posicionM, 2)} m
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cortante y armadura de reparto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Cortante (EC2 6.2.2)"
                    verifica={resultado.zapata.cortante.verificaCorte}
                    detalle={`Vd ${fmt(resultado.zapata.cortante.vEdKN)} kN / VRd,c ${fmt(resultado.zapata.cortante.vRdCKN)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura de reparto"
                    verifica={resultado.zapata.secundario.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.secundario.asRealCm2)} cm² / As nec ${fmt(resultado.zapata.secundario.asNecCm2)} cm²`}
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Este tipo no viene de tu planilla — se calculó tratando la zapata como una viga sobre el
                terreno (carga distribuida = reacción del suelo, apoyos = cargas de los pilares). No incluye
                punzonamiento en cada pilar. Revisar antes de usar en obra.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
