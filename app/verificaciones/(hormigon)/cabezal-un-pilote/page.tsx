"use client";

import { useMemo, useState, type FocusEvent } from "react";
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
import { PlantaCabezalUnPilote } from "@/components/verificaciones/hormigon/PlantaCabezalUnPilote";
import { CroquisArmadoCabezal, type ElementoCabezal } from "@/components/verificaciones/hormigon/CroquisArmadoCabezal";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-un-pilote";
import {
  comprobarCabezalUnPilote,
  recomendarCabezalUnPilote,
} from "@/lib/verificaciones/recomendaciones/cabezal-un-pilote";

const meta = registroVerificaciones.find((v) => v.id === "cabezal-un-pilote")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Qué parte del croquis de armado corresponde a cada campo, para resaltarla con el foco. */
const ELEMENTO_DE_CAMPO: Record<string, ElementoCabezal> = {
  nCercos: "cercos", phiCercos: "cercos",
  phiEstribosX: "estribosX", sEstribosX: "estribosX",
  phiEstribosY: "estribosY", sEstribosY: "estribosY",
  recubrimiento: "recubrimiento",
};

const LIMITA: Record<"triple" | "canto" | "cabezal", string> = {
  triple: "el triple del lado cargado",
  canto: "el canto (h ≥ b₂ − b₁)",
  cabezal: "el lado del cabezal",
};

/**
 * Lo tipeado, para dibujar: el croquis muestra los datos aunque todavía no
 * calculen. Sólo un campo vacío o no positivo cae en el valor de ejemplo.
 */
