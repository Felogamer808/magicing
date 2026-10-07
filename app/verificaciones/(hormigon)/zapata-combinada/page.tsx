"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { DiagramaPresionSuelo } from "@/components/verificaciones/hormigon/DiagramaPresionSuelo";
import { TarjetaLadoZapata } from "@/components/verificaciones/hormigon/TarjetaLadoZapata";
import { PlantaZapataCombinada } from "@/components/verificaciones/hormigon/PlantaZapataCombinada";
import { CorteLongitudinalCombinada } from "@/components/verificaciones/hormigon/CorteLongitudinalCombinada";
import { DiagramaTiranteTerreno } from "@/components/verificaciones/hormigon/DiagramaTiranteTerreno";
import { ComprobacionVuelco } from "@/components/verificaciones/hormigon/ComprobacionVuelco";
import { ComprobacionDeslizamiento } from "@/components/verificaciones/hormigon/ComprobacionDeslizamiento";
import { CamposArmaduraTirante, EXTREMOS_TIRANTE } from "@/components/verificaciones/hormigon/CamposArmaduraTirante";
import { VerificacionArmaduraTirante } from "@/components/verificaciones/hormigon/VerificacionArmaduraTirante";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularZapataCombinada } from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";
import { recomendarZapataCombinada } from "@/lib/verificaciones/recomendaciones/zapata-combinada";
import { recomendarArmaduraTirante, verificarTirante, type EntradaArmaduraTirante } from "@/lib/verificaciones/recomendaciones/armadura-tirante";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-combinada")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Pilares" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const POSICIONES = ["Centrados", "Ubicación libre", "Contra la medianera"] as const;
const EQUILIBRIOS = ["Lo toma el terreno", "Par tirante–terreno"] as const;
const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

