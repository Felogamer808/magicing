"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaInteraccionMuro } from "@/components/verificaciones/hormigon/DiagramaInteraccionMuro";
import { calcularMuro } from "@/lib/calc/hormigon/muros/portante";
import {
  NOMBRE_CEMENTO,
  NOMBRE_EXPOSICION,
  calcularFluencia,
  perimetroExpuestoM,
  tamanoTeoricoMm,
  type ClaseCemento,
  type ExposicionSeccion,
} from "@/lib/calc/hormigon/comun/diferidas";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "muros")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "esfuerzos", titulo: "Esfuerzos" },
  { id: "fluencia", titulo: "Fluencia" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const CEMENTOS = Object.keys(NOMBRE_CEMENTO) as ClaseCemento[];
const OPCIONES_CEMENTO = CEMENTOS.map((c) => NOMBRE_CEMENTO[c]);
const cementoDesdeNombre = (nombre: string): ClaseCemento =>
  CEMENTOS.find((c) => NOMBRE_CEMENTO[c] === nombre) ?? "N";

const EXPOSICIONES = Object.keys(NOMBRE_EXPOSICION) as ExposicionSeccion[];
const OPCIONES_EXPOSICION = EXPOSICIONES.map((e) => NOMBRE_EXPOSICION[e]);
const exposicionDesdeNombre = (nombre: string): ExposicionSeccion =>
  EXPOSICIONES.find((e) => NOMBRE_EXPOSICION[e] === nombre) ?? "cuatro-caras";

/** Casos de coacción de la figura A19.5.7, con su factor de longitud efectiva. */
const COACCIONES = [
  "Biarticulado (β = 1,0)",
  "Un extremo empotrado (β = 0,7)",
  "Biempotrado (β = 0,5)",
  "En ménsula (β = 2,0)",
] as const;

const BETA: Record<string, number> = {
  [COACCIONES[0]]: 1,
  [COACCIONES[1]]: 0.7,
  [COACCIONES[2]]: 0.5,
  [COACCIONES[3]]: 2,
};

export default function MuroPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [espesor, setEspesor] = useCampo("espesor", "0.3");
  const [longitud, setLongitud] = useCampo("longitud", "4");
  const [altura, setAltura] = useCampo("altura", "2.5");
  const [coaccion, setCoaccion] = useCampo("coaccion", COACCIONES[0]);
  const [rec, setRec] = useCampo("rec", "0.04");

  const [nEd, setNEd] = useCampo("nEd", "600");
  const [m01, setM01] = useCampo("m01", "0");
  const [m02, setM02] = useCampo("m02", "0");

  // φ(∞,t0) ya no se carga a mano: sale del art. 3.1.4 y del Apéndice B con el
  // ambiente y la sección, igual que en deformaciones. Lo que sí hay que dar es
  // qué parte del momento es cuasipermanente, para pasar de φ a φef (ec. 5.19).
  const [hr, setHr] = useCampo("hr", "70");
  const [t0, setT0] = useCampo("t0", "28");
  const [cementoTxt, setCementoTxt] = useCampo("cemento", NOMBRE_CEMENTO.N);
  const [exposicionTxt, setExposicionTxt] = useCampo("exposicion", NOMBRE_EXPOSICION["cuatro-caras"]);
  const [relacionMqp, setRelacionMqp] = useCampo("relacionMqp", "0.7");

  const [phiV, setPhiV] = useCampo("phiV", "12");
  const [sepV, setSepV] = useCampo("sepV", "200");
  const [phiH, setPhiH] = useCampo("phiH", "12");
  const [sepH, setSepH] = useCampo("sepH", "200");

  const cemento = cementoDesdeNombre(cementoTxt);
  const exposicion = exposicionDesdeNombre(exposicionTxt);

  // En un muro las dos caras grandes son las que secan, y el espesor es el que
  // manda: h0 = 2·(L·h)/u. Se arma acá para poder mostrarlo aunque el resto del
  // formulario no cierre.
  const h0Mm = tamanoTeoricoMm(
    aNumero(longitud) * aNumero(espesor),
    perimetroExpuestoM(exposicion, aNumero(longitud), aNumero(espesor))
  );
  const fluencia = useMemo(
    () =>
      calcularFluencia({
        fckMPa: aNumero(fck),
        hrPct: aNumero(hr),
        t0Dias: aNumero(t0),
        claseCemento: cemento,
        h0Mm,
      }),
    [fck, hr, t0, cemento, h0Mm]
  );
  const phiBasica = fluencia.phi;

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk),
      espesor: aNumero(espesor), longitud: aNumero(longitud), altura: aNumero(altura),
      rec: aNumero(rec), nEd: aNumero(nEd), m01: aNumero(m01), m02: aNumero(m02),
      relacionMqp: aNumero(relacionMqp),
      phiV: aNumero(phiV), sepV: aNumero(sepV), phiH: aNumero(phiH), sepH: aNumero(sepH),
    };
    const positivos = [n.fck, n.fyk, n.espesor, n.longitud, n.altura, n.rec, n.nEd,
                       n.phiV, n.sepV, n.phiH, n.sepH];
    if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![n.m01, n.m02, n.relacionMqp].every((x) => Number.isFinite(x) && x >= 0)) return null;
    // La fracción cuasipermanente no puede pasar del momento total.
    if (n.relacionMqp > 1) return null;
    // El recubrimiento tiene que dejar canto útil de los dos lados.
    if (2 * n.rec >= n.espesor) return null;
    if (Math.abs(n.m01) > Math.abs(n.m02)) return null;

    return {
      n,
      r: calcularMuro(
        derivarMateriales({ fck: n.fck, fyk: n.fyk }),
        {
          espesorM: n.espesor, longitudM: n.longitud, alturaLibreM: n.altura,
          beta: BETA[coaccion] ?? 1, recubrimientoMecanicoM: n.rec,
        },
        {
          diametroVerticalMm: n.phiV, separacionVerticalMm: n.sepV,
          diametroHorizontalMm: n.phiH, separacionHorizontalMm: n.sepH,
          dosCaras: true,
        },
        {
          nEdKN: n.nEd, m01KNm: n.m01, m02KNm: n.m02,
          fluenciaBasica: phiBasica,
          relacionMomentoCuasipermanente: n.relacionMqp,
        },
        n.fyk
      ),
    };
  }, [fck, fyk, espesor, longitud, altura, coaccion, rec, nEd, m01, m02, relacionMqp,
      phiBasica, phiV, sepV, phiH, sepH]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos: el recubrimiento tiene que dejar canto de los dos lados, M0Eqp/M0Ed tiene que estar entre 0 y 1 y |M01| no puede superar a |M02|.",
    });
  } else {
    if (!resultado.r.clasificacion.esMuro)
      avisos.push({ tipo: "aviso", texto: "Con L/h por debajo de 4 no es un muro a efectos del articulado: hay que verificarlo como pilar." });
    if (resultado.r.armado.requiereArmaduraTransversal)
      avisos.push({ tipo: "aviso", texto: "La armadura vertical supera 0,02·Ac: el art. 9.6.4(1) pide cercos con las reglas de pilares, que esta verificación no incluye." });
    if (resultado.r.fluencia.puedeIgnorarse)
      avisos.push({
        tipo: "aviso",
        texto: "Se cumplen las tres condiciones del art. 5.8.4(4) para tomar φef = 0. No se aplica solo: haría la comprobación menos exigente, y la decisión queda del lado del proyectista.",
      });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Muros · verificación por metro</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <p className="text-sm text-muted-foreground">
        Muro portante: un elemento vertical que baja carga y que, por esbelto, puede pandear. No es
        el muro de contención. El Anejo 19 le da artículo propio de armado (art. 9.6). Todo por
        metro de muro.
      </p>

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría y materiales" descripcion="El muro, su altura libre y cómo está coaccionado en los extremos.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="espesor" etiqueta="Espesor h" sufijo="m" valor={espesor} onChange={setEspesor} />
              <CampoNumerico id="longitud" etiqueta="Longitud L" sufijo="m" valor={longitud} onChange={setLongitud} />
              <CampoNumerico id="altura" etiqueta="Altura libre" sufijo="m" valor={altura} onChange={setAltura} />
              <CampoNumerico id="rec" etiqueta="Rec. mecánico" sufijo="m" valor={rec} onChange={setRec} />
            </div>
            <div className="max-w-md">
              <CampoSeleccion id="coaccion" etiqueta="Coacción en los extremos" valor={coaccion} opciones={COACCIONES} onChange={setCoaccion} />
            </div>
            <PanelAyuda titulo="Qué define cada dato">
              <p>
                <strong className="text-foreground">Longitud L.</strong> Decide si el elemento es muro
                o pilar: con L menor que cuatro veces el espesor, el art. 9.6 no aplica.
              </p>
              <p>
                <strong className="text-foreground">Coacción.</strong> Fija l₀ = β·l, que entra en la
                esbeltez. Es el dato que más mueve el resultado: de biarticulado a ménsula duplica λ.
              </p>
            </PanelAyuda>
          </div>
        </Etapa>

        <Etapa id="esfuerzos" numero={2} titulo="Esfuerzos" descripcion="Axil y momentos de primer orden de cálculo, por metro.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="nEd" etiqueta="NEd" sufijo="kN/m" valor={nEd} onChange={setNEd} />
            <CampoNumerico id="m01" etiqueta="M01" sufijo="kN·m/m" valor={m01} onChange={setM01} />
            <CampoNumerico id="m02" etiqueta="M02 (el mayor)" sufijo="kN·m/m" valor={m02} onChange={setM02} />
            <CampoNumerico
              id="relacionMqp"
              etiqueta="M0Eqp/M0Ed"
              valor={relacionMqp}
              onChange={setRelacionMqp}
              advertencia="Fracción cuasipermanente del momento, ec. (5.19). Entre 0 y 1"
            />
          </div>
        </Etapa>

        <Etapa id="fluencia" numero={3} titulo="Fluencia" descripcion="φ(∞,t0) del art. 3.1.4 y el Apéndice B, con el ambiente y la sección.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="hr" etiqueta="Humedad relativa" sufijo="%" valor={hr} onChange={setHr} advertencia="Interior de edificio ≈50-70 %; a la intemperie ≈80 %" />
              <CampoNumerico id="t0" etiqueta="Edad de puesta en carga" sufijo="días" valor={t0} onChange={setT0} />
              <CampoSeleccion id="cemento" etiqueta="Clase de cemento" valor={cementoTxt} opciones={OPCIONES_CEMENTO} onChange={setCementoTxt} />
              <CampoSeleccion id="exposicion" etiqueta="Caras que secan" valor={exposicionTxt} opciones={OPCIONES_EXPOSICION} onChange={setExposicionTxt} />
            </div>
            <p className="font-mono text-sm tabular-nums">
              φ(∞,t0) = <strong>{fmt(phiBasica, 3)}</strong>
              <span className="ml-2 text-xs text-muted-foreground">
                h0 = {fmt(h0Mm, 0)} mm · φHR {fmt(fluencia.phiHR, 3)} · β(fcm) {fmt(fluencia.betaFcm, 3)} · β(t0) {fmt(fluencia.betaT0, 3)}
              </span>
            </p>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={4} titulo="Armadura" descripcion="Repartida en las dos caras (art. 9.6.3(1)); las áreas son la suma de ambas.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoDiametro id="phiV" etiqueta="Ø vertical" valor={phiV} onChange={setPhiV} />
            <CampoNumerico id="sepV" etiqueta="Sep. vertical" sufijo="mm" valor={sepV} onChange={setSepV} />
            <CampoDiametro id="phiH" etiqueta="Ø horizontal" valor={phiH} onChange={setPhiH} />
            <CampoNumerico id="sepH" etiqueta="Sep. horizontal" sufijo="mm" valor={sepH} onChange={setSepH} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "h × L × altura", valor: `${espesor} × ${longitud} × ${altura} m` },
              { etiqueta: "β (coacción)", valor: fmt(BETA[coaccion] ?? 1, 1) },
              { etiqueta: "NEd", valor: `${nEd} kN/m` },
              { etiqueta: "φ(∞,t0)", valor: fmt(phiBasica, 3), derivado: true },
              ...(resultado ? [{ etiqueta: "φef (5.19)", valor: fmt(resultado.r.fluencia.eficaz, 3), derivado: true }] : []),
            ]}
            hipotesis={[
              "Armado del muro según el Anejo 19, art. 9.6: cuantía vertical entre 0,002·Ac y 0,04·Ac, horizontal según 9.6.3 y separaciones máximas.",
              "Esbeltez con l₀ = β·l y λlim de la ec. (5.13); si λ > λlim se suma el segundo orden por curvatura nominal (ec. 5.31 a 5.33).",
              "Excentricidad mínima e₀ = máx(h/30, 20 mm).",
              "φ(∞,t0) del Apéndice B y φef por la ec. (5.19); no se aplica φef = 0 aunque el art. 5.8.4(4) lo permita.",
              "Armadura repartida en las dos caras.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={6} titulo="Resultados">
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
                  { etiqueta: "λ / λlim", valor: `${fmt(resultado.r.esbeltez.lambda, 1)} / ${fmt(resultado.r.esbeltez.lambdaLimite, 1)}`, nota: resultado.r.esbeltez.ignoraSegundoOrden ? "segundo orden despreciable" : "se suma el segundo orden" },
                  { etiqueta: "MEd", valor: `${fmt(resultado.r.momentos.mEdKNm, 2)} kN·m/m`, nota: `M2 ${fmt(resultado.r.momentos.m2KNm, 2)}` },
                  { etiqueta: "MRd", valor: `${fmt(resultado.r.resistencia.mRdKNm, 2)} kN·m/m`, nota: `con NEd ${fmt(resultado.n.nEd, 0)} kN/m` },
                  { etiqueta: "As vertical", valor: `${fmt(resultado.r.armado.asVerticalCm2)} cm²/m` },
                ]}
              />

              <Subgrupo titulo="Comprobaciones resistentes">
                <div>
                  <ResultadoCheck
                    etiqueta="Resistencia: (NEd, MEd) dentro del diagrama de interacción"
                    verifica={resultado.r.resistencia.verifica}
                    comparacion={{
                      real: { etiqueta: "MEd", valor: resultado.r.momentos.mEdKNm },
                      limite: { etiqueta: "MRd", valor: resultado.r.resistencia.mRdKNm },
                      unidad: "kN·m/m", exige: "≤", decimales: 1,
                    }}
                  />
                  <div className="mx-auto w-full max-w-xl pt-4">
                    <DiagramaInteraccionMuro
                      diagrama={resultado.r.resistencia.diagrama}
                      nEdKN={resultado.n.nEd}
                      mEdKNm={resultado.r.momentos.mEdKNm}
                      mRdKNm={resultado.r.resistencia.mRdKNm}
                      verifica={resultado.r.resistencia.verifica}
                    />
                  </div>
                  <p className="pt-2 text-sm text-muted-foreground">
                    {resultado.r.esbeltez.ignoraSegundoOrden
                      ? `λ = ${fmt(resultado.r.esbeltez.lambda, 1)} ≤ λlim = ${fmt(resultado.r.esbeltez.lambdaLimite, 1)}: el segundo orden se ignora.`
                      : `λ = ${fmt(resultado.r.esbeltez.lambda, 1)} > λlim = ${fmt(resultado.r.esbeltez.lambdaLimite, 1)}: MEd ya incluye el momento de segundo orden M2.`}
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo de la esbeltez y el segundo orden"
                    filas={[
                      { etiqueta: "Radio de giro i = h/√12", valor: `${fmt(resultado.r.esbeltez.radioGiroM * 100, 2)} cm` },
                      { etiqueta: "Longitud efectiva l₀ = β·l", valor: `${fmt(resultado.r.esbeltez.longitudEfectivaM, 2)} m` },
                      { etiqueta: "Axil reducido n", valor: fmt(resultado.r.esbeltez.axilReducido, 3) },
                      { etiqueta: "Cuantía mecánica ω", valor: fmt(resultado.r.esbeltez.cuantiaMecanica, 3) },
                      { etiqueta: "φ(∞,t0)  (Apéndice B)", valor: fmt(resultado.r.fluencia.basica, 3) },
                      { etiqueta: "φef = φ(∞,t0)·M0Eqp/M0Ed  (5.19)", valor: fmt(resultado.r.fluencia.eficaz, 3) },
                      { etiqueta: "A = 1/(1+0,2·φef)", valor: fmt(resultado.r.esbeltez.factorA, 3) },
                      { etiqueta: "B = √(1+2ω)", valor: fmt(resultado.r.esbeltez.factorB, 3) },
                      { etiqueta: "C = 1,7 − rm", valor: fmt(resultado.r.esbeltez.factorC, 3) },
                      { etiqueta: "λlim = 20·A·B·C/√n  (5.13)", valor: fmt(resultado.r.esbeltez.lambdaLimite, 1) },
                      { etiqueta: "e₀ = máx(h/30, 20 mm)", valor: `${fmt(resultado.r.momentos.excentricidadMinimaM * 1000, 0)} mm` },
                      { etiqueta: "M0e  (5.32)", valor: `${fmt(resultado.r.momentos.m0eKNm, 2)} kN·m/m` },
                      { etiqueta: "M0Ed adoptado", valor: `${fmt(resultado.r.momentos.m0EdKNm, 2)} kN·m/m` },
                      {
                        etiqueta: "e₂ = (1/r)·l₀²/10  (5.33)",
                        valor: resultado.r.esbeltez.ignoraSegundoOrden ? "no aplica" : `${fmt(resultado.r.momentos.e2M * 1000, 1)} mm`,
                      },
                      { etiqueta: "M2 = NEd·e₂", valor: `${fmt(resultado.r.momentos.m2KNm, 2)} kN·m/m` },
                      { etiqueta: "MEd = M0Ed + M2  (5.31)", valor: `${fmt(resultado.r.momentos.mEdKNm, 2)} kN·m/m` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas" detalle="art. 9.6">
                <div>
                  <ResultadoCheck
                    etiqueta="Es un muro (L ≥ 4·h, art. 9.6.1)"
                    verifica={resultado.r.clasificacion.esMuro}
                    comparacion={{
                      real: { etiqueta: "L/h", valor: resultado.r.clasificacion.relacionLongitudEspesor },
                      limite: { etiqueta: "mínimo", valor: 4 },
                      unidad: "", exige: "≥", decimales: 1,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía vertical mínima (0,002·Ac)"
                    verifica={resultado.r.armado.verificaVerticalMinima}
                    comparacion={{
                      real: { etiqueta: "As,v", valor: resultado.r.armado.asVerticalCm2 },
                      limite: { etiqueta: "mínima", valor: resultado.r.armado.asVerticalMinimaCm2 },
                      unidad: "cm²/m", exige: "≥",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía vertical máxima (0,04·Ac)"
                    verifica={resultado.r.armado.verificaVerticalMaxima}
                    comparacion={{
                      real: { etiqueta: "As,v", valor: resultado.r.armado.asVerticalCm2 },
                      limite: { etiqueta: "máxima", valor: resultado.r.armado.asVerticalMaximaCm2 },
                      unidad: "cm²/m", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía horizontal mínima (art. 9.6.3)"
                    verifica={resultado.r.armado.verificaHorizontalMinima}
                    comparacion={{
                      real: { etiqueta: "As,h", valor: resultado.r.armado.asHorizontalCm2 },
                      limite: { etiqueta: "mínima", valor: resultado.r.armado.asHorizontalMinimaCm2 },
                      unidad: "cm²/m", exige: "≥",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Separación de la armadura vertical"
                    verifica={resultado.r.armado.verificaSeparacionVertical}
                    detalle="El máximo es el menor entre 400 mm y 3h."
                    comparacion={{
                      real: { etiqueta: "sv", valor: resultado.n.sepV },
                      limite: { etiqueta: "máxima", valor: resultado.r.armado.separacionVerticalMaximaMm },
                      unidad: "mm", exige: "≤", decimales: 0,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Separación de la armadura horizontal"
                    verifica={resultado.r.armado.verificaSeparacionHorizontal}
                    comparacion={{
                      real: { etiqueta: "sh", valor: resultado.n.sepH },
                      limite: { etiqueta: "máxima", valor: 400 },
                      unidad: "mm", exige: "≤", decimales: 0,
                    }}
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
