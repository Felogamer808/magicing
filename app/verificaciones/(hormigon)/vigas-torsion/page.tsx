"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SeccionVigaDiagrama } from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";
import { SolicitacionesVigaDiagrama } from "@/components/verificaciones/hormigon/SolicitacionesVigaDiagrama";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularDisposicionArmadura } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { calcularVigaConTorsion } from "@/lib/calc/hormigon/vigas/torsion";
import { aNumero, fmt, describirCapas } from "@/lib/verificaciones/formato";
import {
  CroquisArmaduraFlexion,
  CroquisGeometriaViga,
  CroquisMateriales,
  CroquisRamasEstribo,
} from "@/components/verificaciones/croquis/CroquisViga";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-torsion")!;

export default function VigasTorsionPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [b, setB] = useCampo("b", "0.2");
  const [h, setH] = useCampo("h", "0.7");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.035");

  const [momentoPos, setMomentoPos] = useCampo("momentoPos", "219");
  const [numeroPos, setNumeroPos] = useCampo("numeroPos", "2");
  const [diametroPos, setDiametroPos] = useCampo("diametroPos", "25");

  const [momentoNeg, setMomentoNeg] = useCampo("momentoNeg", "235");
  const [numeroNeg, setNumeroNeg] = useCampo("numeroNeg", "2");
  const [diametroNeg, setDiametroNeg] = useCampo("diametroNeg", "25");

  const [vd, setVd] = useCampo("vd", "405");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "8");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "6");

  const [td, setTd] = useCampo("td", "30");

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
      td: aNumero(td),
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

    return calcularVigaConTorsion(materiales, geometria, {
      torsion: { td: v.td },
      momentoPositivo: v.momentoPos,
      momentoNegativo: v.momentoNeg,
      armaduraPositiva: { numero: v.numeroPos, diametroMm: v.diametroPos },
      armaduraNegativa: { numero: v.numeroNeg, diametroMm: v.diametroNeg },
      cortante: { vd: v.vd, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas },
    });
  }, [
    fck, fyk, b, h, recubrimiento,
    momentoPos, numeroPos, diametroPos,
    momentoNeg, numeroNeg, diametroNeg,
    vd, diametroEstribo, numeroRamas, td,
  ]);

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
    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0)) return null;
    if (v.b <= 0 || v.h <= 0 || v.numeroPos <= 0 || v.diametroPos <= 0 || v.numeroNeg <= 0 || v.diametroNeg <= 0 || v.diametroEstribo <= 0) {
      return null;
    }

    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const dispPos = calcularDisposicionArmadura(geometria, [{ numero: v.numeroPos, diametroMm: v.diametroPos }]);
    const dispNeg = calcularDisposicionArmadura(geometria, [{ numero: v.numeroNeg, diametroMm: v.diametroNeg }]);

    return {
      bM: v.b,
      hM: v.h,
      recubrimientoM: v.recubrimiento,
      dM: v.h - dispPos.distanciaCentroideM,
      armaduraPositiva: { capas: dispPos.filas },
      armaduraNegativa: { capas: dispNeg.filas },
      diametroEstriboMm: v.diametroEstribo,
    };
  }, [b, h, recubrimiento, numeroPos, diametroPos, numeroNeg, diametroNeg, diametroEstribo]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Vigas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

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

      <Card className="drafting-marks">
        <CardHeader>
          <CardTitle className="text-base">Solicitaciones</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-2">
          <SolicitacionesVigaDiagrama
            momentoPositivoKNm={aNumero(momentoPos) || 0}
            momentoNegativoKNm={aNumero(momentoNeg) || 0}
            cortanteKN={aNumero(vd) || 0}
            torsorKNm={aNumero(td) || 0}
          />
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Datos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisMateriales />
              </div>
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisGeometriaViga />
              </div>
              <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Torsión</CardTitle>
            </CardHeader>
            <CardContent>
              <CampoNumerico id="td" etiqueta="Td" sufijo="kN·m" valor={td} onChange={setTd} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura positiva</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <div className="col-span-full">
                  <CroquisArmaduraFlexion numero={aNumero(numeroPos)} cara="inferior" />
                </div>
                <CampoNumerico id="momentoPos" etiqueta="Mmax+" sufijo="kN·m" valor={momentoPos} onChange={setMomentoPos} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="numeroPos" etiqueta="Nº barras" valor={numeroPos} onChange={setNumeroPos} />
                  <CampoDiametro id="diametroPos" etiqueta="Ø" valor={diametroPos} onChange={setDiametroPos} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura negativa</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <div className="col-span-full">
                  <CroquisArmaduraFlexion numero={aNumero(numeroNeg)} cara="superior" />
                </div>
                <CampoNumerico id="momentoNeg" etiqueta="Mmax-" sufijo="kN·m" valor={momentoNeg} onChange={setMomentoNeg} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="numeroNeg" etiqueta="Nº barras" valor={numeroNeg} onChange={setNumeroNeg} />
                  <CampoDiametro id="diametroNeg" etiqueta="Ø" valor={diametroNeg} onChange={setDiametroNeg} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cortante</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisRamasEstribo ramas={aNumero(numeroRamas)} />
              </div>
              <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
              <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
              <CampoNumerico id="numeroRamas" etiqueta="Nº ramas" valor={numeroRamas} onChange={setNumeroRamas} />
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
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
                  <CardTitle className="text-base">Torsión</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Bielas comprimidas"
                    verifica={resultado.torsion.verificaBielas}
                    detalle={`Td ${fmt(aNumero(td))} kN·m / Tu1 ${fmt(resultado.torsion.tu1KNm)} kN·m`}
                  />
                  <ResultadoCheck
                    etiqueta="Interacción torsión + cortante"
                    verifica={resultado.verificaInteraccionBielas}
                    detalle={`Td/Tu1 + Vd/VRd,max = ${fmt(resultado.interaccionBielas, 3)} ≤ 1`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Las bielas son las mismas para los dos esfuerzos, así que no alcanza con que cada
                    uno verifique por separado: el articulado exige que la suma de los dos
                    aprovechamientos no pase de 1.
                  </p>
                  <Separator />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Aportes de la torsión a la armadura</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Transversal +{fmt(resultado.torsion.atCm2PorM)} cm²/m · Longitudinal{" "}
                      {fmt(resultado.torsion.alCm2)} cm² ({fmt(resultado.torsion.alPorCaraCm2)} cm² por cara)
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Espesor eficaz t = A/u", valor: `${fmt(resultado.torsion.tM, 4)} m` },
                      { etiqueta: "Perímetro medio ue", valor: `${fmt(resultado.torsion.ueM, 4)} m` },
                      { etiqueta: "Área encerrada Ae", valor: `${fmt(resultado.torsion.aeM2, 4)} m²` },
                      { etiqueta: "f1cd", valor: `${fmt(resultado.torsion.f1cdMPa)} MPa` },
                    ]}
                  />
                </CardContent>
              </Card>

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
                      { etiqueta: "d", valor: `${fmt(resultado.d, 4)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionPositiva.mu, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionPositiva.omega, 5) },
                      { etiqueta: "As por momento", valor: `${fmt(resultado.flexionPositiva.asCalculadoCm2)} cm²` },
                      { etiqueta: "+ Al/4 por torsión", valor: `${fmt(resultado.torsion.alPorCaraCm2)} cm²` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.flexionPositiva.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.flexionPositiva.asMinGeometricoCm2)} cm²` },
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
                      { etiqueta: "μ", valor: fmt(resultado.flexionNegativa.mu, 5) },
                      { etiqueta: "As por momento", valor: `${fmt(resultado.flexionNegativa.asCalculadoCm2)} cm²` },
                      { etiqueta: "+ Al/4 por torsión", valor: `${fmt(resultado.torsion.alPorCaraCm2)} cm²` },
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
                      Estribado: {fmt(aNumero(numeroRamas), 0)} ramas Ø{fmt(aNumero(diametroEstribo), 0)} cada{" "}
                      {fmt(resultado.cortante.separacionAdoptadaM * 100, 0)} cm
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Área real {fmt(resultado.cortante.areaRealCm2PorM)} cm²/m ≥ necesaria{" "}
                      {fmt(resultado.cortante.a90Cm2PorM)} cm²/m (incluye torsión)
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "k", valor: fmt(resultado.cortante.k, 3) },
                      { etiqueta: "ρl", valor: fmt(resultado.cortante.rhoL, 5) },
                      { etiqueta: "VRd,c", valor: `${fmt(resultado.cortante.vRdC)} kN` },
                      { etiqueta: "VRd,c,mín", valor: `${fmt(resultado.cortante.vRdCMin)} kN` },
                      { etiqueta: "A90 por cortante", valor: `${fmt(resultado.cortante.a90NecCm2PorM)} cm²/m` },
                      { etiqueta: "+ At por torsión", valor: `${fmt(resultado.torsion.atCm2PorM)} cm²/m` },
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