export default function ZapataCombinadaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "150");

  // "A" es el largo: se conserva la clave para no perder los datos guardados.
  const [A, setA] = useCampo("A", "3.1");
  const [B, setB] = useCampo("B", "0.8");
  const [H, setH] = useCampo("H", "0.3");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.04");

  const [posicionPilares, setPosicionPilares] = useCampo("posicionPilares", POSICIONES[0]);
  const [distanciaBordeB, setDistanciaBordeB] = useCampo("distanciaBordeB", "0");
  const descentrado = posicionPilares === POSICIONES[1];
  const [equilibrio, setEquilibrio] = useCampo("equilibrio", EQUILIBRIOS[0]);
  const [brazoTirante, setBrazoTirante] = useCampo("brazoTirante", "3");
  const [phiTerreno, setPhiTerreno] = useCampo("phiTerreno", "30");
  const conTirante = descentrado && equilibrio === EQUILIBRIOS[1];

  const [pos1, setPos1] = useCampo("pos1", "0.3");
  const [Nk1, setNk1] = useCampo("Nk1", "65");
  const [cL1, setCL1] = useCampo("cL1", "0.6");
  const [cB1, setCB1] = useCampo("cB1", "0.15");
  const [pos2, setPos2] = useCampo("pos2", "2.8");
  const [Nk2, setNk2] = useCampo("Nk2", "76");
  const [cL2, setCL2] = useCampo("cL2", "0.6");
  const [cB2, setCB2] = useCampo("cB2", "0.15");
  // Momentos y horizontales de cada pilar, positivos hacia el borde derecho (L)
  // o inferior (B). Nk permanente vacío = Nk: es la parte que estabiliza y frena.
  const [MkL1, setMkL1] = useCampo("MkL1", "0");
  const [MkB1, setMkB1] = useCampo("MkB1", "0");
  const [HkL1, setHkL1] = useCampo("HkL1", "0");
  const [HkB1, setHkB1] = useCampo("HkB1", "0");
  const [NkPerm1, setNkPerm1] = useCampo("NkPermanente1", "");
  const [MkL2, setMkL2] = useCampo("MkL2", "0");
  const [MkB2, setMkB2] = useCampo("MkB2", "0");
  const [HkL2, setHkL2] = useCampo("HkL2", "0");
  const [HkB2, setHkB2] = useCampo("HkB2", "0");
  const [NkPerm2, setNkPerm2] = useCampo("NkPermanente2", "");
  // Situación extraordinaria (sismo, impacto): otro juego de cargas, sólo para el terreno.
  const [conExtraordinaria, setConExtraordinaria] = useCampo("conExtraordinaria", "No");
  const extraordinariaActiva = conExtraordinaria === "Sí";
  const [NkExt1, setNkExt1] = useCampo("NkExt1", "65");
  const [NkPermExt1, setNkPermExt1] = useCampo("NkPermanenteExt1", "");
  const [MkLExt1, setMkLExt1] = useCampo("MkLExt1", "0");
  const [MkBExt1, setMkBExt1] = useCampo("MkBExt1", "0");
  const [HkLExt1, setHkLExt1] = useCampo("HkLExt1", "0");
  const [HkBExt1, setHkBExt1] = useCampo("HkBExt1", "0");
  const [NkExt2, setNkExt2] = useCampo("NkExt2", "76");
  const [NkPermExt2, setNkPermExt2] = useCampo("NkPermanenteExt2", "");
  const [MkLExt2, setMkLExt2] = useCampo("MkLExt2", "0");
  const [MkBExt2, setMkBExt2] = useCampo("MkBExt2", "0");
  const [HkLExt2, setHkLExt2] = useCampo("HkLExt2", "0");
  const [HkBExt2, setHkBExt2] = useCampo("HkBExt2", "0");

  const [numeroInferior, setNumeroInferior] = useCampo("numeroInferior", "6");
  const [diametroInferior, setDiametroInferior] = useCampo("diametroInferior", "10");
  const [numeroSuperior, setNumeroSuperior] = useCampo("numeroSuperior", "6");
  const [diametroSuperior, setDiametroSuperior] = useCampo("diametroSuperior", "10");
  const [diametroTransversal, setDiametroTransversal] = useCampo("diametroTransversal", "10");
  const [separacionTransversal, setSeparacionTransversal] = useCampo("separacionTransversal", "0.15");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "gancho");

  const [diametroTirante, setDiametroTirante] = useCampo("diametroTirante", "10");
  const [numeroTirante, setNumeroTirante] = useCampo("numeroTirante", "2");
  const [recubrimientoTirante, setRecubrimientoTirante] = useCampo("recubrimientoTirante", "0.03");
  const [extremoTirante, setExtremoTirante] = useCampo("extremoTirante", EXTREMOS_TIRANTE[0]);
  const [pataTirante, setPataTirante] = useCampo("pataTirante", "150");
  const [adherenciaTirante, setAdherenciaTirante] = useCampo("adherenciaTirante", "Buena");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck), fyk: aNumero(fyk), sigmaAdmisible: aNumero(sigmaAdmisible),
      L: aNumero(A), B: aNumero(B), H: aNumero(H), rec: aNumero(recubrimiento),
      pos1: aNumero(pos1), Nk1: aNumero(Nk1), cL1: aNumero(cL1), cB1: aNumero(cB1),
      pos2: aNumero(pos2), Nk2: aNumero(Nk2), cL2: aNumero(cL2), cB2: aNumero(cB2),
      MkL1: aNumero(MkL1), MkB1: aNumero(MkB1), HkL1: aNumero(HkL1), HkB1: aNumero(HkB1),
      MkL2: aNumero(MkL2), MkB2: aNumero(MkB2), HkL2: aNumero(HkL2), HkB2: aNumero(HkB2),
      nInf: aNumero(numeroInferior), fInf: aNumero(diametroInferior),
      nSup: aNumero(numeroSuperior), fSup: aNumero(diametroSuperior),
      fT: aNumero(diametroTransversal), sT: aNumero(separacionTransversal),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n))) return null;
    const positivos = [v.fck, v.fyk, v.sigmaAdmisible, v.L, v.B, v.H, v.Nk1, v.Nk2, v.cL1, v.cB1, v.cL2, v.cB2, v.nInf, v.fInf, v.nSup, v.fSup, v.fT, v.sT];
    if (!positivos.every((n) => n > 0) || !(v.pos2 > v.pos1)) return null;
    const borde = aNumero(distanciaBordeB);
    if (descentrado && !(borde >= 0)) return null;
    const brazo = aNumero(brazoTirante);
    const phi = aNumero(phiTerreno);
    const phiValido = phi > 0 && phi < 90;
    if (conTirante && !(brazo > 0 && phiValido)) return null;
    const permanente = (texto: string) => (texto.trim() === "" ? undefined : aNumero(texto));
    const nPerm1 = permanente(NkPerm1);
    const nPerm2 = permanente(NkPerm2);
    if (nPerm1 !== undefined && !(nPerm1 >= 0 && nPerm1 <= v.Nk1)) return null;
    if (nPerm2 !== undefined && !(nPerm2 >= 0 && nPerm2 <= v.Nk2)) return null;

    // Cargas extraordinarias de cada pilar; null si alguna no es válida.
    const cargasExt = (nk: string, perm: string, mkL: string, mkB: string, hkL: string, hkB: string) => {
      const c = { Nk: aNumero(nk), MkL: aNumero(mkL), MkB: aNumero(mkB), HkL: aNumero(hkL), HkB: aNumero(hkB) };
      const p = permanente(perm);
      if (!(c.Nk > 0) || ![c.MkL, c.MkB, c.HkL, c.HkB].every(Number.isFinite)) return null;
      if (p !== undefined && !(p >= 0 && p <= c.Nk)) return null;
      return { ...c, ...(p !== undefined ? { NkPermanente: p } : {}) };
    };
    const ext1 = extraordinariaActiva ? cargasExt(NkExt1, NkPermExt1, MkLExt1, MkBExt1, HkLExt1, HkBExt1) : undefined;
    const ext2 = extraordinariaActiva ? cargasExt(NkExt2, NkPermExt2, MkLExt2, MkBExt2, HkLExt2, HkBExt2) : undefined;
    if (ext1 === null || ext2 === null) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { L: v.L, B: v.B, H: v.H, recubrimiento: v.rec, ...(descentrado ? { distanciaBordeB: borde } : {}) };
    const datos = {
      pilares: [
        {
          posicionM: v.pos1, Nk: v.Nk1, anchoLargoM: v.cL1, anchoAnchoM: v.cB1,
          MkL: v.MkL1, MkB: v.MkB1, HkL: v.HkL1, HkB: v.HkB1,
          ...(nPerm1 !== undefined ? { NkPermanente: nPerm1 } : {}),
        },
        {
          posicionM: v.pos2, Nk: v.Nk2, anchoLargoM: v.cL2, anchoAnchoM: v.cB2,
          MkL: v.MkL2, MkB: v.MkB2, HkL: v.HkL2, HkB: v.HkB2,
          ...(nPerm2 !== undefined ? { NkPermanente: nPerm2 } : {}),
        },
      ] as const,
      inferior: { numero: v.nInf, diametroMm: v.fInf },
      superior: { numero: v.nSup, diametroMm: v.fSup },
      transversal: { diametroMm: v.fT, separacionM: v.sT },
      formaAnclaje,
      ...(conTirante ? { tirante: { brazoM: brazo, phiGrados: phi } } : {}),
      // Sin φ′ válido el deslizamiento queda sin evaluar, no se inventa.
      ...(phiValido ? { phiGrados: phi } : {}),
      ...(ext1 && ext2 ? { extraordinaria: [ext1, ext2] as const } : {}),
    };
    const zapata = calcularZapataCombinada(materiales, geometria, v.sigmaAdmisible, datos);
    const recomendaciones = recomendarZapataCombinada({ fck: v.fck, fyk: v.fyk, geometria, sigmaAdmisibleKPa: v.sigmaAdmisible, datos });

    // El tirante se verifica con el pilar que más tira; las mismas barras en los dos.
    const t = { f: aNumero(diametroTirante), n: aNumero(numeroTirante), rec: aNumero(recubrimientoTirante), pata: aNumero(pataTirante) };
    const patillaTirante = extremoTirante === EXTREMOS_TIRANTE[1];
    const iMayor = zapata.tirante && Math.abs(zapata.tirante.porPilar[1].tkKN) > Math.abs(zapata.tirante.porPilar[0].tkKN) ? 1 : 0;
    const entradaTirante: EntradaArmaduraTirante | undefined =
      zapata.tirante && t.f > 0 && t.n > 0 && t.rec >= 0 && (!patillaTirante || t.pata >= 0)
        ? {
            fck: v.fck,
            fyk: v.fyk,
            tdKN: zapata.tirante.porPilar[iMayor].tdKN,
            barras: { tipo: "numero", numero: t.n, diametroMm: t.f },
            anchoApoyoM: iMayor === 0 ? v.cB1 : v.cB2,
            recubrimientoM: t.rec,
            forma: patillaTirante ? "gancho" : "recta",
            pataMm: patillaTirante ? t.pata : 0,
            situacion: adherenciaTirante === "Mala" ? "mala" : "buena",
          }
        : undefined;
    const armaduraTirante = entradaTirante && verificarTirante(entradaTirante);
    const recomendacionesTirante = entradaTirante && recomendarArmaduraTirante(entradaTirante);

    return { zapata, armaduraTirante, recomendacionesTirante, iMayor, recomendaciones };
  }, [
    fck, fyk, sigmaAdmisible, A, B, H, recubrimiento, descentrado, distanciaBordeB, conTirante, brazoTirante, phiTerreno,
    pos1, Nk1, cL1, cB1, pos2, Nk2, cL2, cB2,
    MkL1, MkB1, HkL1, HkB1, NkPerm1, MkL2, MkB2, HkL2, HkB2, NkPerm2,
    extraordinariaActiva, NkExt1, NkPermExt1, MkLExt1, MkBExt1, HkLExt1, HkBExt1,
    NkExt2, NkPermExt2, MkLExt2, MkBExt2, HkLExt2, HkBExt2,
    numeroInferior, diametroInferior, numeroSuperior, diametroSuperior, diametroTransversal, separacionTransversal, formaAnclaje,
    diametroTirante, numeroTirante, recubrimientoTirante, extremoTirante, pataTirante, adherenciaTirante,
  ]);

  const cambiarPosicion = (valor: string) => {
    if (valor === POSICIONES[2]) {
      setDistanciaBordeB("0");
      setPosicionPilares(POSICIONES[1]);
      return;
    }
    setPosicionPilares(valor);
  };

  const pilaresPlanta = [
    { posicionM: aNumero(pos1), anchoLargoM: aNumero(cL1), anchoAnchoM: aNumero(cB1), nk: aNumero(Nk1) },
    { posicionM: aNumero(pos2), anchoLargoM: aNumero(cL2), anchoAnchoM: aNumero(cB2), nk: aNumero(Nk2) },
  ];
  const plantaValida = [aNumero(A), aNumero(B), ...pilaresPlanta.flatMap((p) => [p.posicionM, p.anchoLargoM, p.anchoAnchoM])].every(
    (n) => Number.isFinite(n) && n >= 0
  );
  const planta = plantaValida ? (
    <PlantaZapataCombinada
      LM={aNumero(A)}
      BM={aNumero(B)}
      pilares={pilaresPlanta}
      distanciaBordeBM={descentrado ? aNumero(distanciaBordeB) : undefined}
    />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">La planta se dibuja con datos válidos.</p>
  );

  const corte =
    plantaValida && aNumero(H) > 0 ? (
      <CorteLongitudinalCombinada
        LM={aNumero(A)}
        HM={aNumero(H)}
        recubrimientoM={aNumero(recubrimiento)}
        pilares={pilaresPlanta}
        diametroInferiorMm={aNumero(diametroInferior)}
        diametroSuperiorMm={aNumero(diametroSuperior)}
        separacionTransversalM={aNumero(separacionTransversal)}
        diametroTransversalMm={aNumero(diametroTransversal)}
        momentos={resultado?.zapata.diagrama}
        resumen={[
          { etiqueta: "Inferior", valor: `${numeroInferior} Ø${diametroInferior} en B` },
          { etiqueta: "Superior", valor: `${numeroSuperior} Ø${diametroSuperior} en B` },
          { etiqueta: "Transversal", valor: `Ø${diametroTransversal} c/${separacionTransversal} m · ${FORMAS[formaAnclaje].toLowerCase()}` },
          { etiqueta: "Recubrimiento", valor: `${recubrimiento} m` },
        ]}
      />
    ) : (
      planta
    );

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos: no se puede calcular. El pilar 2 tiene que estar a la derecha del pilar 1.",
    });
  } else {
    const z = resultado.zapata;
    if (!z.pilaresDentro) avisos.push({ tipo: "error", texto: "Algún pilar queda fuera de la zapata." });
    if (z.tirante && !z.tirante.global.geometriaValida)
      avisos.push({ tipo: "error", texto: "El brazo del tirante tiene que ser mayor que el canto de la zapata." });
    if (!z.geotecnico.dentroDelNucleo)
      avisos.push({
        tipo: "error",
        texto: descentrado && !conTirante
          ? "La resultante sale del núcleo central: con los pilares contra la medianera, la salida habitual es el par tirante–terreno o una viga centradora."
          : "La resultante sale del núcleo central: hay que alargar la zapata o acercar su centro a la resultante de los pilares.",
      });
  }

  const z = resultado?.zapata;
  const rec = resultado?.recomendaciones ?? {};
  const recVuelo = (lado: "inicio" | "fin" | "gobernante") => ({
    as: rec[`${lado}.as`],
    anclaje: rec[`${lado}.anclaje`],
    corte: rec[`${lado}.corte`],
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
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
          <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="La zapata, dónde caen los pilares a lo ancho y el terreno.">
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
                    <div className="grid grid-cols-2 gap-4">
                      <CampoNumerico id="A" etiqueta="L (largo, entre pilares)" sufijo="m" valor={A} onChange={setA} />
                      <CampoNumerico id="B" etiqueta="B (ancho)" sufijo="m" valor={B} onChange={setB} />
                      <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                      <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    </div>
                  </Subgrupo>
                  <Subgrupo titulo="Pilares a lo ancho">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <CampoSeleccion id="posicionPilares" etiqueta="Dónde caen los pilares" valor={posicionPilares} opciones={POSICIONES} onChange={cambiarPosicion} />
                      </div>
                      {descentrado && (
                        <>
                          <CampoNumerico id="distanciaBordeB" etiqueta="Cara al borde (medianera)" sufijo="m" valor={distanciaBordeB} onChange={setDistanciaBordeB} />
                          <p className="col-span-2 text-xs text-muted-foreground">
                            Los dos pilares quedan alineados. 0 es contra la medianera. El momento N·e del
                            descentramiento sale solo.
                          </p>
                          <div className="col-span-2">
                            <CampoSeleccion id="equilibrio" etiqueta="Quién toma el momento a lo ancho" valor={equilibrio} opciones={EQUILIBRIOS} onChange={setEquilibrio} />
                          </div>
                          {conTirante && (
                            <>
                              <CampoNumerico id="brazoTirante" etiqueta="h: tirante → base" sufijo="m" valor={brazoTirante} onChange={setBrazoTirante} />
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

          <Etapa id="cargas" numero={2} titulo="Pilares" descripcion="Posición a lo largo, medida desde el borde izquierdo, esfuerzos característicos y sección.">
            <DatosConDibujo
              datos={
                <div className="flex flex-col gap-6">
                  {([
                    {
                      n: 1, pos: [pos1, setPos1], nk: [Nk1, setNk1], cl: [cL1, setCL1], cb: [cB1, setCB1], perm: [NkPerm1, setNkPerm1],
                      mkL: [MkL1, setMkL1], mkB: [MkB1, setMkB1], hkL: [HkL1, setHkL1], hkB: [HkB1, setHkB1],
                    },
                    {
                      n: 2, pos: [pos2, setPos2], nk: [Nk2, setNk2], cl: [cL2, setCL2], cb: [cB2, setCB2], perm: [NkPerm2, setNkPerm2],
                      mkL: [MkL2, setMkL2], mkB: [MkB2, setMkB2], hkL: [HkL2, setHkL2], hkB: [HkB2, setHkB2],
                    },
                  ] as const).map(({ n, pos, nk, cl, cb, perm, mkL, mkB, hkL, hkB }) => (
                    <Subgrupo key={n} titulo={`Pilar ${n}`}>
                      <div className="grid grid-cols-2 gap-4">
                        <CampoNumerico id={`pos${n}`} etiqueta="x: eje desde el borde" sufijo="m" valor={pos[0]} onChange={pos[1]} />
                        <CampoNumerico id={`Nk${n}`} etiqueta="Nk" sufijo="kN" valor={nk[0]} onChange={nk[1]} />
                        <CampoNumerico id={`cL${n}`} etiqueta="Lado a lo largo" sufijo="m" valor={cl[0]} onChange={cl[1]} />
                        <CampoNumerico id={`cB${n}`} etiqueta="Lado a lo ancho" sufijo="m" valor={cb[0]} onChange={cb[1]} />
                        <CampoNumerico id={`NkPermanente${n}`} etiqueta="Nk permanente" sufijo="kN" valor={perm[0]} onChange={perm[1]} />
                        <div />
                        <CampoNumerico id={`MkL${n}`} etiqueta="Mk a lo largo" sufijo="kN·m" valor={mkL[0]} onChange={mkL[1]} />
                        <CampoNumerico id={`MkB${n}`} etiqueta="Mk a lo ancho" sufijo="kN·m" valor={mkB[0]} onChange={mkB[1]} />
                        <CampoNumerico id={`HkL${n}`} etiqueta="Hk a lo largo" sufijo="kN" valor={hkL[0]} onChange={hkL[1]} />
                        <CampoNumerico id={`HkB${n}`} etiqueta="Hk a lo ancho" sufijo="kN" valor={hkB[0]} onChange={hkB[1]} />
                      </div>
                    </Subgrupo>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Mk es el momento que baja por el pilar y Hk la horizontal en su arranque, positivos hacia
                    el borde derecho (a lo largo) o inferior (a lo ancho).{descentrado ? " El del descentramiento se suma solo." : ""}{" "}
                    Nk permanente es la parte de Nk que siempre está: la única que estabiliza al vuelco y frena el
                    deslizamiento. Vacío, se toma Nk entero.
                  </p>
                  <div className="max-w-xs">
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
                      {([
                        {
                          n: 1, nk: [NkExt1, setNkExt1], perm: [NkPermExt1, setNkPermExt1],
                          mkL: [MkLExt1, setMkLExt1], mkB: [MkBExt1, setMkBExt1], hkL: [HkLExt1, setHkLExt1], hkB: [HkBExt1, setHkBExt1],
                        },
                        {
                          n: 2, nk: [NkExt2, setNkExt2], perm: [NkPermExt2, setNkPermExt2],
                          mkL: [MkLExt2, setMkLExt2], mkB: [MkBExt2, setMkBExt2], hkL: [HkLExt2, setHkLExt2], hkB: [HkBExt2, setHkBExt2],
                        },
                      ] as const).map(({ n, nk, perm, mkL, mkB, hkL, hkB }) => (
                        <Subgrupo key={n} titulo={`Pilar ${n}: situación extraordinaria`}>
                          <div className="grid grid-cols-2 gap-4">
                            <CampoNumerico id={`NkExt${n}`} etiqueta="Nk extr." sufijo="kN" valor={nk[0]} onChange={nk[1]} />
                            <CampoNumerico id={`NkPermanenteExt${n}`} etiqueta="Nk perm. extr." sufijo="kN" valor={perm[0]} onChange={perm[1]} />
                            <CampoNumerico id={`MkLExt${n}`} etiqueta="Mk a lo largo extr." sufijo="kN·m" valor={mkL[0]} onChange={mkL[1]} />
                            <CampoNumerico id={`MkBExt${n}`} etiqueta="Mk a lo ancho extr." sufijo="kN·m" valor={mkB[0]} onChange={mkB[1]} />
                            <CampoNumerico id={`HkLExt${n}`} etiqueta="Hk a lo largo extr." sufijo="kN" valor={hkL[0]} onChange={hkL[1]} />
                            <CampoNumerico id={`HkBExt${n}`} etiqueta="Hk a lo ancho extr." sufijo="kN" valor={hkB[0]} onChange={hkB[1]} />
                          </div>
                        </Subgrupo>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Las cargas características de la combinación extraordinaria, con los mismos signos. Sólo se
                        comprueba el terreno con ellas: el armado sigue con la persistente.
                      </p>
                    </>
                  )}
                </div>
              }
              dibujo={planta}
            />
          </Etapa>

          <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Longitudinal abajo y arriba, transversal por metro.">
            <DatosConDibujo
              datos={
                <>
                  <Subgrupo titulo="Longitudinal (en todo el ancho B)">
                    <EditorCapas
                      filas={[
                        {
                          posicion: "Inferior",
                          numero: { id: "numeroInferior", valor: numeroInferior, onChange: setNumeroInferior },
                          diametro: { id: "diametroInferior", valor: diametroInferior, onChange: setDiametroInferior },
                        },
                        {
                          posicion: "Superior",
                          numero: { id: "numeroSuperior", valor: numeroSuperior, onChange: setNumeroSuperior },
                          diametro: { id: "diametroSuperior", valor: diametroSuperior, onChange: setDiametroSuperior },
                        },
                      ]}
                    />
                  </Subgrupo>
                  <Subgrupo titulo="Transversal (por metro de largo)">
                    <div className="grid grid-cols-2 gap-4">
                      <CampoDiametro id="diametroTransversal" etiqueta="Ø" valor={diametroTransversal} onChange={setDiametroTransversal} />
                      <CampoNumerico id="separacionTransversal" etiqueta="Separación" sufijo="m" valor={separacionTransversal} onChange={setSeparacionTransversal} />
                      <div className="col-span-2 max-w-xs">
                        <CampoSeleccion
                          id="formaAnclaje"
                          etiqueta="Extremo de las transversales"
                          valor={FORMAS[formaAnclaje]}
                          opciones={Object.values(FORMAS)}
                          onChange={(x) => setFormaAnclaje(formaPorNombre(x))}
                        />
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground">
                        Las transversales van sobre la longitudinal inferior y toman el vuelo a lo ancho.
                      </p>
                    </div>
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
              dibujo={corte}
            />
          </Etapa>

          <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
            <RevisionDatos
              norma={norma}
              datos={[
                { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
                { etiqueta: "L × B × H", valor: `${A} × ${B} × ${H} m` },
                { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
                { etiqueta: "Pilares", valor: `P1 ${Nk1} kN en x = ${pos1} · P2 ${Nk2} kN en x = ${pos2}` },
                { etiqueta: "Mk L · B", valor: `P1 ${MkL1} · ${MkB1} · P2 ${MkL2} · ${MkB2} kN·m` },
                { etiqueta: "Hk L · B", valor: `P1 ${HkL1} · ${HkB1} · P2 ${HkL2} · ${HkB2} kN` },
                { etiqueta: "Nk permanente", valor: `P1 ${NkPerm1.trim() || Nk1} · P2 ${NkPerm2.trim() || Nk2} kN` },
                { etiqueta: "φ' del terreno", valor: `${phiTerreno}°` },
                ...(z
                  ? [
                      { etiqueta: "Peso propio", valor: `${fmt(z.geotecnico.pesoPropioKN)} kN`, derivado: true },
                      { etiqueta: "e terreno L · B", valor: `${fmt(z.geotecnico.excentricidadLM, 3)} · ${fmt(z.geotecnico.excentricidadBM, 3)} m`, derivado: true },
                    ]
                  : []),
              ]}
              hipotesis={[
                "Zapata rígida: presión lineal en las dos direcciones, con el peso propio incluido en la tensión y en la excentricidad. La resultante tiene que caer dentro del núcleo central en las dos direcciones.",
                "Mk + Hk·H de cada pilar es el momento en la base: corre la resultante del terreno y, a lo largo, entra en la viga como un momento concentrado en el pilar (mayorado con 1,5, como Nk).",
                "A lo largo es una viga sobre el terreno con los pilares como cargas puntuales. Cada cara se arma con el motor de flexión de vigas del Anejo 19 (art. 6.1) y la mínima del art. 9.2.1.1: la inferior siempre, la superior donde el momento la tracciona.",
                "Cortante sin estribos (art. 6.2.2) a d de cada cara de pilar, con el d y el ρl de la cara traccionada en esa sección.",
                "A lo ancho, por metro en todo el largo, con el modelo de vuelos del art. 9.8.2.2 bajo la sección más cargada. Las transversales van sobre la longitudinal inferior.",
                "Punzonamiento de cada pilar (art. 6.4): perímetro recortado por los bordes cercanos y β de borde o esquina, descontando la presión que generan los dos pilares.",
                "Con par tirante–terreno: cada pilar tiene su tirante Tk = (N·e + Mk + Hk·H)/h a lo ancho, la presión queda uniforme en esa dirección y las barras del tirante se verifican con el pilar que más tira.",
                ...(extraordinariaActiva
                  ? [
                      "Situación extraordinaria, sólo para el terreno (DB SE-C, tabla 2.1): tensión contra 1,5·σadm (hundimiento con γR = 2,0 en vez de 3,0, suponiendo que σadm sale del hundimiento) admitiendo despegue parcial; vuelco con 1,2·Mdst ≤ 0,9·Mstb y deslizamiento con γR = 1,1. El armado sigue con la persistente.",
                    ]
                  : []),
                "Vuelco y deslizamiento por el CTE DB SE-C, situación persistente, cargas sin mayorar (tabla 2.1, pág. 12): vuelco con 1,8·Mdst ≤ 0,9·Mstb respecto del borde hacia el que empujan los Mk + Hk·H; deslizamiento con √(ΣHkL² + ΣHkB²) ≤ (ΣNk,perm + PP)·tan(3/4·φ')/1,5 (art. 4.2.3.1 (4)); con tirante, la base frena el tirante más la horizontal. Estabiliza y frena sólo la parte permanente de cada pilar. Sin empuje pasivo ni peso de tierras.",
              ]}
              avisos={avisos}
            />
          </Etapa>

          <Etapa id="resultados" numero={5} titulo="Resultados">
            {!z || !resultado ? (
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
                    { etiqueta: "σ terreno", valor: `${fmt(z.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                    { etiqueta: "M+ / M−", valor: `${fmt(z.inferior.mEdKNm)} / ${fmt(z.superior.mEdKNm)} kN·m` },
                    { etiqueta: "As nec. inf / sup", valor: `${fmt(z.inferior.flexion.asNecCm2)} / ${z.superior.necesaria ? fmt(z.superior.flexion.asNecCm2) : "—"} cm²` },
                    { etiqueta: "As nec. transversal", valor: `${fmt(z.transversal.gobernante.asNecCm2)} cm²/m` },
                  ]}
                />

                <Subgrupo titulo="Geotecnia">
                  <div>
                    <ResultadoCheck
                      etiqueta="Tensión admisible del terreno"
                      verifica={z.geotecnico.verificaTension}
                      comparacion={{
                        real: { etiqueta: "σ", valor: z.geotecnico.sigmaKPa },
                        limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                        unidad: "kN/m²", exige: "≤",
                      }}
                      recomendaciones={rec.tension}
                    />
                    <div className="grid gap-6 pt-4 md:grid-cols-2">
                      <DiagramaPresionSuelo distribucion={z.geotecnico.distribucionL} lM={aNumero(A)} sigmaAdmisibleKPa={aNumero(sigmaAdmisible)} etiqueta="A lo largo" />
                      <DiagramaPresionSuelo distribucion={z.geotecnico.distribucionB} lM={aNumero(B)} sigmaAdmisibleKPa={aNumero(sigmaAdmisible)} etiqueta="A lo ancho" />
                    </div>
                    <ResultadoCheck
                      etiqueta="Vuelco a lo largo"
                      verifica={z.vuelcoL.verifica}
                      detalle={
                        z.vuelcoL.borde === "ninguno"
                          ? "Sin momentos ni horizontales a lo largo: no hay vuelco que comprobar."
                          : `CTE DB SE-C, ec. (2.1) y tabla 2.1: 1,8·Mdst ≤ 0,9·Mstb respecto del borde ${z.vuelcoL.borde === "fin" ? "derecho" : "izquierdo"}. Mdst = ${fmt(z.vuelcoL.momentoDesestabilizadorKNm)} kN·m, Mstb = ${fmt(z.vuelcoL.momentoEstabilizadorKNm)} kN·m.`
                      }
                      comparacion={
                        z.vuelcoL.borde === "ninguno"
                          ? undefined
                          : {
                              real: { etiqueta: "1,8·Mdst", valor: z.vuelcoL.efectoDesestabilizadorKNm },
                              limite: { etiqueta: "0,9·Mstb", valor: z.vuelcoL.efectoEstabilizadorKNm },
                              unidad: "kN·m", exige: "≤",
                            }
                      }
                      recomendaciones={rec.vuelcoL}
                    />
                    {z.vuelcoB ? (
                      <>
                        <ResultadoCheck
                          etiqueta="Vuelco a lo ancho"
                          verifica={z.vuelcoB.verifica}
                          detalle={
                            z.vuelcoB.borde === "ninguno"
                              ? "Sin momentos ni horizontales a lo ancho: no hay vuelco que comprobar."
                              : `CTE DB SE-C, ec. (2.1) y tabla 2.1: 1,8·Mdst ≤ 0,9·Mstb respecto del borde ${z.vuelcoB.borde === "fin" ? "inferior" : "superior"}. Mdst = ${fmt(z.vuelcoB.momentoDesestabilizadorKNm)} kN·m, Mstb = ${fmt(z.vuelcoB.momentoEstabilizadorKNm)} kN·m.`
                          }
                          comparacion={
                            z.vuelcoB.borde === "ninguno"
                              ? undefined
                              : {
                                  real: { etiqueta: "1,8·Mdst", valor: z.vuelcoB.efectoDesestabilizadorKNm },
                                  limite: { etiqueta: "0,9·Mstb", valor: z.vuelcoB.efectoEstabilizadorKNm },
                                  unidad: "kN·m", exige: "≤",
                                }
                          }
                          recomendaciones={rec.vuelcoB}
                        />
                      </>
                    ) : (
                      <ResultadoCheck etiqueta="Vuelco a lo ancho" verifica detalle="Con tirante, el par tirante–terreno impide el giro a lo ancho." />
                    )}
                    {z.deslizamiento ? (
                      <ResultadoCheck
                        etiqueta="Deslizamiento"
                        verifica={z.deslizamiento.verifica}
                        detalle={`CTE DB SE-C: δ = 3/4·φ' = ${fmt(z.deslizamiento.deltaGrados, 1)}° (art. 4.2.3.1 (4)), sin adherencia, cargas sin mayorar y γR = 1,5 (tabla 2.1). Frena sólo la carga permanente de los dos pilares más el peso propio.${z.tirante ? " Con tirante, la base frena los dos tirantes más la horizontal." : ""}`}
                        comparacion={{
                          real: { etiqueta: "H", valor: z.deslizamiento.horizontalKN },
                          limite: { etiqueta: "(Nperm+P)·tan δ/γR", valor: z.deslizamiento.rozamientoCalculoKN },
                          unidad: "kN", exige: "≤",
                        }}
                        recomendaciones={rec.deslizamiento}
                      />
                    ) : (
                      <ResultadoCheck
                        etiqueta="Deslizamiento"
                        verifica={false}
                        estado="no-evaluado"
                        detalle="Falta φ' del terreno: sin él no se puede comprobar."
                      />
                    )}
                  </div>
                </Subgrupo>

                {z.extraordinaria && (
                  <Subgrupo titulo="Situación extraordinaria: terreno">
                    <div>
                      <ResultadoCheck
                        etiqueta="Tensión del terreno (extraordinaria)"
                        verifica={z.extraordinaria.verificaTension}
                        detalle={`DB SE-C, tabla 2.1: hundimiento con γR = 2,0 en vez de 3,0, así que se admite 1,5·σadm. Se admite despegue parcial: la resultante sólo tiene que caer dentro de la base (e L = ${fmt(z.extraordinaria.excentricidadLM, 3)} m, e B = ${fmt(z.extraordinaria.excentricidadBM, 3)} m).`}
                        comparacion={{
                          real: { etiqueta: "σ", valor: z.extraordinaria.sigmaKPa },
                          limite: { etiqueta: "1,5·σ adm", valor: z.extraordinaria.sigmaAdmisibleKPa },
                          unidad: "kN/m²", exige: "≤",
                        }}
                        recomendaciones={rec["ext.tension"]}
                      />
                      <ComprobacionVuelco
                        etiqueta="Vuelco a lo largo (extraordinaria)"
                        resultado={z.extraordinaria.vuelcoL}
                        bordes={{ inicio: "izquierdo", fin: "derecho" }}
                        direccion="a lo largo"
                        recomendaciones={rec["ext.vuelcoL"]}
                      />
                      <ComprobacionVuelco
                        etiqueta="Vuelco a lo ancho (extraordinaria)"
                        resultado={z.extraordinaria.vuelcoB}
                        bordes={{ inicio: "superior", fin: "inferior" }}
                        direccion="a lo ancho"
                        recomendaciones={rec["ext.vuelcoB"]}
                      />
                      <ComprobacionDeslizamiento
                        etiqueta="Deslizamiento (extraordinaria)"
                        resultado={z.extraordinaria.deslizamiento}
                        nota={z.tirante ? "Con tirante, la base frena los dos tirantes más la horizontal." : undefined}
                        recomendaciones={rec["ext.deslizamiento"]}
                      />
                    </div>
                  </Subgrupo>
                )}

                {z.tirante && (
                  <Subgrupo titulo="Par tirante–terreno">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        El deslizamiento de la base, con los tirantes incluidos, está en Geotecnia.
                      </p>
                      <PanelMetricas
                        horizontal
                        metricas={z.tirante.porPilar.flatMap((t, i) => [
                          { etiqueta: `P${i + 1}: Tk / Td`, valor: `${fmt(Math.abs(t.tkKN))} / ${fmt(t.tdKN)} kN`, nota: `As ${fmt(t.asTiranteCm2)} cm²` },
                          { etiqueta: `P${i + 1}: M / V arranque`, valor: `${fmt(Math.abs(t.mPilarArranqueKNm))} kN·m / ${fmt(t.vPilarKN)} kN`, nota: "característicos" },
                        ])}
                      />
                      {resultado.armaduraTirante && (
                        <VerificacionArmaduraTirante
                          recomendaciones={resultado.recomendacionesTirante}
                          elemento="pilar"
                          resultado={resultado.armaduraTirante}
                          descripcionBarras={`${numeroTirante} Ø${diametroTirante} por pilar (P${resultado.iMayor + 1} gobierna)`}
                          unidadAs="cm²"
                          anchoApoyoM={aNumero(resultado.iMayor === 0 ? cB1 : cB2)}
                          recubrimientoM={aNumero(recubrimientoTirante)}
                          patilla={extremoTirante === EXTREMOS_TIRANTE[1]}
                          pataMm={aNumero(pataTirante)}
                          adherencia={adherenciaTirante}
                        />
                      )}
                    </div>
                  </Subgrupo>
                )}

                <Subgrupo titulo="A lo largo: viga sobre el terreno">
                  <div>
                    <ResultadoCheck
                      etiqueta="Armadura inferior (M+)"
                      verifica={z.inferior.flexion.verificaAs}
                      detalle={`Md = ${fmt(z.inferior.mEdKNm)} kN·m en x = ${fmt(z.inferior.xM, 2)} m. Anejo 19, art. 6.1 y mínima del art. 9.2.1.1 (${fmt(z.inferior.flexion.asMinCm2)} cm²).`}
                      comparacion={{
                        real: { etiqueta: "As real", valor: z.inferior.flexion.asRealCm2 },
                        limite: { etiqueta: "As nec", valor: z.inferior.flexion.asNecCm2 },
                        unidad: "cm²", exige: "≥",
                      }}
                      recomendaciones={rec.inferior}
                    />
                    <ResultadoCheck
                      etiqueta="Armadura superior (M−)"
                      verifica={!z.superior.necesaria || z.superior.flexion.verificaAs}
                      estado={z.superior.necesaria ? undefined : "no-aplica"}
                      detalle={
                        z.superior.necesaria
                          ? `Md = ${fmt(z.superior.mEdKNm)} kN·m en x = ${fmt(z.superior.xM, 2)} m: entre pilares el terreno tracciona la cara superior. Mínima ${fmt(z.superior.flexion.asMinCm2)} cm².`
                          : "Ningún tramo tracciona la cara superior."
                      }
                      comparacion={
                        z.superior.necesaria
                          ? {
                              real: { etiqueta: "As real", valor: z.superior.flexion.asRealCm2 },
                              limite: { etiqueta: "As nec", valor: z.superior.flexion.asNecCm2 },
                              unidad: "cm²", exige: "≥",
                            }
                          : undefined
                      }
                      recomendaciones={rec.superior}
                    />
                    <ResultadoCheck
                      etiqueta="Cortante sin armadura transversal"
                      verifica={z.cortante.verifica}
                      detalle={`Anejo 19, art. 6.2.2, a d de la cara del pilar (x = ${fmt(z.cortante.xM, 2)} m).`}
                      comparacion={{
                        real: { etiqueta: "Vd", valor: z.cortante.vEdKN },
                        limite: { etiqueta: "VRd,c", valor: z.cortante.vRdCKN },
                        unidad: "kN", exige: "≤",
                      }}
                      recomendaciones={rec.cortante}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo a lo largo"
                      filas={[
                        { etiqueta: "d inferior / superior", valor: `${fmt(z.inferior.flexion.d, 3)} / ${fmt(z.superior.flexion.d, 3)} m` },
                        { etiqueta: "μ inferior / superior", valor: `${fmt(z.inferior.flexion.mu, 4)} / ${fmt(z.superior.flexion.mu, 4)}` },
                        { etiqueta: "As calculada inf / sup", valor: `${fmt(z.inferior.flexion.asCalculadoCm2)} / ${fmt(z.superior.flexion.asCalculadoCm2)} cm²` },
                      ]}
                    />
                  </div>
                </Subgrupo>

                <Subgrupo titulo={`A lo ancho: por metro, bajo ${fmt(z.transversal.cargaPorMetroKN)} kN/m`}>
                  <div>
                    {descentrado ? (
                      <>
                        <TarjetaLadoZapata titulo="Vuelo del lado de la medianera" resultado={z.transversal.inicio} recomendaciones={recVuelo("inicio")} />
                        <TarjetaLadoZapata titulo="Vuelo hacia adentro" resultado={z.transversal.fin} recomendaciones={recVuelo("fin")} />
                      </>
                    ) : (
                      <TarjetaLadoZapata titulo="Vuelo a lo ancho" resultado={z.transversal.gobernante} recomendaciones={recVuelo("gobernante")} />
                    )}
                  </div>
                </Subgrupo>

                <Subgrupo titulo="Punzonamiento">
                  <div>
                    {z.punzonamiento.map((p, i) => (
                      <div key={i}>
                        <ResultadoCheck
                          etiqueta={`Punzonamiento P${i + 1}`}
                          verifica={p.verificaPunzonamiento}
                          estado={p.motivoNoEvaluado ? "no-evaluado" : undefined}
                          detalle={
                            p.motivoNoEvaluado ??
                            `Anejo 19, art. 6.4.4: pilar ${p.situacion === "interior" ? "interior" : `de ${p.situacion}`}, β = ${fmt(p.beta, 2)}, u1 = ${fmt(p.u1M, 2)} m a ${fmt(p.aCriticaM, 3)} m de la cara.`
                          }
                          comparacion={
                            p.motivoNoEvaluado
                              ? undefined
                              : { real: { etiqueta: "Vd", valor: p.vEdKN }, limite: { etiqueta: "VRd,c", valor: p.vRdCKN }, unidad: "kN", exige: "≤" }
                          }
                          recomendaciones={rec[i === 0 ? "punzonamiento1" : "punzonamiento2"]}
                        />
                        <ResultadoCheck
                          etiqueta={`Bielas en la cara de P${i + 1}`}
                          verifica={p.caraPilar.verifica}
                          detalle="Anejo 19, art. 6.4.5 (3), ec. (6.53)."
                          comparacion={{
                            real: { etiqueta: "vEd", valor: p.caraPilar.vEdMPa },
                            limite: { etiqueta: "vRd,max", valor: p.caraPilar.vRdMaxMPa },
                            unidad: "MPa", exige: "≤",
                          }}
                          recomendaciones={rec[i === 0 ? "bielas1" : "bielas2"]}
                        />
                      </div>
                    ))}
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
