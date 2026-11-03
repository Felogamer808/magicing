"use client";

import { useMemo, useState, type FocusEvent } from "react";
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
import {
  CroquisArmadoCabezalDosPilotes,
  PlantaCabezalDosPilotes,
  type ElementoCabezalDos,
  type MedidasCabezalDos,
} from "@/components/verificaciones/hormigon/CroquisArmadoCabezalDosPilotes";
import { mandrilMinimoMm } from "@/lib/calc/hormigon/comun/anclaje";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverCabezal } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal";
import { recomendarCabezal } from "@/lib/verificaciones/recomendaciones/cabezal-pilotes";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";

const meta = registroVerificaciones.find((v) => v.id === "cabezales")!;

const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

/** Qué parte del croquis de armado corresponde a cada campo, para resaltarla con el foco. */
const ELEMENTO_DE_CAMPO: Record<string, ElementoCabezalDos> = {
  nPrinc: "principal", phiPrinc: "principal", formaAnclaje: "principal",
  nSec: "secundaria", phiSec: "secundaria",
  phiEstV: "estribosV", sEstV: "estribosV", ramasEstV: "estribosV",
  phiEstH: "estribosH", sEstH: "estribosH",
};

/**
 * Lo tipeado, para dibujar: el croquis muestra los datos aunque todavía no
 * calculen. Sólo un campo vacío o no positivo cae en el valor de ejemplo.
 */
function medida(texto: string, porDefecto: number): number {
  const v = aNumero(texto);
  return Number.isFinite(v) && v > 0 ? v : porDefecto;
}

