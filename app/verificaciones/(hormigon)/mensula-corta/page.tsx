"use client";

import { useMemo } from "react";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SeccionPlegable } from "@/components/verificaciones/comun/SeccionPlegable";
import { DiagramaMensulaArmado } from "@/components/verificaciones/hormigon/DiagramaMensulaArmado";
import { DiagramaMensulaModelo } from "@/components/verificaciones/hormigon/DiagramaMensulaModelo";
import { DiagramaMensulaPlanta } from "@/components/verificaciones/hormigon/DiagramaMensulaPlanta";
import { useCampo } from "@/lib/hooks/useCampo";
import {
  type ResultadoMensulaCorta,
} from "@/lib/calc/hormigon/mensula-corta";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverMensulaCorta } from "@/lib/calc/hormigon/resolver-mensula-corta";
import { recomendarMensulaCorta, type RecomendacionesMensula } from "@/lib/verificaciones/recomendaciones/mensula-corta";

const meta = registroVerificaciones.find((v) => v.id === "mensula-corta")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armaduras" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const DIAMETROS_PRINCIPAL = [12, 16, 20, 25, 32] as const;
const DIAMETROS_CERCO = [8, 10, 12, 16] as const;

export default function Page() {
  const [norma, setNorma] = useCampo("norma", meta.normasDisponibles[0]);

  const [ac, setAc] = useCampo("ac", "0,20");
  const [hc, setHc] = useCampo("hc", "0,50");
  const [h1, setH1] = useCampo("h1", "0,25");
  const [b, setB] = useCampo("b", "0,40");
  const [hcol, setHcol] = useCampo("hcol", "0,40");
  const [ap, setAp] = useCampo("ap", "0,15");
  const [bp, setBp] = useCampo("bp", "0,30");
  const [rec, setRec] = useCampo("rec", "0,035");

  const [fEd, setFEd] = useCampo("fEd", "450");
  const [hEd, setHEd] = useCampo("hEd", "67,5");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [phiP, setPhiP] = useCampo("phiP", "20");
  const [phiE, setPhiE] = useCampo("phiE", "10");
  const [adherencia, setAdherencia] = useCampo("adherencia", "Buena");
  const [soldada, setSoldada] = useCampo("soldada", "No");

  const campos = useMemo(
    () => ({ ac, hc, h1, b, hcol, ap, bp, rec, fEd, hEd, fck, fyk, phiP, phiE, adherencia, soldada }),
    [ac, hc, h1, b, hcol, ap, bp, rec, fEd, hEd, fck, fyk, phiP, phiE, adherencia, soldada]
  );
  const resultado = useMemo(() => resolverMensulaCorta(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const propuestas = useMemo(() => recomendarMensulaCorta(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos, o el recubrimiento deja la pieza sin canto útil." });
  } else {
    if (!resultado.r.modelo.esMensulaCorta)
      avisos.push({ tipo: "aviso", texto: "a꜀ supera el canto: no es una ménsula corta y el modelo de bielas y tirantes de esta página deja de aplicar." });
    if (!resultado.r.modelo.tanEnRango)
      avisos.push({ tipo: "aviso", texto: `tg θ = ${fmt(resultado.r.modelo.tanTheta)} queda fuera del rango 1,0–2,5 que pide el §J.3(1).` });
    if (!resultado.r.hormigon.cumpleAvisoD0)
      avisos.push({
        tipo: "aviso",
        texto: `Criterio de Montoya (§24.8.1), no del Anejo 19: d₀ = ${fmt(resultado.r.hormigon.d0M, 3)} m < d/2 = ${fmt(resultado.r.hormigon.d0MinM, 3)} m en el borde de la placa, con riesgo de degollamiento. No entra en el cumple.`,
      });
    if (resultado.r.cercos.cercosBajo2d3 > 0)
      avisos.push({
        tipo: "aviso",
        texto: `Criterio de Montoya (§24.8.3.c), no del Anejo 19: ${resultado.r.cercos.cercosBajo2d3} cerco(s) quedan por debajo de 2·d/3 y él no los contaría. El Anejo los cuenta a todos.`,
      });
  }

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

      <p className="text-sm text-muted-foreground">
        La ménsula corta es una región D: la carga entra concentrada a pocos centímetros de la cara
        del pilar y no vale Bernoulli. Se resuelve con bielas y tirantes, entera por el Anejo 19
        (art. J.3 y apartado 6.5).
      </p>

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría" descripcion="Ménsula, pilar y placa de apoyo de la carga.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="ac" etiqueta="a꜀ — eje de carga a cara del pilar" sufijo="m" valor={ac} onChange={setAc} />
                <CampoNumerico id="hc" etiqueta="h꜀ — canto en el arranque" sufijo="m" valor={hc} onChange={setHc} />
                <CampoNumerico id="h1" etiqueta="h₁ — canto en el borde" sufijo="m" valor={h1} onChange={setH1} />
                <CampoNumerico id="b" etiqueta="b — ancho de la ménsula" sufijo="m" valor={b} onChange={setB} />
                <CampoNumerico id="hcol" etiqueta="Canto del pilar" sufijo="m" valor={hcol} onChange={setHcol} />
                <CampoNumerico id="rec" etiqueta="Recubrimiento nominal" sufijo="m" valor={rec} onChange={setRec} />
                <CampoNumerico id="ap" etiqueta="a_p — placa, según el vuelo" sufijo="m" valor={ap} onChange={setAp} />
                <CampoNumerico id="bp" etiqueta="b_p — placa, según el ancho" sufijo="m" valor={bp} onChange={setBp} />
              </div>
            }
            dibujo={
              resultado ? (
                <DiagramaMensulaModelo
                  acM={resultado.geometria.acM}
                  hcM={resultado.geometria.hcM}
                  h1M={resultado.geometria.h1M}
                  hcolM={resultado.geometria.hcolM}
                  apM={resultado.geometria.apM}
                  vueloTotalM={resultado.r.despiece.vueloTotalM}
                  zM={resultado.r.modelo.zM}
                  yTiranteM={resultado.r.despiece.yTiranteM}
                  thetaGrados={resultado.r.modelo.thetaGrados}
                  d0M={resultado.r.hormigon.d0M}
                  d0MinM={resultado.r.hormigon.d0MinM}
                  fEdKN={resultado.fEdKN}
                  hEdKN={resultado.hEdKN}
                  traccionTiranteKN={resultado.r.tirante.ftdKN}
                  compresionBielaKN={resultado.r.hormigon.compresionBielaKN}
                  esMensulaCorta={resultado.r.modelo.esMensulaCorta}
                  tanEnRango={resultado.r.modelo.tanEnRango}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">El modelo se dibuja con geometría y cargas válidas.</p>
              )
            }
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas de cálculo" descripcion="Ya mayoradas.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="fEd" etiqueta="F_Ed — vertical" sufijo="kN" valor={fEd} onChange={setFEd} />
            <CampoNumerico
              id="hEd"
              etiqueta="H_Ed — horizontal"
              sufijo="kN"
              valor={hEd}
              onChange={setHEd}
            />
            <p className="col-span-2 text-xs text-muted-foreground">
              El Anejo 19 no fija un H mínimo: se carga el que corresponda. Es habitual considerar una
              horizontal por retracción, temperatura o rozamiento del apoyo.
            </p>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Materiales y armaduras" descripcion="Marco principal del tirante y cercos.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="fck" etiqueta="f_ck" sufijo="MPa" valor={fck} onChange={setFck} />
            <CampoNumerico id="fyk" etiqueta="f_yk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            <CampoSeleccion id="phiP" etiqueta="ø del marco principal" valor={phiP} opciones={DIAMETROS_PRINCIPAL.map(String)} onChange={setPhiP} />
            <CampoSeleccion id="phiE" etiqueta="ø de los cercos" valor={phiE} opciones={DIAMETROS_CERCO.map(String)} onChange={setPhiE} />
            <CampoSeleccion id="adherencia" etiqueta="Condición de adherencia" valor={adherencia} opciones={["Buena", "Mala"]} onChange={setAdherencia} />
            <CampoSeleccion id="soldada" etiqueta="Barra transversal soldada" valor={soldada} opciones={["No", "Sí"]} onChange={setSoldada} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "a꜀ / h꜀ / b", valor: `${ac} / ${hc} / ${b} m` },
              { etiqueta: "F_Ed / H_Ed", valor: `${fEd} / ${hEd} kN` },
              { etiqueta: "f_ck / f_yk", valor: `${fck} / ${fyk} MPa` },
              ...(resultado
                ? [
                    { etiqueta: "d / z", valor: `${fmt(resultado.r.modelo.dM, 3)} / ${fmt(resultado.r.modelo.zM, 3)} m`, derivado: true },
                    { etiqueta: "θ biela", valor: `${fmt(resultado.r.modelo.thetaGrados, 1)}°`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Todo por el Anejo 19: modelo de bielas y tirantes con z = 0,8·d y tirante F_td = F·a꜀/z + H (art. J.3 y 6.5), f_yd = f_yk/γ_s con γ꜀ = 1,50 y γ_s = 1,15, cuantía mínima del art. 9.2.1.1.",
              "Cercos (art. J.3): con a꜀ ≤ 0,5·h꜀, horizontales con A_s ≥ 0,25·A_s,main; con a꜀ > 0,5·h꜀, verticales con A_s ≥ 0,5·F_Ed/f_yd sólo si F_Ed > V_Rd,c. Mínimo 3 cercos y separación de 150 mm.",
              "Tope del cortante, ec. (6.5): F_Ed ≤ 0,5·b·d·ν·f_cd (art. 6.2.2(6)).",
              "Dos reglas de detalle de Montoya, sin equivalente en el Anejo, quedan como avisos que no entran en el cumple: d₀ ≥ d/2 en el borde (degollamiento) y cercos en los 2/3 superiores de d.",
              "El marco es un lazo cerrado y el anclaje se mide sobre el eje de la barra (art. 8.4.3(3)).",
              "No calcula V_Rd,c en la sección de arranque contra el pilar: esa comprobación va aparte.",
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
            <Resultados
              r={resultado.r}
              geometria={resultado.geometria}
              phiP={Number(phiP)}
              phiE={Number(phiE)}
              propuestas={propuestas}
            />
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}

interface ResultadosProps {
  r: ResultadoMensulaCorta;
  geometria: { hcM: number; h1M: number; hcolM: number; bM: number; acM: number; apM: number; bpM: number; recubrimientoM: number };
  phiP: number;
  phiE: number;
  /** Cambios recalculados para lo que no cumple o queda justo. */
  propuestas: RecomendacionesMensula;
}

function Resultados({ r, geometria, phiP, phiE, propuestas }: ResultadosProps) {
  const cercoCm2 = r.cercos.asRealCm2 / r.cercos.numeroCercos;

  return (
    <div className="space-y-10">
      <ConclusionAutomatica />

      <PanelMetricas
        horizontal
        metricas={[
          { etiqueta: "θ biela", valor: `${fmt(r.modelo.thetaGrados, 1)}°`, nota: `tg θ ${fmt(r.modelo.tanTheta)}` },
          { etiqueta: "F_td tirante", valor: `${fmt(r.tirante.ftdKN, 1)} kN`, nota: "F·a꜀/z + H" },
          { etiqueta: "A_s tirante", valor: `${fmt(r.tirante.asNecCm2)} cm²`, nota: `${r.tirante.numeroBarras}ø${phiP} = ${fmt(r.tirante.asRealCm2)} cm²` },
          { etiqueta: "Cercos", valor: r.cercos.requeridos ? `${r.cercos.numeroCercos} ø${phiE}` : "no hacen falta", nota: r.cercos.caso },
        ]}
      />

      <div className="grid items-start gap-8 md:grid-cols-2">
        <DiagramaMensulaArmado
          hcM={geometria.hcM}
          h1M={geometria.h1M}
          hcolM={geometria.hcolM}
          vueloTotalM={r.despiece.vueloTotalM}
          marco={r.despiece.marco}
          cercos={r.despiece.cercos}
          numeroBarras={r.tirante.numeroBarras}
          diametroPrincipalMm={phiP}
          diametroCercoMm={phiE}
          numeroCercos={r.cercos.numeroCercos}
          caso={r.cercos.caso}
          lbdMensulaMm={r.anclaje.lbdMensulaMm}
          disponibleMensulaMm={r.anclaje.disponibleMensulaMm}
          lbdPilarMm={r.anclaje.lbdPilarMm}
          pataPilarMm={r.anclaje.pataPilarMm}
        />
        <DiagramaMensulaPlanta
          hcolM={geometria.hcolM}
          vueloTotalM={r.despiece.vueloTotalM}
          bM={geometria.bM}
          acM={geometria.acM}
          apM={geometria.apM}
          bpM={geometria.bpM}
          recubrimientoM={geometria.recubrimientoM}
          cercos={r.despiece.cercos}
          numeroBarras={r.tirante.numeroBarras}
          diametroPrincipalMm={phiP}
          diametroCercoMm={phiE}
          anchoCercoM={geometria.bM - 2 * geometria.recubrimientoM}
        />
      </div>

      <Subgrupo titulo="Hormigón · bielas y nudos">
        <div>
          <ResultadoCheck
            etiqueta="Nudo bajo la placa"
            verifica={r.hormigon.nudo.verifica}
            detalle="Ec. (6.61), nudo comprimido con tirante anclado, k₂ = 0,85. Resiste el ancho de la placa, no el de la ménsula."
            comparacion={{ real: { etiqueta: "σ", valor: r.hormigon.nudo.sigmaMPa }, limite: { etiqueta: "k₂·ν′·f_cd", valor: r.hormigon.nudo.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
            recomendaciones={propuestas.nudo}
          />
          <ResultadoCheck
            etiqueta="Biela comprimida"
            verifica={r.hormigon.biela.verifica}
            detalle="Ec. (6.56): la biela lleva tracción transversal, así que su tope es 0,6·ν′·f_cd."
            comparacion={{ real: { etiqueta: "σ", valor: r.hormigon.biela.sigmaMPa }, limite: { etiqueta: "0,6·ν′·f_cd", valor: r.hormigon.biela.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
            recomendaciones={propuestas.biela}
          />
          <ResultadoCheck
            etiqueta="Tope del cortante"
            verifica={r.hormigon.cortanteMaximo.verifica}
            detalle="Art. 6.2.2(6), ec. (6.5) y (6.6): F_Ed/(b·d) ≤ 0,5·ν·f_cd, con ν = 0,6·(1 − f_ck/250). Es el tope del Anejo para cargas cerca del apoyo, y la fig. A19.6.4(b) es una ménsula."
            comparacion={{ real: { etiqueta: "F/(b·d)", valor: r.hormigon.cortanteMaximo.sigmaMPa }, limite: { etiqueta: "0,5·ν·f_cd", valor: r.hormigon.cortanteMaximo.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
            recomendaciones={propuestas.cortanteMaximo}
          />
        </div>
      </Subgrupo>

      <Subgrupo titulo="Tirante y cercos">
        <div>
          <ResultadoCheck
            etiqueta="Armadura principal del tirante"
            verifica={r.tirante.verificaAs}
            detalle={`${r.tirante.numeroBarras}ø${phiP}. Gobierna ${r.tirante.mandaCuantiaMinima ? "la cuantía mínima del art. 9.2.1.1" : "el tirante del art. J.3"}.`}
            comparacion={{ real: { etiqueta: "A_s real", valor: r.tirante.asRealCm2 }, limite: { etiqueta: "A_s nec", valor: r.tirante.asNecCm2 }, unidad: "cm²", exige: "≥" }}
            recomendaciones={propuestas.tirante}
          />
          {r.cercos.requeridos ? (
            <ResultadoCheck
              etiqueta={`Cercos ${r.cercos.caso}`}
              verifica={r.cercos.verificaAs}
              detalle={`${r.cercos.caso === "horizontales" ? "Art. J.3(2): 0,25·A_s,main." : "Art. J.3(3): 0,5·F_Ed/f_yd, porque F_Ed > V_Rd,c."} ${r.cercos.numeroCercos} cercos cerrados ø${phiE} de ${fmt(cercoCm2)} cm² cada uno (dos ramas). El área pedía ${r.cercos.numeroPorArea}; el resto sale del mínimo de 3 y de la separación de 150 mm.`}
              comparacion={{ real: { etiqueta: "A_s real", valor: r.cercos.asRealCm2 }, limite: { etiqueta: "A_s nec", valor: r.cercos.asNecCm2 }, unidad: "cm²", exige: "≥" }}
              recomendaciones={propuestas.cercos}
            />
          ) : (
            <ResultadoCheck
              etiqueta="Cercos verticales"
              verifica
              estado="no-aplica"
              detalle={`Art. J.3(3): con a꜀ > 0,5·h꜀ sólo hacen falta si F_Ed > V_Rd,c, y la carga no pasa de V_Rd,c = ${fmt(r.cercos.vRdCKN, 1)} kN.`}
            />
          )}
          <PanelFormulas
            titulo="Ver desarrollo del modelo y el tirante"
            filas={[
              { etiqueta: "Canto útil", valor: `${fmt(r.modelo.dM, 3)} m`, formula: "d = h꜀ − c − ø_cerco − ø/2" },
              { etiqueta: "Brazo mecánico", valor: `${fmt(r.modelo.zM, 3)} m`, formula: "z = 0,8·d" },
              { etiqueta: "Ángulo de la biela", valor: `${fmt(r.modelo.thetaGrados, 1)}°`, formula: "tg θ = z/a꜀", sustitucion: `tg θ = ${fmt(r.modelo.tanTheta)} — el §J.3(1) pide entre 1,0 y 2,5` },
              { etiqueta: "Tirante — art. J.3", valor: `${fmt(r.tirante.ftdKN, 1)} kN`, formula: "F_td = F_Ed·a꜀/z + H_Ed", sustitucion: `A_s = F_td/f_yd = ${fmt(r.tirante.asTiranteCm2)} cm²` },
              { etiqueta: "Cuantía mínima", valor: `${fmt(r.tirante.asMinimaCm2)} cm²`, formula: "máx(0,26·f_ctm/f_yk·b·d ; 0,0013·b·d) — art. 9.2.1.1" },
              { etiqueta: "V_Rd,c en el arranque", valor: `${fmt(r.cercos.vRdCKN, 1)} kN`, formula: "ec. (6.2.a) — decide los cercos verticales del art. J.3(3)" },
              { etiqueta: "Armadura adoptada", valor: `${r.tirante.numeroBarras}ø${phiP} = ${fmt(r.tirante.asRealCm2)} cm²`, sustitucion: `Necesaria ${fmt(r.tirante.asNecCm2)} cm² — aprovechamiento ${fmt(r.tirante.aprovechamiento * 100, 0)} %` },
            ]}
          />
        </div>
      </Subgrupo>

      <Subgrupo titulo="Condiciones constructivas" detalle="geometría del borde y anclajes">
        <div>
          <p className="text-xs text-muted-foreground">
            Avisos de buena práctica, criterio de Montoya y no del Anejo 19, que no entran en el cumple:
            d₀ = {fmt(r.hormigon.d0M, 3)} m {r.hormigon.cumpleAvisoD0 ? "≥" : "<"} d/2 = {fmt(r.hormigon.d0MinM, 3)} m
            en el borde de la placa (degollamiento, §24.8.1)
            {r.cercos.requeridos && r.cercos.caso === "horizontales"
              ? `; ${r.cercos.cercosBajo2d3} cerco(s) por debajo de 2·d/3 = ${fmt(r.cercos.limite2d3M, 3)} m (§24.8.3.c)`
              : ""}
            .
          </p>
          <ResultadoCheck
            etiqueta="Anclaje del marco en la ménsula"
            verifica={r.anclaje.verificaMensula}
            detalle="Art. 8.4.3(3): se mide sobre el eje de la barra, así que la bajada por el borde y el retorno por el intradós cuentan."
            comparacion={{ real: { etiqueta: "l_bd", valor: r.anclaje.lbdMensulaMm }, limite: { etiqueta: "disponible", valor: r.anclaje.disponibleMensulaMm }, unidad: "mm", exige: "≤", decimales: 0 }}
            recomendaciones={propuestas.anclajeMensula}
          />
          <ResultadoCheck
            etiqueta="Anclaje del marco en el pilar"
            verifica={r.anclaje.verificaPilar}
            detalle={`La pata se dimensiona: ${fmt(r.anclaje.pataPilarMm, 0)} mm, nunca menos de 15ø.`}
            comparacion={{ real: { etiqueta: "l_bd", valor: r.anclaje.lbdPilarMm }, limite: { etiqueta: "disponible", valor: r.anclaje.disponiblePilarMm }, unidad: "mm", exige: "≤", decimales: 0 }}
            recomendaciones={propuestas.anclajePilar}
          />
          <PanelFormulas
            titulo="Ver desarrollo de materiales y anclaje"
            filas={[
              { etiqueta: "f_cd", valor: `${fmt(r.materiales.fcdMPa)} MPa`, formula: "f_ck/γ꜀" },
              { etiqueta: "f_yd", valor: `${fmt(r.materiales.fydMPa)} MPa`, formula: "f_yk/γ_s" },
              { etiqueta: "ν′", valor: fmt(r.materiales.nuPrima, 3), formula: "1 − f_ck/250" },
              { etiqueta: "f_ctm", valor: `${fmt(r.materiales.fctmMPa)} MPa`, formula: "tabla A19.3.1" },
              {
                etiqueta: "f_bd",
                valor: `${fmt(r.anclaje.fbdMPa)} MPa`,
                formula: "2,25·η₁·η₂·f_ctd — ec. (8.2)",
                sustitucion: `η₁ = ${fmt(r.anclaje.eta1, 1)} · η₂ = ${fmt(r.anclaje.eta2, 2)} · f_ctd = ${fmt(r.anclaje.fctdMPa)} MPa`,
              },
              { etiqueta: "l_b,rqd", valor: `${fmt(r.anclaje.lbRqdMm, 0)} mm`, formula: "(ø/4)·(σ_sd/f_bd) — ec. (8.3)", sustitucion: `σ_sd = ${fmt(r.anclaje.sigmaSdMPa)} MPa, con el acero realmente puesto` },
              {
                etiqueta: "l_bd en la ménsula",
                valor: `${fmt(r.anclaje.lbdMensulaMm, 0)} mm`,
                formula: "α₁·α₂·α₃·α₄·α₅·l_b,rqd ≥ l_b,mín — ec. (8.4)",
                sustitucion: `α₁ = ${fmt(r.anclaje.alfa1, 2)} · α₂ = ${fmt(r.anclaje.alfa2, 2)} · α₄ = ${fmt(r.anclaje.alfa4, 2)} · α₅ = ${fmt(r.anclaje.alfa5, 2)} (presión de ${fmt(r.anclaje.presionTransversalMPa)} MPa bajo la placa)`,
              },
              { etiqueta: "l_bd en el pilar", valor: `${fmt(r.anclaje.lbdPilarMm, 0)} mm`, sustitucion: `Sin α₅: del lado del pilar no hay presión transversal. l_b,mín = ${fmt(r.anclaje.lbMinMm, 0)} mm` },
            ]}
          />
        </div>
      </Subgrupo>

      <SeccionPlegable
        titulo="Despiece"
        resumen={`${r.tirante.numeroBarras}ø${phiP} de ${fmt(r.despiece.desarrolloBarraM)} m · ${r.despiece.cercos.length} cercos ø${phiE}`}
      >
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Marco principal — {r.tirante.numeroBarras}ø{phiP}</p>
            <p className="text-muted-foreground">
              Pata en el pilar {fmt(r.despiece.patalPilarM * 1000, 0)} mm + tramo superior{" "}
              {fmt(r.despiece.tramoSuperiorM * 1000, 0)} mm + bajada por el borde{" "}
              {fmt(r.despiece.bajadaExteriorM * 1000, 0)} mm + retorno por el intradós{" "}
              {fmt(r.despiece.retornoIntradosM * 1000, 0)} mm ={" "}
              <strong>{fmt(r.despiece.desarrolloBarraM * 1000, 0)} mm</strong> por barra.
            </p>
          </div>
          <div>
            <p className="font-medium">Cercos — ø{phiE}, cerrados</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {r.despiece.cercos.map((c, i) => (
                <li key={i} className="font-mono text-xs">
                  {c.tipo === "horizontal"
                    ? `H · y = ${fmt(c.y1M * 1000, 0)} mm · luz ${fmt(c.luzM * 1000, 0)} mm · desarrollo ${fmt(c.desarrolloM * 1000, 0)} mm${c.abrazaLaPata ? " · abraza la pata del marco" : ""}`
                    : `V · x = ${fmt(c.x1M * 1000, 0)} mm · luz ${fmt(c.luzM * 1000, 0)} mm · desarrollo ${fmt(c.desarrolloM * 1000, 0)} mm`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SeccionPlegable>
    </div>
  );
}
