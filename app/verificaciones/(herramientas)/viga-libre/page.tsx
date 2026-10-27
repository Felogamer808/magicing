"use client";

import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramasViga } from "@/components/verificaciones/estatica/DiagramasViga";
import { PasarTramoAVigas } from "@/components/verificaciones/estatica/PasarTramoAVigas";
import { EditorVigaLibre } from "@/components/verificaciones/estatica/EditorVigaLibre";
import { Button } from "@/components/ui/button";
import {
  COMBINACIONES_LIBRE,
  calcularEnvolventeVigaLibre,
  envolventeTodoCargado,
  type EnvolventeVigaLibre,
  type ExtremoEnvolvente,
} from "@/lib/calc/estatica/viga-libre";
import {
  anchosDelModelo,
  datosDelModelo,
  leerModelo,
  rigidezDeSeccion,
  type SeccionVigaLibre,
} from "@/lib/verificaciones/viga-libre-modelo";
import {
  ROTULOS_TIPO_SECCION,
  tipoSeccionDesdeCampo,
  tipoSeccionPorRotulo,
  type TipoSeccion,
} from "@/lib/calc/hormigon/vigas/seccion-t";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "viga-libre")!;

const ETAPAS = [
  { id: "viga", titulo: "Tramos y cargas" },
  { id: "seccion", titulo: "Sección" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
  { id: "vigas", titulo: "Verificar un tramo" },
] as const;

const NOMBRE_APOYO: Record<string, string> = {
  simple: "Apoyo simple",
  empotrado: "Empotramiento",
};

/** El −10⁻¹⁵ del solver se imprime "−0,00": se aplasta al formatear, como en el formulario. */
const sinCeroNegativo = (n: number) => (Math.abs(n) < 5e-9 ? 0 : n);

/** Un valor si mínimo y máximo coinciden; si no, "mín … máx". */
const rango = (min: number, max: number, unidad: string) =>
  Math.abs(max - min) < 1e-6
    ? `${fmt(sinCeroNegativo(max), 2)} ${unidad}`
    : `${fmt(sinCeroNegativo(min), 2)} … ${fmt(sinCeroNegativo(max), 2)} ${unidad}`;

type Estado = { ok: true; env: EnvolventeVigaLibre } | { ok: false; motivo: string };

/** "Q en tramos 1 y 3", para decir qué disposición da cada extremo. */
function disposicion(e: ExtremoEnvolvente, nTramos: number, alternada: boolean) {
  if (!alternada) return `x = ${fmt(e.xM, 2)} m`;
  const t = e.tramosConQ;
  const texto =
    t.length === 0 ? "sin Q" : t.length === nTramos ? "Q en todos" : `Q en ${t.length === 1 ? "tramo" : "tramos"} ${t.join(", ")}`;
  return `x = ${fmt(e.xM, 2)} m · ${texto}`;
}

export default function VigaLibrePage() {
  const [norma, setNorma] = useCampo("norma", "Estática");
  const [crudo, setCrudo] = useCampo("modelo", "");
  const [combinacionId, setCombinacionId] = useCampo("combinacion", "elu");
  // Los mismos nombres de campo que Vigas, que es adonde viajan.
  const [tipoSeccionCampo, setTipoSeccion] = useCampo<TipoSeccion>("tipoSeccion", "rectangular");
  const [b, setB] = useCampo("b", "0.3");
  const [h, setH] = useCampo("h", "0.6");
  const [anchoAla, setAnchoAla] = useCampo("anchoAla", "1.2");
  const [espesorAla, setEspesorAla] = useCampo("espesorAla", "0.15");
  const [fck, setFck] = useCampo("fck", "30");
  const [alternar, setAlternar] = useCampo("alternarQ", "si");
  const alternada = alternar === "si";

  const modelo = leerModelo(crudo);
  const combinacion = COMBINACIONES_LIBRE.find((c) => c.id === combinacionId) ?? COMBINACIONES_LIBRE[0];
  const seccion: SeccionVigaLibre = { tipoSeccion: tipoSeccionDesdeCampo(tipoSeccionCampo), b, h, anchoAla, espesorAla, fck };
  const conAla = seccion.tipoSeccion !== "rectangular";
  const rigidez = rigidezDeSeccion(seccion);
  const eiKNm2 = rigidez.eiKNm2;

  const leido: ReturnType<typeof datosDelModelo> = rigidez.motivo
    ? { ok: false, motivo: rigidez.motivo }
    : datosDelModelo(modelo, eiKNm2);
  let estado: Estado;
  if (!leido.ok) {
    estado = leido;
  } else {
    try {
      estado = {
        ok: true,
        env: alternada ? calcularEnvolventeVigaLibre(leido.datos, combinacion) : envolventeTodoCargado(leido.datos, combinacion),
      };
    } catch (e) {
      estado = { ok: false, motivo: e instanceof Error ? e.message : "No se pudo resolver la viga." };
    }
  }

  const avisos: AvisoRevision[] = estado.ok ? [] : [{ tipo: "error", texto: estado.motivo }];
  const env = estado.ok ? estado.env : null;
  const nTramos = modelo.tramos.length;
  const largoM = env ? env.todoCargado.entrada.largoM : 0;
  const flechaMod = env ? Math.abs(env.flechaMax.valor) : 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Estática · Herramientas de análisis</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa
          id="viga"
          numero={1}
          titulo="Tramos y cargas"
          descripcion="Se arma sobre el dibujo: agregá tramos y cargas, y tocá cualquier elemento para editarlo."
        >
          <div>
            <EditorVigaLibre modelo={modelo} onChange={(m) => setCrudo(JSON.stringify(m))} />
          </div>
        </Etapa>

        <Etapa
          id="seccion"
          numero={2}
          titulo="Sección y hormigón"
          descripcion="Da la rigidez para la flecha y viaja a Vigas con los esfuerzos del tramo."
        >
          <div className="max-w-2xl space-y-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2">
                <CampoSeleccion
                  id="tipoSeccion"
                  etiqueta="Tipo de sección"
                  valor={ROTULOS_TIPO_SECCION[seccion.tipoSeccion]}
                  opciones={Object.values(ROTULOS_TIPO_SECCION)}
                  onChange={(x) => setTipoSeccion(tipoSeccionPorRotulo(x))}
                />
              </div>
              <CampoNumerico id="b" etiqueta={conAla ? "bw (alma)" : "b"} sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              {conAla && (
                <>
                  <CampoNumerico id="anchoAla" etiqueta="Ancho del ala" sufijo="m" valor={anchoAla} onChange={setAnchoAla} />
                  <CampoNumerico id="espesorAla" etiqueta="hf" sufijo="m" valor={espesorAla} onChange={setEspesorAla} />
                </>
              )}
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
            </div>
            <p className="font-mono text-[13px] tabular-nums">
              Ecm = {Number.isFinite(rigidez.eGPa) ? fmt(rigidez.eGPa, 1) : "—"} GPa · I ={" "}
              {Number.isFinite(rigidez.inerciaM4) ? fmt(rigidez.inerciaM4 * 1e8, 0) : "—"} cm⁴ · EI ={" "}
              {Number.isFinite(eiKNm2) ? fmt(eiKNm2, 0) : "—"} kN·m²
            </p>
            <p className="text-xs text-muted-foreground">
              Ecm del Anejo 19, tabla A19.3.1, e I de la sección bruta sin fisurar. Con EI constante las reacciones y
              los diagramas de V y M no dependen de ella: sólo escala la flecha, que es elástica. La flecha con
              fisuración y fluencia se verifica en Deformaciones.
            </p>
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Tramos", valor: modelo.tramos.map((t) => `${t.luz} m`).join(" + ") },
              { etiqueta: "Cargas", valor: `${modelo.cargas.filter((c) => c.caso === "G").length} G · ${modelo.cargas.filter((c) => c.caso === "Q").length} Q` },
              { etiqueta: "Combinación", valor: combinacion.nombre },
              { etiqueta: "Sobrecarga Q", valor: alternada ? "Alternada por tramo (envolvente)" : "En todos los tramos" },
              { etiqueta: "Sección", valor: conAla ? `${ROTULOS_TIPO_SECCION[seccion.tipoSeccion]} · bw ${b} × h ${h} · ala ${anchoAla} × ${espesorAla} m` : `${b} × ${h} m` },
              { etiqueta: "fck", valor: `${fck} MPa` },
              { etiqueta: "EI", valor: Number.isFinite(eiKNm2) ? `${fmt(eiKNm2, 0)} kN·m²` : "—", derivado: true },
            ]}
            hipotesis={[
              "Rigidez directa con elementos de Euler-Bernoulli, el mismo motor que el formulario de vigas: exacto para cargas puntuales y distribuidas lineales.",
              alternada
                ? "Q alternada tramo por tramo, voladizos incluidos: la envolvente es el peor de las 2ⁿ disposiciones en cada sección, como pide el Anejo 19, art. 5.1.3 (1), pág. 45."
                : "Q en todos los tramos a la vez: en vigas continuas el negativo en apoyos y el positivo en vanos pueden quedar cortos. Para dimensionar, alternar Q.",
              "G con el mismo coeficiente en toda la viga (1,35 en ELU); sólo Q se alterna. γQ = 1,5. Son los coeficientes del resto de la app.",
              "EI constante en toda la viga, con Ecm (Anejo 19, art. 3.1.3, tabla A19.3.1) y la inercia bruta: la flecha es elástica, sin fisuración. Cargas positivas hacia abajo; el flector se dibuja del lado traccionado.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          <div className="space-y-8">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full max-w-xs">
              <CampoSeleccion
                id="combinacion"
                etiqueta="Combinación"
                valor={combinacion.nombre}
                opciones={COMBINACIONES_LIBRE.map((c) => c.nombre)}
                onChange={(n) => {
                  const c = COMBINACIONES_LIBRE.find((x) => x.nombre === n);
                  if (c) setCombinacionId(c.id);
                }}
              />
              </div>
              <div className="flex gap-2">
                <Button variant={alternada ? "default" : "outline"} size="sm" onClick={() => setAlternar("si")}>
                  Q alternada por tramo
                </Button>
                <Button variant={alternada ? "outline" : "default"} size="sm" onClick={() => setAlternar("no")}>
                  Q en todos los tramos
                </Button>
              </div>
            </div>
            {!estado.ok || !env ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
                <EstadoVerificacionChip estado="datos-insuficientes" />
                <span className="text-muted-foreground">{estado.ok ? "" : estado.motivo}</span>
              </div>
            ) : (
              <div className="space-y-10">
                <PanelMetricas
                  horizontal
                  metricas={[
                    { etiqueta: "Momento máx. +", valor: `${fmt(sinCeroNegativo(env.momentoMax.valor), 2)} kN·m`, nota: disposicion(env.momentoMax, nTramos, alternada) },
                    { etiqueta: "Momento máx. −", valor: `${fmt(sinCeroNegativo(env.momentoMin.valor), 2)} kN·m`, nota: disposicion(env.momentoMin, nTramos, alternada) },
                    { etiqueta: "Cortante máx.", valor: `${fmt(sinCeroNegativo(env.cortanteMax.valor), 2)} kN`, nota: disposicion(env.cortanteMax, nTramos, alternada) },
                    combinacion.flechaConSentido
                      ? {
                          etiqueta: "Flecha máx.",
                          valor: `${fmt(sinCeroNegativo(env.flechaMax.valor), 2)} mm`,
                          nota: flechaMod > 1e-9 ? `L / ${fmt(largoM / (flechaMod / 1000), 0)} · ${disposicion(env.flechaMax, nTramos, alternada)}` : "sin flecha",
                        }
                      : { etiqueta: "Flecha", valor: "—", nota: "elegir una combinación de servicio" },
                  ]}
                />
                <Subgrupo titulo="Diagramas">
                  <div className="space-y-2">
                    <DiagramasViga
                      largoM={largoM}
                      nodos={env.todoCargado.entrada.nodos}
                      cargas={env.todoCargado.entrada.cargas}
                      resultado={env.todoCargado.resultado}
                      envolvente={alternada ? env : undefined}
                    />
                    <p className="text-xs text-muted-foreground">
                      {alternada && "Envolvente: cada diagrama muestra el máximo y el mínimo de todas las disposiciones de Q. "}
                      Cargas ya multiplicadas por los coeficientes de la combinación. El flector se dibuja
                      del lado traccionado: lo que queda para abajo es momento positivo y se arma abajo.
                      {!combinacion.flechaConSentido && " La deformada de ELU no es una flecha: sólo muestra la forma."}
                    </p>
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Reacciones">
                  <div className="space-y-3 pt-0">
                    <div>
                      {env.reacciones
                        .filter((x) => x.tipo !== "libre")
                        .map((x) => (
                          <div key={x.xM} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
                            <span className="text-sm text-muted-foreground">{`${NOMBRE_APOYO[x.tipo]} en x = ${fmt(x.xM, 2)} m`}</span>
                            <span className="font-mono text-sm tabular-nums">
                              {rango(x.rMinKN, x.rMaxKN, "kN")}
                              {x.tipo === "empotrado" && ` · ${rango(x.mMinKNm, x.mMaxKNm, "kN·m")}`}
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reacción vertical positiva hacia arriba; momento de empotramiento positivo antihorario.
                      {alternada && " Con Q alternada se da el mínimo y el máximo; un mínimo negativo es levantamiento."}
                      {" "}Cierre de equilibrio vertical con todo cargado: {fmt(Math.abs(env.todoCargado.resultado.desequilibrioKN), 6)} kN.
                    </p>
                  </div>
                </Subgrupo>
              </div>
            )}
          </div>
        </Etapa>

        <Etapa
          id="vigas"
          numero={5}
          titulo="Verificar un tramo"
          descripcion="Lleva los esfuerzos de cálculo de un tramo a la verificación de vigas: M en la cara del apoyo y Vd a d del borde."
        >
          {leido.ok ? (
            <PasarTramoAVigas datos={leido.datos} anchosApoyoM={anchosDelModelo(modelo)} seccion={seccion} />
          ) : (
            <p className="text-sm text-muted-foreground">{leido.motivo}</p>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