/** Separación entre ejes de pilotes, en diámetros, o libre (criterio del usuario, 2026-11-03). */
// Una lista y no un objeto: las claves "2" y "3" parecen enteros y JavaScript
// las pondría antes de "2.5".
const OPCIONES_SEPARACION = [["2", "2·D"], ["2.5", "2,5·D"], ["3", "3·D"], ["libre", "Libre"]] as const;
const SEPARACIONES: Record<string, string> = Object.fromEntries(OPCIONES_SEPARACION);

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
  const [anchoPilarY, setAnchoPilarY] = useCampo("anchoPilarY", "0.3");
  const [separacionPilotes, setSeparacionPilotes] = useCampo("separacionPilotes", "2.5");
  const [sPilotes, setSPilotes] = useCampo("sPilotes", "1.25");
  const [ramasEstV, setRamasEstV] = useCampo("ramasEstV", "2");
  const [ladoX, setLadoX] = useCampo("ladoX", "1.6");
  const [ladoY, setLadoY] = useCampo("ladoY", "0.6");
  const [hCab, setHCab] = useCampo("hCab", "0.6");
  const [dPilote, setDPilote] = useCampo("dPilote", "0.5");
  const [ndPilar, setNdPilar] = useCampo("ndPilar", "1040");

  const [nPrinc, setNPrinc] = useCampo("nPrinc", "7");
  const [phiPrinc, setPhiPrinc] = useCampo("phiPrinc", "16");
  const [nSec, setNSec] = useCampo("nSec", "7");
  const [phiSec, setPhiSec] = useCampo("phiSec", "10");
  const [phiEstV, setPhiEstV] = useCampo("phiEstV", "8");
  const [sEstV, setSEstV] = useCampo("sEstV", "0.15");
  const [phiEstH, setPhiEstH] = useCampo("phiEstH", "10");
  const [sEstH, setSEstH] = useCampo("sEstH", "0.1");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const campos = useMemo(
    () => ({ fck, fyk, rg, anchoPilar, ladoX, ladoY, hCab, dPilote, separacionPilotes, sPilotes, ndPilar, nPrinc, phiPrinc, nSec, phiSec, phiEstV, sEstV, phiEstH, sEstH, formaAnclaje }),
    [fck, fyk, rg, anchoPilar, ladoX, ladoY, hCab, dPilote, separacionPilotes, sPilotes, ndPilar, nPrinc, phiPrinc, nSec, phiSec, phiEstV, sEstV, phiEstH, sEstH, formaAnclaje]
  );
  const resultado = useMemo(() => resolverCabezal(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarCabezal(campos), [campos]);

  const [foco, setFoco] = useState<string | null>(null);
  const resaltar = foco ? (ELEMENTO_DE_CAMPO[foco] ?? null) : null;
  // El foco se sigue en un contenedor: los eventos de foco de React burbujean,
  // también desde la lista de los selectores, que no tiene id y no lo apaga.
  const seguirFoco = {
    onFocus: (ev: FocusEvent<HTMLElement>) => {
      const id = ev.target.id.replace(/-otro$/, "");
      if (id) setFoco(id);
    },
    onBlur: (ev: FocusEvent<HTMLElement>) => {
      const siguiente = ev.relatedTarget as HTMLElement | null;
      if (!siguiente?.closest('[role="listbox"]')) setFoco(null);
    },
  };

  const medidas: MedidasCabezalDos = {
    ladoXM: medida(ladoX, 1.6),
    ladoYM: medida(ladoY, 0.6),
    hM: medida(hCab, 0.6),
    anchoPilarM: medida(anchoPilar, 0.3),
    anchoPilarYM: medida(anchoPilarY, 0.3),
    diametroPiloteM: medida(dPilote, 0.5),
    recubrimientoM: medida(rg, 0.05),
    separacionPilotesM:
      separacionPilotes === "libre"
        ? medida(sPilotes, 1.25)
        : medida(separacionPilotes, 2.5) * medida(dPilote, 0.5),
  };
  const phiPrincMm = medida(phiPrinc, 16);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular. Hacen falta al menos 2 barras en la principal y en la secundaria, y los pilotes separados más que su diámetro." });
  }
  if (medidas.separacionPilotesM + medidas.diametroPiloteM > medidas.ladoXM + 1e-9) {
    avisos.push({ tipo: "aviso", texto: `Los pilotes no entran en el lado x: s + D = ${fmt(medidas.separacionPilotesM + medidas.diametroPiloteM)} m > ${fmt(medidas.ladoXM)} m.` });
  }
  if (medidas.anchoPilarYM > medidas.ladoYM + 1e-9 || medidas.anchoPilarM > medidas.ladoXM + 1e-9) {
    avisos.push({ tipo: "aviso", texto: "El pilar no entra en el cabezal." });
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
                    <CampoNumerico id="rg" etiqueta="Recubrimiento geom." sufijo="m" valor={rg} onChange={setRg} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Cabezal y pilotes">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="ladoX" etiqueta="Lado x" sufijo="m" valor={ladoX} onChange={setLadoX} />
                    <CampoNumerico id="ladoY" etiqueta="Lado y" sufijo="m" valor={ladoY} onChange={setLadoY} />
                    <CampoNumerico id="hCab" etiqueta="H" sufijo="m" valor={hCab} onChange={setHCab} />
                    <CampoNumerico id="dPilote" etiqueta="D pilote" sufijo="m" valor={dPilote} onChange={setDPilote} />
                    <CampoSeleccion
                      id="separacionPilotes"
                      etiqueta="Separación de pilotes"
                      valor={SEPARACIONES[separacionPilotes] ?? SEPARACIONES["2.5"]}
                      opciones={OPCIONES_SEPARACION.map(([, rotulo]) => rotulo)}
                      onChange={(v) => setSeparacionPilotes(OPCIONES_SEPARACION.find(([, rotulo]) => rotulo === v)?.[0] ?? "2.5")}
                    />
                    {separacionPilotes === "libre" && (
                      <CampoNumerico id="sPilotes" etiqueta="s entre ejes" sufijo="m" valor={sPilotes} onChange={setSPilotes} />
                    )}
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar (centrado)">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="anchoPilar" etiqueta="Lado en x" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
                    <CampoNumerico id="anchoPilarY" etiqueta="Lado en y" sufijo="m" valor={anchoPilarY} onChange={setAnchoPilarY} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    x es la dirección que une los pilotes. El modelo de bielas usa el lado en x; el de y se dibuja y se
                    controla que entre en el cabezal.
                  </p>
                </Subgrupo>
                <Subgrupo titulo="Carga">
                  <div className="max-w-[12rem]">
                    <CampoNumerico id="ndPilar" etiqueta="Nd pilar" sufijo="kN" valor={ndPilar} onChange={setNdPilar} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={
              <div className="space-y-4">
                <div>
                  <p className="spec-label mb-1">Alzado</p>
                  {modelo}
                </div>
                <div>
                  <p className="spec-label mb-1">Planta</p>
                  <PlantaCabezalDosPilotes m={medidas} />
                </div>
              </div>
            }
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Armadura" descripcion="Tirante principal, secundaria y estribos.">
          <div {...seguirFoco}>
          <DatosConDibujo
            datos={
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
              <div className="grid grid-cols-2 gap-4">
                <CampoDiametro id="phiEstV" etiqueta="Verticales · Ø" valor={phiEstV} onChange={setPhiEstV} />
                <CampoNumerico id="sEstV" etiqueta="Verticales · separación" sufijo="m" valor={sEstV} onChange={setSEstV} />
                <CampoNumerico id="ramasEstV" etiqueta="Verticales · ramas" valor={ramasEstV} onChange={setRamasEstV} />
                <div className="hidden sm:block" />
                <CampoDiametro id="phiEstH" etiqueta="Horizontales · Ø" valor={phiEstH} onChange={setPhiEstH} />
                <CampoNumerico id="sEstH" etiqueta="Horizontales · separación" sufijo="m" valor={sEstH} onChange={setSEstH} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Verticales repartidos a lo largo de x; horizontales en el canto. Cuentan como malla de las caras
                (art. 9.7): una rama por cara.
              </p>
            </Subgrupo>
          </div>
            }
            dibujo={
              <CroquisArmadoCabezalDosPilotes
                m={medidas}
                resaltar={resaltar}
                armado={{
                  nPrinc: Math.max(0, Math.floor(aNumero(nPrinc)) || 0),
                  phiPrincMm,
                  conPatilla: formaAnclaje === "gancho",
                  mandrilMm: resultado?.r.principal.patilla?.mandrilMm ?? mandrilMinimoMm(phiPrincMm),
                  patillaNecMm: resultado?.r.principal.patilla?.patillaNecMm ?? null,
                  nSec: Math.max(0, Math.floor(aNumero(nSec)) || 0),
                  phiSecMm: medida(phiSec, 10),
                  phiEstVMm: medida(phiEstV, 8),
                  sEstVM: medida(sEstV, 0.15),
                  ramasEstV: Math.max(2, Math.floor(aNumero(ramasEstV)) || 2),
                  phiEstHMm: medida(phiEstH, 10),
                  sEstHM: medida(sEstH, 0.1),
                }}
              />
            }
          />
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
              "Separación de pilotes elegida: 2·D, 2,5·D, 3·D o libre. Pilar centrado; el modelo usa su lado en x.",
              "Ramas de los estribos verticales: se dibujan, pero la malla de cara (art. 9.7) cuenta una sola por cara, la exterior.",
              "El nudo bajo el pilar no se comprueba: el pilar ya está dimensionado para ese axil.",
              "Estribos con Ø y separación: la cantidad sale de repartirlos en el lado x − 0,2 m (verticales) y en H − 0,15 m (horizontales), los márgenes de la planilla.",
              "Malla de las caras por el art. 9.7 (vigas de gran canto), por analogía: los encepados están fuera del Anejo 19 (art. 9.8.1). Por cara y dirección, máx(0,1 %·lado y/2; 1,5 cm²/m) —el 0,1 % es el total de la sección, mitad en cada cara—, separación ≤ mín(30 cm; 2·lado y). Cuenta la rama exterior de cada cerco.",
              "Anclaje del tirante por el art. 8.4, desde el eje del pilote (más conservador que la cara interior que admite el art. 6.5.4 (7)) hasta el extremo de la barra, sobre su eje. Con patilla a 90°: recta + doblez + pata, con mandril D mínimo de la tabla A19.8.1 y la pata hasta H − rec. σsd = Td/As real con tope fyd, buena adherencia, α3 = α5 = 1.",
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
                      { etiqueta: `Separación de pilotes s (${SEPARACIONES[separacionPilotes] ?? SEPARACIONES["2.5"]})`, valor: `${fmt(resultado.r.principal.separacionPilotesM)} m` },
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

              <Subgrupo titulo="Anclaje del tirante" detalle="art. 8.4, desde el eje del pilote">
                <div>
                  {resultado.r.principal.patilla && (
                    <ResultadoCheck
                      etiqueta={`Patilla necesaria · D = ${fmt(resultado.r.principal.patilla.mandrilMm, 0)} mm`}
                      verifica={resultado.r.principal.verificaAnclaje}
                      detalle={`lbd ${fmt(resultado.r.principal.lbdMm, 0)} = recta ${fmt(resultado.r.principal.patilla.rectaMm, 0)} + doblez ${fmt(resultado.r.principal.patilla.arcoMm, 0)} + patilla ${fmt(resultado.r.principal.patilla.patillaNecMm, 0)} mm`}
                      comparacion={{
                        real: { etiqueta: "entra", valor: resultado.r.principal.patilla.patillaDispMm },
                        limite: { etiqueta: "patilla nec.", valor: resultado.r.principal.patilla.patillaNecMm },
                        unidad: "mm", exige: "≥", decimales: 0,
                      }}
                    />
                  )}
                  <ResultadoCheck
                    etiqueta="Largo disponible desde el eje del pilote"
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
                    detalle={`${resultado.r.estribosVerticales.numero} estribos, cada ${fmt(resultado.r.estribosVerticales.separacionM * 100, 0)} cm (máx. ${fmt(resultado.r.estribosVerticales.separacionMaxM * 100, 0)} cm)`}
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
                    detalle={`${resultado.r.estribosHorizontales.numero} estribos, cada ${fmt(resultado.r.estribosHorizontales.separacionM * 100, 0)} cm (máx. ${fmt(resultado.r.estribosHorizontales.separacionMaxM * 100, 0)} cm)`}
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
