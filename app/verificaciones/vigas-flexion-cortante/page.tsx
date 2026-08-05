"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SeccionVigaDiagrama } from "@/components/verificaciones/SeccionVigaDiagrama";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularDisposicionArmadura,
  calcularFlexion,
} from "@/lib/calc/ec2/vigas-flexion-cortante";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-flexion-cortante")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const describirCapas = (capas: number[]) =>
  capas.length <= 1 ? `1 fila de ${capas[0]}` : `${capas.length} filas: ${capas.join("+")}`;

export default function VigasFlexionCortantePage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [b, setB] = useCampo("b", "0.9");
  const [h, setH] = useCampo("h", "0.7");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.04");

  const [momentoPos, setMomentoPos] = useCampo("momentoPos", "32");
  const [numeroPos, setNumeroPos] = useCampo("numeroPos", "10");
  const [diametroPos, setDiametroPos] = useCampo("diametroPos", "10");

  const [momentoNeg, setMomentoNeg] = useCampo("momentoNeg", "14");
  const [numeroNeg, setNumeroNeg] = useCampo("numeroNeg", "5");
  const [diametroNeg, setDiametroNeg] = useCampo("diametroNeg", "12");

  const [vd, setVd] = useCampo("vd", "1076");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "10");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "6");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      b: aNumero(b),
      h: aNumero(h),
      recubrimiento: aNumero(recubrimiento),
      momentoPos: aNumero(momentoPos),
      numeroPos: aNumero(numeroPos),
      diametroPos: aNumero(diametroPos),
      momentoNeg: aNumero(momentoNeg),
      numeroNeg: aNumero(numeroNeg),
      diametroNeg: aNumero(diametroNeg),
      vd: aNumero(vd),
      diametroEstribo: aNumero(diametroEstribo),
      numeroRamas: aNumero(numeroRamas),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
    const geometriaValida = v.b > 0 && v.h > 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0;
    const armadurasValidas = v.numeroPos > 0 && v.diametroPos > 0 && v.numeroNeg > 0 && v.diametroNeg > 0;
    const cortanteValido = v.numeroRamas > 0 && v.diametroEstribo > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cortanteValido) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const d = calcularCantoUtil(geometria, { numero: v.numeroPos, diametroMm: v.diametroPos });

    const flexionPositiva = calcularFlexion(materiales, geometria, d, {
      momento: v.momentoPos,
      armaduraReal: { numero: v.numeroPos, diametroMm: v.diametroPos },
    });
    const flexionNegativa = calcularFlexion(materiales, geometria, d, {
      momento: v.momentoNeg,
      armaduraReal: { numero: v.numeroNeg, diametroMm: v.diametroNeg },
    });
    const cortante = calcularCortante(materiales, geometria, d, flexionNegativa.asRealCm2, {
      vd: v.vd,
      diametroEstriboMm: v.diametroEstribo,
      numeroRamas: v.numeroRamas,
    });

    return { materiales, d, flexionPositiva, flexionNegativa, cortante };
  }, [
    fck, fyk, b, h, recubrimiento,
    momentoPos, numeroPos, diametroPos,
    momentoNeg, numeroNeg, diametroNeg,
    vd, diametroEstribo, numeroRamas,
  ]);

  // La sección se dibuja con los datos de geometría y armadura, aunque el
  // resto del formulario (cortante) todavía no sea válido.
  const diagrama = useMemo(() => {
    const v = {
      b: aNumero(b),
      h: aNumero(h),
      recubrimiento: aNumero(recubrimiento),
      numeroPos: aNumero(numeroPos),
      diametroPos: aNumero(diametroPos),
      numeroNeg: aNumero(numeroNeg),
      diametroNeg: aNumero(diametroNeg),
      diametroEstribo: aNumero(diametroEstribo),
    };

    const validos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
    if (
      !validos ||
      v.b <= 0 ||
      v.h <= 0 ||
      v.numeroPos <= 0 ||
      v.diametroPos <= 0 ||
      v.numeroNeg <= 0 ||
      v.diametroNeg <= 0 ||
      v.diametroEstribo <= 0
    ) {
      return null;
    }

    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const armaduraPositiva = { numero: v.numeroPos, diametroMm: v.diametroPos };
    const armaduraNegativa = { numero: v.numeroNeg, diametroMm: v.diametroNeg };
    const disposicionPositiva = calcularDisposicionArmadura(geometria, armaduraPositiva);
    const disposicionNegativa = calcularDisposicionArmadura(geometria, armaduraNegativa);
    const d = geometria.h - disposicionPositiva.distanciaCentroideM;

    return {
      bM: v.b,
      hM: v.h,
      recubrimientoM: v.recubrimiento,
      dM: d,
      armaduraPositiva: { diametroMm: v.diametroPos, capas: disposicionPositiva.capas },
      armaduraNegativa: { diametroMm: v.diametroNeg, capas: disposicionNegativa.capas },
      diametroEstriboMm: v.diametroEstribo,
    };
  }, [b, h, recubrimiento, numeroPos, diametroPos, numeroNeg, diametroNeg, diametroEstribo]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Vigas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      {diagrama && (
        <Card className="drafting-marks">
          <CardHeader>
            <CardTitle className="text-base">Sección</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-2">
            <SeccionVigaDiagrama {...diagrama} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Columna de datos */}
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
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico
                id="recubrimiento"
                etiqueta="Recubrimiento"
                sufijo="m"
                valor={recubrimiento}
                onChange={setRecubrimiento}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura positiva</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <CampoNumerico
                  id="momentoPos"
                  etiqueta="Mmax+"
                  sufijo="kN·m"
                  valor={momentoPos}
                  onChange={setMomentoPos}
                />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="numeroPos" etiqueta="Nº barras" valor={numeroPos} onChange={setNumeroPos} />
                  <CampoNumerico id="diametroPos" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroPos} onChange={setDiametroPos} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura negativa</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <CampoNumerico
                  id="momentoNeg"
                  etiqueta="Mmax-"
                  sufijo="kN·m"
                  valor={momentoNeg}
                  onChange={setMomentoNeg}
                />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="numeroNeg" etiqueta="Nº barras" valor={numeroNeg} onChange={setNumeroNeg} />
                  <CampoNumerico id="diametroNeg" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroNeg} onChange={setDiametroNeg} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cortante</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
              <CampoNumerico
                id="diametroEstribo"
                etiqueta="φ estribo"
                sufijo="mm"
                valor={diametroEstribo}
                onChange={setDiametroEstribo}
              />
              <CampoNumerico id="numeroRamas" etiqueta="Nº ramas" valor={numeroRamas} onChange={setNumeroRamas} />
            </CardContent>
          </Card>
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
                  <CardTitle className="text-base">Flexión positiva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.flexionPositiva.verificaAs}
                    detalle={`As real ${fmt(resultado.flexionPositiva.asRealCm2)} cm² / As nec ${fmt(resultado.flexionPositiva.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura entra en el ancho disponible"
                    verifica={resultado.flexionPositiva.verificaEntraEnAncho}
                    detalle={describirCapas(resultado.flexionPositiva.capas)}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.d, 3)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionPositiva.mu, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionPositiva.omega, 5) },
                      { etiqueta: "As calculado", valor: `${fmt(resultado.flexionPositiva.asCalculadoCm2)} cm²` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.flexionPositiva.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.flexionPositiva.asMinGeometricoCm2)} cm²` },
                      { etiqueta: "Aprovechamiento", valor: fmt(resultado.flexionPositiva.aprovechamiento, 2) },
                      { etiqueta: "Barras por fila (máx.)", valor: `${resultado.flexionPositiva.capacidadPorFila}` },
                      { etiqueta: "Distancia al centroide", valor: `${fmt(resultado.flexionPositiva.distanciaCentroideM, 3)} m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Flexión negativa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.flexionNegativa.verificaAs}
                    detalle={`As real ${fmt(resultado.flexionNegativa.asRealCm2)} cm² / As nec ${fmt(resultado.flexionNegativa.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura entra en el ancho disponible"
                    verifica={resultado.flexionNegativa.verificaEntraEnAncho}
                    detalle={describirCapas(resultado.flexionNegativa.capas)}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.d, 3)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionNegativa.mu, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionNegativa.omega, 5) },
                      { etiqueta: "As calculado", valor: `${fmt(resultado.flexionNegativa.asCalculadoCm2)} cm²` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.flexionNegativa.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.flexionNegativa.asMinGeometricoCm2)} cm²` },
                      { etiqueta: "Aprovechamiento", valor: fmt(resultado.flexionNegativa.aprovechamiento, 2) },
                      { etiqueta: "Barras por fila (máx.)", valor: `${resultado.flexionNegativa.capacidadPorFila}` },
                      { etiqueta: "Distancia al centroide", valor: `${fmt(resultado.flexionNegativa.distanciaCentroideM, 3)} m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cortante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="No se supera la compresión oblicua del alma"
                    verifica={resultado.cortante.verificaVRdMax}
                    detalle={`Vd ${fmt(aNumero(vd))} kN / VRd,max ${fmt(resultado.cortante.vRdMax)} kN`}
                  />
                  <Separator />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      Estribado: {fmt(aNumero(numeroRamas), 0)} ramas φ{fmt(aNumero(diametroEstribo), 0)} cada{" "}
                      {fmt(resultado.cortante.separacionAdoptadaM * 100, 0)} cm
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Área real {fmt(resultado.cortante.areaRealCm2PorM)} cm²/m ≥ necesaria{" "}
                      {fmt(resultado.cortante.a90Cm2PorM)} cm²/m
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "k", valor: fmt(resultado.cortante.k, 3) },
                      { etiqueta: "ρl", valor: fmt(resultado.cortante.rhoL, 5) },
                      { etiqueta: "VRd,c", valor: `${fmt(resultado.cortante.vRdC)} kN` },
                      { etiqueta: "VRd,c,mín", valor: `${fmt(resultado.cortante.vRdCMin)} kN` },
                      { etiqueta: "Vd a resistir por estribos", valor: `${fmt(resultado.cortante.vEdEstribos)} kN` },
                      { etiqueta: "A90 necesaria", valor: `${fmt(resultado.cortante.a90NecCm2PorM)} cm²/m` },
                      { etiqueta: "A90 mínima", valor: `${fmt(resultado.cortante.a90MinCm2PorM)} cm²/m` },
                      { etiqueta: "Separación necesaria", valor: `${fmt(resultado.cortante.separacionNecM * 100, 1)} cm` },
                      { etiqueta: "Separación máxima admitida", valor: `${fmt(resultado.cortante.separacionMaxM * 100, 1)} cm` },
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
