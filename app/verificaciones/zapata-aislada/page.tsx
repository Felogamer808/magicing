"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { DiagramaPresionSuelo } from '@/components/verificaciones/hormigon/DiagramaPresionSuelo';
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { SolicitacionesZapataDiagrama } from "@/components/verificaciones/SolicitacionesZapataDiagrama";
import { ZapataDiagrama } from "@/components/verificaciones/ZapataDiagrama";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { calcularZapataAislada } from "@/lib/calc/ec2/zapata-aislada";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisArmadoDireccion,
  CroquisCargasZapata,
  CroquisGeometriaZapata,
  CroquisPilarZapata,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapatas")!;

export default function ZapataAisladaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "2");
  const [B, setB] = useCampo("B", "1.5");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");

  const [anchoPilarA, setAnchoPilarA] = useCampo("anchoPilarA", "0.4");
  const [anchoPilarB, setAnchoPilarB] = useCampo("anchoPilarB", "0.3");

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "500");
  const [MkA, setMkA] = useCampo("MkA", "50");
  const [MkB, setMkB] = useCampo("MkB", "20");

  const [numeroA, setNumeroA] = useCampo("numeroA", "8");
  const [diametroA, setDiametroA] = useCampo("diametroA", "16");
  const [numeroB, setNumeroB] = useCampo("numeroB", "6");
  const [diametroB, setDiametroB] = useCampo("diametroB", "16");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      B: aNumero(B),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      Nk: aNumero(Nk),
      MkA: aNumero(MkA),
      MkB: aNumero(MkB),
      numeroA: aNumero(numeroA),
      diametroA: aNumero(diametroA),
      numeroB: aNumero(numeroB),
      diametroB: aNumero(diametroB),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0 && v.anchoPilarA > 0 && v.anchoPilarB > 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
    const armadurasValidas = v.numeroA > 0 && v.diametroA > 0 && v.numeroB > 0 && v.diametroB > 0;
    const cargasValidas = v.Nk > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = {
      A: v.A,
      B: v.B,
      H: v.H,
      anchoPilarA: v.anchoPilarA,
      anchoPilarB: v.anchoPilarB,
      recubrimiento: v.recubrimiento,
    };

    const zapata = calcularZapataAislada(materiales, geometria, v.sigmaAdmisible, {
      cargas: { Nk: v.Nk, MkA: v.MkA, MkB: v.MkB },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
    });

    return { zapata };
  }, [
    fck, fyk, A, B, H, recubrimiento, anchoPilarA, anchoPilarB,
    sigmaAdmisible, Nk, MkA, MkB, numeroA, diametroA, numeroB, diametroB,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      B: aNumero(B),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      numeroA: aNumero(numeroA),
      numeroB: aNumero(numeroB),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    return {
      AM: v.A,
      BM: v.B,
      anchoPilarAM: v.anchoPilarA,
      anchoPilarBM: v.anchoPilarB,
      numeroA: v.numeroA,
      numeroB: v.numeroB,
    };
  }, [A, B, anchoPilarA, anchoPilarB, numeroA, numeroB]);

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
            <CardTitle className="text-base">Planta</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <ZapataDiagrama {...diagrama} />
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader>
            <CardTitle className="text-base">Solicitaciones y respuesta del terreno</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <SolicitacionesZapataDiagrama
              anchoM={aNumero(A)}
              cantoM={aNumero(H)}
              anchoPilarM={aNumero(anchoPilarA)}
              nkKN={aNumero(Nk)}
              mkKNm={aNumero(MkA)}
              sigmaMaxKPa={resultado.zapata.direccionA.sigmaMaxKPa}
              sigmaMinKPa={resultado.zapata.direccionA.sigmaMinKPa}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Columna de datos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiales y suelo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico
                id="sigmaAdmisible"
                etiqueta="σ suelo adm."
                sufijo="kN/m²"
                valor={sigmaAdmisible}
                onChange={setSigmaAdmisible}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisGeometriaZapata />
              </div>
              <CampoNumerico id="A" etiqueta="A" sufijo="m" valor={A} onChange={setA} />
              <CampoNumerico id="B" etiqueta="B" sufijo="m" valor={B} onChange={setB} />
              <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
              <CampoNumerico
                id="recubrimiento"
                etiqueta="Recubrimiento"
                sufijo="m"
                valor={recubrimiento}
                onChange={setRecubrimiento}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilar</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisPilarZapata />
              </div>
              <CampoNumerico id="anchoPilarA" etiqueta="Ancho // A" sufijo="m" valor={anchoPilarA} onChange={setAnchoPilarA} />
              <CampoNumerico id="anchoPilarB" etiqueta="Ancho // B" sufijo="m" valor={anchoPilarB} onChange={setAnchoPilarB} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cargas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisCargasZapata />
              </div>
              <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
              <CampoNumerico id="MkA" etiqueta="Mk A" sufijo="kN·m" valor={MkA} onChange={setMkA} />
              <CampoNumerico id="MkB" etiqueta="Mk B" sufijo="kN·m" valor={MkB} onChange={setMkB} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado dirección A</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <CroquisArmadoDireccion direccion="A" />
                </div>
                <CampoNumerico id="numeroA" etiqueta="Nº barras" valor={numeroA} onChange={setNumeroA} />
                <CampoNumerico id="diametroA" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroA} onChange={setDiametroA} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado dirección B</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <CroquisArmadoDireccion direccion="B" />
                </div>
                <CampoNumerico id="numeroB" etiqueta="Nº barras" valor={numeroB} onChange={setNumeroB} />
                <CampoNumerico id="diametroB" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroB} onChange={setDiametroB} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Columna de resultados */}
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
                  <CardTitle className="text-base">Verificación geotécnica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tensión admisible del suelo"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    detalle={`σ ${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m² / σ adm ${fmt(aNumero(sigmaAdmisible))} kN/m²`}
                  />
                  <DiagramaPresionSuelo
                    distribucion={resultado.zapata.geotecnico.distribucionA}
                    lM={aNumero(A)}
                    sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                    etiqueta="Dirección A"
                  />
                  <DiagramaPresionSuelo
                    distribucion={resultado.zapata.geotecnico.distribucionB}
                    lM={aNumero(B)}
                    sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                    etiqueta="Dirección B"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mientras la resultante caiga dentro del núcleo central la zapata apoya entera y
                    el diagrama es trapecial. Si se sale, el borde opuesto se levanta —el terreno no
                    tracciona— y la carga se concentra en una cuña más corta.
                  </p>
                  {(resultado.zapata.geotecnico.distribucionA.hayDespegue ||
                    resultado.zapata.geotecnico.distribucionB.hayDespegue) && (
                    <p className="text-xs text-destructive">
                      La resultante sale del núcleo central: hay despegue. La comprobación por área
                      eficaz sigue siendo válida, pero conviene revisar la geometría.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m` },
                      { etiqueta: "Zapata rígida (vuelo ≤ 2H)", valor: resultado.zapata.esRigida ? "Sí" : "No" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado dirección A</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.zapata.direccionA.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.direccionA.asRealCm2)} cm² / As nec ${fmt(resultado.zapata.direccionA.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante (EC2 6.2.2)"
                    verifica={resultado.zapata.direccionA.verificaCorte}
                    detalle={`Vd ${fmt(resultado.zapata.direccionA.vEdKN)} kN / VRd,c ${fmt(resultado.zapata.direccionA.vRdCKN)} kN`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.zapata.direccionA.dM, 3)} m` },
                      { etiqueta: "σ máx / mín", valor: `${fmt(resultado.zapata.direccionA.sigmaMaxKPa)} / ${fmt(resultado.zapata.direccionA.sigmaMinKPa)} kN/m²` },
                      { etiqueta: "σ crítica", valor: `${fmt(resultado.zapata.direccionA.sigmaCriticaKPa)} kN/m²` },
                      { etiqueta: "Vuelo a sección crítica", valor: `${fmt(resultado.zapata.direccionA.lM, 3)} m` },
                      { etiqueta: "Td", valor: `${fmt(resultado.zapata.direccionA.tdKN)} kN` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.zapata.direccionA.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.zapata.direccionA.asMinGeometricoCm2)} cm²` },
                      { etiqueta: "Longitud de anclaje", valor: `${fmt(resultado.zapata.direccionA.lbIMm, 0)} mm` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado dirección B</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.zapata.direccionB.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.direccionB.asRealCm2)} cm² / As nec ${fmt(resultado.zapata.direccionB.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante (EC2 6.2.2)"
                    verifica={resultado.zapata.direccionB.verificaCorte}
                    detalle={`Vd ${fmt(resultado.zapata.direccionB.vEdKN)} kN / VRd,c ${fmt(resultado.zapata.direccionB.vRdCKN)} kN`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.zapata.direccionB.dM, 3)} m` },
                      { etiqueta: "σ máx / mín", valor: `${fmt(resultado.zapata.direccionB.sigmaMaxKPa)} / ${fmt(resultado.zapata.direccionB.sigmaMinKPa)} kN/m²` },
                      { etiqueta: "σ crítica", valor: `${fmt(resultado.zapata.direccionB.sigmaCriticaKPa)} kN/m²` },
                      { etiqueta: "Vuelo a sección crítica", valor: `${fmt(resultado.zapata.direccionB.lM, 3)} m` },
                      { etiqueta: "Td", valor: `${fmt(resultado.zapata.direccionB.tdKN)} kN` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.zapata.direccionB.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.zapata.direccionB.asMinGeometricoCm2)} cm²` },
                      { etiqueta: "Longitud de anclaje", valor: `${fmt(resultado.zapata.direccionB.lbIMm, 0)} mm` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Punzonamiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Punzonamiento (EC2 6.4)"
                    verifica={resultado.zapata.punzonamiento.verificaPunzonamiento}
                    detalle={`Vd ${fmt(resultado.zapata.punzonamiento.vEdKN)} kN / VRd,c ${fmt(resultado.zapata.punzonamiento.vRdCKN)} kN`}
                  />
                  <p className="text-xs text-muted-foreground">
                    No viene de tu planilla — se calculó con el método general de EC2. Revisar antes de usar en obra.
                  </p>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d promedio", valor: `${fmt(resultado.zapata.punzonamiento.dPromedioM, 3)} m` },
                      {
                        etiqueta: "Perímetro crítico, a",
                        valor: `${fmt(resultado.zapata.punzonamiento.aCriticaM, 3)} m = ${fmt(
                          resultado.zapata.punzonamiento.aCriticaM /
                            resultado.zapata.punzonamiento.dPromedioM,
                          2
                        )} d`,
                      },
                      { etiqueta: "Perímetro de control u", valor: `${fmt(resultado.zapata.punzonamiento.u1M, 2)} m` },
                      {
                        etiqueta: "Aprovechamiento",
                        valor: fmt(resultado.zapata.punzonamiento.aprovechamiento, 3),
                      },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se barren los perímetros dentro de 2d y se informa el que peor verifica: en
                    zapatas rígidas el crítico no es el de 2d sino uno más cercano al pilar.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
