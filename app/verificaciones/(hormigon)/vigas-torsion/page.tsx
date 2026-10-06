"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import {
  SeccionVigaDiagrama,
  type ElementoSeccionViga,
} from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";
import { ConvencionMomentosViga } from "@/components/verificaciones/hormigon/ConvencionMomentosViga";
import { EstriboLongitudinal, EstriboTransversal } from "@/components/verificaciones/hormigon/EstribosViga";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { PanelVinculos } from "@/components/verificaciones/comun/PanelVinculos";
import { VINCULOS_SERVICIO } from "@/lib/verificaciones/vinculos";
import { calcularDisposicionArmadura } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { aNumero, fmt, describirCapas } from "@/lib/verificaciones/formato";
import { GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverVigaTorsion } from "@/lib/calc/hormigon/vigas/resolver-torsion";
import { recomendarVigaTorsion } from "@/lib/verificaciones/recomendaciones/vigas-torsion";

const meta = registroVerificaciones.find((v) => v.id === "vigas-torsion")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y materiales" },
  { id: "solicitaciones", titulo: "Solicitaciones" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Qué parte de los dibujos corresponde a cada campo, para resaltarla con el foco. */
const ELEMENTO_DE_CAMPO: Record<string, ElementoSeccionViga | "positivo" | "negativo"> = {
  b: "b",
  h: "h",
  recubrimiento: "recubrimiento",
  numeroPos: "inferior",
  diametroPos: "inferior",
  numeroNeg: "superior",
  diametroNeg: "superior",
  diametroEstribo: "estribo",
  numeroRamas: "estribo",
  momentoPos: "positivo",
  momentoNeg: "negativo",
};

/** Motivo, para el detalle de la comprobación, cuando la sección queda sobrearmada. */
function motivoSobrearmada(f: { sobrearmada: boolean; mu: number; muLim: number }): string | undefined {
  return f.sobrearmada
    ? `μ = ${fmt(f.mu, 3)} > μlim = ${fmt(f.muLim, 3)}: el acero no llega a fluir. Hace falta armadura de compresión o más canto.`
    : undefined;
}

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

  const [foco, setFoco] = useState<string | null>(null);

  const campos = useMemo(
    () => ({ fck, fyk, b, h, recubrimiento, momentoPos, numeroPos, diametroPos, momentoNeg, numeroNeg, diametroNeg, vd, diametroEstribo, numeroRamas, td }),
    [fck, fyk, b, h, recubrimiento, momentoPos, numeroPos, diametroPos, momentoNeg, numeroNeg, diametroNeg, vd, diametroEstribo, numeroRamas, td]
  );
  const resultado = useMemo(() => resolverVigaTorsion(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarVigaTorsion(campos), [campos]);

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

    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento, diametroEstriboMm: v.diametroEstribo };
    const dispPos = calcularDisposicionArmadura(geometria, [{ numero: v.numeroPos, diametroMm: v.diametroPos }]);
    const dispNeg = calcularDisposicionArmadura(geometria, [{ numero: v.numeroNeg, diametroMm: v.diametroNeg }]);

    return {
      bM: v.b,
      hM: v.h,
      recubrimientoM: v.recubrimiento,
      dM: v.h - dispPos.distanciaCentroideM,
      dNegativoM: v.h - dispNeg.distanciaCentroideM,
      armaduraPositiva: { capas: dispPos.filas },
      armaduraNegativa: { capas: dispNeg.filas },
      diametroEstriboMm: v.diametroEstribo,
    };
  }, [b, h, recubrimiento, numeroPos, diametroPos, numeroNeg, diametroNeg, diametroEstribo]);

  const elementoFoco = foco ? (ELEMENTO_DE_CAMPO[foco.replace(/-otro$/, "")] ?? null) : null;
  const resaltarSeccion =
    elementoFoco && elementoFoco !== "positivo" && elementoFoco !== "negativo" ? elementoFoco : null;
  const resaltarMomento =
    elementoFoco === "positivo" || elementoFoco === "negativo" ? elementoFoco : null;
  const seguirFoco = {
    onFocus: (e: FocusEvent<HTMLElement>) => setFoco(e.target.id || null),
    onBlur: () => setFoco(null),
  };

  const noEntra = {
    inferior: resultado ? !resultado.flexionPositiva.verificaEntraEnAncho : false,
    superior: resultado ? !resultado.flexionNegativa.verificaEntraEnAncho : false,
  };

  const dibujoSeccion = diagrama ? (
    <SeccionVigaDiagrama {...diagrama} resaltar={resaltarSeccion} noEntra={noEntra} sinResumen />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">
      La sección se dibuja cuando la geometría y la armadura tienen valores válidos.
    </p>
  );

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });
  } else {
    if (resultado.flexionPositiva.sobrearmada)
      avisos.push({ tipo: "aviso", texto: "Con el momento positivo la sección queda sobrearmada: hace falta armadura de compresión o más canto." });
    if (resultado.flexionNegativa.sobrearmada)
      avisos.push({ tipo: "aviso", texto: "Con el momento negativo la sección queda sobrearmada: hace falta armadura de compresión o más canto." });
    if (noEntra.inferior) avisos.push({ tipo: "aviso", texto: "La armadura inferior no entra en el ancho disponible." });
    if (noEntra.superior) avisos.push({ tipo: "aviso", texto: "La armadura superior no entra en el ancho disponible." });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Vigas · verificación de sección</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12" {...seguirFoco}>
        <Etapa id="geometria" numero={1} titulo="Geometría y materiales" descripcion="La sección rectangular y los materiales que la forman.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Sección">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
                    <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El recubrimiento se mide de la cara exterior al estribo.
                  </p>
                </Subgrupo>
              </>
            }
            dibujo={dibujoSeccion}
          />
        </Etapa>

        <Etapa
          id="solicitaciones"
          numero={2}
          titulo="Solicitaciones"
          descripcion="Esfuerzos de cálculo ya mayorados, concomitantes en la misma sección. La herramienta no modela el vano."
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CampoNumerico id="momentoPos" etiqueta="M+ positivo" sufijo="kN·m" valor={momentoPos} onChange={setMomentoPos} />
              <CampoNumerico id="momentoNeg" etiqueta="M− negativo" sufijo="kN·m" valor={momentoNeg} onChange={setMomentoNeg} />
              <CampoNumerico id="vd" etiqueta="Vd cortante" sufijo="kN" valor={vd} onChange={setVd} />
              <CampoNumerico id="td" etiqueta="Td torsor" sufijo="kN·m" valor={td} onChange={setTd} />
            </div>
            <div className="flex justify-center">
              <ConvencionMomentosViga
                momentoPositivoKNm={aNumero(momentoPos) || 0}
                momentoNegativoKNm={aNumero(momentoNeg) || 0}
                resaltar={resaltarMomento}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Los momentos, el cortante y el torsor se cargan en valor absoluto. La torsión suma
              armadura longitudinal en las dos caras y transversal en los estribos.
            </p>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Barras longitudinales por cara y estribos.">
          <DatosConDibujo
            datos={
              <Subgrupo titulo="Longitudinal">
                <EditorCapas
                  filas={[
                    {
                      posicion: "Inferior",
                      numero: { id: "numeroPos", valor: numeroPos, onChange: setNumeroPos },
                      diametro: { id: "diametroPos", valor: diametroPos, onChange: setDiametroPos },
                    },
                    {
                      posicion: "Superior",
                      numero: { id: "numeroNeg", valor: numeroNeg, onChange: setNumeroNeg },
                      diametro: { id: "diametroNeg", valor: diametroNeg, onChange: setDiametroNeg },
                    },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  La inferior toma el momento positivo; la superior, el negativo. Cada una suma un
                  cuarto de la armadura longitudinal de torsión.
                </p>
              </Subgrupo>
            }
            dibujo={dibujoSeccion}
          />

          <div className="mt-10">
            <DatosConDibujo
              datos={
                <Subgrupo titulo="Transversal · estribos">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
                    <CampoNumerico id="numeroRamas" etiqueta="Nº de ramas" valor={numeroRamas} onChange={setNumeroRamas} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Las ramas son las patas verticales que cortan la sección en un mismo plano: un
                    estribo cerrado aporta 2. La separación la calcula la herramienta y aparece en los
                    resultados.
                  </p>
                </Subgrupo>
              }
              dibujo={
                <EstriboTransversal
                  ramas={aNumero(numeroRamas)}
                  diametroMm={aNumero(diametroEstribo)}
                  resaltado={resaltarSeccion === "estribo"}
                />
              }
            />
          </div>
        </Etapa>

        <Etapa
          id="revision"
          numero={4}
          titulo="Revisión"
          descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos."
        >
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "b × h", valor: `${b} × ${h} m` },
              { etiqueta: "Td", valor: `${td} kN·m` },
              ...(resultado
                ? [
                    { etiqueta: "Canto útil d⁺ / d⁻", valor: `${fmt(resultado.d, 3)} / ${fmt(resultado.dNegativo, 3)} m`, derivado: true },
                    { etiqueta: "Espesor eficaz tef", valor: `${fmt(resultado.torsion.tM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "γc = 1,5 y γs = 1,15: fcd = fck/γc, fyd = fyk/γs.",
              "Sección hueca equivalente con tef = A/u, no menor que 2 veces la distancia del borde al eje de la armadura longitudinal (Anejo 19, art. 6.3.2 (1)).",
              "Bielas a 45°: TRd,max = 2·ν·fcd·Ak·tef·sinθ·cosθ, con ν = 0,6·(1 − fck/250) (ec. 6.30).",
              "La armadura longitudinal de torsión se reparte en cuartos y cada cara suma uno a su armadura de flexión.",
              "Cortante con d⁻ y ρl de la armadura superior; fyd de estribos limitada a 400 MPa.",
              "La separación de estribos la dimensiona la herramienta: no es un dato.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionResultados
                comprobaciones={[
                  {
                    etiqueta: "bielas de torsión",
                    estado: resultado.torsion.verificaBielas ? "cumple" : "no-cumple",
                    utilizacion: aNumero(td) / resultado.torsion.tRdMaxKNm,
                    conPropuestas: !!rec.bielasTorsion,
                  },
                  {
                    etiqueta: "interacción torsión + cortante",
                    estado: resultado.verificaInteraccionBielas ? "cumple" : "no-cumple",
                    utilizacion: resultado.interaccionBielas,
                    conPropuestas: !!rec.interaccion,
                  },
                  {
                    etiqueta: "flexión positiva",
                    estado: resultado.flexionPositiva.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.flexionPositiva.asNecCm2 / resultado.flexionPositiva.asRealCm2,
                    conPropuestas: !!rec.positiva,
                  },
                  {
                    etiqueta: "flexión negativa",
                    estado: resultado.flexionNegativa.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.flexionNegativa.asNecCm2 / resultado.flexionNegativa.asRealCm2,
                    conPropuestas: !!rec.negativa,
                  },
                  {
                    etiqueta: "compresión oblicua del alma",
                    estado: resultado.cortante.verificaVRdMax ? "cumple" : "no-cumple",
                    utilizacion: aNumero(vd) / resultado.cortante.vRdMax,
                    conPropuestas: !!rec.bielas,
                  },
                  {
                    etiqueta: "armadura inferior en el ancho",
                    estado: resultado.flexionPositiva.verificaEntraEnAncho ? "cumple" : "no-cumple",
                    conPropuestas: !!rec.anchoInferior,
                  },
                  {
                    etiqueta: "armadura superior en el ancho",
                    estado: resultado.flexionNegativa.verificaEntraEnAncho ? "cumple" : "no-cumple",
                    conPropuestas: !!rec.anchoSuperior,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "TRd,max", valor: `${fmt(resultado.torsion.tRdMaxKNm)} kN·m`, nota: `Td ${fmt(aNumero(td))} kN·m` },
                  { etiqueta: "Al de torsión", valor: `${fmt(resultado.torsion.alCm2)} cm²`, nota: `${fmt(resultado.torsion.alPorCaraCm2)} cm² por cara` },
                  { etiqueta: "At de torsión", valor: `${fmt(resultado.torsion.atCm2PorM)} cm²/m`, nota: "se suma a los estribos" },
                  { etiqueta: "VRd,max", valor: `${fmt(resultado.cortante.vRdMax)} kN`, nota: `Vd ${fmt(aNumero(vd))} kN` },
                ]}
              />

              <Subgrupo titulo="Torsión">
                <div>
                  <ResultadoCheck
                    etiqueta="Torsión · bielas comprimidas"
                    verifica={resultado.torsion.verificaBielas}
                    comparacion={{
                      real: { etiqueta: "Td", valor: aNumero(td) },
                      limite: { etiqueta: "TRd,max", valor: resultado.torsion.tRdMaxKNm },
                      unidad: "kN·m", exige: "≤",
                    }}
                    recomendaciones={rec.bielasTorsion}
                  />
                  <ResultadoCheck
                    etiqueta="Interacción torsión + cortante en las bielas"
                    verifica={resultado.verificaInteraccionBielas}
                    detalle="Las bielas son las mismas para los dos esfuerzos: la suma no puede pasar de 1 (Anejo 19, art. 6.3.2 (4), ec. (6.29))."
                    comparacion={{
                      real: { etiqueta: "Td/TRd,max + Vd/VRd,max", valor: resultado.interaccionBielas },
                      limite: { etiqueta: "límite", valor: 1 },
                      unidad: "", exige: "≤", decimales: 3,
                    }}
                    recomendaciones={rec.interaccion}
                  />
                  <p className="pt-3 text-sm">
                    <span className="font-medium">
                      {resultado.soloArmaduraMinima ? "Basta con la armadura mínima" : "Hace falta armadura de torsión"}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}— Td/TRd,c + Vd/VRd,c = {fmt(resultado.interaccionFisuracion, 3)}{" "}
                      {resultado.soloArmaduraMinima ? "≤" : ">"} 1 (art. 6.3.2 (5), ec. (6.31)).
                    </span>
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo de la torsión"
                    filas={[
                      { etiqueta: "A/u", valor: `${fmt(resultado.torsion.tAreaPerimetroM, 4)} m` },
                      { etiqueta: "Mínimo 2·c (borde → eje de barra)", valor: `${fmt(resultado.torsion.tMinimoM, 4)} m` },
                      { etiqueta: "Espesor eficaz tef", valor: `${fmt(resultado.torsion.tM, 4)} m` },
                      { etiqueta: "Perímetro medio uk", valor: `${fmt(resultado.torsion.ueM, 4)} m` },
                      { etiqueta: "Área encerrada Ak", valor: `${fmt(resultado.torsion.aeM2, 4)} m²` },
                      { etiqueta: "ν = 0,6·(1 − fck/250)", valor: fmt(resultado.torsion.nu, 3) },
                      { etiqueta: "TRd,max = 2·ν·fcd·Ak·tef·sinθ·cosθ", valor: `${fmt(resultado.torsion.tRdMaxKNm)} kN·m` },
                      { etiqueta: "TRd,c = 2·Ak·tef·fctd", valor: `${fmt(resultado.torsion.tRdCKNm)} kN·m` },
                      { etiqueta: "At = Td/(2·Ak·fywd)", valor: `${fmt(resultado.torsion.atCm2PorM)} cm²/m` },
                      { etiqueta: "ΣAsl = Td·uk/(2·Ak·fyd)", valor: `${fmt(resultado.torsion.alCm2)} cm²` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Flexión y cortante">
                <div>
                  <ResultadoCheck
                    etiqueta="Flexión positiva · armadura inferior suficiente"
                    verifica={resultado.flexionPositiva.verificaAs}
                    detalle={motivoSobrearmada(resultado.flexionPositiva)}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.flexionPositiva.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.flexionPositiva.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.positiva}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de flexión positiva"
                    filas={[
                      { etiqueta: "d⁺", valor: `${fmt(resultado.d, 4)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionPositiva.mu, 5) },
                      { etiqueta: "μlim (el acero fluye)", valor: fmt(resultado.flexionPositiva.muLim, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionPositiva.omega, 5) },
                      { etiqueta: "As por momento", valor: `${fmt(resultado.flexionPositiva.asCalculadoCm2)} cm²` },
                      { etiqueta: "+ Al/4 por torsión", valor: `${fmt(resultado.torsion.alPorCaraCm2)} cm²` },
                      { etiqueta: "fctm,fl", valor: `${fmt(resultado.flexionPositiva.fctmFlMPa, 2)} MPa` },
                      {
                        etiqueta: "As,min",
                        formula: "b·h/4,8 · fctm,fl/fyd",
                        sustitucion: `${fmt(aNumero(b), 2)}·${fmt(aNumero(h), 2)}/4,8 · ${fmt(resultado.flexionPositiva.fctmFlMPa, 2)}/${fmt(aNumero(fyk) / GAMMA_S, 1)}`,
                        valor: `${fmt(resultado.flexionPositiva.asMinCm2)} cm² (Anejo 19, 9.2.1.1)`,
                      },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Flexión negativa · armadura superior suficiente"
                    verifica={resultado.flexionNegativa.verificaAs}
                    detalle={motivoSobrearmada(resultado.flexionNegativa)}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.flexionNegativa.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.flexionNegativa.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.negativa}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de flexión negativa"
                    filas={[
                      { etiqueta: "d⁻", valor: `${fmt(resultado.dNegativo, 4)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionNegativa.mu, 5) },
                      { etiqueta: "As por momento", valor: `${fmt(resultado.flexionNegativa.asCalculadoCm2)} cm²` },
                      { etiqueta: "+ Al/4 por torsión", valor: `${fmt(resultado.torsion.alPorCaraCm2)} cm²` },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante · compresión oblicua del alma"
                    verifica={resultado.cortante.verificaVRdMax}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: aNumero(vd) },
                      limite: { etiqueta: "VRd,max", valor: resultado.cortante.vRdMax },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.bielas}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas" detalle="disposición del armado, sin magnitudes que comparar">
                <div>
                  <ResultadoCheck
                    etiqueta="La armadura inferior entra en el ancho"
                    verifica={resultado.flexionPositiva.verificaEntraEnAncho}
                    detalle={describirCapas(resultado.flexionPositiva.capas)}
                    recomendaciones={rec.anchoInferior}
                  />
                  <ResultadoCheck
                    etiqueta="La armadura superior entra en el ancho"
                    verifica={resultado.flexionNegativa.verificaEntraEnAncho}
                    detalle={describirCapas(resultado.flexionNegativa.capas)}
                    recomendaciones={rec.anchoSuperior}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Estribado adoptado" detalle="dimensionamiento, no verificación">
                <DatosConDibujo
                  datos={
                    <>
                      <p className="font-mono text-base font-semibold tabular-nums">
                        {fmt(aNumero(numeroRamas), 0)} ramas Ø{fmt(aNumero(diametroEstribo), 0)} cada{" "}
                        {fmt(resultado.cortante.separacionAdoptadaM * 100, 0)} cm
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Área resultante {fmt(resultado.cortante.areaRealCm2PorM)} cm²/m; necesaria{" "}
                        {fmt(resultado.cortante.a90Cm2PorM)} cm²/m, que ya incluye la de torsión.
                      </p>
                      <PanelFormulas
                        titulo="Ver desarrollo del cortante"
                        filas={[
                          { etiqueta: "d⁻", valor: `${fmt(resultado.dNegativo, 3)} m` },
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
                    </>
                  }
                  dibujo={
                    <EstriboLongitudinal
                      separacionM={resultado.cortante.separacionAdoptadaM}
                      diametroMm={aNumero(diametroEstribo)}
                    />
                  }
                />
              </Subgrupo>

              <PanelVinculos
                vinculos={VINCULOS_SERVICIO}
                datos={{
                  fck, fyk, b, h, recubrimiento,
                  numeroPos, diametroPos,
                  diametroNeg,
                  dUtilM: resultado.d,
                  // Esta As necesaria ya trae sumado el aporte longitudinal de
                  // torsión (Al/4 por cara), que es lo que hay que arrastrar:
                  // es la armadura que el ELU realmente exige en esta viga.
                  asNecPosCm2: resultado.flexionPositiva.asNecCm2,
                  asRealPosCm2: resultado.flexionPositiva.asRealCm2,
                }}
              />
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
