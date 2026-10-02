"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ZapataCombinadaDiagrama } from "@/components/verificaciones/hormigon/ZapataCombinadaDiagrama";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataCombinada } from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisPosicionPilares,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-combinada")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Pilares" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos: no se puede calcular. La posición del pilar 2 debe ser mayor que la del pilar 1 y no superar A.",
    });
  } else if (!resultado.zapata.dentroDelNucleo) {
    avisos.push({ tipo: "aviso", texto: "La resultante de los dos pilares sale del núcleo central (±A/6)." });
  }

  const elevacion = diagrama ? (
    <ZapataCombinadaDiagrama {...diagrama} />
  ) : (
    <CroquisPosicionPilares cantidad={2} />
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
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="Zapata que recibe dos pilares, tratada como viga sobre el terreno.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales y suelo">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="sigmaAdmisible" etiqueta="σ adm. suelo" sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Zapata">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CampoNumerico id="A" etiqueta="A (largo)" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="B" etiqueta="B (ancho)" sufijo="m" valor={B} onChange={setB} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={elevacion}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Pilares y cargas" descripcion="Posición medida desde el extremo izquierdo y carga característica de cada pilar.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="pos1" etiqueta="Pilar 1 · posición" sufijo="m" valor={pos1} onChange={setPos1} />
                <CampoNumerico id="Nk1" etiqueta="Pilar 1 · Nk" sufijo="kN" valor={Nk1} onChange={setNk1} />
                <CampoNumerico id="pos2" etiqueta="Pilar 2 · posición" sufijo="m" valor={pos2} onChange={setPos2} />
                <CampoNumerico id="Nk2" etiqueta="Pilar 2 · Nk" sufijo="kN" valor={Nk2} onChange={setNk2} />
              </div>
            }
            dibujo={elevacion}
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Inferior para el momento positivo, superior para el negativo y reparto transversal.">
          <div className="space-y-5">
            <Subgrupo titulo="Longitudinal">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoDiametro id="diametroInferior" etiqueta="Inferior · Ø" valor={diametroInferior} onChange={setDiametroInferior} />
                <CampoNumerico id="separacionInferior" etiqueta="Inferior · separación" sufijo="m" valor={separacionInferior} onChange={setSeparacionInferior} />
                <CampoDiametro id="diametroSuperior" etiqueta="Superior · Ø" valor={diametroSuperior} onChange={setDiametroSuperior} />
                <CampoNumerico id="separacionSuperior" etiqueta="Superior · separación" sufijo="m" valor={separacionSuperior} onChange={setSeparacionSuperior} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Reparto">
              <div className="max-w-xl">
                <EditorCapas
                  filas={[
                    {
                      posicion: "Reparto, por metro",
                      numero: { id: "numeroSecundario", valor: numeroSecundario, onChange: setNumeroSecundario },
                      diametro: { id: "diametroSecundario", valor: diametroSecundario, onChange: setDiametroSecundario },
                    },
                  ]}
                />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × B × H", valor: `${A} × ${B} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN`, derivado: true },
                    { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.excentricidadM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "No viene de la planilla: la zapata se trata como una viga sobre el terreno, con la reacción del suelo como carga y los pilares como apoyos.",
              "No incluye punzonamiento en cada pilar. Revisar antes de usar en obra.",
              "Cuantías mínimas heredadas de la planilla (EHE‑08); pendiente pasarlas al Anejo 19, art. 9.8.",
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
                    etiqueta: "tensión del terreno",
                    estado: resultado.zapata.geotecnico.verificaTension ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.geotecnico.sigmaKPa / aNumero(sigmaAdmisible),
                  },
                  {
                    etiqueta: "armadura inferior",
                    estado: resultado.zapata.inferior.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.inferior.asNecCm2PorM / resultado.zapata.inferior.asRealCm2PorM,
                  },
                  {
                    etiqueta: "armadura superior",
                    estado: resultado.zapata.superior.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.superior.asNecCm2PorM / resultado.zapata.superior.asRealCm2PorM,
                  },
                  {
                    etiqueta: "cortante",
                    estado: resultado.zapata.cortante.verificaCorte ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.cortante.vEdKN / resultado.zapata.cortante.vRdCKN,
                  },
                  {
                    etiqueta: "armadura de reparto",
                    estado: resultado.zapata.secundario.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.secundario.asNecCm2 / resultado.zapata.secundario.asRealCm2,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                  { etiqueta: "M+ máximo", valor: `${fmt(resultado.zapata.inferior.mKNm)} kN·m`, nota: `en x = ${fmt(resultado.zapata.inferior.posicionM, 2)} m` },
                  { etiqueta: "M− máximo", valor: `${fmt(resultado.zapata.superior.mKNm)} kN·m`, nota: `en x = ${fmt(resultado.zapata.superior.posicionM, 2)} m` },
                  { etiqueta: "Vd", valor: `${fmt(resultado.zapata.cortante.vEdKN)} kN`, nota: `VRd,c ${fmt(resultado.zapata.cortante.vRdCKN)} kN` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.zapata.geotecnico.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo geotécnico"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.excentricidadM, 3)} m` },
                      { etiqueta: "Núcleo central (±A/6)", valor: resultado.zapata.dentroDelNucleo ? "Dentro" : "Fuera" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones estructurales">
                <div>
                  <ResultadoCheck
                    etiqueta="Momento positivo · armadura inferior suficiente"
                    verifica={resultado.zapata.inferior.verificaAs}
                    detalle={`M = ${fmt(resultado.zapata.inferior.mKNm)} kN·m en x = ${fmt(resultado.zapata.inferior.posicionM, 2)} m`}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.zapata.inferior.asRealCm2PorM },
                      limite: { etiqueta: "As nec", valor: resultado.zapata.inferior.asNecCm2PorM },
                      unidad: "cm²/m", exige: "≥",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Momento negativo · armadura superior suficiente"
                    verifica={resultado.zapata.superior.verificaAs}
                    detalle={`M = ${fmt(resultado.zapata.superior.mKNm)} kN·m en x = ${fmt(resultado.zapata.superior.posicionM, 2)} m`}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.zapata.superior.asRealCm2PorM },
                      limite: { etiqueta: "As nec", valor: resultado.zapata.superior.asNecCm2PorM },
                      unidad: "cm²/m", exige: "≥",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante sin armadura transversal"
                    verifica={resultado.zapata.cortante.verificaCorte}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: resultado.zapata.cortante.vEdKN },
                      limite: { etiqueta: "VRd,c", valor: resultado.zapata.cortante.vRdCKN },
                      unidad: "kN", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura de reparto suficiente"
                    verifica={resultado.zapata.secundario.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.zapata.secundario.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.zapata.secundario.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
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
