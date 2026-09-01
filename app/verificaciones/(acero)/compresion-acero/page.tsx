"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { CurvaPandeo } from "@/components/verificaciones/acero/CurvaPandeo";
import {
  calcularCompresion,
  OMEGA_C,
  type PandeoEnUnEje,
  type PandeoTorsional,
  type ResultadoCompresion,
} from "@/lib/calc/acero/compresion";
import { propiedades } from "@/lib/calc/acero/perfiles";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "compresion-acero")!;

const GOBIERNA_TEXTO: Record<ResultadoCompresion["gobierna"], string> = {
  fuerte: "el eje fuerte",
  débil: "el eje débil",
  torsional: "el pandeo torsional",
};

function FilasDeEje({ eje }: { eje: PandeoEnUnEje }) {
  return (
    <PanelFormulas
      titulo="Ver cálculo"
      filas={[
        { etiqueta: "Radio de giro r", valor: `${fmt(eje.rM * 100, 2)} cm` },
        { etiqueta: "Esbeltez Lc/r", valor: fmt(eje.esbeltez, 2) },
        { etiqueta: "Límite 4,71·√(E/Fy)", valor: fmt(eje.esbeltezLimite, 2) },
        { etiqueta: "Fe = π²E/(Lc/r)²  (E3-4)", valor: `${fmt(eje.fePa / 1e6, 1)} MPa` },
        { etiqueta: "Rama aplicada", valor: eje.regimen },
        { etiqueta: "Fcr", valor: `${fmt(eje.fcrPa / 1e6, 1)} MPa` },
        { etiqueta: "Pn = Fcr·Ag  (E3-1)", valor: `${fmt(eje.pnKN, 1)} kN` },
        { etiqueta: `Pn/Ωc con Ωc = ${OMEGA_C}`, valor: `${fmt(eje.admisibleKN, 1)} kN` },
      ]}
    />
  );
}

function FilasDeTorsional({ torsional }: { torsional: PandeoTorsional }) {
  return (
    <PanelFormulas
      titulo="Ver cálculo"
      filas={[
        { etiqueta: "Kz·L", valor: `${fmt(torsional.kzLM, 2)} m` },
        { etiqueta: "Fe  (E4-2)", valor: `${fmt(torsional.fePa / 1e6, 1)} MPa` },
        { etiqueta: "Rama aplicada", valor: torsional.regimen },
        { etiqueta: "Fcr", valor: `${fmt(torsional.fcrPa / 1e6, 1)} MPa` },
        { etiqueta: "Pn = Fcr·Ag  (E4-1)", valor: `${fmt(torsional.pnKN, 1)} kN` },
        { etiqueta: `Pn/Ωc con Ωc = ${OMEGA_C}`, valor: `${fmt(torsional.admisibleKN, 1)} kN` },
      ]}
    />
  );
}

