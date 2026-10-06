"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramaPresionSuelo } from '@/components/verificaciones/hormigon/DiagramaPresionSuelo';
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { CroquisCargasZapata } from "@/components/verificaciones/croquis/CroquisCimentacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { SolicitacionesZapataDiagrama } from "@/components/verificaciones/hormigon/SolicitacionesZapataDiagrama";
import { TarjetaLadoZapata } from "@/components/verificaciones/hormigon/TarjetaLadoZapata";
import { CorteArmaduraZapata } from "@/components/verificaciones/hormigon/CorteArmaduraZapata";
import { CamposArmaduraTirante, EXTREMOS_TIRANTE } from "@/components/verificaciones/hormigon/CamposArmaduraTirante";
import { VerificacionArmaduraTirante } from "@/components/verificaciones/hormigon/VerificacionArmaduraTirante";
import { verificarArmaduraTirante } from "@/lib/calc/hormigon/cimentaciones/tirante-rozamiento";
import { DiagramaTiranteTerreno } from "@/components/verificaciones/hormigon/DiagramaTiranteTerreno";
import { ZapataDiagrama } from "@/components/verificaciones/hormigon/ZapataDiagrama";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import {
  calcularZapataAislada,
  type ResultadoDireccionZapata,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { PropuestaVigaCentradora } from "@/components/verificaciones/hormigon/PropuestaVigaCentradora";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapatas")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const POSICIONES = ["Centrado", "Ubicación libre", "Contra la medianera (borde en A)"] as const;
const EQUILIBRIOS = ["Lo toma el terreno", "Par tirante–terreno"] as const;

const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

export default function ZapataAisladaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "2");
  const [B, setB] = useCampo("B", "1.5");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");

  const [anchoPilarA, setAnchoPilarA] = useCampo("anchoPilarA", "0.4");
  const [anchoPilarB, setAnchoPilarB] = useCampo("anchoPilarB", "0.3");
  // Dónde cae el pilar. La zapata de medianería es el caso con el pilar
  // contra el borde de inicio en A.
  const [posicionPilar, setPosicionPilar] = useCampo("posicionPilar", POSICIONES[0]);
  const [distanciaBordeA, setDistanciaBordeA] = useCampo("distanciaBordeA", "0");
  const [distanciaBordeB, setDistanciaBordeB] = useCampo("distanciaBordeB", "0.6");
  // "Contra la medianera" es un atajo: deja el pilar en ubicación libre con la
  // cara al ras del borde de inicio en A y centrado en B.
  const descentrado = posicionPilar === POSICIONES[1];
  // Quién toma el momento de la excentricidad en A. El tirante sólo tiene
  // sentido con el pilar descentrado.
  const [equilibrioA, setEquilibrioA] = useCampo("equilibrioA", EQUILIBRIOS[0]);
  const [brazoTirante, setBrazoTirante] = useCampo("brazoTirante", "3");
  const [phiTerreno, setPhiTerreno] = useCampo("phiTerreno", "30");
  // Barras del tirante, en la losa.
  const [diametroTirante, setDiametroTirante] = useCampo("diametroTirante", "12");
  const [numeroTirante, setNumeroTirante] = useCampo("numeroTirante", "4");
  const [recubrimientoTirante, setRecubrimientoTirante] = useCampo("recubrimientoTirante", "0.03");
  const [extremoTirante, setExtremoTirante] = useCampo("extremoTirante", EXTREMOS_TIRANTE[0]);
  const [pataTirante, setPataTirante] = useCampo("pataTirante", "150");
  const [adherenciaTirante, setAdherenciaTirante] = useCampo("adherenciaTirante", "Buena");
  const conTirante = descentrado && equilibrioA === EQUILIBRIOS[1];

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "500");
  const [MkA, setMkA] = useCampo("MkA", "50");
  const [MkB, setMkB] = useCampo("MkB", "20");

  const [numeroA, setNumeroA] = useCampo("numeroA", "8");
  const [diametroA, setDiametroA] = useCampo("diametroA", "16");
  const [numeroB, setNumeroB] = useCampo("numeroB", "6");
  const [diametroB, setDiametroB] = useCampo("diametroB", "16");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      B: aNumero(B),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      Nk: aNumero(Nk),
      MkA: aNumero(MkA),
      MkB: aNumero(MkB),
      numeroA: aNumero(numeroA),
      diametroA: aNumero(diametroA),
      numeroB: aNumero(numeroB),
      diametroB: aNumero(diametroB),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0 && v.anchoPilarA > 0 && v.anchoPilarB > 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
    const armadurasValidas = v.numeroA > 0 && v.diametroA > 0 && v.numeroB > 0 && v.diametroB > 0;
    const cargasValidas = v.Nk > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
      return null;
    }

    // Con ubicación libre, el pilar tiene que quedar dentro de la zapata.
    const bordeA = aNumero(distanciaBordeA);
    const bordeB = aNumero(distanciaBordeB);
    if (descentrado) {
      if (!(bordeA >= 0 && bordeA + v.anchoPilarA <= v.A + 1e-9)) return null;
      if (!(bordeB >= 0 && bordeB + v.anchoPilarB <= v.B + 1e-9)) return null;
    }

    const brazo = aNumero(brazoTirante);
    const phi = aNumero(phiTerreno);
    if (conTirante && !(brazo > 0 && phi > 0 && phi < 90)) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = {
      A: v.A,
      B: v.B,
      H: v.H,
      anchoPilarA: v.anchoPilarA,
      anchoPilarB: v.anchoPilarB,
      recubrimiento: v.recubrimiento,
      ...(descentrado ? { distanciaBordeA: bordeA, distanciaBordeB: bordeB } : {}),
    };

    const zapata = calcularZapataAislada(materiales, geometria, v.sigmaAdmisible, {
      cargas: { Nk: v.Nk, MkA: v.MkA, MkB: v.MkB },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
      formaAnclaje,
      ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
    });

    // Armadura del tirante: sólo si hay tirante y las barras son válidas.
    const t = {
      f: aNumero(diametroTirante), n: aNumero(numeroTirante),
      rec: aNumero(recubrimientoTirante), pata: aNumero(pataTirante),
    };
    const patillaTirante = extremoTirante === EXTREMOS_TIRANTE[1];
    const barrasValidas = t.f > 0 && t.n > 0 && t.rec >= 0 && (!patillaTirante || t.pata >= 0);
    const armaduraTirante =
      zapata.tirante && barrasValidas
        ? verificarArmaduraTirante(materiales, {
            tdKN: zapata.tirante.tdKN,
            diametroMm: t.f,
            asRealCm2: (t.n * Math.PI * (t.f / 10) ** 2) / 4,
            anchoApoyoM: v.anchoPilarA,
            recubrimientoM: t.rec,
            forma: patillaTirante ? "gancho" : "recta",
            pataMm: patillaTirante ? t.pata : 0,
            situacion: adherenciaTirante === "Mala" ? "mala" : "buena",
          })
        : undefined;

    return { zapata, armaduraTirante };
  }, [
    fck, fyk, A, B, H, recubrimiento, anchoPilarA, anchoPilarB, descentrado, distanciaBordeA, distanciaBordeB,
    sigmaAdmisible, Nk, MkA, MkB, numeroA, diametroA, numeroB, diametroB, formaAnclaje,
    conTirante, brazoTirante, phiTerreno,
    diametroTirante, numeroTirante, recubrimientoTirante, extremoTirante, pataTirante, adherenciaTirante,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      B: aNumero(B),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      numeroA: aNumero(numeroA),
      numeroB: aNumero(numeroB),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    return {
      AM: v.A,
      BM: v.B,
      anchoPilarAM: v.anchoPilarA,
      anchoPilarBM: v.anchoPilarB,
      numeroA: v.numeroA,
      numeroB: v.numeroB,
      ...(descentrado
        ? { distanciaBordeAM: aNumero(distanciaBordeA), distanciaBordeBM: aNumero(distanciaBordeB) }
        : {}),
    };
  }, [A, B, anchoPilarA, anchoPilarB, numeroA, numeroB, descentrado, distanciaBordeA, distanciaBordeB]);

  /** Al pasar a ubicación libre, el pilar arranca centrado: así nada salta. */
  const cambiarPosicion = (valor: string) => {
    const centro = (lado: string, pilar: string) => {
      const c = (aNumero(lado) - aNumero(pilar)) / 2;
      return Number.isFinite(c) && c >= 0 ? String(Math.round(c * 1000) / 1000) : "0";
    };
    if (valor === POSICIONES[2]) {
      setDistanciaBordeA("0");
      setDistanciaBordeB(centro(B, anchoPilarB));
      setPosicionPilar(POSICIONES[1]);
      return;
    }
    if (valor === POSICIONES[1] && !descentrado) {
      setDistanciaBordeA(centro(A, anchoPilarA));
      setDistanciaBordeB(centro(B, anchoPilarB));
    }
    setPosicionPilar(valor);
  };

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: descentrado
        ? "Hay datos vacíos o no válidos, o el pilar queda fuera de la zapata: la distancia de su cara al borde más su ancho no puede superar el lado."
        : "Hay datos vacíos o no válidos: no se puede calcular.",
    });
  } else if (resultado.zapata.tirante && !resultado.zapata.tirante.geometriaValida) {
    avisos.push({
      tipo: "error",
      texto: "El brazo del tirante tiene que ser mayor que el canto de la zapata: se mide del eje del tirante a la base.",
    });
  } else if (!Number.isFinite(resultado.zapata.geotecnico.sigmaKPa)) {
    avisos.push({
      tipo: "error",
      texto: "La resultante cae fuera de la base: la zapata no tiene apoyo posible. Hay que agrandarla, centrar el pilar o reducir el momento.",
    });
  } else if (!resultado.zapata.dentroDelNucleo) {
    avisos.push({
      tipo: "error",
      texto: "La resultante sale del núcleo central y la zapata se despega: no verifica el terreno. Con el pilar descentrado, agrandar la zapata casi no ayuda; las salidas habituales son una viga centradora o el par tirante–terreno.",
    });
  }
  if (resultado?.zapata.punzonamiento.situacion && resultado.zapata.punzonamiento.situacion !== "interior") {
    avisos.push({
      tipo: "aviso",
      texto: `Punzonamiento con el pilar como pilar de ${resultado.zapata.punzonamiento.situacion === "esquina" ? "esquina" : "borde"}: perímetro recortado y β de los art. 6.4.2 (4) y 6.4.3 (4)-(5), que son reglas de losas extendidas a zapatas.`,
    });
  }

  const punzonamientoEvaluado = !resultado?.zapata.punzonamiento.motivoNoEvaluado;

  /**
   * Vuelos que se muestran y se comprueban en cada dirección: con el pilar
   * centrado basta el que gobierna; descentrado, los dos, porque cada uno tiene
   * su propio largo y su propia presión.
   */
  const vuelosAMostrar = (dir: "A" | "B"): { nombre: string; r: ResultadoDireccionZapata }[] => {
    if (!resultado) return [];
    const z = resultado.zapata;
    if (!descentrado) return [{ nombre: `Dirección ${dir}`, r: dir === "A" ? z.direccionA : z.direccionB }];
    const v = dir === "A" ? z.vuelosA : z.vuelosB;
    const [inicio, fin] = dir === "A" ? ["izquierdo", "derecho"] : ["superior", "inferior"];
    return [
      { nombre: `Dirección ${dir} — vuelo ${inicio}`, r: v.inicio },
      { nombre: `Dirección ${dir} — vuelo ${fin}`, r: v.fin },
    ];
  };

  /** Armadura, anclaje y cortante de una dirección: el peor de sus vuelos. */
  const comprobacionesDireccion = (dir: "A" | "B", vuelos: { nombre: string; r: ResultadoDireccionZapata }[]) => {
    const todos = (f: (r: ResultadoDireccionZapata) => boolean) => vuelos.every((v) => f(v.r));
    const maximo = (f: (r: ResultadoDireccionZapata) => number | undefined) => {
      const valores = vuelos.map((v) => f(v.r)).filter((x): x is number => x !== undefined && Number.isFinite(x));
      return valores.length ? Math.max(...valores) : undefined;
    };
    return [
      {
        etiqueta: `armadura en ${dir}`,
        estado: todos((r) => r.verificaAs) ? ("cumple" as const) : ("no-cumple" as const),
        utilizacion: maximo((r) => r.asNecCm2 / r.asRealCm2),
      },
      {
        etiqueta: `anclaje en ${dir}`,
        estado: todos((r) => r.anclaje.verifica) ? ("cumple" as const) : ("no-cumple" as const),
        utilizacion: maximo((r) => (r.anclaje.comprobado ? r.anclaje.lbdMm / r.anclaje.disponibleMm : undefined)),
      },
      {
        etiqueta: `cortante en ${dir}`,
        estado: todos((r) => r.verificaCorte) ? ("cumple" as const) : ("no-cumple" as const),
        utilizacion: maximo((r) => (r.vRdCKN > 0 ? r.vEdKN / r.vRdCKN : undefined)),
      },
    ];
  };

  // Corte por A de la parrilla: las barras de A en el plano, las de B de punta.
  // La separación se deduce como en el cálculo: ancho menos recubrimientos y
  // un diámetro, repartido entre n − 1 huecos.
  const corteArmadura = (() => {
    const v = {
      A: aNumero(A), B: aNumero(B), H: aNumero(H), rec: aNumero(recubrimiento),
      cA: aNumero(anchoPilarA), nA: aNumero(numeroA), fA: aNumero(diametroA), nB: aNumero(numeroB), fB: aNumero(diametroB),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    const sep = (ancho: number, n: number, f: number) => (n > 1 ? (ancho - 2 * v.rec - f / 1000) / (n - 1) : NaN);
    const bordeA = aNumero(distanciaBordeA);
    const dA = v.H - v.rec - v.fA / 2000;
    const dB = dA - v.fA / 2000 - v.fB / 2000;
    return (
      <CorteArmaduraZapata
        largoM={v.A}
        HM={v.H}
        anchoApoyoM={v.cA}
        distanciaBordeM={descentrado && Number.isFinite(bordeA) ? bordeA : undefined}
        recubrimientoM={v.rec}
        diametroA1Mm={v.fA}
        numeroA2={v.nB}
        diametroA2Mm={v.fB}
        patilla={formaAnclaje === "gancho"}
        apoyo="pilar"
        resumen={[
          { etiqueta: "A1 · dir. A", valor: `${v.nA} Ø${v.fA} c/${fmt(sep(v.B, v.nA, v.fA), 2)} m` },
          { etiqueta: "A2 · dir. B", valor: `${v.nB} Ø${v.fB} c/${fmt(sep(v.A, v.nB, v.fB), 2)} m` },
          { etiqueta: "Extremo", valor: FORMAS[formaAnclaje].toLowerCase() },
          { etiqueta: "d A / d B", valor: `${fmt(dA, 2)} / ${fmt(dB, 2)} m` },
          { etiqueta: "Recubrimiento", valor: `${fmt(v.rec, 2)} m` },
        ]}
      />
    );
  })();

  const planta = diagrama ? (
    <ZapataDiagrama {...diagrama} />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">
      La planta se dibuja cuando la geometría y el armado tienen valores válidos.
    </p>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="La zapata, el pilar que apoya y el terreno.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales y suelo">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="sigmaAdmisible" etiqueta="σ adm. suelo" sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Zapata">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CampoNumerico id="A" etiqueta="A" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="B" etiqueta="B" sufijo="m" valor={B} onChange={setB} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="anchoPilarA" etiqueta="Ancho // A" sufijo="m" valor={anchoPilarA} onChange={setAnchoPilarA} />
                    <CampoNumerico id="anchoPilarB" etiqueta="Ancho // B" sufijo="m" valor={anchoPilarB} onChange={setAnchoPilarB} />
                    <div className="col-span-2">
                      <CampoSeleccion
                        id="posicionPilar"
                        etiqueta="Dónde cae el pilar"
                        valor={posicionPilar}
                        opciones={POSICIONES}
                        onChange={cambiarPosicion}
                      />
                    </div>
                    {descentrado && (
                      <>
                        <CampoNumerico id="distanciaBordeA" etiqueta="Cara al borde, A" sufijo="m" valor={distanciaBordeA} onChange={setDistanciaBordeA} />
                        <CampoNumerico id="distanciaBordeB" etiqueta="Cara al borde, B" sufijo="m" valor={distanciaBordeB} onChange={setDistanciaBordeB} />
                        <p className="col-span-2 text-xs text-muted-foreground">
                          Distancia de la cara del pilar al borde izquierdo (A) y al superior (B) de la
                          planta. 0 en A es el pilar contra la medianera. El momento del descentramiento,
                          Nk·e, sale solo: no hace falta cargarlo en Mk.
                        </p>
                        <div className="col-span-2">
                          <CampoSeleccion
                            id="equilibrioA"
                            etiqueta="Quién toma el momento en A"
                            valor={equilibrioA}
                            opciones={EQUILIBRIOS}
                            onChange={setEquilibrioA}
                          />
                        </div>
                        {conTirante && (
                          <>
                            <CampoNumerico id="brazoTirante" etiqueta="h: tirante → base" sufijo="m" valor={brazoTirante} onChange={setBrazoTirante} />
                            <CampoNumerico id="phiTerreno" etiqueta="φ' del terreno" sufijo="°" valor={phiTerreno} onChange={setPhiTerreno} />
                            <p className="col-span-2 text-xs text-muted-foreground">
                              La losa tira del pilar arriba y el rozamiento lo frena en la base: ese par toma
                              el momento en A y la presión queda uniforme. h va del eje del tirante a la base
                              de la zapata.
                            </p>
                            <div className="col-span-2 max-w-sm">
                              <DiagramaTiranteTerreno elemento="pilar" hM={aNumero(brazoTirante)} HM={aNumero(H)} />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={planta}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Esfuerzos característicos que baja el pilar.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
                <CampoNumerico id="MkA" etiqueta="Mk A" sufijo="kN·m" valor={MkA} onChange={setMkA} />
                <CampoNumerico id="MkB" etiqueta="Mk B" sufijo="kN·m" valor={MkB} onChange={setMkB} />
                <p className="col-span-3 text-xs text-muted-foreground">
                  Mk es el momento que baja por el pilar, positivo hacia el borde derecho (A) o
                  inferior (B).{descentrado ? " El del descentramiento se suma solo." : ""}
                </p>
              </div>
            }
            dibujo={
              resultado ? (
                <SolicitacionesZapataDiagrama
                  anchoM={aNumero(A)}
                  cantoM={aNumero(H)}
                  anchoPilarM={aNumero(anchoPilarA)}
                  nkKN={aNumero(Nk)}
                  mkKNm={aNumero(MkA)}
                  sigmaMaxKPa={resultado.zapata.direccionA.sigmaMaxKPa}
                  sigmaMinKPa={resultado.zapata.direccionA.sigmaMinKPa}
                  longitudContactoM={resultado.zapata.direccionA.longitudContactoM}
                />
              ) : (
                <CroquisCargasZapata />
              )
            }
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Parrilla inferior en las dos direcciones.">
          <DatosConDibujo
            datos={
              <>
              <Subgrupo titulo="Parrilla">
                <EditorCapas
                  filas={[
                    {
                      posicion: "Dirección A",
                      numero: { id: "numeroA", valor: numeroA, onChange: setNumeroA },
                      diametro: { id: "diametroA", valor: diametroA, onChange: setDiametroA },
                    },
                    {
                      posicion: "Dirección B",
                      numero: { id: "numeroB", valor: numeroB, onChange: setNumeroB },
                      diametro: { id: "diametroB", valor: diametroB, onChange: setDiametroB },
                    },
                  ]}
                />
                <div className="max-w-xs">
                  <CampoSeleccion
                    id="formaAnclaje"
                    etiqueta="Extremo de las barras"
                    valor={FORMAS[formaAnclaje]}
                    opciones={Object.values(FORMAS)}
                    onChange={(v) => setFormaAnclaje(formaPorNombre(v))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Las barras de la dirección A son las paralelas al lado A y resisten el vuelo en esa dirección.
                  Si la barra recta no alcanza a anclar, el art. 9.8.2.2 (4) permite doblarla en patilla.
                </p>
              </Subgrupo>
                {conTirante && (
                  <CamposArmaduraTirante
                    modo="cantidad"
                    diametro={{ valor: diametroTirante, onChange: setDiametroTirante }}
                    cantidadOSeparacion={{ valor: numeroTirante, onChange: setNumeroTirante }}
                    recubrimiento={{ valor: recubrimientoTirante, onChange: setRecubrimientoTirante }}
                    extremo={{ valor: extremoTirante, onChange: setExtremoTirante }}
                    pata={{ valor: pataTirante, onChange: setPataTirante }}
                    adherencia={{ valor: adherenciaTirante, onChange: setAdherenciaTirante }}
                  />
                )}
              </>
            }
            dibujo={
              <div className="flex flex-col gap-6">
                {planta}
                {corteArmadura}
              </div>
            }
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × B × H", valor: `${A} × ${B} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              {
                etiqueta: "Pilar",
                valor: descentrado
                  ? `${anchoPilarA} × ${anchoPilarB} m, cara a ${distanciaBordeA} m (A) y ${distanciaBordeB} m (B) del borde`
                  : `${anchoPilarA} × ${anchoPilarB} m, centrado`,
              },
              { etiqueta: "Nk · Mk A · Mk B", valor: `${Nk} kN · ${MkA} · ${MkB} kN·m` },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN`, derivado: true },
                    {
                      etiqueta: "e terreno A · B",
                      valor: `${fmt(resultado.zapata.excentricidadA, 3)} · ${fmt(resultado.zapata.excentricidadB, 3)} m`,
                      derivado: true,
                    },
                    { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "La tensión sobre el terreno incluye el peso propio de la zapata, también en la excentricidad: e = (Nk·e0 + Mk) / (Nk + PP), con e0 el descentramiento del pilar.",
              "La resultante tiene que caer dentro del núcleo central en las dos direcciones (e ≤ L/6): sin despegue. La tensión se comprueba por el área eficaz.",
              "Con el pilar descentrado cada vuelo tiene su propio momento y se arma por separado con las mismas barras; la zapata de medianería es el caso con el pilar contra el borde.",
              "Con par tirante–terreno, el tirante a h de la base anula el momento en A: Tk = (Nk·e + Mk)/h, presión uniforme (DB SE-C, art. 4.3.1.3 (6)), deslizamiento Tk ≤ (N + P)·tan(3/4·φ')/1,5 (DB SE-C, art. 4.2.3.1 (4) y tabla 2.1) y armadura del tirante 1,5·Tk/fyd. Al pilar le queda Mk + Tk·(h − H) en el arranque.",
              "Punzonamiento según el Anejo 19, art. 6.4.4 (2): se barren los perímetros hasta 2d (o hasta el vuelo, si es menor) y se informa el que peor verifica. El momento entra por la ec. (6.51), con MEd = 1,5·Mk sin descontar el contramomento del terreno y los dos ejes sumados.",
              "Con el pilar descentrado, el punzonamiento descuenta la presión real bajo el perímetro (lineal en las dos direcciones) y el β usa sólo el momento propio del pilar. Cerca de un borde (a menos de 2d), el perímetro se recorta como en la fig. A19.6.15 y el β es el de pilar de borde o esquina (ecs. (6.44)-(6.46)).",
              "Flexión por el modelo del Anejo 19, art. 9.8.2.2: sección de cálculo a 0,15·c dentro de la cara del pilar, Fs = M/(0,9·d) y As = Fs/fyd.",
              "Cuantía mínima de tracción del art. 9.2.1.1 (1), ec. (9.1), la misma que en vigas y losas. φ ≥ 12 mm (art. 9.8.2.1 (1)).",
              "Anclaje (art. 8.4) comprobado desde x = h/2 hasta la sección de cálculo: Fs(x) tiene que anclarse en el largo que queda medido sobre el eje de la barra (art. 8.4.3 (3)): x menos el recubrimiento y, con patilla, más la pata hasta H − 2·rec, sin contar el doblez. Buena adherencia, α3 = α5 = 1.",
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
              <ConclusionResultados
                comprobaciones={[
                  {
                    etiqueta: "tensión del terreno",
                    estado: resultado.zapata.geotecnico.verificaTension ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.geotecnico.sigmaKPa / aNumero(sigmaAdmisible),
                  },
                  ...(["A", "B"] as const).flatMap((dir) => comprobacionesDireccion(dir, vuelosAMostrar(dir))),
                  {
                    etiqueta: "diámetro mínimo φ12",
                    estado:
                      resultado.zapata.direccionA.verificaDiametroMinimo && resultado.zapata.direccionB.verificaDiametroMinimo
                        ? "cumple"
                        : "no-cumple",
                  },
                  {
                    etiqueta: "punzonamiento",
                    estado: punzonamientoEvaluado
                      ? resultado.zapata.punzonamiento.verificaPunzonamiento
                        ? "cumple"
                        : "no-cumple"
                      : "no-evaluado",
                    utilizacion: punzonamientoEvaluado ? resultado.zapata.punzonamiento.aprovechamiento : undefined,
                  },
                  {
                    etiqueta: "bielas en la cara del pilar",
                    estado: punzonamientoEvaluado
                      ? resultado.zapata.punzonamiento.caraPilar.verifica
                        ? "cumple"
                        : "no-cumple"
                      : "no-evaluado",
                    utilizacion: punzonamientoEvaluado
                      ? resultado.zapata.punzonamiento.caraPilar.vEdMPa / resultado.zapata.punzonamiento.caraPilar.vRdMaxMPa
                      : undefined,
                  },
                ]}
              />

              {descentrado && !conTirante && Math.abs(resultado.zapata.vuelosA.excentricidadPilarM) > 1e-9 && (
                <PropuestaVigaCentradora necesaria={!resultado.zapata.geotecnico.verificaTension} />
              )}

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                  { etiqueta: "As nec. A / B", valor: `${fmt(resultado.zapata.direccionA.asNecCm2)} / ${fmt(resultado.zapata.direccionB.asNecCm2)} cm²` },
                  { etiqueta: "d A / B", valor: `${fmt(resultado.zapata.direccionA.dM, 3)} / ${fmt(resultado.zapata.direccionB.dM, 3)} m` },
                  { etiqueta: "Punzonamiento", valor: `${fmt(resultado.zapata.punzonamiento.vEdKN)} kN`, nota: `VRd,c ${fmt(resultado.zapata.punzonamiento.vRdCKN)} kN` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.zapata.geotecnico.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <div className="grid gap-6 pt-4 md:grid-cols-2">
                    <DiagramaPresionSuelo
                      distribucion={resultado.zapata.geotecnico.distribucionA}
                      lM={aNumero(A)}
                      sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                      etiqueta="Dirección A"
                    />
                    <DiagramaPresionSuelo
                      distribucion={resultado.zapata.geotecnico.distribucionB}
                      lM={aNumero(B)}
                      sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                      etiqueta="Dirección B"
                    />
                  </div>
                  <p className="pt-2 text-xs text-muted-foreground">
                    Mientras la resultante cae dentro del núcleo central la zapata apoya entera y el
                    diagrama es trapecial; si sale, el borde opuesto se levanta y la carga se
                    concentra en una cuña más corta.
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo geotécnico"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m` },
                    ]}
                  />
                </div>
              </Subgrupo>

              {resultado.zapata.tirante && (
                <Subgrupo titulo="Par tirante–terreno">
                  <div>
                    <ResultadoCheck
                      etiqueta="Deslizamiento de la zapata"
                      verifica={resultado.zapata.tirante.verificaDeslizamiento}
                      detalle={`CTE DB SE-C: δ = 3/4·φ' = ${fmt(resultado.zapata.tirante.deltaGrados, 1)}° (art. 4.2.3.1 (4)), cargas sin mayorar y γR = 1,5 (tabla 2.1).`}
                      comparacion={{
                        real: { etiqueta: "Tk", valor: Math.abs(resultado.zapata.tirante.tkKN) },
                        limite: { etiqueta: "(N+P)·tan δ/γR", valor: resultado.zapata.tirante.rozamientoResistenteKN },
                        unidad: "kN", exige: "≤",
                      }}
                    />
                    <PanelMetricas
                      horizontal
                      metricas={[
                        { etiqueta: "Tirante Tk / Td", valor: `${fmt(Math.abs(resultado.zapata.tirante.tkKN))} / ${fmt(resultado.zapata.tirante.tdKN)} kN` },
                        { etiqueta: "As tirante (losa)", valor: `${fmt(resultado.zapata.tirante.asTiranteCm2)} cm²`, nota: "Td/fyd, Anejo 19" },
                        { etiqueta: "Pilar: M arranque", valor: `${fmt(Math.abs(resultado.zapata.tirante.mPilarArranqueKNm))} kN·m`, nota: "característico" },
                        { etiqueta: "Pilar: V", valor: `${fmt(resultado.zapata.tirante.vPilarKN)} kN`, nota: "característico" },
                      ]}
                    />
                    <p className="pt-2 text-xs text-muted-foreground">
                      La armadura de la losa tiene que poder tomar el tirante, además de su propia flexión,
                      y anclarse en el pilar. El pilar queda en flexocompresión con M y V: se verifica
                      aparte. La zapata se arma con la presión uniforme y el punzonamiento usa el momento
                      del arranque del pilar.
                    </p>
                    {resultado.armaduraTirante && (
                      <VerificacionArmaduraTirante
                        elemento="pilar"
                        resultado={resultado.armaduraTirante}
                        descripcionBarras={`${numeroTirante} Ø${diametroTirante}`}
                        unidadAs="cm²"
                        anchoApoyoM={aNumero(anchoPilarA)}
                        recubrimientoM={aNumero(recubrimientoTirante)}
                        patilla={extremoTirante === EXTREMOS_TIRANTE[1]}
                        pataMm={aNumero(pataTirante)}
                        adherencia={adherenciaTirante}
                      />
                    )}
                  </div>
                </Subgrupo>
              )}

              <Subgrupo titulo="Comprobaciones estructurales">
                <div>
                  {(["A", "B"] as const).flatMap((dir) =>
                    vuelosAMostrar(dir).map((v) => <TarjetaLadoZapata key={v.nombre} titulo={v.nombre} resultado={v.r} />)
                  )}
                  <ResultadoCheck
                    etiqueta="Punzonamiento"
                    verifica={resultado.zapata.punzonamiento.verificaPunzonamiento}
                    estado={punzonamientoEvaluado ? undefined : "no-evaluado"}
                    detalle={
                      punzonamientoEvaluado
                        ? "Anejo 19, art. 6.4.4 (2), ec. (6.51) con los momentos de los dos ejes sumados. No viene de la planilla."
                        : resultado.zapata.punzonamiento.motivoNoEvaluado
                    }
                    comparacion={{
                      real: { etiqueta: "Vd", valor: resultado.zapata.punzonamiento.vEdKN },
                      limite: { etiqueta: "VRd,c", valor: resultado.zapata.punzonamiento.vRdCKN },
                      unidad: "kN", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Bielas en la cara del pilar"
                    verifica={resultado.zapata.punzonamiento.caraPilar.verifica}
                    estado={punzonamientoEvaluado ? undefined : "no-evaluado"}
                    detalle="Anejo 19, art. 6.4.5 (3), ec. (6.53): β·VEd/(u0·d) ≤ 0,4·ν·fcd."
                    comparacion={{
                      real: { etiqueta: "vEd", valor: resultado.zapata.punzonamiento.caraPilar.vEdMPa },
                      limite: { etiqueta: "vRd,max", valor: resultado.zapata.punzonamiento.caraPilar.vRdMaxMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del punzonamiento"
                    filas={[
                      { etiqueta: "d promedio", valor: `${fmt(resultado.zapata.punzonamiento.dPromedioM, 3)} m` },
                      ...(resultado.zapata.punzonamiento.situacion
                        ? [{ etiqueta: "Pilar tratado como", valor: resultado.zapata.punzonamiento.situacion }]
                        : []),
                      { etiqueta: "VEd,red (sin momento)", valor: `${fmt(resultado.zapata.punzonamiento.vEdRedKN)} kN` },
                      { etiqueta: "β por momento en el perímetro crítico", valor: fmt(resultado.zapata.punzonamiento.beta, 3) },
                      { etiqueta: "β en la cara del pilar (u1 a 2d)", valor: fmt(resultado.zapata.punzonamiento.caraPilar.beta, 3) },
                      {
                        etiqueta: "Perímetro crítico, a",
                        valor: `${fmt(resultado.zapata.punzonamiento.aCriticaM, 3)} m = ${fmt(resultado.zapata.punzonamiento.aCriticaM / resultado.zapata.punzonamiento.dPromedioM, 2)} d`,
                      },
                      { etiqueta: "Perímetro de control u", valor: `${fmt(resultado.zapata.punzonamiento.u1M, 2)} m` },
                      { etiqueta: "Aprovechamiento", valor: fmt(resultado.zapata.punzonamiento.aprovechamiento, 3) },
                    ]}
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
