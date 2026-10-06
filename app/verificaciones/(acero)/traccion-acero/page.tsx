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
import {
  OMEGA_T_FLUENCIA,
  OMEGA_T_ROTURA,
} from "@/lib/calc/acero/traccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { CADENA, SECCION_CRITICA, TRANSMISION, resolverTraccionAcero } from "@/lib/calc/acero/resolver-traccion";
import { recomendarTraccionAcero } from "@/lib/verificaciones/recomendaciones/acero";

const meta = registroVerificaciones.find((v) => v.id === "traccion-acero")!;

const ETAPAS = [
  { id: "seccion", titulo: "Sección" },
  { id: "seccion-critica", titulo: "Agujeros" },
  { id: "shear-lag", titulo: "Shear lag" },
  { id: "solicitacion", titulo: "Solicitación" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;


export default function TraccionAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [lM, setLM] = useCampo("lM", "3");
  const [fy, setFy] = useCampo("fy", "250");
  const [fu, setFu] = useCampo("fu", "400");
  const [pRequerida, setPRequerida] = useCampo("pRequerida", "150");

  const [seccionCritica, setSeccionCritica] = useCampo("seccionCritica", SECCION_CRITICA[0]);
  const [nAgujeros, setNAgujeros] = useCampo("nAgujeros", "2");
  const [diametroAgujero, setDiametroAgujero] = useCampo("diametroAgujero", "16");
  const [espesorAgujero, setEspesorAgujero] = useCampo("espesorAgujero", "10");
  const [cadena, setCadena] = useCampo("cadena", CADENA[0]);
  const [zigzagS, setZigzagS] = useCampo("zigzagS", "35");
  const [zigzagG, setZigzagG] = useCampo("zigzagG", "44");

  const [transmision, setTransmision] = useCampo("transmision", TRANSMISION[0]);
  const [xBarra, setXBarra] = useCampo("xBarra", "35");
  const [largoConexion, setLargoConexion] = useCampo("largoConexion", "175");
  const [uManual, setUManual] = useCampo("uManual", "0.85");

  const campos = useMemo(
    () => ({ familia: seccion.familia, params: seccion.crudo, lM, fy, fu, pRequerida, seccionCritica, nAgujeros, diametroAgujero, espesorAgujero, cadena, zigzagS, zigzagG, transmision, xBarra, largoConexion, uManual }),
    [seccion.familia, seccion.crudo, lM, fy, fu, pRequerida, seccionCritica, nAgujeros, diametroAgujero, espesorAgujero, cadena, zigzagS, zigzagG, transmision, xBarra, largoConexion, uManual]
  );
  const resultado = useMemo(() => resolverTraccionAcero(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarTraccionAcero(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Completá la sección, la longitud, el material y la carga con valores positivos (U entre 0 y 1)." });
  } else if (resultado.superaEsbeltezRecomendada) {
    avisos.push({ tipo: "aviso", texto: `L/rmin = ${fmt(resultado.esbeltez, 1)} pasa de 300, el límite que recomienda la nota del art. D1. No es requisito duro.` });
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

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="seccion" numero={1} titulo="Sección y material" descripcion="El perfil, su longitud y el acero.">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          >
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="lM" etiqueta="Longitud de la barra" sufijo="m" valor={lM} onChange={setLM} />
              <div />
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="fu" etiqueta="Fu" sufijo="MPa" valor={fu} onChange={setFu} />
            </div>
          </SelectorSeccionAcero>
        </Etapa>

        <Etapa id="seccion-critica" numero={2} titulo="Sección crítica" descripcion="Art. B4: los agujeros que descuentan área en la sección por donde rompe.">
          <div className="max-w-2xl space-y-4">
            <CampoSeleccion id="seccionCritica" etiqueta="¿La sección crítica tiene agujeros?" valor={seccionCritica} opciones={SECCION_CRITICA} onChange={setSeccionCritica} />
            {seccionCritica === SECCION_CRITICA[1] && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <CampoNumerico id="nAgujeros" etiqueta="Agujeros en la cadena" valor={nAgujeros} onChange={setNAgujeros} />
                  <CampoNumerico id="diametroAgujero" etiqueta="Diámetro nominal" sufijo="mm" valor={diametroAgujero} onChange={setDiametroAgujero} />
                  <CampoNumerico id="espesorAgujero" etiqueta="Espesor perforado" sufijo="mm" valor={espesorAgujero} onChange={setEspesorAgujero} />
                </div>
                <CampoSeleccion id="cadena" etiqueta="Traza de la cadena" valor={cadena} opciones={CADENA} onChange={setCadena} />
                {cadena === CADENA[1] && (
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="zigzagS" etiqueta="Paso longitudinal s" sufijo="mm" valor={zigzagS} onChange={setZigzagS} />
                    <CampoNumerico id="zigzagG" etiqueta="Paso transversal g" sufijo="mm" valor={zigzagG} onChange={setZigzagG} />
                  </div>
                )}
              </>
            )}
            <PanelAyuda titulo="Por qué el área neta puede ser mayor cortando en diagonal">
              <p>
                Cada agujero descuenta (φnom + 2 mm)·t: el diámetro nominal más 2 mm de holgura
                de perforación, ec. (B4-3b). El espesor es el del elemento perforado, no
                necesariamente el de catálogo de toda la sección —puede ser sólo un ala o una
                chapa soldada aparte—, por eso se carga aparte.
              </p>
              <p>
                Cuando la cadena de agujeros no es recta, cortar en diagonal alarga el camino de
                rotura y por eso la norma <em>devuelve</em> área: suma t·s²/(4g) por cada escalón,
                con s el paso a lo largo de la barra y g el paso entre las filas de agujeros que
                conecta. Es contraintuitivo —parece que zigzaguear debería perder más sección, y
                hace lo contrario— pero es la fibra la que sigue el camino más corto, no la línea
                recta.
              </p>
            </PanelAyuda>
          </div>
        </Etapa>

        <Etapa id="shear-lag" numero={3} titulo="Shear lag" descripcion="Art. D3: si la fuerza entra por toda la sección o sólo por parte.">
          <div className="max-w-2xl space-y-4">
            <CampoSeleccion id="transmision" etiqueta="¿Toda la sección transmite la fuerza?" valor={transmision} opciones={TRANSMISION} onChange={setTransmision} />
            {transmision === TRANSMISION[1] && (
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="xBarra" etiqueta="Excentricidad x̄" sufijo="mm" valor={xBarra} onChange={setXBarra} />
                <CampoNumerico id="largoConexion" etiqueta="Largo de la conexión L" sufijo="mm" valor={largoConexion} onChange={setLargoConexion} />
              </div>
            )}
            {transmision === TRANSMISION[2] && (
              <CampoNumerico id="uManual" etiqueta="U" valor={uManual} onChange={setUManual} />
            )}
            <PanelAyuda titulo="Qué es shear lag y por qué no siempre gobierna">
              <p>
                Cuando la fuerza entra por menos que toda la sección —un ángulo tomado de una sola
                ala, un perfil conectado sólo por el alma o sólo por las alas—, el tramo cercano a
                la conexión no llega a repartir la tensión entre todos los elementos: hace falta
                un corte para transmitirla, y ese corte tiene su propio límite. El área efectiva
                Ae = U·An, ec. (D3-1), lo recoge bajando el área que se usa contra Fu.
              </p>
              <p>
                Este formulario resuelve el Caso 2 de la tabla D3.1 —el general, U = 1 − x̄/L—, que
                es el que cubre la enorme mayoría de las conexiones reales. La tabla completa tiene
                casos más específicos para geometrías particulares (HSS redondos con chapa pasante
                entre ellos, por ejemplo) que no están cubiertos acá: si se conoce el U de un caso
                así, se carga directo con la tercera opción.
              </p>
              <p>
                Cuanto más corta la conexión o mayor la excentricidad x̄, más castiga U. Con la
                sección soldada en todo su perímetro o abulonada por todos sus elementos, U = 1 y
                no hay nada que corregir.
              </p>
            </PanelAyuda>
          </div>
        </Etapa>

        <Etapa id="solicitacion" numero={4} titulo="Solicitación" descripcion="Tracción requerida de la combinación ASD.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="pRequerida" etiqueta="Tracción requerida" sufijo="kN" valor={pRequerida} onChange={setPRequerida} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: resultado ? resultado.designacion : "—" },
              { etiqueta: "Longitud", valor: `${lM} m` },
              { etiqueta: "Fy / Fu", valor: `${fy} / ${fu} MPa` },
              {
                etiqueta: "Agujeros",
                valor: seccionCritica === SECCION_CRITICA[1]
                  ? `${nAgujeros} × Ø${diametroAgujero} mm en t = ${espesorAgujero} mm${cadena === CADENA[1] ? `, zigzag s ${zigzagS} / g ${zigzagG} mm` : ""}`
                  : "sin agujeros",
              },
              { etiqueta: "Transmisión", valor: transmision },
              { etiqueta: "P requerida", valor: `${pRequerida} kN` },
              ...(resultado ? [{ etiqueta: "U", valor: fmt(resultado.u, 3), derivado: true }] : []),
            ]}
            hipotesis={[
              `AISC 360, art. D2, por ASD: fluencia sobre la sección bruta (Ωt = ${fmt(OMEGA_T_FLUENCIA, 2)}) y rotura sobre la efectiva (Ωt = ${fmt(OMEGA_T_ROTURA, 2)}).`,
              "Cada agujero descuenta (φnom + 2 mm)·t, ec. (B4-3b); en zigzag se suma t·s²/(4g) por escalón.",
              "Shear lag por el Caso 2 de la tabla D3.1 (U = 1 − x̄/L) o con un U conocido de otro caso.",
              "La esbeltez L/rmin ≤ 300 de la nota del art. D1 es recomendación: se avisa, no bloquea.",
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
                  { etiqueta: "Fluencia Pn/Ωt", valor: `${fmt(resultado.admisibleFluenciaKN, 1)} kN`, nota: "D2a" },
                  { etiqueta: "Rotura Pn/Ωt", valor: `${fmt(resultado.admisibleRoturaKN, 1)} kN`, nota: "D2b" },
                  { etiqueta: "Ae", valor: `${fmt(resultado.areaEfectivaM2 * 1e4, 2)} cm²`, nota: `Ag ${fmt(resultado.areaBrutaM2 * 1e4, 2)} cm²` },
                  { etiqueta: "L/rmin", valor: fmt(resultado.esbeltez, 1), nota: "recomendado ≤ 300" },
                ]}
              />

              <Subgrupo titulo="Resistencia a tracción" detalle={`${resultado.designacion} · gobierna ${resultado.gobierna}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tracción admisible"
                    verifica={resultado.verifica === true}
                    comparacion={{
                      real: { etiqueta: "P requerida", valor: aNumero(pRequerida) },
                      limite: { etiqueta: "admisible", valor: resultado.admisibleKN },
                      unidad: "kN", exige: "≤", decimales: 1,
                    }}
                    recomendaciones={rec.traccion}
                  />
                  {resultado.superaEsbeltezRecomendada && (
                    <p className="text-xs text-muted-foreground">
                      La esbeltez L/rmin = {fmt(resultado.esbeltez, 1)} pasa de 300. La nota de
                      usuario del artículo D1 sugiere no superarla, para no tener deformaciones,
                      flexibilidad lateral o vibraciones excesivas en servicio — no es un requisito
                      duro y no bloquea la verificación de arriba.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver desarrollo de la fluencia (D2a)"
                    filas={[
                      { etiqueta: "Ag", valor: `${fmt(resultado.areaBrutaM2 * 1e4, 2)} cm²` },
                      { etiqueta: "Pn = Fy·Ag  (D2-1)", valor: `${fmt(resultado.pnFluenciaKN, 1)} kN` },
                      { etiqueta: `Pn/Ωt con Ωt = ${OMEGA_T_FLUENCIA}`, valor: `${fmt(resultado.admisibleFluenciaKN, 1)} kN` },
                    ]}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la rotura (D2b)"
                    filas={[
                      { etiqueta: "An  (B4-3b)", valor: `${fmt(resultado.areaNetaM2 * 1e4, 2)} cm²` },
                      { etiqueta: "U", valor: fmt(resultado.u, 3) },
                      { etiqueta: "Ae = U·An  (D3-1)", valor: `${fmt(resultado.areaEfectivaM2 * 1e4, 2)} cm²` },
                      { etiqueta: "Pn = Fu·Ae  (D2-2)", valor: `${fmt(resultado.pnRoturaKN, 1)} kN` },
                      { etiqueta: `Pn/Ωt con Ωt = ${OMEGA_T_ROTURA}`, valor: `${fmt(resultado.admisibleRoturaKN, 1)} kN` },
                    ]}
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
