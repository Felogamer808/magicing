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
import { ZapataCorridaDiagrama } from "@/components/verificaciones/hormigon/ZapataCorridaDiagrama";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisZapataCorrida,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-corrida")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });

  const corte = diagrama ? (
    <ZapataCorridaDiagrama {...diagrama} />
  ) : (
    <CroquisZapataCorrida />
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · verificación por metro corrido</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="Corte transversal de la zapata, por metro corrido.">
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
                <Subgrupo titulo="Zapata y muro">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="A" etiqueta="A (ancho)" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="anchoPilar" etiqueta="Ancho muro/pilar" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={corte}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Esfuerzos característicos por metro corrido.">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN/m" valor={Nk} onChange={setNk} />
            <CampoNumerico id="MkA" etiqueta="Mk" sufijo="kN·m/m" valor={MkA} onChange={setMkA} />
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Principal transversal al muro y de reparto a lo largo.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Principal">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="diametroPrincipal" etiqueta="Ø" valor={diametroPrincipal} onChange={setDiametroPrincipal} />
                    <CampoNumerico id="separacionPrincipal" etiqueta="Separación" sufijo="m" valor={separacionPrincipal} onChange={setSeparacionPrincipal} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Reparto">
                  <EditorCapas
                    filas={[
                      {
                        posicion: "Reparto, por metro",
                        numero: { id: "numeroSecundario", valor: numeroSecundario, onChange: setNumeroSecundario },
                        diametro: { id: "diametroSecundario", valor: diametroSecundario, onChange: setDiametroSecundario },
                      },
                    ]}
                  />
                </Subgrupo>
              </>
            }
            dibujo={corte}
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × H", valor: `${A} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN/m`, derivado: true },
                    { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m`, derivado: true },
                    { etiqueta: "Tipo", valor: resultado.zapata.esRigida ? "rígida (vuelo ≤ 2H)" : "flexible (vuelo > 2H)", derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Cálculo por metro corrido de zapata.",
              "La tensión sobre el terreno incluye el peso propio de la zapata.",
              "Cuantías mínimas mecánica y geométrica heredadas de la planilla (EHE‑08); pendiente pasarlas al Anejo 19, art. 9.8.",
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
                    etiqueta: "armadura principal",
                    estado: resultado.zapata.principal.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.principal.asNecCm2PorM / resultado.zapata.principal.asRealCm2PorM,
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
                  { etiqueta: "d", valor: `${fmt(resultado.zapata.principal.dM, 3)} m` },
                  { etiqueta: "As nec. principal", valor: `${fmt(resultado.zapata.principal.asNecCm2PorM)} cm²/m` },
                  { etiqueta: "As nec. reparto", valor: `${fmt(resultado.zapata.secundario.asNecCm2)} cm²` },
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
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN/m` },
                      { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m` },
                      { etiqueta: "Zapata rígida (vuelo ≤ 2H)", valor: resultado.zapata.esRigida ? "Sí" : "No" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones estructurales">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura principal suficiente"
                    verifica={resultado.zapata.principal.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.zapata.principal.asRealCm2PorM },
                      limite: { etiqueta: "As nec", valor: resultado.zapata.principal.asNecCm2PorM },
                      unidad: "cm²/m", exige: "≥",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la armadura principal"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.zapata.principal.dM, 3)} m` },
                      { etiqueta: "σ máx / mín", valor: `${fmt(resultado.zapata.principal.sigmaMaxKPa)} / ${fmt(resultado.zapata.principal.sigmaMinKPa)} kN/m²` },
                      { etiqueta: "σ crítica", valor: `${fmt(resultado.zapata.principal.sigmaCriticaKPa)} kN/m²` },
                      { etiqueta: "Vuelo a sección crítica", valor: `${fmt(resultado.zapata.principal.lM, 3)} m` },
                      { etiqueta: "Td", valor: `${fmt(resultado.zapata.principal.tdKN)} kN` },
                      { etiqueta: "As mín. mecánico (planilla)", valor: `${fmt(resultado.zapata.principal.asMinMecanicoCm2PorM)} cm²/m` },
                      { etiqueta: "As mín. geométrico (planilla)", valor: `${fmt(resultado.zapata.principal.asMinGeometricoCm2PorM)} cm²/m` },
                      { etiqueta: "Longitud de anclaje", valor: `${fmt(resultado.zapata.principal.lbIMm, 0)} mm` },
                    ]}
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
