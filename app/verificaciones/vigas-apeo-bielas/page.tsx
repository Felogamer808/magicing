"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { DiagramaVigaApeoModelo } from "@/components/verificaciones/hormigon/DiagramaVigaApeoModelo";
import { DiagramaVigaApeoArmado } from "@/components/verificaciones/hormigon/DiagramaVigaApeoArmado";
import { calcularVigaApeoBielas, type TransmisionCarga } from "@/lib/calc/ec2/viga-apeo-bielas";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-apeo-bielas")!;

const TRANSMISIONES = [
  "Directa (carga sobre la cara superior)",
  "Indirecta (pilar arranca del alma)",
  "Colgada (carga entrando por la cara inferior)",
] as const;

const TIPO_POR_ETIQUETA: Record<string, TransmisionCarga> = {
  [TRANSMISIONES[0]]: "directa",
  [TRANSMISIONES[1]]: "indirecta",
  [TRANSMISIONES[2]]: "colgada",
};

export default function VigaApeoBielasPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [rg, setRg] = useCampo("rg", "0.05");

  const [luz, setLuz] = useCampo("luz", "5");
  const [h, setH] = useCampo("h", "2");
  const [b, setB] = useCampo("b", "0.5");
  const [posCarga, setPosCarga] = useCampo("posCarga", "2.5");
  const [anchoPilar, setAnchoPilar] = useCampo("anchoPilar", "0.4");
  const [anchoApoyoIzq, setAnchoApoyoIzq] = useCampo("anchoApoyoIzq", "0.4");
  const [anchoApoyoDer, setAnchoApoyoDer] = useCampo("anchoApoyoDer", "0.4");
  const [voladizoIzq, setVoladizoIzq] = useCampo("voladizoIzq", "0.3");
  const [voladizoDer, setVoladizoDer] = useCampo("voladizoDer", "0.3");

  const [nd, setNd] = useCampo("nd", "2000");
  const [qd, setQd] = useCampo("qd", "30");
  const [transmision, setTransmision] = useCampo("transmision", TRANSMISIONES[0]);

  const [nTirante, setNTirante] = useCampo("nTirante", "8");
  const [phiTirante, setPhiTirante] = useCampo("phiTirante", "25");
  const [phiEstribo, setPhiEstribo] = useCampo("phiEstribo", "12");

  const [phiMallaH, setPhiMallaH] = useCampo("phiMallaH", "12");
  const [sepMallaH, setSepMallaH] = useCampo("sepMallaH", "0.2");
  const [phiMallaV, setPhiMallaV] = useCampo("phiMallaV", "12");
  const [sepMallaV, setSepMallaV] = useCampo("sepMallaV", "0.2");

  const [phiCuelgue, setPhiCuelgue] = useCampo("phiCuelgue", "12");
  const [sepCuelgue, setSepCuelgue] = useCampo("sepCuelgue", "0.1");
  const [ramasCuelgue, setRamasCuelgue] = useCampo("ramasCuelgue", "4");
  const [cantoColgado, setCantoColgado] = useCampo("cantoColgado", "0.6");

  const tipo = TIPO_POR_ETIQUETA[transmision] ?? "directa";

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk), rg: aNumero(rg),
      luz: aNumero(luz), h: aNumero(h), b: aNumero(b), posCarga: aNumero(posCarga),
      anchoPilar: aNumero(anchoPilar),
      anchoApoyoIzq: aNumero(anchoApoyoIzq), anchoApoyoDer: aNumero(anchoApoyoDer),
      voladizoIzq: aNumero(voladizoIzq), voladizoDer: aNumero(voladizoDer),
      nd: aNumero(nd), qd: aNumero(qd),
      nTirante: aNumero(nTirante), phiTirante: aNumero(phiTirante), phiEstribo: aNumero(phiEstribo),
      phiMallaH: aNumero(phiMallaH), sepMallaH: aNumero(sepMallaH),
      phiMallaV: aNumero(phiMallaV), sepMallaV: aNumero(sepMallaV),
      phiCuelgue: aNumero(phiCuelgue), sepCuelgue: aNumero(sepCuelgue),
      ramasCuelgue: aNumero(ramasCuelgue), cantoColgado: aNumero(cantoColgado),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if ([n.fck, n.fyk, n.luz, n.h, n.b, n.anchoPilar, n.anchoApoyoIzq, n.anchoApoyoDer, n.nd].some((x) => x <= 0)) return null;
    if ([n.nTirante, n.phiTirante, n.phiEstribo, n.phiMallaH, n.sepMallaH, n.phiMallaV, n.sepMallaV].some((x) => x <= 0)) return null;
    if (n.nTirante < 2) return null;
    // El pilar tiene que caer dentro de la luz, con su ancho completo apoyado.
    if (n.posCarga <= n.anchoPilar / 2 || n.posCarga >= n.luz - n.anchoPilar / 2) return null;
    // El canto útil tiene que quedar positivo.
    if (n.rg + n.phiEstribo / 1000 + n.phiTirante / 2000 >= n.h) return null;
    if (tipo !== "directa" && [n.phiCuelgue, n.sepCuelgue, n.ramasCuelgue].some((x) => x <= 0)) return null;

    const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
    const r = calcularVigaApeoBielas(
      materiales,
      {
        luzM: n.luz, hM: n.h, bM: n.b, recubrimientoM: n.rg,
        posicionCargaM: n.posCarga, anchoPilarApeadoM: n.anchoPilar,
        anchoApoyoIzqM: n.anchoApoyoIzq, anchoApoyoDerM: n.anchoApoyoDer,
        voladizoIzqM: n.voladizoIzq, voladizoDerM: n.voladizoDer,
      },
      {
        ndPilarKN: n.nd,
        qdKNPorM: n.qd,
        transmision: tipo,
        tirante: { numero: n.nTirante, diametroMm: n.phiTirante },
        diametroEstriboMm: n.phiEstribo,
        mallaHorizontal: { diametroMm: n.phiMallaH, separacionM: n.sepMallaH },
        mallaVertical: { diametroMm: n.phiMallaV, separacionM: n.sepMallaV },
        cuelgue:
          tipo === "directa"
            ? undefined
            : {
                diametroMm: n.phiCuelgue,
                separacionM: n.sepCuelgue,
                numeroRamas: n.ramasCuelgue,
                cantoElementoColgadoM: n.cantoColgado,
              },
      }
    );
    return { n, r, materiales };
  }, [
    fck, fyk, rg, luz, h, b, posCarga, anchoPilar, anchoApoyoIzq, anchoApoyoDer,
    voladizoIzq, voladizoDer, nd, qd, tipo, nTirante, phiTirante, phiEstribo,
    phiMallaH, sepMallaH, phiMallaV, sepMallaV, phiCuelgue, sepCuelgue,
    ramasCuelgue, cantoColgado,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Vigas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {resultado && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="drafting-marks">
            <CardHeader><CardTitle className="text-base">Geometría y modelo</CardTitle></CardHeader>
            <CardContent className="py-2">
              <DiagramaVigaApeoModelo
                luzM={resultado.n.luz}
                hM={resultado.n.h}
                dM={resultado.r.modelo.dM}
                zM={resultado.r.modelo.zAdoptadoM}
                posicionCargaM={resultado.n.posCarga}
                anchoPilarApeadoM={resultado.n.anchoPilar}
                anchoApoyoIzqM={resultado.n.anchoApoyoIzq}
                anchoApoyoDerM={resultado.n.anchoApoyoDer}
                aIzqM={resultado.r.modelo.aIzqM}
                aDerM={resultado.r.modelo.aDerM}
                aIzqSobreD={resultado.r.region.aIzqSobreD}
                aDerSobreD={resultado.r.region.aDerSobreD}
                esRegionD={resultado.r.region.esRegionD}
                anguloIzqGrados={resultado.r.modelo.anguloBielaIzqGrados}
                anguloDerGrados={resultado.r.modelo.anguloBielaDerGrados}
                ndPilarKN={resultado.n.nd}
                reaccionIzqKN={resultado.r.modelo.reaccionIzqKN}
                reaccionDerKN={resultado.r.modelo.reaccionDerKN}
                traccionTiranteKN={resultado.r.modelo.traccionTiranteKN}
              />
            </CardContent>
          </Card>

          <Card className="drafting-marks">
            <CardHeader><CardTitle className="text-base">Armado propuesto</CardTitle></CardHeader>
            <CardContent className="py-2">
              <DiagramaVigaApeoArmado
                luzM={resultado.n.luz}
                hM={resultado.n.h}
                posicionCargaM={resultado.n.posCarga}
                anchoPilarApeadoM={resultado.n.anchoPilar}
                anchoApoyoIzqM={resultado.n.anchoApoyoIzq}
                anchoApoyoDerM={resultado.n.anchoApoyoDer}
                voladizoIzqM={resultado.n.voladizoIzq}
                voladizoDerM={resultado.n.voladizoDer}
                recubrimientoM={resultado.n.rg}
                numeroTirante={resultado.n.nTirante}
                diametroTiranteMm={resultado.n.phiTirante}
                alturaRepartoTiranteM={resultado.r.tirante.alturaRepartoM}
                requiereHorquillas={resultado.r.anclaje.requiereAnclajeMecanico}
                mallaHorizontalSeparacionM={resultado.n.sepMallaH}
                mallaHorizontalDiametroMm={resultado.n.phiMallaH}
                mallaVerticalSeparacionM={resultado.n.sepMallaV}
                mallaVerticalDiametroMm={resultado.n.phiMallaV}
                cuelgue={
                  resultado.r.cuelgue
                    ? {
                        diametroMm: resultado.n.phiCuelgue,
                        separacionM: resultado.n.sepCuelgue,
                        numeroRamas: resultado.n.ramasCuelgue,
                        anchoZonaM: resultado.r.cuelgue.anchoZonaM,
                      }
                    : null
                }
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="rg" etiqueta="Recubrimiento" sufijo="m" valor={rg} onChange={setRg} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="luz" etiqueta="Luz entre ejes" sufijo="m" valor={luz} onChange={setLuz} />
              <CampoNumerico id="h" etiqueta="Canto h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="b" etiqueta="Ancho b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="posCarga" etiqueta="Pilar apeado desde el apoyo izq." sufijo="m" valor={posCarga} onChange={setPosCarga} />
              <CampoNumerico id="anchoPilar" etiqueta="Ancho pilar apeado" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
              <CampoNumerico id="anchoApoyoIzq" etiqueta="Ancho apoyo izq." sufijo="m" valor={anchoApoyoIzq} onChange={setAnchoApoyoIzq} />
              <CampoNumerico id="anchoApoyoDer" etiqueta="Ancho apoyo der." sufijo="m" valor={anchoApoyoDer} onChange={setAnchoApoyoDer} />
              <CampoNumerico id="voladizoIzq" etiqueta="Voladizo izq." sufijo="m" valor={voladizoIzq} onChange={setVoladizoIzq} />
              <CampoNumerico id="voladizoDer" etiqueta="Voladizo der." sufijo="m" valor={voladizoDer} onChange={setVoladizoDer} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cargas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="nd" etiqueta="Nd del pilar apeado" sufijo="kN" valor={nd} onChange={setNd} />
              <CampoNumerico id="qd" etiqueta="qd repartida" sufijo="kN/m" valor={qd} onChange={setQd} />
              <div className="col-span-full">
                <CampoSeleccion
                  id="transmision"
                  etiqueta="Cómo llega la carga a la viga"
                  valor={transmision}
                  opciones={TRANSMISIONES}
                  onChange={setTransmision}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tirante inferior</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="nTirante" etiqueta="Nº barras" valor={nTirante} onChange={setNTirante} />
              <CampoNumerico id="phiTirante" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiTirante} onChange={setPhiTirante} />
              <CampoNumerico id="phiEstribo" etiqueta="φ estribo" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiEstribo} onChange={setPhiEstribo} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Malla de piel (por cara)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="phiMallaH" etiqueta="φ horizontal" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiMallaH} onChange={setPhiMallaH} />
              <CampoNumerico id="sepMallaH" etiqueta="Separación horiz." sufijo="m" valor={sepMallaH} onChange={setSepMallaH} />
              <CampoNumerico id="phiMallaV" etiqueta="φ vertical" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiMallaV} onChange={setPhiMallaV} />
              <CampoNumerico id="sepMallaV" etiqueta="Separación vert." sufijo="m" valor={sepMallaV} onChange={setSepMallaV} />
            </CardContent>
          </Card>

          {tipo !== "directa" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Estribos de cuelgue</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="phiCuelgue" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiCuelgue} onChange={setPhiCuelgue} />
                <CampoNumerico id="sepCuelgue" etiqueta="Separación" sufijo="m" valor={sepCuelgue} onChange={setSepCuelgue} />
                <CampoNumerico id="ramasCuelgue" etiqueta="Ramas" valor={ramasCuelgue} onChange={setRamasCuelgue} />
                <CampoNumerico id="cantoColgado" etiqueta="Canto del elemento colgado" sufijo="m" valor={cantoColgado} onChange={setCantoColgado} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos. El pilar apeado tiene que caer dentro de la
                luz y el tirante llevar al menos 2 barras.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">¿Corresponde bielas y tirantes?</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="La pieza es región D"
                    verifica={resultado.r.region.esRegionD}
                    detalle={`L/h = ${fmt(resultado.r.region.relacionLuzCanto)} · a/d mínimo = ${fmt(Math.min(resultado.r.region.aIzqSobreD, resultado.r.region.aDerSobreD))}`}
                  />
                  <PanelFormulas
                    titulo="Los dos criterios, por separado"
                    filas={[
                      {
                        etiqueta: "Anejo 19 art. 5.3.1(3): viga de gran canto si L ≤ 3·h",
                        valor: resultado.r.region.esGranCantoAnejo19 ? "Sí, viga de gran canto" : "No, es viga",
                      },
                      {
                        etiqueta: "Montoya §24.7.1: viga pared si L/h < 2",
                        valor: resultado.r.region.esGranCantoMontoya ? "Sí, viga pared" : "No",
                      },
                      { etiqueta: "Luz de cálculo de Montoya, mín(ejes; 1,15·luz libre)", valor: `${fmt(resultado.r.region.luzMontoyaM)} m` },
                      {
                        etiqueta: "Montoya §24.9.3: carga a menos de 2·d del apoyo",
                        valor: resultado.r.region.cargaProximaAlApoyo ? "Sí, biela directa al apoyo" : "No",
                      },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Los dos criterios no coinciden y se muestran separados a propósito. Aunque la
                    viga no clasifique como viga de gran canto, si el pilar apeado cae a menos de
                    2·d del apoyo la carga baja por una biela directa y las fórmulas de cortante
                    del art. 6.2 quedan fuera de su campo de aplicación. Si ninguno de los dos da
                    región D, la verificación que corresponde es{" "}
                    <span className="font-medium">Vigas de apeo</span> (flexión y cortante), no ésta.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tirante</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Cabe la cabeza comprimida"
                    verifica={resultado.r.modelo.verificaCabezaComprimida}
                    detalle={`z = ${fmt(resultado.r.modelo.zAdoptadoM, 3)} m de d = ${fmt(resultado.r.modelo.dM, 3)} m`}
                  />
                  <ResultadoCheck
                    etiqueta="Armadura del tirante suficiente"
                    verifica={resultado.r.tirante.verificaAs}
                    detalle={`As real ${fmt(resultado.r.tirante.asRealCm2)} cm² / As nec ${fmt(resultado.r.tirante.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Las barras entran en el ancho"
                    verifica={resultado.r.tirante.verificaBNec}
                    detalle={`b nec ${fmt(resultado.r.tirante.bNecM, 3)} m / b = ${fmt(resultado.n.b)} m · separación ${fmt(resultado.r.tirante.separacionMm, 0)} mm`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Reacción izquierda / derecha", valor: `${fmt(resultado.r.modelo.reaccionIzqKN, 0)} / ${fmt(resultado.r.modelo.reaccionDerKN, 0)} kN` },
                      { etiqueta: "Momento bajo el pilar", valor: `${fmt(resultado.r.modelo.momentoKNm, 0)} kN·m` },
                      { etiqueta: "z por tope del nudo superior (ec. 6.60)", valor: `${fmt(resultado.r.modelo.zNudoM, 3)} m` },
                      {
                        etiqueta: "z por Montoya §24.7.3.a (0,6·L)",
                        valor: resultado.r.modelo.zMontoyaM === null ? "no aplica" : `${fmt(resultado.r.modelo.zMontoyaM, 3)} m`,
                      },
                      { etiqueta: "z adoptado (el menor)", valor: `${fmt(resultado.r.modelo.zAdoptadoM, 3)} m` },
                      { etiqueta: "Tracción del tirante T = R/tg θ", valor: `${fmt(resultado.r.modelo.traccionTiranteKN, 0)} kN` },
                      { etiqueta: "As con fyd = fyk/γs", valor: `${fmt(resultado.r.tirante.asNecEc2Cm2)} cm²` },
                      { etiqueta: `As con fyd ≯ 400 MPa (Montoya §24.7.3.c)`, valor: `${fmt(resultado.r.tirante.asNecMontoyaCm2)} cm²` },
                      { etiqueta: "Altura de reparto del tirante (0,12·L)", valor: `${fmt(resultado.r.tirante.alturaRepartoM)} m` },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {resultado.r.tirante.topeAplicado
                      ? "La pieza clasifica como viga pared, así que se aplica el tope de Montoya fyd ≯ 400 MPa: con B500S eso es un 9 % más de acero que con fyd = 435 MPa."
                      : "No clasifica como viga pared, así que se arma con fyd pleno. La columna con el tope de 400 MPa queda igual a la vista para poder contrastar."}{" "}
                    El tirante va corrido de apoyo a apoyo, sin escalonar: en una región D no hay
                    ley de momentos de la que colgar los cortes.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Anclaje del tirante</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Anclaje recto en el apoyo izquierdo"
                    verifica={resultado.r.anclaje.verificaAnclajeIzq}
                    detalle={`disponible ${fmt(resultado.r.anclaje.disponibleIzqM * 1000, 0)} mm / lb,neta ${fmt(resultado.r.anclaje.lbNetaMm, 0)} mm`}
                  />
                  <ResultadoCheck
                    etiqueta="Anclaje recto en el apoyo derecho"
                    verifica={resultado.r.anclaje.verificaAnclajeDer}
                    detalle={`disponible ${fmt(resultado.r.anclaje.disponibleDerM * 1000, 0)} mm / lb,neta ${fmt(resultado.r.anclaje.lbNetaMm, 0)} mm`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {resultado.r.anclaje.requiereAnclajeMecanico
                      ? "No entra el anclaje recto: hay que cerrar el tirante con horquillas, patillas o dispositivos de anclaje (art. 9.7(3)). Están dibujadas en el croquis de armado."
                      : "Entra el anclaje recto, así que las horquillas no son obligatorias."}{" "}
                    La longitud se mide desde la cara interior del apoyo, no desde su eje: el
                    anclaje empieza donde empieza el nudo (art. 6.5.4(7)).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Bielas y nudos</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Biela izquierda"
                    verifica={resultado.r.bielas.bielaIzq.verifica}
                    detalle={`σ ${fmt(resultado.r.bielas.bielaIzq.sigmaMPa)} / ${fmt(resultado.r.bielas.bielaIzq.sigmaMaxMPa)} MPa · η = ${fmt(resultado.r.bielas.bielaIzq.aprovechamiento)}`}
                  />
                  <ResultadoCheck
                    etiqueta="Biela derecha"
                    verifica={resultado.r.bielas.bielaDer.verifica}
                    detalle={`σ ${fmt(resultado.r.bielas.bielaDer.sigmaMPa)} / ${fmt(resultado.r.bielas.bielaDer.sigmaMaxMPa)} MPa · η = ${fmt(resultado.r.bielas.bielaDer.aprovechamiento)}`}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo bajo el pilar apeado (CCC, k1 = 1,0)"
                    verifica={resultado.r.bielas.nudoSuperior.verifica}
                    detalle={`σ ${fmt(resultado.r.bielas.nudoSuperior.sigmaMPa)} / ${fmt(resultado.r.bielas.nudoSuperior.sigmaMaxMPa)} MPa`}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo apoyo izq. — Anejo 19 (CCT, k2 = 0,85)"
                    verifica={resultado.r.bielas.nudoApoyoIzq.verifica}
                    detalle={`σ ${fmt(resultado.r.bielas.nudoApoyoIzq.sigmaMPa)} / ${fmt(resultado.r.bielas.nudoApoyoIzq.sigmaMaxMPa)} MPa`}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo apoyo izq. — Montoya (0,7·fcd)"
                    verifica={resultado.r.bielas.nudoApoyoIzqMontoya.verifica}
                    detalle={`σ ${fmt(resultado.r.bielas.nudoApoyoIzqMontoya.sigmaMPa)} / ${fmt(resultado.r.bielas.nudoApoyoIzqMontoya.sigmaMaxMPa)} MPa`}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo apoyo der. — el más desfavorable de los dos"
                    verifica={resultado.r.bielas.nudoApoyoDer.verifica && resultado.r.bielas.nudoApoyoDerMontoya.verifica}
                    detalle={`σ ${fmt(resultado.r.bielas.nudoApoyoDer.sigmaMPa)} MPa / topes ${fmt(resultado.r.bielas.nudoApoyoDer.sigmaMaxMPa)} y ${fmt(resultado.r.bielas.nudoApoyoDerMontoya.sigmaMaxMPa)} MPa`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "ν' = 1 − fck/250", valor: fmt(resultado.r.bielas.nuPrima, 3) },
                      { etiqueta: "Inclinación θ izq. / der.", valor: `${fmt(resultado.r.modelo.anguloBielaIzqGrados, 1)}° / ${fmt(resultado.r.modelo.anguloBielaDerGrados, 1)}°` },
                      { etiqueta: "Compresión en biela izq. / der.", valor: `${fmt(resultado.r.modelo.compresionBielaIzqKN, 0)} / ${fmt(resultado.r.modelo.compresionBielaDerKN, 0)} kN` },
                      { etiqueta: "Ancho de biela en el nudo izq. / der.", valor: `${fmt(resultado.r.bielas.anchoBielaIzqM, 3)} / ${fmt(resultado.r.bielas.anchoBielaDerM, 3)} m` },
                      { etiqueta: "Tope de biela 0,6·ν'·fcd (ec. 6.56)", valor: `${fmt(resultado.r.bielas.bielaIzq.sigmaMaxMPa)} MPa` },
                      {
                        etiqueta: "Nudo de apoyo: criterio que gobierna",
                        valor: resultado.r.bielas.gobiernaMontoyaEnNudos ? "Montoya, 0,7·fcd" : "Anejo 19, 0,85·ν'·fcd",
                      },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Los dos topes del nudo de apoyo se cruzan en fck ≈ 44 MPa: por debajo manda el
                    0,7·fcd de Montoya y por encima el 0,85·ν′·fcd del Anejo 19. Ninguno es siempre
                    más estricto, así que se calculan los dos y hay que cumplir el peor.
                    θ debería quedar entre 30° y 60°: fuera de ese rango el modelo se aleja
                    demasiado del campo elástico y las fisuras en servicio se abren.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tracción transversal y malla de piel</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Malla vertical para la tracción transversal"
                    verifica={resultado.r.traccionTransversal.verificaAs}
                    detalle={`As real ${fmt(resultado.r.traccionTransversal.asRealCm2)} cm² / As nec ${fmt(resultado.r.traccionTransversal.asNecCm2)} cm² · T = ${fmt(resultado.r.traccionTransversal.traccionKN, 0)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="Malla horizontal ≥ mínimo del art. 9.7(1)"
                    verifica={resultado.r.malla.verificaHorizontal}
                    detalle={`${fmt(resultado.r.malla.horizontalCm2PorM)} / ${fmt(resultado.r.malla.asMinCm2PorM)} cm²/m por cara`}
                  />
                  <ResultadoCheck
                    etiqueta="Malla vertical ≥ mínimo del art. 9.7(1)"
                    verifica={resultado.r.malla.verificaVertical}
                    detalle={`${fmt(resultado.r.malla.verticalCm2PorM)} / ${fmt(resultado.r.malla.asMinCm2PorM)} cm²/m por cara`}
                  />
                  <ResultadoCheck
                    etiqueta="Separaciones ≤ mín(300 mm; 2·b), art. 9.7(2)"
                    verifica={resultado.r.malla.verificaSeparacionHorizontal && resultado.r.malla.verificaSeparacionVertical}
                    detalle={`máx ${fmt(resultado.r.malla.separacionMaxM * 100, 0)} cm`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      {
                        etiqueta: "Discontinuidad",
                        valor: resultado.r.traccionTransversal.discontinuidadParcial ? "parcial, ec. (6.58)" : "total, ec. (6.59)",
                      },
                      { etiqueta: "Ancho cargado a (pilar)", valor: `${fmt(resultado.r.traccionTransversal.aM)} m` },
                      { etiqueta: "Ancho de reparto b", valor: `${fmt(resultado.r.traccionTransversal.bRepartoM)} m` },
                      { etiqueta: "Tracción transversal T", valor: `${fmt(resultado.r.traccionTransversal.traccionKN, 0)} kN` },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">VERIFICAR</span> el ancho de reparto b contra la
                    figura A19.6.25 antes de usarlo en proyecto: acá se adopta mín(h; L/2), que es
                    una decisión de criterio y no un valor que la norma fije.
                  </p>
                </CardContent>
              </Card>

              {resultado.r.cuelgue && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Armadura de cuelgue</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Estribos de cuelgue suficientes"
                      verifica={resultado.r.cuelgue.verificaAs}
                      detalle={`As real ${fmt(resultado.r.cuelgue.asRealCm2)} cm² / As nec ${fmt(resultado.r.cuelgue.asNecCm2)} cm²`}
                    />
                    <ResultadoCheck
                      etiqueta="Canto suficiente para que se formen las bielas (h ≥ 1,2·a)"
                      verifica={resultado.r.cuelgue.verificaCantoMinimo}
                      detalle={`h = ${fmt(resultado.n.h)} m / mínimo ${fmt(resultado.r.cuelgue.cantoMinimoM)} m`}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "Fracción de Nd que se cuelga", valor: `${fmt(resultado.r.cuelgue.fraccionColgada * 100, 0)} %` },
                        { etiqueta: "Carga colgada", valor: `${fmt(resultado.r.cuelgue.cargaColgadaKN, 0)} kN` },
                        { etiqueta: "Zona de reparto a cada lado del pilar", valor: `${fmt(resultado.r.cuelgue.anchoZonaM)} m` },
                        { etiqueta: "fyd de estribos", valor: `${fmt(resultado.materiales.fydEstribos, 0)} MPa` },
                      ]}
                    />
                    <p className="text-xs text-muted-foreground">
                      Montoya §24.9.1: con carga colgada hay que suspender el 100 % de la carga con
                      estribos bien anclados en la cabeza comprimida opuesta; con apoyo indirecto se
                      considera el 45 % como directa y el 65 % como colgada, que suman más de 100 %
                      a propósito, por seguridad. Los estribos tienen que envolver por debajo la
                      armadura del tirante, no apoyarse encima.
                    </p>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                Todo el desarrollo es ELU con las solicitaciones ya mayoradas, γc = 1,5 y γs = 1,15,
                hormigón sin resistencia a tracción y armadura con diagrama birrectilíneo sin
                endurecimiento. El modelo de bielas y tirantes es una aplicación del teorema
                estático: cualquier campo de esfuerzos en equilibrio y que no supere las
                resistencias es del lado de la seguridad, pero sólo si la armadura se coloca
                exactamente donde el modelo pone el tirante y se ancla de verdad.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
