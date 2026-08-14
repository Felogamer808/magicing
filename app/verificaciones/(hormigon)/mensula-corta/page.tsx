"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SeccionPlegable } from "@/components/verificaciones/comun/SeccionPlegable";
import { DiagramaMensulaArmado } from "@/components/verificaciones/hormigon/DiagramaMensulaArmado";
import { DiagramaMensulaModelo } from "@/components/verificaciones/hormigon/DiagramaMensulaModelo";
import { DiagramaMensulaPlanta } from "@/components/verificaciones/hormigon/DiagramaMensulaPlanta";
import { useCampo } from "@/lib/hooks/useCampo";
import {
  calcularMensulaCorta,
  type ResultadoMensulaCorta,
} from "@/lib/calc/ec2/mensula-corta";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "mensula-corta")!;

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
  const [modoH, setModoH] = useCampo("modoH", "H = 0,15·F automático");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [phiP, setPhiP] = useCampo("phiP", "20");
  const [phiE, setPhiE] = useCampo("phiE", "10");
  const [adherencia, setAdherencia] = useCampo("adherencia", "Buena");
  const [soldada, setSoldada] = useCampo("soldada", "No");

  const hAutomatico = modoH.startsWith("H = 0,15");

  const resultado = useMemo(() => {
    const g = {
      acM: aNumero(ac),
      hcM: aNumero(hc),
      h1M: aNumero(h1),
      bM: aNumero(b),
      hcolM: aNumero(hcol),
      apM: aNumero(ap),
      bpM: aNumero(bp),
      recubrimientoM: aNumero(rec),
    };
    const fEdKN = aNumero(fEd);
    const hEdKN = hAutomatico ? 0.15 * fEdKN : aNumero(hEd);
    const fckMPa = aNumero(fck);
    const fykMPa = aNumero(fyk);

    const numeros = [...Object.values(g), fEdKN, hEdKN, fckMPa, fykMPa];
    if (numeros.some((n) => !Number.isFinite(n))) return null;
    // Sin canto no hay canto útil, y sin ancho de placa el nudo divide por cero.
    if (g.hcM <= 0 || g.bM <= 0 || g.acM <= 0 || g.apM <= 0 || g.bpM <= 0) return null;
    if (g.hcolM <= 0 || g.h1M <= 0 || fckMPa <= 0 || fykMPa <= 0 || fEdKN <= 0) return null;

    const materiales = derivarMateriales({ fck: fckMPa, fyk: fykMPa });
    const r = calcularMensulaCorta(materiales, g, {
      fEdKN,
      hEdKN,
      diametroPrincipalMm: Number(phiP),
      diametroCercoMm: Number(phiE),
      condicionAdherencia: adherencia === "Buena" ? "buena" : "mala",
      barraTransversalSoldada: soldada === "Sí",
    });
    // El canto útil puede salir negativo si el recubrimiento se come la pieza.
    if (r.modelo.dM <= 0) return null;
    return { r, geometria: g, fEdKN, hEdKN };
  }, [
    ac, hc, h1, b, hcol, ap, bp, rec,
    fEd, hEd, hAutomatico, fck, fyk,
    phiP, phiE, adherencia, soldada,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · Ménsulas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones
          normas={meta.normasDisponibles}
          norma={norma}
          onNormaChange={setNorma}
        />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          La ménsula corta es una región D: la carga entra concentrada a pocos centímetros de la
          cara del pilar y no hay longitud para que las deformaciones se linealicen, así que no
          vale Bernoulli y las fórmulas de flexión y cortante quedan fuera de su campo de
          aplicación. Se resuelve con un modelo de bielas y tirantes, y el tirante se calcula por
          los dos métodos que la norma y la Instrucción española dan por separado, que no
          coinciden: se arma por el más desfavorable.
        </CardContent>
      </Card>

      {/*
        Datos a la izquierda y dibujos a la derecha, igual que en las
        herramientas de análisis: se cambia una dimensión y el esquema responde
        sin scrollear. Debajo de xl se apila en el orden en que se usa.
      */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="ac"
                etiqueta="a꜀ — eje de carga a cara del pilar"
                sufijo="m"
                valor={ac}
                onChange={setAc}
              />
              <CampoNumerico
                id="hc"
                etiqueta="h꜀ — canto en el arranque"
                sufijo="m"
                valor={hc}
                onChange={setHc}
              />
              <CampoNumerico
                id="h1"
                etiqueta="h₁ — canto en el borde"
                sufijo="m"
                valor={h1}
                onChange={setH1}
              />
              <CampoNumerico
                id="b"
                etiqueta="b — ancho de la ménsula"
                sufijo="m"
                valor={b}
                onChange={setB}
              />
              <CampoNumerico
                id="hcol"
                etiqueta="Canto del pilar"
                sufijo="m"
                valor={hcol}
                onChange={setHcol}
              />
              <CampoNumerico
                id="rec"
                etiqueta="Recubrimiento nominal"
                sufijo="m"
                valor={rec}
                onChange={setRec}
              />
              <CampoNumerico
                id="ap"
                etiqueta="a_p — placa, según el vuelo"
                sufijo="m"
                valor={ap}
                onChange={setAp}
              />
              <CampoNumerico
                id="bp"
                etiqueta="b_p — placa, según el ancho"
                sufijo="m"
                valor={bp}
                onChange={setBp}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cargas de cálculo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="fEd"
                etiqueta="F_Ed — vertical"
                sufijo="kN"
                valor={fEd}
                onChange={setFEd}
              />
              <CampoNumerico
                id="hEd"
                etiqueta="H_Ed — horizontal"
                sufijo="kN"
                valor={hAutomatico ? fmt(0.15 * aNumero(fEd), 1) : hEd}
                onChange={setHEd}
                advertencia={
                  hAutomatico ? "Calculado como 0,15·F_Ed; pasá a manual para editarlo." : undefined
                }
              />
              <div className="col-span-2">
                <CampoSeleccion
                  id="modoH"
                  etiqueta="Acción horizontal"
                  valor={modoH}
                  opciones={["H = 0,15·F automático", "H manual"]}
                  onChange={setModoH}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiales y armaduras</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="fck"
                etiqueta="f_ck"
                sufijo="MPa"
                valor={fck}
                onChange={setFck}
              />
              <CampoNumerico
                id="fyk"
                etiqueta="f_yk"
                sufijo="MPa"
                valor={fyk}
                onChange={setFyk}
              />
              <CampoSeleccion
                id="phiP"
                etiqueta="ø del marco principal"
                valor={phiP}
                opciones={DIAMETROS_PRINCIPAL.map(String)}
                onChange={setPhiP}
              />
              <CampoSeleccion
                id="phiE"
                etiqueta="ø de los cercos"
                valor={phiE}
                opciones={DIAMETROS_CERCO.map(String)}
                onChange={setPhiE}
              />
              <CampoSeleccion
                id="adherencia"
                etiqueta="Condición de adherencia"
                valor={adherencia}
                opciones={["Buena", "Mala"]}
                onChange={setAdherencia}
              />
              <CampoSeleccion
                id="soldada"
                etiqueta="Barra transversal soldada"
                valor={soldada}
                opciones={["No", "Sí"]}
                onChange={setSoldada}
              />
              <p className="col-span-2 text-xs text-muted-foreground">
                γ꜀ = 1,50 y γ_s = 1,15 (art. 2.4.2.4, tabla A19.2.1), situación persistente o
                transitoria. En ménsulas cortas f_yd se topa además en 400 MPa.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <Card className="drafting-marks">
                <CardHeader>
                  <CardTitle className="text-base">Modelo de bielas y tirantes</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
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
                    traccionTiranteKN={Math.max(
                      resultado.r.tirante.ftdAnejoKN,
                      resultado.r.tirante.ftdInstruccionKN
                    )}
                    compresionBielaKN={resultado.r.hormigon.compresionBielaKN}
                    esMensulaCorta={resultado.r.modelo.esMensulaCorta}
                    tanEnRango={resultado.r.modelo.tanEnRango}
                  />
                </CardContent>
              </Card>

              <Card className="drafting-marks">
                <CardHeader>
                  <CardTitle className="text-base">Armado — alzado</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <DiagramaMensulaArmado
                    hcM={resultado.geometria.hcM}
                    h1M={resultado.geometria.h1M}
                    hcolM={resultado.geometria.hcolM}
                    vueloTotalM={resultado.r.despiece.vueloTotalM}
                    marco={resultado.r.despiece.marco}
                    cercos={resultado.r.despiece.cercos}
                    numeroBarras={resultado.r.tirante.numeroBarras}
                    diametroPrincipalMm={Number(phiP)}
                    diametroCercoMm={Number(phiE)}
                    numeroCercos={resultado.r.cercos.numeroCercos}
                    numeroCercosHorizontales={
                      resultado.r.cercos.horizontales?.numeroCercos ?? 0
                    }
                    caso={resultado.r.cercos.caso}
                    lbdMensulaMm={resultado.r.anclaje.lbdMensulaMm}
                    disponibleMensulaMm={resultado.r.anclaje.disponibleMensulaMm}
                    lbdPilarMm={resultado.r.anclaje.lbdPilarMm}
                    pataPilarMm={resultado.r.anclaje.pataPilarMm}
                  />
                </CardContent>
              </Card>

              <Card className="drafting-marks">
                <CardHeader>
                  <CardTitle className="text-base">Armado — planta</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <DiagramaMensulaPlanta
                    hcolM={resultado.geometria.hcolM}
                    vueloTotalM={resultado.r.despiece.vueloTotalM}
                    bM={resultado.geometria.bM}
                    acM={resultado.geometria.acM}
                    apM={resultado.geometria.apM}
                    bpM={resultado.geometria.bpM}
                    recubrimientoM={resultado.geometria.recubrimientoM}
                    cercos={resultado.r.despiece.cercos}
                    numeroBarras={resultado.r.tirante.numeroBarras}
                    diametroPrincipalMm={Number(phiP)}
                    diametroCercoMm={Number(phiE)}
                    anchoCercoM={resultado.geometria.bM - 2 * resultado.geometria.recubrimientoM}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Es la única vista donde los cercos se leen como lazos cerrados: en alzado se
                    superponen y parecen una sola línea. Sólo se dibuja la familia horizontal —los
                    verticales están en el plano del alzado y en el despiece.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá la geometría y las cargas para ver el modelo.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {resultado && (
        <Resultados r={resultado.r} phiP={Number(phiP)} phiE={Number(phiE)} />
      )}
    </main>
  );
}

interface ResultadosProps {
  r: ResultadoMensulaCorta;
  phiP: number;
  phiE: number;
}

function Resultados({ r, phiP, phiE }: ResultadosProps) {
  const cercoCm2 = r.cercos.asRealCm2 / r.cercos.numeroCercos;

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ResultadoCheck
          etiqueta="Nudo bajo la placa"
          verifica={r.hormigon.nudo.verifica}
          detalle="Ec. (6.61), nudo comprimido con tirante anclado, k₂ = 0,85. El ancho que resiste es el de la placa, no el de la ménsula."
          comparacion={{
            real: { etiqueta: "σ", valor: r.hormigon.nudo.sigmaMPa },
            limite: { etiqueta: "k₂·ν′·f_cd", valor: r.hormigon.nudo.sigmaMaxMPa },
            unidad: "MPa",
            exige: "≤",
          }}
        />
        <ResultadoCheck
          etiqueta="Biela comprimida"
          verifica={r.hormigon.biela.verifica}
          detalle="Ec. (6.56): la biela lleva la tracción transversal que toma el tirante, así que su tope es el reducido, 0,6·ν′·f_cd."
          comparacion={{
            real: { etiqueta: "σ", valor: r.hormigon.biela.sigmaMPa },
            limite: { etiqueta: "0,6·ν′·f_cd", valor: r.hormigon.biela.sigmaMaxMPa },
            unidad: "MPa",
            exige: "≤",
          }}
        />
        <ResultadoCheck
          etiqueta="Tensión tangencial"
          verifica={r.hormigon.tangencial.verifica}
          detalle="Montoya §24.8.2.e, pág. 394: τ_d ≤ 0,25·f_cd y en ningún caso más de 5 MPa."
          comparacion={{
            real: { etiqueta: "τ_d", valor: r.hormigon.tangencial.sigmaMPa },
            limite: { etiqueta: "τ_lím", valor: r.hormigon.tangencial.sigmaMaxMPa },
            unidad: "MPa",
            exige: "≤",
          }}
        />
        <ResultadoCheck
          etiqueta="Canto útil en el borde (degollamiento)"
          verifica={r.hormigon.verificaD0}
          detalle="Montoya §24.8.1, pág. 393: con d₀ < d/2 puede abrirse una fisura oblicua entre el punto de aplicación de la carga y la cara inclinada. El fallo es repentino."
          comparacion={{
            real: { etiqueta: "d₀", valor: r.hormigon.d0M },
            limite: { etiqueta: "d/2", valor: r.hormigon.d0MinM },
            unidad: "m",
            exige: "≥",
            decimales: 3,
          }}
        />
        <ResultadoCheck
          etiqueta="Armadura principal del tirante"
          verifica={r.tirante.verificaAs}
          detalle={`${r.tirante.numeroBarras}ø${phiP}. Gobierna ${
            r.tirante.mandaCuantiaMinima
              ? "una cuantía mínima"
              : r.tirante.mandaInstruccion
                ? "la Instrucción española (§24.8.3.b)"
                : "el Anejo 19 (§J.3)"
          }.`}
          comparacion={{
            real: { etiqueta: "A_s real", valor: r.tirante.asRealCm2 },
            limite: { etiqueta: "A_s nec", valor: r.tirante.asNecCm2 },
            unidad: "cm²",
            exige: "≥",
          }}
        />
        <ResultadoCheck
          etiqueta="Cuantía mecánica mínima"
          verifica={r.tirante.asRealCm2 >= r.tirante.asMecanicaAciCm2}
          detalle="Montoya §24.8.2.c: 0,04·b·d·f_cd/f_yd, del ACI. «Más bien severa, no figura en la Instrucción española y es determinante en muchos casos.»"
          comparacion={{
            real: { etiqueta: "A_s real", valor: r.tirante.asRealCm2 },
            limite: { etiqueta: "A_s,mec", valor: r.tirante.asMecanicaAciCm2 },
            unidad: "cm²",
            exige: "≥",
          }}
        />
        <ResultadoCheck
          etiqueta={`Cercos ${r.cercos.caso}`}
          verifica={r.cercos.verificaAs}
          detalle={`${r.cercos.numeroCercos} cercos cerrados ø${phiE} de ${fmt(
            cercoCm2
          )} cm² cada uno (dos ramas). El área pedía ${r.cercos.numeroPorArea}; el resto sale del mínimo de 3 y de la separación de 150 mm.`}
          comparacion={{
            real: { etiqueta: "A_s real", valor: r.cercos.asRealCm2 },
            limite: { etiqueta: "A_s nec", valor: r.cercos.asNecCm2 },
            unidad: "cm²",
            exige: "≥",
          }}
        />
        {r.cercos.horizontales && (
          <ResultadoCheck
            etiqueta="Cercos horizontales A₂"
            verifica={r.cercos.horizontales.verificaAs}
            detalle="Montoya §24.8.3.c: 0,2·F_vd en los 2/3 superiores de d. Van además de los verticales, no en su lugar."
            comparacion={{
              real: { etiqueta: "A_s real", valor: r.cercos.horizontales.asRealCm2 },
              limite: { etiqueta: "A_s nec", valor: r.cercos.horizontales.asNecCm2 },
              unidad: "cm²",
              exige: "≥",
            }}
          />
        )}
        <ResultadoCheck
          etiqueta="Anclaje en la ménsula"
          verifica={r.anclaje.verificaMensula}
          detalle="Art. 8.4.3(3): se mide a lo largo del eje de la barra, así que la bajada por el borde y el retorno por el intradós cuentan."
          comparacion={{
            real: { etiqueta: "l_bd", valor: r.anclaje.lbdMensulaMm },
            limite: { etiqueta: "disponible", valor: r.anclaje.disponibleMensulaMm },
            unidad: "mm",
            exige: "≤",
            decimales: 0,
          }}
        />
        <ResultadoCheck
          etiqueta="Anclaje en el pilar"
          verifica={r.anclaje.verificaPilar}
          detalle={`La pata no se comprueba, se dimensiona: ${fmt(
            r.anclaje.pataPilarMm,
            0
          )} mm, nunca menos de 15ø.`}
          comparacion={{
            real: { etiqueta: "l_bd", valor: r.anclaje.lbdPilarMm },
            limite: { etiqueta: "disponible", valor: r.anclaje.disponiblePilarMm },
            unidad: "mm",
            exige: "≤",
            decimales: 0,
          }}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PanelFormulas
          titulo="Modelo y tirante"
          filas={[
            {
              etiqueta: "Canto útil",
              valor: `${fmt(r.modelo.dM, 3)} m`,
              formula: "d = h꜀ − c − ø_cerco − ø/2",
            },
            {
              etiqueta: "Brazo mecánico",
              valor: `${fmt(r.modelo.zM, 3)} m`,
              formula: "z = 0,8·d",
            },
            {
              etiqueta: "Ángulo de la biela",
              valor: `${fmt(r.modelo.thetaGrados, 1)}°`,
              formula: "tg θ = z/a꜀",
              sustitucion: `tg θ = ${fmt(r.modelo.tanTheta)} — el §J.3(1) pide entre 1,0 y 2,5`,
            },
            {
              etiqueta: "Tirante — Anejo 19 §J.3",
              valor: `${fmt(r.tirante.ftdAnejoKN, 1)} kN`,
              formula: "F_td = F_Ed·a꜀/z + H_Ed",
              sustitucion: `A_s = ${fmt(r.tirante.asAnejoCm2)} cm²`,
            },
            {
              etiqueta: "Tirante — Instrucción, §24.8.3.b",
              valor: `${fmt(r.tirante.ftdInstruccionKN, 1)} kN`,
              formula: "F_td = F_Ed·tg θ + H_Ed, con cotg θ = μ = 1,4",
              sustitucion: `A_s = ${fmt(
                r.tirante.asInstruccionCm2
              )} cm² — no depende del vuelo`,
            },
            {
              etiqueta: "Cuantía mínima",
              valor: `${fmt(r.tirante.asMinimaCm2)} cm²`,
              formula: "máx(0,26·f_ctm/f_yk·b·d ; 0,0013·b·d) — art. 9.2.1.1",
            },
            {
              etiqueta: "Cuantía mecánica mínima",
              valor: `${fmt(r.tirante.asMecanicaAciCm2)} cm²`,
              formula: "0,04·b·d·f_cd/f_yd — Montoya §24.8.2.c",
            },
            {
              etiqueta: "Armadura adoptada",
              valor: `${r.tirante.numeroBarras}ø${phiP} = ${fmt(r.tirante.asRealCm2)} cm²`,
              sustitucion: `Necesaria ${fmt(r.tirante.asNecCm2)} cm² — aprovechamiento ${fmt(
                r.tirante.aprovechamiento * 100,
                0
              )} %`,
            },
          ]}
        />

        <PanelFormulas
          titulo="Materiales y anclaje"
          filas={[
            {
              etiqueta: "f_cd",
              valor: `${fmt(r.materiales.fcdMPa)} MPa`,
              formula: "f_ck/γ꜀",
            },
            {
              etiqueta: "f_yd de cálculo",
              valor: `${fmt(r.materiales.fydMPa)} MPa`,
              formula: "mín(f_yk/γ_s ; 400 MPa)",
              sustitucion: r.materiales.topeFydAplicado
                ? `Sin el tope daría ${fmt(
                    r.materiales.fydCalculadoMPa
                  )} MPa: el tope encarece la armadura un ${fmt(
                    r.materiales.sobrecostoPorTope * 100,
                    1
                  )} %`
                : "El tope de 400 MPa no muerde con este acero",
            },
            {
              etiqueta: "ν′",
              valor: fmt(r.materiales.nuPrima, 3),
              formula: "1 − f_ck/250",
            },
            {
              etiqueta: "f_ctm",
              valor: `${fmt(r.materiales.fctmMPa)} MPa`,
              formula: "tabla A19.3.1",
            },
            {
              etiqueta: "f_bd",
              valor: `${fmt(r.anclaje.fbdMPa)} MPa`,
              formula: "2,25·η₁·η₂·f_ctd — ec. (8.2)",
              sustitucion: `η₁ = ${fmt(r.anclaje.eta1, 1)} · η₂ = ${fmt(
                r.anclaje.eta2,
                2
              )} · f_ctd = ${fmt(r.anclaje.fctdMPa)} MPa`,
            },
            {
              etiqueta: "l_b,rqd",
              valor: `${fmt(r.anclaje.lbRqdMm, 0)} mm`,
              formula: "(ø/4)·(σ_sd/f_bd) — ec. (8.3)",
              sustitucion: `σ_sd = ${fmt(
                r.anclaje.sigmaSdMPa
              )} MPa, con el acero realmente puesto`,
            },
            {
              etiqueta: "l_bd en la ménsula",
              valor: `${fmt(r.anclaje.lbdMensulaMm, 0)} mm`,
              formula: "α₁·α₂·α₃·α₄·α₅·l_b,rqd ≥ l_b,mín — ec. (8.4)",
              sustitucion: `α₁ = ${fmt(r.anclaje.alfa1, 2)} · α₂ = ${fmt(
                r.anclaje.alfa2,
                2
              )} · α₄ = ${fmt(r.anclaje.alfa4, 2)} · α₅ = ${fmt(
                r.anclaje.alfa5,
                2
              )} (presión de ${fmt(r.anclaje.presionTransversalMPa)} MPa bajo la placa)`,
            },
            {
              etiqueta: "l_bd en el pilar",
              valor: `${fmt(r.anclaje.lbdPilarMm, 0)} mm`,
              sustitucion: `Sin α₅: del lado del pilar no hay presión transversal. l_b,mín = ${fmt(
                r.anclaje.lbMinMm,
                0
              )} mm`,
            },
          ]}
        />
      </div>

      <SeccionPlegable
        titulo="Despiece"
        resumen={`${r.tirante.numeroBarras}ø${phiP} de ${fmt(
          r.despiece.desarrolloBarraM
        )} m · ${r.despiece.cercos.length} cercos ø${phiE}`}
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
                    ? `H · y = ${fmt(c.y1M * 1000, 0)} mm · luz ${fmt(
                        c.luzM * 1000,
                        0
                      )} mm · desarrollo ${fmt(c.desarrolloM * 1000, 0)} mm${
                        c.abrazaLaPata ? " · abraza la pata del marco" : ""
                      }`
                    : `V · x = ${fmt(c.x1M * 1000, 0)} mm · luz ${fmt(
                        c.luzM * 1000,
                        0
                      )} mm · desarrollo ${fmt(c.desarrolloM * 1000, 0)} mm`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SeccionPlegable>

      <PanelAyuda titulo="Qué mirar antes de usar este resultado">
        <p>
          <strong>El tirante sale distinto por cada fuente y no es un error de redondeo.</strong> El
          Anejo 19 lo saca de la geometría del modelo y crece con el vuelo; la Instrucción
          española fija la cotangente de la biela en el coeficiente de rozamiento —1,4 si la
          ménsula se hormigona monolítica con el pilar— y da un valor independiente de a꜀. cotg
          1,4 equivale a tg θ = 0,71, fuera del rango 1,0–2,5 que pide el propio §J.3(1): son
          métodos distintos, no el mismo con otro número. Se arma por el mayor de los dos.
        </p>
        <p>
          <strong>f_yd está topado en 400 MPa</strong> y no sale de γ_s: es un tope del elemento,
          que Montoya repite en las cuatro fórmulas del capítulo (§24.8.2.d y §24.8.3.b, c y e,
          págs. 394-395). Con B500S el cálculo daría 435 MPa, así que el tope pesa un 9 % sobre
          toda la armadura de la ménsula, principal y cercos.
        </p>
        <p>
          <strong>Los cercos verticales solos son inoperantes.</strong> Montoya lo dice con esas
          palabras en §24.8.1, pág. 393: es un «error grave que se comete con alguna frecuencia».
          Cuando el vuelo obliga a verticales, el articulado los cuantifica pero su propia fig.
          A19.J.6(b) dibuja además horizontales sin ponerles número; los cuantifica §24.8.3.c en
          los 2/3 superiores de d. Van las dos familias.
        </p>
        <p>
          <strong>El marco es un lazo cerrado, no una barra con patilla.</strong> Fig. A19.J.6,
          letra A: «dispositivos de anclaje o lazos». El anclaje se mide sobre el eje de la barra
          (art. 8.4.3(3)), así que la bajada por el borde y el retorno por el intradós son los que
          dan la longitud disponible del lado de la ménsula. Cortar el marco al llegar al borde
          deja la barra sin anclar justo donde está más traccionada.
        </p>
        <p>
          <strong>Esta herramienta no calcula V_Rd,c.</strong> El modelo de bielas y tirantes cubre
          el mecanismo de la ménsula, no la comprobación de cortante de la sección de arranque
          contra el pilar. Si la ménsula está en el arranque de un pilar muy solicitado, esa
          comprobación va aparte.
        </p>
        <p>
          Los coeficientes γ꜀ = 1,50 y γ_s = 1,15 son los de situación persistente o transitoria
          (tabla A19.2.1). En situación accidental cambian y este motor todavía no los contempla.
          Las cargas F_Ed y H_Ed entran <strong>ya mayoradas</strong>.
        </p>
      </PanelAyuda>
    </div>
  );
}
