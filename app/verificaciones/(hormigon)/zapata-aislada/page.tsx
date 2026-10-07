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
import { DiagramaTiranteTerreno } from "@/components/verificaciones/hormigon/DiagramaTiranteTerreno";
import { ZapataDiagrama } from "@/components/verificaciones/hormigon/ZapataDiagrama";
import { ComprobacionVuelco } from "@/components/verificaciones/hormigon/ComprobacionVuelco";
import { ComprobacionDeslizamiento } from "@/components/verificaciones/hormigon/ComprobacionDeslizamiento";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import {
  calcularZapataAislada,
  type ResultadoDireccionZapata,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { PropuestaVigaCentradora } from "@/components/verificaciones/hormigon/PropuestaVigaCentradora";
import { recomendarZapataAislada, type LadoAislada } from "@/lib/verificaciones/recomendaciones/zapata-aislada";
import { recomendarArmaduraTirante, verificarTirante, type EntradaArmaduraTirante } from "@/lib/verificaciones/recomendaciones/armadura-tirante";
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
  const [HkA, setHkA] = useCampo("HkA", "0");
  const [HkB, setHkB] = useCampo("HkB", "0");
  // Vacío = igual a Nk. Es la parte que estabiliza al vuelco y frena el deslizamiento.
  const [NkPermanente, setNkPermanente] = useCampo("NkPermanente", "");
  // Situación extraordinaria (sismo, impacto): otro juego de cargas, sólo para el terreno.
  const [conExtraordinaria, setConExtraordinaria] = useCampo("conExtraordinaria", "No");
  const [NkExt, setNkExt] = useCampo("NkExt", "500");
  const [NkPermanenteExt, setNkPermanenteExt] = useCampo("NkPermanenteExt", "");
  const [MkAExt, setMkAExt] = useCampo("MkAExt", "0");
  const [MkBExt, setMkBExt] = useCampo("MkBExt", "0");
  const [HkAExt, setHkAExt] = useCampo("HkAExt", "0");
  const [HkBExt, setHkBExt] = useCampo("HkBExt", "0");
  const extraordinariaActiva = conExtraordinaria === "Sí";

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
    const phiValido = phi > 0 && phi < 90;
    if (conTirante && !(brazo > 0 && phiValido)) return null;

    const hkA = aNumero(HkA);
    const hkB = aNumero(HkB);
    if (!Number.isFinite(hkA) || !Number.isFinite(hkB)) return null;
    // Vacío es "igual a Nk"; si se carga, no puede superarlo.
    const nkPermanente = NkPermanente.trim() === "" ? undefined : aNumero(NkPermanente);
    if (nkPermanente !== undefined && !(nkPermanente >= 0 && nkPermanente <= v.Nk)) return null;

    const ext = extraordinariaActiva
      ? {
          Nk: aNumero(NkExt), MkA: aNumero(MkAExt), MkB: aNumero(MkBExt), HkA: aNumero(HkAExt), HkB: aNumero(HkBExt),
          perm: NkPermanenteExt.trim() === "" ? undefined : aNumero(NkPermanenteExt),
        }
      : undefined;
    if (ext) {
      if (!(ext.Nk > 0) || ![ext.MkA, ext.MkB, ext.HkA, ext.HkB].every(Number.isFinite)) return null;
      if (ext.perm !== undefined && !(ext.perm >= 0 && ext.perm <= ext.Nk)) return null;
    }

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

    const datosZapata = {
      cargas: {
        Nk: v.Nk, MkA: v.MkA, MkB: v.MkB, HkA: hkA, HkB: hkB,
        ...(nkPermanente !== undefined ? { NkPermanente: nkPermanente } : {}),
      },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
      formaAnclaje,
      ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
      // Sin φ′ válido el deslizamiento queda sin evaluar, no se inventa.
      ...(phiValido ? { phiGrados: phi } : {}),
      ...(ext
        ? {
            extraordinaria: {
              Nk: ext.Nk, MkA: ext.MkA, MkB: ext.MkB, HkA: ext.HkA, HkB: ext.HkB,
              ...(ext.perm !== undefined ? { NkPermanente: ext.perm } : {}),
            },
          }
        : {}),
    };
    const zapata = calcularZapataAislada(materiales, geometria, v.sigmaAdmisible, datosZapata);
    const recomendaciones = recomendarZapataAislada({ fck: v.fck, fyk: v.fyk, geometria, sigmaAdmisibleKPa: v.sigmaAdmisible, datos: datosZapata });

    // Armadura del tirante: sólo si hay tirante y las barras son válidas.
    const t = {
      f: aNumero(diametroTirante), n: aNumero(numeroTirante),
      rec: aNumero(recubrimientoTirante), pata: aNumero(pataTirante),
    };
    const patillaTirante = extremoTirante === EXTREMOS_TIRANTE[1];
    const barrasValidas = t.f > 0 && t.n > 0 && t.rec >= 0 && (!patillaTirante || t.pata >= 0);
    const entradaTirante: EntradaArmaduraTirante | undefined =
      zapata.tirante && barrasValidas
        ? {
            fck: v.fck,
            fyk: v.fyk,
            tdKN: zapata.tirante.tdKN,
            barras: { tipo: "numero", numero: t.n, diametroMm: t.f },
            anchoApoyoM: v.anchoPilarA,
            recubrimientoM: t.rec,
            forma: patillaTirante ? "gancho" : "recta",
            pataMm: patillaTirante ? t.pata : 0,
            situacion: adherenciaTirante === "Mala" ? "mala" : "buena",
          }
        : undefined;
    const armaduraTirante = entradaTirante && verificarTirante(entradaTirante);
    const recomendacionesTirante = entradaTirante && recomendarArmaduraTirante(entradaTirante);

    return { zapata, armaduraTirante, recomendacionesTirante, recomendaciones };
  }, [
    fck, fyk, A, B, H, recubrimiento, anchoPilarA, anchoPilarB, descentrado, distanciaBordeA, distanciaBordeB,
    sigmaAdmisible, Nk, MkA, MkB, HkA, HkB, NkPermanente, numeroA, diametroA, numeroB, diametroB, formaAnclaje,
    conTirante, brazoTirante, phiTerreno,
    extraordinariaActiva, NkExt, NkPermanenteExt, MkAExt, MkBExt, HkAExt, HkBExt,
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
  type VueloMostrado = { nombre: string; r: ResultadoDireccionZapata; clave: `${"A" | "B"}.${LadoAislada}` };
  const rec = resultado?.recomendaciones ?? {};
  const recVuelo = (clave: VueloMostrado["clave"]) => ({
    as: rec[`${clave}.as`],
    anclaje: rec[`${clave}.anclaje`],
    corte: rec[`${clave}.corte`],
  });

  const vuelosAMostrar = (dir: "A" | "B"): VueloMostrado[] => {
    if (!resultado) return [];
    const z = resultado.zapata;
    if (!descentrado) return [{ nombre: `Dirección ${dir}`, r: dir === "A" ? z.direccionA : z.direccionB, clave: `${dir}.gobernante` }];
    const v = dir === "A" ? z.vuelosA : z.vuelosB;
    const [inicio, fin] = dir === "A" ? ["izquierdo", "derecho"] : ["superior", "inferior"];
    return [
      { nombre: `Dirección ${dir} — vuelo ${inicio}`, r: v.inicio, clave: `${dir}.inicio` },
      { nombre: `Dirección ${dir} — vuelo ${fin}`, r: v.fin, clave: `${dir}.fin` },
    ];
  };

  /** Armadura, anclaje y cortante de una dirección: el peor de sus vuelos. */
  const comprobacionesDireccion = (dir: "A" | "B", vuelos: VueloMostrado[]) => {
    const propuestas = (tipo: "as" | "anclaje" | "corte") => vuelos.some((v) => rec[`${v.clave}.${tipo}`]);
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
        conPropuestas: propuestas("as"),
      },
      {
        etiqueta: `anclaje en ${dir}`,
        estado: todos((r) => r.anclaje.verifica) ? ("cumple" as const) : ("no-cumple" as const),
        utilizacion: maximo((r) => (r.anclaje.comprobado ? r.anclaje.lbdMm / r.anclaje.disponibleMm : undefined)),
        conPropuestas: propuestas("anclaje"),
      },
      {
        etiqueta: `cortante en ${dir}`,
        estado: todos((r) => r.verificaCorte) ? ("cumple" as const) : ("no-cumple" as const),
        utilizacion: maximo((r) => (r.vRdCKN > 0 ? r.vEdKN / r.vRdCKN : undefined)),
        conPropuestas: propuestas("corte"),
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
                    <CampoNumerico id="phiTerreno" etiqueta="φ' del terreno" sufijo="°" valor={phiTerreno} onChange={setPhiTerreno} />
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
                            <div />
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
                <CampoNumerico id="NkPermanente" etiqueta="Nk permanente" sufijo="kN" valor={NkPermanente} onChange={setNkPermanente} />
                <CampoNumerico id="HkA" etiqueta="Hk A" sufijo="kN" valor={HkA} onChange={setHkA} />
                <CampoNumerico id="HkB" etiqueta="Hk B" sufijo="kN" valor={HkB} onChange={setHkB} />
                <p className="col-span-3 text-xs text-muted-foreground">
                  Mk es el momento que baja por el pilar y Hk la horizontal en su arranque, positivos hacia
                  el borde derecho (A) o inferior (B).{descentrado ? " El del descentramiento se suma solo." : ""}{" "}
                  Nk permanente es la parte de Nk que siempre está: la única que estabiliza al vuelco y frena el
                  deslizamiento. Vacío, se toma Nk entero.
                </p>
                <div className="col-span-3 max-w-xs">
                  <CampoSeleccion
                    id="conExtraordinaria"
                    etiqueta="Situación extraordinaria (sismo, impacto)"
                    valor={conExtraordinaria}
                    opciones={["No", "Sí"]}
                    onChange={setConExtraordinaria}
                  />
                </div>
                {extraordinariaActiva && (
                  <>
                    <CampoNumerico id="NkExt" etiqueta="Nk extr." sufijo="kN" valor={NkExt} onChange={setNkExt} />
                    <CampoNumerico id="MkAExt" etiqueta="Mk A extr." sufijo="kN·m" valor={MkAExt} onChange={setMkAExt} />
                    <CampoNumerico id="MkBExt" etiqueta="Mk B extr." sufijo="kN·m" valor={MkBExt} onChange={setMkBExt} />
                    <CampoNumerico id="NkPermanenteExt" etiqueta="Nk perm. extr." sufijo="kN" valor={NkPermanenteExt} onChange={setNkPermanenteExt} />
                    <CampoNumerico id="HkAExt" etiqueta="Hk A extr." sufijo="kN" valor={HkAExt} onChange={setHkAExt} />
                    <CampoNumerico id="HkBExt" etiqueta="Hk B extr." sufijo="kN" valor={HkBExt} onChange={setHkBExt} />
                    <p className="col-span-3 text-xs text-muted-foreground">
                      Las cargas características de la combinación extraordinaria, con los mismos signos. Sólo se
                      comprueba el terreno con ellas: el armado sigue con la persistente.
                    </p>
                  </>
                )}
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
              "Vuelco y deslizamiento por el CTE DB SE-C, situación persistente, cargas sin mayorar (tabla 2.1, pág. 12): vuelco con 1,8·Mdst ≤ 0,9·Mstb respecto del borde hacia el que empujan Mk + Hk·H; deslizamiento con √(HkA² + HkB²) ≤ (Nk,perm + PP)·tan(3/4·φ')/1,5 (art. 4.2.3.1 (4)). Estabiliza y frena sólo la parte permanente de Nk. Sin empuje pasivo ni peso de tierras.",
              ...(extraordinariaActiva
                ? [
                    "Situación extraordinaria, sólo para el terreno (DB SE-C, tabla 2.1): tensión contra 1,5·σadm (hundimiento con γR = 2,0 en vez de 3,0, suponiendo que σadm sale del hundimiento) admitiendo despegue parcial; vuelco con 1,2·Mdst ≤ 0,9·Mstb y deslizamiento con γR = 1,1. El armado sigue con la persistente.",
                  ]
                : []),
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
                    conPropuestas: !!rec.tension,
                  },
                  ...(resultado.zapata.vuelcoA
                    ? [{
                        etiqueta: "vuelco en A",
                        estado: resultado.zapata.vuelcoA.verifica ? ("cumple" as const) : ("no-cumple" as const),
                        utilizacion: resultado.zapata.vuelcoA.aprovechamiento,
                        conPropuestas: !!rec.vuelcoA,
                      }]
                    : []),
                  {
                    etiqueta: "vuelco en B",
                    estado: resultado.zapata.vuelcoB.verifica ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.vuelcoB.aprovechamiento,
                    conPropuestas: !!rec.vuelcoB,
                  },
                  {
                    etiqueta: "deslizamiento",
                    estado: resultado.zapata.deslizamiento
                      ? resultado.zapata.deslizamiento.verifica
                        ? "cumple"
                        : "no-cumple"
                      : "no-evaluado",
                    utilizacion: resultado.zapata.deslizamiento?.aprovechamiento,
                    conPropuestas: !!rec.deslizamiento,
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
                    conPropuestas: !!rec.punzonamiento,
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
                    conPropuestas: !!rec.bielas,
                  },
                  ...(resultado.zapata.extraordinaria
                    ? (() => {
                        const x = resultado.zapata.extraordinaria;
                        const estado = (v: boolean) => (v ? ("cumple" as const) : ("no-cumple" as const));
                        return [
                          {
                            etiqueta: "tensión del terreno (extraordinaria)",
                            estado: estado(x.verificaTension),
                            utilizacion: x.sigmaKPa / x.sigmaAdmisibleKPa,
                            conPropuestas: !!rec["ext.tension"],
                          },
                          ...(x.vuelcoA
                            ? [{ etiqueta: "vuelco en A (extraordinaria)", estado: estado(x.vuelcoA.verifica), utilizacion: x.vuelcoA.aprovechamiento, conPropuestas: !!rec["ext.vuelcoA"] }]
                            : []),
                          { etiqueta: "vuelco en B (extraordinaria)", estado: estado(x.vuelcoB.verifica), utilizacion: x.vuelcoB.aprovechamiento, conPropuestas: !!rec["ext.vuelcoB"] },
                          {
                            etiqueta: "deslizamiento (extraordinaria)",
                            estado: x.deslizamiento ? estado(x.deslizamiento.verifica) : ("no-evaluado" as const),
                            utilizacion: x.deslizamiento?.aprovechamiento,
                            conPropuestas: !!rec["ext.deslizamiento"],
                          },
                        ];
                      })()
                    : []),
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
                    recomendaciones={rec.tension}
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
                  {resultado.zapata.vuelcoA ? (
                    <ResultadoCheck
                      etiqueta="Vuelco en A"
                      verifica={resultado.zapata.vuelcoA.verifica}
                      detalle={
                        resultado.zapata.vuelcoA.borde === "ninguno"
                          ? "Sin momento ni horizontal en A: no hay vuelco que comprobar."
                          : `CTE DB SE-C, ec. (2.1) y tabla 2.1: 1,8·Mdst ≤ 0,9·Mstb respecto del borde ${resultado.zapata.vuelcoA.borde === "fin" ? "derecho" : "izquierdo"}. Mdst = ${fmt(resultado.zapata.vuelcoA.momentoDesestabilizadorKNm)} kN·m, Mstb = ${fmt(resultado.zapata.vuelcoA.momentoEstabilizadorKNm)} kN·m.`
                      }
                      comparacion={
                        resultado.zapata.vuelcoA.borde === "ninguno"
                          ? undefined
                          : {
                              real: { etiqueta: "1,8·Mdst", valor: resultado.zapata.vuelcoA.efectoDesestabilizadorKNm },
                              limite: { etiqueta: "0,9·Mstb", valor: resultado.zapata.vuelcoA.efectoEstabilizadorKNm },
                              unidad: "kN·m", exige: "≤",
                            }
                      }
                      recomendaciones={rec.vuelcoA}
                    />
                  ) : (
                    <ResultadoCheck
                      etiqueta="Vuelco en A"
                      verifica
                      detalle="Con tirante, el par tirante–terreno impide el giro en A."
                    />
                  )}
                  <ResultadoCheck
                    etiqueta="Vuelco en B"
                    verifica={resultado.zapata.vuelcoB.verifica}
                    detalle={
                      resultado.zapata.vuelcoB.borde === "ninguno"
                        ? "Sin momento ni horizontal en B: no hay vuelco que comprobar."
                        : `CTE DB SE-C, ec. (2.1) y tabla 2.1: 1,8·Mdst ≤ 0,9·Mstb respecto del borde ${resultado.zapata.vuelcoB.borde === "fin" ? "inferior" : "superior"}. Mdst = ${fmt(resultado.zapata.vuelcoB.momentoDesestabilizadorKNm)} kN·m, Mstb = ${fmt(resultado.zapata.vuelcoB.momentoEstabilizadorKNm)} kN·m.`
                    }
                    comparacion={
                      resultado.zapata.vuelcoB.borde === "ninguno"
                        ? undefined
                        : {
                            real: { etiqueta: "1,8·Mdst", valor: resultado.zapata.vuelcoB.efectoDesestabilizadorKNm },
                            limite: { etiqueta: "0,9·Mstb", valor: resultado.zapata.vuelcoB.efectoEstabilizadorKNm },
                            unidad: "kN·m", exige: "≤",
                          }
                    }
                    recomendaciones={rec.vuelcoB}
                  />
                  {resultado.zapata.deslizamiento ? (
                    <ResultadoCheck
                      etiqueta="Deslizamiento"
                      verifica={resultado.zapata.deslizamiento.verifica}
                      detalle={`CTE DB SE-C: δ = 3/4·φ' = ${fmt(resultado.zapata.deslizamiento.deltaGrados, 1)}° (art. 4.2.3.1 (4)), sin adherencia, cargas sin mayorar y γR = 1,5 (tabla 2.1). Frena sólo la carga permanente más el peso propio.${conTirante ? " Con tirante, la base frena el tirante más la horizontal." : ""}`}
                      comparacion={{
                        real: { etiqueta: "H", valor: resultado.zapata.deslizamiento.horizontalKN },
                        limite: { etiqueta: "(Nperm+P)·tan δ/γR", valor: resultado.zapata.deslizamiento.rozamientoCalculoKN },
                        unidad: "kN", exige: "≤",
                      }}
                      recomendaciones={rec.deslizamiento}
                    />
                  ) : (
                    <ResultadoCheck
                      etiqueta="Deslizamiento"
                      verifica={false}
                      detalle="Falta φ' del terreno: sin él no se puede comprobar."
                    />
                  )}
                </div>
              </Subgrupo>

              {resultado.zapata.extraordinaria && (
                <Subgrupo titulo="Situación extraordinaria: terreno">
                  <div>
                    <ResultadoCheck
                      etiqueta="Tensión del terreno"
                      verifica={resultado.zapata.extraordinaria.verificaTension}
                      detalle={`DB SE-C, tabla 2.1: hundimiento con γR = 2,0 en vez de 3,0, así que se admite 1,5·σadm. Se admite despegue parcial: la resultante sólo tiene que caer dentro de la base (e A = ${fmt(resultado.zapata.extraordinaria.excentricidadA, 3)} m, e B = ${fmt(resultado.zapata.extraordinaria.excentricidadB, 3)} m).`}
                      comparacion={{
                        real: { etiqueta: "σ", valor: resultado.zapata.extraordinaria.sigmaKPa },
                        limite: { etiqueta: "1,5·σ adm", valor: resultado.zapata.extraordinaria.sigmaAdmisibleKPa },
                        unidad: "kN/m²", exige: "≤",
                      }}
                      recomendaciones={rec["ext.tension"]}
                    />
                    <ComprobacionVuelco
                      etiqueta="Vuelco en A"
                      resultado={resultado.zapata.extraordinaria.vuelcoA}
                      bordes={{ inicio: "izquierdo", fin: "derecho" }}
                      direccion="en A"
                      recomendaciones={rec["ext.vuelcoA"]}
                    />
                    <ComprobacionVuelco
                      etiqueta="Vuelco en B"
                      resultado={resultado.zapata.extraordinaria.vuelcoB}
                      bordes={{ inicio: "superior", fin: "inferior" }}
                      direccion="en B"
                      recomendaciones={rec["ext.vuelcoB"]}
                    />
                    <ComprobacionDeslizamiento
                      etiqueta="Deslizamiento"
                      resultado={resultado.zapata.extraordinaria.deslizamiento}
                      nota={conTirante ? "Con tirante, la base frena el tirante más la horizontal." : undefined}
                      recomendaciones={rec["ext.deslizamiento"]}
                    />
                  </div>
                </Subgrupo>
              )}

              {resultado.zapata.tirante && (
                <Subgrupo titulo="Par tirante–terreno">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      El deslizamiento de la base, con el tirante incluido, está en Geotecnia.
                    </p>
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
                        recomendaciones={resultado.recomendacionesTirante}
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
                    vuelosAMostrar(dir).map((v) => <TarjetaLadoZapata key={v.nombre} titulo={v.nombre} resultado={v.r} recomendaciones={recVuelo(v.clave)} />)
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
                    recomendaciones={rec.punzonamiento}
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
                    recomendaciones={rec.bielas}
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
