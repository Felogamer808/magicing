"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisCargaColgada, CroquisCuelguePilar } from "@/components/verificaciones/croquis/CroquisVarios";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import {
  MODOS_PORCENTAJE,
  TIPOS_CARGA_COLGADA,
  resolverCargaColgada,
} from "@/lib/calc/hormigon/vigas/resolver-carga-colgada";

const meta = registroVerificaciones.find((v) => v.id === "carga-colgada")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Estribos" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function CargaColgadaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [tipo, setTipo] = useCampo("tipo", TIPOS_CARGA_COLGADA[0]);
  const [reaccion, setReaccion] = useCampo("reaccion", "200");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "10");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "2");
  const [h, setH] = useCampo("h", "0.5");
  const [h2, setH2] = useCampo("h2", "0.4");
  const [a, setA] = useCampo("a", "0.3");
  // Pilar con las barras ancladas abajo
  const [nd, setNd] = useCampo("nd", "1000");
  const [fck, setFck] = useCampo("fck", "25");
  const [ladoPilar, setLadoPilar] = useCampo("ladoPilar", "0.3");
  const [anchoPilar, setAnchoPilar] = useCampo("anchoPilar", "0.3");
  const [nBarrasPilar, setNBarrasPilar] = useCampo("nBarrasPilar", "4");
  const [phiPilar, setPhiPilar] = useCampo("phiPilar", "16");
  const [modoPorcentaje, setModoPorcentaje] = useCampo("modoPorcentaje", MODOS_PORCENTAJE[0]);
  const [porcentaje, setPorcentaje] = useCampo("porcentaje", "50");

  const esPilar = tipo === TIPOS_CARGA_COLGADA[1];
  const impuesto = modoPorcentaje === MODOS_PORCENTAJE[1];

  const campos = useMemo(
    () => ({ tipo, reaccion, fyk, diametroEstribo, numeroRamas, h, h2, a, nd, fck, ladoPilar, anchoPilar, nBarrasPilar, phiPilar, modoPorcentaje, porcentaje }),
    [tipo, reaccion, fyk, diametroEstribo, numeroRamas, h, h2, a, nd, fck, ladoPilar, anchoPilar, nBarrasPilar, phiPilar, modoPorcentaje, porcentaje]
  );
  const resultado = useMemo(() => resolverCargaColgada(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado)
    avisos.push({
      tipo: "error",
      texto: esPilar && impuesto
        ? "Hay datos vacíos o no válidos: todos tienen que ser positivos, y el porcentaje entre 0 y 100."
        : "Hay datos vacíos o no válidos: todos tienen que ser positivos.",
    });
  else if (resultado.tipo === "viga") {
    if (!resultado.r.cantosComoLaFigura)
      avisos.push({
        tipo: "aviso",
        texto: `h1 = ${fmt(resultado.v.h, 2)} m < h2 = ${fmt(resultado.v.h2, 2)} m: la figura A19.9.7 supone que la viga que recibe es la de más canto. La zona de reparto queda fuera de lo que dibuja la norma.`,
      });
    if (!resultado.r.cumpleAvisoCantoMinimo)
      avisos.push({
        tipo: "aviso",
        texto: `Criterio de Montoya (§24.9.1), no del Anejo 19: h1 = ${fmt(resultado.v.h, 2)} m < 1,2·a = ${fmt(resultado.r.cantoMinimoM, 2)} m, poco canto para que se formen las bielas. No entra en el cumple.`,
      });
  } else {
    if (resultado.r.fraccionMenorQueCalculada)
      avisos.push({
        tipo: "aviso",
        texto: `El ${fmt(resultado.r.fraccionAdoptada * 100, 1)} % impuesto es menos que lo que llevan las barras del pilar (${fmt(resultado.r.fraccionCalculada * 100, 1)} %): parte de la carga que entra abajo queda sin colgar.`,
      });
    if (!resultado.r.reparto.cumpleCuantiaMaxima)
      avisos.push({
        tipo: "aviso",
        texto: `La armadura del pilar es el ${fmt(resultado.r.reparto.cuantiaGeometrica * 100, 2)} % de Ac, más que el 4 % del art. 9.5.2(3) fuera de solapes.`,
      });
  }

  const datosRevision = esPilar
    ? [
        { etiqueta: "Nd del pilar", valor: `${nd} kN` },
        { etiqueta: "Pilar", valor: `${ladoPilar} × ${anchoPilar} m, ${nBarrasPilar}Ø${phiPilar}` },
        { etiqueta: "h de la viga", valor: `${h} m` },
        { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
        { etiqueta: "% a colgar", valor: impuesto ? `${porcentaje} % impuesto` : "calculado" },
        { etiqueta: "Estribo", valor: `Ø${diametroEstribo}, ${numeroRamas} ramas` },
        ...(resultado ? [{ etiqueta: "fyd", valor: `${fmt(resultado.r.fydMPa)} MPa`, derivado: true }] : []),
      ]
    : [
        { etiqueta: "Rd", valor: `${reaccion} kN` },
        { etiqueta: "h1 / h2", valor: `${h} / ${h2} m` },
        { etiqueta: "a", valor: `${a} m` },
        { etiqueta: "Estribo", valor: `Ø${diametroEstribo}, ${numeroRamas} ramas` },
        ...(resultado ? [{ etiqueta: "fyd", valor: `${fmt(resultado.r.fydMPa)} MPa`, derivado: true }] : []),
      ];

  const hipotesis = esPilar
    ? [
        "El pilar apoya sobre la viga y sus barras bajan ancladas hasta la cara inferior: lo que lleva el hormigón entra por arriba, en la cabeza comprimida, y no se cuelga; lo que llevan las barras entra abajo y se sube con cercos.",
        "Reparto en compresión centrada con la deformación limitada a εc2 (art. 6.1(5), pág. 74; tabla A19.3.1): hormigón a fcd = fck/γc (αcc = 1,00, art. 3.1.6(1)) y acero a σs = mín(fyd; Es·εc2).",
        "Colgar esa parte es criterio del proyectista, no un artículo: el Anejo 19 sólo pide colgar la reacción entera en el apoyo indirecto (art. 9.2.5(1)). Por eso el porcentaje se puede imponer.",
        "Los cercos son el tirante vertical: As·fyd ≥ Rd, con fyd = fyk/γs (art. 6.5.3(1)).",
        "Zona de los cercos: máx(lado del pilar; h/2) a cada lado del eje, el mismo criterio que la viga de apeo. El Anejo no trae zona para este caso; se informa y no entra en el cumple.",
        "La cantidad de estribos es un dimensionamiento, no una verificación.",
      ]
    : [
        "Apoyo indirecto, art. 9.2.5(1): se cuelga el 100 % de la reacción con cercos que envuelven la armadura principal de la viga que recibe, además de la armadura necesaria por otros motivos.",
        "Los cercos son el tirante vertical del modelo de bielas: As·fyd ≥ Rd, con fyd = fyk/γs (art. 6.5.3(1)).",
        "La zona de reparto de la figura A19.9.7 se informa y no entra en el cumple.",
        "h1 ≥ 1,2·a es criterio de Montoya (§24.9.1), sin equivalente en el Anejo: queda como aviso.",
        "La cantidad de estribos es un dimensionamiento, no una verificación.",
      ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Regiones D · dimensionamiento</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa
          id="geometria"
          numero={1}
          titulo="Geometría y carga"
          descripcion={esPilar ? "El pilar, su armadura y la viga que lo recibe." : "Las dos vigas que se cruzan y la reacción que hay que colgar."}
        >
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <CampoSeleccion id="tipo" etiqueta="Qué cuelga" valor={tipo} opciones={TIPOS_CARGA_COLGADA} onChange={setTipo} />
                </div>
                {esPilar ? (
                  <>
                    <CampoNumerico id="nd" etiqueta="Nd del pilar" sufijo="kN" valor={nd} onChange={setNd} />
                    <CampoNumerico id="h" etiqueta="h (viga que recibe)" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="ladoPilar" etiqueta="Lado del pilar (en el plano de la viga)" sufijo="m" valor={ladoPilar} onChange={setLadoPilar} />
                    <CampoNumerico id="anchoPilar" etiqueta="Lado del pilar (transversal)" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
                    <CampoNumerico id="nBarrasPilar" etiqueta="Barras del pilar" valor={nBarrasPilar} onChange={setNBarrasPilar} />
                    <CampoDiametro id="phiPilar" etiqueta="Ø barras del pilar" valor={phiPilar} onChange={setPhiPilar} />
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <div />
                    <CampoSeleccion id="modoPorcentaje" etiqueta="% de Nd a colgar" valor={modoPorcentaje} opciones={MODOS_PORCENTAJE} onChange={setModoPorcentaje} />
                    {impuesto ? (
                      <CampoNumerico id="porcentaje" etiqueta="% impuesto" sufijo="%" valor={porcentaje} onChange={setPorcentaje} sugerencias={[50, 100]} />
                    ) : (
                      <div className="self-end pb-2 font-mono text-sm tabular-nums text-muted-foreground">
                        {resultado?.tipo === "pilar" ? `${fmt(resultado.r.fraccionCalculada * 100, 1)} % calculado` : "—"}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <CampoNumerico id="reaccion" etiqueta="Rd (reacción colgada)" sufijo="kN" valor={reaccion} onChange={setReaccion} />
                    <div />
                    <CampoNumerico id="h" etiqueta="h1 (viga que recibe)" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="h2" etiqueta="h2 (viga que llega)" sufijo="m" valor={h2} onChange={setH2} />
                    <CampoNumerico id="a" etiqueta="a (ancho de la que llega)" sufijo="m" valor={a} onChange={setA} />
                  </>
                )}
              </div>
            }
            dibujo={esPilar ? <CroquisCuelguePilar /> : <CroquisCargaColgada />}
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Estribos" descripcion="Acero y estribo con el que se cuelga la carga.">
          <div className="grid max-w-2xl grid-cols-3 gap-4">
            <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
            <CampoNumerico id="numeroRamas" etiqueta="Ramas por estribo" valor={numeroRamas} onChange={setNumeroRamas} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos norma={norma} datos={datosRevision} hipotesis={hipotesis} avisos={avisos} />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!resultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : resultado.tipo === "pilar" ? (
            <div className="space-y-10">
              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "% colgado", valor: `${fmt(resultado.r.fraccionAdoptada * 100, 1)} %`, nota: resultado.v.impuesto ? "impuesto" : "parte de las barras" },
                  { etiqueta: "Carga colgada", valor: `${fmt(resultado.r.cargaColgadaKN, 0)} kN` },
                  { etiqueta: "As necesaria", valor: `${fmt(resultado.r.asNecesariaCm2)} cm²` },
                  { etiqueta: "Estribos", valor: `${resultado.r.cantidadEstribos}`, nota: "dimensionado" },
                ]}
              />

              <Subgrupo titulo="Reparto del axil en el pilar" detalle="compresión centrada, εc2">
                <PanelFormulas
                  titulo="Ver desarrollo del reparto"
                  filas={[
                    { etiqueta: "As pilar", formula: "n·área barra", sustitucion: `${fmt(resultado.v.nBarrasPilar, 0)}·Ø${fmt(resultado.v.phiPilar, 0)}`, valor: `${fmt(resultado.v.asPilarCm2)} cm²` },
                    { etiqueta: "σs", formula: "mín(fyd; Es·εc2)", sustitucion: `mín(${fmt(resultado.r.reparto.fydMPa)}; 200 000·${fmt(resultado.r.reparto.epsilonC2 * 1000, 2)} ‰)`, valor: `${fmt(resultado.r.reparto.sigmaSMPa)} MPa` },
                    { etiqueta: "Fs", formula: "As·σs", sustitucion: `${fmt(resultado.v.asPilarCm2)} cm² · ${fmt(resultado.r.reparto.sigmaSMPa)} MPa`, valor: `${fmt(resultado.r.reparto.capacidadAceroKN, 0)} kN` },
                    { etiqueta: "Fc", formula: "(Ac − As)·fcd", sustitucion: `${fmt(resultado.r.reparto.acNetaM2 * 1e4, 0)} cm² · ${fmt(resultado.r.reparto.fcdMPa)} MPa`, valor: `${fmt(resultado.r.reparto.capacidadHormigonKN, 0)} kN` },
                    { etiqueta: "% barras", formula: "Fs / (Fs + Fc)", sustitucion: `${fmt(resultado.r.reparto.capacidadAceroKN, 0)} / ${fmt(resultado.r.reparto.capacidadAceroKN + resultado.r.reparto.capacidadHormigonKN, 0)}`, valor: `${fmt(resultado.r.fraccionCalculada * 100, 1)} %` },
                  ]}
                />
              </Subgrupo>

              <Subgrupo titulo="Estribado adoptado" detalle="dimensionamiento, no verificación">
                <div className="space-y-2">
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {resultado.r.cantidadEstribos} estribos Ø{fmt(resultado.v.diametroEstribo, 0)} de {fmt(resultado.v.numeroRamas, 0)} ramas
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo de la armadura de cuelgue"
                    filas={[
                      { etiqueta: "Rd", formula: "% · Nd", sustitucion: `${fmt(resultado.r.fraccionAdoptada * 100, 1)} % · ${fmt(resultado.v.nd, 0)}`, valor: `${fmt(resultado.r.cargaColgadaKN, 0)} kN` },
                      { etiqueta: "As", formula: "Rd / fyd", sustitucion: `${fmt(resultado.r.cargaColgadaKN)} / ${fmt(resultado.r.fydMPa)}`, valor: `${fmt(resultado.r.asNecesariaCm2)} cm²` },
                      { etiqueta: "N° estribos", formula: "As / (ramas·área barra)", sustitucion: `${fmt(resultado.r.asNecesariaCm2)} / ${fmt(resultado.r.areaPorEstriboCm2)}`, valor: `${resultado.r.cantidadEstribos}` },
                    ]}
                  />
                  <p className="text-sm">
                    Repartidos en {fmt(resultado.r.anchoZonaM, 2)} m a cada lado del eje del pilar: máx(lado del pilar; h/2), criterio de la
                    viga de apeo e informativo.
                  </p>
                </div>
              </Subgrupo>
            </div>
          ) : (
            <div className="space-y-10">
              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "As necesaria", valor: `${fmt(resultado.r.asNecesariaCm2)} cm²` },
                  { etiqueta: "Área por estribo", valor: `${fmt(resultado.r.areaPorEstriboCm2)} cm²`, nota: `${fmt(resultado.v.numeroRamas, 0)} ramas Ø${fmt(resultado.v.diametroEstribo, 0)}` },
                  { etiqueta: "Estribos", valor: `${resultado.r.cantidadEstribos}`, nota: "dimensionado" },
                  { etiqueta: "Zona en la que recibe", valor: `${fmt(resultado.r.zona.recibeDesdeCaraM, 2)} m`, nota: "h1/3 desde la cara" },
                ]}
              />

              <Subgrupo titulo="Estribado adoptado" detalle="dimensionamiento, no verificación">
                <div className="space-y-2">
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {resultado.r.cantidadEstribos} estribos Ø{fmt(resultado.v.diametroEstribo, 0)} de {fmt(resultado.v.numeroRamas, 0)} ramas
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo de la armadura de cuelgue"
                    filas={[
                      { etiqueta: "As", formula: "Rd / fyd", sustitucion: `${fmt(resultado.v.reaccion)} / ${fmt(resultado.r.fydMPa)}`, valor: `${fmt(resultado.r.asNecesariaCm2)} cm²` },
                      { etiqueta: "N° estribos", formula: "As / (ramas·área barra)", sustitucion: `${fmt(resultado.r.asNecesariaCm2)} / ${fmt(resultado.r.areaPorEstriboCm2)}`, valor: `${resultado.r.cantidadEstribos}` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Zona de los cercos" detalle="figura A19.9.7, informativa">
                <div className="space-y-2 text-sm">
                  <p>
                    En la viga que recibe: hasta {fmt(resultado.r.zona.recibeDesdeCaraM, 2)} m (h1/3) desde la cara de la que llega, y no
                    más de {fmt(resultado.r.zona.recibeDesdeEjeM, 2)} m (h1/2) desde su eje.
                  </p>
                  <p>
                    En la viga que llega: hasta {fmt(resultado.r.zona.llegaDesdeCaraM, 2)} m (h2/3) desde la cara de la que recibe, y no
                    más de {fmt(resultado.r.zona.llegaDesdeEjeM, 2)} m (h2/2) desde su eje.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Aviso de buena práctica, criterio de Montoya (§24.9.1) y no del Anejo 19, que no entra en el cumple: h1 ={" "}
                    {fmt(resultado.v.h, 2)} m {resultado.r.cumpleAvisoCantoMinimo ? "≥" : "<"} 1,2·a = {fmt(resultado.r.cantoMinimoM, 2)} m.
                  </p>
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
