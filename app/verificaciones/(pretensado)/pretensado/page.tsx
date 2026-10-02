"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaFlechas } from "@/components/verificaciones/pretensado/DiagramaFlechas";
import { DiagramaFlexion } from "@/components/verificaciones/pretensado/DiagramaFlexion";
import { DiagramaPerdidas } from "@/components/verificaciones/pretensado/DiagramaPerdidas";
import { DiagramaTensiones } from "@/components/verificaciones/pretensado/DiagramaTensiones";
import { SeccionPretensadaDiagrama } from "@/components/verificaciones/pretensado/SeccionPretensadaDiagrama";
import { calcularPretensado } from "@/lib/calc/hormigon/pretensado";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "pretensado")!;

const ETAPAS = [
  { id: "materiales", titulo: "Materiales" },
  { id: "secciones", titulo: "Secciones" },
  { id: "armaduras", titulo: "Armaduras" },
  { id: "cargas", titulo: "Cargas" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function PretensadoPage() {
  const [norma, setNorma] = useCampo("norma", "ACI 318");

  // Materiales
  const [fc, setFc] = useCampo("fc", "50");
  const [fci, setFci] = useCampo("fci", "40");
  const [fcSitu, setFcSitu] = useCampo("fcSitu", "30");
  const [fpu, setFpu] = useCampo("fpu", "1860");
  const [areaToron, setAreaToron] = useCampo("areaToron", "99");
  const [fuerzaToron, setFuerzaToron] = useCampo("fuerzaToron", "156");
  const [fyPasiva, setFyPasiva] = useCampo("fyPasiva", "500");

  // Geometría
  const [luz, setLuz] = useCampo("luz", "7.2");
  const [hS, setHS] = useCampo("hS", "0.45");
  const [bS, setBS] = useCampo("bS", "0.6");
  const [aS, setAS] = useCampo("aS", "0.24");
  const [iS, setIS] = useCampo("iS", "0.0037");
  const [ygS, setYgS] = useCampo("ygS", "0.206");
  const [perimS, setPerimS] = useCampo("perimS", "2.1");

  const [hC, setHC] = useCampo("hC", "0.5");
  const [bC, setBC] = useCampo("bC", "0.6");
  const [aC, setAC] = useCampo("aC", "0.3");
  const [iC, setIC] = useCampo("iC", "0.0072");
  const [ygC, setYgC] = useCampo("ygC", "0.26");
  const [perimC, setPerimC] = useCampo("perimC", "2.4");

  const [recPas, setRecPas] = useCampo("recPas", "0.035");
  const [recPret, setRecPret] = useCampo("recPret", "0.05");

  // Cargas
  const [cargaMuerta, setCargaMuerta] = useCampo("cargaMuerta", "46.605");
  const [sobrecarga, setSobrecarga] = useCampo("sobrecarga", "28.68");
  const [ev, setEv] = useCampo("ev", "0");

  // Armaduras y pérdidas
  const [torones, setTorones] = useCampo("torones", "8");
  const [diamPas, setDiamPas] = useCampo("diamPas", "16");
  const [nPas, setNPas] = useCampo("nPas", "6");
  const [pInst, setPInst] = useCampo("pInst", "15");
  const [pDif, setPDif] = useCampo("pDif", "10");
  const [hr, setHr] = useCampo("hr", "90");

  const resultado = useMemo(() => {
    const n = {
      fc: aNumero(fc), fci: aNumero(fci), fcSitu: aNumero(fcSitu), fpu: aNumero(fpu),
      areaToron: aNumero(areaToron), fuerzaToron: aNumero(fuerzaToron), fyPasiva: aNumero(fyPasiva),
      luz: aNumero(luz),
      hS: aNumero(hS), bS: aNumero(bS), aS: aNumero(aS), iS: aNumero(iS), ygS: aNumero(ygS), perimS: aNumero(perimS),
      hC: aNumero(hC), bC: aNumero(bC), aC: aNumero(aC), iC: aNumero(iC), ygC: aNumero(ygC), perimC: aNumero(perimC),
      recPas: aNumero(recPas), recPret: aNumero(recPret),
      cargaMuerta: aNumero(cargaMuerta), sobrecarga: aNumero(sobrecarga), ev: aNumero(ev),
      torones: aNumero(torones), diamPas: aNumero(diamPas), nPas: aNumero(nPas),
      pInst: aNumero(pInst), pDif: aNumero(pDif), hr: aNumero(hr),
    };

    const positivos = [
      n.fc, n.fci, n.fcSitu, n.fpu, n.areaToron, n.fuerzaToron, n.fyPasiva, n.luz,
      n.hS, n.bS, n.aS, n.iS, n.ygS, n.perimS, n.hC, n.bC, n.aC, n.iC, n.ygC, n.perimC,
      n.recPret, n.torones, n.hr,
    ];
    if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
    const noNegativos = [n.cargaMuerta, n.sobrecarga, n.ev, n.nPas, n.pInst, n.pDif, n.recPas];
    if (!noNegativos.every((x) => Number.isFinite(x) && x >= 0)) return null;
    // La armadura pasiva no puede quedar por encima del pretensado ni fuera de la sección.
    if (n.recPret >= n.hS || n.ygS >= n.hS || n.ygC >= n.hC) return null;

    try {
      return calcularPretensado({
        fcPremoldeadoMPa: n.fc,
        fciMPa: n.fci,
        fcInSituMPa: n.fcSitu,
        densidadKgM3: 2500,
        fpuMPa: n.fpu,
        epMPa: 195000,
        areaToronMm2: n.areaToron,
        fuerzaPorToronKN: n.fuerzaToron,
        fyPasivaMPa: n.fyPasiva,
        diametroPasivaMm: n.diamPas,
        cantidadPasiva: n.nPas,
        luzM: n.luz,
        simple: { hM: n.hS, bM: n.bS, areaM2: n.aS, iM4: n.iS, ygM: n.ygS, perimetroM: n.perimS },
        compuesta: { hM: n.hC, bM: n.bC, areaM2: n.aC, iM4: n.iC, ygM: n.ygC, perimetroM: n.perimC },
        recMecPasivaM: n.recPas,
        recMecPretensadoM: n.recPret,
        cargaMuertaKNm: n.cargaMuerta,
        sobrecargaKNm: n.sobrecarga,
        cargaEvKNm: n.ev,
        toronesInf: Math.round(n.torones),
        toronesSup: 0,
        perdidasInstantaneas: n.pInst / 100,
        perdidasDiferidas: n.pDif / 100,
        humedadRelativa: n.hr,
      });
    } catch {
      return null;
    }
  }, [fc, fci, fcSitu, fpu, areaToron, fuerzaToron, fyPasiva, luz, hS, bS, aS, iS, ygS, perimS,
      hC, bC, aC, iC, ygC, perimC, recPas, recPret, cargaMuerta, sobrecarga, ev, torones,
      diamPas, nPas, pInst, pDif, hr]);

  /*
   * Escala común a los tres diagramas de tensión: sin ella cada uno se dibujaría
   * con su propio zoom y no se podrían comparar entre sí, que es justamente lo
   * que interesa al pasar de transferencia a servicio.
   */
  const escalaTension = useMemo(() => {
    if (!resultado) return 1;
    const valores = resultado.tensiones.flatMap((t) => [
      Math.abs(t.sigmaSupMPa),
      Math.abs(t.sigmaInfMPa),
      Math.abs(t.admisibleTraccionMPa),
      Math.abs(t.admisibleCompresionMPa),
    ]);
    return Math.max(...valores) * 1.1;
  }, [resultado]);

  const escalaCanto = aNumero(hC) || 1;

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Completá materiales, las dos secciones, cargas y armaduras con valores válidos. El baricentro y el recubrimiento tienen que caer dentro del canto." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Vigas y losas · Hormigón pretensado</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="materiales" numero={1} titulo="Materiales" descripcion="Hormigón del premoldeado en servicio y en la transferencia, carpeta y aceros.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="fc" etiqueta="f'c premoldeado" sufijo="MPa" valor={fc} onChange={setFc} />
            <CampoNumerico id="fci" etiqueta="f'ci (transferencia)" sufijo="MPa" valor={fci} onChange={setFci} />
            <CampoNumerico id="fcSitu" etiqueta="f'c in situ (carpeta)" sufijo="MPa" valor={fcSitu} onChange={setFcSitu} />
            <CampoNumerico id="fpu" etiqueta="fpu del torón" sufijo="MPa" valor={fpu} onChange={setFpu} />
            <CampoNumerico id="areaToron" etiqueta="Área por torón" sufijo="mm²" valor={areaToron} onChange={setAreaToron} />
            <CampoNumerico id="fuerzaToron" etiqueta="Fuerza por torón" sufijo="kN" valor={fuerzaToron} onChange={setFuerzaToron} />
            <CampoNumerico id="fyPasiva" etiqueta="fy pasiva" sufijo="MPa" valor={fyPasiva} onChange={setFyPasiva} />
          </div>
        </Etapa>

        <Etapa id="secciones" numero={2} titulo="Secciones" descripcion="El pretensado actúa sobre la sección simple; las cargas posteriores, sobre la compuesta con la carpeta.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="luz" etiqueta="Luz de cálculo" sufijo="m" valor={luz} onChange={setLuz} />
                </div>
                <Subgrupo titulo="Sección simple (premoldeado)">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="hS" etiqueta="h" sufijo="m" valor={hS} onChange={setHS} />
                    <CampoNumerico id="bS" etiqueta="b" sufijo="m" valor={bS} onChange={setBS} />
                    <CampoNumerico id="aS" etiqueta="Área" sufijo="m²" valor={aS} onChange={setAS} />
                    <CampoNumerico id="iS" etiqueta="Inercia" sufijo="m⁴" valor={iS} onChange={setIS} />
                    <CampoNumerico id="ygS" etiqueta="yg (desde abajo)" sufijo="m" valor={ygS} onChange={setYgS} />
                    <CampoNumerico id="perimS" etiqueta="Perímetro" sufijo="m" valor={perimS} onChange={setPerimS} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Sección compuesta (con carpeta)">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="hC" etiqueta="h" sufijo="m" valor={hC} onChange={setHC} />
                    <CampoNumerico id="bC" etiqueta="b comprimido" sufijo="m" valor={bC} onChange={setBC} />
                    <CampoNumerico id="aC" etiqueta="Área" sufijo="m²" valor={aC} onChange={setAC} />
                    <CampoNumerico id="iC" etiqueta="Inercia" sufijo="m⁴" valor={iC} onChange={setIC} />
                    <CampoNumerico id="ygC" etiqueta="yg (desde abajo)" sufijo="m" valor={ygC} onChange={setYgC} />
                    <CampoNumerico id="perimC" etiqueta="Perímetro" sufijo="m" valor={perimC} onChange={setPerimC} />
                    <CampoNumerico id="recPret" etiqueta="Rec. mec. pretensado" sufijo="m" valor={recPret} onChange={setRecPret} />
                    <CampoNumerico id="recPas" etiqueta="Rec. mec. pasiva" sufijo="m" valor={recPas} onChange={setRecPas} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={
              resultado ? (
                <SeccionPretensadaDiagrama
                  hSimpleM={aNumero(hS)}
                  bSimpleM={aNumero(bS)}
                  hCompuestaM={aNumero(hC)}
                  bCompuestaM={aNumero(bC)}
                  ygSimpleM={aNumero(ygS)}
                  ygCompuestaM={aNumero(ygC)}
                  recPretensadoM={aNumero(recPret)}
                  torones={Math.round(aNumero(torones))}
                  excentricidadM={resultado.propiedades.excentricidadM}
                />
              ) : null
            }
          />
        </Etapa>

        <Etapa id="armaduras" numero={3} titulo="Armaduras y pérdidas" descripcion="Torones inferiores, armadura pasiva y la estimación de pérdidas.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="torones" etiqueta="Torones inferiores" valor={torones} onChange={setTorones} />
            <CampoNumerico id="diamPas" etiqueta="Ø pasiva" sufijo="mm" valor={diamPas} onChange={setDiamPas} />
            <CampoNumerico id="nPas" etiqueta="Barras pasivas" valor={nPas} onChange={setNPas} />
            <CampoNumerico id="pInst" etiqueta="Pérdidas instantáneas" sufijo="%" valor={pInst} onChange={setPInst} />
            <CampoNumerico id="pDif" etiqueta="Pérdidas diferidas" sufijo="%" valor={pDif} onChange={setPDif} />
            <CampoNumerico id="hr" etiqueta="Humedad relativa" sufijo="%" valor={hr} onChange={setHr} />
          </div>
        </Etapa>

        <Etapa id="cargas" numero={4} titulo="Cargas" descripcion="Cargas posteriores a la carpeta, por metro de viga.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="cargaMuerta" etiqueta="Carga muerta" sufijo="kN/m" valor={cargaMuerta} onChange={setCargaMuerta} />
            <CampoNumerico id="sobrecarga" etiqueta="Sobrecarga de uso" sufijo="kN/m" valor={sobrecarga} onChange={setSobrecarga} />
            <CampoNumerico id="ev" etiqueta="Ev" sufijo="kN/m" valor={ev} onChange={setEv} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "f'c · f'ci · f'c carpeta", valor: `${fc} · ${fci} · ${fcSitu} MPa` },
              { etiqueta: "Torón", valor: `fpu ${fpu} MPa, ${areaToron} mm², ${fuerzaToron} kN` },
              { etiqueta: "Luz", valor: `${luz} m` },
              { etiqueta: "Sección simple h × b", valor: `${hS} × ${bS} m` },
              { etiqueta: "Sección compuesta h × b", valor: `${hC} × ${bC} m` },
              { etiqueta: "Armadura", valor: `${torones} torones · ${nPas} Ø${diamPas} pasivas` },
              { etiqueta: "Pérdidas estimadas", valor: `${pInst} % instantáneas · ${pDif} % diferidas` },
              { etiqueta: "Cargas", valor: `D ${cargaMuerta} · L ${sobrecarga} · Ev ${ev} kN/m` },
              ...(resultado ? [{ etiqueta: "Excentricidad e", valor: `${fmt(resultado.propiedades.excentricidadM * 100, 1)} cm`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Pieza pretesada según ACI 318-19: tensiones admisibles en servicio y resistencia última en rotura.",
              "El pretensado se introduce sobre la sección simple; las cargas posteriores actúan sobre la compuesta.",
              "Densidad del hormigón 2500 kg/m³ y Ep = 195 000 MPa; sin torones superiores.",
              "Mu = 1,2·(peso propio + carpeta + carga muerta) + 1,6·sobrecarga + Ev.",
              "Pérdidas ES, SH, CR y RE con coeficientes de pieza pretesada y cordón de baja relajación.",
              "Flechas contra l/360, l/240 y l/250 (tabla 24.2.2).",
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
                  { etiqueta: "φMn", valor: `${fmt(resultado.flexion.momentoAdmisibleKNm, 1)} kN·m`, nota: `Mu ${fmt(resultado.cargas.momentoUltimoKNm, 1)} kN·m` },
                  { etiqueta: "Pi · Pf", valor: `${fmt(resultado.fuerzas.piKN, 0)} · ${fmt(resultado.fuerzas.pfKN, 0)} kN` },
                  { etiqueta: "Pérdidas", valor: `${fmt(resultado.perdidas.totalMPa, 0)} MPa`, nota: `σ efectiva ${fmt(resultado.perdidas.tensionEfectivaMPa, 0)} MPa` },
                  { etiqueta: "Flecha total", valor: `${fmt(resultado.deformaciones.totalMm, 1)} mm`, nota: `límite ${fmt(resultado.deformaciones.limiteTotalMm, 1)} mm` },
                ]}
              />

              <Subgrupo titulo="Flexión última" detalle="art. 20.3">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flexión última (art. 20.3)"
                    verifica={resultado.flexion.verifica}
                    comparacion={{
                      real: { etiqueta: "Mu", valor: resultado.cargas.momentoUltimoKNm },
                      limite: { etiqueta: "φMn", valor: resultado.flexion.momentoAdmisibleKNm },
                      unidad: "kN·m", exige: "≤", decimales: 1,
                    }}
                  />
                  <DiagramaFlexion
                    hM={aNumero(hC)}
                    bM={aNumero(bC)}
                    dpM={resultado.propiedades.dpM}
                    dsM={resultado.propiedades.dsM}
                    aM={resultado.flexion.aM}
                    cM={resultado.flexion.cM}
                    deformacionNeta={resultado.flexion.deformacionNeta}
                    controladaPorTraccion={resultado.flexion.controladaPorTraccion}
                    hayPasiva={aNumero(nPas) > 0}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la flexión"
                    filas={[
                      { etiqueta: "Excentricidad e", valor: `${fmt(resultado.propiedades.excentricidadM * 100, 1)} cm` },
                      { etiqueta: "dp", valor: `${fmt(resultado.propiedades.dpM * 100, 1)} cm` },
                      { etiqueta: "ρp = Ap/(b·dp)", valor: fmt(resultado.flexion.cuantiaPretensado * 100, 3) + " %" },
                      { etiqueta: "fps (art. 20.3.2.3.1)", valor: `${fmt(resultado.flexion.fpsMPa, 0)} MPa` },
                      { etiqueta: "a (bloque comprimido)", valor: `${fmt(resultado.flexion.aM * 100, 1)} cm` },
                      { etiqueta: "c (fibra neutra)", valor: `${fmt(resultado.flexion.cM * 100, 1)} cm` },
                      {
                        etiqueta: "εt (deformación neta)",
                        valor: `${fmt(resultado.flexion.deformacionNeta * 1000, 2)} ‰ — ${resultado.flexion.controladaPorTraccion ? "controlada por tracción" : "sobrearmada"}`,
                      },
                      { etiqueta: "Mn", valor: `${fmt(resultado.flexion.mnKNm, 1)} kN·m` },
                      { etiqueta: "φMn", valor: `${fmt(resultado.flexion.momentoAdmisibleKNm, 1)} kN·m` },
                      { etiqueta: "fr (módulo de rotura)", valor: `${fmt(resultado.cuantiaMinima.frMPa, 2)} MPa` },
                      { etiqueta: "Mcr", valor: `${fmt(resultado.cuantiaMinima.mcrKNm, 1)} kN·m` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Tensiones en servicio">
                <div className="space-y-6">
                  <p className="text-xs text-muted-foreground">
                    La banda verde es el rango admisible de cada situación. El trapecio es el
                    diagrama de tensiones entre las dos fibras: en transferencia el pretensado
                    tracciona arriba, y con las cargas de servicio se invierte.
                  </p>
                  {resultado.tensiones.map((t) => (
                    <div key={t.nombre} className="space-y-2">
                      <ResultadoCheck
                        etiqueta={t.nombre}
                        verifica={t.verifica}
                        detalle={`P = ${fmt(t.fuerzaKN, 0)} kN · M = ${fmt(t.momentoKNm, 1)} kN·m · banda ${fmt(t.admisibleCompresionMPa, 1)} a ${fmt(t.admisibleTraccionMPa, 2)} MPa · art. ${t.articulo}`}
                      />
                      <DiagramaTensiones situacion={t} hM={escalaCanto} escalaMPa={escalaTension} />
                    </div>
                  ))}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Pérdidas de pretensado">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tensión en el cordón tras el tesado"
                    verifica={resultado.perdidas.verifica}
                    comparacion={{
                      real: { etiqueta: "σ tras tesado", valor: resultado.perdidas.tensionTrasTesadoMPa },
                      limite: { etiqueta: "σ adm", valor: resultado.perdidas.tensionAdmisibleMPa },
                      unidad: "MPa", exige: "≤", decimales: 0,
                    }}
                  />
                  <DiagramaPerdidas
                    tensionTrasTesadoMPa={resultado.perdidas.tensionTrasTesadoMPa}
                    esMPa={resultado.perdidas.esMPa}
                    shMPa={resultado.perdidas.shMPa}
                    crMPa={resultado.perdidas.crMPa}
                    reMPa={resultado.perdidas.reMPa}
                    tensionEfectivaMPa={resultado.perdidas.tensionEfectivaMPa}
                    admisibleMPa={resultado.perdidas.tensionAdmisibleMPa}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de las pérdidas"
                    filas={[
                      { etiqueta: "Po (al tesar)", valor: `${fmt(resultado.fuerzas.poKN, 1)} kN` },
                      { etiqueta: "Pi (tras instantáneas)", valor: `${fmt(resultado.fuerzas.piKN, 1)} kN` },
                      { etiqueta: "Pf (tras todas)", valor: `${fmt(resultado.fuerzas.pfKN, 1)} kN` },
                      { etiqueta: "ES — acortamiento elástico", valor: `${fmt(resultado.perdidas.esMPa, 1)} MPa` },
                      { etiqueta: "SH — contracción", valor: `${fmt(resultado.perdidas.shMPa, 1)} MPa` },
                      { etiqueta: "CR — fluencia", valor: `${fmt(resultado.perdidas.crMPa, 1)} MPa` },
                      { etiqueta: "RE — relajación", valor: `${fmt(resultado.perdidas.reMPa, 1)} MPa` },
                      { etiqueta: "Total", valor: `${fmt(resultado.perdidas.totalMPa, 1)} MPa` },
                      { etiqueta: "Tensión efectiva", valor: `${fmt(resultado.perdidas.tensionEfectivaMPa, 0)} MPa` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Flechas" detalle="tabla 24.2.2">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flechas (tabla 24.2.2)"
                    verifica={resultado.deformaciones.verifica}
                    comparacion={{
                      real: { etiqueta: "flecha total", valor: resultado.deformaciones.totalMm },
                      limite: { etiqueta: "límite", valor: resultado.deformaciones.limiteTotalMm },
                      unidad: "mm", exige: "≤", decimales: 1,
                    }}
                  />
                  <DiagramaFlechas
                    instantaneaMm={resultado.deformaciones.instantaneaMm}
                    activaMm={resultado.deformaciones.activaMm}
                    totalMm={resultado.deformaciones.totalMm}
                    limiteInstantaneaMm={resultado.deformaciones.limiteInstantaneaMm}
                    limiteActivaMm={resultado.deformaciones.limiteActivaMm}
                    limiteTotalMm={resultado.deformaciones.limiteTotalMm}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de las flechas"
                    filas={[
                      { etiqueta: "Flecha instantánea", valor: `${fmt(resultado.deformaciones.instantaneaMm, 1)} / ${fmt(resultado.deformaciones.limiteInstantaneaMm, 1)} mm` },
                      { etiqueta: "Flecha activa", valor: `${fmt(resultado.deformaciones.activaMm, 1)} / ${fmt(resultado.deformaciones.limiteActivaMm, 1)} mm` },
                      { etiqueta: "Flecha total", valor: `${fmt(resultado.deformaciones.totalMm, 1)} / ${fmt(resultado.deformaciones.limiteTotalMm, 1)} mm` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Área de pretensado (tabla 20.3.2.5.1)"
                    verifica={resultado.armaduraActiva.verifica}
                    comparacion={{
                      real: { etiqueta: "Ap colocada", valor: resultado.armaduraActiva.apRealMm2 },
                      limite: { etiqueta: "Ap mínima", valor: resultado.armaduraActiva.apMinimoMm2 },
                      unidad: "mm²", exige: "≥", decimales: 0,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía mínima (1,2·Mcr ≤ φMn)"
                    verifica={resultado.cuantiaMinima.verifica}
                    comparacion={{
                      real: { etiqueta: "1,2·Mcr", valor: 1.2 * resultado.cuantiaMinima.mcrKNm },
                      limite: { etiqueta: "φMn", valor: resultado.flexion.momentoAdmisibleKNm },
                      unidad: "kN·m", exige: "≤", decimales: 1,
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
