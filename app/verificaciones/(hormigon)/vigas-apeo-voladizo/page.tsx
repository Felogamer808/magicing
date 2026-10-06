"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaApeoVoladizo } from "@/components/verificaciones/hormigon/DiagramaApeoVoladizo";
import { type AnclajeExtremo } from "@/lib/calc/hormigon/vigas/apeo-voladizo";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverApeoVoladizo } from "@/lib/calc/hormigon/vigas/resolver-apeo-voladizo";
import { recomendarApeoVoladizo } from "@/lib/verificaciones/recomendaciones/vigas-apeo-voladizo";

const meta = registroVerificaciones.find((v) => v.id === "vigas-apeo-voladizo")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const FORMAS: Record<FormaAnclaje, string> = {
  recta: "Recta",
  gancho: "Doblada hacia abajo por la cara del extremo",
};
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

/** Las tres filas de anclaje comparan lo mismo; sólo cambian el título y el extremo. */
const comparacionAnclaje = (a: AnclajeExtremo) => ({
  real: { etiqueta: "lbd", valor: a.lbdMm },
  limite: { etiqueta: "disponible", valor: a.disponibleMm },
  unidad: "mm",
  exige: "≤" as const,
});
const detalleAnclaje = (a: AnclajeExtremo) => `σsd = ${fmt(a.sigmaSdMPa, 0)} MPa. Anejo 19, art. 6.5.4 (7) y 8.4.`;

