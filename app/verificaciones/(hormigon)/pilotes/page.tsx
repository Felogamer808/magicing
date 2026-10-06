"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { PiloteDiagrama } from "@/components/verificaciones/hormigon/PiloteDiagrama";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisArmaduraPilote,
  CroquisGeotecniaPilote,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-pilote";
import { recomendarPilote } from "@/lib/verificaciones/recomendaciones/pilotes";

const meta = registroVerificaciones.find((v) => v.id === "pilotes")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "suelo", titulo: "Terreno y carga" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function PilotesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [diametro, setDiametro] = useCampo("diametro", "0.4");
  const [longitud, setLongitud] = useCampo("longitud", "10");

  const [friccion, setFriccion] = useCampo("friccion", "30");
  const [punta, setPunta] = useCampo("punta", "800");
  const [factorSeguridad, setFactorSeguridad] = useCampo("factorSeguridad", "2.5");

  const [numero, setNumero] = useCampo("numero", "6");
  const [diametroBarra, setDiametroBarra] = useCampo("diametroBarra", "16");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "8");

  const [Nk, setNk] = useCampo("Nk", "300");

  const campos = useMemo(
    () => ({ fck, fyk, diametro, longitud, friccion, punta, factorSeguridad, numero, diametroBarra, diametroEstribo, Nk }),
    [fck, fyk, diametro, longitud, friccion, punta, factorSeguridad, numero, diametroBarra, diametroEstribo, Nk]
  );
  const resultado = useMemo(() => resolverPilote(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarPilote(campos), [campos]);

  const diagrama = useMemo(() => {
    const v = { diametro: aNumero(diametro), longitud: aNumero(longitud), numero: aNumero(numero), diametroBarra: aNumero(diametroBarra) };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    return { diametroM: v.diametro, longitudM: v.longitud, numeroBarras: v.numero, diametroBarraMm: v.diametroBarra };
  }, [diametro, longitud, numero, diametroBarra]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });

  const perfil = diagrama ? (
    <PiloteDiagrama {...diagrama} />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">
      El perfil se dibuja cuando la geometría y la armadura tienen valores válidos.
    </p>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría y materiales" descripcion="Pilote circular aislado.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilote">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="diametro" etiqueta="Diámetro" sufijo="m" valor={diametro} onChange={setDiametro} />
                    <CampoNumerico id="longitud" etiqueta="Longitud" sufijo="m" valor={longitud} onChange={setLongitud} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={perfil}
          />
        </Etapa>

        <Etapa id="suelo" numero={2} titulo="Terreno y carga" descripcion="Resistencias unitarias del estudio de suelos y carga característica.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="friccion" etiqueta="fs (fuste)" sufijo="kN/m²" valor={friccion} onChange={setFriccion} />
                <CampoNumerico id="punta" etiqueta="qp (punta)" sufijo="kN/m²" valor={punta} onChange={setPunta} />
                <CampoNumerico id="factorSeguridad" etiqueta="FS" valor={factorSeguridad} onChange={setFactorSeguridad} />
                <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
              </div>
            }
            dibujo={<CroquisGeotecniaPilote />}
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Barras longitudinales y zuncho.">
          <DatosConDibujo
            datos={
              <>
                <EditorCapas
                  filas={[
                    {
                      posicion: "Longitudinal",
                      numero: { id: "numero", valor: numero, onChange: setNumero },
                      diametro: { id: "diametroBarra", valor: diametroBarra, onChange: setDiametroBarra },
                    },
                  ]}
                />
                <div className="max-w-[12rem]">
                  <CampoDiametro id="diametroEstribo" etiqueta="Ø zuncho" valor={diametroEstribo} onChange={setDiametroEstribo} />
                </div>
              </>
            }
            dibujo={<CroquisArmaduraPilote />}
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Ø × L", valor: `${diametro} × ${longitud} m` },
              { etiqueta: "fs / qp", valor: `${friccion} / ${punta} kN/m²` },
              { etiqueta: "FS", valor: factorSeguridad },
            ]}
            hipotesis={[
              "No viene de la planilla: capacidad por la fórmula estática clásica (fuste + punta) dividida por FS.",
              "Estructural: compresión simple del EC2 con armadura mínima del art. 9.5.2.",
              "No incluye pandeo, flexión, efecto de grupo ni ensayos de carga. fs y qp deben salir del estudio de suelos.",
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
                    etiqueta: "capacidad geotécnica",
                    estado: resultado.pilote.geotecnico.verificaCapacidad ? "cumple" : "no-cumple",
                    utilizacion: aNumero(Nk) / resultado.pilote.geotecnico.qAdmisibleKN,
                    conPropuestas: !!rec.capacidad,
                  },
                  {
                    etiqueta: "compresión del fuste",
                    estado: resultado.pilote.estructural.verificaEstructural ? "cumple" : "no-cumple",
                    utilizacion: resultado.pilote.estructural.ndKN / resultado.pilote.estructural.nRdKN,
                    conPropuestas: !!rec.fuste,
                  },
                  {
                    etiqueta: "armadura mínima",
                    estado: resultado.pilote.estructural.verificaAsMin ? "cumple" : "no-cumple",
                    conPropuestas: !!rec.asMin,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Q admisible", valor: `${fmt(resultado.pilote.geotecnico.qAdmisibleKN)} kN`, nota: `Nk ${fmt(aNumero(Nk))} kN` },
                  { etiqueta: "Q fuste / punta", valor: `${fmt(resultado.pilote.geotecnico.qSkinKN)} / ${fmt(resultado.pilote.geotecnico.qTipKN)} kN` },
                  { etiqueta: "NRd", valor: `${fmt(resultado.pilote.estructural.nRdKN)} kN`, nota: `Nd ${fmt(resultado.pilote.estructural.ndKN)} kN` },
                  { etiqueta: "As", valor: `${fmt(resultado.pilote.estructural.areaAceroCm2)} cm²`, nota: `mín. ${fmt(resultado.pilote.estructural.asMinCm2)} cm²` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Carga admisible del pilote"
                    verifica={resultado.pilote.geotecnico.verificaCapacidad}
                    comparacion={{
                      real: { etiqueta: "Nk", valor: aNumero(Nk) },
                      limite: { etiqueta: "Q adm", valor: resultado.pilote.geotecnico.qAdmisibleKN },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.capacidad}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la capacidad"
                    filas={[
                      { etiqueta: "Perímetro", valor: `${fmt(resultado.pilote.geotecnico.perimetroM, 3)} m` },
                      { etiqueta: "Área de punta", valor: `${fmt(resultado.pilote.geotecnico.areaTipM2, 3)} m²` },
                      { etiqueta: "Capacidad por fuste", valor: `${fmt(resultado.pilote.geotecnico.qSkinKN)} kN` },
                      { etiqueta: "Capacidad de punta", valor: `${fmt(resultado.pilote.geotecnico.qTipKN)} kN` },
                      { etiqueta: "Capacidad última", valor: `${fmt(resultado.pilote.geotecnico.qUltKN)} kN` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones estructurales">
                <div>
                  <ResultadoCheck
                    etiqueta="Compresión simple del fuste"
                    verifica={resultado.pilote.estructural.verificaEstructural}
                    comparacion={{
                      real: { etiqueta: "Nd", valor: resultado.pilote.estructural.ndKN },
                      limite: { etiqueta: "NRd", valor: resultado.pilote.estructural.nRdKN },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.fuste}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura mínima (EC2 9.5.2)"
                    verifica={resultado.pilote.estructural.verificaAsMin}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.pilote.estructural.areaAceroCm2 },
                      limite: { etiqueta: "As mín", valor: resultado.pilote.estructural.asMinCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.asMin}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
