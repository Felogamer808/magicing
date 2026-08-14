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
import {
  calcularVigaApeoBielas,
  type CondicionAdherencia,
  type TransmisionCarga,
} from "@/lib/calc/ec2/viga-apeo-bielas";
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

// Art. 8.4.2(2) y figura A19.8.2: la barra del tirante va al fondo del
// encofrado, así que salvo hormigonado desde abajo o pieza muy alta la
// condición es buena. Se deja elegible porque cambia el anclaje un 43 %.
const ADHERENCIAS = ["Buena (fondo del encofrado)", "Mala"] as const;

const ADHERENCIA_POR_ETIQUETA: Record<string, CondicionAdherencia> = {
  [ADHERENCIAS[0]]: "buena",
  [ADHERENCIAS[1]]: "mala",
};

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
  const [nTirante2, setNTirante2] = useCampo("nTirante2", "0");
  const [phiTirante2, setPhiTirante2] = useCampo("phiTirante2", "25");
  const [phiEstribo, setPhiEstribo] = useCampo("phiEstribo", "12");
  const [dg, setDg] = useCampo("dg", "0.02");
  const [adherencia, setAdherencia] = useCampo("adherencia", ADHERENCIAS[0]);

  const [phiMallaH, setPhiMallaH] = useCampo("phiMallaH", "12");
  const [sepMallaH, setSepMallaH] = useCampo("sepMallaH", "0.2");
  const [phiMallaV, setPhiMallaV] = useCampo("phiMallaV", "12");
  const [sepMallaV, setSepMallaV] = useCampo("sepMallaV", "0.2");

  const [phiCuelgue, setPhiCuelgue] = useCampo("phiCuelgue", "12");
  const [sepCuelgue, setSepCuelgue] = useCampo("sepCuelgue", "0.1");
  const [ramasCuelgue, setRamasCuelgue] = useCampo("ramasCuelgue", "4");
  const [cantoColgado, setCantoColgado] = useCampo("cantoColgado", "0.6");

  const tipo = TIPO_POR_ETIQUETA[transmision] ?? "directa";
  const adh = ADHERENCIA_POR_ETIQUETA[adherencia] ?? "buena";

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk), rg: aNumero(rg),
      luz: aNumero(luz), h: aNumero(h), b: aNumero(b), posCarga: aNumero(posCarga),
      anchoPilar: aNumero(anchoPilar),
      anchoApoyoIzq: aNumero(anchoApoyoIzq), anchoApoyoDer: aNumero(anchoApoyoDer),
      voladizoIzq: aNumero(voladizoIzq), voladizoDer: aNumero(voladizoDer),
      nd: aNumero(nd), qd: aNumero(qd),
      nTirante: aNumero(nTirante), phiTirante: aNumero(phiTirante), phiEstribo: aNumero(phiEstribo),
      nTirante2: aNumero(nTirante2), phiTirante2: aNumero(phiTirante2), dg: aNumero(dg),
      phiMallaH: aNumero(phiMallaH), sepMallaH: aNumero(sepMallaH),
      phiMallaV: aNumero(phiMallaV), sepMallaV: aNumero(sepMallaV),
      phiCuelgue: aNumero(phiCuelgue), sepCuelgue: aNumero(sepCuelgue),
      ramasCuelgue: aNumero(ramasCuelgue), cantoColgado: aNumero(cantoColgado),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if ([n.fck, n.fyk, n.luz, n.h, n.b, n.anchoPilar, n.anchoApoyoIzq, n.anchoApoyoDer, n.nd].some((x) => x <= 0)) return null;
    if ([n.nTirante, n.phiTirante, n.phiEstribo, n.phiMallaH, n.sepMallaH, n.phiMallaV, n.sepMallaV].some((x) => x <= 0)) return null;
    if (n.nTirante < 2) return null;
    if (n.dg <= 0) return null;
    // Segunda capa: se activa con 0 barras apagada, y si se activa pide dos
    // barras como mínimo igual que la primera.
    if (n.nTirante2 > 0 && (n.nTirante2 < 2 || n.phiTirante2 <= 0)) return null;
    // El pilar tiene que caer dentro de la luz, con su ancho completo apoyado.
    if (n.posCarga <= n.anchoPilar / 2 || n.posCarga >= n.luz - n.anchoPilar / 2) return null;
    // El canto útil tiene que quedar positivo, contando las dos capas.
    const ocupaM =
      n.rg +
      n.phiEstribo / 1000 +
      n.phiTirante / 1000 +
      (n.nTirante2 > 0 ? Math.max(n.phiTirante, n.phiTirante2, n.dg * 1000 + 5, 20) / 1000 + n.phiTirante2 / 1000 : 0);
    if (ocupaM >= n.h) return null;
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
        tiranteSegundaCapa:
          n.nTirante2 > 0 ? { numero: n.nTirante2, diametroMm: n.phiTirante2 } : undefined,
        diametroEstriboMm: n.phiEstribo,
        tamanoMaximoAridoM: n.dg,
        condicionAdherencia: adh,
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
    nTirante2, phiTirante2, dg, adh,
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
                segundaCapaTirante={
                  resultado.n.nTirante2 > 0
                    ? { numero: resultado.n.nTirante2, diametroMm: resultado.n.phiTirante2 }
                    : null
                }
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
              <CampoNumerico id="nTirante2" etiqueta="Nº barras 2ª capa" valor={nTirante2} onChange={setNTirante2} />
              <CampoNumerico id="phiTirante2" etiqueta="φ 2ª capa" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiTirante2} onChange={setPhiTirante2} />
              <CampoNumerico id="dg" etiqueta="Árido máx. dg" sufijo="m" valor={dg} onChange={setDg} />
              <div className="col-span-2 sm:col-span-3">
                <CampoSeleccion
                  id="adherencia"
                  etiqueta="Condición de adherencia"
                  opciones={[...ADHERENCIAS]}
                  valor={adherencia}
                  onChange={setAdherencia}
                />
              </div>
              <p className="col-span-2 font-mono text-xs text-muted-foreground sm:col-span-3">
                Con 0 barras en la 2ª capa el tirante va en una sola fila. La segunda capa se
                apoya sobre la primera dejando la separación libre mínima del art. 8.2(2), así
                que sube el baricentro y baja el canto útil: es el precio de meter más acero.
              </p>
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
                    detalle={`b nec ${fmt(resultado.r.tirante.bNecM, 3)} m / b = ${fmt(resultado.n.b)} m · separación libre ${fmt(resultado.r.tirante.separacionMm, 0)} mm`}
                  />
                  {resultado.r.tirante.capas.capas.length > 1 && (
                    <>
                      <ResultadoCheck
                        etiqueta="Las dos capas entran en la franja de reparto"
                        verifica={resultado.r.tirante.capas.verificaDentroDelReparto}
                        detalle={`ocupan ${fmt(resultado.r.tirante.capas.alturaOcupadaM, 3)} m de los ${fmt(resultado.r.tirante.alturaRepartoM, 3)} m de 0,12·L`}
                      />
                      <ResultadoCheck
                        etiqueta="Mismo número de barras por capa (pasa el vibrador)"
                        verifica={resultado.r.tirante.capas.mismasBarrasPorCapa}
                        detalle="art. 8.2(3): las barras de las dos capas, en la misma vertical"
                      />
                    </>
                  )}
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
                      { etiqueta: "Separación libre mínima, art. 8.2(2)", valor: `${fmt(resultado.r.tirante.capas.separacionLibreMinimaMm, 0)} mm` },
                      ...resultado.r.tirante.capas.capas.map((c, i) => ({
                        etiqueta: `Capa ${i + 1} — ${c.numero}Ø${fmt(c.diametroMm, 0)} a ${fmt(c.brazoDesdeElBordeM, 4)} m del borde`,
                        valor: `${fmt(c.areaCm2)} cm² · libre ${fmt(c.separacionLibreMm, 0)} mm`,
                      })),
                      { etiqueta: "Baricentro de la armadura desde el borde", valor: `${fmt(resultado.r.tirante.capas.baricentroDesdeElBordeM, 4)} m` },
                      { etiqueta: "Canto útil d = h − baricentro", valor: `${fmt(resultado.r.modelo.dM, 4)} m` },
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
                  <p className="text-xs text-muted-foreground">
                    Es la verificación que más apeos manda a rehacer. El tirante entra al nudo
                    con toda su tracción y tiene que descargarla contra el hormigón del apoyo en
                    los pocos centímetros que hay hasta el borde de la viga. No es la longitud de
                    una viga a flexión, donde el momento decrece y la barra se va descargando
                    sola: acá llega al apoyo con T entera.
                  </p>

                  <ResultadoCheck
                    etiqueta="Anclaje recto, apoyo izquierdo"
                    verifica={resultado.r.anclaje.recto.verificaIzq && resultado.r.anclaje.recto.verificaIzqMontoya}
                    detalle={`lbd ${fmt(resultado.r.anclaje.recto.lbdMm, 0)} mm · disponible ${fmt(resultado.r.anclaje.disponibleIzqM * 1000, 0)} mm desde la cara (Anejo 19) y ${fmt(resultado.r.anclaje.disponibleMontoyaIzqM * 1000, 0)} mm desde el eje (Montoya)`}
                  />
                  <ResultadoCheck
                    etiqueta="Anclaje recto, apoyo derecho"
                    verifica={resultado.r.anclaje.recto.verificaDer && resultado.r.anclaje.recto.verificaDerMontoya}
                    detalle={`lbd ${fmt(resultado.r.anclaje.recto.lbdMm, 0)} mm · disponible ${fmt(resultado.r.anclaje.disponibleDerM * 1000, 0)} mm desde la cara (Anejo 19) y ${fmt(resultado.r.anclaje.disponibleMontoyaDerM * 1000, 0)} mm desde el eje (Montoya)`}
                  />

                  {!resultado.r.anclaje.verificaRecto && (
                    <>
                      <ResultadoCheck
                        etiqueta="Con horquilla, apoyo izquierdo"
                        verifica={resultado.r.anclaje.horquilla.verificaIzq && resultado.r.anclaje.horquilla.verificaIzqMontoya}
                        detalle={`lbd ${fmt(resultado.r.anclaje.horquilla.lbdMm, 0)} mm · desarrollo ${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleIzqMm, 0)} mm`}
                      />
                      <ResultadoCheck
                        etiqueta="Con horquilla, apoyo derecho"
                        verifica={resultado.r.anclaje.horquilla.verificaDer && resultado.r.anclaje.horquilla.verificaDerMontoya}
                        detalle={`lbd ${fmt(resultado.r.anclaje.horquilla.lbdMm, 0)} mm · desarrollo ${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleDerMm, 0)} mm`}
                      />
                      <ResultadoCheck
                        etiqueta="La horquilla cabe en el ancho de la viga"
                        verifica={resultado.r.anclaje.geometriaHorquilla.cabeEnElAncho}
                        detalle={`ocupa ${fmt(resultado.r.anclaje.geometriaHorquilla.anchoOcupadoEnPlantaM * 1000, 0)} mm de los ${fmt(resultado.r.anclaje.geometriaHorquilla.anchoLibreM * 1000, 0)} mm libres entre estribos`}
                      />
                    </>
                  )}

                  <PanelFormulas
                    titulo="Ver cálculo de la longitud de anclaje"
                    filas={[
                      { etiqueta: "Tensión de la barra σsd = T/As,real", valor: `${fmt(resultado.r.anclaje.sigmaSdMPa, 1)} MPa` },
                      { etiqueta: "fctd = αct·0,7·fctm/γc (ec. 3.16)", valor: `${fmt(resultado.r.anclaje.fctdMPa, 3)} MPa` },
                      { etiqueta: "η1 por condición de adherencia · η2 por diámetro", valor: `${fmt(resultado.r.anclaje.eta1, 2)} · ${fmt(resultado.r.anclaje.eta2, 2)}` },
                      { etiqueta: "fbd = 2,25·η1·η2·fctd (ec. 8.2)", valor: `${fmt(resultado.r.anclaje.fbdMPa, 3)} MPa` },
                      { etiqueta: "lb,rqd = (φ/4)·(σsd/fbd) (ec. 8.3)", valor: `${fmt(resultado.r.anclaje.lbRqdMm, 0)} mm` },
                      { etiqueta: "cd = mín(a/2; c1; c) (fig. A19.8.3)", valor: `${fmt(resultado.r.anclaje.cdMm, 1)} mm` },
                      { etiqueta: "Recta: α1 · α2·α3·α5 (tabla A19.8.2)", valor: `${fmt(resultado.r.anclaje.recto.alfa1, 2)} · ${fmt(resultado.r.anclaje.recto.producto235, 2)}` },
                      { etiqueta: "Recta: lbd = α·lb,rqd ≥ lb,min (ec. 8.4)", valor: `${fmt(resultado.r.anclaje.recto.lbdMm, 0)} mm (lb,min ${fmt(resultado.r.anclaje.recto.lbMinMm, 0)} mm)` },
                      { etiqueta: "Horquilla: α1 · α2·α3·α5", valor: `${fmt(resultado.r.anclaje.horquilla.alfa1, 2)} · ${fmt(resultado.r.anclaje.horquilla.producto235, 2)}` },
                      { etiqueta: "Horquilla: lbd", valor: `${fmt(resultado.r.anclaje.horquilla.lbdMm, 0)} mm` },
                    ]}
                  />

                  <PanelFormulas
                    titulo="Ver cómo se calcula la horquilla"
                    filas={[
                      { etiqueta: "Nº de horquillas (una cada dos barras)", valor: `${resultado.r.anclaje.geometriaHorquilla.numeroHorquillas}` },
                      { etiqueta: "Mandril mínimo de tabla A19.8.1 (4φ si φ≤16; 7φ si no)", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.mandrilMinimoTablaMm, 0)} mm` },
                      { etiqueta: "Tracción de una barra Fbt = σsd·Aφ", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.fbtKN, 0)} kN` },
                      { etiqueta: "ab = recubrimiento + φ/2 (barra de esquina)", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.abMm, 0)} mm` },
                      { etiqueta: "Mandril por rotura del hormigón, ec. (8.1)", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.mandrilPorHormigonMm, 0)} mm` },
                      {
                        etiqueta: "¿Exenta de comprobar el hormigón? (art. 8.3(3))",
                        valor: resultado.r.anclaje.geometriaHorquilla.exentaDeComprobarMandril
                          ? "sí, la rama de vuelta no pasa de 5φ"
                          : "no, hay que comprobarlo",
                      },
                      { etiqueta: "Mandril adoptado φm", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.mandrilAdoptadoMm, 0)} mm` },
                      { etiqueta: "Desarrollo del codo de 180°: π·(φm+φ)/2", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloCodoMm, 0)} mm` },
                      { etiqueta: "Rama de ida izq. / der.", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.ramaIdaIzqMm, 0)} / ${fmt(resultado.r.anclaje.geometriaHorquilla.ramaIdaDerMm, 0)} mm` },
                      { etiqueta: "Desarrollo total 2·ida + codo, izq. / der.", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleIzqMm, 0)} / ${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleDerMm, 0)} mm` },
                      { etiqueta: "Rama de vuelta que falta, izq. / der.", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.ramaVueltaIzqMm, 0)} / ${fmt(resultado.r.anclaje.geometriaHorquilla.ramaVueltaDerMm, 0)} mm` },
                      { etiqueta: "Ancho que ocupa el lazo en planta: φm + 2φ", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.anchoOcupadoEnPlantaM * 1000, 0)} mm` },
                    ]}
                  />

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Cómo se calcula la horquilla.</strong>{" "}
                      Primero sale lbd como en cualquier barra: la tensión real σsd = T/As,real
                      dividida por la adherencia fbd da la longitud recta lb,rqd, y los α de la
                      tabla A19.8.2 la corrigen. Ojo con un punto que engaña: doblar la barra
                      sólo bonifica (α1 = 0,7) si cd &gt; 3φ, o sea si el codo tiene hormigón
                      alrededor. Con recubrimientos y separaciones normales cd es chico y la
                      horquilla exige la misma lbd que la barra recta.
                    </p>
                    <p>
                      Entonces la horquilla no sirve por coeficiente sino por{" "}
                      <strong className="text-foreground">geometría</strong>: Montoya la dibuja
                      doblada en planta (fig. 24.25b), la barra entra, gira 180° en el plano
                      horizontal y vuelve paralela a sí misma. En el mismo hueco físico se
                      desarrolla 2·(rama de ida) + el arco del codo, casi el triple que recto.
                      Doblada así el codo tampoco invade la biela comprimida, que es lo que
                      pasaría si el giro fuera vertical.
                    </p>
                    <p>
                      El mandril φm sale por el mayor de dos criterios: el de tabla —4φ hasta φ16
                      y 7φ por encima, para no fisurar la barra al doblarla— y el de la ec. (8.1),
                      que evita que el hormigón de adentro del codo reviente por la presión de
                      contacto. El segundo sólo hay que comprobarlo si tras el codo queda más de
                      5φ de barra (art. 8.3(3)); si la rama de vuelta es corta, la propia barra
                      no llega a cargar el codo.
                    </p>
                    <p>
                      Los dos criterios de arranque no coinciden y se comprueban por separado:
                      el Anejo 19 art. 6.5.4(7) empieza a contar en la cara interior del apoyo y
                      Montoya §24.7.3.e a partir del eje de apoyo, medio ancho de placa menos.
                      Manda el peor. <strong className="text-foreground">VERIFICAR</strong>: la
                      geometría de la horquilla (ramas, arco y ancho ocupado) es mi lectura de la
                      fig. 24.25b, no una fórmula tabulada — contrastala antes de acotar un plano.
                    </p>
                    <p>
                      {resultado.r.anclaje.formaRecomendada === "recta"
                        ? "Entra el anclaje recto: las horquillas no son obligatorias."
                        : resultado.r.anclaje.formaRecomendada === "horquilla"
                          ? "Recto no entra pero la horquilla sí: hay que doblar el tirante en los dos extremos."
                          : "No entra ni recto ni con horquilla: hay que ir a dispositivos de anclaje o placas soldadas (art. 9.7(3)), o agrandar el apoyo o el voladizo."}
                    </p>
                  </div>
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
              <p className="text-xs text-muted-foreground">
                En el anclaje se toman α3 = α4 = α5 = 1,00: no se descuenta nada por confinamiento
                de la armadura transversal, ni por barras transversales soldadas, ni por la presión
                transversal del apoyo. Las tres son bonificaciones legítimas de la tabla A19.8.2,
                pero exigen justificar armadura y presiones que esta pantalla no conoce, así que
                quedan del lado seguro y a la vista.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
