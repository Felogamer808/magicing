"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { CroquisNervioSteelDeck } from "@/components/verificaciones/croquis/CroquisSteelDeck";
import {
  type ResistenciaFuego,
} from "@/lib/calc/hormigon/losas/steel-deck-flexion";
import {
  BMIN_NERVIO_M,
  CATALOGO_DECKPANEL_ARMCO,
  ESPESOR_DECKPANEL_ESTANDAR_MM,
  PERFIL_DECKPANEL,
} from "@/lib/calc/hormigon/losas/deckpanel-armco";
import { fmt } from "@/lib/verificaciones/formato";
import { ESPESOR_OPCIONES, ETIQUETA_ESPESOR, resolverSteelDeck } from "@/lib/calc/hormigon/losas/resolver-steel-deck";
import { recomendarSteelDeck } from "@/lib/verificaciones/recomendaciones/losa-steel-deck";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "losa-steel-deck")!;

const RESISTENCIAS_FUEGO: readonly ResistenciaFuego[] = ["R30", "R60", "R90", "R120", "R180", "R240"];
const SI_NO = ["No", "Sí"] as const;

const ETAPAS = [
  { id: "geometria", titulo: "Perfil y armadura" },
  { id: "flexion", titulo: "Flexión y fuego" },
  { id: "rasante", titulo: "Rasante" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/**
 * Antes eran dos páginas. Se fusionan en una porque son la misma pieza: el
 * mismo nervio de chapa colaborante da la flexión, el fuego y el rasante, y
 * separarlas obligaba a cargar la geometría del nervio dos veces para ver las
 * dos comprobaciones que realmente definen la losa.
 *
 * La página se organiza en tres secciones bien separadas —Geometría,
 * Flexión, Rasante— con el mismo orden en la columna de datos y en la de
 * resultados. Geometría es lo que describe la chapa ARMCO Deckpanel elegida
 * y la barra adicional: alimenta a los dos cálculos por igual, así que va
 * primero y aparte, no repetida ni mezclada adentro de cada comprobación.
 *
 * Los dos bloques de resultado se calculan por separado (dos useMemo, no uno):
 * son cómputos independientes que sólo comparten algunos datos de entrada, así
 * que completar la geometría del nervio no debería obligar a cargar también la
 * luz y las acciones del rasante para ver la flexión, ni viceversa.
 */
export default function LosaSteelDeckPage() {
  const [norma, setNorma] = useCampo("norma", "EC4");

  // --- GEOMETRÍA: perfil ARMCO Deckpanel y barra adicional -----------------
  // hp, fyp, el paso de nervio y (derivada) Ap son del perfil ARMCO
  // Deckpanel — fijos por catálogo, no datos de proyecto. Sólo se elige el
  // espesor de chapa: no hay forma de cargar un perfil que no sea ARMCO.
  // dp se deriva de h y del espesor elegido, no se carga a mano: así no
  // puede quedar desincronizado si se cambia h.
  const [espesorTotal, setEspesorTotal] = useCampo("espesorTotal", "0.15");
  const [espesorDeckpanelTxt, setEspesorDeckpanelTxt] = useCampo(
    "espesorDeckpanel",
    ETIQUETA_ESPESOR(ESPESOR_DECKPANEL_ESTANDAR_MM)
  );

  const [fykBarras, setFykBarras] = useCampo("fykBarras", "500");
  const [phiBarra, setPhiBarra] = useCampo("phiBarra", "10");
  // La separación entre nervios (el paso, 305mm) ya es fija: si se pone la
  // misma cantidad de barras en cada nervio, la separación entre barras no
  // es un dato libre, sale de paso/nºBarras. Se carga "cuántas barras por
  // nervio" —como se especifican en obra, 1Ø10, 2Ø10— y la separación se
  // deriva sola, no se carga en mm a mano.
  const [numeroBarrasPorNervio, setNumeroBarrasPorNervio] = useCampo("numeroBarrasPorNervio", "1");
  const [recBarra, setRecBarra] = useCampo("recBarra", "0.025");

  // --- FLEXIÓN: hormigón, solicitación y fuego -----------------------------
  const [fck, setFck] = useCampo("fck", "25");
  const [mEd, setMEd] = useCampo("mEd", "20");
  const [resistenciaFuego, setResistenciaFuego] = useCampo<ResistenciaFuego>("resistenciaFuego", "R60");
  const [etaFi, setEtaFi] = useCampo("etaFi", "0.7");

  // --- RASANTE: luz, coeficientes m-k, acciones y anclaje ------------------
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
  // El espesor que entra en el anclaje de extremo es el de ESTA chapa, la que
  // ya se eligió arriba: antes se cargaba a mano y se podía terminar con dos
  // espesores distintos para la misma chapa. Se toma el acero base y no el
  // espesor del panel porque el galvanizado no aporta al aplastamiento.
  const [diametroPerno, setDiametroPerno] = useCampo("diametroPerno", "25.4");
  const [numeroPernos, setNumeroPernos] = useCampo("numeroPernos", "1");
  const [sepPernos, setSepPernos] = useCampo("sepPernos", "0.3");

  const campos = useMemo(
    () => ({ espesorTotal, espesorDeckpanel: espesorDeckpanelTxt, fykBarras, phiBarra, numeroBarrasPorNervio, recBarra, fck, mEd, resistenciaFuego, etaFi, luz, anchoTrib, m, k, gammaVs, lsSobreL, gPp, gAdd, q, gammaG, gammaQ, anclajePresente, diametroPerno, numeroPernos, sepPernos }),
    [espesorTotal, espesorDeckpanelTxt, fykBarras, phiBarra, numeroBarrasPorNervio, recBarra, fck, mEd, resistenciaFuego, etaFi, luz, anchoTrib, m, k, gammaVs, lsSobreL, gPp, gAdd, q, gammaG, gammaQ, anclajePresente, diametroPerno, numeroPernos, sepPernos]
  );
  const resuelto = useMemo(() => resolverSteelDeck(campos), [campos]);
  const { espesorDeckpanel, alturaNervio, fyp, ap, dp, sepBarra, espesorChapaMm } = resuelto.derivados;
  const resultadoFlexion = resuelto.flexion;
  // Cambios recalculados para lo que no cumple o queda justo.
  const propuestas = useMemo(() => recomendarSteelDeck(campos), [campos]);

  /**
   * La posición de la barra dentro del nervio es la palanca más fuerte del
   * chequeo de incendio y la menos evidente: entre quedarse corto y llegar al
   * valor tabulado se va más de la mitad del límite elástico que conserva el
   * acero, sin agregar un gramo de armadura. Por eso el dato se muestra al
   * lado del resultado y no enterrado en "Ver cálculo".
   */
  const fuegoBarraCorta =
    resultadoFlexion !== null &&
    resultadoFlexion.r.fuego.aMinTabMm !== null &&
    resultadoFlexion.r.fuego.aRealMm < resultadoFlexion.r.fuego.aMinTabMm;

  const resultadoRasante = resuelto.rasante;

  const avisos: AvisoRevision[] = [];
  if (!resultadoFlexion)
    avisos.push({ tipo: "error", texto: "Flexión: completá la geometría, fck y MEd con valores válidos (hp, dp y el recubrimiento tienen que ser menores que h)." });
  if (!resultadoRasante)
    avisos.push({ tipo: "error", texto: "Rasante: completá la luz, los coeficientes m-k y las acciones con valores válidos." });
  if (resultadoFlexion && !resultadoFlexion.r.frio.bloqueDentroDeHc)
    avisos.push({
      tipo: "aviso",
      texto: `El bloque comprimido (a = ${fmt(resultadoFlexion.r.frio.xplM * 1000, 0)} mm) supera hc = ${fmt(resultadoFlexion.r.frio.hcM * 1000, 0)} mm: invade el nervio y el cálculo simplificado deja de valer.`,
    });
  if (fuegoBarraCorta)
    avisos.push({ tipo: "aviso", texto: "La barra está más cerca del fondo del nervio que el mínimo de la Tabla 5.5: subirla es la corrección más barata en incendio." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · Losas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Perfil y armadura" descripcion="Chapa ARMCO Deckpanel, espesor de losa y barra adicional por nervio.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Perfil ARMCO Deckpanel">
                  <CampoSeleccion
                    id="espesorDeckpanel"
                    etiqueta="Espesor de chapa (único dato que se elige)"
                    valor={espesorDeckpanelTxt}
                    opciones={ESPESOR_OPCIONES}
                    onChange={setEspesorDeckpanelTxt}
                  />
                  <div className="max-w-[14rem]">
                    <CampoNumerico id="espesorTotal" etiqueta="h — espesor total de losa" sufijo="m" valor={espesorTotal} onChange={setEspesorTotal} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                    <dt>hp (fijo)</dt>
                    <dd className="text-right text-foreground">{fmt(alturaNervio * 1000, 0)} mm</dd>
                    <dt>Paso de nervio (fijo)</dt>
                    <dd className="text-right text-foreground">{fmt(PERFIL_DECKPANEL.pasoNervioM * 1000, 0)} mm</dd>
                    <dt>fyp (fijo)</dt>
                    <dd className="text-right text-foreground">{fmt(fyp, 1)} MPa</dd>
                    <dt>Ancho efectivo (fijo)</dt>
                    <dd className="text-right text-foreground">{fmt(PERFIL_DECKPANEL.anchoEfectivoM * 1000, 0)} mm</dd>
                    <dt>bmin, fondo del nervio (fijo)</dt>
                    <dd className="text-right text-foreground">{fmt(BMIN_NERVIO_M * 1000, 0)} mm</dd>
                  </dl>
                  <PanelAyuda titulo="Qué es fijo, qué se deriva y qué sigue siendo un dato de proyecto">
                    <p>
                      Esta página es siempre ARMCO Deckpanel. Lo único que se elige es el espesor de
                      chapa entre los tres del folleto (0,89 mm es el estándar de obra).
                    </p>
                    <p>
                      <strong className="text-foreground">hp, fyp, paso y ancho efectivo</strong> son
                      del perfil: 63 mm de nervio, acero ASTM A653 SS grado 37 (fy = 255,1 MPa), 305 mm
                      entre nervios y 915 mm de panel. No se cargan a mano.
                    </p>
                    <p>
                      <strong className="text-foreground">Ap</strong> se deriva del peso de catálogo
                      descontando el galvanizado Z180; no es un Ap certificado, pero el cociente con el
                      espesor base da 1,29–1,31 en los tres espesores, lo que confirma la cuenta.
                      <strong className="text-foreground"> dp</strong> sale de 63 − Ix/Wx del folleto y
                      se recalcula solo al cambiar h.
                    </p>
                    <p>
                      <strong className="text-foreground">bmin</strong> es el ancho del fondo de un
                      nervio (no el paso) y sólo lo usa el chequeo de incendio, Tabla 5.5 de EC2‑1‑2.
                    </p>
                  </PanelAyuda>
                </Subgrupo>
                <Subgrupo titulo="Barra adicional por nervio" detalle={`separación equivalente ${Number.isFinite(sepBarra) ? fmt(sepBarra, 1) : "—"} mm`}>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="phiBarra" etiqueta="Ø" valor={phiBarra} onChange={setPhiBarra} />
                    <CampoNumerico id="numeroBarrasPorNervio" etiqueta="Nº de barras por nervio" valor={numeroBarrasPorNervio} onChange={setNumeroBarrasPorNervio} />
                    <CampoNumerico id="recBarra" etiqueta="Recub. inferior al eje" sufijo="m" valor={recBarra} onChange={setRecBarra} />
                    <CampoNumerico id="fykBarras" etiqueta="fyk barras" sufijo="MPa" valor={fykBarras} onChange={setFykBarras} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ø = 0 para calcular sólo con la chapa. La separación sale del paso de nervio
                    dividido por las barras por nervio. El recubrimiento sólo lo usa el chequeo de
                    incendio. La misma barra entra en la flexión y en el rasante.
                  </p>
                </Subgrupo>
              </>
            }
            dibujo={<CroquisNervioSteelDeck />}
          />
        </Etapa>

        <Etapa id="flexion" numero={2} titulo="Flexión y fuego" descripcion="Momento de cálculo y situación de incendio.">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CampoNumerico id="fck" etiqueta="fck hormigón" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="mEd" etiqueta="MEd" sufijo="kN·m/m" valor={mEd} onChange={setMEd} />
              <CampoSeleccion
                id="resistenciaFuego"
                etiqueta="Resistencia al fuego"
                valor={resistenciaFuego}
                opciones={RESISTENCIAS_FUEGO}
                onChange={(v) => setResistenciaFuego(v as ResistenciaFuego)}
              />
              <CampoNumerico id="etaFi" etiqueta="ηfi" valor={etaFi} onChange={setEtaFi} />
            </div>
            <PanelAyuda titulo="De dónde sale cada dato de fuego">
              <p>
                <strong className="text-foreground">ηfi</strong> lleva el momento en frío a la
                combinación de incendio, EC2‑1‑2 §2.4.2, ec. (2.5): MEd,fi = ηfi·MEd. 0,7 es la
                simplificación recomendada.
              </p>
              <p>
                La temperatura de la barra sale de la Tabla 5.5 de EC2‑1‑2 (el nervio como alma) y
                la ec. (5.3): cada mm de recubrimiento de más o de menos son 10 °C sobre los 500 °C
                de referencia. Es una aproximación para predimensionar, no el Anexo D de EN 1994‑1‑2.
              </p>
            </PanelAyuda>
          </div>
        </Etapa>

        <Etapa id="rasante" numero={3} titulo="Rasante" descripcion="Luz, coeficientes m-k del ensayo, acciones y anclaje de extremo.">
          <div className="space-y-6">
            <Subgrupo titulo="Luz y ancho tributario">
              <div className="grid max-w-md grid-cols-2 gap-4">
                <CampoNumerico id="luz" etiqueta="Luz L" sufijo="m" valor={luz} onChange={setLuz} />
                <CampoNumerico id="anchoTrib" etiqueta="Ancho tributario b" sufijo="m" valor={anchoTrib} onChange={setAnchoTrib} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Coeficientes m-k">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoNumerico id="m" etiqueta="m" sufijo="N/mm²" valor={m} onChange={setM} />
                <CampoNumerico id="k" etiqueta="k" sufijo="N/mm²" valor={k} onChange={setK} />
                <CampoNumerico id="gammaVs" etiqueta="γVS" valor={gammaVs} onChange={setGammaVs} />
                <CampoNumerico id="lsSobreL" etiqueta="Ls/L" valor={lsSobreL} onChange={setLsSobreL} />
              </div>
              <PanelAyuda titulo="De dónde salen m y k">
                <p>
                  Del ensayo de la chapa concreta, EN 1994‑1‑1 §B.3: no se derivan de otros datos.
                  Sin el valor certificado del fabricante, cargar uno conservador e informarlo en la
                  memoria. Ls/L = 0,25 es carga uniforme con apoyo simple.
                </p>
              </PanelAyuda>
            </Subgrupo>
            <Subgrupo titulo="Acciones ELU">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <CampoNumerico id="gPp" etiqueta="Gk,pp" sufijo="kN/m²" valor={gPp} onChange={setGPp} />
                <CampoNumerico id="gAdd" etiqueta="Gk,add" sufijo="kN/m²" valor={gAdd} onChange={setGAdd} />
                <CampoNumerico id="q" etiqueta="Qk" sufijo="kN/m²" valor={q} onChange={setQ} />
                <CampoNumerico id="gammaG" etiqueta="γG" valor={gammaG} onChange={setGammaG} />
                <CampoNumerico id="gammaQ" etiqueta="γQ" valor={gammaQ} onChange={setGammaQ} />
              </div>
              <PanelAyuda titulo="Peso propio de catálogo (chapa + hormigón), de referencia">
                <p>
                  Según el espesor de hormigón sobre cresta hc, para la chapa de {fmt(espesorDeckpanel, 3)} mm.
                  Carpeta, contrapiso o terminaciones van aparte en Gk,add.
                </p>
                <dl className="grid grid-cols-6 gap-x-2 gap-y-1 text-center font-mono text-[11px]">
                  <dt className="text-left">hc</dt>
                  {Object.keys(CATALOGO_DECKPANEL_ARMCO[espesorDeckpanel].pesoPropioTotalPorHcCm).map((hc) => (
                    <dd key={hc} className="text-foreground">{hc} cm</dd>
                  ))}
                  <dt className="text-left">Gk,pp</dt>
                  {Object.values(CATALOGO_DECKPANEL_ARMCO[espesorDeckpanel].pesoPropioTotalPorHcCm).map((kgM2, i) => (
                    <dd key={i} className="text-foreground">{fmt((kgM2 * 9.81) / 1000, 2)}</dd>
                  ))}
                </dl>
                <p className="text-[11px]">kN/m², con hc = h − hp.</p>
              </PanelAyuda>
            </Subgrupo>
            <Subgrupo titulo="Anclaje de extremo con pernos (opcional)">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoSeleccion id="anclajePresente" etiqueta="¿Tiene pernos de anclaje?" valor={anclajePresente} opciones={SI_NO} onChange={(v) => setAnclajePresente(v as (typeof SI_NO)[number])} />
                {anclajePresente === "Sí" && (
                  <>
                    <CampoNumerico id="diametroPerno" etiqueta="⌀ perno" sufijo="mm" valor={diametroPerno} onChange={setDiametroPerno} />
                    <CampoNumerico id="numeroPernos" etiqueta="Nº pernos por nervio" valor={numeroPernos} onChange={setNumeroPernos} />
                    <CampoNumerico id="sepPernos" etiqueta="Separación pernos" sufijo="m" valor={sepPernos} onChange={setSepPernos} />
                  </>
                )}
              </div>
              {anclajePresente === "Sí" && (
                <p className="text-xs text-muted-foreground">
                  Espesor de chapa t = {fmt(espesorChapaMm, 2)} mm, el acero base del perfil elegido.
                </p>
              )}
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Chapa", valor: `ARMCO Deckpanel ${fmt(espesorDeckpanel, 3)} mm` },
              { etiqueta: "h / fck", valor: `${espesorTotal} m / ${fck} MPa` },
              { etiqueta: "Barra por nervio", valor: `${numeroBarrasPorNervio}Ø${phiBarra}` },
              { etiqueta: "Ap", valor: `${fmt(ap, 0)} mm²/m`, derivado: true },
              { etiqueta: "dp", valor: `${fmt(dp * 1000, 1)} mm`, derivado: true },
              { etiqueta: "MEd / L", valor: `${mEd} kN·m/m / ${luz} m` },
            ]}
            hipotesis={[
              "En frío, chapa y barras forman un único acero traccionado que equilibra el bloque de hormigón comprimido, EN 1994‑1‑1 §9.7.2.",
              "En incendio la chapa se descarta y sólo tracciona la barra, reducida por temperatura según EC2‑1‑2 (Tabla 5.5 y ec. 5.3). R30 se concede sin cálculo, EN 1994‑1‑2 §4.3.2(5).",
              "Rasante por el método m-k, EN 1994‑1‑1 §9.7.3, sobre la chapa; las barras sólo entran en el chequeo complementario que reparte la demanda.",
              "Cortante de cálculo con carga uniforme en tramo simplemente apoyado: VEd = wEd·L·b/2.",
              "Anclaje de extremo §9.7.4 como chequeo adicional, no sustituye al m-k.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultadoFlexion && !resultadoRasante ? (
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
                  { etiqueta: "Mpl,Rd", valor: resultadoFlexion ? `${fmt(resultadoFlexion.r.frio.mPlRdKNm)} kN·m/m` : "—", nota: `MEd ${mEd}` },
                  {
                    etiqueta: "Mfi,Rd",
                    valor: resultadoFlexion && resultadoFlexion.r.fuego.thetaCrEnRangoValido && !resultadoFlexion.r.fuego.concedidaPorEc4 ? `${fmt(resultadoFlexion.r.fuego.mFiRdKNm)} kN·m/m` : "—",
                    nota: resistenciaFuego,
                  },
                  { etiqueta: "Vl,Rd", valor: resultadoRasante ? `${fmt(resultadoRasante.r.rasante.vlRdKNporM)} kN/m` : "—" },
                  { etiqueta: "Ap / dp", valor: `${fmt(ap, 0)} / ${fmt(dp * 1000, 1)}`, nota: "mm²/m / mm" },
                ]}
              />

              {resultadoFlexion && (
                <Subgrupo titulo="Flexión en frío">
                  <div>
                    <ResultadoCheck
                      etiqueta="Momento resistente"
                      verifica={resultadoFlexion.r.frio.verificaFlexion}
                      comparacion={{
                        real: { etiqueta: "MEd", valor: resultadoFlexion.r.frio.mEdKNm },
                        limite: { etiqueta: "Mpl,Rd", valor: resultadoFlexion.r.frio.mPlRdKNm },
                        unidad: "kN·m/m", exige: "≤",
                      }}
                      recomendaciones={propuestas.frio}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo de la flexión en frío"
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
                  </div>
                </Subgrupo>
              )}

              {resultadoFlexion && (
                <Subgrupo titulo={`Incendio · ${resistenciaFuego}`}>
                  <div>
                    {resultadoFlexion.r.fuego.concedidaPorEc4 ? (
                      <ResultadoCheck
                        etiqueta="Capacidad portante R30"
                        verifica
                        detalle="Concedida por EN 1994‑1‑2 §4.3.2(5), sin cálculo: la losa dimensionada en frío según EN 1994‑1‑1 resiste al menos 30 min."
                      />
                    ) : resultadoFlexion.r.fuego.nervioMasAngostoQueLaTabla ? (
                      <ResultadoCheck
                        etiqueta={`Capacidad portante ${resistenciaFuego}`}
                        verifica={false}
                        estado="no-evaluado"
                        detalle={`El nervio mide ${fmt(PERFIL_DECKPANEL.anchoValleM * 1000, 0)} mm y la Tabla 5.5 arranca en ${fmt(resultadoFlexion.r.fuego.bMinTabuladoMinimoMm ?? 0, 0)} mm: fuera de alcance de este método y no se arregla con recubrimiento. Salidas: cielorraso de protección (§4.3.3), armadura negativa de continuidad o el método avanzado de §4.4.`}
                      />
                    ) : resultadoFlexion.r.fuego.thetaCrEnRangoValido ? (
                      <ResultadoCheck
                        etiqueta="Momento resistente en incendio"
                        verifica={resultadoFlexion.r.fuego.verificaFuego}
                        detalle={`Barra a a = ${fmt(resultadoFlexion.r.fuego.aRealMm, 0)} mm del fondo (Tabla 5.5 pide ${fmt(resultadoFlexion.r.fuego.aMinTabMm ?? 0, 0)} mm): trabaja a ${fmt(resultadoFlexion.r.fuego.thetaCrC, 0)} °C y conserva el ${fmt(resultadoFlexion.r.fuego.ksTheta * 100, 0)} % de su límite elástico.`}
                        comparacion={{
                          real: { etiqueta: "MEd,fi", valor: resultadoFlexion.r.fuego.mEdFiKNm },
                          limite: { etiqueta: "Mfi,Rd", valor: resultadoFlexion.r.fuego.mFiRdKNm },
                          unidad: "kN·m/m", exige: "≤",
                        }}
                        recomendaciones={propuestas.fuego}
                      />
                    ) : (
                      <ResultadoCheck
                        etiqueta="Momento resistente en incendio"
                        verifica={false}
                        estado="datos-insuficientes"
                        detalle={`θcr = ${fmt(resultadoFlexion.r.fuego.thetaCrC, 0)} °C queda fuera del rango 350–700 °C de la ec. (5.3): con a = ${fmt(resultadoFlexion.r.fuego.aRealMm, 0)} mm, lejos del tabulado ${fmt(resultadoFlexion.r.fuego.aMinTabMm ?? 0, 0)} mm. Ajustar el recubrimiento; el desarrollo queda sólo de referencia.`}
                      />
                    )}
                    {resultadoFlexion.r.fuego.aMinTabMm !== null && (
                      <PanelFormulas
                        titulo="Ver desarrollo en incendio"
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
                    )}
                  </div>
                </Subgrupo>
              )}

              {resultadoRasante && (
                <Subgrupo titulo="Rasante">
                  <div>
                    <ResultadoCheck
                      etiqueta="Rasante por m-k estricto (EN 1994‑1‑1 §9.7.3)"
                      verifica={resultadoRasante.r.rasante.verificaEstricta}
                      comparacion={{
                        real: { etiqueta: "VEd", valor: resultadoRasante.r.acciones.vEdPorAnchoKNporM },
                        limite: { etiqueta: "Vl,Rd", valor: resultadoRasante.r.rasante.vlRdKNporM },
                        unidad: "kN/m", exige: "≤",
                      }}
                      recomendaciones={propuestas.rasante}
                    />
                    <ResultadoCheck
                      etiqueta="Rasante · chequeo complementario con la chapa exclusiva"
                      verifica={resultadoRasante.r.rasante.verificaChapaExclusiva}
                      comparacion={{
                        real: { etiqueta: "VEd,chapa", valor: resultadoRasante.r.rasante.vEdChapaKNporM },
                        limite: { etiqueta: "Vl,Rd", valor: resultadoRasante.r.rasante.vlRdKNporM },
                        unidad: "kN/m", exige: "≤",
                      }}
                      recomendaciones={propuestas.chapaExclusiva}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo del rasante"
                      filas={[
                        { etiqueta: "wEd", valor: `${fmt(resultadoRasante.r.acciones.wEdKNm2)} kN/m²` },
                        { etiqueta: "VEd", valor: `${fmt(resultadoRasante.r.acciones.vEdKN)} kN` },
                        { etiqueta: "VEd por ancho", valor: `${fmt(resultadoRasante.r.acciones.vEdPorAnchoKNporM)} kN/m` },
                        { etiqueta: "As barras", valor: `${fmt(resultadoRasante.r.rasante.asBarrasMm2PorM, 1)} mm²/m` },
                        { etiqueta: "T chapa = Ap·fyp", valor: `${fmt(resultadoRasante.r.rasante.tChapaKN)} kN/m` },
                        { etiqueta: "T barras = As·fyd", valor: `${fmt(resultadoRasante.r.rasante.tBarrasKN)} kN/m` },
                        { etiqueta: "α chapa = Tchapa/(Tchapa+Tbarras)", valor: fmt(resultadoRasante.r.rasante.alfaChapa, 3) },
                        { etiqueta: "VEd,chapa = α·VEd", valor: `${fmt(resultadoRasante.r.rasante.vEdChapaKNporM)} kN/m` },
                        { etiqueta: "Flujo de rasante ql ≈ Vp/dp", valor: `${fmt(resultadoRasante.r.rasante.flujoRasanteKNm2)} kN/m²` },
                        { etiqueta: "Vl,Rd, ec. m-k §9.7.3", valor: `${fmt(resultadoRasante.r.rasante.vlRdKNporM)} kN/m` },
                      ]}
                    />
                    {resultadoRasante.r.anclajeExtremo && (
                      <PanelFormulas
                        titulo="Ver desarrollo del anclaje de extremo (§9.7.4)"
                        filas={[
                          { etiqueta: "dd0 = 1,1·⌀perno", valor: `${fmt(resultadoRasante.r.anclajeExtremo.dd0Mm, 2)} mm` },
                          { etiqueta: "a = 2·dd0", valor: `${fmt(resultadoRasante.r.anclajeExtremo.aMm, 2)} mm` },
                          { etiqueta: "kφ = mín(6, 1+a/dd0)", valor: fmt(resultadoRasante.r.anclajeExtremo.kPhi, 2) },
                          { etiqueta: "Ppb,Rd (aplastamiento en el perno)", valor: `${fmt(resultadoRasante.r.anclajeExtremo.ppbRdKNporM)} kN/m` },
                        ]}
                      />
                    )}
                  </div>
                </Subgrupo>
              )}

              {resultadoFlexion && (
                <Subgrupo titulo="Condiciones constructivas" detalle="informativas">
                  <div>
                    <ResultadoCheck
                      etiqueta="Espesor de ala para la función separadora (Tabla 5.8)"
                      verifica={resultadoFlexion.r.fuego.verificaEspesorAla}
                      comparacion={{
                        real: { etiqueta: "hc", valor: resultadoFlexion.r.frio.hcM * 1000 },
                        limite: { etiqueta: "mín. tabulado", valor: resultadoFlexion.r.fuego.espesorAlaMinMm },
                        unidad: "mm", exige: "≥", decimales: 0,
                      }}
                      recomendaciones={propuestas.espesorAla}
                    />
                  </div>
                </Subgrupo>
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