export default function CompresionAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [lcx, setLcx] = useCampo("lcx", "3.6");
  const [lcy, setLcy] = useCampo("lcy", "1.5");
  const [kzl, setKzl] = useCampo("kzl", "3.6");
  const [fy, setFy] = useCampo("fy", "250");
  const [e, setE] = useCampo("e", "200000");
  const [pRequerida, setPRequerida] = useCampo("pRequerida", "300");

  // El art. E4 sólo aplica a secciones doblemente simétricas: el PNC suelto
  // queda afuera, todo lo demás del catálogo de este módulo lo es.
  const esDoblementeSimetrica = useMemo(() => {
    if (!seccion.completos) return false;
    try {
      return propiedades(seccion.familia, seccion.params).doblementeSimetrica;
    } catch {
      return false;
    }
  }, [seccion.familia, seccion.params, seccion.completos]);

  const resultado = useMemo(() => {
    const n = { lcx: aNumero(lcx), lcy: aNumero(lcy), fy: aNumero(fy), e: aNumero(e), p: aNumero(pRequerida) };
    if (!seccion.completos) return null;
    if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

    const nKzl = aNumero(kzl);
    if (esDoblementeSimetrica && !(Number.isFinite(nKzl) && nKzl > 0)) return null;

    try {
      return calcularCompresion({
        familia: seccion.familia,
        params: seccion.params,
        lcxM: n.lcx,
        lcyM: n.lcy,
        fyPa: n.fy * 1e6,
        ePa: n.e * 1e6,
        pRequeridaKN: n.p,
        kzLM: esDoblementeSimetrica ? nKzl : undefined,
      });
    } catch {
      return null;
    }
  }, [seccion.familia, seccion.params, seccion.completos, esDoblementeSimetrica, lcx, lcy, kzl, fy, e, pRequerida]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Barras · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Artículo E3: pandeo por flexión de barras sin elementos esbeltos, por el método ASD
          (Ωc = 1,67). Se resuelven los dos ejes por separado y gobierna el menor. La longitud
          efectiva Lc = K·L se carga ya multiplicada por K. En secciones doblemente simétricas
          también se verifica el pandeo torsional del artículo E4. En tubos de pared muy delgada
          puede gobernar el pandeo local del artículo E7, que todavía no está implementado.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Longitudes y material</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="lcx" etiqueta="Lc eje fuerte" sufijo="m" valor={lcx} onChange={setLcx} />
              <CampoNumerico id="lcy" etiqueta="Lc eje débil" sufijo="m" valor={lcy} onChange={setLcy} />
              {esDoblementeSimetrica && (
                <CampoNumerico id="kzl" etiqueta="Kz·L pandeo torsional" sufijo="m" valor={kzl} onChange={setKzl} />
              )}
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="e" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </CardContent>
            {esDoblementeSimetrica && (
              <CardContent className="pt-0 text-xs text-muted-foreground">
                Sección doblemente simétrica: también se verifica el pandeo torsional del art.
                E4, con Kz·L la distancia entre puntos arriostrados al giro.
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solicitación</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="pRequerida"
                etiqueta="Compresión requerida"
                sufijo="kN"
                valor={pRequerida}
                onChange={setPRequerida}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá la sección, las longitudes, el material y la carga con valores positivos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resultado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`${resultado.designacion} — compresión admisible`}
                    verifica={resultado.verifica === true}
                    detalle={`${fmt(aNumero(pRequerida), 1)} kN / ${fmt(resultado.admisibleKN, 1)} kN · aprovechamiento ${fmt(
                      (resultado.aprovechamiento ?? 0) * 100,
                      1
                    )} %`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      Gobierna {GOBIERNA_TEXTO[resultado.gobierna]}: {fmt(resultado.admisibleKN, 1)} kN
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Ag = {fmt(resultado.areaM2 * 1e4, 2)} cm² · esbeltez máxima{" "}
                      {fmt(resultado.esbeltezMaxima, 1)}
                    </p>
                  </div>
                  {resultado.superaEsbeltezRecomendada && (
                    <p className="text-xs text-muted-foreground">
                      La esbeltez pasa de 200. La nota de usuario del artículo E2 recomienda no
                      superarla en barras dimensionadas a compresión.
                    </p>
                  )}
                  <CurvaPandeo
                    fyPa={aNumero(fy) * 1e6}
                    ePa={aNumero(e) * 1e6}
                    esbeltezFuerte={resultado.ejeFuerte.esbeltez}
                    esbeltezDebil={resultado.ejeDebil.esbeltez}
                    gobierna={resultado.gobierna === "débil" ? "débil" : "fuerte"}
                  />
                  <p className="text-xs text-muted-foreground">
                    La línea vertical separa el pandeo inelástico del elástico. Cada eje del perfil
                    cae en un punto de la curva; gobierna el de menor resistencia, marcado en rojo.
                    {resultado.pandeoTorsional && " El pandeo torsional del art. E4 no está en esta curva: se compara aparte."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pandeo eje fuerte · {fmt(resultado.ejeFuerte.admisibleKN, 1)} kN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FilasDeEje eje={resultado.ejeFuerte} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pandeo eje débil · {fmt(resultado.ejeDebil.admisibleKN, 1)} kN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FilasDeEje eje={resultado.ejeDebil} />
                </CardContent>
              </Card>

              {resultado.pandeoTorsional && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Pandeo torsional · art. E4 · {fmt(resultado.pandeoTorsional.admisibleKN, 1)} kN
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FilasDeTorsional torsional={resultado.pandeoTorsional} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
