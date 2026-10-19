"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { CroquisGeometriaCabezal } from "@/components/verificaciones/croquis/CroquisCabezal";
import { DiagramaBielasTirante } from "@/components/verificaciones/hormigon/DiagramaBielasTirante";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { DiagramaCabezal } from "@/components/verificaciones/hormigon/DiagramaCabezal";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverCabezal } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal";
import { recomendarCabezal } from "@/lib/verificaciones/recomendaciones/cabezal-pilotes";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";

const meta = registroVerificaciones.find((v) => v.id === "cabezales")!;

const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function CabezalPilotesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [rg, setRg] = useCampo("rg", "0.05");

  const [anchoPilar, setAnchoPilar] = useCampo("anchoPilar", "0.3");
  const [ladoX, setLadoX] = useCampo("ladoX", "1.6");
  const [ladoY, setLadoY] = useCampo("ladoY", "0.6");
  const [hCab, setHCab] = useCampo("hCab", "0.6");
  const [dPilote, setDPilote] = useCampo("dPilote", "0.5");
  const [ndPilar, setNdPilar] = useCampo("ndPilar", "1040");

  const [nPrinc, setNPrinc] = useCampo("nPrinc", "7");
  const [phiPrinc, setPhiPrinc] = useCampo("phiPrinc", "16");
  const [nSec, setNSec] = useCampo("nSec", "7");
  const [phiSec, setPhiSec] = useCampo("phiSec", "10");
  const [nEstV, setNEstV] = useCampo("nEstV", "10");
  const [phiEstV, setPhiEstV] = useCampo("phiEstV", "8");
  const [nCercos, setNCercos] = useCampo("nCercos", "2");
  const [nEstH, setNEstH] = useCampo("nEstH", "5");
  const [phiEstH, setPhiEstH] = useCampo("phiEstH", "10");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const campos = useMemo(
    () => ({ fck, fyk, rg, anchoPilar, ladoX, ladoY, hCab, dPilote, ndPilar, nPrinc, phiPrinc, nSec, phiSec, nEstV, phiEstV, nCercos, nEstH, phiEstH, formaAnclaje }),
    [fck, fyk, rg, anchoPilar, ladoX, ladoY, hCab, dPilote, ndPilar, nPrinc, phiPrinc, nSec, phiSec, nEstV, phiEstV, nCercos, nEstH, phiEstH, formaAnclaje]
  );
  const resultado = useMemo(() => resolverCabezal(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarCabezal(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular. Hacen falta al menos 2 barras en la principal y en la secundaria." });
  }

  const modelo = resultado ? (
    <DiagramaCabezal
      ladoXM={resultado.n.ladoX}
      hM={resultado.n.hCab}
      anchoPilarM={resultado.n.anchoPilar}
      diametroPiloteM={resultado.n.dPilote}
      separacionPilotesM={resultado.r.principal.separacionPilotesM}
    />
  ) : (
    <CroquisGeometriaCabezal />
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · bielas y tirantes</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y carga" descripcion="Cabezal sobre dos pilotes y el axil que baja el pilar.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="rg" etiqueta="Recubrimiento" sufijo="m" valor={rg} onChange={setRg} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Cabezal y pilotes">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="ladoX" etiqueta="Lado x" sufijo="m" valor={ladoX} onChange={setLadoX} />
                    <CampoNumerico id="ladoY" etiqueta="Lado y" sufijo="m" valor={ladoY} onChange={setLadoY} />
                    <CampoNumerico id="hCab" etiqueta="H" sufijo="m" valor={hCab} onChange={setHCab} />
                    <CampoNumerico id="dPilote" etiqueta="D pilote" sufijo="m" valor={dPilote} onChange={setDPilote} />
                    <CampoNumerico id="anchoPilar" etiqueta="Ancho pilar" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Carga">
                  <div className="max-w-[12rem]">
                    <CampoNumerico id="ndPilar" etiqueta="Nd pilar" sufijo="kN" valor={ndPilar} onChange={setNdPilar} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={modelo}
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Armadura" descripcion="Tirante principal, secundaria y estribos.">
          <div className="space-y-6">
            <Subgrupo titulo="Longitudinal">
              <div className="max-w-xl">
                <EditorCapas
                  filas={[
                    {
                      posicion: "Principal (tirante)",
                      numero: { id: "nPrinc", valor: nPrinc, onChange: setNPrinc },
                      diametro: { id: "phiPrinc", valor: phiPrinc, onChange: setPhiPrinc },
                    },
                    {
                      posicion: "Secundaria",
                      numero: { id: "nSec", valor: nSec, onChange: setNSec },
                      diametro: { id: "phiSec", valor: phiSec, onChange: setPhiSec },
                    },
                  ]}
                />
              </div>
              <div className="max-w-xs pt-4">
                <CampoSeleccion
                  id="formaAnclaje"
                  etiqueta="Extremo del tirante"
                  valor={FORMAS[formaAnclaje]}
                  opciones={Object.values(FORMAS)}
                  onChange={(v) => setFormaAnclaje(formaPorNombre(v))}
                />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Estribos">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <CampoNumerico id="nEstV" etiqueta="Verticales · Nº" valor={nEstV} onChange={setNEstV} />
                <CampoDiametro id="phiEstV" etiqueta="Verticales · Øt" valor={phiEstV} onChange={setPhiEstV} />
                <CampoNumerico id="nCercos" etiqueta="Cercos" valor={nCercos} onChange={setNCercos} />
                <CampoNumerico id="nEstH" etiqueta="Horizontales · Nº" valor={nEstH} onChange={setNEstH} />
                <CampoDiametro id="phiEstH" etiqueta="Horizontales · Øl" valor={phiEstH} onChange={setPhiEstH} />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "x × y × H", valor: `${ladoX} × ${ladoY} × ${hCab} m` },
              { etiqueta: "Nd pilar", valor: `${ndPilar} kN` },
              ...(resultado
                ? [
                    { etiqueta: "Separación de pilotes", valor: `${fmt(resultado.r.principal.separacionPilotesM)} m`, derivado: true },
                    { etiqueta: "Inclinación de la biela", valor: `${fmt(resultado.r.bielas.anguloBielaGrados, 1)}°`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Modelo de bielas y tirantes: la carga baja por dos bielas hasta los pilotes y el tirante inferior las cose.",
              "Separación de pilotes s = 2,5·D.",
              "El nudo bajo el pilar no se comprueba: el pilar ya está dimensionado para ese axil.",
              "Separación de estribos verticales con n−1, igual que el resto de las separaciones de la planilla.",
              "Malla de las caras por el art. 9.7 (vigas de gran canto), por analogía: los encepados están fuera del Anejo 19 (art. 9.8.1). Por cara y dirección, máx(0,1 %·lado y; 1,5 cm²/m), separación ≤ mín(30 cm; 2·lado y). Cuenta la rama exterior de cada cerco.",
              "Anclaje del tirante por el art. 8.4, desde la cara interior del pilote (art. 6.5.4 (7)) hasta el borde menos el recubrimiento, sobre el eje de la barra; con patilla suma la pata hasta H − 2·rec. σsd = Td/As real con tope fyd, buena adherencia, α3 = α5 = 1.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
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
                    etiqueta: "tirante",
                    estado: resultado.r.principal.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.r.principal.asNecCm2 / resultado.r.principal.asRealCm2,
                    conPropuestas: !!rec.tirante,
                  },
                  {
                    etiqueta: "anclaje del tirante",
                    estado: resultado.r.principal.verificaAnclaje ? "cumple" : "no-cumple",
                    utilizacion: resultado.r.principal.lbdMm / resultado.r.principal.disponibleAnclajeMm,
                    conPropuestas: !!rec.anclaje,
                  },
                  {
                    etiqueta: "biela",
                    estado: resultado.r.bielas.verificaBiela ? "cumple" : "no-cumple",
                    utilizacion: resultado.r.bielas.sigmaBielaMPa / resultado.r.bielas.sigmaBielaMaxMPa,
                    conPropuestas: !!rec.biela,
                  },
                  {
                    etiqueta: "nudo sobre el pilote",
                    estado: resultado.r.bielas.verificaNudo ? "cumple" : "no-cumple",
                    utilizacion: resultado.r.bielas.sigmaNudoMPa / resultado.r.bielas.sigmaNudoMaxMPa,
                    conPropuestas: !!rec.nudo,
                  },
                  {
                    etiqueta: "armadura secundaria",
                    estado: resultado.r.secundaria.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.r.secundaria.asNecCm2 / resultado.r.secundaria.asRealCm2,
                    conPropuestas: !!rec.secundaria,
                  },
                  {
                    etiqueta: "estribos verticales",
                    estado: resultado.r.estribosVerticales.verificaAs && resultado.r.estribosVerticales.verificaSeparacion ? "cumple" : "no-cumple",
                    utilizacion: Math.max(resultado.r.estribosVerticales.asNecCm2 / resultado.r.estribosVerticales.asRealCm2, resultado.r.estribosVerticales.separacionM / resultado.r.estribosVerticales.separacionMaxM),
                    conPropuestas: !!rec.estribosV,
                  },
                  {
                    etiqueta: "estribos horizontales",
                    estado: resultado.r.estribosHorizontales.verificaAs && resultado.r.estribosHorizontales.verificaSeparacion ? "cumple" : "no-cumple",
                    utilizacion: Math.max(resultado.r.estribosHorizontales.asNecCm2 / resultado.r.estribosHorizontales.asRealCm2, resultado.r.estribosHorizontales.separacionM / resultado.r.estribosHorizontales.separacionMaxM),
                    conPropuestas: !!rec.estribosH,
                  },
                  {
                    etiqueta: "barras en el ancho",
                    estado: resultado.r.principal.verificaBNec ? "cumple" : "no-cumple",
                    conPropuestas: !!rec.ancho,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Td del tirante", valor: `${fmt(resultado.r.principal.tdKN)} kN` },
                  { etiqueta: "Nd por pilote", valor: `${fmt(resultado.r.principal.ndPorPiloteKN)} kN` },
                  { etiqueta: "θ biela", valor: `${fmt(resultado.r.bielas.anguloBielaGrados, 1)}°` },
                  { etiqueta: "As nec. tirante", valor: `${fmt(resultado.r.principal.asNecCm2)} cm²`, nota: `colocada ${fmt(resultado.r.principal.asRealCm2)} cm²` },
                ]}
              />

              <Subgrupo titulo="Tirante">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura principal suficiente"
                    verifica={resultado.r.principal.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.r.principal.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.r.principal.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.tirante}
                  />
                  <div className="mx-auto w-full max-w-xl pt-4">
                    <DiagramaBielasTirante
                      separacionPilotesM={resultado.r.principal.separacionPilotesM}
                      vM={resultado.r.principal.vM}
                      hM={aNumero(hCab)}
                      dM={resultado.r.principal.dM}
                      anchoPilarM={aNumero(anchoPilar)}
                      diametroPiloteM={aNumero(dPilote)}
                      ndPilarKN={aNumero(ndPilar)}
                      ndPorPiloteKN={resultado.r.principal.ndPorPiloteKN}
                      tdKN={resultado.r.principal.tdKN}
                    />
                  </div>
                  <p className="pt-2 text-xs text-muted-foreground">
                    El cabezal no trabaja como viga: la armadura sale de la geometría del triángulo de
                    bielas y no de un momento flector.
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo del tirante"
                    filas={[
                      { etiqueta: "Separación de pilotes s = 2,5·D", valor: `${fmt(resultado.r.principal.separacionPilotesM)} m` },
                      { etiqueta: "Brazo v", valor: `${fmt(resultado.r.principal.vM, 3)} m` },
                      { etiqueta: "d", valor: `${fmt(resultado.r.principal.dM, 3)} m` },
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.r.principal.pesoPropioKN)} kN` },
                      { etiqueta: "Nd por pilote", valor: `${fmt(resultado.r.principal.ndPorPiloteKN)} kN` },
                      { etiqueta: "Td (tracción del tirante)", valor: `${fmt(resultado.r.principal.tdKN)} kN` },
                      { etiqueta: "σsd en el anclaje", valor: `${fmt(resultado.r.principal.sigmaSdAnclajeMPa)} MPa` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Anclaje del tirante" detalle="art. 8.4 y 6.5.4 (7)">
                <div>
                  <ResultadoCheck
                    etiqueta="Largo disponible desde la cara interior del pilote"
                    verifica={resultado.r.principal.verificaAnclaje}
                    detalle={FORMAS[formaAnclaje].toLowerCase()}
                    comparacion={{
                      real: { etiqueta: "disponible", valor: resultado.r.principal.disponibleAnclajeMm },
                      limite: { etiqueta: "lbd", valor: resultado.r.principal.lbdMm },
                      unidad: "mm", exige: "≥", decimales: 0,
                    }}
                    recomendaciones={rec.anclaje}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Bielas y nudos">
                <div>
                  <ResultadoCheck
                    etiqueta="Compresión en la biela"
                    verifica={resultado.r.bielas.verificaBiela}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.bielas.sigmaBielaMPa },
                      limite: { etiqueta: "0,6·ν′·fcd", valor: resultado.r.bielas.sigmaBielaMaxMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                    recomendaciones={rec.biela}
                  />
                  <ResultadoCheck
                    etiqueta="Compresión en el nudo sobre el pilote"
                    verifica={resultado.r.bielas.verificaNudo}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.bielas.sigmaNudoMPa },
                      limite: { etiqueta: "0,85·ν′·fcd", valor: resultado.r.bielas.sigmaNudoMaxMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                    recomendaciones={rec.nudo}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de bielas y nudos"
                    filas={[
                      { etiqueta: "Inclinación de la biela θ", valor: `${fmt(resultado.r.bielas.anguloBielaGrados, 1)}°` },
                      { etiqueta: "Tope de la biela (con tracción transversal)", valor: `${fmt(resultado.r.bielas.sigmaBielaMaxMPa)} MPa` },
                      { etiqueta: "Tope del nudo (tirante en una dirección)", valor: `${fmt(resultado.r.bielas.sigmaNudoMaxMPa)} MPa` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Armaduras complementarias">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura secundaria (10 % de la principal)"
                    verifica={resultado.r.secundaria.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.r.secundaria.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.r.secundaria.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.secundaria}
                  />
                  <ResultadoCheck
                    etiqueta="Estribos verticales · malla de cara (art. 9.7)"
                    verifica={resultado.r.estribosVerticales.verificaAs && resultado.r.estribosVerticales.verificaSeparacion}
                    detalle={`cada ${fmt(resultado.r.estribosVerticales.separacionM * 100, 0)} cm (máx. ${fmt(resultado.r.estribosVerticales.separacionMaxM * 100, 0)} cm)`}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.r.estribosVerticales.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.r.estribosVerticales.asNecCm2 },
                      unidad: "cm²/m", exige: "≥",
                    }}
                    recomendaciones={rec.estribosV}
                  />
                  <ResultadoCheck
                    etiqueta="Estribos horizontales · malla de cara (art. 9.7)"
                    verifica={resultado.r.estribosHorizontales.verificaAs && resultado.r.estribosHorizontales.verificaSeparacion}
                    detalle={`cada ${fmt(resultado.r.estribosHorizontales.separacionM * 100, 0)} cm (máx. ${fmt(resultado.r.estribosHorizontales.separacionMaxM * 100, 0)} cm)`}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.r.estribosHorizontales.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.r.estribosHorizontales.asNecCm2 },
                      unidad: "cm²/m", exige: "≥",
                    }}
                    recomendaciones={rec.estribosH}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas" detalle="disposición del armado">
                <div>
                  <ResultadoCheck
                    etiqueta="Las barras del tirante entran en el ancho del cabezal"
                    verifica={resultado.r.principal.verificaBNec}
                    detalle={`separación ${fmt(resultado.r.principal.separacionMm, 0)} mm`}
                    comparacion={{
                      real: { etiqueta: "b nec", valor: resultado.r.principal.bNecM },
                      limite: { etiqueta: "lado y", valor: resultado.n.ladoY },
                      unidad: "m", exige: "≤", decimales: 3,
                    }}
                    recomendaciones={rec.ancho}
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
