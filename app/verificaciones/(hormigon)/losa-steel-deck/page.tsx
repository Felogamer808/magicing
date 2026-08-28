"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { CroquisNervioSteelDeck } from "@/components/verificaciones/croquis/CroquisSteelDeck";
import {
  calcularSteelDeckFlexion,
  type ResistenciaFuego,
} from "@/lib/calc/hormigon/losas/steel-deck-flexion";
import { calcularSteelDeckRasante } from "@/lib/calc/hormigon/losas/steel-deck-rasante";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "losa-steel-deck")!;

const RESISTENCIAS_FUEGO: readonly ResistenciaFuego[] = ["R60", "R90", "R120", "R180", "R240"];
const SI_NO = ["No", "Sí"] as const;

/**
 * Antes eran dos páginas. Se fusionan en una porque son la misma pieza: el
 * mismo nervio de chapa colaborante da la flexión, el fuego y el rasante, y
 * separarlas obligaba a cargar la geometría del nervio dos veces para ver las
 * dos comprobaciones que realmente definen la losa.
 *
 * dp, Ap, fyp, φ y separación de la barra, y fyk de la barra son geometría y
 * materiales de la MISMA chapa y la MISMA barra: un solo juego de campos
 * alimenta a los dos cálculos. El resto —mEd y fuego por un lado; luz, m-k,
 * acciones y anclaje por el otro— es exclusivo de cada comprobación y no se
 * comparte, porque no significa lo mismo en las dos.
 *
 * Los dos bloques de resultado se calculan por separado (dos useMemo, no uno):
 * son cómputos independientes que sólo comparten algunos datos de entrada, así
 * que completar la geometría del nervio no debería obligar a cargar también la
 * luz y las acciones del rasante para ver la flexión, ni viceversa.
 */
