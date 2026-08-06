"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { DiagramaFlechas } from "@/components/verificaciones/pretensado/DiagramaFlechas";
import { DiagramaFlexion } from "@/components/verificaciones/pretensado/DiagramaFlexion";
import { DiagramaPerdidas } from "@/components/verificaciones/pretensado/DiagramaPerdidas";
import { DiagramaTensiones } from "@/components/verificaciones/pretensado/DiagramaTensiones";
import { SeccionPretensadaDiagrama } from "@/components/verificaciones/pretensado/SeccionPretensadaDiagrama";
import { calcularPretensado } from "@/lib/calc/aci/pretensado";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "pretensado")!;

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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Vigas y losas · Hormigón pretensado</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Pieza pretesada según ACI 318-19. El cálculo va en dos etapas y esa distinción es la que
          manda: el pretensado se introduce sobre la <strong>sección simple</strong> —la pieza
          premoldeada sola— y las cargas posteriores actúan sobre la <strong>sección compuesta</strong>,
          ya con la carpeta. Por eso se cargan las dos por separado.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fc" etiqueta="f'c premoldeado" sufijo="MPa" valor={fc} onChange={setFc} />
              <CampoNumerico id="fci" etiqueta="f'ci (transferencia)" sufijo="MPa" valor={fci} onChange={setFci} />
              <CampoNumerico id="fcSitu" etiqueta="f'c in situ (carpeta)" sufijo="MPa" valor={fcSitu} onChange={setFcSitu} />
              <CampoNumerico id="fpu" etiqueta="fpu del torón" sufijo="MPa" valor={fpu} onChange={setFpu} />
              <CampoNumerico id="areaToron" etiqueta="Área por torón" sufijo="mm²" valor={areaToron} onChange={setAreaToron} />
              <CampoNumerico id="fuerzaToron" etiqueta="Fuerza por torón" sufijo="kN" valor={fuerzaToron} onChange={setFuerzaToron} />
              <CampoNumerico id="fyPasiva" etiqueta="fy pasiva" sufijo="MPa" valor={fyPasiva} onChange={setFyPasiva} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sección simple (premoldeado)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {resultado && (
                <div className="col-span-full">
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
                </div>
              )}
              <CampoNumerico id="luz" etiqueta="Luz de cálculo" sufijo="m" valor={luz} onChange={setLuz} />
              <div />
              <CampoNumerico id="hS" etiqueta="h" sufijo="m" valor={hS} onChange={setHS} />
              <CampoNumerico id="bS" etiqueta="b" sufijo="m" valor={bS} onChange={setBS} />
              <CampoNumerico id="aS" etiqueta="Área" sufijo="m²" valor={aS} onChange={setAS} />
              <CampoNumerico id="iS" etiqueta="Inercia" sufijo="m⁴" valor={iS} onChange={setIS} />
              <CampoNumerico id="ygS" etiqueta="yg (desde abajo)" sufijo="m" valor={ygS} onChange={setYgS} />
              <CampoNumerico id="perimS" etiqueta="Perímetro" sufijo="m" valor={perimS} onChange={setPerimS} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sección compuesta (con carpeta)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="hC" etiqueta="h" sufijo="m" valor={hC} onChange={setHC} />
              <CampoNumerico id="bC" etiqueta="b comprimido" sufijo="m" valor={bC} onChange={setBC} />
              <CampoNumerico id="aC" etiqueta="Área" sufijo="m²" valor={aC} onChange={setAC} />
              <CampoNumerico id="iC" etiqueta="Inercia" sufijo="m⁴" valor={iC} onChange={setIC} />
              <CampoNumerico id="ygC" etiqueta="yg (desde abajo)" sufijo="m" valor={ygC} onChange={setYgC} />
              <CampoNumerico id="perimC" etiqueta="Perímetro" sufijo="m" valor={perimC} onChange={setPerimC} />
              <CampoNumerico id="recPret" etiqueta="Rec. mec. pretensado" sufijo="m" valor={recPret} onChange={setRecPret} />
              <CampoNumerico id="recPas" etiqueta="Rec. mec. pasiva" sufijo="m" valor={recPas} onChange={setRecPas} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cargas y armaduras</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="cargaMuerta" etiqueta="Carga muerta" sufijo="kN/m" valor={cargaMuerta} onChange={setCargaMuerta} />
              <CampoNumerico id="sobrecarga" etiqueta="Sobrecarga de uso" sufijo="kN/m" valor={sobrecarga} onChange={setSobrecarga} />
              <CampoNumerico id="ev" etiqueta="Ev" sufijo="kN/m" valor={ev} onChange={setEv} />
              <CampoNumerico id="torones" etiqueta="Torones inferiores" valor={torones} onChange={setTorones} />
              <CampoNumerico id="diamPas" etiqueta="Ø pasiva" sufijo="mm" valor={diamPas} onChange={setDiamPas} />
              <CampoNumerico id="nPas" etiqueta="Barras pasivas" valor={nPas} onChange={setNPas} />
              <CampoNumerico id="pInst" etiqueta="Pérdidas instantáneas" sufijo="%" valor={pInst} onChange={setPInst} />
              <CampoNumerico id="pDif" etiqueta="Pérdidas diferidas" sufijo="%" valor={pDif} onChange={setPDif} />
              <CampoNumerico id="hr" etiqueta="Humedad relativa" sufijo="%" valor={hr} onChange={setHr} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá materiales, las dos secciones, cargas y armaduras con valores válidos.
                El baricentro y el recubrimiento tienen que caer dentro del canto.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flexión última (art. 20.3)"
                    verifica={resultado.flexion.verifica}
                    detalle={`${fmt(resultado.cargas.momentoUltimoKNm, 1)} kN·m / ${fmt(resultado.flexion.momentoAdmisibleKNm, 1)} kN·m · aprovechamiento ${fmt(resultado.flexion.aprovechamiento * 100, 1)} %`}
                  />
                  <ResultadoCheck
                    etiqueta="Área de pretensado (tabla 20.3.2.5.1)"
                    verifica={resultado.armaduraActiva.verifica}
                    detalle={`${fmt(resultado.armaduraActiva.apRealMm2, 0)} mm² colocados / ${fmt(resultado.armaduraActiva.apMinimoMm2, 0)} mm² necesarios`}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía mínima (1,2·Mcr ≤ φMn)"
                    verifica={resultado.cuantiaMinima.verifica}
                    detalle={`1,2·Mcr = ${fmt(1.2 * resultado.cuantiaMinima.mcrKNm, 1)} kN·m / φMn = ${fmt(resultado.flexion.momentoAdmisibleKNm, 1)} kN·m`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión en el cordón tras el tesado"
                    verifica={resultado.perdidas.verifica}
                    detalle={`${fmt(resultado.perdidas.tensionTrasTesadoMPa, 0)} MPa / ${fmt(resultado.perdidas.tensionAdmisibleMPa, 0)} MPa`}
                  />
                  <ResultadoCheck
                    etiqueta="Flechas (tabla 24.2.2)"
                    verifica={resultado.deformaciones.verifica}
                    detalle={`total ${fmt(resultado.deformaciones.totalMm, 1)} mm / ${fmt(resultado.deformaciones.limiteTotalMm, 1)} mm`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tensiones en servicio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Pérdidas de pretensado</CardTitle></CardHeader>
                <CardContent className="space-y-4">
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
                    titulo="Ver cálculo"
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Flexión y flechas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
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
                  <DiagramaFlechas
                    instantaneaMm={resultado.deformaciones.instantaneaMm}
                    activaMm={resultado.deformaciones.activaMm}
                    totalMm={resultado.deformaciones.totalMm}
                    limiteInstantaneaMm={resultado.deformaciones.limiteInstantaneaMm}
                    limiteActivaMm={resultado.deformaciones.limiteActivaMm}
                    limiteTotalMm={resultado.deformaciones.limiteTotalMm}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
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
                      { etiqueta: "Flecha instantánea", valor: `${fmt(resultado.deformaciones.instantaneaMm, 1)} / ${fmt(resultado.deformaciones.limiteInstantaneaMm, 1)} mm` },
                      { etiqueta: "Flecha activa", valor: `${fmt(resultado.deformaciones.activaMm, 1)} / ${fmt(resultado.deformaciones.limiteActivaMm, 1)} mm` },
                      { etiqueta: "Flecha total", valor: `${fmt(resultado.deformaciones.totalMm, 1)} / ${fmt(resultado.deformaciones.limiteTotalMm, 1)} mm` },
                    ]}
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
