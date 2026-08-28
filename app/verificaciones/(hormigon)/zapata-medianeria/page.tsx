"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { TarjetaLadoZapata } from "@/components/verificaciones/hormigon/TarjetaLadoZapata";
import { ZapataMedianeriaDiagrama } from "@/components/verificaciones/hormigon/ZapataMedianeriaDiagrama";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataMedianeria } from "@/lib/calc/hormigon/cimentaciones/zapata-medianeria";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisArmadoDireccion,
  CroquisCargasZapata,
  CroquisGeometriaZapata,
  CroquisPilarZapata,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-medianeria")!;

export default function ZapataMedianeriaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "2.5");
  const [B, setB] = useCampo("B", "1.2");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [distanciaColumnaLimite, setDistanciaColumnaLimite] = useCampo("distanciaColumnaLimite", "0.7");

  const [anchoPilarA, setAnchoPilarA] = useCampo("anchoPilarA", "0.4");
  const [anchoPilarB, setAnchoPilarB] = useCampo("anchoPilarB", "0.4");

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "300");
  const [MkA, setMkA] = useCampo("MkA", "0");
  const [MkB, setMkB] = useCampo("MkB", "0");

  const [numeroA, setNumeroA] = useCampo("numeroA", "8");
  const [diametroA, setDiametroA] = useCampo("diametroA", "16");
  const [numeroB, setNumeroB] = useCampo("numeroB", "6");
  const [diametroB, setDiametroB] = useCampo("diametroB", "12");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      B: aNumero(B),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      distanciaColumnaLimite: aNumero(distanciaColumnaLimite),
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
    const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0 && v.anchoPilarA > 0 && v.anchoPilarB > 0 && v.distanciaColumnaLimite >= 0;
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
      distanciaColumnaLimite: v.distanciaColumnaLimite,
    };

    const zapata = calcularZapataMedianeria(materiales, geometria, v.sigmaAdmisible, {
      cargas: { Nk: v.Nk, MkA: v.MkA, MkB: v.MkB },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
    });

    return { zapata };
  }, [
    fck, fyk, A, B, H, recubrimiento, distanciaColumnaLimite, anchoPilarA, anchoPilarB,
    sigmaAdmisible, Nk, MkA, MkB, numeroA, diametroA, numeroB, diametroB,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      B: aNumero(B),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      distanciaColumnaLimite: aNumero(distanciaColumnaLimite),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0) || v.A <= 0 || v.B <= 0) return null;
    return {
      AM: v.A,
      BM: v.B,
      anchoPilarAM: v.anchoPilarA,
      anchoPilarBM: v.anchoPilarB,
      distanciaColumnaLimiteM: v.distanciaColumnaLimite,
    };
  }, [A, B, anchoPilarA, anchoPilarB, distanciaColumnaLimite]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
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
            <ZapataMedianeriaDiagrama {...diagrama} />
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
              <CampoNumerico
                id="distanciaColumnaLimite"
                etiqueta="Sep. al límite"
                sufijo="m"
                valor={distanciaColumnaLimite}
                onChange={setDistanciaColumnaLimite}
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
                <CampoDiametro id="diametroA" etiqueta="Ø" valor={diametroA} onChange={setDiametroA} />
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
                <CampoDiametro id="diametroB" etiqueta="Ø" valor={diametroB} onChange={setDiametroB} />
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
              {!resultado.zapata.dentroDelNucleo && (
                <Card className="border-destructive/40">
                  <CardContent className="space-y-2 py-4 text-sm">
                    <Badge variant="destructive">Excentricidad fuera del núcleo central</Badge>
                    <p className="text-muted-foreground">
                      El pilar está tan cerca del límite que la distribución lineal de presiones dejaría
                      tracciones en el suelo (inválido). Con esta geometría hace falta una viga centradora
                      que conecte esta zapata con una interior, en vez de diseñarla sola.
                    </p>
                  </CardContent>
                </Card>
              )}

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
                      { etiqueta: "Zapata rígida (vuelo ≤ 2H)", valor: resultado.zapata.esRigida ? "Sí" : "No" },
                    ]}
                  />
                </CardContent>
              </Card>

              <TarjetaLadoZapata titulo="Armado — lado límite (vuelo corto)" resultado={resultado.zapata.ladoLimite} />
              <TarjetaLadoZapata titulo="Armado — lado interior (vuelo largo)" resultado={resultado.zapata.ladoInterior} />

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
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Este tipo no viene de tu planilla — se calculó con el método general de EC2 (distribución
                lineal de presiones con excentricidad). No incluye punzonamiento. Revisar antes de usar en obra.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
