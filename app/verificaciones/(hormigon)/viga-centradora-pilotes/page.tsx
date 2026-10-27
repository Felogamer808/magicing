"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { WMAX_POR_EXPOSICION, type FormaAnclajeCentradora } from "@/lib/calc/hormigon/cimentaciones/viga-centradora-pilotes";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverVigaCentradoraPilotes } from "@/lib/calc/hormigon/cimentaciones/resolver-viga-centradora-pilotes";
import {
  comprobarVigaCentradoraPilotes,
  recomendarVigaCentradoraPilotes,
} from "@/lib/verificaciones/recomendaciones/viga-centradora-pilotes";

const meta = registroVerificaciones.find((v) => v.id === "viga-centradora-pilotes")!;

const FORMAS: Record<FormaAnclajeCentradora, string> = {
  recta: "Barra recta",
  gancho: "Patilla a 90°",
  u: "La misma barra en U",
  horquilla: "Horquillas solapadas",
};
const formaPorNombre = (nombre: string) =>
  (Object.keys(FORMAS) as FormaAnclajeCentradora[]).find((f) => FORMAS[f] === nombre) ?? "recta";

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function VigaCentradoraPilotesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [b, setB] = useCampo("b", "0.8");
  const [h, setH] = useCampo("h", "0.6");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.04");
  const [excentricidad, setExcentricidad] = useCampo("excentricidad", "0.75");
  const [luzApoyos, setLuzApoyos] = useCampo("luzApoyos", "4.77");
  const [ladoPilar, setLadoPilar] = useCampo("ladoPilar", "0.4");
  const [dPilote, setDPilote] = useCampo("dPilote", "0.5");
  const [n1d, setN1d] = useCampo("n1d", "800");
  const [eacc, setEacc] = useCampo("eacc", "0.1");

  const [numeroSup, setNumeroSup] = useCampo("numeroSup", "8");
  const [diametroSup, setDiametroSup] = useCampo("diametroSup", "25");
  const [numeroInf, setNumeroInf] = useCampo("numeroInf", "4");
  const [diametroInf, setDiametroInf] = useCampo("diametroInf", "16");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "8");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "4");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclajeCentradora>("formaAnclaje", "recta");
  const [diametroHorquilla, setDiametroHorquilla] = useCampo("diametroHorquilla", "25");
  const [nqp, setNqp] = useCampo("nqp", "570");
  const [exposicion, setExposicion] = useCampo("exposicion", "XC2");

  const campos = useMemo(
    () => ({
      fck, fyk, b, h, recubrimiento, excentricidad, luzApoyos, ladoPilar, dPilote, n1d, eacc,
      numeroSup, diametroSup, numeroInf, diametroInf, diametroEstribo, numeroRamas, formaAnclaje, diametroHorquilla, nqp, exposicion,
    }),
    [
      fck, fyk, b, h, recubrimiento, excentricidad, luzApoyos, ladoPilar, dPilote, n1d, eacc,
      numeroSup, diametroSup, numeroInf, diametroInf, diametroEstribo, numeroRamas, formaAnclaje, diametroHorquilla, nqp, exposicion,
    ]
  );
  const resultado = useMemo(() => resolverVigaCentradoraPilotes(campos), [campos]);
  const comprobaciones = useMemo(() => comprobarVigaCentradoraPilotes(campos) ?? [], [campos]);
  const rec = useMemo(() => recomendarVigaCentradoraPilotes(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular. La distancia entre apoyos tiene que ser mayor que cero." });
  }
  if (resultado && resultado.r.alivioLejanoKN < 0) {
    avisos.push({
      tipo: "aviso",
      texto: "El peso propio pesa más que la palanca: el apoyo lejano queda comprimido y el tramo flecta hacia abajo. Lo toma la armadura inferior.",
    });
  }
  if (resultado && resultado.r.voladizo.sinReduccion) {
    avisos.push({ tipo: "aviso", texto: "a_v ≥ 2d: el voladizo no admite la reducción β y se verifica como una viga más." });
  }

  const r = resultado?.r;
  const v = r?.voladizo;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · palanca del nudo medianero</p>
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
          titulo="Geometría, materiales y carga"
          descripcion="Pilar de medianería a una distancia e de su pilote; la viga sigue hasta el centro del apoyo interior."
        >
          <div className="flex flex-col gap-6">
            <Subgrupo titulo="Materiales">
              <div className="grid max-w-xl grid-cols-2 gap-4">
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Viga">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="b" etiqueta="Ancho b" sufijo="m" valor={b} onChange={setB} />
                <CampoNumerico id="h" etiqueta="Canto h" sufijo="m" valor={h} onChange={setH} />
                <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento geom." sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Palanca">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoNumerico id="excentricidad" etiqueta="e: pilar → pilote" sufijo="m" valor={excentricidad} onChange={setExcentricidad} />
                <CampoNumerico id="luzApoyos" etiqueta="l − e: entre apoyos" sufijo="m" valor={luzApoyos} onChange={setLuzApoyos} />
                <CampoNumerico id="ladoPilar" etiqueta="Pilar // viga" sufijo="m" valor={ladoPilar} onChange={setLadoPilar} />
                <CampoNumerico id="dPilote" etiqueta="Ø pilote" sufijo="m" valor={dPilote} onChange={setDPilote} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Carga">
              <div className="grid max-w-xl grid-cols-2 gap-4">
                <CampoNumerico id="n1d" etiqueta="N₁d pilar" sufijo="kN" valor={n1d} onChange={setN1d} />
                <CampoNumerico id="eacc" etiqueta="e_acc" sufijo="m" valor={eacc} onChange={setEacc} />
                <CampoNumerico id="nqp" etiqueta="Nqp pilar (G + ψ2·Q)" sufijo="kN" valor={nqp} onChange={setNqp} />
                <CampoSeleccion
                  id="exposicion"
                  etiqueta="Clase de exposición"
                  valor={exposicion}
                  opciones={Object.keys(WMAX_POR_EXPOSICION)}
                  onChange={setExposicion}
                />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Armadura" descripcion="La superior toma la palanca; la inferior sólo trabaja si el tramo flecta hacia abajo.">
          <div className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="numeroSup" etiqueta="Superior · nº" valor={numeroSup} onChange={setNumeroSup} />
            <CampoDiametro id="diametroSup" etiqueta="Superior · Ø" valor={diametroSup} onChange={setDiametroSup} />
            <CampoNumerico id="numeroInf" etiqueta="Inferior · nº" valor={numeroInf} onChange={setNumeroInf} />
            <CampoDiametro id="diametroInf" etiqueta="Inferior · Ø" valor={diametroInf} onChange={setDiametroInf} />
            <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
            <CampoNumerico id="numeroRamas" etiqueta="Ramas" valor={numeroRamas} onChange={setNumeroRamas} />
            <CampoSeleccion
              id="formaAnclaje"
              etiqueta="Superior sobre el pilar"
              valor={FORMAS[formaAnclaje]}
              opciones={Object.values(FORMAS)}
              onChange={(x) => setFormaAnclaje(formaPorNombre(x))}
            />
            {formaAnclaje === "horquilla" && (
              <CampoDiametro id="diametroHorquilla" etiqueta="Ø horquillas" valor={diametroHorquilla} onChange={setDiametroHorquilla} />
            )}
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "b × h", valor: `${b} × ${h} m` },
              { etiqueta: "e / l − e", valor: `${excentricidad} / ${luzApoyos} m` },
              { etiqueta: "N₁d / e_acc", valor: `${n1d} kN / ${eacc} m` },
              { etiqueta: "Nqp / exposición", valor: `${nqp} kN / ${exposicion}` },
              ...(r
                ? [
                    { etiqueta: "l", valor: `${fmt(r.luzM, 3)} m`, derivado: true },
                    { etiqueta: "q = 1,35·25·b·h", valor: `${fmt(r.pesoVigaKNPorM)} kN/m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Palanca rígida (Jiménez Montoya, § 25.5.2): el pilar en x = 0, el pilote del nodo en x = e y el apoyo lejano en x = l. La viga no apoya en el terreno.",
              "Anejo 19, art. 9.8.3 (1), pág. 154: la viga suprime la excentricidad y se dimensiona para los momentos y cortantes que resulten, con Ø ≥ 12 mm.",
              "M_acc = N₁d·e_acc (JM § 25.10.3; el Anejo 19 no fija excentricidad accidental de pilotes), sumado entero en la sección del pilote.",
              "Peso propio de la viga en toda la luz, con γG = 1,35.",
              "El alivio ΔN del apoyo lejano no se descuenta de él: se informa.",
              "Sin axil de atado: lo toman las riostras.",
              "Flexión (art. 6.1) y mínimo de la ec. (9.1) con el motor de vigas; cortante del tramo por el art. 6.2 sin reducción.",
              "Voladizo pilar–pilote: β = a_v/2d (art. 6.2.2 (6), pág. 77; 6.2.3 (8), pág. 80), con a_v entre caras y el pilote como el cuadrado de igual área; VEd sin β ≤ VRd,max y ≤ ec. (6.5).",
              "Anclaje de la superior sobre el pilar medianero: desde la cara interior del pilar (art. 6.5.4 (7), pág. 100) hasta la cara exterior, donde termina la viga, menos el recubrimiento; con patilla suma la pata hasta h − 2·rec. σsd = Md/(z·As) con tope fyd; adherencia mala con h > 250 mm (fig. A19.8.2).",
              "Fisuración en la sección del pilote por el art. 7.3.4: Mqp = Nqp·e + qk·e²/2 con Nqp = G + ψ2·Q, sin M_acc ni mayorar el peso propio. wmax de la tabla 27.2 según la clase de exposición.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!r || !v ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionResultados
                comprobaciones={comprobaciones.map((c) => ({
                  etiqueta: c.nombre,
                  estado: c.cumple ? "cumple" : "no-cumple",
                  utilizacion: c.utilizacion,
                  conPropuestas: !!rec[c.clave as keyof typeof rec],
                }))}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "R₁ al pilote", valor: `${fmt(r.reaccionPiloteKN)} kN`, nota: `ΔN lejano ${fmt(r.alivioLejanoKN)} kN, no se descuenta` },
                  { etiqueta: "Md en el pilote", valor: `${fmt(r.momentoKNm)} kN·m` },
                  { etiqueta: "Vd tramo / voladizo", valor: `${fmt(r.cortanteTramoKN)} / ${fmt(v.vEdKN)} kN` },
                  { etiqueta: "Estribos", valor: `${numeroRamas} ramas Ø${diametroEstribo} c/ ${fmt(r.separacionEstribosM, 2)} m` },
                ]}
              />

              <Subgrupo titulo="Flexión" detalle="art. 6.1 y ec. (9.1)">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura superior, en el pilote"
                    verifica={r.flexion.verificaAs}
                    detalle={`Md = N₁d·e + M_acc + q·e²/2 = ${fmt(r.momentoExcentricidadKNm)} + ${fmt(r.momentoAccidentalKNm)} + ${fmt((r.pesoVigaKNPorM * resultado.v.excentricidad ** 2) / 2)} kN·m`}
                    comparacion={{
                      real: { etiqueta: "As real", valor: r.flexion.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: r.flexion.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.flexion}
                  />
                  {r.flexionVano && (
                    <ResultadoCheck
                      etiqueta="Armadura inferior, en el tramo"
                      verifica={r.flexionVano.verificaAs}
                      detalle={`M⁺ = ${fmt(r.momentoVanoKNm)} kN·m`}
                      comparacion={{
                        real: { etiqueta: "As real", valor: r.flexionVano.asRealCm2 },
                        limite: { etiqueta: "As nec", valor: r.flexionVano.asNecCm2 },
                        unidad: "cm²", exige: "≥",
                      }}
                      recomendaciones={rec.vano}
                    />
                  )}
                  <ResultadoCheck
                    etiqueta="Diámetro mínimo"
                    verifica={r.verificaDiametro}
                    detalle="art. 9.8.3 (1): Ø ≥ 12 mm"
                    recomendaciones={rec.diametro}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "R₁ = (N₁d·l + q·l²/2 + M_acc)/(l − e)", valor: `${fmt(r.reaccionPiloteKN)} kN` },
                      { etiqueta: "ΔN = R₁ − N₁d − q·l", valor: `${fmt(r.alivioLejanoKN)} kN` },
                      { etiqueta: "d", valor: `${fmt(r.flexion.d, 3)} m` },
                      { etiqueta: "μ", valor: fmt(r.flexion.mu, 3) },
                      { etiqueta: "As mín (9.1)", valor: `${fmt(r.flexion.asMinCm2)} cm²` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Cortante del tramo" detalle="art. 6.2.2 y 6.2.3">
                <div>
                  <ResultadoCheck
                    etiqueta="Bielas del alma"
                    verifica={r.cortanteTramo.verificaVRdMax}
                    detalle={`V = R₁ − N₁d − q·e · estribos c/ ${fmt(r.cortanteTramo.separacionAdoptadaM, 2)} m`}
                    comparacion={{
                      real: { etiqueta: "VEd", valor: r.cortanteTramoKN },
                      limite: { etiqueta: "VRd,max", valor: r.cortanteTramo.vRdMax },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.bielasTramo}
                  />
                  <ResultadoCheck
                    etiqueta="Separación transversal entre ramas"
                    verifica={r.cortanteTramo.verificaSeparacionTransversal}
                    detalle="art. 9.2.2 (8), ec. (9.8)"
                    comparacion={{
                      real: { etiqueta: "s_t", valor: r.cortanteTramo.separacionTransversalM },
                      limite: { etiqueta: "s_t,max", valor: r.cortanteTramo.separacionTransversalMaxM },
                      unidad: "m", exige: "≤",
                    }}
                    recomendaciones={rec.ramas}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "VRd,c", valor: `${fmt(Math.max(r.cortanteTramo.vRdC, r.cortanteTramo.vRdCMin))} kN` },
                      { etiqueta: "A/s necesaria", valor: `${fmt(r.cortanteTramo.a90Cm2PorM)} cm²/m` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Cortante del voladizo pilar–pilote" detalle="art. 6.2.2 (6) y 6.2.3 (8)">
                <div>
                  <ResultadoCheck
                    etiqueta="Bielas, VEd sin reducir"
                    verifica={v.verificaVRdMax && v.verifica65}
                    detalle={`VEd = N₁d + q·e · límite = mín(VRd,max; 0,5·b·d·ν·fcd)`}
                    comparacion={{
                      real: { etiqueta: "VEd", valor: v.vEdKN },
                      limite: { etiqueta: "límite", valor: Math.min(v.vRdMaxKN, v.vLimite65KN) },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.bielasVoladizo}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "a_v (entre caras)", valor: `${fmt(v.avM, 3)} m` },
                      { etiqueta: "β = a_v/2d", valor: fmt(v.beta, 3) },
                      { etiqueta: "VEd reducido = β·N₁d + q·e", valor: `${fmt(v.vEdReducidoKN)} kN` },
                      { etiqueta: "VRd,c", valor: `${fmt(v.vRdCKN)} kN` },
                      {
                        etiqueta: v.sinReduccion ? "A/s (celosía, ec. 6.8)" : "A/s (ec. 6.19, en 0,75·a_v)",
                        valor: `${fmt(v.a90NecCm2PorM)} cm²/m → c/ ${fmt(v.separacionM, 2)} m`,
                      },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Anclaje de la superior sobre el pilar" detalle="art. 6.5.4 (7) y 8.4">
                <div>
                  <ResultadoCheck
                    etiqueta={
                      r.anclajeSuperior.forma === "u"
                        ? `En U: la curva entra en el canto (vuelve ${fmt(r.anclajeSuperior.retornoMm, 0)} mm por abajo)`
                        : "Desde la cara interior del pilar hasta el extremo de la viga"
                    }
                    verifica={r.anclajeSuperior.verifica}
                    detalle={`${FORMAS[formaAnclaje].toLowerCase()} · adherencia ${r.anclajeSuperior.situacion} · σsd = ${fmt(r.anclajeSuperior.sigmaSdMPa)} MPa`}
                    comparacion={
                      r.anclajeSuperior.forma === "u" && r.anclajeSuperior.mandril
                        ? {
                            real: { etiqueta: "ocupa", valor: r.anclajeSuperior.mandril.ocupaMm },
                            limite: { etiqueta: "h − 2·rec", valor: r.anclajeSuperior.mandril.disponibleCantoMm },
                            unidad: "mm", exige: "≤", decimales: 0,
                          }
                        : {
                            real: { etiqueta: "disponible", valor: r.anclajeSuperior.disponibleMm },
                            limite: { etiqueta: "lbd", valor: r.anclajeSuperior.lbdMm },
                            unidad: "mm", exige: "≥", decimales: 0,
                          }
                    }
                    recomendaciones={rec.anclaje}
                  />
                  {r.anclajeSuperior.forma !== "recta" && (
                    <PanelFormulas
                      titulo="Ver desarrollo del extremo"
                      filas={[
                        ...(r.anclajeSuperior.forma === "u"
                          ? [{ etiqueta: "Retorno por abajo (para completar lbd)", valor: `${fmt(r.anclajeSuperior.retornoMm, 0)} mm` }]
                          : []),
                        ...(r.anclajeSuperior.horquillas
                          ? [
                              { etiqueta: `Solape l0 con α6 = ${fmt(r.anclajeSuperior.horquillas.alfa6, 2)} (art. 8.7.3)`, valor: `${fmt(r.anclajeSuperior.horquillas.l0Mm, 0)} mm por rama` },
                              {
                                etiqueta: `Horquillas ${numeroSup} Ø${fmt(r.anclajeSuperior.horquillas.diametroMm, 0)} contra Td/fyd`,
                                valor: `${fmt(r.anclajeSuperior.horquillas.asRealCm2)} ≥ ${fmt(r.anclajeSuperior.horquillas.asNecCm2)} cm²`,
                              },
                            ]
                          : []),
                        ...(r.anclajeSuperior.mandril
                          ? [
                              { etiqueta: "Mandril de la tabla A19.8.1", valor: `${fmt(r.anclajeSuperior.mandril.tablaMm, 0)} mm` },
                              {
                                etiqueta: "Mandril por la ec. (8.1)",
                                valor: r.anclajeSuperior.mandril.ec81Mm > 0 ? `${fmt(r.anclajeSuperior.mandril.ec81Mm, 0)} mm` : "no hace falta (≤ 5φ tras la curva)",
                              },
                              {
                                etiqueta: "La curva en el canto (h − 2·rec)",
                                valor: `${fmt(r.anclajeSuperior.mandril.ocupaMm, 0)} ${r.anclajeSuperior.mandril.entra ? "≤" : ">"} ${fmt(r.anclajeSuperior.mandril.disponibleCantoMm, 0)} mm`,
                              },
                            ]
                          : []),
                      ]}
                    />
                  )}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Fisuración en el pilote" detalle="art. 7.3.4 · cuasipermanente">
                <div>
                  <ResultadoCheck
                    etiqueta="Abertura característica de fisura"
                    verifica={r.fisuracion.resultado.verifica}
                    detalle={`Mqp = Nqp·e + qk·e²/2 = ${fmt(r.fisuracion.mqpKNm)} kN·m · ${exposicion}`}
                    comparacion={{
                      real: { etiqueta: "wk", valor: r.fisuracion.resultado.wkMm },
                      limite: { etiqueta: "wmax", valor: r.fisuracion.wMaxMm },
                      unidad: "mm", exige: "≤", decimales: 3,
                    }}
                    recomendaciones={rec.fisuracion}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "σs en servicio (sección fisurada)", valor: `${fmt(r.fisuracion.resultado.sigmaSMPa)} MPa` },
                      { etiqueta: "ρp,ef", valor: fmt(r.fisuracion.resultado.rhoPEf, 4) },
                      { etiqueta: "s_r,max", valor: `${fmt(r.fisuracion.resultado.srMaxMm, 0)} mm` },
                      { etiqueta: "εsm − εcm", valor: fmt(r.fisuracion.resultado.epsilonSmMenosCm * 1000, 3) + " ‰" },
                    ]}
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
