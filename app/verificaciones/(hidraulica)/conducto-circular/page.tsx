"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { SeccionConducto } from "@/components/verificaciones/hidraulica/SeccionConducto";
import {
  LLENADO_CAUDAL_MAXIMO,
  calcularConductoCircular,
} from "@/lib/calc/hidraulica/conducto-circular";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "conducto-circular")!;

export default function ConductoCircularPage() {
  const [norma, setNorma] = useCampo("norma", "—");

  const [caudal, setCaudal] = useCampo("caudal", "30");
  const [diametro, setDiametro] = useCampo("diametro", "300");
  const [pendiente, setPendiente] = useCampo("pendiente", "5");
  const [manning, setManning] = useCampo("manning", "0.013");

  const [vMin, setVMin] = useCampo("vMin", "0.6");
  const [vMax, setVMax] = useCampo("vMax", "3");
  const [llenadoMax, setLlenadoMax] = useCampo("llenadoMax", "0.75");

  const resultado = useMemo(() => {
    /*
     * Los campos se piden en las unidades de obra —litros por segundo,
     * milímetros, por mil— y se convierten acá a las del cálculo. Pedirle a
     * alguien que escriba 0,03 m³/s o 0,005 m/m es la clase de fricción que hace
     * que se siga prefiriendo la planilla.
     */
    const n = {
      caudalLs: aNumero(caudal),
      diametroMm: aNumero(diametro),
      pendientePorMil: aNumero(pendiente),
      manning: aNumero(manning),
      vMin: aNumero(vMin),
      vMax: aNumero(vMax),
      llenadoMax: aNumero(llenadoMax),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;
    if (n.llenadoMax > 1 || n.vMin >= n.vMax) return null;

    const datos = {
      caudalM3s: n.caudalLs / 1000,
      diametroM: n.diametroMm / 1000,
      pendiente: n.pendientePorMil / 1000,
      manning: n.manning,
    };
    const limites = {
      velocidadMinimaMs: n.vMin,
      velocidadMaximaMs: n.vMax,
      llenadoMaximo: n.llenadoMax,
    };

    return { n, datos, limites, r: calcularConductoCircular(datos, limites) };
  }, [caudal, diametro, pendiente, manning, vMin, vMax, llenadoMax]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Hidráulica</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader><CardTitle className="text-base">Sección</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <SeccionConducto
              diametroM={resultado.datos.diametroM}
              llenado={resultado.r.seccion.llenado}
              alturaM={resultado.r.seccion.alturaM}
              desborda={resultado.r.desborda}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Conducto</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="caudal" etiqueta="Caudal de proyecto" sufijo="L/s" valor={caudal} onChange={setCaudal} />
              <CampoNumerico id="diametro" etiqueta="Diámetro interno" sufijo="mm" valor={diametro} onChange={setDiametro} />
              <CampoNumerico id="pendiente" etiqueta="Pendiente" sufijo="‰" valor={pendiente} onChange={setPendiente} />
              <CampoNumerico id="manning" etiqueta="n de Manning" sufijo="s/m⅓" valor={manning} onChange={setManning} />
              <div className="col-span-2">
                <PanelAyuda titulo="Qué es cada dato y de dónde sale">
                  <p>
                    <strong className="text-foreground">Caudal de proyecto.</strong> El que hay que
                    transportar, ya afectado por el coeficiente de pico y el horizonte de diseño. Es
                    la decisión que más condiciona el resultado y no se calcula acá.
                  </p>
                  <p>
                    <strong className="text-foreground">n de Manning.</strong> Cuánta resistencia
                    opone la pared. Valores corrientes: PVC y PEAD 0,009–0,011; hormigón bien
                    terminado 0,013; hormigón viejo o con incrustaciones 0,015 o más. Entra dividiendo,
                    así que subirlo baja el caudal en la misma proporción.
                  </p>
                  <p>
                    <strong className="text-foreground">Pendiente.</strong> Se carga en por mil, que es
                    como se replantea. El caudal crece con su raíz: para duplicarlo hay que
                    cuadruplicar la pendiente.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Límites exigidos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="vMin" etiqueta="Velocidad mínima" sufijo="m/s" valor={vMin} onChange={setVMin} />
              <CampoNumerico id="vMax" etiqueta="Velocidad máxima" sufijo="m/s" valor={vMax} onChange={setVMax} />
              <CampoNumerico id="llenadoMax" etiqueta="Llenado máximo y/D" valor={llenadoMax} onChange={setLlenadoMax} />
              <div className="col-span-2">
                <PanelAyuda titulo="Por qué estos límites son datos y no constantes">
                  <p>
                    La ecuación de Manning es empírica y vale igual en cualquier lado. Lo que cambia
                    de un reglamento a otro son los límites que se le exigen al resultado, y por eso
                    acá se cargan en vez de venir fijos.
                  </p>
                  <p>
                    <strong className="text-foreground">Velocidad mínima.</strong> Por debajo de
                    cierta velocidad el material en suspensión sedimenta y el conducto se va tapando.
                    El valor típico de autolimpieza ronda 0,6 m/s.
                  </p>
                  <p>
                    <strong className="text-foreground">Velocidad máxima.</strong> Por arriba, el
                    flujo erosiona la pared. Depende mucho del material: 3 m/s es un valor prudente
                    para hormigón, y los plásticos toleran más.
                  </p>
                  <p>
                    <strong className="text-foreground">Llenado máximo.</strong> No se proyecta a
                    sección llena. Se deja resguardo para la ventilación y para el caudal que no se
                    previó; valores habituales van de 0,70 a 0,80.
                  </p>
                  <p>
                    Cuando la sección adopte una norma concreta, estos tres valores pasan a ser sus
                    valores por defecto y la insignia de la norma aparece arriba.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores positivos (el llenado máximo no puede pasar de 1, y la
                velocidad mínima tiene que ser menor que la máxima).
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Escurrimiento</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {resultado.r.desborda ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3">
                    <p className="text-sm font-medium">El conducto no da</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Capacidad máxima {fmt(resultado.r.caudalMaximoM3s * 1000, 1)} L/s contra{" "}
                      {fmt(resultado.n.caudalLs, 1)} L/s pedidos. Hay que subir el diámetro o la
                      pendiente.
                    </p>
                  </div>
                ) : (
                  <>
                    <ResultadoCheck
                      etiqueta="Grado de llenado"
                      verifica={resultado.r.verificaLlenado}
                      comparacion={{
                        real: { etiqueta: "y/D", valor: resultado.r.seccion.llenado },
                        limite: { etiqueta: "y/D máx", valor: resultado.n.llenadoMax },
                        exige: "≤",
                        decimales: 3,
                      }}
                      detalle={`y = ${fmt(resultado.r.seccion.alturaM * 1000, 0)} mm sobre D = ${fmt(resultado.n.diametroMm, 0)} mm`}
                    />
                    <ResultadoCheck
                      etiqueta="Velocidad de autolimpieza"
                      verifica={resultado.r.verificaVelocidadMinima}
                      comparacion={{
                        real: { etiqueta: "v", valor: resultado.r.velocidadMs },
                        limite: { etiqueta: "v mín", valor: resultado.n.vMin },
                        unidad: "m/s",
                        exige: "≥",
                      }}
                    />
                    <ResultadoCheck
                      etiqueta="Velocidad máxima admisible"
                      verifica={resultado.r.verificaVelocidadMaxima}
                      comparacion={{
                        real: { etiqueta: "v", valor: resultado.r.velocidadMs },
                        limite: { etiqueta: "v máx", valor: resultado.n.vMax },
                        unidad: "m/s",
                        exige: "≤",
                      }}
                    />
                  </>
                )}

                <PanelFormulas
                  titulo="Ver cálculo"
                  filas={[
                    {
                      etiqueta: "θ",
                      formula: "2 · arccos(1 − 2·y/D)",
                      sustitucion: `2 · arccos(1 − 2 · ${fmt(resultado.r.seccion.llenado, 3)})`,
                      valor: `${fmt(resultado.r.seccion.anguloRad, 4)} rad`,
                    },
                    {
                      etiqueta: "A",
                      formula: "(D²/8) · (θ − sen θ)",
                      sustitucion: `(${fmt(resultado.datos.diametroM, 3)}²/8) · (${fmt(resultado.r.seccion.anguloRad, 4)} − sen θ)`,
                      valor: `${fmt(resultado.r.seccion.areaM2, 4)} m²`,
                    },
                    {
                      etiqueta: "P",
                      formula: "D · θ / 2",
                      sustitucion: `${fmt(resultado.datos.diametroM, 3)} · ${fmt(resultado.r.seccion.anguloRad, 4)} / 2`,
                      valor: `${fmt(resultado.r.seccion.perimetroM, 4)} m`,
                    },
                    {
                      etiqueta: "R",
                      formula: "A / P",
                      sustitucion: `${fmt(resultado.r.seccion.areaM2, 4)} / ${fmt(resultado.r.seccion.perimetroM, 4)}`,
                      valor: `${fmt(resultado.r.seccion.radioHidraulicoM, 4)} m`,
                    },
                    {
                      etiqueta: "v",
                      formula: "(1/n) · R^(2/3) · √i",
                      sustitucion: `(1/${fmt(resultado.n.manning, 3)}) · ${fmt(resultado.r.seccion.radioHidraulicoM, 4)}^(2/3) · √${fmt(resultado.datos.pendiente, 4)}`,
                      valor: `${fmt(resultado.r.velocidadMs)} m/s`,
                    },
                    {
                      etiqueta: "Q",
                      formula: "A · v",
                      sustitucion: `${fmt(resultado.r.seccion.areaM2, 4)} · ${fmt(resultado.r.velocidadMs)}`,
                      valor: `${fmt(resultado.r.caudalVerificacionM3s * 1000, 1)} L/s`,
                    },
                    {
                      etiqueta: "Q máx",
                      formula: `capacidad a y/D = ${fmt(LLENADO_CAUDAL_MAXIMO, 3)}`,
                      sustitucion: "el caudal es máximo antes de llenar, no lleno",
                      valor: `${fmt(resultado.r.caudalMaximoM3s * 1000, 1)} L/s`,
                    },
                  ]}
                />

                <PanelAyuda titulo="Por qué el caudal máximo no es a sección llena">
                  <p>
                    Al subir el pelo de agua, el área crece y el perímetro mojado también. Cerca de
                    la clave el conducto se cierra: el perímetro sigue creciendo pero el área ya casi
                    no, así que el radio hidráulico empieza a bajar y con él la velocidad.
                  </p>
                  <p>
                    El resultado es que el caudal alcanza su máximo alrededor de{" "}
                    <span className="font-mono">y/D = {fmt(LLENADO_CAUDAL_MAXIMO, 3)}</span> y a
                    sección llena es algo menor. Por eso el cálculo busca la solución sólo hasta ese
                    punto: pasado ese llenado hay dos alturas que dan el mismo caudal, y la de arriba
                    es inestable —el conducto entraría en carga— y no es la que se proyecta.
                  </p>
                </PanelAyuda>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
