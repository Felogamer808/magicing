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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Muros</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Muro portante: un elemento vertical que baja carga y que, por esbelto, puede pandear.
          No es el muro de contención. El Código Estructural le da artículo propio de armado
          —Anejo 19, art. 9.6— con cuantías y separaciones que no salen ni de las reglas de
          pilares ni de las de losas. Todo por metro de muro.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales y geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="espesor" etiqueta="Espesor h" sufijo="m" valor={espesor} onChange={setEspesor} />
              <CampoNumerico id="longitud" etiqueta="Longitud L" sufijo="m" valor={longitud} onChange={setLongitud} />
              <CampoNumerico id="altura" etiqueta="Altura libre" sufijo="m" valor={altura} onChange={setAltura} />
              <CampoNumerico id="rec" etiqueta="Rec. mecánico" sufijo="m" valor={rec} onChange={setRec} />
              <div className="col-span-2">
                <CampoSeleccion id="coaccion" etiqueta="Coacción en los extremos"
                                valor={coaccion} opciones={COACCIONES} onChange={setCoaccion} />
              </div>
              <div className="col-span-2">
                <PanelAyuda titulo="Qué define cada dato">
                  <p>
                    <strong className="text-foreground">Longitud L.</strong> Es la que decide si el
                    elemento es muro o pilar: con L menor que cuatro veces el espesor, el art. 9.6
                    no aplica y hay que ir a las reglas de pilares.
                  </p>
                  <p>
                    <strong className="text-foreground">Coacción.</strong> Fija la longitud
                    efectiva l₀ = β·l, que es la que entra en la esbeltez. Es el dato que más
                    mueve el resultado: pasar de biarticulado a ménsula duplica λ.
                  </p>
                  <p>
                    <strong className="text-foreground">Fluencia eficaz φef.</strong> Ablanda el
                    hormigón bajo carga sostenida. Entra en el factor A del límite de esbeltez y en
                    la curvatura de segundo orden. Ya no se carga a mano: φ(∞,t0) sale del Apéndice
                    B con el ambiente y la sección, y de ahí a φef por la ec. (5.19).
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Esfuerzos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="nEd" etiqueta="NEd" sufijo="kN/m" valor={nEd} onChange={setNEd} />
              <CampoNumerico
                id="relacionMqp"
                etiqueta="M0Eqp/M0Ed"
                valor={relacionMqp}
                onChange={setRelacionMqp}
                advertencia="Qué fracción del momento es cuasipermanente, ec. (5.19). Entre 0 y 1"
              />
              <CampoNumerico id="m01" etiqueta="M01" sufijo="kN·m/m" valor={m01} onChange={setM01} />
              <CampoNumerico id="m02" etiqueta="M02 (el mayor)" sufijo="kN·m/m" valor={m02} onChange={setM02} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluencia — art. 3.1.4 y Apéndice B</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="hr"
                etiqueta="Humedad relativa"
                sufijo="%"
                valor={hr}
                onChange={setHr}
                advertencia="Interior de edificio ≈50-70 %; a la intemperie ≈80 %"
              />
              <CampoNumerico
                id="t0"
                etiqueta="Edad de puesta en carga"
                sufijo="días"
                valor={t0}
                onChange={setT0}
              />
              <div className="col-span-2">
                <CampoSeleccion
                  id="cemento"
                  etiqueta="Clase de cemento"
                  valor={cementoTxt}
                  opciones={OPCIONES_CEMENTO}
                  onChange={setCementoTxt}
                />
              </div>
              <div className="col-span-2">
                <CampoSeleccion
                  id="exposicion"
                  etiqueta="Caras que secan"
                  valor={exposicionTxt}
                  opciones={OPCIONES_EXPOSICION}
                  onChange={setExposicionTxt}
                />
              </div>
              <div className="col-span-2 rounded-md border p-3 text-sm">
                <p className="font-medium">φ(∞,t0) = {fmt(phiBasica, 3)}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  h0 = {fmt(h0Mm, 0)} mm · φHR {fmt(fluencia.phiHR, 3)} · β(fcm){" "}
                  {fmt(fluencia.betaFcm, 3)} · β(t0) {fmt(fluencia.betaT0, 3)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Armadura</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoDiametro id="phiV" etiqueta="Ø vertical" valor={phiV} onChange={setPhiV} />
              <CampoNumerico id="sepV" etiqueta="Sep. vertical" sufijo="mm" valor={sepV} onChange={setSepV} />
              <CampoDiametro id="phiH" etiqueta="Ø horizontal" valor={phiH} onChange={setPhiH} />
              <CampoNumerico id="sepH" etiqueta="Sep. horizontal" sufijo="mm" valor={sepH} onChange={setSepH} />
              <p className="col-span-2 text-xs text-muted-foreground">
                Repartida en las dos caras, como pide el art. 9.6.3(1). Las áreas de abajo son la
                suma de ambas.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá materiales, geometría, esfuerzos y armadura con valores válidos. El
                recubrimiento tiene que dejar canto de los dos lados y |M01| no puede superar a |M02|.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Es un muro (L ≥ 4·h, art. 9.6.1)"
                    verifica={resultado.r.clasificacion.esMuro}
                    detalle={`L/h = ${fmt(resultado.r.clasificacion.relacionLongitudEspesor, 1)}`}
                  />
                  <ResultadoCheck
                    etiqueta="Resistencia (NEd, MEd) dentro del diagrama"
                    verifica={resultado.r.resistencia.verifica}
                    detalle={`MEd ${fmt(resultado.r.momentos.mEdKNm, 1)} / MRd ${fmt(resultado.r.resistencia.mRdKNm, 1)} kN·m/m · aprovechamiento ${fmt(resultado.r.resistencia.aprovechamiento * 100, 1)} %`}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía vertical mínima (0,002·Ac)"
                    verifica={resultado.r.armado.verificaVerticalMinima}
                    detalle={`As,v ${fmt(resultado.r.armado.asVerticalCm2)} / ${fmt(resultado.r.armado.asVerticalMinimaCm2)} cm²/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía vertical máxima (0,04·Ac)"
                    verifica={resultado.r.armado.verificaVerticalMaxima}
                    detalle={`As,v ${fmt(resultado.r.armado.asVerticalCm2)} / ${fmt(resultado.r.armado.asVerticalMaximaCm2)} cm²/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía horizontal mínima (art. 9.6.3)"
                    verifica={resultado.r.armado.verificaHorizontalMinima}
                    detalle={`As,h ${fmt(resultado.r.armado.asHorizontalCm2)} / ${fmt(resultado.r.armado.asHorizontalMinimaCm2)} cm²/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Separación vertical"
                    verifica={resultado.r.armado.verificaSeparacionVertical}
                    detalle={`${fmt(resultado.n.sepV, 0)} / máx ${fmt(resultado.r.armado.separacionVerticalMaximaMm, 0)} mm (mín. entre 400 y 3h)`}
                  />
                  <ResultadoCheck
                    etiqueta="Separación horizontal"
                    verifica={resultado.r.armado.verificaSeparacionHorizontal}
                    detalle={`${fmt(resultado.n.sepH, 0)} / máx 400 mm`}
                  />
                  {resultado.r.armado.requiereArmaduraTransversal && (
                    <p className="text-xs text-destructive">
                      La armadura vertical supera 0,02·Ac: el art. 9.6.4(1) pide armadura
                      transversal en forma de cercos, con las reglas de pilares. No está incluida
                      en esta verificación.
                    </p>
                  )}
                  {!resultado.r.clasificacion.esMuro && (
                    <p className="text-xs text-destructive">
                      Con L/h por debajo de 4 esto no es un muro a efectos del articulado: las
                      cuantías de arriba no corresponden y hay que verificarlo como pilar.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Esbeltez y segundo orden</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta={resultado.r.esbeltez.ignoraSegundoOrden
                      ? "λ ≤ λlim: el segundo orden se ignora"
                      : "λ > λlim: hay que sumar el segundo orden"}
                    verifica={resultado.r.esbeltez.ignoraSegundoOrden}
                    detalle={`λ = ${fmt(resultado.r.esbeltez.lambda, 1)} · λlim = ${fmt(resultado.r.esbeltez.lambdaLimite, 1)}`}
                  />
                  {resultado.r.fluencia.puedeIgnorarse && (
                    <p className="rounded-md border border-primary/40 p-3 text-xs text-muted-foreground">
                      Se cumplen las tres condiciones del art. 5.8.4(4) —φ(∞,t0) ={" "}
                      {fmt(resultado.r.fluencia.basica, 2)} ≤ 2, λ ={" "}
                      {fmt(resultado.r.esbeltez.lambda, 1)} ≤ 75 y M0Ed/NEd ={" "}
                      {fmt(resultado.r.momentos.m0EdKNm / resultado.n.nEd, 3)} m ≥ h—, así que el
                      articulado permite tomar φef = 0. No se aplica solo: hacerlo agranda λlim y
                      vuelve la comprobación menos exigente, así que la decisión queda de este lado.
                      Con φef = 0 el factor A pasa de {fmt(resultado.r.esbeltez.factorA, 3)} a 1,000.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Radio de giro i = h/√12", valor: `${fmt(resultado.r.esbeltez.radioGiroM * 100, 2)} cm` },
                      { etiqueta: "Longitud efectiva l₀ = β·l", valor: `${fmt(resultado.r.esbeltez.longitudEfectivaM, 2)} m` },
                      { etiqueta: "Axil reducido n", valor: fmt(resultado.r.esbeltez.axilReducido, 3) },
                      { etiqueta: "Cuantía mecánica ω", valor: fmt(resultado.r.esbeltez.cuantiaMecanica, 3) },
                      { etiqueta: "φ(∞,t0)  (Apéndice B)", valor: fmt(resultado.r.fluencia.basica, 3) },
                      {
                        etiqueta: "φef = φ(∞,t0)·M0Eqp/M0Ed  (5.19)",
                        valor: fmt(resultado.r.fluencia.eficaz, 3),
                      },
                      { etiqueta: "A = 1/(1+0,2·φef)", valor: fmt(resultado.r.esbeltez.factorA, 3) },
                      { etiqueta: "B = √(1+2ω)", valor: fmt(resultado.r.esbeltez.factorB, 3) },
                      { etiqueta: "C = 1,7 − rm", valor: fmt(resultado.r.esbeltez.factorC, 3) },
                      { etiqueta: "λlim = 20·A·B·C/√n  (5.13)", valor: fmt(resultado.r.esbeltez.lambdaLimite, 1) },
                      { etiqueta: "e₀ = máx(h/30, 20 mm)", valor: `${fmt(resultado.r.momentos.excentricidadMinimaM * 1000, 0)} mm` },
                      { etiqueta: "M0e  (5.32)", valor: `${fmt(resultado.r.momentos.m0eKNm, 2)} kN·m/m` },
                      { etiqueta: "M0Ed adoptado", valor: `${fmt(resultado.r.momentos.m0EdKNm, 2)} kN·m/m` },
                      {
                        etiqueta: "e₂ = (1/r)·l₀²/10  (5.33)",
                        valor: resultado.r.esbeltez.ignoraSegundoOrden
                          ? "no aplica"
                          : `${fmt(resultado.r.momentos.e2M * 1000, 1)} mm`,
                      },
                      { etiqueta: "M2 = NEd·e₂", valor: `${fmt(resultado.r.momentos.m2KNm, 2)} kN·m/m` },
                      { etiqueta: "MEd = M0Ed + M2  (5.31)", valor: `${fmt(resultado.r.momentos.mEdKNm, 2)} kN·m/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Diagrama de interacción</CardTitle></CardHeader>
                <CardContent>
                  <DiagramaInteraccionMuro
                    diagrama={resultado.r.resistencia.diagrama}
                    nEdKN={resultado.n.nEd}
                    mEdKNm={resultado.r.momentos.mEdKNm}
                    mRdKNm={resultado.r.resistencia.mRdKNm}
                    verifica={resultado.r.resistencia.verifica}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
