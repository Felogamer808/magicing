"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { SeccionVigaDiagrama } from "@/components/verificaciones/SeccionVigaDiagrama";
import { SolicitacionesVigaDiagrama } from "@/components/verificaciones/SolicitacionesVigaDiagrama";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import {
  calcularAnclajeMm,
  calcularArmaduraPiel,
  calcularArmaduraSecundaria,
  calcularDeformaciones,
  calcularSeparacionBarrasCm,
} from "@/lib/calc/ec2/vigas-complementos";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularDisposicionArmadura,
  calcularFlexion,
} from "@/lib/calc/ec2/vigas-flexion-cortante";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt, describirCapas } from "@/lib/verificaciones/formato";
import {
  CroquisArmaduraFlexion,
  CroquisGeometriaViga,
  CroquisMateriales,
  CroquisRamasEstribo,
} from "@/components/verificaciones/croquis/CroquisViga";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-apeo")!;

export default function VigasApeoPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [b, setB] = useCampo("b", "0.4");
  const [h, setH] = useCampo("h", "0.7");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.03");

  const [momentoPos, setMomentoPos] = useCampo("momentoPos", "0");
  const [numeroPos, setNumeroPos] = useCampo("numeroPos", "4");
  const [diametroPos, setDiametroPos] = useCampo("diametroPos", "16");

  const [momentoNeg, setMomentoNeg] = useCampo("momentoNeg", "230");
  const [numeroNeg, setNumeroNeg] = useCampo("numeroNeg", "4");
  const [diametroNeg, setDiametroNeg] = useCampo("diametroNeg", "20");

  const [vd, setVd] = useCampo("vd", "550");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "8");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "4");

  const [numeroSec, setNumeroSec] = useCampo("numeroSec", "2");
  const [diametroSec, setDiametroSec] = useCampo("diametroSec", "16");
  const [numeroPiel, setNumeroPiel] = useCampo("numeroPiel", "6");
  const [diametroPiel, setDiametroPiel] = useCampo("diametroPiel", "8");

  const [luz, setLuz] = useCampo("luz", "6.2");
  const [flechaInst, setFlechaInst] = useCampo("flechaInst", "3");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck), fyk: aNumero(fyk),
      b: aNumero(b), h: aNumero(h), recubrimiento: aNumero(recubrimiento),
      momentoPos: aNumero(momentoPos), numeroPos: aNumero(numeroPos), diametroPos: aNumero(diametroPos),
      momentoNeg: aNumero(momentoNeg), numeroNeg: aNumero(numeroNeg), diametroNeg: aNumero(diametroNeg),
      vd: aNumero(vd), diametroEstribo: aNumero(diametroEstribo), numeroRamas: aNumero(numeroRamas),
      numeroSec: aNumero(numeroSec), diametroSec: aNumero(diametroSec),
      numeroPiel: aNumero(numeroPiel), diametroPiel: aNumero(diametroPiel),
      luz: aNumero(luz), flechaInst: aNumero(flechaInst),
    };

    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0)) return null;
    if (v.b <= 0 || v.h <= 0 || v.fck <= 0 || v.fyk <= 0) return null;
    if (v.numeroPos <= 0 || v.diametroPos <= 0 || v.numeroNeg <= 0 || v.diametroNeg <= 0) return null;
    if (v.numeroRamas <= 0 || v.diametroEstribo <= 0) return null;
    if (v.numeroSec <= 0 || v.diametroSec <= 0 || v.numeroPiel <= 0 || v.diametroPiel <= 0) return null;
    if (v.luz <= 0) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const armPos = { numero: v.numeroPos, diametroMm: v.diametroPos };
    const armNeg = { numero: v.numeroNeg, diametroMm: v.diametroNeg };
    const d = calcularCantoUtil(geometria, armPos);

    const flexionPositiva = calcularFlexion(materiales, geometria, d, { momento: v.momentoPos, armaduraReal: armPos });
    const flexionNegativa = calcularFlexion(materiales, geometria, d, { momento: v.momentoNeg, armaduraReal: armNeg });
    const cortante = calcularCortante(materiales, geometria, d, flexionNegativa.asRealCm2, {
      vd: v.vd, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas,
    });

    const secundaria = calcularArmaduraSecundaria(materiales, geometria, d, {
      numero: v.numeroSec, diametroMm: v.diametroSec,
    });
    const piel = calcularArmaduraPiel(geometria, d, v.numeroPiel, v.diametroPiel);
    const anclajeMm = calcularAnclajeMm(materiales, v.diametroPiel);
    const deformaciones = calcularDeformaciones(v.luz, v.flechaInst);

    const sepPos = calcularSeparacionBarrasCm(geometria, armPos, v.diametroEstribo);
    const sepNeg = calcularSeparacionBarrasCm(geometria, armNeg, v.diametroEstribo);

    return { d, flexionPositiva, flexionNegativa, cortante, secundaria, piel, anclajeMm, deformaciones, sepPos, sepNeg };
  }, [
    fck, fyk, b, h, recubrimiento,
    momentoPos, numeroPos, diametroPos, momentoNeg, numeroNeg, diametroNeg,
    vd, diametroEstribo, numeroRamas,
    numeroSec, diametroSec, numeroPiel, diametroPiel, luz, flechaInst,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      b: aNumero(b), h: aNumero(h), recubrimiento: aNumero(recubrimiento),
      numeroPos: aNumero(numeroPos), diametroPos: aNumero(diametroPos),
      numeroNeg: aNumero(numeroNeg), diametroNeg: aNumero(diametroNeg),
      diametroEstribo: aNumero(diametroEstribo),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0)) return null;
    if (v.b <= 0 || v.h <= 0 || v.numeroPos <= 0 || v.diametroPos <= 0 || v.numeroNeg <= 0 || v.diametroNeg <= 0 || v.diametroEstribo <= 0) return null;

    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const dispPos = calcularDisposicionArmadura(geometria, { numero: v.numeroPos, diametroMm: v.diametroPos });
    const dispNeg = calcularDisposicionArmadura(geometria, { numero: v.numeroNeg, diametroMm: v.diametroNeg });
    return {
      bM: v.b, hM: v.h, recubrimientoM: v.recubrimiento,
      dM: v.h - dispPos.distanciaCentroideM,
      armaduraPositiva: { diametroMm: v.diametroPos, capas: dispPos.capas },
      armaduraNegativa: { diametroMm: v.diametroNeg, capas: dispNeg.capas },
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

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Una viga de apeo se calcula igual que cualquier otra viga: lo que cambia es su rol
          estructural, no las fórmulas. Esta página incluye la verificación completa —
          además de flexión y cortante, la armadura secundaria y de piel, el anclaje y la flecha.
        </CardContent>
      </Card>

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
          />
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisMateriales />
              </div>
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisGeometriaViga />
              </div>
              <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Armadura positiva</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <div className="col-span-full">
                  <CroquisArmaduraFlexion numero={aNumero(numeroPos)} cara="inferior" />
                </div>
                <CampoNumerico id="momentoPos" etiqueta="Mmax+" sufijo="kN·m" valor={momentoPos} onChange={setMomentoPos} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="numeroPos" etiqueta="Nº barras" valor={numeroPos} onChange={setNumeroPos} />
                  <CampoNumerico id="diametroPos" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroPos} onChange={setDiametroPos} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Armadura negativa</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <div className="col-span-full">
                  <CroquisArmaduraFlexion numero={aNumero(numeroNeg)} cara="superior" />
                </div>
                <CampoNumerico id="momentoNeg" etiqueta="Mmax-" sufijo="kN·m" valor={momentoNeg} onChange={setMomentoNeg} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="numeroNeg" etiqueta="Nº barras" valor={numeroNeg} onChange={setNumeroNeg} />
                  <CampoNumerico id="diametroNeg" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroNeg} onChange={setDiametroNeg} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Cortante</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisRamasEstribo ramas={aNumero(numeroRamas)} />
              </div>
              <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
              <CampoNumerico id="diametroEstribo" etiqueta="φ estribo" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroEstribo} onChange={setDiametroEstribo} />
              <CampoNumerico id="numeroRamas" etiqueta="Nº ramas" valor={numeroRamas} onChange={setNumeroRamas} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Armadura secundaria</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="numeroSec" etiqueta="Nº barras" valor={numeroSec} onChange={setNumeroSec} />
                <CampoNumerico id="diametroSec" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroSec} onChange={setDiametroSec} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Armadura de piel</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="numeroPiel" etiqueta="Nº por cara" valor={numeroPiel} onChange={setNumeroPiel} />
                <CampoNumerico id="diametroPiel" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={diametroPiel} onChange={setDiametroPiel} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Deformaciones</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="luz" etiqueta="L" sufijo="m" valor={luz} onChange={setLuz} />
              <CampoNumerico id="flechaInst" etiqueta="f instantánea" sufijo="mm" valor={flechaInst} onChange={setFlechaInst} />
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
                <CardHeader><CardTitle className="text-base">Flexión positiva</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.flexionPositiva.verificaAs}
                    detalle={`As real ${fmt(resultado.flexionPositiva.asRealCm2)} cm² / As nec ${fmt(resultado.flexionPositiva.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura entra en el ancho disponible"
                    verifica={resultado.flexionPositiva.verificaEntraEnAncho}
                    detalle={`${describirCapas(resultado.flexionPositiva.capas)}${resultado.sepPos !== null ? ` · separación ${fmt(resultado.sepPos, 1)} cm` : ""}`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.d, 4)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionPositiva.mu, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionPositiva.omega, 5) },
                      { etiqueta: "As por momento", valor: `${fmt(resultado.flexionPositiva.asCalculadoCm2)} cm²` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.flexionPositiva.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.flexionPositiva.asMinGeometricoCm2)} cm²` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Flexión negativa</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.flexionNegativa.verificaAs}
                    detalle={`As real ${fmt(resultado.flexionNegativa.asRealCm2)} cm² / As nec ${fmt(resultado.flexionNegativa.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura entra en el ancho disponible"
                    verifica={resultado.flexionNegativa.verificaEntraEnAncho}
                    detalle={`${describirCapas(resultado.flexionNegativa.capas)}${resultado.sepNeg !== null ? ` · separación ${fmt(resultado.sepNeg, 1)} cm` : ""}`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cortante</CardTitle></CardHeader>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Armaduras complementarias</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura secundaria"
                    verifica={resultado.secundaria.verificaAs}
                    detalle={`As real ${fmt(resultado.secundaria.asRealCm2)} cm² / As nec ${fmt(resultado.secundaria.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura de piel (por cara)"
                    verifica={resultado.piel.verificaAs}
                    detalle={`As real ${fmt(resultado.piel.asRealCm2)} cm² / As nec ${fmt(resultado.piel.asNecCm2)} cm²`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Momento que absorbe la secundaria", valor: `${fmt(resultado.secundaria.momentoKNm)} kN·m` },
                      { etiqueta: "Longitud de anclaje (piel)", valor: `${fmt(resultado.anclajeMm, 0)} mm` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Deformaciones</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flecha admisible"
                    verifica={resultado.deformaciones.verificaFlecha}
                    detalle={`f total ${fmt(resultado.deformaciones.fTotalMm, 1)} mm / f adm ${fmt(resultado.deformaciones.fAdmMm, 1)} mm`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "f instantánea", valor: `${fmt(resultado.deformaciones.fInstMm, 1)} mm` },
                      { etiqueta: "f total = 2,5 · f inst", valor: `${fmt(resultado.deformaciones.fTotalMm, 1)} mm` },
                      { etiqueta: "f adm = mín(L/250, L/500+10mm)", valor: `${fmt(resultado.deformaciones.fAdmMm, 1)} mm` },
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