export default function LosaSteelDeckPage() {
  const [norma, setNorma] = useCampo("norma", "EC4");

  // --- Compartido: geometría de la chapa y de la barra --------------------
  const [espesorTotal, setEspesorTotal] = useCampo("espesorTotal", "0.15");
  const [alturaNervio, setAlturaNervio] = useCampo("alturaNervio", "0.063");
  const [anchoNervio, setAnchoNervio] = useCampo("anchoNervio", "0.15");
  const [dp, setDp] = useCampo("dp", "0.135");
  const [ap, setAp] = useCampo("ap", "1620");

  const [fyp, setFyp] = useCampo("fyp", "255.1");
  const [fck, setFck] = useCampo("fck", "25");
  const [fykBarras, setFykBarras] = useCampo("fykBarras", "500");

  const [phiBarra, setPhiBarra] = useCampo("phiBarra", "10");
  const [sepBarra, setSepBarra] = useCampo("sepBarra", "200");
  const [recBarra, setRecBarra] = useCampo("recBarra", "0.025");

  // --- Exclusivo de flexión y fuego ----------------------------------------
  const [mEd, setMEd] = useCampo("mEd", "20");
  const [resistenciaFuego, setResistenciaFuego] = useCampo<ResistenciaFuego>("resistenciaFuego", "R90");
  const [etaFi, setEtaFi] = useCampo("etaFi", "0.7");

  // --- Exclusivo de rasante -------------------------------------------------
  const [luz, setLuz] = useCampo("luz", "4");
  const [anchoTrib, setAnchoTrib] = useCampo("anchoTrib", "1");

  const [m, setM] = useCampo("m", "165");
  const [k, setK] = useCampo("k", "0");
  const [gammaVs, setGammaVs] = useCampo("gammaVs", "1.25");
  const [lsSobreL, setLsSobreL] = useCampo("lsSobreL", "0.25");

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

  const resultadoFlexion = useMemo(() => {
    const n = {
      fyp: aNumero(fyp), fck: aNumero(fck), fykBarras: aNumero(fykBarras),
      espesorTotal: aNumero(espesorTotal), alturaNervio: aNumero(alturaNervio),
      ap: aNumero(ap), dp: aNumero(dp), anchoNervio: aNumero(anchoNervio),
      phiBarra: aNumero(phiBarra), sepBarra: aNumero(sepBarra), recBarra: aNumero(recBarra),
      mEd: aNumero(mEd), etaFi: aNumero(etaFi),
    };
    const positivos = [n.fyp, n.fck, n.fykBarras, n.espesorTotal, n.alturaNervio, n.ap, n.dp,
                        n.anchoNervio, n.sepBarra, n.recBarra, n.etaFi];
    if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
    if (!Number.isFinite(n.phiBarra) || n.phiBarra < 0) return null;
    if (!Number.isFinite(n.mEd) || n.mEd < 0) return null;
    if (n.alturaNervio >= n.espesorTotal) return null;
    if (n.dp >= n.espesorTotal) return null;
    if (n.recBarra >= n.espesorTotal) return null;

    return {
      n,
      r: calcularSteelDeckFlexion(
        { fypkMPa: n.fyp, fckMPa: n.fck, fykBarrasMPa: n.fykBarras },
        {
          espesorTotalM: n.espesorTotal, alturaNervioM: n.alturaNervio, apMm2PorM: n.ap, dpM: n.dp,
          diametroBarraMm: n.phiBarra, separacionBarraMm: n.sepBarra, recubrimientoBarraM: n.recBarra,
          anchoNervioM: n.anchoNervio,
        },
        n.mEd,
        { resistenciaFuego, etaFi: n.etaFi }
      ),
    };
  }, [fyp, fck, fykBarras, espesorTotal, alturaNervio, ap, dp, anchoNervio,
      phiBarra, sepBarra, recBarra, mEd, resistenciaFuego, etaFi]);

  const resultadoRasante = useMemo(() => {
    const n = {
      luz: aNumero(luz), anchoTrib: aNumero(anchoTrib), dp: aNumero(dp), ap: aNumero(ap), fyp: aNumero(fyp),
      m: aNumero(m), k: aNumero(k), gammaVs: aNumero(gammaVs), lsSobreL: aNumero(lsSobreL),
      phiBarra: aNumero(phiBarra), sepBarra: aNumero(sepBarra), fykBarras: aNumero(fykBarras),
      gPp: aNumero(gPp), gAdd: aNumero(gAdd), q: aNumero(q), gammaG: aNumero(gammaG), gammaQ: aNumero(gammaQ),
      espesorChapa: aNumero(espesorChapa), diametroPerno: aNumero(diametroPerno),
      numeroPernos: aNumero(numeroPernos), sepPernos: aNumero(sepPernos),
    };
    const positivos = [n.luz, n.anchoTrib, n.dp, n.ap, n.fyp, n.gammaVs, n.lsSobreL, n.sepBarra, n.fykBarras];
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
        { luzM: n.luz, anchoM: n.anchoTrib, dpM: n.dp, apMm2PorM: n.ap, diametroBarraMm: n.phiBarra, separacionBarraMm: n.sepBarra },
        { mMPa: n.m, kMPa: n.k, gammaVs: n.gammaVs, lsSobreL: n.lsSobreL },
        { gPpKNm2: n.gPp, gAddKNm2: n.gAdd, qKNm2: n.q, gammaG: n.gammaG, gammaQ: n.gammaQ },
        {
          presente: anclaje, espesorChapaMm: n.espesorChapa, diametroPernoMm: n.diametroPerno,
          numeroPernos: n.numeroPernos, separacionPernosM: n.sepPernos,
        }
      ),
    };
  }, [luz, anchoTrib, dp, ap, fyp, m, k, gammaVs, lsSobreL, phiBarra, sepBarra, fykBarras,
      gPp, gAdd, q, gammaG, gammaQ, anclajePresente, espesorChapa, diametroPerno, numeroPernos, sepPernos]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · Losas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="space-y-2 py-4 text-sm text-muted-foreground">
          <p>
            Losa mixta con chapa colaborante (steel deck) y armadura adicional por nervio. En frío, la
            chapa y las barras se tratan como un único acero traccionado que equilibra el bloque de
            hormigón comprimido, EN 1994-1-1 §9.7.2; en incendio la chapa se descarta y sólo tracciona la
            armadura, reducida por temperatura según EC2-1-2.
          </p>
          <p>
            El rasante entre la chapa y el hormigón se verifica aparte, por el método m-k de
            EN 1994-1-1 §9.7.3, que es estrictamente sobre la chapa: las barras no entran en esa fórmula,
            salvo en el chequeo complementario que reparte la demanda según su tracción disponible.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Geometría del nervio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisNervioSteelDeck />
              </div>
              <CampoNumerico id="espesorTotal" etiqueta="h" sufijo="m" valor={espesorTotal} onChange={setEspesorTotal} />
              <CampoNumerico id="alturaNervio" etiqueta="hp" sufijo="m" valor={alturaNervio} onChange={setAlturaNervio} />
              <CampoNumerico id="anchoNervio" etiqueta="Ancho nervio" sufijo="m" valor={anchoNervio} onChange={setAnchoNervio} />
              <CampoNumerico id="dp" etiqueta="dp" sufijo="m" valor={dp} onChange={setDp} />
              <CampoNumerico id="ap" etiqueta="Ap chapa" sufijo="mm²/m" valor={ap} onChange={setAp} />
              <div className="col-span-full">
                <PanelAyuda titulo="Qué es cada dato">
                  <p>
                    <strong className="text-foreground">h y hp.</strong> h es el espesor total de la
                    losa, chapa incluida; hp es la altura del perfil de chapa. La diferencia, hc = h −
                    hp, es el hormigón macizo sobre la cresta del nervio: si el bloque comprimido no
                    entra ahí, este cálculo simplificado deja de ser válido y hace falta el
                    procedimiento nervado completo de EC4.
                  </p>
                  <p>
                    <strong className="text-foreground">dp.</strong> Profundidad desde la cara superior
                    del hormigón hasta el centroide de la chapa, no hasta su cara inferior. Sale de la
                    ficha técnica del perfil.
                  </p>
                  <p>
                    <strong className="text-foreground">Ap.</strong> Área neta de la chapa por metro de
                    losa, de catálogo del fabricante — no se deduce de un espesor y un ancho eficaz
                    supuestos.
                  </p>
                  <p>
                    Estos cinco datos, junto con la chapa y la barra de las tarjetas siguientes,
                    alimentan tanto la flexión como el rasante: son la misma chapa y la misma barra.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fyp" etiqueta="fyp chapa" sufijo="MPa" valor={fyp} onChange={setFyp} />
              <CampoNumerico id="fck" etiqueta="fck hormigón" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fykBarras" etiqueta="fyk barras" sufijo="MPa" valor={fykBarras} onChange={setFykBarras} />
              <p className="col-span-full text-xs text-muted-foreground">
                fck sólo interviene en la flexión: el método m-k del rasante no depende de la resistencia
                del hormigón.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Barra adicional por nervio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoDiametro id="phiBarra" etiqueta="Ø" valor={phiBarra} onChange={setPhiBarra} />
              <CampoNumerico id="sepBarra" etiqueta="Separación" sufijo="mm" valor={sepBarra} onChange={setSepBarra} />
              <CampoNumerico id="recBarra" etiqueta="Recub. inferior" sufijo="m" valor={recBarra} onChange={setRecBarra} />
              <p className="col-span-full text-xs text-muted-foreground">
                Ø = 0 para calcular sin barra adicional, sólo con la chapa. El recubrimiento se mide desde
                la cara inferior de la losa hasta el eje de la barra, y sólo lo usa el chequeo de incendio.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Flexión — solicitación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="mEd" etiqueta="MEd" sufijo="kN·m/m" valor={mEd} onChange={setMEd} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Situación de incendio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion
                id="resistenciaFuego" etiqueta="Resistencia al fuego"
                valor={resistenciaFuego} opciones={RESISTENCIAS_FUEGO}
                onChange={(v) => setResistenciaFuego(v as ResistenciaFuego)}
              />
              <CampoNumerico id="etaFi" etiqueta="ηfi" valor={etaFi} onChange={setEtaFi} />
              <div className="col-span-full">
                <PanelAyuda titulo="De dónde sale cada dato de fuego">
                  <p>
                    <strong className="text-foreground">ηfi.</strong> Reduce el momento de cálculo en
                    frío al nivel de carga de la combinación de incendio, EC2-1-2 §2.4.2, ec. (2.5):
                    MEd,fi = ηfi·MEd. 0,7 es el valor recomendado como simplificación (Nota 2); si se
                    conocen Gk, Qk y ψ se puede calcular la expresión completa y cargar ese valor.
                  </p>
                  <p>
                    <strong className="text-foreground">Cómo se estima la temperatura de la barra.</strong>{" "}
                    Sin perfiles de temperatura de nervios (Anexo D de EN 1994-1-2), se usa la Tabla
                    5.5 de EC2-1-2 (vigas simplemente apoyadas: el nervio se trata como un alma,
                    art. 5.7.5) y la ec. (5.3), que relaciona 1 mm de recubrimiento de más o de menos
                    con 10 °C de menos o de más sobre los 500 °C de referencia de la tabla. Es una
                    aproximación razonable para predimensionar, no el método específico de EN 1994-1-2.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Rasante — luz y ancho tributario</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="luz" etiqueta="Luz L" sufijo="m" valor={luz} onChange={setLuz} />
              <CampoNumerico id="anchoTrib" etiqueta="Ancho tributario b" sufijo="m" valor={anchoTrib} onChange={setAnchoTrib} />
              <p className="col-span-full text-xs text-muted-foreground">
                No es el ancho del nervio de la primera tarjeta: es la faja de losa que se toma para
                calcular el cortante total. El cortante de cálculo sale de una carga uniforme sobre tramo
                simplemente apoyado: VEd = wEd·L·b/2.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Rasante — coeficientes m-k</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-base">Rasante — acciones ELU</CardTitle></CardHeader>
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
          {!resultadoFlexion ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Flexión y fuego: completá la geometría del nervio, los materiales y MEd con valores
                válidos (hp, dp y el recubrimiento tienen que ser menores que h).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Flexión en frío</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Momento resistente"
                    verifica={resultadoFlexion.r.frio.verificaFlexion}
                    comparacion={{
                      real: { etiqueta: "MEd", valor: resultadoFlexion.r.frio.mEdKNm },
                      limite: { etiqueta: "Mpl,Rd", valor: resultadoFlexion.r.frio.mPlRdKNm },
                      unidad: "kN·m/m",
                      exige: "≤",
                    }}
                  />
                  {!resultadoFlexion.r.frio.bloqueDentroDeHc && (
                    <p className="text-xs text-destructive">
                      El bloque comprimido (a = {fmt(resultadoFlexion.r.frio.xplM * 1000, 0)} mm) supera hc = {" "}
                      {fmt(resultadoFlexion.r.frio.hcM * 1000, 0)} mm: invade el nervio y este cálculo
                      simplificado deja de ser válido. Hace falta el procedimiento nervado de EC4.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "As barras", valor: `${fmt(resultadoFlexion.r.frio.asBarrasMm2PorM, 1)} mm²/m` },
                      { etiqueta: "fyp,d chapa", valor: `${fmt(resultadoFlexion.r.frio.fypdMPa, 1)} MPa` },
                      { etiqueta: "fyd barras", valor: `${fmt(resultadoFlexion.r.frio.fydBarrasMPa, 1)} MPa` },
                      { etiqueta: "fcd", valor: `${fmt(resultadoFlexion.r.frio.fcdMPa, 2)} MPa` },
                      { etiqueta: "Np,chapa = Ap·fyp,d", valor: `${fmt(resultadoFlexion.r.frio.npChapaKN)} kN/m` },
                      { etiqueta: "Np,barras = As·fyd", valor: `${fmt(resultadoFlexion.r.frio.npBarrasKN)} kN/m` },
                      { etiqueta: "Np = Np,chapa + Np,barras", valor: `${fmt(resultadoFlexion.r.frio.npKN)} kN/m` },
                      { etiqueta: "hc = h − hp", valor: `${fmt(resultadoFlexion.r.frio.hcM * 1000, 0)} mm` },
                      { etiqueta: "a = Np / (0,85·fcd·b)", valor: `${fmt(resultadoFlexion.r.frio.xplM * 1000, 1)} mm` },
                      { etiqueta: "z, brazo mecánico", valor: `${fmt(resultadoFlexion.r.frio.zM * 1000, 1)} mm` },
                      { etiqueta: "Mpl,Rd = Np·z", valor: `${fmt(resultadoFlexion.r.frio.mPlRdKNm)} kN·m/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Situación de incendio</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {resultadoFlexion.r.fuego.aMinTabMm === null ? (
                    <p className="text-xs text-destructive">
                      El ancho de nervio cargado queda por debajo del primer par tabulado de la Tabla
                      5.5 para {resistenciaFuego}: no hay dato para interpolar. Ensanchá el nervio o
                      revisá con perfiles de temperatura.
                    </p>
                  ) : (
                    <>
                      <ResultadoCheck
                        etiqueta="Momento resistente en incendio"
                        verifica={resultadoFlexion.r.fuego.verificaFuego}
                        comparacion={{
                          real: { etiqueta: "MEd,fi", valor: resultadoFlexion.r.fuego.mEdFiKNm },
                          limite: { etiqueta: "Mfi,Rd", valor: resultadoFlexion.r.fuego.mFiRdKNm },
                          unidad: "kN·m/m",
                          exige: "≤",
                        }}
                      />
                      {!resultadoFlexion.r.fuego.thetaCrEnRangoValido && (
                        <p className="text-xs text-destructive">
                          La temperatura estimada (θcr = {fmt(resultadoFlexion.r.fuego.thetaCrC, 0)} °C) queda
                          fuera del rango 350–700 °C en el que vale la ec. (5.3): el resultado es una
                          extrapolación y conviene revisarlo con perfiles de temperatura reales.
                        </p>
                      )}
                      <ResultadoCheck
                        etiqueta="Espesor de ala (función separadora, informativo)"
                        verifica={resultadoFlexion.r.fuego.verificaEspesorAla}
                        detalle={`hc ${fmt(resultadoFlexion.r.frio.hcM * 1000, 0)} mm / mín. tabulado ${resultadoFlexion.r.fuego.espesorAlaMinMm} mm (Tabla 5.8)`}
                      />
                      <PanelFormulas
                        titulo="Ver cálculo"
                        filas={[
                          { etiqueta: "a real hasta el eje de la barra", valor: `${fmt(resultadoFlexion.r.fuego.aRealMm, 1)} mm` },
                          { etiqueta: "a mínimo tabulado (Tabla 5.5)", valor: `${fmt(resultadoFlexion.r.fuego.aMinTabMm, 1)} mm` },
                          { etiqueta: "θcr = 500 − 10·(a real − a tab)  (5.3)", valor: `${fmt(resultadoFlexion.r.fuego.thetaCrC, 0)} °C` },
                          { etiqueta: "ks(θcr)", valor: fmt(resultadoFlexion.r.fuego.ksTheta, 3) },
                          { etiqueta: "fsd,fi = ks(θcr)·fyk", valor: `${fmt(resultadoFlexion.r.fuego.fsdFiMPa, 1)} MPa` },
                          { etiqueta: "Np,fi = As·fsd,fi (chapa nula)", valor: `${fmt(resultadoFlexion.r.fuego.npFiKN)} kN/m` },
                          { etiqueta: "a bloque comprimido, en fuego", valor: `${fmt(resultadoFlexion.r.fuego.xplFiM * 1000, 1)} mm` },
                          { etiqueta: "z en fuego", valor: `${fmt(resultadoFlexion.r.fuego.zFiM * 1000, 1)} mm` },
                          { etiqueta: "Mfi,Rd = Np,fi·z", valor: `${fmt(resultadoFlexion.r.fuego.mFiRdKNm)} kN·m/m` },
                          { etiqueta: "MEd,fi = ηfi·MEd", valor: `${fmt(resultadoFlexion.r.fuego.mEdFiKNm)} kN·m/m` },
                        ]}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!resultadoRasante ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Rasante: completá la geometría del nervio, la luz, los coeficientes m-k y las acciones
                con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Rasante — acciones</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "wEd", valor: `${fmt(resultadoRasante.r.acciones.wEdKNm2)} kN/m²` },
                      { etiqueta: "VEd", valor: `${fmt(resultadoRasante.r.acciones.vEdKN)} kN` },
                      { etiqueta: "VEd por ancho", valor: `${fmt(resultadoRasante.r.acciones.vEdPorAnchoKNporM)} kN/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Rasante — método m-k</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="m-k estricto (EN 1994-1-1 §9.7.3)"
                    verifica={resultadoRasante.r.rasante.verificaEstricta}
                    comparacion={{
                      real: { etiqueta: "VEd", valor: resultadoRasante.r.acciones.vEdPorAnchoKNporM },
                      limite: { etiqueta: "Vl,Rd", valor: resultadoRasante.r.rasante.vlRdKNporM },
                      unidad: "kN/m",
                      exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Chequeo complementario: chapa exclusiva"
                    verifica={resultadoRasante.r.rasante.verificaChapaExclusiva}
                    comparacion={{
                      real: { etiqueta: "VEd,chapa", valor: resultadoRasante.r.rasante.vEdChapaKNporM },
                      limite: { etiqueta: "Vl,Rd", valor: resultadoRasante.r.rasante.vlRdKNporM },
                      unidad: "kN/m",
                      exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "As barras", valor: `${fmt(resultadoRasante.r.rasante.asBarrasMm2PorM, 1)} mm²/m` },
                      { etiqueta: "fyd barras", valor: `${fmt(resultadoRasante.r.rasante.fydBarrasMPa, 1)} MPa` },
                      { etiqueta: "T chapa = Ap·fyp", valor: `${fmt(resultadoRasante.r.rasante.tChapaKN)} kN/m` },
                      { etiqueta: "T barras = As·fyd", valor: `${fmt(resultadoRasante.r.rasante.tBarrasKN)} kN/m` },
                      { etiqueta: "α chapa = Tchapa/(Tchapa+Tbarras)", valor: fmt(resultadoRasante.r.rasante.alfaChapa, 3) },
                      { etiqueta: "VEd,chapa = α·VEd", valor: `${fmt(resultadoRasante.r.rasante.vEdChapaKNporM)} kN/m` },
                      { etiqueta: "Flujo de rasante ql ≈ Vp/dp", valor: `${fmt(resultadoRasante.r.rasante.flujoRasanteKNm2)} kN/m²` },
                      { etiqueta: "Vl,Rd, ec. m-k §9.7.3", valor: `${fmt(resultadoRasante.r.rasante.vlRdKNporM)} kN/m` },
                      { etiqueta: "VEd total / Vl,Rd", valor: fmt(resultadoRasante.r.rasante.utilizacionEstricta, 3) },
                      { etiqueta: "VEd,chapa / Vl,Rd", valor: fmt(resultadoRasante.r.rasante.utilizacionChapaExclusiva, 3) },
                    ]}
                  />
                </CardContent>
              </Card>

              {resultadoRasante.r.anclajeExtremo && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Anclaje de extremo (§9.7.4)</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-mono text-sm">
                      Ppb,Rd = {fmt(resultadoRasante.r.anclajeExtremo.ppbRdKNporM)} kN/m
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Resistencia al aplastamiento local de la chapa en el perno. Comparar contra la
                      demanda de rasante que efectivamente tome el anclaje de extremo en el esquema
                      real de la losa.
                    </p>
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "dd0 = 1,1·⌀perno", valor: `${fmt(resultadoRasante.r.anclajeExtremo.dd0Mm, 2)} mm` },
                        { etiqueta: "a = 2·dd0", valor: `${fmt(resultadoRasante.r.anclajeExtremo.aMm, 2)} mm` },
                        { etiqueta: "kφ = mín(6, 1+a/dd0)", valor: fmt(resultadoRasante.r.anclajeExtremo.kPhi, 2) },
                        { etiqueta: "Ppb,Rd", valor: `${fmt(resultadoRasante.r.anclajeExtremo.ppbRdKNporM)} kN/m` },
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
