"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisRecubrimientoAnclaje } from "@/components/verificaciones/croquis/CroquisVarios";
import {
  calcularAnclaje,
  calcularSolape,
  type FormaAnclaje,
  type SituacionAdherencia,
  type TipoEsfuerzo,
} from "@/lib/calc/hormigon/comun/anclaje";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "longitudes-anclaje")!;

const SITUACIONES: Record<SituacionAdherencia, string> = { buena: "Buena", mala: "Mala" };
const FORMAS: Record<FormaAnclaje, string> = { recta: "Recta", gancho: "Gancho a 90°" };
const ESFUERZOS: Record<TipoEsfuerzo, string> = { traccion: "Tracción", compresion: "Compresión" };
const SI_NO = ["No", "Sí"] as const;

function porClave<T extends string>(mapa: Record<T, string>, nombre: string, porDefecto: T): T {
  const entrada = (Object.entries(mapa) as [T, string][]).find(([, v]) => v === nombre);
  return entrada ? entrada[0] : porDefecto;
}

export default function LongitudesAnclajePage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [diametro, setDiametro] = useCampo("diametro", "16");
  const [situacion, setSituacion] = useCampo<SituacionAdherencia>("situacion", "buena");
  const [forma, setForma] = useCampo<FormaAnclaje>("forma", "recta");
  const [esfuerzo, setEsfuerzo] = useCampo<TipoEsfuerzo>("esfuerzo", "traccion");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "30");

  const [solape, setSolape] = useCampo<(typeof SI_NO)[number]>("solape", "No");
  const [porcentajeSolapado, setPorcentajeSolapado] = useCampo("porcentajeSolapado", "50");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      diametro: aNumero(diametro),
      recubrimiento: aNumero(recubrimiento),
      porcentajeSolapado: aNumero(porcentajeSolapado),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    if (v.porcentajeSolapado > 100) return null;

    const anclaje = calcularAnclaje(
      { fckMPa: v.fck, fykMPa: v.fyk },
      { diametroMm: v.diametro, situacion, forma, esfuerzo, recubrimientoMm: v.recubrimiento }
    );

    const haySolape = solape === "Sí";
    const solapeR = haySolape ? calcularSolape(anclaje, v.diametro, v.porcentajeSolapado) : null;

    return { v, anclaje, solapeR };
  }, [fck, fyk, diametro, situacion, forma, esfuerzo, recubrimiento, solape, porcentajeSolapado]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Barra y situación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisRecubrimientoAnclaje />
              </div>
              <CampoNumerico id="diametro" etiqueta="φ" sufijo="mm" valor={diametro} onChange={setDiametro} />
              <CampoNumerico id="recubrimiento" etiqueta="cd" sufijo="mm" valor={recubrimiento} onChange={setRecubrimiento} />
              <CampoSeleccion
                id="situacion"
                etiqueta="Adherencia"
                valor={SITUACIONES[situacion]}
                opciones={Object.values(SITUACIONES)}
                onChange={(v) => setSituacion(porClave(SITUACIONES, v, "buena"))}
              />
              <CampoSeleccion
                id="forma"
                etiqueta="Forma"
                valor={FORMAS[forma]}
                opciones={Object.values(FORMAS)}
                onChange={(v) => setForma(porClave(FORMAS, v, "recta"))}
              />
              <CampoSeleccion
                id="esfuerzo"
                etiqueta="Esfuerzo"
                valor={ESFUERZOS[esfuerzo]}
                opciones={Object.values(ESFUERZOS)}
                onChange={(v) => setEsfuerzo(porClave(ESFUERZOS, v, "traccion"))}
              />
              {esfuerzo === "compresion" && forma === "gancho" && (
                <p className="col-span-full text-xs text-muted-foreground">
                  Los ganchos y patillas no cuentan en anclajes a compresión (art. 8.4.1(3)): el
                  resultado es el mismo que con forma recta.
                </p>
              )}
              <div className="col-span-full">
                <PanelAyuda titulo="Qué es cada dato">
                  <p>
                    <strong className="text-foreground">Adherencia.</strong> Buena: armadura
                    inferior en piezas de canto moderado hormigonadas de una vez, o cualquier barra
                    con menos de 250 mm de hormigón fresco debajo. Mala: el resto — típicamente la
                    armadura superior de una viga o losa alta (fig. A19.8.2).
                  </p>
                  <p>
                    <strong className="text-foreground">cd.</strong> El menor entre el semiancho
                    libre entre barras, el recubrimiento lateral y el recubrimiento inferior (ver
                    esquema arriba). Con recubrimientos generosos (cd &gt; 3φ) un gancho acorta el
                    anclaje; con poco recubrimiento, no.
                  </p>
                  <p>
                    <strong className="text-foreground">Esfuerzo.</strong> Tracción es el caso
                    habitual. En compresión el mínimo normativo es mayor (0,6·lb,rqd en vez de
                    0,3·lb,rqd) y los ganchos no aportan nada.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solape</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion
                id="solape"
                etiqueta="¿Es un solape?"
                valor={solape}
                opciones={SI_NO}
                onChange={(v) => setSolape(v as (typeof SI_NO)[number])}
              />
              {solape === "Sí" && (
                <CampoNumerico
                  id="porcentajeSolapado"
                  etiqueta="% de barras solapadas en la sección"
                  sufijo="%"
                  valor={porcentajeSolapado}
                  onChange={setPorcentajeSolapado}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores numéricos positivos (el % solapado no puede superar
                100) para ver los resultados.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Longitud de anclaje</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      lbd = {fmt(resultado.anclaje.lbdMm, 0)} mm (
                      {fmt(resultado.anclaje.lbdMm / resultado.v.diametro, 1)}·φ)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mandril mínimo para el doblado: {fmt(resultado.anclaje.mandrilMinMm, 0)} mm
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "fctd", valor: `${fmt(resultado.anclaje.fctdMPa, 2)} MPa` },
                      { etiqueta: "η1", valor: fmt(resultado.anclaje.eta1, 2) },
                      { etiqueta: "η2", valor: fmt(resultado.anclaje.eta2, 2) },
                      { etiqueta: "fbd", valor: `${fmt(resultado.anclaje.fbdMPa, 2)} MPa` },
                      { etiqueta: "σsd (= fyd)", valor: `${fmt(resultado.anclaje.sigmaSdMPa, 1)} MPa` },
                      {
                        etiqueta: "lb,rqd",
                        formula: "(φ/4)·(σsd/fbd)",
                        sustitucion: `(${fmt(resultado.v.diametro, 0)}/4)·(${fmt(resultado.anclaje.sigmaSdMPa, 1)}/${fmt(resultado.anclaje.fbdMPa, 2)})`,
                        valor: `${fmt(resultado.anclaje.lbRqdMm, 0)} mm`,
                      },
                      { etiqueta: "α1", valor: fmt(resultado.anclaje.alfa1, 2) },
                      { etiqueta: "α2", valor: fmt(resultado.anclaje.alfa2, 2) },
                      { etiqueta: "lb,min", valor: `${fmt(resultado.anclaje.lbMinMm, 0)} mm` },
                      {
                        etiqueta: "lbd",
                        formula: "máx(lb,min ; α1·α2·lb,rqd)",
                        sustitucion: `máx(${fmt(resultado.anclaje.lbMinMm, 0)} ; ${fmt(resultado.anclaje.alfa1, 2)}·${fmt(resultado.anclaje.alfa2, 2)}·${fmt(resultado.anclaje.lbRqdMm, 0)})`,
                        valor: `${fmt(resultado.anclaje.lbdMm, 0)} mm`,
                      },
                    ]}
                  />
                </CardContent>
              </Card>

              {resultado.solapeR && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Longitud de solape</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        l0 = {fmt(resultado.solapeR.l0Mm, 0)} mm (
                        {fmt(resultado.solapeR.l0Mm / resultado.v.diametro, 1)}·φ)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        α6 = {fmt(resultado.solapeR.alfa6, 2)}, con {fmt(resultado.v.porcentajeSolapado, 0)}% de
                        barras solapadas en la sección (tabla A19.8.3)
                      </p>
                    </div>
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "α6", valor: fmt(resultado.solapeR.alfa6, 3) },
                        { etiqueta: "l0,min", valor: `${fmt(resultado.solapeR.l0MinMm, 0)} mm` },
                        {
                          etiqueta: "l0",
                          formula: "máx(l0,min ; α1·α2·α6·lb,rqd)",
                          sustitucion: `máx(${fmt(resultado.solapeR.l0MinMm, 0)} ; ${fmt(resultado.anclaje.alfa1, 2)}·${fmt(resultado.anclaje.alfa2, 2)}·${fmt(resultado.solapeR.alfa6, 2)}·${fmt(resultado.anclaje.lbRqdMm, 0)})`,
                          valor: `${fmt(resultado.solapeR.l0Mm, 0)} mm`,
                        },
                      ]}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separación libre máxima entre barras solapadas: 4φ (art. 8.7.2(3)); si no se
                      cumple, hay que sumarle esa distancia a l0.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-primary/30">
                <CardContent className="py-4 text-sm text-muted-foreground">
                  σsd se toma en fluencia plena (σsd = fyd): la barra ancla la fuerza que
                  desarrollaría al 100% de su capacidad. Es la hipótesis más conservadora — si As
                  real supera bastante a As necesaria, el anclaje real puede ser más corto. Los
                  coeficientes α3 (confinamiento por armadura transversal) y α5 (presión
                  transversal) se toman en 1,0, sin descontar ningún efecto favorable que esta
                  página no puede verificar.
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
