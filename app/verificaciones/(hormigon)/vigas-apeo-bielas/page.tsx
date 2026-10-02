"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaVigaApeoModelo } from "@/components/verificaciones/hormigon/DiagramaVigaApeoModelo";
import { DiagramaVigaApeoArmado } from "@/components/verificaciones/hormigon/DiagramaVigaApeoArmado";
import {
  calcularVigaApeoBielas,
  type CondicionAdherencia,
  type TransmisionCarga,
} from "@/lib/calc/hormigon/vigas/apeo-bielas";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-apeo-bielas")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: el pilar apeado tiene que caer dentro de la luz, el tirante llevar al menos 2 barras y el canto útil quedar positivo." });
  } else {
    if (!resultado.r.region.esRegionD)
      avisos.push({ tipo: "aviso", texto: "La pieza no es región D por ninguno de los dos criterios: corresponde verificarla a flexión y cortante (Vigas de apeo), no con bielas y tirantes." });
    if (resultado.r.anclaje.formaRecomendada === "dispositivo mecánico")
      avisos.push({ tipo: "aviso", texto: "El tirante no se ancla ni recto ni con horquilla: hacen falta dispositivos de anclaje o placas soldadas (art. 9.7(3)), o agrandar el apoyo o el voladizo." });
  }

  const modelo = resultado ? (
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
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">El modelo se dibuja con datos válidos.</p>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Vigas · regiones D</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría y materiales" descripcion="La viga, los apoyos y el pilar que apea.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="rg" etiqueta="Recubrimiento" sufijo="m" valor={rg} onChange={setRg} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Viga y apoyos">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="luz" etiqueta="Luz entre ejes" sufijo="m" valor={luz} onChange={setLuz} />
                    <CampoNumerico id="h" etiqueta="Canto h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="b" etiqueta="Ancho b" sufijo="m" valor={b} onChange={setB} />
                    <CampoNumerico id="anchoApoyoIzq" etiqueta="Ancho apoyo izq." sufijo="m" valor={anchoApoyoIzq} onChange={setAnchoApoyoIzq} />
                    <CampoNumerico id="anchoApoyoDer" etiqueta="Ancho apoyo der." sufijo="m" valor={anchoApoyoDer} onChange={setAnchoApoyoDer} />
                    <div />
                    <CampoNumerico id="voladizoIzq" etiqueta="Voladizo izq." sufijo="m" valor={voladizoIzq} onChange={setVoladizoIzq} />
                    <CampoNumerico id="voladizoDer" etiqueta="Voladizo der." sufijo="m" valor={voladizoDer} onChange={setVoladizoDer} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar apeado">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="posCarga" etiqueta="Distancia desde el apoyo izq." sufijo="m" valor={posCarga} onChange={setPosCarga} />
                    <CampoNumerico id="anchoPilar" etiqueta="Ancho del pilar" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={modelo}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Ya mayoradas.">
          <div className="grid max-w-2xl grid-cols-2 gap-4">
            <CampoNumerico id="nd" etiqueta="Nd del pilar apeado" sufijo="kN" valor={nd} onChange={setNd} />
            <CampoNumerico id="qd" etiqueta="qd repartida" sufijo="kN/m" valor={qd} onChange={setQd} />
            <div className="col-span-2">
              <CampoSeleccion id="transmision" etiqueta="Cómo llega la carga a la viga" valor={transmision} opciones={TRANSMISIONES} onChange={setTransmision} />
            </div>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Tirante inferior, malla de piel y, si la carga entra colgada, estribos de cuelgue.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Tirante inferior">
                  <EditorCapas
                    filas={[
                      { posicion: "Capa 1", numero: { id: "nTirante", valor: nTirante, onChange: setNTirante }, diametro: { id: "phiTirante", valor: phiTirante, onChange: setPhiTirante } },
                      ...(aNumero(nTirante2) > 0
                        ? [{ posicion: "Capa 2", numero: { id: "nTirante2", valor: nTirante2, onChange: setNTirante2 }, diametro: { id: "phiTirante2", valor: phiTirante2, onChange: setPhiTirante2 }, onQuitar: () => setNTirante2("0") }]
                        : []),
                    ]}
                    onAgregar={aNumero(nTirante2) > 0 ? undefined : () => setNTirante2("2")}
                    textoAgregar="2ª capa"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <CampoDiametro id="phiEstribo" etiqueta="Ø estribo" valor={phiEstribo} onChange={setPhiEstribo} />
                    <CampoNumerico id="dg" etiqueta="Árido máx. dg" sufijo="m" valor={dg} onChange={setDg} />
                    <CampoSeleccion id="adherencia" etiqueta="Adherencia" opciones={[...ADHERENCIAS]} valor={adherencia} onChange={setAdherencia} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La 2ª capa se apoya sobre la primera dejando la separación libre del art. 8.2(2):
                    sube el baricentro y baja el canto útil.
                  </p>
                </Subgrupo>
                <Subgrupo titulo="Malla de piel, por cara">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="phiMallaH" etiqueta="Ø horizontal" valor={phiMallaH} onChange={setPhiMallaH} />
                    <CampoNumerico id="sepMallaH" etiqueta="Separación horiz." sufijo="m" valor={sepMallaH} onChange={setSepMallaH} />
                    <CampoDiametro id="phiMallaV" etiqueta="Ø vertical" valor={phiMallaV} onChange={setPhiMallaV} />
                    <CampoNumerico id="sepMallaV" etiqueta="Separación vert." sufijo="m" valor={sepMallaV} onChange={setSepMallaV} />
                  </div>
                </Subgrupo>
                {tipo !== "directa" && (
                  <Subgrupo titulo="Estribos de cuelgue">
                    <div className="grid grid-cols-2 gap-4">
                      <CampoDiametro id="phiCuelgue" etiqueta="Ø" valor={phiCuelgue} onChange={setPhiCuelgue} />
                      <CampoNumerico id="sepCuelgue" etiqueta="Separación" sufijo="m" valor={sepCuelgue} onChange={setSepCuelgue} />
                      <CampoNumerico id="ramasCuelgue" etiqueta="Ramas" valor={ramasCuelgue} onChange={setRamasCuelgue} />
                      <CampoNumerico id="cantoColgado" etiqueta="Canto del elemento colgado" sufijo="m" valor={cantoColgado} onChange={setCantoColgado} />
                    </div>
                  </Subgrupo>
                )}
              </>
            }
            dibujo={
              resultado ? (
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
                  segundaCapaTirante={resultado.n.nTirante2 > 0 ? { numero: resultado.n.nTirante2, diametroMm: resultado.n.phiTirante2 } : null}
                  alturaRepartoTiranteM={resultado.r.tirante.alturaRepartoM}
                  requiereHorquillas={resultado.r.anclaje.requiereAnclajeMecanico}
                  mallaHorizontalSeparacionM={resultado.n.sepMallaH}
                  mallaHorizontalDiametroMm={resultado.n.phiMallaH}
                  mallaVerticalSeparacionM={resultado.n.sepMallaV}
                  mallaVerticalDiametroMm={resultado.n.phiMallaV}
                  cuelgue={resultado.r.cuelgue ? { diametroMm: resultado.n.phiCuelgue, separacionM: resultado.n.sepCuelgue, numeroRamas: resultado.n.ramasCuelgue, anchoZonaM: resultado.r.cuelgue.anchoZonaM } : null}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">El armado se dibuja con datos válidos.</p>
              )
            }
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Luz × h × b", valor: `${luz} × ${h} × ${b} m` },
              { etiqueta: "Nd / qd", valor: `${nd} kN / ${qd} kN/m` },
              { etiqueta: "Transmisión", valor: transmision.split(" (")[0] },
              ...(resultado
                ? [
                    { etiqueta: "L/h", valor: fmt(resultado.r.region.relacionLuzCanto), derivado: true },
                    { etiqueta: "d / z", valor: `${fmt(resultado.r.modelo.dM, 3)} / ${fmt(resultado.r.modelo.zAdoptadoM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "ELU con solicitaciones mayoradas, γc = 1,5 y γs = 1,15; hormigón sin tracción y acero birrectilíneo sin endurecimiento. El modelo es del lado seguro sólo si la armadura va donde el modelo pone el tirante y se ancla de verdad.",
              "Región D por dos criterios que se muestran separados: viga de gran canto si L ≤ 3h (Anejo 19, art. 5.3.1(3)) y carga a menos de 2d del apoyo (Montoya §24.9.3).",
              "z adoptado: el menor entre el tope del nudo superior (ec. 6.60) y 0,6·L (Montoya §24.7.3.a). Tirante corrido de apoyo a apoyo, sin escalonar.",
              "Si clasifica como viga pared se topa fyd en 400 MPa (Montoya §24.7.3.c).",
              "Nudos de apoyo con los dos topes, 0,85·ν′·fcd (Anejo 19) y 0,7·fcd (Montoya): se cruzan en fck ≈ 44 MPa y se exige el peor.",
              "Anclaje con α3 = α4 = α5 = 1,00, desde la cara del apoyo (Anejo 19, art. 6.5.4(7)) y desde el eje (Montoya §24.7.3.e); manda el peor. La geometría de la horquilla es una lectura de la fig. 24.25b de Montoya: VERIFICAR antes de acotar un plano.",
              "Ancho de reparto de la tracción transversal mín(h; L/2): criterio, no valor de norma. VERIFICAR contra la fig. A19.6.25.",
              "Carga colgada: 100 % suspendida; apoyo indirecto: 45 % directa y 65 % colgada (Montoya §24.9.1).",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
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
                  { etiqueta: "Tracción del tirante", valor: `${fmt(resultado.r.modelo.traccionTiranteKN, 0)} kN` },
                  { etiqueta: "As nec. tirante", valor: `${fmt(resultado.r.tirante.asNecCm2)} cm²`, nota: `colocada ${fmt(resultado.r.tirante.asRealCm2)} cm²` },
                  { etiqueta: "θ izq. / der.", valor: `${fmt(resultado.r.modelo.anguloBielaIzqGrados, 0)}° / ${fmt(resultado.r.modelo.anguloBielaDerGrados, 0)}°`, nota: "conviene entre 30° y 60°" },
                  { etiqueta: "Anclaje", valor: resultado.r.anclaje.formaRecomendada === "recta" ? "recto" : resultado.r.anclaje.formaRecomendada === "horquilla" ? "con horquilla" : "dispositivo mecánico" },
                ]}
              />

              <Subgrupo titulo="¿Corresponde bielas y tirantes?">
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{resultado.r.region.esRegionD ? "Sí, la pieza es región D." : "No: no es región D por ninguno de los dos criterios."}</span>
                    <span className="text-muted-foreground">
                      {" "}L/h = {fmt(resultado.r.region.relacionLuzCanto)} · a/d mínimo ={" "}
                      {fmt(Math.min(resultado.r.region.aIzqSobreD, resultado.r.region.aDerSobreD))}.
                    </span>
                  </p>
                  <PanelFormulas
                    titulo="Ver los dos criterios de región D"
                    filas={[
                      { etiqueta: "Anejo 19 art. 5.3.1(3): viga de gran canto si L ≤ 3·h", valor: resultado.r.region.esGranCantoAnejo19 ? "Sí, viga de gran canto" : "No, es viga" },
                      { etiqueta: "Montoya §24.7.1: viga pared si L/h < 2", valor: resultado.r.region.esGranCantoMontoya ? "Sí, viga pared" : "No" },
                      { etiqueta: "Luz de cálculo de Montoya, mín(ejes; 1,15·luz libre)", valor: `${fmt(resultado.r.region.luzMontoyaM)} m` },
                      { etiqueta: "Montoya §24.9.3: carga a menos de 2·d del apoyo", valor: resultado.r.region.cargaProximaAlApoyo ? "Sí, biela directa al apoyo" : "No" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones resistentes">
                <div>
                  <ResultadoCheck
                    etiqueta="Tirante · armadura suficiente"
                    verifica={resultado.r.tirante.verificaAs}
                    detalle={resultado.r.tirante.topeAplicado ? "Viga pared: se aplica el tope fyd ≯ 400 MPa de Montoya." : "No es viga pared: fyd pleno."}
                    comparacion={{ real: { etiqueta: "As real", valor: resultado.r.tirante.asRealCm2 }, limite: { etiqueta: "As nec", valor: resultado.r.tirante.asNecCm2 }, unidad: "cm²", exige: "≥" }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del tirante"
                    filas={[
                      { etiqueta: "Reacción izquierda / derecha", valor: `${fmt(resultado.r.modelo.reaccionIzqKN, 0)} / ${fmt(resultado.r.modelo.reaccionDerKN, 0)} kN` },
                      { etiqueta: "Momento bajo el pilar", valor: `${fmt(resultado.r.modelo.momentoKNm, 0)} kN·m` },
                      { etiqueta: "z por tope del nudo superior (ec. 6.60)", valor: `${fmt(resultado.r.modelo.zNudoM, 3)} m` },
                      { etiqueta: "z por Montoya §24.7.3.a (0,6·L)", valor: resultado.r.modelo.zMontoyaM === null ? "no aplica" : `${fmt(resultado.r.modelo.zMontoyaM, 3)} m` },
                      { etiqueta: "z adoptado (el menor)", valor: `${fmt(resultado.r.modelo.zAdoptadoM, 3)} m` },
                      { etiqueta: "Tracción del tirante T = R/tg θ", valor: `${fmt(resultado.r.modelo.traccionTiranteKN, 0)} kN` },
                      { etiqueta: "As con fyd = fyk/γs", valor: `${fmt(resultado.r.tirante.asNecEc2Cm2)} cm²` },
                      { etiqueta: "As con fyd ≯ 400 MPa (Montoya §24.7.3.c)", valor: `${fmt(resultado.r.tirante.asNecMontoyaCm2)} cm²` },
                      { etiqueta: "Altura de reparto del tirante (0,12·L)", valor: `${fmt(resultado.r.tirante.alturaRepartoM)} m` },
                      { etiqueta: "Separación libre mínima, art. 8.2(2)", valor: `${fmt(resultado.r.tirante.capas.separacionLibreMinimaMm, 0)} mm` },
                      ...resultado.r.tirante.capas.capas.map((c, i) => ({
                        etiqueta: `Capa ${i + 1} — ${c.numero}Ø${fmt(c.diametroMm, 0)} a ${fmt(c.brazoDesdeElBordeM, 4)} m del borde`,
                        valor: `${fmt(c.areaCm2)} cm² · libre ${fmt(c.separacionLibreMm, 0)} mm`,
                      })),
                      { etiqueta: "Canto útil d = h − baricentro", valor: `${fmt(resultado.r.modelo.dM, 4)} m` },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Biela izquierda"
                    verifica={resultado.r.bielas.bielaIzq.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.bielas.bielaIzq.sigmaMPa }, limite: { etiqueta: "0,6·ν′·fcd", valor: resultado.r.bielas.bielaIzq.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                  />
                  <ResultadoCheck
                    etiqueta="Biela derecha"
                    verifica={resultado.r.bielas.bielaDer.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.bielas.bielaDer.sigmaMPa }, limite: { etiqueta: "0,6·ν′·fcd", valor: resultado.r.bielas.bielaDer.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo bajo el pilar apeado (CCC, k1 = 1,0)"
                    verifica={resultado.r.bielas.nudoSuperior.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.bielas.nudoSuperior.sigmaMPa }, limite: { etiqueta: "σ máx", valor: resultado.r.bielas.nudoSuperior.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo de apoyo izquierdo · Anejo 19 (CCT, k2 = 0,85)"
                    verifica={resultado.r.bielas.nudoApoyoIzq.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.bielas.nudoApoyoIzq.sigmaMPa }, limite: { etiqueta: "σ máx", valor: resultado.r.bielas.nudoApoyoIzq.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo de apoyo izquierdo · Montoya (0,7·fcd)"
                    verifica={resultado.r.bielas.nudoApoyoIzqMontoya.verifica}
                    comparacion={{ real: { etiqueta: "σ", valor: resultado.r.bielas.nudoApoyoIzqMontoya.sigmaMPa }, limite: { etiqueta: "σ máx", valor: resultado.r.bielas.nudoApoyoIzqMontoya.sigmaMaxMPa }, unidad: "MPa", exige: "≤" }}
                  />
                  <ResultadoCheck
                    etiqueta="Nudo de apoyo derecho · el más desfavorable de los dos topes"
                    verifica={resultado.r.bielas.nudoApoyoDer.verifica && resultado.r.bielas.nudoApoyoDerMontoya.verifica}
                    detalle={`topes ${fmt(resultado.r.bielas.nudoApoyoDer.sigmaMaxMPa)} (Anejo 19) y ${fmt(resultado.r.bielas.nudoApoyoDerMontoya.sigmaMaxMPa)} (Montoya) MPa`}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.bielas.nudoApoyoDer.sigmaMPa },
                      limite: { etiqueta: "σ máx", valor: Math.min(resultado.r.bielas.nudoApoyoDer.sigmaMaxMPa, resultado.r.bielas.nudoApoyoDerMontoya.sigmaMaxMPa) },
                      unidad: "MPa", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de bielas y nudos"
                    filas={[
                      { etiqueta: "ν′ = 1 − fck/250", valor: fmt(resultado.r.bielas.nuPrima, 3) },
                      { etiqueta: "Inclinación θ izq. / der.", valor: `${fmt(resultado.r.modelo.anguloBielaIzqGrados, 1)}° / ${fmt(resultado.r.modelo.anguloBielaDerGrados, 1)}°` },
                      { etiqueta: "Compresión en biela izq. / der.", valor: `${fmt(resultado.r.modelo.compresionBielaIzqKN, 0)} / ${fmt(resultado.r.modelo.compresionBielaDerKN, 0)} kN` },
                      { etiqueta: "Ancho de biela en el nudo izq. / der.", valor: `${fmt(resultado.r.bielas.anchoBielaIzqM, 3)} / ${fmt(resultado.r.bielas.anchoBielaDerM, 3)} m` },
                      { etiqueta: "Nudo de apoyo: criterio que gobierna", valor: resultado.r.bielas.gobiernaMontoyaEnNudos ? "Montoya, 0,7·fcd" : "Anejo 19, 0,85·ν′·fcd" },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Malla vertical para la tracción transversal"
                    verifica={resultado.r.traccionTransversal.verificaAs}
                    detalle={`T = ${fmt(resultado.r.traccionTransversal.traccionKN, 0)} kN, discontinuidad ${resultado.r.traccionTransversal.discontinuidadParcial ? "parcial, ec. (6.58)" : "total, ec. (6.59)"}; a = ${fmt(resultado.r.traccionTransversal.aM)} m, b de reparto = ${fmt(resultado.r.traccionTransversal.bRepartoM)} m.`}
                    comparacion={{ real: { etiqueta: "As real", valor: resultado.r.traccionTransversal.asRealCm2 }, limite: { etiqueta: "As nec", valor: resultado.r.traccionTransversal.asNecCm2 }, unidad: "cm²", exige: "≥" }}
                  />
                  {resultado.r.cuelgue && (
                    <>
                      <ResultadoCheck
                        etiqueta="Estribos de cuelgue suficientes"
                        verifica={resultado.r.cuelgue.verificaAs}
                        detalle={`Se cuelga el ${fmt(resultado.r.cuelgue.fraccionColgada * 100, 0)} % de Nd: ${fmt(resultado.r.cuelgue.cargaColgadaKN, 0)} kN en ${fmt(resultado.r.cuelgue.anchoZonaM)} m a cada lado, con fyd de estribos ${fmt(resultado.materiales.fydEstribos, 0)} MPa. Los estribos envuelven por debajo el tirante.`}
                        comparacion={{ real: { etiqueta: "As real", valor: resultado.r.cuelgue.asRealCm2 }, limite: { etiqueta: "As nec", valor: resultado.r.cuelgue.asNecCm2 }, unidad: "cm²", exige: "≥" }}
                      />
                    </>
                  )}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas" detalle="geometría del armado y anclajes">
                <div>
                  <ResultadoCheck
                    etiqueta="Cabe la cabeza comprimida (z ≤ d)"
                    verifica={resultado.r.modelo.verificaCabezaComprimida}
                    comparacion={{ real: { etiqueta: "z", valor: resultado.r.modelo.zAdoptadoM }, limite: { etiqueta: "d", valor: resultado.r.modelo.dM }, unidad: "m", exige: "≤", decimales: 3 }}
                  />
                  <ResultadoCheck
                    etiqueta="Las barras del tirante entran en el ancho"
                    verifica={resultado.r.tirante.verificaBNec}
                    detalle={`separación libre ${fmt(resultado.r.tirante.separacionMm, 0)} mm`}
                    comparacion={{ real: { etiqueta: "b nec", valor: resultado.r.tirante.bNecM }, limite: { etiqueta: "b", valor: resultado.n.b }, unidad: "m", exige: "≤", decimales: 3 }}
                  />
                  {resultado.r.tirante.capas.capas.length > 1 && (
                    <>
                      <ResultadoCheck
                        etiqueta="Las dos capas entran en la franja de reparto"
                        verifica={resultado.r.tirante.capas.verificaDentroDelReparto}
                        comparacion={{ real: { etiqueta: "ocupan", valor: resultado.r.tirante.capas.alturaOcupadaM }, limite: { etiqueta: "0,12·L", valor: resultado.r.tirante.alturaRepartoM }, unidad: "m", exige: "≤", decimales: 3 }}
                      />
                      <ResultadoCheck
                        etiqueta="Mismo número de barras por capa (pasa el vibrador)"
                        verifica={resultado.r.tirante.capas.mismasBarrasPorCapa}
                        detalle="art. 8.2(3): las barras de las dos capas, en la misma vertical"
                      />
                    </>
                  )}
                  <ResultadoCheck
                    etiqueta="Anclaje recto · apoyo izquierdo"
                    verifica={resultado.r.anclaje.recto.verificaIzq && resultado.r.anclaje.recto.verificaIzqMontoya}
                    detalle={`${fmt(resultado.r.anclaje.disponibleIzqM * 1000, 0)} mm desde la cara (Anejo 19) y ${fmt(resultado.r.anclaje.disponibleMontoyaIzqM * 1000, 0)} mm desde el eje (Montoya)`}
                    comparacion={{ real: { etiqueta: "lbd", valor: resultado.r.anclaje.recto.lbdMm }, limite: { etiqueta: "disponible", valor: Math.min(resultado.r.anclaje.disponibleIzqM, resultado.r.anclaje.disponibleMontoyaIzqM) * 1000 }, unidad: "mm", exige: "≤", decimales: 0 }}
                  />
                  <ResultadoCheck
                    etiqueta="Anclaje recto · apoyo derecho"
                    verifica={resultado.r.anclaje.recto.verificaDer && resultado.r.anclaje.recto.verificaDerMontoya}
                    detalle={`${fmt(resultado.r.anclaje.disponibleDerM * 1000, 0)} mm desde la cara (Anejo 19) y ${fmt(resultado.r.anclaje.disponibleMontoyaDerM * 1000, 0)} mm desde el eje (Montoya)`}
                    comparacion={{ real: { etiqueta: "lbd", valor: resultado.r.anclaje.recto.lbdMm }, limite: { etiqueta: "disponible", valor: Math.min(resultado.r.anclaje.disponibleDerM, resultado.r.anclaje.disponibleMontoyaDerM) * 1000 }, unidad: "mm", exige: "≤", decimales: 0 }}
                  />
                  {!resultado.r.anclaje.verificaRecto && (
                    <>
                      <ResultadoCheck
                        etiqueta="Anclaje con horquilla · apoyo izquierdo"
                        verifica={resultado.r.anclaje.horquilla.verificaIzq && resultado.r.anclaje.horquilla.verificaIzqMontoya}
                        detalle={`lbd ${fmt(resultado.r.anclaje.horquilla.lbdMm, 0)} mm · desarrollo ${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleIzqMm, 0)} mm`}
                      />
                      <ResultadoCheck
                        etiqueta="Anclaje con horquilla · apoyo derecho"
                        verifica={resultado.r.anclaje.horquilla.verificaDer && resultado.r.anclaje.horquilla.verificaDerMontoya}
                        detalle={`lbd ${fmt(resultado.r.anclaje.horquilla.lbdMm, 0)} mm · desarrollo ${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleDerMm, 0)} mm`}
                      />
                      <ResultadoCheck
                        etiqueta="La horquilla cabe en el ancho de la viga"
                        verifica={resultado.r.anclaje.geometriaHorquilla.cabeEnElAncho}
                        comparacion={{ real: { etiqueta: "ocupa", valor: resultado.r.anclaje.geometriaHorquilla.anchoOcupadoEnPlantaM * 1000 }, limite: { etiqueta: "libre entre estribos", valor: resultado.r.anclaje.geometriaHorquilla.anchoLibreM * 1000 }, unidad: "mm", exige: "≤", decimales: 0 }}
                      />
                    </>
                  )}
                  <PanelFormulas
                    titulo="Ver desarrollo de la longitud de anclaje"
                    filas={[
                      { etiqueta: "Tensión de la barra σsd = T/As,real", valor: `${fmt(resultado.r.anclaje.sigmaSdMPa, 1)} MPa` },
                      { etiqueta: "fctd = αct·0,7·fctm/γc (ec. 3.16)", valor: `${fmt(resultado.r.anclaje.fctdMPa, 3)} MPa` },
                      { etiqueta: "η1 · η2", valor: `${fmt(resultado.r.anclaje.eta1, 2)} · ${fmt(resultado.r.anclaje.eta2, 2)}` },
                      { etiqueta: "fbd = 2,25·η1·η2·fctd (ec. 8.2)", valor: `${fmt(resultado.r.anclaje.fbdMPa, 3)} MPa` },
                      { etiqueta: "lb,rqd = (Ø/4)·(σsd/fbd) (ec. 8.3)", valor: `${fmt(resultado.r.anclaje.lbRqdMm, 0)} mm` },
                      { etiqueta: "cd = mín(a/2; c1; c) (fig. A19.8.3)", valor: `${fmt(resultado.r.anclaje.cdMm, 1)} mm` },
                      { etiqueta: "Recta: α1 · α2·α3·α5 (tabla A19.8.2)", valor: `${fmt(resultado.r.anclaje.recto.alfa1, 2)} · ${fmt(resultado.r.anclaje.recto.producto235, 2)}` },
                      { etiqueta: "Recta: lbd = α·lb,rqd ≥ lb,min (ec. 8.4)", valor: `${fmt(resultado.r.anclaje.recto.lbdMm, 0)} mm (lb,min ${fmt(resultado.r.anclaje.recto.lbMinMm, 0)} mm)` },
                      { etiqueta: "Horquilla: α1 · α2·α3·α5", valor: `${fmt(resultado.r.anclaje.horquilla.alfa1, 2)} · ${fmt(resultado.r.anclaje.horquilla.producto235, 2)}` },
                      { etiqueta: "Horquilla: lbd", valor: `${fmt(resultado.r.anclaje.horquilla.lbdMm, 0)} mm` },
                    ]}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la horquilla"
                    filas={[
                      { etiqueta: "Nº de horquillas (una cada dos barras)", valor: `${resultado.r.anclaje.geometriaHorquilla.numeroHorquillas}` },
                      { etiqueta: "Mandril mínimo de tabla A19.8.1 (4Ø si Ø≤16; 7Ø si no)", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.mandrilMinimoTablaMm, 0)} mm` },
                      { etiqueta: "Tracción de una barra Fbt = σsd·AØ", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.fbtKN, 0)} kN` },
                      { etiqueta: "ab = recubrimiento + Ø/2 (barra de esquina)", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.abMm, 0)} mm` },
                      { etiqueta: "Mandril por rotura del hormigón, ec. (8.1)", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.mandrilPorHormigonMm, 0)} mm` },
                      { etiqueta: "¿Exenta de comprobar el hormigón? (art. 8.3(3))", valor: resultado.r.anclaje.geometriaHorquilla.exentaDeComprobarMandril ? "sí, la rama de vuelta no pasa de 5Ø" : "no, hay que comprobarlo" },
                      { etiqueta: "Mandril adoptado Øm", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.mandrilAdoptadoMm, 0)} mm` },
                      { etiqueta: "Desarrollo del codo de 180°: π·(Øm+Ø)/2", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloCodoMm, 0)} mm` },
                      { etiqueta: "Rama de ida izq. / der.", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.ramaIdaIzqMm, 0)} / ${fmt(resultado.r.anclaje.geometriaHorquilla.ramaIdaDerMm, 0)} mm` },
                      { etiqueta: "Desarrollo total 2·ida + codo, izq. / der.", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleIzqMm, 0)} / ${fmt(resultado.r.anclaje.geometriaHorquilla.desarrolloDisponibleDerMm, 0)} mm` },
                      { etiqueta: "Rama de vuelta que falta, izq. / der.", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.ramaVueltaIzqMm, 0)} / ${fmt(resultado.r.anclaje.geometriaHorquilla.ramaVueltaDerMm, 0)} mm` },
                      { etiqueta: "Ancho que ocupa el lazo en planta: Øm + 2Ø", valor: `${fmt(resultado.r.anclaje.geometriaHorquilla.anchoOcupadoEnPlantaM * 1000, 0)} mm` },
                    ]}
                  />
                  <PanelAyuda titulo="Por qué la horquilla sirve por geometría y no por coeficiente">
                    <p>
                      Doblar la barra sólo bonifica (α1 = 0,7) si cd &gt; 3Ø; con recubrimientos normales
                      la horquilla exige la misma lbd que la recta. Sirve porque, doblada en planta
                      (Montoya fig. 24.25b), en el mismo hueco desarrolla 2·ida + el arco del codo,
                      casi el triple, sin invadir la biela.
                    </p>
                    <p>
                      El mandril es el mayor entre el de tabla y el de la ec. (8.1); el segundo sólo se
                      comprueba si tras el codo quedan más de 5Ø (art. 8.3(3)).
                    </p>
                  </PanelAyuda>
                  <ResultadoCheck
                    etiqueta="Malla horizontal ≥ mínimo del art. 9.7(1)"
                    verifica={resultado.r.malla.verificaHorizontal}
                    comparacion={{ real: { etiqueta: "dispuesta", valor: resultado.r.malla.horizontalCm2PorM }, limite: { etiqueta: "mínima", valor: resultado.r.malla.asMinCm2PorM }, unidad: "cm²/m por cara", exige: "≥" }}
                  />
                  <ResultadoCheck
                    etiqueta="Malla vertical ≥ mínimo del art. 9.7(1)"
                    verifica={resultado.r.malla.verificaVertical}
                    comparacion={{ real: { etiqueta: "dispuesta", valor: resultado.r.malla.verticalCm2PorM }, limite: { etiqueta: "mínima", valor: resultado.r.malla.asMinCm2PorM }, unidad: "cm²/m por cara", exige: "≥" }}
                  />
                  <ResultadoCheck
                    etiqueta="Separaciones de la malla ≤ mín(300 mm; 2·b), art. 9.7(2)"
                    verifica={resultado.r.malla.verificaSeparacionHorizontal && resultado.r.malla.verificaSeparacionVertical}
                    comparacion={{ real: { etiqueta: "máx dispuesta", valor: resultado.r.malla.separacionMaxM * 100 }, limite: { etiqueta: "tope", valor: Math.min(30, resultado.n.b * 200) }, unidad: "cm", exige: "≤", decimales: 0 }}
                  />
                  {resultado.r.cuelgue && (
                    <ResultadoCheck
                      etiqueta="Canto suficiente para que se formen las bielas de cuelgue (h ≥ 1,2·a)"
                      verifica={resultado.r.cuelgue.verificaCantoMinimo}
                      comparacion={{ real: { etiqueta: "h", valor: resultado.n.h }, limite: { etiqueta: "1,2·a", valor: resultado.r.cuelgue.cantoMinimoM }, unidad: "m", exige: "≥" }}
                    />
                  )}
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
