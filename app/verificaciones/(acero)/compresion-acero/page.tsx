"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import { CurvaPandeo } from "@/components/verificaciones/acero/CurvaPandeo";
import {
  OMEGA_C,
  type PandeoEnUnEje,
  type PandeoTorsional,
  type ResultadoCompresion,
} from "@/lib/calc/acero/compresion";
import { propiedades } from "@/lib/calc/acero/perfiles";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { CONEXION, TIPO_CONECTOR, resolverCompresionAcero } from "@/lib/calc/acero/resolver-compresion";
import { recomendarCompresionAcero } from "@/lib/verificaciones/recomendaciones/acero";

const meta = registroVerificaciones.find((v) => v.id === "compresion-acero")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "longitudes", titulo: "Longitudes" },
  { id: "columna-armada", titulo: "Columna armada" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const GOBIERNA_TEXTO: Record<ResultadoCompresion["gobierna"], string> = {
  fuerte: "el eje fuerte",
  débil: "el eje débil",
  torsional: "el pandeo torsional",
};

function FilasDeEje({
  titulo,
  eje,
  corregidaPorColumnaArmada,
}: {
  titulo: string;
  eje: PandeoEnUnEje;
  corregidaPorColumnaArmada: boolean;
}) {
  return (
    <PanelFormulas
      titulo={titulo}
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
      titulo="Ver desarrollo del pandeo torsional (E4)"
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

  const campos = useMemo(
    () => ({ familia: seccion.familia, params: seccion.crudo, lcx, lcy, kzl, fy, e, pRequerida, separacionConectores, tipoConector, conexion }),
    [seccion.familia, seccion.crudo, lcx, lcy, kzl, fy, e, pRequerida, separacionConectores, tipoConector, conexion]
  );
  const resultado = useMemo(() => resolverCompresionAcero(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarCompresionAcero(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Completá la sección, las longitudes, el material y la carga con valores positivos." });
  } else if (resultado.superaEsbeltezRecomendada) {
    avisos.push({ tipo: "aviso", texto: `La esbeltez máxima (${fmt(resultado.esbeltezMaxima, 1)}) pasa de 200, el límite que recomienda la nota del art. E2.` });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Barras · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={esColumnaArmable ? ETAPAS : ETAPAS.filter((et) => et.id !== "columna-armada")} />

      <div className="flex flex-col gap-12">
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="El perfil y el acero.">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          >
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="e" etiqueta="E" sufijo="MPa" valor={e} onChange={setE} />
            </div>
          </SelectorSeccionAcero>
        </Etapa>

        <Etapa id="longitudes" numero={2} titulo="Longitudes de pandeo" descripcion="Lc = K·L, cargada ya multiplicada por K, en cada eje.">
          <div className="max-w-2xl space-y-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="lcx" etiqueta="Lc eje fuerte" sufijo="m" valor={lcx} onChange={setLcx} />
              <CampoNumerico id="lcy" etiqueta="Lc eje débil" sufijo="m" valor={lcy} onChange={setLcy} />
              {esDoblementeSimetrica && (
                <CampoNumerico id="kzl" etiqueta="Kz·L pandeo torsional" sufijo="m" valor={kzl} onChange={setKzl} />
              )}
            </div>
            {esDoblementeSimetrica && (
              <p className="text-xs text-muted-foreground">
                Sección doblemente simétrica: también se verifica el pandeo torsional del art.
                E4, con Kz·L la distancia entre puntos arriostrados al giro.
              </p>
            )}
          </div>
        </Etapa>

        {esColumnaArmable && (
          <Etapa id="columna-armada" numero={3} titulo="Columna armada" descripcion="Art. E6.2: cómo se unen los dos canales.">
            <div className="max-w-2xl space-y-4">
              <CampoSeleccion id="conexion" etiqueta="Unión entre los dos canales" valor={conexion} opciones={CONEXION} onChange={setConexion} />
              {pideColumnaArmada && (
                <div className="grid grid-cols-2 gap-4">
                  <CampoSeleccion id="tipoConector" etiqueta="Tipo de conector" valor={tipoConector} opciones={TIPO_CONECTOR} onChange={setTipoConector} />
                  <CampoNumerico id="separacionConectores" etiqueta="Separación entre conectores a" sufijo="m" valor={separacionConectores} onChange={setSeparacionConectores} />
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
            </div>
          </Etapa>
        )}

        <Etapa id="solicitacion" numero={esColumnaArmable ? 4 : 3} titulo="Solicitación" descripcion="Compresión requerida de la combinación ASD.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="pRequerida" etiqueta="Compresión requerida" sufijo="kN" valor={pRequerida} onChange={setPRequerida} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={esColumnaArmable ? 5 : 4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: resultado ? resultado.designacion : "—" },
              { etiqueta: "Fy / E", valor: `${fy} / ${e} MPa` },
              { etiqueta: "Lc fuerte / débil", valor: `${lcx} / ${lcy} m` },
              ...(esDoblementeSimetrica ? [{ etiqueta: "Kz·L", valor: `${kzl} m` }] : []),
              ...(esColumnaArmable
                ? [{ etiqueta: "Unión de los canales", valor: pideColumnaArmada ? `${tipoConector}, a = ${separacionConectores} m` : conexion }]
                : []),
              { etiqueta: "P requerida", valor: `${pRequerida} kN` },
              ...(resultado ? [{ etiqueta: "Ag", valor: `${fmt(resultado.areaM2 * 1e4, 2)} cm²`, derivado: true }] : []),
            ]}
            hipotesis={[
              `AISC 360, art. E3, por ASD (Ωc = ${OMEGA_C}): pandeo por flexión de barras sin elementos esbeltos. Se resuelven los dos ejes por separado y gobierna el menor.`,
              "En secciones doblemente simétricas también se verifica el pandeo torsional del art. E4.",
              "En 2PNC unidos por conectores espaciados, el eje débil usa la esbeltez modificada del art. E6.2. El cortante del 2 % en los conectores no se verifica acá.",
              "No contempla el pandeo local del art. E7, que puede gobernar en tubos de pared muy delgada.",
              "La esbeltez ≤ 200 de la nota del art. E2 es recomendación: se avisa, no bloquea.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={esColumnaArmable ? 6 : 5} titulo="Resultados">
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
                  { etiqueta: "Eje fuerte Pn/Ωc", valor: `${fmt(resultado.ejeFuerte.admisibleKN, 1)} kN`, nota: `Lc/r = ${fmt(resultado.ejeFuerte.esbeltez, 1)}` },
                  { etiqueta: "Eje débil Pn/Ωc", valor: `${fmt(resultado.ejeDebil.admisibleKN, 1)} kN`, nota: `Lc/r = ${fmt(resultado.ejeDebil.esbeltez, 1)}` },
                  resultado.pandeoTorsional
                    ? { etiqueta: "Torsional Pn/Ωc", valor: `${fmt(resultado.pandeoTorsional.admisibleKN, 1)} kN`, nota: "art. E4" }
                    : { etiqueta: "Torsional", valor: "—", nota: "no aplica" },
                  { etiqueta: "Esbeltez máxima", valor: fmt(resultado.esbeltezMaxima, 1), nota: "recomendado ≤ 200" },
                ]}
              />

              <Subgrupo titulo="Resistencia a compresión" detalle={`${resultado.designacion} · gobierna ${GOBIERNA_TEXTO[resultado.gobierna]}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Compresión admisible"
                    verifica={resultado.verifica === true}
                    comparacion={{
                      real: { etiqueta: "P requerida", valor: aNumero(pRequerida) },
                      limite: { etiqueta: "admisible", valor: resultado.admisibleKN },
                      unidad: "kN", exige: "≤", decimales: 1,
                    }}
                    recomendaciones={rec.compresion}
                  />
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
                  <FilasDeEje titulo="Ver desarrollo del pandeo en el eje fuerte" eje={resultado.ejeFuerte} corregidaPorColumnaArmada={false} />
                  <FilasDeEje titulo="Ver desarrollo del pandeo en el eje débil" eje={resultado.ejeDebil} corregidaPorColumnaArmada={!!resultado.columnaArmada} />
                  {resultado.pandeoTorsional && <FilasDeTorsional torsional={resultado.pandeoTorsional} />}
                </div>
              </Subgrupo>

              {resultado.columnaArmada && (
                <Subgrupo titulo="Condiciones constructivas" detalle="columna armada · art. E6.2">
                  <div className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Separación entre conectores"
                      verifica={resultado.columnaArmada.cumpleSeparacionMaxima}
                      comparacion={{
                        real: { etiqueta: "a", valor: aNumero(separacionConectores) },
                        limite: { etiqueta: "máxima", valor: resultado.columnaArmada.separacionMaximaM },
                        unidad: "m", exige: "≤", decimales: 3,
                      }}
                      detalle="art. E6.2(a): a ≤ 0,75 · (Lc/r)m · ri"
                      recomendaciones={rec.conectores}
                    />
                    {!resultado.columnaArmada.cumpleSeparacionMaxima && (
                      <p className="text-xs text-muted-foreground">
                        Con esta separación, un tramo del canal entre conectores puede pandear antes
                        que la columna completa. Achicá la separación o repetí el cálculo con más
                        conectores.
                      </p>
                    )}
                    <PanelFormulas
                      titulo="Ver desarrollo de la columna armada"
                      filas={[
                        { etiqueta: "ri — radio de giro del canal simple", valor: `${fmt(resultado.columnaArmada.riM * 100, 2)} cm` },
                        { etiqueta: "a — separación entre conectores", valor: `${fmt(aNumero(separacionConectores), 3)} m` },
                        { etiqueta: "a/ri", valor: fmt(resultado.columnaArmada.relacion, 2) },
                        { etiqueta: "Ki — canales espalda con espalda", valor: fmt(resultado.columnaArmada.ki, 2) },
                        { etiqueta: "Ecuación aplicada", valor: resultado.columnaArmada.ecuacion },
                        { etiqueta: "(Lc/r)0 — geométrica, sin corregir", valor: fmt(resultado.columnaArmada.esbeltezGeometrica, 2) },
                        { etiqueta: "(Lc/r)m — modificada", valor: fmt(resultado.columnaArmada.esbeltezModificada, 2) },
                        { etiqueta: "Esbeltez del eje fuerte", valor: fmt(resultado.ejeFuerte.esbeltez, 2) },
                        { etiqueta: "Esbeltez gobernante — máx(débil corregida, fuerte)", valor: fmt(resultado.columnaArmada.esbeltezGobernante, 2) },
                        { etiqueta: "Separación máxima admisible — E6.2(a)", valor: `${fmt(resultado.columnaArmada.separacionMaximaM, 3)} m` },
                      ]}
                    />
                  </div>
                </Subgrupo>
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
