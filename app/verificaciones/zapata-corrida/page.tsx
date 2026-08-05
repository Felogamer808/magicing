"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ZapataCorridaDiagrama } from "@/components/verificaciones/ZapataCorridaDiagrama";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { calcularZapataCorrida } from "@/lib/calc/ec2/zapata-corrida";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-corrida")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export default function ZapataCorridaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "1");
  const [H, setH] = useCampo("H", "0.4");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [anchoPilar, setAnchoPilar] = useCampo("anchoPilar", "0.3");

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "100");
  const [MkA, setMkA] = useCampo("MkA", "15");

  const [diametroPrincipal, setDiametroPrincipal] = useCampo("diametroPrincipal", "16");
  const [separacionPrincipal, setSeparacionPrincipal] = useCampo("separacionPrincipal", "0.15");
  const [numeroSecundario, setNumeroSecundario] = useCampo("numeroSecundario", "4");
  const [diametroSecundario, setDiametroSecundario] = useCampo("diametroSecundario", "10");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      anchoPilar: aNumero(anchoPilar),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      Nk: aNumero(Nk),
      MkA: aNumero(MkA),
      diametroPrincipal: aNumero(diametroPrincipal),
      separacionPrincipal: aNumero(separacionPrincipal),
      numeroSecundario: aNumero(numeroSecundario),
      diametroSecundario: aNumero(diametroSecundario),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.H > 0 && v.anchoPilar > 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
    const armadurasValidas =
      v.diametroPrincipal > 0 && v.separacionPrincipal > 0 && v.numeroSecundario > 0 && v.diametroSecundario > 0;
    const cargasValidas = v.Nk > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { A: v.A, H: v.H, anchoPilar: v.anchoPilar, recubrimiento: v.recubrimiento };

    const zapata = calcularZapataCorrida(materiales, geometria, v.sigmaAdmisible, {
      carga: { Nk: v.Nk, MkA: v.MkA },
      armadoPrincipal: { diametroMm: v.diametroPrincipal, separacionM: v.separacionPrincipal },
      armadoSecundario: { numero: v.numeroSecundario, diametroMm: v.diametroSecundario },
    });

    return { zapata };
  }, [
    fck, fyk, A, H, recubrimiento, anchoPilar,
    sigmaAdmisible, Nk, MkA,
    diametroPrincipal, separacionPrincipal, numeroSecundario, diametroSecundario,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      H: aNumero(H),
      anchoPilar: aNumero(anchoPilar),
      recubrimiento: aNumero(recubrimiento),
      diametroPrincipal: aNumero(diametroPrincipal),
      separacionPrincipal: aNumero(separacionPrincipal),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    return {
      AM: v.A,
      HM: v.H,
      anchoPilarM: v.anchoPilar,
      dM: v.H - v.recubrimiento - v.diametroPrincipal / 2000,
      diametroPrincipalMm: v.diametroPrincipal,
      separacionPrincipalM: v.separacionPrincipal,
    };
  }, [A, H, anchoPilar, recubrimiento, diametroPrincipal, separacionPrincipal]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      {diagrama && (
        <Card className="drafting-marks">
          <CardHeader>
            <CardTitle className="text-base">Corte (por metro corrido)</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <ZapataCorridaDiagrama {...diagrama} />
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
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="A" etiqueta="A (ancho)" sufijo="m" valor={A} onChange={setA} />
              <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
              <CampoNumerico
                id="recubrimiento"
                etiqueta="Recubrimiento"
                sufijo="m"
                valor={recubrimiento}
                onChange={setRecubrimiento}
              />
              <CampoNumerico
                id="anchoPilar"
                etiqueta="Ancho muro/pilar"
                sufijo="m"
                valor={anchoPilar}
                onChange={setAnchoPilar}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cargas (por metro corrido)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN/m" valor={Nk} onChange={setNk} />
              <CampoNumerico id="MkA" etiqueta="Mk" sufijo="kN·m/m" valor={MkA} onChange={setMkA} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armado principal</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico
                  id="diametroPrincipal"
                  etiqueta="φ"
                  sufijo="mm"
                  valor={diametroPrincipal}
                  onChange={setDiametroPrincipal}
                />
                <CampoNumerico
                  id="separacionPrincipal"
                  etiqueta="Separación"
                  sufijo="m"
                  valor={separacionPrincipal}
                  onChange={setSeparacionPrincipal}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura de reparto</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico
                  id="numeroSecundario"
                  etiqueta="Nº barras/m"
                  valor={numeroSecundario}
                  onChange={setNumeroSecundario}
                />
                <CampoNumerico
                  id="diametroSecundario"
                  etiqueta="φ"
                  sufijo="mm"
                  valor={diametroSecundario}
                  onChange={setDiametroSecundario}
                />
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
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN/m` },
                      { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m` },
                      { etiqueta: "Zapata rígida (vuelo ≤ 2H)", valor: resultado.zapata.esRigida ? "Sí" : "No" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armado principal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.zapata.principal.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.principal.asRealCm2PorM)} cm²/m / As nec ${fmt(resultado.zapata.principal.asNecCm2PorM)} cm²/m`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.zapata.principal.dM, 3)} m` },
                      { etiqueta: "σ máx / mín", valor: `${fmt(resultado.zapata.principal.sigmaMaxKPa)} / ${fmt(resultado.zapata.principal.sigmaMinKPa)} kN/m²` },
                      { etiqueta: "σ crítica", valor: `${fmt(resultado.zapata.principal.sigmaCriticaKPa)} kN/m²` },
                      { etiqueta: "Vuelo a sección crítica", valor: `${fmt(resultado.zapata.principal.lM, 3)} m` },
                      { etiqueta: "Td", valor: `${fmt(resultado.zapata.principal.tdKN)} kN` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.zapata.principal.asMinMecanicoCm2PorM)} cm²/m` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.zapata.principal.asMinGeometricoCm2PorM)} cm²/m` },
                      { etiqueta: "Longitud de anclaje", valor: `${fmt(resultado.zapata.principal.lbIMm, 0)} mm` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Armadura de reparto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.zapata.secundario.verificaAs}
                    detalle={`As real ${fmt(resultado.zapata.secundario.asRealCm2)} cm² / As nec ${fmt(resultado.zapata.secundario.asNecCm2)} cm²`}
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