export default function VigaApeoVoladizoPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [rec, setRec] = useCampo("rec", "0.02");

  const [h, setH] = useCampo("h", "0.89");
  const [b, setB] = useCampo("b", "0.77");
  const [luz, setLuz] = useCampo("luz", "1.24");
  const [voladizo, setVoladizo] = useCampo("voladizo", "0.33");
  const [extremoLibre, setExtremoLibre] = useCampo("extremoLibre", "0.07");
  const [extremoLejano, setExtremoLejano] = useCampo("extremoLejano", "0.10");

  const [cargaAncho, setCargaAncho] = useCampo("cargaAncho", "0.14");
  const [cargaProf, setCargaProf] = useCampo("cargaProf", "0.50");
  const [apoyoCAncho, setApoyoCAncho] = useCampo("apoyoCAncho", "0.20");
  const [apoyoCProf, setApoyoCProf] = useCampo("apoyoCProf", "0.60");
  const [apoyoLAncho, setApoyoLAncho] = useCampo("apoyoLAncho", "0.20");
  const [apoyoLProf, setApoyoLProf] = useCampo("apoyoLProf", "0.60");
  const [elemLAncho, setElemLAncho] = useCampo("elemLAncho", "0.14");
  const [elemLProf, setElemLProf] = useCampo("elemLProf", "0.77");

  const [p, setP] = useCampo("p", "1485");
  const [nMax, setNMax] = useCampo("nMax", "500");
  const [nMin, setNMin] = useCampo("nMin", "350");

  const [nTirante, setNTirante] = useCampo("nTirante", "6");
  const [phiTirante, setPhiTirante] = useCampo("phiTirante", "20");
  const [phiEstribo, setPhiEstribo] = useCampo("phiEstribo", "12");
  const [forma, setForma] = useCampo<FormaAnclaje>("forma", "recta");
  const [nPilar, setNPilar] = useCampo("nPilar", "4");
  const [phiPilar, setPhiPilar] = useCampo("phiPilar", "12");

  const campos = useMemo(
    () => ({ fck, fyk, rec, h, b, luz, voladizo, extremoLibre, extremoLejano, cargaAncho, cargaProf, apoyoCAncho, apoyoCProf, apoyoLAncho, apoyoLProf, elemLAncho, elemLProf, p, nMax, nMin, nTirante, phiTirante, phiEstribo, forma, nPilar, phiPilar }),
    [fck, fyk, rec, h, b, luz, voladizo, extremoLibre, extremoLejano, cargaAncho, cargaProf, apoyoCAncho, apoyoCProf, apoyoLAncho, apoyoLProf, elemLAncho, elemLProf, p, nMax, nMin, nTirante, phiTirante, phiEstribo, forma, nPilar, phiPilar]
  );
  const resultado = useMemo(() => resolverApeoVoladizo(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const propuestas = useMemo(() => recomendarApeoVoladizo(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: las medidas y la carga tienen que ser positivas, y la carga mínima del apoyo lejano no puede superar a la máxima." });
  } else {
    if (!resultado.r.esGranCanto && !resultado.r.esMensulaCorta)
      avisos.push({ tipo: "aviso", texto: "Ni viga de gran canto ni ménsula corta: con esta esbeltez probablemente corresponda verificarla a flexión y cortante, no con bielas y tirantes." });
    if (resultado.r.traccionPilarLejanoKN > 0)
      avisos.push({ tipo: "aviso", texto: `El apoyo lejano se levanta: el pilar trabaja a ${fmt(resultado.r.traccionPilarLejanoKN, 0)} kN de tracción y sus barras tienen que quedar ancladas en la viga.` });
  }

  const dibujo = resultado ? (
    <DiagramaApeoVoladizo
      hM={resultado.n.h}
      luzM={resultado.n.luz}
      voladizoM={resultado.n.voladizo}
      extremoLibreM={resultado.n.extremoLibre}
      extremoLejanoM={resultado.n.extremoLejano}
      zM={resultado.r.zM}
      anchoCargaM={resultado.n.cargaAncho}
      anchoApoyoCercanoM={resultado.n.apoyoCAncho}
      anchoApoyoLejanoM={resultado.n.apoyoLAncho}
      anchoElementoLejanoM={resultado.n.elemLAncho}
      pKN={resultado.n.p}
      reaccionCercanaKN={resultado.r.reaccionCercanaKN}
      reaccionLejanaMinKN={resultado.r.reaccionLejanaMinKN}
      traccionTiranteKN={resultado.r.traccionTiranteKN}
    />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">El modelo se dibuja con datos válidos.</p>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · Regiones D</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría y materiales" descripcion="La viga, sus dos apoyos y lo que baja sobre ella. Las cotas en el plano de la viga se miden entre ejes.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="rec" etiqueta="Recubrimiento" sufijo="m" valor={rec} onChange={setRec} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Viga">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="h" etiqueta="Canto h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="b" etiqueta="Espesor b" sufijo="m" valor={b} onChange={setB} />
                    <CampoNumerico id="luz" etiqueta="Luz entre apoyos L" sufijo="m" valor={luz} onChange={setLuz} />
                    <CampoNumerico id="voladizo" etiqueta="Apoyo cercano → carga, a" sufijo="m" valor={voladizo} onChange={setVoladizo} />
                    <CampoNumerico id="extremoLibre" etiqueta="Carga → extremo libre" sufijo="m" valor={extremoLibre} onChange={setExtremoLibre} />
                    <CampoNumerico id="extremoLejano" etiqueta="Apoyo lejano → extremo" sufijo="m" valor={extremoLejano} onChange={setExtremoLejano} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Contactos (en el plano × a través)">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="cargaAncho" etiqueta="Pilar apeado, en el plano" sufijo="m" valor={cargaAncho} onChange={setCargaAncho} />
                    <CampoNumerico id="cargaProf" etiqueta="Pilar apeado, a través" sufijo="m" valor={cargaProf} onChange={setCargaProf} />
                    <CampoNumerico id="apoyoCAncho" etiqueta="Apoyo cercano, en el plano" sufijo="m" valor={apoyoCAncho} onChange={setApoyoCAncho} />
                    <CampoNumerico id="apoyoCProf" etiqueta="Apoyo cercano, a través" sufijo="m" valor={apoyoCProf} onChange={setApoyoCProf} />
                    <CampoNumerico id="apoyoLAncho" etiqueta="Apoyo lejano, en el plano" sufijo="m" valor={apoyoLAncho} onChange={setApoyoLAncho} />
                    <CampoNumerico id="apoyoLProf" etiqueta="Apoyo lejano, a través" sufijo="m" valor={apoyoLProf} onChange={setApoyoLProf} />
                    <CampoNumerico id="elemLAncho" etiqueta="Sobre el apoyo lejano, en el plano" sufijo="m" valor={elemLAncho} onChange={setElemLAncho} />
                    <CampoNumerico id="elemLProf" etiqueta="Sobre el apoyo lejano, a través" sufijo="m" valor={elemLProf} onChange={setElemLProf} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={dibujo}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="La del voladizo flecta; la que baja sobre el apoyo lejano lo sujeta.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CampoNumerico id="p" etiqueta="P del voladizo, mayorada" sufijo="kN" valor={p} onChange={setP} />
            <CampoNumerico id="nMax" etiqueta="Sobre el apoyo lejano, máx. mayorada" sufijo="kN" valor={nMax} onChange={setNMax} />
            <CampoNumerico id="nMin" etiqueta="Sobre el apoyo lejano, mín. favorable" sufijo="kN" valor={nMin} onChange={setNMin} />
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            La mínima es la que compensa el levantamiento: sólo la parte permanente, ponderada como
            favorable. El coeficiente sale del Anejo 18, que la herramienta no tiene, así que el valor lo
            cargás ya ponderado.
          </p>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Tirante superior y barras del pilar lejano.">
          <div className="space-y-6">
            <Subgrupo titulo="Tirante superior">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="nTirante" etiqueta="Nº de barras" valor={nTirante} onChange={setNTirante} />
                <CampoDiametro id="phiTirante" etiqueta="Ø" valor={phiTirante} onChange={setPhiTirante} />
                <CampoDiametro id="phiEstribo" etiqueta="Ø estribo" valor={phiEstribo} onChange={setPhiEstribo} />
              </div>
              <div className="max-w-md pt-4">
                <CampoSeleccion
                  id="forma"
                  etiqueta="Extremos del tirante"
                  valor={FORMAS[forma]}
                  opciones={Object.values(FORMAS)}
                  onChange={(v) => setForma(formaPorNombre(v))}
                />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Pilar lejano">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="nPilar" etiqueta="Nº de barras ancladas en la viga" valor={nPilar} onChange={setNPilar} />
                <CampoDiametro id="phiPilar" etiqueta="Ø" valor={phiPilar} onChange={setPhiPilar} />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "h × b", valor: `${h} × ${b} m` },
              { etiqueta: "L / a", valor: `${luz} / ${voladizo} m` },
              ...(resultado
                ? [
                    { etiqueta: "Brazo z", valor: `${fmt(resultado.r.zM, 3)} m`, derivado: true },
                    { etiqueta: "Levantamiento P·a/L", valor: `${fmt(resultado.r.levantamientoKN, 0)} kN`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Sólo Anejo 19. No hay comprobaciones de la EHE-08 ni de Montoya.",
              "Celosía de un panel: biela de la carga al apoyo cercano, tirante superior hasta el apoyo lejano, biela de vuelta y el apoyo lejano levantado.",
              "Brazo z: del tirante a la cara de apoyo, z = h − d′.",
              "Nudos: bajo la carga, compresión con tirante (k2 = 0,85, ec. 6.61) en la cara cargada y en la de la biela; sobre el apoyo cercano, tres compresiones (k1 = 1,0, ec. 6.60) con tensiones iguales en sus caras (art. 6.5.4 (8)); sobre el apoyo lejano, k2 o k3 según el pilar esté comprimido o traccionado.",
              "Anclaje desde la cara interior del nudo (art. 6.5.4 (7)), con α3 = α4 = α5 = 1. Doblado, se mide por el eje de la barra (art. 8.4.3 (3)) con el mandril mínimo de la tabla A19.8.1.",
              "No comprueba la tracción transversal de las bielas (art. 6.5.3) ni el cortante: la malla del art. 9.7 se informa como mínimo a disponer.",
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
              <ConclusionAutomatica />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Tracción del tirante", valor: `${fmt(resultado.r.traccionTiranteKN, 0)} kN` },
                  { etiqueta: "Reacción apoyo cercano", valor: `${fmt(resultado.r.reaccionCercanaKN, 0)} kN` },
                  {
                    etiqueta: "Apoyo lejano, con la mínima",
                    valor: `${fmt(resultado.r.reaccionLejanaMinKN, 0)} kN`,
                    nota: resultado.r.reaccionLejanaMinKN < 0 ? "tracción" : "compresión",
                  },
                  { etiqueta: "θ cerca / lejos", valor: `${fmt(resultado.r.anguloBielaCercaGrados, 0)}° / ${fmt(resultado.r.anguloBielaLejosGrados, 0)}°` },
                ]}
              />

              <Subgrupo titulo="¿Corresponde bielas y tirantes?">
                <PanelFormulas
                  titulo="Ver los criterios de región D"
                  filas={[
                    { etiqueta: "Art. 5.3.1 (3): viga de gran canto si L < 3·h", valor: resultado.r.esGranCanto ? "Sí" : "No" },
                    { etiqueta: "Art. J.3 (1): ménsula corta si a_c < z", valor: resultado.r.esMensulaCorta ? "Sí" : "No" },
                  ]}
                />
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones resistentes">
                <div>
                  <ResultadoCheck
                    etiqueta="Tirante superior · armadura suficiente"
                    verifica={resultado.r.verificaTirante}
                    detalle="T = P·a/z, con fyd = fyk/γs."
                    comparacion={{ real: { etiqueta: "As real", valor: resultado.r.asRealTiranteCm2 }, limite: { etiqueta: "As nec", valor: resultado.r.asNecTiranteCm2 }, unidad: "cm²", exige: "≥" }}
                    recomendaciones={propuestas.tirante}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo bajo el pilar apeado · cara cargada (k2 = 0,85)"
                    verifica={resultado.r.nudoCargaApoyo.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.nudoCargaApoyo.sigmaMPa }, limite: { etiqueta: "σRd,max", valor: resultado.r.nudoCargaApoyo.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                    recomendaciones={propuestas.nudoCargaApoyo}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo bajo el pilar apeado · cara de la biela (k2 = 0,85)"
                    verifica={resultado.r.nudoCargaBiela.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.nudoCargaBiela.sigmaMPa }, limite: { etiqueta: "σRd,max", valor: resultado.r.nudoCargaBiela.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                    recomendaciones={propuestas.nudoCargaBiela}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo sobre el apoyo cercano (k1 = 1,0)"
                    verifica={resultado.r.nudoApoyoCercano.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.nudoApoyoCercano.sigmaMPa }, limite: { etiqueta: "σRd,max", valor: resultado.r.nudoApoyoCercano.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                    recomendaciones={propuestas.nudoApoyoCercano}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo bajo el elemento lejano"
                    verifica={resultado.r.nudoElementoLejano.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.nudoElementoLejano.sigmaMPa }, limite: { etiqueta: "σRd,max", valor: resultado.r.nudoElementoLejano.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                    recomendaciones={propuestas.nudoElementoLejano}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo sobre el apoyo lejano (k1 = 1,0)"
                    verifica={resultado.r.nudoApoyoLejano.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.nudoApoyoLejano.sigmaMPa }, limite: { etiqueta: "σRd,max", valor: resultado.r.nudoApoyoLejano.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                    recomendaciones={propuestas.nudoApoyoLejano}
                  />
                  <ResultadoCheck
                    etiqueta="Anclaje del tirante en el voladizo"
                    verifica={resultado.r.anclajeTiranteCarga.verifica}
                    detalle={detalleAnclaje(resultado.r.anclajeTiranteCarga)}
                    comparacion={comparacionAnclaje(resultado.r.anclajeTiranteCarga)}
                    recomendaciones={propuestas.anclajeCarga}
                  />
                  <ResultadoCheck
                    etiqueta="Anclaje del tirante sobre el apoyo lejano"
                    verifica={resultado.r.anclajeTiranteLejano.verifica}
                    detalle={detalleAnclaje(resultado.r.anclajeTiranteLejano)}
                    comparacion={comparacionAnclaje(resultado.r.anclajeTiranteLejano)}
                    recomendaciones={propuestas.anclajeLejano}
                  />
                  {resultado.r.traccionPilarLejanoKN > 0 && (
                    <>
                      <ResultadoCheck
                        etiqueta="Pilar lejano a tracción · armadura suficiente"
                        verifica={resultado.r.verificaPilarLejano}
                        comparacion={{ real: { etiqueta: "As real", valor: resultado.r.asRealPilarLejanoCm2 }, limite: { etiqueta: "As nec", valor: resultado.r.asNecPilarLejanoCm2 }, unidad: "cm²", exige: "≥" }}
                        recomendaciones={propuestas.pilarLejano}
                      />
                      {resultado.r.anclajePilarLejano && (
                        <ResultadoCheck
                          etiqueta="Anclaje de las barras del pilar lejano en la viga (con patilla)"
                          verifica={resultado.r.anclajePilarLejano.verifica}
                          detalle={detalleAnclaje(resultado.r.anclajePilarLejano)}
                          comparacion={comparacionAnclaje(resultado.r.anclajePilarLejano)}
                          recomendaciones={propuestas.anclajePilar}
                        />
                      )}
                    </>
                  )}
                  <PanelFormulas
                    titulo="Ver desarrollo del modelo"
                    filas={[
                      { etiqueta: "d′ del tirante / brazo z", valor: `${fmt(resultado.r.dTirSuperiorM, 3)} / ${fmt(resultado.r.zM, 3)} m` },
                      { etiqueta: "Levantamiento V = P·a/L", valor: `${fmt(resultado.r.levantamientoKN, 1)} kN` },
                      { etiqueta: "Apoyo lejano con la carga máx. / mín.", valor: `${fmt(resultado.r.reaccionLejanaMaxKN, 1)} / ${fmt(resultado.r.reaccionLejanaMinKN, 1)} kN` },
                      { etiqueta: "Biela cercana / lejana", valor: `${fmt(resultado.r.compresionBielaCercaKN, 0)} / ${fmt(resultado.r.compresionBielaLejosKN, 0)} kN` },
                      { etiqueta: "ν′ = 1 − fck/250", valor: fmt(resultado.r.nuPrima, 3) },
                      { etiqueta: "Mandril mínimo del tirante (tabla A19.8.1)", valor: `${fmt(resultado.r.mandrilMinimoMm, 0)} mm` },
                      { etiqueta: "Malla mínima por cara y dirección (art. 9.7 (1))", valor: `${fmt(resultado.r.mallaMinimaCm2PorM)} cm²/m` },
                    ]}
                  />
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
