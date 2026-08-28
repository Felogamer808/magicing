"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SeccionVigaDiagrama } from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";
import { DiagramaRotura } from "@/components/verificaciones/hormigon/DiagramaRotura";
import { SolicitacionesVigaDiagrama } from "@/components/verificaciones/hormigon/SolicitacionesVigaDiagrama";
import {
  CroquisArmaduraFlexion,
  CroquisGeometriaViga,
  CroquisMateriales,
  CroquisRamasEstribo,
} from "@/components/verificaciones/croquis/CroquisViga";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { ArmaduraElegida } from "@/lib/calc/hormigon/comun/types";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularDisposicionArmadura,
  calcularFlexion,
} from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { aNumero, fmt, describirCapas } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-flexion-cortante")!;

/** Arma los grupos de armadura para el motor: la 2ª capa sólo entra si tiene barras cargadas. */
function armarGrupos(numero: number, diametroMm: number, numero2: number, diametroMm2: number): ArmaduraElegida[] {
  const grupos: ArmaduraElegida[] = [{ numero, diametroMm }];
  if (numero2 > 0) grupos.push({ numero: numero2, diametroMm: diametroMm2 });
  return grupos;
}

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
  const [numeroPos2, setNumeroPos2] = useCampo("numeroPos2", "0");
  const [diametroPos2, setDiametroPos2] = useCampo("diametroPos2", "10");

  const [momentoNeg, setMomentoNeg] = useCampo("momentoNeg", "14");
  const [numeroNeg, setNumeroNeg] = useCampo("numeroNeg", "5");
  const [diametroNeg, setDiametroNeg] = useCampo("diametroNeg", "12");
  const [numeroNeg2, setNumeroNeg2] = useCampo("numeroNeg2", "0");
  const [diametroNeg2, setDiametroNeg2] = useCampo("diametroNeg2", "12");

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
      numeroPos2: aNumero(numeroPos2),
      diametroPos2: aNumero(diametroPos2),
      momentoNeg: aNumero(momentoNeg),
      numeroNeg: aNumero(numeroNeg),
      diametroNeg: aNumero(diametroNeg),
      numeroNeg2: aNumero(numeroNeg2),
      diametroNeg2: aNumero(diametroNeg2),
      vd: aNumero(vd),
      diametroEstribo: aNumero(diametroEstribo),
      numeroRamas: aNumero(numeroRamas),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
    const geometriaValida = v.b > 0 && v.h > 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0;
    const armadurasValidas = v.numeroPos > 0 && v.diametroPos > 0 && v.numeroNeg > 0 && v.diametroNeg > 0;
    // La 2ª capa es opcional (0 barras = apagada), pero si tiene barras necesita diámetro.
    const segundasCapasValidas =
      (v.numeroPos2 === 0 || v.diametroPos2 > 0) && (v.numeroNeg2 === 0 || v.diametroNeg2 > 0);
    const cortanteValido = v.numeroRamas > 0 && v.diametroEstribo > 0;

    if (
      !todosValidos ||
      !geometriaValida ||
      !materialesValidos ||
      !armadurasValidas ||
      !segundasCapasValidas ||
      !cortanteValido
    ) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const gruposPositiva = armarGrupos(v.numeroPos, v.diametroPos, v.numeroPos2, v.diametroPos2);
    const gruposNegativa = armarGrupos(v.numeroNeg, v.diametroNeg, v.numeroNeg2, v.diametroNeg2);
    const d = calcularCantoUtil(geometria, gruposPositiva);

    const flexionPositiva = calcularFlexion(materiales, geometria, d, {
      momento: v.momentoPos,
      armaduraReal: gruposPositiva,
    });
    const flexionNegativa = calcularFlexion(materiales, geometria, d, {
      momento: v.momentoNeg,
      armaduraReal: gruposNegativa,
    });
    const cortante = calcularCortante(materiales, geometria, d, flexionNegativa.asRealCm2, {
      vd: v.vd,
      diametroEstriboMm: v.diametroEstribo,
      numeroRamas: v.numeroRamas,
    });

    return { materiales, d, flexionPositiva, flexionNegativa, cortante };
  }, [
    fck, fyk, b, h, recubrimiento,
    momentoPos, numeroPos, diametroPos, numeroPos2, diametroPos2,
    momentoNeg, numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
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
      numeroPos2: aNumero(numeroPos2),
      diametroPos2: aNumero(diametroPos2),
      numeroNeg: aNumero(numeroNeg),
      diametroNeg: aNumero(diametroNeg),
      numeroNeg2: aNumero(numeroNeg2),
      diametroNeg2: aNumero(diametroNeg2),
      diametroEstribo: aNumero(diametroEstribo),
    };

    const validos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
    const segundasCapasValidas =
      (v.numeroPos2 === 0 || v.diametroPos2 > 0) && (v.numeroNeg2 === 0 || v.diametroNeg2 > 0);
    if (
      !validos ||
      !segundasCapasValidas ||
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
    const gruposPositiva = armarGrupos(v.numeroPos, v.diametroPos, v.numeroPos2, v.diametroPos2);
    const gruposNegativa = armarGrupos(v.numeroNeg, v.diametroNeg, v.numeroNeg2, v.diametroNeg2);
    const disposicionPositiva = calcularDisposicionArmadura(geometria, gruposPositiva);
    const disposicionNegativa = calcularDisposicionArmadura(geometria, gruposNegativa);
    const d = geometria.h - disposicionPositiva.distanciaCentroideM;

    return {
      bM: v.b,
      hM: v.h,
      recubrimientoM: v.recubrimiento,
      dM: d,
      armaduraPositiva: { capas: disposicionPositiva.filas },
      armaduraNegativa: { capas: disposicionNegativa.filas },
      diametroEstriboMm: v.diametroEstribo,
    };
  }, [
    b, h, recubrimiento,
    numeroPos, diametroPos, numeroPos2, diametroPos2,
    numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
    diametroEstribo,
  ]);

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

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Columna de datos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiales</CardTitle>
            </CardHeader>
            <CardContent>
              <CroquisMateriales />
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría</CardTitle>
            </CardHeader>
            <CardContent>
              <CroquisGeometriaViga />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
                <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
                <CampoNumerico
                  id="recubrimiento"
                  etiqueta="Recubrimiento"
                  sufijo="m"
                  valor={recubrimiento}
                  onChange={setRecubrimiento}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura positiva</CardTitle>
              </CardHeader>
              <CardContent>
                <CroquisArmaduraFlexion
                  numero={aNumero(numeroPos) + Math.max(aNumero(numeroPos2), 0)}
                  cara="inferior"
                />
                <div className="grid grid-cols-1 gap-4">
                  <CampoNumerico
                    id="momentoPos"
                    etiqueta="Mmax+"
                    sufijo="kN·m"
                    valor={momentoPos}
                    onChange={setMomentoPos}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="numeroPos" etiqueta="Nº barras" valor={numeroPos} onChange={setNumeroPos} />
                    <CampoDiametro id="diametroPos" etiqueta="Ø" valor={diametroPos} onChange={setDiametroPos} />
                  </div>
                  {aNumero(numeroPos2) > 0 ? (
                    <div className="flex items-end gap-2">
                      <div className="grid flex-1 grid-cols-2 gap-4">
                        <CampoNumerico
                          id="numeroPos2"
                          etiqueta="Nº barras (2ª capa)"
                          valor={numeroPos2}
                          onChange={setNumeroPos2}
                        />
                        <CampoDiametro id="diametroPos2" etiqueta="Ø" valor={diametroPos2} onChange={setDiametroPos2} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar la segunda capa"
                        onClick={() => setNumeroPos2("0")}
                        className="mb-1.5"
                      >
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setNumeroPos2("2")}>
                      <Plus /> Agregar capa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Armadura negativa</CardTitle>
              </CardHeader>
              <CardContent>
                <CroquisArmaduraFlexion
                  numero={aNumero(numeroNeg) + Math.max(aNumero(numeroNeg2), 0)}
                  cara="superior"
                />
                <div className="grid grid-cols-1 gap-4">
                  <CampoNumerico
                    id="momentoNeg"
                    etiqueta="Mmax-"
                    sufijo="kN·m"
                    valor={momentoNeg}
                    onChange={setMomentoNeg}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="numeroNeg" etiqueta="Nº barras" valor={numeroNeg} onChange={setNumeroNeg} />
                    <CampoDiametro id="diametroNeg" etiqueta="Ø" valor={diametroNeg} onChange={setDiametroNeg} />
                  </div>
                  {aNumero(numeroNeg2) > 0 ? (
                    <div className="flex items-end gap-2">
                      <div className="grid flex-1 grid-cols-2 gap-4">
                        <CampoNumerico
                          id="numeroNeg2"
                          etiqueta="Nº barras (2ª capa)"
                          valor={numeroNeg2}
                          onChange={setNumeroNeg2}
                        />
                        <CampoDiametro id="diametroNeg2" etiqueta="Ø" valor={diametroNeg2} onChange={setDiametroNeg2} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar la segunda capa"
                        onClick={() => setNumeroNeg2("0")}
                        className="mb-1.5"
                      >
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setNumeroNeg2("2")}>
                      <Plus /> Agregar capa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cortante</CardTitle>
            </CardHeader>
            <CardContent>
              <CroquisRamasEstribo ramas={aNumero(numeroRamas)} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
                <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
                <CampoNumerico id="numeroRamas" etiqueta="Nº ramas" valor={numeroRamas} onChange={setNumeroRamas} />
              </div>
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
                  <DiagramaRotura
                    bM={aNumero(b)}
                    hM={aNumero(h)}
                    dM={resultado.flexionPositiva.d}
                    xM={resultado.flexionPositiva.xM}
                    zM={resultado.flexionPositiva.zM}
                    deformacionAcero={resultado.flexionPositiva.deformacionAcero}
                    deformacionFluencia={resultado.materiales.fyd / 200000}
                  />
                  <p className="text-xs text-muted-foreground">
                    El bloque rectangular equivalente tiene canto 0,8·x y tensión fcd. Lo que
                    interesa mirar es la deformación del acero: si queda por encima de la de
                    fluencia, la rotura avisa antes de producirse.
                  </p>
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
                      {
                        etiqueta: "Barras por fila (máx.)",
                        valor: resultado.flexionPositiva.capacidadPorGrupo.join(" + "),
                      },
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
                      {
                        etiqueta: "Barras por fila (máx.)",
                        valor: resultado.flexionNegativa.capacidadPorGrupo.join(" + "),
                      },
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
                      Estribado: {fmt(aNumero(numeroRamas), 0)} ramas Ø{fmt(aNumero(diametroEstribo), 0)} cada{" "}
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