function medida(texto: string, porDefecto: number): number {
  const v = aNumero(texto);
  return Number.isFinite(v) && v > 0 ? v : porDefecto;
}

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

  const [nCercos, setNCercos] = useCampo("nCercos", "6");
  const [phiCercos, setPhiCercos] = useCampo("phiCercos", "12");

  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [phiEstribosX, setPhiEstribosX] = useCampo("phiEstribosX", "12");
  const [sEstribosX, setSEstribosX] = useCampo("sEstribosX", "0.2");
  const [phiEstribosY, setPhiEstribosY] = useCampo("phiEstribosY", "12");
  const [sEstribosY, setSEstribosY] = useCampo("sEstribosY", "0.2");

  const campos = useMemo(
    () => ({
      fck, fyk, pilarX, pilarY, ladoX, ladoY, hCab, dPilote, ndPilar, nCercos, phiCercos,
      recubrimiento, phiEstribosX, sEstribosX, phiEstribosY, sEstribosY,
    }),
    [
      fck, fyk, pilarX, pilarY, ladoX, ladoY, hCab, dPilote, ndPilar, nCercos, phiCercos,
      recubrimiento, phiEstribosX, sEstribosX, phiEstribosY, sEstribosY,
    ]
  );
  const resultado = useMemo(() => resolverCabezalUnPilote(campos), [campos]);
  const comprobaciones = useMemo(() => comprobarCabezalUnPilote(campos) ?? [], [campos]);
  const rec = useMemo(() => recomendarCabezalUnPilote(campos), [campos]);

  const [foco, setFoco] = useState<string | null>(null);
  const resaltar = foco ? (ELEMENTO_DE_CAMPO[foco] ?? null) : null;
  // El foco se sigue en un contenedor: los eventos de foco de React burbujean,
  // también desde la lista del selector de Ø, que no tiene id y no lo apaga.
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
                <Subgrupo titulo="Cabezal">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="ladoX" etiqueta="Ancho en x" sufijo="m" valor={ladoX} onChange={setLadoX} />
                    <CampoNumerico id="ladoY" etiqueta="Ancho en y" sufijo="m" valor={ladoY} onChange={setLadoY} />
                    <CampoNumerico id="hCab" etiqueta="Canto H" sufijo="m" valor={hCab} onChange={setHCab} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar (centrado sobre el cabezal)">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="pilarX" etiqueta="Lado en x" sufijo="m" valor={pilarX} onChange={setPilarX} />
                    <CampoNumerico id="pilarY" etiqueta="Lado en y" sufijo="m" valor={pilarY} onChange={setPilarY} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilote">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="dPilote" etiqueta="Diámetro D" sufijo="m" valor={dPilote} onChange={setDPilote} />
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
              <div className="space-y-4">
                <div>
                  <p className="spec-label mb-1">Alzado (plano x)</p>
                  <DiagramaCabezalUnPilote
                    ladoXM={medida(ladoX, 0.9)}
                    hM={medida(hCab, 1)}
                    pilarXM={medida(pilarX, 0.3)}
                    diametroPiloteM={medida(dPilote, 0.5)}
                    cercos={Math.max(0, Math.floor(aNumero(nCercos)) || 0)}
                  />
                </div>
                <div>
                  <p className="spec-label mb-1">Planta</p>
                  <PlantaCabezalUnPilote
                    ladoXM={medida(ladoX, 0.9)}
                    ladoYM={medida(ladoY, 0.9)}
                    pilarXM={medida(pilarX, 0.3)}
                    pilarYM={medida(pilarY, 0.3)}
                    diametroPiloteM={medida(dPilote, 0.5)}
                  />
                </div>
              </div>
            }
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Armadura" descripcion="Cercos horizontales para el ensanche del campo de compresiones, y estribos verticales para el tirante de bielas y tirantes.">
          <div {...seguirFoco}>
          <DatosConDibujo
            datos={
              <div className="space-y-4">
                <Subgrupo titulo="Cercos horizontales">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Cercos cerrados, todos iguales, repartidos en todo el canto: cada uno pone dos ramas en cada dirección.
                    Cada mitad cuenta la mitad de los cercos; con una cantidad impar, el del medio no se cuenta.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="nCercos" etiqueta="Cantidad en todo el canto" valor={nCercos} onChange={setNCercos} />
                    <CampoDiametro id="phiCercos" etiqueta="Ø" valor={phiCercos} onChange={setPhiCercos} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Estribos verticales">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Cerrados, en planos verticales de cada dirección. Su rama horizontal toma el tirante; la separación se
                    mide en la dirección perpendicular y sigue igual hasta las caras del cabezal.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="phiEstribosX" etiqueta="En x · Ø" valor={phiEstribosX} onChange={setPhiEstribosX} />
                    <CampoNumerico id="sEstribosX" etiqueta="En x · separación" sufijo="m" valor={sEstribosX} onChange={setSEstribosX} />
                    <CampoDiametro id="phiEstribosY" etiqueta="En y · Ø" valor={phiEstribosY} onChange={setPhiEstribosY} />
                    <CampoNumerico id="sEstribosY" etiqueta="En y · separación" sufijo="m" valor={sEstribosY} onChange={setSEstribosY} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                </Subgrupo>
              </div>
            }
            dibujo={
              <CroquisArmadoCabezal
                resaltar={resaltar}
                a={{
                  ladoXM: medida(ladoX, 0.9),
                  ladoYM: medida(ladoY, 0.9),
                  hM: medida(hCab, 1),
                  pilarXM: medida(pilarX, 0.3),
                  pilarYM: medida(pilarY, 0.3),
                  diametroPiloteM: medida(dPilote, 0.5),
                  recubrimientoM: medida(recubrimiento, 0.05),
                  nCercos: Math.max(0, Math.floor(aNumero(nCercos)) || 0),
                  phiCercosMm: medida(phiCercos, 12),
                  phiEstribosXMm: medida(phiEstribosX, 12),
                  sEstribosXM: medida(sEstribosX, 0.2),
                  phiEstribosYMm: medida(phiEstribosY, 12),
                  sEstribosYM: medida(sEstribosY, 0.2),
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
              { etiqueta: "Pilar / pilote", valor: `${pilarX} × ${pilarY} m / Ø ${dPilote} m` },
              { etiqueta: "Nd pilar", valor: `${ndPilar} kN` },
              { etiqueta: "Estribos verticales", valor: `x: Ø${phiEstribosX} c/${sEstribosX} m · y: Ø${phiEstribosY} c/${sEstribosY} m · rec. ${recubrimiento} m` },
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
              "Estribos verticales, por bielas y tirantes en cada dirección (criterio del usuario): la carga entra en dos mitades a a/4 del eje del pilar y sale a b/4 del eje del pilote (b = 0,886·D). Pilar más ancho: tirante arriba con Nd; más angosto: tirante abajo con Nd + 1,35·peso propio. T = (F/2)·|a − b|/4 / z, con z = H − 2·d' y d' = recubrimiento + Ø/2.",
              "El tirante lo toman los estribos dentro del ancho de la biela (el lado del pilar o el ancho del pilote, en la dirección perpendicular): n = ancho/s + 1.",
              "Mínimo de los estribos, por analogía con la malla de vigas de gran canto (art. 9.7 (1) y (2), pág. 152): A/s ≥ máx(0,001·lado/2; 150 mm²/m) por cara —el 0,001·Ac es el total de la sección, mitad en cada cara— y s ≤ mín(300 mm; 2·lado).",
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

              <Subgrupo titulo="Estribos verticales" detalle="bielas y tirantes en cada dirección · mínimo del art. 9.7">
                <div>
                  {(["x", "y"] as const).map((dir) => {
                    const e = dir === "x" ? resultado.r.estribosX : resultado.r.estribosY;
                    const clave = dir === "x" ? rec.estribosX : rec.estribosY;
                    return (
                      <div key={dir}>
                        <ResultadoCheck
                          etiqueta={`Tirante en ${dir}${e.tirante === "ninguno" ? " · no hay" : ` · ${e.tirante}`}`}
                          verifica={e.verificaTirante}
                          detalle={
                            e.tirante === "ninguno"
                              ? "Pilar y pilote del mismo ancho: las bielas bajan rectas y queda sólo el mínimo."
                              : `T = ${fmt(e.tKN)} kN · ${e.estribosEnBiela} estribos dentro de la biela de ${fmt(e.anchoBielaM, 2)} m`
                          }
                          comparacion={{
                            real: { etiqueta: "As en biela", valor: e.asRealCm2 },
                            limite: { etiqueta: "As nec", valor: e.asNecCm2 },
                            unidad: "cm²", exige: "≥",
                          }}
                          recomendaciones={clave}
                        />
                        <ResultadoCheck
                          etiqueta={`Mínimo en ${dir} (art. 9.7)`}
                          verifica={e.verificaMinimo}
                          detalle={`s = ${fmt(e.separacionM, 3)} m, máx. ${fmt(e.separacionMaxM, 2)} m · ${e.estribosTotales} estribos en todo el cabezal`}
                          comparacion={{
                            real: { etiqueta: "A/s", valor: e.asCm2PorM },
                            limite: { etiqueta: "mínimo", valor: e.asMinCm2PorM },
                            unidad: "cm²/m", exige: "≥",
                          }}
                        />
                      </div>
                    );
                  })}
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={(["x", "y"] as const).flatMap((dir) => {
                      const e = dir === "x" ? resultado.r.estribosX : resultado.r.estribosY;
                      return [
                        { etiqueta: `${dir}: a pilar / b pilote`, valor: `${fmt(e.anchoPilarM, 3)} / ${fmt(e.anchoPiloteM, 3)} m` },
                        { etiqueta: `${dir}: desvío |a − b|/4`, valor: `${fmt(e.desvioM, 3)} m` },
                        { etiqueta: `${dir}: z = H − 2·d'`, valor: `${fmt(e.zM, 3)} m (d' = ${fmt(e.dPrimaM, 3)} m)` },
                        { etiqueta: `${dir}: T = (F/2)·desvío/z`, valor: `${fmt(e.tKN)} kN con F = ${fmt(e.fKN)} kN` },
                        { etiqueta: `${dir}: estribos en biela / en total`, valor: `${e.estribosEnBiela} / ${e.estribosTotales}` },
                      ];
                    })}
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
