"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { CroquisNervioSteelDeck } from "@/components/verificaciones/croquis/CroquisSteelDeck";
import { calcularSteelDeckRasante } from "@/lib/calc/ec4/steel-deck-rasante";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "steel-deck-rasante")!;

const SI_NO = ["No", "Sí"] as const;

export default function SteelDeckRasantePage() {
  const [norma, setNorma] = useCampo("norma", "EC4");

  const [luz, setLuz] = useCampo("luz", "4");
  const [ancho, setAncho] = useCampo("ancho", "1");
  const [dp, setDp] = useCampo("dp", "0.151");
  const [ap, setAp] = useCampo("ap", "1620");
  const [fyp, setFyp] = useCampo("fyp", "255.1");

  const [m, setM] = useCampo("m", "165");
  const [k, setK] = useCampo("k", "0");
  const [gammaVs, setGammaVs] = useCampo("gammaVs", "1.25");
  const [lsSobreL, setLsSobreL] = useCampo("lsSobreL", "0.25");

  const [phiBarra, setPhiBarra] = useCampo("phiBarra", "10");
  const [sepBarra, setSepBarra] = useCampo("sepBarra", "200");
  const [fykBarras, setFykBarras] = useCampo("fykBarras", "500");

  const [gPp, setGPp] = useCampo("gPp", "4.5");
  const [gAdd, setGAdd] = useCampo("gAdd", "0");
  const [q, setQ] = useCampo("q", "7.55");
  const [gammaG, setGammaG] = useCampo("gammaG", "1.35");
  const [gammaQ, setGammaQ] = useCampo("gammaQ", "1.5");

  const [anclajePresente, setAnclajePresente] = useCampo<(typeof SI_NO)[number]>("anclajePresente", "No");
  const [espesorChapa, setEspesorChapa] = useCampo("espesorChapa", "0.89");
  const [diametroPerno, setDiametroPerno] = useCampo("diametroPerno", "25.4");
  const [numeroPernos, setNumeroPernos] = useCampo("numeroPernos", "1");
  const [sepPernos, setSepPernos] = useCampo("sepPernos", "0.3");

  const resultado = useMemo(() => {
    const n = {
      luz: aNumero(luz), ancho: aNumero(ancho), dp: aNumero(dp), ap: aNumero(ap), fyp: aNumero(fyp),
      m: aNumero(m), k: aNumero(k), gammaVs: aNumero(gammaVs), lsSobreL: aNumero(lsSobreL),
      phiBarra: aNumero(phiBarra), sepBarra: aNumero(sepBarra), fykBarras: aNumero(fykBarras),
      gPp: aNumero(gPp), gAdd: aNumero(gAdd), q: aNumero(q), gammaG: aNumero(gammaG), gammaQ: aNumero(gammaQ),
      espesorChapa: aNumero(espesorChapa), diametroPerno: aNumero(diametroPerno),
      numeroPernos: aNumero(numeroPernos), sepPernos: aNumero(sepPernos),
    };
    const positivos = [n.luz, n.ancho, n.dp, n.ap, n.fyp, n.gammaVs, n.lsSobreL, n.sepBarra, n.fykBarras];
    if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![n.k, n.gPp, n.gAdd, n.q, n.gammaG, n.gammaQ, n.m].every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (!Number.isFinite(n.phiBarra) || n.phiBarra < 0) return null;

    const anclaje = anclajePresente === "Sí";
    if (anclaje) {
      const positivosAnclaje = [n.espesorChapa, n.diametroPerno, n.numeroPernos, n.sepPernos];
      if (!positivosAnclaje.every((x) => Number.isFinite(x) && x > 0)) return null;
    }

    return {
      n,
      r: calcularSteelDeckRasante(
        { fypMPa: n.fyp, fykBarrasMPa: n.fykBarras },
        { luzM: n.luz, anchoM: n.ancho, dpM: n.dp, apMm2PorM: n.ap, diametroBarraMm: n.phiBarra, separacionBarraMm: n.sepBarra },
        { mMPa: n.m, kMPa: n.k, gammaVs: n.gammaVs, lsSobreL: n.lsSobreL },
        { gPpKNm2: n.gPp, gAddKNm2: n.gAdd, qKNm2: n.q, gammaG: n.gammaG, gammaQ: n.gammaQ },
        {
          presente: anclaje, espesorChapaMm: n.espesorChapa, diametroPernoMm: n.diametroPerno,
          numeroPernos: n.numeroPernos, separacionPernosM: n.sepPernos,
        }
      ),
    };
  }, [luz, ancho, dp, ap, fyp, m, k, gammaVs, lsSobreL, phiBarra, sepBarra, fykBarras,
      gPp, gAdd, q, gammaG, gammaQ, anclajePresente, espesorChapa, diametroPerno, numeroPernos, sepPernos]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Steel deck</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          El método m-k (EN 1994-1-1 §9.7.3) es estrictamente sobre la chapa: la conexión mecánica
          entre chapa y hormigón sale de un ensayo, y las barras adicionales no entran en esa
          fórmula. Lo que sí se agrega acá es un chequeo mecánico complementario, que reparte la
          demanda de rasante entre la chapa y las barras según su tracción disponible, para el caso
          en que las barras tengan anclaje propio. No reemplaza al m-k estricto, se reporta al lado.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Geometría y chapa</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisNervioSteelDeck />
              </div>
              <CampoNumerico id="luz" etiqueta="Luz L" sufijo="m" valor={luz} onChange={setLuz} />
              <CampoNumerico id="ancho" etiqueta="Ancho b" sufijo="m" valor={ancho} onChange={setAncho} />
              <CampoNumerico id="dp" etiqueta="dp" sufijo="m" valor={dp} onChange={setDp} />
              <CampoNumerico id="ap" etiqueta="Ap chapa" sufijo="mm²/m" valor={ap} onChange={setAp} />
              <CampoNumerico id="fyp" etiqueta="fyp chapa" sufijo="MPa" valor={fyp} onChange={setFyp} />
              <PanelAyuda titulo="Qué es cada dato">
                <p>
                  <strong className="text-foreground">Luz y caso base.</strong> El cortante de cálculo
                  sale de una carga uniforme sobre tramo simplemente apoyado: VEd = wEd·L·b/2.
                </p>
                <p>
                  <strong className="text-foreground">dp y Ap.</strong> Los mismos de la verificación
                  de flexión: profundidad al centroide de la chapa y área neta por metro, de catálogo.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Coeficientes m-k</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CampoNumerico id="m" etiqueta="m" sufijo="N/mm²" valor={m} onChange={setM} />
              <CampoNumerico id="k" etiqueta="k" sufijo="N/mm²" valor={k} onChange={setK} />
              <CampoNumerico id="gammaVs" etiqueta="γVS" valor={gammaVs} onChange={setGammaVs} />
              <CampoNumerico id="lsSobreL" etiqueta="Ls/L" valor={lsSobreL} onChange={setLsSobreL} />
              <div className="col-span-full">
                <PanelAyuda titulo="De dónde salen m y k">
                  <p>
                    Son coeficientes del ensayo de la chapa concreta que se está usando, EN 1994-1-1
                    §B.3 — no se derivan de otros datos de este formulario. Si no se dispone del valor
                    certificado del fabricante, cargar un valor conservador e informarlo así en la
                    memoria de cálculo. Ls/L = 0,25 es el caso de carga uniforme y apoyo simple; con
                    otro esquema estático hay que ajustarlo.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Barra adicional por nervio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="phiBarra" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiBarra} onChange={setPhiBarra} />
              <CampoNumerico id="sepBarra" etiqueta="Separación" sufijo="mm" valor={sepBarra} onChange={setSepBarra} />
              <CampoNumerico id="fykBarras" etiqueta="fyk barras" sufijo="MPa" valor={fykBarras} onChange={setFykBarras} />
              <p className="col-span-full text-xs text-muted-foreground">
                φ = 0 para ver el m-k sin camino independiente de barras (α = 1: toda la tracción se
                atribuye a la chapa).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Acciones ELU</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="gPp" etiqueta="Gk,pp" sufijo="kN/m²" valor={gPp} onChange={setGPp} />
              <CampoNumerico id="gAdd" etiqueta="Gk,add" sufijo="kN/m²" valor={gAdd} onChange={setGAdd} />
              <CampoNumerico id="q" etiqueta="Qk" sufijo="kN/m²" valor={q} onChange={setQ} />
              <CampoNumerico id="gammaG" etiqueta="γG" valor={gammaG} onChange={setGammaG} />
              <CampoNumerico id="gammaQ" etiqueta="γQ" valor={gammaQ} onChange={setGammaQ} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Anclaje de extremo con pernos (opcional)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoSeleccion id="anclajePresente" etiqueta="¿Tiene pernos de anclaje?" valor={anclajePresente} opciones={SI_NO} onChange={(v) => setAnclajePresente(v as (typeof SI_NO)[number])} />
              {anclajePresente === "Sí" && (
                <>
                  <CampoNumerico id="espesorChapa" etiqueta="Espesor chapa t" sufijo="mm" valor={espesorChapa} onChange={setEspesorChapa} />
                  <CampoNumerico id="diametroPerno" etiqueta="⌀ perno" sufijo="mm" valor={diametroPerno} onChange={setDiametroPerno} />
                  <CampoNumerico id="numeroPernos" etiqueta="Nº pernos por nervio" valor={numeroPernos} onChange={setNumeroPernos} />
                  <CampoNumerico id="sepPernos" etiqueta="Separación pernos" sufijo="m" valor={sepPernos} onChange={setSepPernos} />
                </>
              )}
              <p className="col-span-full text-xs text-muted-foreground">
                EN 1994-1-1 §9.7.4: resistencia al aplastamiento local de la chapa en el perno
                conector, para losas ancladas en su extremo. Es un chequeo adicional, no sustituye
                al m-k.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Acciones</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "wEd", valor: `${fmt(resultado.r.acciones.wEdKNm2)} kN/m²` },
                      { etiqueta: "VEd", valor: `${fmt(resultado.r.acciones.vEdKN)} kN` },
                      { etiqueta: "VEd por ancho", valor: `${fmt(resultado.r.acciones.vEdPorAnchoKNporM)} kN/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Rasante — método m-k</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="m-k estricto (EN 1994-1-1 §9.7.3)"
                    verifica={resultado.r.rasante.verificaEstricta}
                    comparacion={{
                      real: { etiqueta: "VEd", valor: resultado.r.acciones.vEdPorAnchoKNporM },
                      limite: { etiqueta: "Vl,Rd", valor: resultado.r.rasante.vlRdKNporM },
                      unidad: "kN/m",
                      exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Chequeo complementario: chapa exclusiva"
                    verifica={resultado.r.rasante.verificaChapaExclusiva}
                    comparacion={{
                      real: { etiqueta: "VEd,chapa", valor: resultado.r.rasante.vEdChapaKNporM },
                      limite: { etiqueta: "Vl,Rd", valor: resultado.r.rasante.vlRdKNporM },
                      unidad: "kN/m",
                      exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "As barras", valor: `${fmt(resultado.r.rasante.asBarrasMm2PorM, 1)} mm²/m` },
                      { etiqueta: "fyd barras", valor: `${fmt(resultado.r.rasante.fydBarrasMPa, 1)} MPa` },
                      { etiqueta: "T chapa = Ap·fyp", valor: `${fmt(resultado.r.rasante.tChapaKN)} kN/m` },
                      { etiqueta: "T barras = As·fyd", valor: `${fmt(resultado.r.rasante.tBarrasKN)} kN/m` },
                      { etiqueta: "α chapa = Tchapa/(Tchapa+Tbarras)", valor: fmt(resultado.r.rasante.alfaChapa, 3) },
                      { etiqueta: "VEd,chapa = α·VEd", valor: `${fmt(resultado.r.rasante.vEdChapaKNporM)} kN/m` },
                      { etiqueta: "Flujo de rasante ql ≈ Vp/dp", valor: `${fmt(resultado.r.rasante.flujoRasanteKNm2)} kN/m²` },
                      { etiqueta: "Vl,Rd, ec. m-k §9.7.3", valor: `${fmt(resultado.r.rasante.vlRdKNporM)} kN/m` },
                      { etiqueta: "VEd total / Vl,Rd", valor: fmt(resultado.r.rasante.utilizacionEstricta, 3) },
                      { etiqueta: "VEd,chapa / Vl,Rd", valor: fmt(resultado.r.rasante.utilizacionChapaExclusiva, 3) },
                    ]}
                  />
                </CardContent>
              </Card>

              {resultado.r.anclajeExtremo && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Anclaje de extremo (§9.7.4)</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-mono text-sm">
                      Ppb,Rd = {fmt(resultado.r.anclajeExtremo.ppbRdKNporM)} kN/m
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Resistencia al aplastamiento local de la chapa en el perno. Comparar contra la
                      demanda de rasante que efectivamente tome el anclaje de extremo en el esquema
                      real de la losa.
                    </p>
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "dd0 = 1,1·⌀perno", valor: `${fmt(resultado.r.anclajeExtremo.dd0Mm, 2)} mm` },
                        { etiqueta: "a = 2·dd0", valor: `${fmt(resultado.r.anclajeExtremo.aMm, 2)} mm` },
                        { etiqueta: "kφ = mín(6, 1+a/dd0)", valor: fmt(resultado.r.anclajeExtremo.kPhi, 2) },
                        { etiqueta: "Ppb,Rd", valor: `${fmt(resultado.r.anclajeExtremo.ppbRdKNporM)} kN/m` },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
