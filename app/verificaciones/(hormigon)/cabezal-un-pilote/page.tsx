"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { DiagramaCabezalUnPilote } from "@/components/verificaciones/hormigon/DiagramaCabezalUnPilote";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-un-pilote";
import {
  comprobarCabezalUnPilote,
  recomendarCabezalUnPilote,
} from "@/lib/verificaciones/recomendaciones/cabezal-un-pilote";

const meta = registroVerificaciones.find((v) => v.id === "cabezal-un-pilote")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Cercos" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const LIMITA: Record<"triple" | "canto" | "cabezal", string> = {
  triple: "el triple del lado cargado",
  canto: "el canto (h ≥ b₂ − b₁)",
  cabezal: "el lado del cabezal",
};

export default function CabezalUnPilotePage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [pilarX, setPilarX] = useCampo("pilarX", "0.3");
  const [pilarY, setPilarY] = useCampo("pilarY", "0.3");
  const [ladoX, setLadoX] = useCampo("ladoX", "0.9");
  const [ladoY, setLadoY] = useCampo("ladoY", "0.9");
  const [hCab, setHCab] = useCampo("hCab", "1");
  const [dPilote, setDPilote] = useCampo("dPilote", "0.5");
  const [ndPilar, setNdPilar] = useCampo("ndPilar", "690");

  const [nCercosSup, setNCercosSup] = useCampo("nCercosSup", "3");
  const [phiCercosSup, setPhiCercosSup] = useCampo("phiCercosSup", "10");
  const [nCercosInf, setNCercosInf] = useCampo("nCercosInf", "3");
  const [phiCercosInf, setPhiCercosInf] = useCampo("phiCercosInf", "12");

  const campos = useMemo(
    () => ({ fck, fyk, pilarX, pilarY, ladoX, ladoY, hCab, dPilote, ndPilar, nCercosSup, phiCercosSup, nCercosInf, phiCercosInf }),
    [fck, fyk, pilarX, pilarY, ladoX, ladoY, hCab, dPilote, ndPilar, nCercosSup, phiCercosSup, nCercosInf, phiCercosInf]
  );
  const resultado = useMemo(() => resolverCabezalUnPilote(campos), [campos]);
  const comprobaciones = useMemo(() => comprobarCabezalUnPilote(campos) ?? [], [campos]);
  const rec = useMemo(() => recomendarCabezalUnPilote(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos: no se puede calcular. El pilar y el pilote tienen que caber en el cabezal.",
    });
  }
  for (const [nombre, zona] of resultado ? ([["superior", resultado.r.superior], ["inferior", resultado.r.inferior]] as const) : []) {
    if (zona.x.aSuperaMitad || zona.y.aSuperaMitad) {
      avisos.push({
        tipo: "aviso",
        texto: `Mitad ${nombre}: el ancho cargado supera H/2, fuera del rango de la ec. (6.59) (fig. A19.6.25b). T sale de la ec. (6.58) con b = lado del cabezal.`,
      });
    }
  }

  const zonas = resultado
    ? ([
        { id: "Sup", titulo: "Mitad superior", detalle: "bajo el pilar", zona: resultado.r.superior, rec: rec.cercosSup },
        { id: "Inf", titulo: "Mitad inferior", detalle: "sobre el pilote", zona: resultado.r.inferior, rec: rec.cercosInf },
      ] as const)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · compresión localizada</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y carga" descripcion="Cabezal sobre un pilote, con el pilar centrado.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Cabezal, pilar y pilote">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="ladoX" etiqueta="Lado x" sufijo="m" valor={ladoX} onChange={setLadoX} />
                    <CampoNumerico id="ladoY" etiqueta="Lado y" sufijo="m" valor={ladoY} onChange={setLadoY} />
                    <CampoNumerico id="hCab" etiqueta="H" sufijo="m" valor={hCab} onChange={setHCab} />
                    <CampoNumerico id="pilarX" etiqueta="Pilar x" sufijo="m" valor={pilarX} onChange={setPilarX} />
                    <CampoNumerico id="pilarY" etiqueta="Pilar y" sufijo="m" valor={pilarY} onChange={setPilarY} />
                    <CampoNumerico id="dPilote" etiqueta="D pilote" sufijo="m" valor={dPilote} onChange={setDPilote} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Carga">
                  <div className="max-w-[12rem]">
                    <CampoNumerico id="ndPilar" etiqueta="Nd pilar" sufijo="kN" valor={ndPilar} onChange={setNdPilar} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={
              <DiagramaCabezalUnPilote
                ladoXM={resultado?.n.ladoX ?? 0.9}
                hM={resultado?.n.hCab ?? 1}
                pilarXM={resultado?.n.pilarX ?? 0.3}
                diametroPiloteM={resultado?.n.dPilote ?? 0.5}
              />
            }
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Cercos horizontales" descripcion="Cercos cerrados en cada mitad del canto: cada uno pone dos ramas en cada dirección.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="nCercosSup" etiqueta="Mitad superior · cercos" valor={nCercosSup} onChange={setNCercosSup} />
            <CampoDiametro id="phiCercosSup" etiqueta="Mitad superior · Ø" valor={phiCercosSup} onChange={setPhiCercosSup} />
            <CampoNumerico id="nCercosInf" etiqueta="Mitad inferior · cercos" valor={nCercosInf} onChange={setNCercosInf} />
            <CampoDiametro id="phiCercosInf" etiqueta="Mitad inferior · Ø" valor={phiCercosInf} onChange={setPhiCercosInf} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "x × y × H", valor: `${ladoX} × ${ladoY} × ${hCab} m` },
              { etiqueta: "Pilar / pilote", valor: `${pilarX} × ${pilarY} m / Ø ${dPilote} m` },
              { etiqueta: "Nd pilar", valor: `${ndPilar} kN` },
              ...(resultado
                ? [{ etiqueta: "Nd al pilote", valor: `${fmt(resultado.r.ndPiloteKN)} kN`, derivado: true }]
                : []),
            ]}
            hipotesis={[
              "El Anejo 19 deja los encepados fuera de su alcance (art. 9.8.1, pág. 152): se usa el articulado general, sin cuantía mínima propia.",
              "Compresión localizada del pilar sobre el cabezal y del cabezal sobre el pilote: art. 6.7, ec. (6.63), con A_c1 semejante a A_c0.",
              "Tracción transversal por mitad del canto, con z = h/2: la superior con el pilar y Nd, la inferior con el pilote y Nd + 1,35·peso propio (art. 6.5.3, ec. 6.58/6.59).",
              "Si el ancho cargado supera H/2, la ec. (6.59) queda fuera de su rango (a ≤ h): se usa la (6.58), T = ¼·(b − a)/b·F, con b = lado del cabezal.",
              "El pilote entra en la ec. (6.58/6.59) como el cuadrado de igual área: a = 0,886·D.",
              "fyd = fyk/γs (art. 6.5.3 (1) remite al 3.2).",
              "Pilar centrado: la excentricidad accidental la toman las vigas de atado, que se verifican aparte.",
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
                  { etiqueta: "Nd al pilote", valor: `${fmt(resultado.r.ndPiloteKN)} kN`, nota: `peso propio ${fmt(resultado.r.pesoPropioKN)} kN` },
                  { etiqueta: "F_Rdu bajo el pilar", valor: `${fmt(resultado.r.compresionPilar.fRduKN)} kN` },
                  { etiqueta: "F_Rdu sobre el pilote", valor: `${fmt(resultado.r.compresionPilote.fRduKN)} kN` },
                ]}
              />

              <Subgrupo titulo="Compresión localizada" detalle="art. 6.7, ec. (6.63)">
                <div>
                  <ResultadoCheck
                    etiqueta="Pilar sobre el cabezal"
                    verifica={resultado.r.compresionPilar.verifica}
                    detalle={`A_c1 limitada por ${LIMITA[resultado.r.compresionPilar.limitaPor]}`}
                    comparacion={{
                      real: { etiqueta: "Nd", valor: resultado.r.compresionPilar.fEdKN },
                      limite: { etiqueta: "F_Rdu", valor: resultado.r.compresionPilar.fRduKN },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.pilar}
                  />
                  <ResultadoCheck
                    etiqueta="Cabezal sobre el pilote"
                    verifica={resultado.r.compresionPilote.verifica}
                    detalle={`A_c1 limitada por ${LIMITA[resultado.r.compresionPilote.limitaPor]}`}
                    comparacion={{
                      real: { etiqueta: "Nd", valor: resultado.r.compresionPilote.fEdKN },
                      limite: { etiqueta: "F_Rdu", valor: resultado.r.compresionPilote.fRduKN },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.pilote}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "Pilar: A_c0", valor: `${fmt(resultado.r.compresionPilar.areaCargadaM2, 4)} m²` },
                      { etiqueta: "Pilar: √(A_c1/A_c0)", valor: fmt(resultado.r.compresionPilar.factorK, 3) },
                      { etiqueta: "Pilote: A_c0", valor: `${fmt(resultado.r.compresionPilote.areaCargadaM2, 4)} m²` },
                      { etiqueta: "Pilote: √(A_c1/A_c0)", valor: fmt(resultado.r.compresionPilote.factorK, 3) },
                    ]}
                  />
                </div>
              </Subgrupo>

              {zonas.map(({ id, titulo, detalle, zona, rec: recZona }) => (
                <Subgrupo key={id} titulo={titulo} detalle={detalle}>
                  <div>
                    {(["x", "y"] as const).map((dir) => {
                      const t = zona[dir];
                      return (
                        <ResultadoCheck
                          key={dir}
                          etiqueta={`Cercos en ${dir} · ec. (${t.ecuacion})`}
                          verifica={t.verifica}
                          detalle={
                            t.aSuperaMitad
                              ? `T = ${fmt(t.tKN)} kN · a = ${fmt(t.aM)} m > H/2`
                              : `T = ${fmt(t.tKN)} kN`
                          }
                          comparacion={{
                            real: { etiqueta: "As real", valor: t.asRealCm2 },
                            limite: { etiqueta: "As nec", valor: t.asNecCm2 },
                            unidad: "cm²", exige: "≥",
                          }}
                          recomendaciones={recZona}
                        />
                      );
                    })}
                    <PanelFormulas
                      titulo="Ver desarrollo"
                      filas={(["x", "y"] as const).flatMap((dir) => [
                        { etiqueta: `${dir}: F`, valor: `${fmt(zona[dir].fKN)} kN` },
                        { etiqueta: `${dir}: a / b`, valor: `${fmt(zona[dir].aM, 3)} / ${fmt(zona[dir].bM, 3)} m` },
                        { etiqueta: `${dir}: T`, valor: `${fmt(zona[dir].tKN)} kN` },
                      ])}
                    />
                  </div>
                </Subgrupo>
              ))}
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
