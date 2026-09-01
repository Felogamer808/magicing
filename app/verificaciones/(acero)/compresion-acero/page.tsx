"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { CurvaPandeo } from "@/components/verificaciones/acero/CurvaPandeo";
import {
  calcularCompresion,
  OMEGA_C,
  type DatosColumnaArmada,
  type PandeoEnUnEje,
  type PandeoTorsional,
  type ResultadoCompresion,
  type TipoConectorArmada,
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

const CONEXION = ["Continua (soldadura corrida)", "Intermitente (conectores espaciados)"] as const;
const TIPO_CONECTOR = ["Atornillado sin pretensar", "Soldado o atornillado pretensado (clase A/B)"] as const;

function tipoConectorDesde(etiqueta: string): TipoConectorArmada {
  return etiqueta === TIPO_CONECTOR[0] ? "atornillado-sin-pretensar" : "soldado-o-pretensado";
}

function FilasDeEje({ eje, corregidaPorColumnaArmada }: { eje: PandeoEnUnEje; corregidaPorColumnaArmada: boolean }) {
  return (
    <PanelFormulas
      titulo="Ver cálculo"
      filas={[
        { etiqueta: "Radio de giro r", valor: `${fmt(eje.rM * 100, 2)} cm` },
        {
          etiqueta: corregidaPorColumnaArmada ? "Esbeltez (Lc/r)m, corregida — E6.2" : "Esbeltez Lc/r",
          valor: fmt(eje.esbeltez, 2),
        },
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

  const esColumnaArmable = seccion.familia === "2PNC-almas";
  const [conexion, setConexion] = useCampo("conexion", CONEXION[0]);
  const [tipoConector, setTipoConector] = useCampo("tipoConector", TIPO_CONECTOR[0]);
  const [separacionConectores, setSeparacionConectores] = useCampo("separacionConectores", "0.4");

  const pideColumnaArmada = esColumnaArmable && conexion === CONEXION[1];

  const resultado = useMemo(() => {
    const n = { lcx: aNumero(lcx), lcy: aNumero(lcy), fy: aNumero(fy), e: aNumero(e), p: aNumero(pRequerida) };
    if (!seccion.completos) return null;
    if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

    const nKzl = aNumero(kzl);
    if (esDoblementeSimetrica && !(Number.isFinite(nKzl) && nKzl > 0)) return null;

    let columnaArmada: DatosColumnaArmada | undefined;
    if (pideColumnaArmada) {
      const aM = aNumero(separacionConectores);
      if (!Number.isFinite(aM) || aM <= 0) return null;
      columnaArmada = { aM, tipo: tipoConectorDesde(tipoConector) };
    }

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
        columnaArmada,
      });
    } catch {
      return null;
    }
  }, [
    seccion.familia, seccion.params, seccion.completos, esDoblementeSimetrica, lcx, lcy, kzl, fy, e, pRequerida,
    pideColumnaArmada, separacionConectores, tipoConector,
  ]);

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
          también se verifica el pandeo torsional del artículo E4. En 2PNC soldados por las almas
          con conectores intermedios en vez de soldadura corrida, se suma la esbeltez modificada
          del artículo E6.2 —columnas armadas—, más abajo. En tubos de pared muy delgada puede
          gobernar el pandeo local del artículo E7, que todavía no está implementado.
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

          {esColumnaArmable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Columna armada — art. E6.2</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CampoSeleccion
                  id="conexion"
                  etiqueta="Unión entre los dos canales"
                  valor={conexion}
                  opciones={CONEXION}
                  onChange={setConexion}
                />
                {pideColumnaArmada && (
                  <div className="grid grid-cols-2 gap-4">
                    <CampoSeleccion
                      id="tipoConector"
                      etiqueta="Tipo de conector"
                      valor={tipoConector}
                      opciones={TIPO_CONECTOR}
                      onChange={setTipoConector}
                    />
                    <CampoNumerico
                      id="separacionConectores"
                      etiqueta="Separación entre conectores a"
                      sufijo="m"
                      valor={separacionConectores}
                      onChange={setSeparacionConectores}
                    />
                  </div>
                )}
                <PanelAyuda titulo="Por qué esto sólo afecta al eje débil">
                  <p>
                    Con soldadura corrida, los dos canales trabajan como una sola pieza compuesta y
                    esta corrección no aplica: es lo que ya calcula la sección de arriba.
                  </p>
                  <p>
                    Con conectores espaciados, la columna es más flexible de lo que indica la
                    esbeltez geométrica —los conectores dejan pasar algo de corte relativo entre los
                    dos canales— y el art. E6.2 lo recoge con una esbeltez modificada (Lc/r)m, mayor
                    que la geométrica (Lc/r)0.
                  </p>
                  <p>
                    Sólo corrige el eje débil, porque es el único con término de Steiner en la
                    composición: cada canal aporta su inercia propia más A·brazo² hasta el eje de
                    simetría, y necesita que los conectores transmitan corte para que la sección
                    trabaje entera. El eje fuerte duplica Ix sin ningún traslado —cada canal ya
                    flexiona solo alrededor de su propio eje fuerte— y no depende de la conexión.
                  </p>
                  <p>
                    El art. E6.2 también pide diseñar los conectores para un cortante igual al 2 % de
                    la carga axial de la columna. Esta página no verifica esa unión —haría falta el
                    tipo y diámetro del conector—, así que queda a cargo de la verificación aparte.
                  </p>
                </PanelAyuda>
              </CardContent>
            </Card>
          )}
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
                  <FilasDeEje eje={resultado.ejeFuerte} corregidaPorColumnaArmada={false} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pandeo eje débil · {fmt(resultado.ejeDebil.admisibleKN, 1)} kN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FilasDeEje eje={resultado.ejeDebil} corregidaPorColumnaArmada={!!resultado.columnaArmada} />
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

              {resultado.columnaArmada && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Columna armada — art. E6.2</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Separación entre conectores"
                      verifica={resultado.columnaArmada.cumpleSeparacionMaxima}
                      detalle={`${fmt(aNumero(separacionConectores), 3)} m / máx ${fmt(
                        resultado.columnaArmada.separacionMaximaM,
                        3
                      )} m · art. E6.2(a): a ≤ 0,75 · (Lc/r)m · ri`}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "ri — radio de giro del canal simple", valor: `${fmt(resultado.columnaArmada.riM * 100, 2)} cm` },
                        { etiqueta: "a — separación entre conectores", valor: `${fmt(aNumero(separacionConectores), 3)} m` },
                        { etiqueta: "a/ri", valor: fmt(resultado.columnaArmada.relacion, 2) },
                        { etiqueta: "Ki — canales espalda con espalda", valor: fmt(resultado.columnaArmada.ki, 2) },
                        { etiqueta: "Ecuación aplicada", valor: resultado.columnaArmada.ecuacion },
                        { etiqueta: "(Lc/r)0 — geométrica, sin corregir", valor: fmt(resultado.columnaArmada.esbeltezGeometrica, 2) },
                        { etiqueta: "(Lc/r)m — modificada", valor: fmt(resultado.columnaArmada.esbeltezModificada, 2) },
                        { etiqueta: "Separación máxima admisible — E6.2(a)", valor: `${fmt(resultado.columnaArmada.separacionMaximaM, 3)} m` },
                      ]}
                    />
                    {!resultado.columnaArmada.cumpleSeparacionMaxima && (
                      <p className="text-xs text-destructive">
                        Con esta separación, un tramo del canal entre conectores puede pandear antes
                        que la columna completa. Achicá la separación o repetí el cálculo con más
                        conectores.
                      </p>
                    )}
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
