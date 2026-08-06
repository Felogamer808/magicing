"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { DiagramaCabezal } from "@/components/verificaciones/DiagramaCabezal";
import { calcularCabezalDosPilotes } from "@/lib/calc/ec2/cabezal-pilotes";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "cabezales")!;

export default function CabezalPilotesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [rg, setRg] = useCampo("rg", "0.05");

  const [anchoPilar, setAnchoPilar] = useCampo("anchoPilar", "0.3");
  const [ladoX, setLadoX] = useCampo("ladoX", "1.6");
  const [ladoY, setLadoY] = useCampo("ladoY", "0.6");
  const [hCab, setHCab] = useCampo("hCab", "0.6");
  const [dPilote, setDPilote] = useCampo("dPilote", "0.5");
  const [ndPilar, setNdPilar] = useCampo("ndPilar", "1040");

  const [nPrinc, setNPrinc] = useCampo("nPrinc", "7");
  const [phiPrinc, setPhiPrinc] = useCampo("phiPrinc", "16");
  const [nSec, setNSec] = useCampo("nSec", "7");
  const [phiSec, setPhiSec] = useCampo("phiSec", "10");
  const [nEstV, setNEstV] = useCampo("nEstV", "10");
  const [phiEstV, setPhiEstV] = useCampo("phiEstV", "8");
  const [nCercos, setNCercos] = useCampo("nCercos", "2");
  const [nEstH, setNEstH] = useCampo("nEstH", "5");
  const [phiEstH, setPhiEstH] = useCampo("phiEstH", "10");

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk), rg: aNumero(rg),
      anchoPilar: aNumero(anchoPilar), ladoX: aNumero(ladoX), ladoY: aNumero(ladoY),
      hCab: aNumero(hCab), dPilote: aNumero(dPilote), ndPilar: aNumero(ndPilar),
      nPrinc: aNumero(nPrinc), phiPrinc: aNumero(phiPrinc),
      nSec: aNumero(nSec), phiSec: aNumero(phiSec),
      nEstV: aNumero(nEstV), phiEstV: aNumero(phiEstV), nCercos: aNumero(nCercos),
      nEstH: aNumero(nEstH), phiEstH: aNumero(phiEstH),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.fck <= 0 || n.fyk <= 0 || n.anchoPilar <= 0 || n.ladoX <= 0 || n.ladoY <= 0 || n.hCab <= 0 || n.dPilote <= 0 || n.ndPilar <= 0) return null;
    if ([n.nPrinc, n.phiPrinc, n.nSec, n.phiSec, n.nEstV, n.phiEstV, n.nCercos, n.nEstH, n.phiEstH].some((x) => x <= 0)) return null;
    if (n.nPrinc < 2 || n.nSec < 2) return null;

    const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
    const r = calcularCabezalDosPilotes(
      materiales,
      { anchoPilarM: n.anchoPilar, ladoXM: n.ladoX, ladoYM: n.ladoY, hM: n.hCab, diametroPiloteM: n.dPilote, recubrimientoM: n.rg },
      {
        ndPilarKN: n.ndPilar,
        armaduraPrincipal: { numero: n.nPrinc, diametroMm: n.phiPrinc },
        armaduraSecundaria: { numero: n.nSec, diametroMm: n.phiSec },
        estribosVerticales: { numero: n.nEstV, diametroMm: n.phiEstV, numeroCercos: n.nCercos },
        estribosHorizontales: { numero: n.nEstH, diametroMm: n.phiEstH },
      }
    );
    return { n, r };
  }, [fck, fyk, rg, anchoPilar, ladoX, ladoY, hCab, dPilote, ndPilar, nPrinc, phiPrinc, nSec, phiSec, nEstV, phiEstV, nCercos, nEstH, phiEstH]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader><CardTitle className="text-base">Modelo de bielas y tirantes</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <DiagramaCabezal
              ladoXM={resultado.n.ladoX}
              hM={resultado.n.hCab}
              anchoPilarM={resultado.n.anchoPilar}
              diametroPiloteM={resultado.n.dPilote}
              separacionPilotesM={resultado.r.principal.separacionPilotesM}
            />
          </CardContent>
        </Card>
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
            <CardHeader><CardTitle className="text-base">Geometría y carga</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="anchoPilar" etiqueta="Ancho pilar" sufijo="m" valor={anchoPilar} onChange={setAnchoPilar} />
              <CampoNumerico id="ladoX" etiqueta="Lado x" sufijo="m" valor={ladoX} onChange={setLadoX} />
              <CampoNumerico id="ladoY" etiqueta="Lado y" sufijo="m" valor={ladoY} onChange={setLadoY} />
              <CampoNumerico id="hCab" etiqueta="H" sufijo="m" valor={hCab} onChange={setHCab} />
              <CampoNumerico id="dPilote" etiqueta="D pilote" sufijo="m" valor={dPilote} onChange={setDPilote} />
              <CampoNumerico id="ndPilar" etiqueta="Nd pilar" sufijo="kN" valor={ndPilar} onChange={setNdPilar} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Armadura principal</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="nPrinc" etiqueta="Nº barras" valor={nPrinc} onChange={setNPrinc} />
                <CampoNumerico id="phiPrinc" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiPrinc} onChange={setPhiPrinc} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Armadura secundaria</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="nSec" etiqueta="Nº barras" valor={nSec} onChange={setNSec} />
                <CampoNumerico id="phiSec" etiqueta="φ" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiSec} onChange={setPhiSec} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Estribos verticales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="nEstV" etiqueta="Nº" valor={nEstV} onChange={setNEstV} />
                <CampoNumerico id="phiEstV" etiqueta="φt" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiEstV} onChange={setPhiEstV} />
                <CampoNumerico id="nCercos" etiqueta="Cercos" valor={nCercos} onChange={setNCercos} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Estribos horizontales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <CampoNumerico id="nEstH" etiqueta="Nº" valor={nEstH} onChange={setNEstH} />
                <CampoNumerico id="phiEstH" etiqueta="φl" sufijo="mm" sugerencias={DIAMETROS_ARMADURA} valor={phiEstH} onChange={setPhiEstH} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (al menos 2 barras en principal y secundaria).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Armadura principal (tirante)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura suficiente"
                    verifica={resultado.r.principal.verificaAs}
                    detalle={`As real ${fmt(resultado.r.principal.asRealCm2)} cm² / As nec ${fmt(resultado.r.principal.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Las barras entran en el ancho del cabezal"
                    verifica={resultado.r.principal.verificaBNec}
                    detalle={`b nec ${fmt(resultado.r.principal.bNecM, 3)} m / lado y ${fmt(resultado.n.ladoY, 2)} m · separación ${fmt(resultado.r.principal.separacionMm, 0)} mm`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Separación de pilotes s = 2,5·D", valor: `${fmt(resultado.r.principal.separacionPilotesM)} m` },
                      { etiqueta: "Brazo v", valor: `${fmt(resultado.r.principal.vM, 3)} m` },
                      { etiqueta: "d", valor: `${fmt(resultado.r.principal.dM, 3)} m` },
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.r.principal.pesoPropioKN)} kN` },
                      { etiqueta: "Nd por pilote", valor: `${fmt(resultado.r.principal.ndPorPiloteKN)} kN` },
                      { etiqueta: "Td (tracción del tirante)", valor: `${fmt(resultado.r.principal.tdKN)} kN` },
                      { etiqueta: "Anclaje lb,neta", valor: `${fmt(resultado.r.principal.lbNetaMm, 0)} mm` },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">El anclaje se mide desde el eje del pilote.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Armaduras complementarias</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Armadura secundaria (10% de la principal)"
                    verifica={resultado.r.secundaria.verificaAs}
                    detalle={`As real ${fmt(resultado.r.secundaria.asRealCm2)} cm² / As nec ${fmt(resultado.r.secundaria.asNecCm2)} cm²`}
                  />
                  <ResultadoCheck
                    etiqueta="Estribos verticales"
                    verifica={resultado.r.estribosVerticales.verificaAs}
                    detalle={`As real ${fmt(resultado.r.estribosVerticales.asRealCm2)} cm² / As nec ${fmt(resultado.r.estribosVerticales.asNecCm2)} cm² · cada ${fmt(resultado.r.estribosVerticales.separacionM * 100, 0)} cm`}
                  />
                  <ResultadoCheck
                    etiqueta="Estribos horizontales"
                    verifica={resultado.r.estribosHorizontales.verificaAs}
                    detalle={`As real ${fmt(resultado.r.estribosHorizontales.asRealCm2)} cm² / As nec ${fmt(resultado.r.estribosHorizontales.asNecCm2)} cm² · cada ${fmt(resultado.r.estribosHorizontales.separacionM * 100, 0)} cm`}
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                La planilla calculaba la separación de estribos verticales dividiendo por n+1 en la hoja de
                pilar circular y por n−1 en la de pilar rectangular; acá se usa n−1 en los dos casos, que es
                lo que hacen todas las demás separaciones de esas hojas.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
