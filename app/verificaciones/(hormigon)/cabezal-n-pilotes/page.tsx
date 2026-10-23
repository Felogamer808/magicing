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
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoPilotes } from "@/components/verificaciones/hormigon/CampoPilotes";
import { DiagramaCabezalNPilotes } from "@/components/verificaciones/hormigon/DiagramaCabezalNPilotes";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { leerPilotes, resolverCabezalNPilotes } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-n-pilotes";
import type { ResultadoCriterioCabezalN, ResultadoDireccionCabezalN } from "@/lib/calc/hormigon/cimentaciones/cabezal-n-pilotes";
import { recomendarCabezalNPilotes } from "@/lib/verificaciones/recomendaciones/cabezal-n-pilotes";
import type { Recomendacion } from "@/lib/verificaciones/recomendaciones/motor";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";

const meta = registroVerificaciones.find((v) => v.id === "cabezal-n-pilotes")!;

const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function CabezalNPilotesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [rg, setRg] = useCampo("rg", "0.05");

  const [pilarA, setPilarA] = useCampo("pilarA", "0.4");
  const [pilarB, setPilarB] = useCampo("pilarB", "0.4");
  const [ladoA, setLadoA] = useCampo("ladoA", "1.9");
  const [ladoB, setLadoB] = useCampo("ladoB", "1.9");
  const [hCab, setHCab] = useCampo("hCab", "0.8");
  const [dPilote, setDPilote] = useCampo("dPilote", "0.5");
  const [ndPilar, setNdPilar] = useCampo("ndPilar", "2000");
  const [pilotes, setPilotes] = useCampo("pilotes", "-0.625 -0.625; 0.625 -0.625; -0.625 0.625; 0.625 0.625");

  const [nA, setNA] = useCampo("nA", "12");
  const [phiA, setPhiA] = useCampo("phiA", "16");
  const [nB, setNB] = useCampo("nB", "12");
  const [phiB, setPhiB] = useCampo("phiB", "16");
  const [phiPar, setPhiPar] = useCampo("phiPar", "12");
  const [sPar, setSPar] = useCampo("sPar", "0.2");
  const [phiSup, setPhiSup] = useCampo("phiSup", "10");
  const [sSup, setSSup] = useCampo("sSup", "0.25");
  const [phiEstV, setPhiEstV] = useCampo("phiEstV", "12");
  const [sEstV, setSEstV] = useCampo("sEstV", "0.125");
  const [nEstH, setNEstH] = useCampo("nEstH", "6");
  const [phiEstH, setPhiEstH] = useCampo("phiEstH", "12");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const campos = useMemo(
    () => ({ fck, fyk, rg, pilarA, pilarB, ladoA, ladoB, hCab, dPilote, ndPilar, pilotes, nA, phiA, nB, phiB, phiPar, sPar, phiSup, sSup, phiEstV, sEstV, nEstH, phiEstH, formaAnclaje }),
    [fck, fyk, rg, pilarA, pilarB, ladoA, ladoB, hCab, dPilote, ndPilar, pilotes, nA, phiA, nB, phiB, phiPar, sPar, phiSup, sSup, phiEstV, sEstV, nEstH, phiEstH, formaAnclaje]
  );
  const resultado = useMemo(() => resolverCabezalNPilotes(campos), [campos]);
  const rec = useMemo(() => recomendarCabezalNPilotes(campos), [campos]);

  const leidos = leerPilotes(pilotes);
  const avisos: AvisoRevision[] = [];
  if (!leidos) avisos.push({ tipo: "error", texto: "No se entienden los centros de los pilotes: «A B» por pilote, separados por «;»." });
  else if (leidos.length < 3) avisos.push({ tipo: "error", texto: "Hacen falta al menos 3 pilotes; para 1 o 2 están sus propias verificaciones." });
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos, o algún pilote se sale del cabezal: no se puede calcular." });
  }

  const dibujo = (
    <DiagramaCabezalNPilotes
      ladoAM={aNumero(ladoA) || 1}
      ladoBM={aNumero(ladoB) || 1}
      pilarAM={aNumero(pilarA) || 0}
      pilarBM={aNumero(pilarB) || 0}
      diametroPiloteM={aNumero(dPilote) || 0}
      pilotes={leidos ?? []}
      tirantes={resultado?.r.pilotes.map((p) => p.tirantes)}
    />
  );

  const tirante = (d: ResultadoDireccionCabezalN, nombre: string, recs?: Recomendacion[]) => (
    <ResultadoCheck
      etiqueta={`Armadura en ${nombre} suficiente`}
      verifica={d.verificaAs}
      detalle={`Td = ${fmt(d.tdKN)} kN`}
      comparacion={{
        real: { etiqueta: "As real", valor: d.asRealCm2 },
        limite: { etiqueta: "As nec", valor: d.asNecCm2 },
        unidad: "cm²", exige: "≥",
      }}
      recomendaciones={recs}
    />
  );
  const anclaje = (d: ResultadoDireccionCabezalN, nombre: string, recs?: Recomendacion[]) => (
    <ResultadoCheck
      etiqueta={`Anclaje en ${nombre}, desde la cara interior del pilote más externo`}
      verifica={d.verificaAnclaje}
      detalle={d.tdKN > 0 ? FORMAS[formaAnclaje].toLowerCase() : "sin tirante en esta dirección"}
      comparacion={{
        real: { etiqueta: "disponible", valor: d.disponibleAnclajeMm },
        limite: { etiqueta: "lbd", valor: d.lbdMm },
        unidad: "mm", exige: "≥", decimales: 0,
      }}
      recomendaciones={recs}
    />
  );
  const criterio = (c: ResultadoCriterioCabezalN, etiqueta: string, recs?: Recomendacion[]) => (
    <ResultadoCheck
      etiqueta={etiqueta}
      verifica={c.verifica}
      comparacion={{
        real: { etiqueta: "As real", valor: c.asRealCm2 },
        limite: { etiqueta: "As nec", valor: c.asNecCm2 },
        unidad: "cm²", exige: "≥",
      }}
      recomendaciones={recs}
    />
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
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y carga" descripcion="Cabezal sobre tres o más pilotes, en cualquier disposición, y el axil que baja el pilar.">
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
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CampoNumerico id="ladoA" etiqueta="Lado A" sufijo="m" valor={ladoA} onChange={setLadoA} />
                    <CampoNumerico id="ladoB" etiqueta="Lado B" sufijo="m" valor={ladoB} onChange={setLadoB} />
                    <CampoNumerico id="hCab" etiqueta="H" sufijo="m" valor={hCab} onChange={setHCab} />
                    <CampoNumerico id="dPilote" etiqueta="D pilote" sufijo="m" valor={dPilote} onChange={setDPilote} />
                  </div>
                  <div className="pt-4">
                    <CampoPilotes id="pilotes" valor={pilotes} onChange={setPilotes} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar y carga">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="pilarA" etiqueta="Pilar en A" sufijo="m" valor={pilarA} onChange={setPilarA} />
                    <CampoNumerico id="pilarB" etiqueta="Pilar en B" sufijo="m" valor={pilarB} onChange={setPilarB} />
                    <CampoNumerico id="ndPilar" etiqueta="Nd pilar" sufijo="kN" valor={ndPilar} onChange={setNdPilar} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={dibujo}
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Armadura" descripcion="Bandas sobre los pilotes en las dos direcciones, parrilla, superior y malla de caras.">
          <div className="space-y-6">
            <Subgrupo titulo="Bandas (tirantes)">
              <div className="max-w-xl">
                <EditorCapas
                  filas={[
                    { posicion: "En A (abajo)", numero: { id: "nA", valor: nA, onChange: setNA }, diametro: { id: "phiA", valor: phiA, onChange: setPhiA } },
                    { posicion: "En B (encima)", numero: { id: "nB", valor: nB, onChange: setNB }, diametro: { id: "phiB", valor: phiB, onChange: setPhiB } },
                  ]}
                />
              </div>
              <div className="max-w-xs pt-4">
                <CampoSeleccion
                  id="formaAnclaje"
                  etiqueta="Extremo de los tirantes"
                  valor={FORMAS[formaAnclaje]}
                  opciones={Object.values(FORMAS)}
                  onChange={(v) => setFormaAnclaje(formaPorNombre(v))}
                />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Parrilla y superior" detalle="criterio de oficina, iguales en las dos direcciones">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoDiametro id="phiPar" etiqueta="Parrilla · Ø" valor={phiPar} onChange={setPhiPar} />
                <CampoNumerico id="sPar" etiqueta="Parrilla · cada" sufijo="m" valor={sPar} onChange={setSPar} />
                <CampoDiametro id="phiSup" etiqueta="Superior · Ø" valor={phiSup} onChange={setPhiSup} />
                <CampoNumerico id="sSup" etiqueta="Superior · cada" sufijo="m" valor={sSup} onChange={setSSup} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Malla de las caras">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoDiametro id="phiEstV" etiqueta="Verticales · Ø" valor={phiEstV} onChange={setPhiEstV} />
                <CampoNumerico id="sEstV" etiqueta="Verticales · cada" sufijo="m" valor={sEstV} onChange={setSEstV} />
                <CampoNumerico id="nEstH" etiqueta="Horizontales · Nº" valor={nEstH} onChange={setNEstH} />
                <CampoDiametro id="phiEstH" etiqueta="Horizontales · Ø" valor={phiEstH} onChange={setPhiEstH} />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × B × H", valor: `${ladoA} × ${ladoB} × ${hCab} m` },
              { etiqueta: "Nd pilar", valor: `${ndPilar} kN` },
              { etiqueta: "Pilotes", valor: leidos ? `${leidos.length} ⌀${dPilote} m` : "—" },
              ...(resultado ? [{ etiqueta: "Reacción por pilote", valor: `${fmt(resultado.r.reaccionPiloteKN)} kN`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Los encepados están fuera del Anejo 19 (art. 9.8.1): bielas y tirantes por el método general del art. 6.5, generalizando el cabezal de 2 pilotes.",
              "El pilar está en el centro del grupo de pilotes y el cabezal es rígido: cada pilote recibe (Nd + 1,35·PP)/n. No toma momentos; los núcleos (muros con momento) no entran acá.",
              "Tirante por dirección: T = Σ Ri·(|ui| − a/4)/(0,85·d) sobre los pilotes del lado más cargado, con la sección a a/4 del eje del pilar. Con 4 pilotes en cuadro son dos bandas de (N/4)·(s/2 − a/4)/(0,85·d). σ del tirante: mín(fyd; 0,8·fyk), como el de 2.",
              "La capa en A va abajo y la de B encima, con un canto útil menor en ØA.",
              "Nudo sobre cada pilote con k1 = 1,0, k2 = 0,85 o k3 = 0,75 según ancle 0, 1 o 2 tirantes (ecs. 6.60 a 6.62); biela con 0,6·ν′·fcd. El nudo bajo el pilar no se comprueba.",
              "Anclaje por el art. 8.4 desde la cara interior del pilote más externo (art. 6.5.4 (7)), en el lado más corto; con patilla suma la pata hasta H − 2·rec.",
              "Malla de las caras por el art. 9.7 por analogía, con el canto H como espesor: máx(0,1 %·H; 1,5 cm²/m) por cara y dirección, separación ≤ mín(30 cm; 2·H).",
              "Parrilla entre bandas ≥ 1/4 y armadura superior ≥ 1/10 de las bandas, en cada dirección: criterio de oficina tomado de la EHE-08 (art. 58.4.1.2.2), no del Anejo 19.",
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
                  { etiqueta: "tirante en A", estado: resultado.r.direccionA.verificaAs ? "cumple" : "no-cumple", utilizacion: resultado.r.direccionA.asNecCm2 / resultado.r.direccionA.asRealCm2, conPropuestas: !!rec.tiranteA },
                  { etiqueta: "tirante en B", estado: resultado.r.direccionB.verificaAs ? "cumple" : "no-cumple", utilizacion: resultado.r.direccionB.asNecCm2 / resultado.r.direccionB.asRealCm2, conPropuestas: !!rec.tiranteB },
                  { etiqueta: "anclaje en A", estado: resultado.r.direccionA.verificaAnclaje ? "cumple" : "no-cumple", conPropuestas: !!rec.anclajeA },
                  { etiqueta: "anclaje en B", estado: resultado.r.direccionB.verificaAnclaje ? "cumple" : "no-cumple", conPropuestas: !!rec.anclajeB },
                  { etiqueta: "bielas", estado: resultado.r.verificaBielas ? "cumple" : "no-cumple", conPropuestas: !!rec.biela },
                  { etiqueta: "nudos sobre los pilotes", estado: resultado.r.verificaNudos ? "cumple" : "no-cumple", conPropuestas: !!rec.nudo },
                  { etiqueta: "malla de las caras", estado: resultado.r.malla.verifica ? "cumple" : "no-cumple", conPropuestas: !!rec.malla },
                  { etiqueta: "parrilla entre bandas", estado: resultado.r.parrillaA.verifica && resultado.r.parrillaB.verifica ? "cumple" : "no-cumple", conPropuestas: !!rec.parrilla },
                  { etiqueta: "armadura superior", estado: resultado.r.superiorA.verifica && resultado.r.superiorB.verifica ? "cumple" : "no-cumple", conPropuestas: !!rec.superior },
                  { etiqueta: "barras en el ancho", estado: resultado.r.direccionA.verificaBNec && resultado.r.direccionB.verificaBNec ? "cumple" : "no-cumple", conPropuestas: !!(rec.anchoA || rec.anchoB) },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Reacción por pilote", valor: `${fmt(resultado.r.reaccionPiloteKN)} kN` },
                  { etiqueta: "Td en A", valor: `${fmt(resultado.r.direccionA.tdKN)} kN` },
                  { etiqueta: "Td en B", valor: `${fmt(resultado.r.direccionB.tdKN)} kN` },
                  { etiqueta: "Peso propio", valor: `${fmt(resultado.r.pesoPropioKN)} kN` },
                ]}
              />

              <Subgrupo titulo="Tirantes">
                <div>
                  {tirante(resultado.r.direccionA, "A", rec.tiranteA)}
                  {tirante(resultado.r.direccionB, "B", rec.tiranteB)}
                  <PanelFormulas
                    titulo="Ver desarrollo de los tirantes"
                    filas={[
                      { etiqueta: "Ri = (Nd + 1,35·PP)/n", valor: `${fmt(resultado.r.reaccionPiloteKN)} kN` },
                      { etiqueta: "d en A / d en B", valor: `${fmt(resultado.r.direccionA.dM, 3)} / ${fmt(resultado.r.direccionB.dM, 3)} m` },
                      { etiqueta: "Pilote más alejado en A / en B", valor: `${fmt(resultado.r.direccionA.brazoMaxM, 3)} / ${fmt(resultado.r.direccionB.brazoMaxM, 3)} m` },
                      { etiqueta: "σsd en el anclaje, A / B", valor: `${fmt(resultado.r.direccionA.sigmaSdAnclajeMPa)} / ${fmt(resultado.r.direccionB.sigmaSdAnclajeMPa)} MPa` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Anclaje de los tirantes" detalle="art. 8.4 y 6.5.4 (7)">
                <div>
                  {anclaje(resultado.r.direccionA, "A", rec.anclajeA)}
                  {anclaje(resultado.r.direccionB, "B", rec.anclajeB)}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Bielas y nudos" detalle="art. 6.5.2 y 6.5.4">
                <div>
                  <ResultadoCheck
                    etiqueta="Compresión en la biela más cargada"
                    verifica={resultado.r.verificaBielas}
                    comparacion={{
                      real: { etiqueta: "σ", valor: Math.max(...resultado.r.pilotes.map((p) => p.sigmaBielaMPa)) },
                      limite: { etiqueta: "0,6·ν′·fcd", valor: resultado.r.sigmaBielaMaxMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                    recomendaciones={rec.biela}
                  />
                  <ResultadoCheck
                    etiqueta="Compresión en los nudos sobre los pilotes"
                    verifica={resultado.r.verificaNudos}
                    detalle={`k según los tirantes que ancla cada pilote`}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.pilotes[0].sigmaNudoMPa },
                      limite: { etiqueta: "k·ν′·fcd (mín.)", valor: Math.min(...resultado.r.pilotes.map((p) => p.sigmaNudoMaxMPa)) },
                      unidad: "MPa", exige: "≤",
                    }}
                    recomendaciones={rec.nudo}
                  />
                  <PanelFormulas
                    titulo="Ver cada pilote"
                    filas={resultado.r.pilotes.map((p, i) => ({
                      etiqueta: `Pilote ${i + 1} (${fmt(p.aM, 2)}; ${fmt(p.bM, 2)}) · ${p.tirantes} tirante${p.tirantes === 1 ? "" : "s"}`,
                      valor: `θ ${fmt(p.anguloBielaGrados, 1)}° · biela ${fmt(p.sigmaBielaMPa)} · nudo ${fmt(p.sigmaNudoMPa)} ≤ ${fmt(p.sigmaNudoMaxMPa)} MPa`,
                    }))}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Armaduras complementarias">
                <div>
                  <ResultadoCheck
                    etiqueta="Malla de las caras (art. 9.7, espesor H)"
                    verifica={resultado.r.malla.verifica}
                    detalle={`verticales cada ${fmt(aNumero(sEstV) * 100, 0)} cm, horizontales cada ${fmt(resultado.r.malla.separacionHorizontalM * 100, 0)} cm (máx. ${fmt(resultado.r.malla.separacionMaxM * 100, 0)} cm)`}
                    comparacion={{
                      real: { etiqueta: "As real (menor)", valor: Math.min(resultado.r.malla.asVerticalCm2, resultado.r.malla.asHorizontalCm2) },
                      limite: { etiqueta: "As nec", valor: resultado.r.malla.asNecCm2 },
                      unidad: "cm²/m", exige: "≥",
                    }}
                    recomendaciones={rec.malla}
                  />
                  {criterio(resultado.r.parrillaA, "Parrilla en A ≥ 1/4 de las bandas (criterio)", rec.parrilla)}
                  {criterio(resultado.r.parrillaB, "Parrilla en B ≥ 1/4 de las bandas (criterio)")}
                  {criterio(resultado.r.superiorA, "Superior en A ≥ 1/10 de las bandas (criterio)", rec.superior)}
                  {criterio(resultado.r.superiorB, "Superior en B ≥ 1/10 de las bandas (criterio)")}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas" detalle="disposición del armado">
                <div>
                  <ResultadoCheck
                    etiqueta="Las barras de A entran a lo ancho (B)"
                    verifica={resultado.r.direccionA.verificaBNec}
                    detalle={`separación ${fmt(resultado.r.direccionA.separacionMm, 0)} mm`}
                    comparacion={{ real: { etiqueta: "b nec", valor: resultado.r.direccionA.bNecM }, limite: { etiqueta: "lado B", valor: resultado.n.ladoB }, unidad: "m", exige: "≤", decimales: 3 }}
                    recomendaciones={rec.anchoA}
                  />
                  <ResultadoCheck
                    etiqueta="Las barras de B entran a lo largo (A)"
                    verifica={resultado.r.direccionB.verificaBNec}
                    detalle={`separación ${fmt(resultado.r.direccionB.separacionMm, 0)} mm`}
                    comparacion={{ real: { etiqueta: "b nec", valor: resultado.r.direccionB.bNecM }, limite: { etiqueta: "lado A", valor: resultado.n.ladoA }, unidad: "m", exige: "≤", decimales: 3 }}
                    recomendaciones={rec.anchoB}
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
