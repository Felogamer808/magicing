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
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import {
  OMEGA_J,
  bulonMasExigido,
  calcularBloqueDeCorte,
  interaccionTraccionCorteKN,
  repartoElasticoBulones,
  resistenciaBulonKN,
  resistenciaDeslizamientoKN,
  type ClaseSuperficie,
  type GradoBulon,
  type PosicionBulon,
  type TipoAgujeroDeslizamiento,
} from "@/lib/calc/acero/tornillos";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "tornillos-acero")!;

const GRADOS: readonly GradoBulon[] = ["A325", "A307"];
const DEFORMACION = ["Controlada (agujeros estándar)", "No controlada"] as const;
const DOS_CHAPAS = ["Una chapa", "Dos chapas"] as const;
const HAY_BLOQUE = ["No corresponde", "Sí, verificar"] as const;
const HAY_TRACCION = ["No corresponde", "Sí, verificar"] as const;
const UBS = ["Uniforme (Ubs = 1,0)", "No uniforme (Ubs = 0,5)"] as const;
const HAY_DESLIZAMIENTO = ["No, conexión de contacto", "Sí, slip-critical"] as const;
const CLASES = ["Clase A (μ = 0,30)", "Clase B (μ = 0,50)"] as const;
const CLASE_MAP: Record<(typeof CLASES)[number], ClaseSuperficie> = {
  "Clase A (μ = 0,30)": "A",
  "Clase B (μ = 0,50)": "B",
};
const TIPOS_AGUJERO = ["Estándar (φ=1,00)", "Agrandado o ranura corta paralela (φ=0,85)", "Ranura alargada (φ=0,70)"] as const;
const TIPO_AGUJERO_MAP: Record<(typeof TIPOS_AGUJERO)[number], TipoAgujeroDeslizamiento> = {
  "Estándar (φ=1,00)": "estandar",
  "Agrandado o ranura corta paralela (φ=0,85)": "agrandado",
  "Ranura alargada (φ=0,70)": "ranuraAlargada",
};

/** Grilla centrada en su propio centroide: es la hipótesis que pide el método elástico. */
function grillaBulones(filas: number, columnas: number, sxM: number, syM: number): PosicionBulon[] {
  const posiciones: PosicionBulon[] = [];
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      posiciones.push({
        xM: (c - (columnas - 1) / 2) * sxM,
        yM: (f - (filas - 1) / 2) * syM,
      });
    }
  }
  return posiciones;
}

export default function TornillosAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");

  const [filas, setFilas] = useCampo("filas", "2");
  const [columnas, setColumnas] = useCampo("columnas", "2");
  const [sx, setSx] = useCampo("sx", "0.06");
  const [sy, setSy] = useCampo("sy", "0.08");

  const [fx, setFx] = useCampo("fx", "0");
  const [fy, setFy] = useCampo("fy", "150");
  const [momento, setMomento] = useCampo("momento", "0");

  const [diametro, setDiametro] = useCampo("diametro", "20");
  const [grado, setGrado] = useCampo("grado", "A325");
  const [planosDeCorte, setPlanosDeCorte] = useCampo("planosDeCorte", "1");

  const [espesor1, setEspesor1] = useCampo("espesor1", "10");
  const [fu1, setFu1] = useCampo("fu1", "400");
  const [lc1, setLc1] = useCampo("lc1", "35");
  const [deformacion1, setDeformacion1] = useCampo("deformacion1", DEFORMACION[0]);

  const [dosChapas, setDosChapas] = useCampo("dosChapas", DOS_CHAPAS[0]);
  const [espesor2, setEspesor2] = useCampo("espesor2", "10");
  const [fu2, setFu2] = useCampo("fu2", "400");
  const [lc2, setLc2] = useCampo("lc2", "35");
  const [deformacion2, setDeformacion2] = useCampo("deformacion2", DEFORMACION[0]);

  const [hayTraccion, setHayTraccion] = useCampo("hayTraccion", HAY_TRACCION[0]);
  const [traccionReq, setTraccionReq] = useCampo("traccionReq", "30");

  const [hayDeslizamiento, setHayDeslizamiento] = useCampo("hayDeslizamiento", HAY_DESLIZAMIENTO[0]);
  const [clase, setClase] = useCampo("clase", CLASES[0]);
  const [tipoAgujeroDesl, setTipoAgujeroDesl] = useCampo("tipoAgujeroDesl", TIPOS_AGUJERO[0]);
  const [tb, setTb] = useCampo("tb", "142");
  const [chapasDeRelleno, setChapasDeRelleno] = useCampo("chapasDeRelleno", "0");

  const [hayBloque, setHayBloque] = useCampo("hayBloque", HAY_BLOQUE[0]);
  const [corteLargo, setCorteLargo] = useCampo("corteLargo", "160");
  const [corteEspesor, setCorteEspesor] = useCampo("corteEspesor", "10");
  const [corteAgujeros, setCorteAgujeros] = useCampo("corteAgujeros", "2");
  const [traccionAncho, setTraccionAncho] = useCampo("traccionAncho", "60");
  const [traccionEspesor, setTraccionEspesor] = useCampo("traccionEspesor", "10");
  const [traccionAgujeros, setTraccionAgujeros] = useCampo("traccionAgujeros", "1");
  const [diametroAgujeroBloque, setDiametroAgujeroBloque] = useCampo("diametroAgujeroBloque", "22");
  const [ubs, setUbs] = useCampo("ubs", UBS[0]);

  const resultado = useMemo(() => {
    const n = {
      filas: Math.round(aNumero(filas)), columnas: Math.round(aNumero(columnas)),
      sx: aNumero(sx), sy: aNumero(sy),
      fx: aNumero(fx), fy: aNumero(fy), m: aNumero(momento),
      d: aNumero(diametro), planos: Math.round(aNumero(planosDeCorte)),
      e1: aNumero(espesor1), fu1: aNumero(fu1), lc1: aNumero(lc1),
    };
    if (![n.filas, n.columnas].every((x) => Number.isInteger(x) && x > 0)) return null;
    if (![n.sx, n.sy, n.d, n.e1, n.fu1, n.lc1].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![n.fx, n.fy, n.m].every((x) => Number.isFinite(x))) return null;
    if (!Number.isInteger(n.planos) || n.planos <= 0) return null;

    const bulones = grillaBulones(n.filas, n.columnas, n.sx, n.sy);
    const fuerzas = repartoElasticoBulones(bulones, n.fx, n.fy, n.m);
    const critico = bulonMasExigido(fuerzas);
    if (!critico) return null;

    const chapas = [
      {
        espesorMm: n.e1, distanciaLibreMm: n.lc1, fuPa: n.fu1 * 1e6,
        deformacionControlada: deformacion1 === DEFORMACION[0],
      },
    ];
    if (dosChapas === DOS_CHAPAS[1]) {
      const e2 = aNumero(espesor2);
      const f2 = aNumero(fu2);
      const l2 = aNumero(lc2);
      if (![e2, f2, l2].every((x) => Number.isFinite(x) && x > 0)) return null;
      chapas.push({
        espesorMm: e2, distanciaLibreMm: l2, fuPa: f2 * 1e6,
        deformacionControlada: deformacion2 === DEFORMACION[0],
      });
    }

    const bulon = resistenciaBulonKN({
      diametroMm: n.d,
      grado: grado as GradoBulon,
      planosDeCorte: n.planos,
      chapas,
    });

    let traccion: ReturnType<typeof interaccionTraccionCorteKN> | null = null;
    let traccionReqKN = 0;
    if (hayTraccion === HAY_TRACCION[1]) {
      traccionReqKN = aNumero(traccionReq);
      if (!(Number.isFinite(traccionReqKN) && traccionReqKN >= 0)) return null;
      traccion = interaccionTraccionCorteKN({
        diametroMm: n.d,
        grado: grado as GradoBulon,
        vReqKN: critico.vKN,
        planosDeCorte: n.planos,
      });
    }

    let deslizamiento: ReturnType<typeof resistenciaDeslizamientoKN> | null = null;
    if (hayDeslizamiento === HAY_DESLIZAMIENTO[1]) {
      const tbKN = aNumero(tb);
      const relleno = Math.round(aNumero(chapasDeRelleno));
      if (!(Number.isFinite(tbKN) && tbKN > 0)) return null;
      if (!(Number.isInteger(relleno) && relleno >= 0)) return null;
      deslizamiento = resistenciaDeslizamientoKN({
        clase: CLASE_MAP[clase as (typeof CLASES)[number]],
        tipoAgujero: TIPO_AGUJERO_MAP[tipoAgujeroDesl as (typeof TIPOS_AGUJERO)[number]],
        tbKN,
        planosDeFriccion: n.planos,
        chapasDeRelleno: relleno,
      });
    }

    let bloque: ReturnType<typeof calcularBloqueDeCorte> | null = null;
    if (hayBloque === HAY_BLOQUE[1]) {
      const cl = aNumero(corteLargo);
      const ce = aNumero(corteEspesor);
      const ca = Math.round(aNumero(corteAgujeros));
      const ta = aNumero(traccionAncho);
      const te = aNumero(traccionEspesor);
      const tan = Math.round(aNumero(traccionAgujeros));
      const dAg = aNumero(diametroAgujeroBloque);
      if (![cl, ce, ta, te, dAg].every((x) => Number.isFinite(x) && x > 0)) return null;
      if (![ca, tan].every((x) => Number.isInteger(x) && x >= 0)) return null;

      bloque = calcularBloqueDeCorte({
        planoCorte: {
          areaBrutaM2: (cl * ce) / 1e6,
          agujeros: Array.from({ length: ca }, () => ({ diametroMm: dAg, espesorMm: ce })),
        },
        planoTraccion: {
          areaBrutaM2: (ta * te) / 1e6,
          agujeros: Array.from({ length: tan }, () => ({ diametroMm: dAg, espesorMm: te })),
        },
        ubs: ubs === UBS[0] ? 1.0 : 0.5,
        fyPa: 248e6, // A36; se podría exponer como dato si hiciera falta otro acero
        fuPa: n.fu1 * 1e6,
      });
    }

    return { bulones, fuerzas, critico, bulon, traccion, traccionReqKN, deslizamiento, bloque, n };
  }, [
    filas, columnas, sx, sy, fx, fy, momento, diametro, grado, planosDeCorte,
    espesor1, fu1, lc1, deformacion1, dosChapas, espesor2, fu2, lc2, deformacion2,
    hayTraccion, traccionReq,
    hayDeslizamiento, clase, tipoAgujeroDesl, tb, chapasDeRelleno,
    hayBloque, corteLargo, corteEspesor, corteAgujeros, traccionAncho, traccionEspesor,
    traccionAgujeros, diametroAgujeroBloque, ubs,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Uniones · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Artículo J3, por el método ASD. Un bulón puede fallar de tres maneras distintas y
          cualquiera puede gobernar: corte del vástago —depende sólo del bulón— (Ω ={" "}
          {fmt(OMEGA_J, 2)}), o aplastamiento y arrancamiento de la chapa —dependen de la chapa y no
          del bulón—. Si además hay tracción simultánea, la ec. (J3-3b) reduce la capacidad a
          tracción según cuánto corte haya. Si la conexión es <em>slip-critical</em>, se agrega la
          verificación de deslizamiento del art. J3.8 —que no reemplaza a las de contacto: si la
          unión llega a deslizar, termina apoyando en aplastamiento igual—.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Grupo de bulones</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="filas" etiqueta="Filas" valor={filas} onChange={setFilas} />
                <CampoNumerico id="columnas" etiqueta="Columnas" valor={columnas} onChange={setColumnas} />
                <CampoNumerico id="sx" etiqueta="Separación horizontal" sufijo="m" valor={sx} onChange={setSx} />
                <CampoNumerico id="sy" etiqueta="Separación vertical" sufijo="m" valor={sy} onChange={setSy} />
              </div>
              <PanelAyuda titulo="Por qué el grupo se arma como grilla centrada">
                <p>
                  El método elástico del art. 8.2.1 asume una chapa rígida que gira sobre el{" "}
                  <strong className="text-foreground">centroide del grupo</strong>, no sobre ningún
                  otro punto. La grilla se genera ya centrada para cumplir esa hipótesis: no hace
                  falta calcular el centroide a mano.
                </p>
                <p>
                  Una fila de bulones —1 columna, N filas— cubre la conexión simple más habitual, una
                  chapa de corte entre viga y columna. Una grilla de varias filas y columnas cubre las
                  conexiones a momento.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solicitación en el centroide del grupo</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoNumerico id="fx" etiqueta="Fx" sufijo="kN" valor={fx} onChange={setFx} />
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="kN" valor={fy} onChange={setFy} />
              <CampoNumerico id="momento" etiqueta="M" sufijo="kN·m" valor={momento} onChange={setMomento} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Bulón</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoNumerico id="diametro" etiqueta="Diámetro" sufijo="mm" valor={diametro} onChange={setDiametro}
                             sugerencias={[12, 16, 20, 22, 24, 27, 30]} />
              <CampoSeleccion id="grado" etiqueta="Grado" valor={grado} opciones={GRADOS} onChange={setGrado} />
              <CampoNumerico id="planosDeCorte" etiqueta="Planos de corte" valor={planosDeCorte} onChange={setPlanosDeCorte} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Chapas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium">Chapa 1</p>
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="espesor1" etiqueta="Espesor" sufijo="mm" valor={espesor1} onChange={setEspesor1} />
                <CampoNumerico id="fu1" etiqueta="Fu" sufijo="MPa" valor={fu1} onChange={setFu1} />
                <CampoNumerico id="lc1" etiqueta="Distancia libre al borde" sufijo="mm" valor={lc1} onChange={setLc1} />
              </div>
              <CampoSeleccion id="deformacion1" etiqueta="Control de deformaciones" valor={deformacion1}
                              opciones={DEFORMACION} onChange={setDeformacion1} />

              <CampoSeleccion id="dosChapas" etiqueta="¿Hay una segunda chapa?" valor={dosChapas}
                              opciones={DOS_CHAPAS} onChange={setDosChapas} />
              {dosChapas === DOS_CHAPAS[1] && (
                <>
                  <p className="text-sm font-medium">Chapa 2</p>
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="espesor2" etiqueta="Espesor" sufijo="mm" valor={espesor2} onChange={setEspesor2} />
                    <CampoNumerico id="fu2" etiqueta="Fu" sufijo="MPa" valor={fu2} onChange={setFu2} />
                    <CampoNumerico id="lc2" etiqueta="Distancia libre al borde" sufijo="mm" valor={lc2} onChange={setLc2} />
                  </div>
                  <CampoSeleccion id="deformacion2" etiqueta="Control de deformaciones" valor={deformacion2}
                                  opciones={DEFORMACION} onChange={setDeformacion2} />
                </>
              )}
              <PanelAyuda titulo="Por qué puede haber más de una chapa crítica">
                <p>
                  Toda conexión de contacto tiene al menos dos elementos atravesados por el bulón —la
                  pieza que se conecta y la que la recibe—, y cada uno puede tener espesor, Fu o
                  distancia al borde distintos. Con chapas de distinto espesor, la más fina —o la de
                  menor distancia al borde— suele ser la crítica, pero no siempre: conviene cargar las
                  dos y dejar que la cuenta decida.
                </p>
                <p>
                  La <strong className="text-foreground">distancia libre</strong> es del borde del
                  agujero al borde de la chapa, o al agujero más próximo, medida en la dirección de la
                  fuerza —no la distancia entre centros—.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tracción simultánea — art. J3.7</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="hayTraccion" etiqueta="¿El bulón más exigido también tracciona?" valor={hayTraccion}
                              opciones={HAY_TRACCION} onChange={setHayTraccion} />
              {hayTraccion === HAY_TRACCION[1] && (
                <>
                  <CampoNumerico id="traccionReq" etiqueta="Tracción requerida en el bulón" sufijo="kN"
                                 valor={traccionReq} onChange={setTraccionReq} />
                  <PanelAyuda titulo="De dónde sale el corte que entra en la interacción">
                    <p>
                      El corte requerido es el del bulón más exigido del grupo —el mismo V que ya
                      calcula el reparto elástico de arriba—, no un dato aparte. La tracción sí es un
                      dato nuevo: sale de la parte de la conexión que no modela el reparto elástico
                      en el plano —por ejemplo, el brazo de palanca de una ménsula que tracciona los
                      bulones de la fila superior—.
                    </p>
                    <p>
                      No se resuelve acá el apalancamiento (<em>prying action</em>) de piezas tipo
                      T ni el reparto de la tracción entre bulones de una conexión a momento: el
                      apunte remite esos casos a un procedimiento aparte (Steel Construction Manual,
                      sección 9). Este cálculo asume que la tracción por bulón ya está determinada.
                    </p>
                  </PanelAyuda>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Deslizamiento — art. J3.8 (slip-critical)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="hayDeslizamiento" etiqueta="¿Es una conexión slip-critical?" valor={hayDeslizamiento}
                              opciones={HAY_DESLIZAMIENTO} onChange={setHayDeslizamiento} />
              {hayDeslizamiento === HAY_DESLIZAMIENTO[1] && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoSeleccion id="clase" etiqueta="Clase de superficie" valor={clase} opciones={CLASES} onChange={setClase} />
                    <CampoSeleccion id="tipoAgujeroDesl" etiqueta="Tipo de agujero" valor={tipoAgujeroDesl}
                                    opciones={TIPOS_AGUJERO} onChange={setTipoAgujeroDesl} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="tb" etiqueta="Tb — pretensión mínima especificada" sufijo="kN"
                                   valor={tb} onChange={setTb} />
                    <CampoNumerico id="chapasDeRelleno" etiqueta="Chapas de relleno (fillers)" valor={chapasDeRelleno}
                                   onChange={setChapasDeRelleno} />
                  </div>
                  <PanelAyuda titulo="De dónde sale Tb y qué NO resuelve esta verificación">
                    <p>
                      <strong className="text-foreground">Tb</strong> es la pretensión mínima
                      especificada del bulón, de la Tabla J3.1 de la norma —depende del diámetro y
                      el grado—. No se calcula acá: cargala de la tabla para tu bulón.
                    </p>
                    <p>
                      Los planos de fricción son los mismos planos de corte que ya se cargaron en la
                      tarjeta «Bulón» de arriba: físicamente son las mismas interfaces entre chapas.
                    </p>
                    <p>
                      Esta verificación de deslizamiento se <strong className="text-foreground">
                      suma</strong> a las de contacto —corte del vástago, aplastamiento,
                      arrancamiento—, no las reemplaza: la norma pide comprobar las dos, porque si la
                      unión llega a deslizar hasta el fondo del agujero, termina apoyando en
                      aplastamiento igual que una conexión de contacto común.
                    </p>
                  </PanelAyuda>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Bloque de corte — art. J4.3</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="hayBloque" etiqueta="¿Corresponde verificar?" valor={hayBloque}
                              opciones={HAY_BLOQUE} onChange={setHayBloque} />
              {hayBloque === HAY_BLOQUE[1] && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="diametroAgujeroBloque" etiqueta="Diámetro nominal del agujero" sufijo="mm"
                                   valor={diametroAgujeroBloque} onChange={setDiametroAgujeroBloque} />
                    <CampoSeleccion id="ubs" etiqueta="Distribución de tracción" valor={ubs} opciones={UBS} onChange={setUbs} />
                  </div>
                  <p className="text-sm font-medium">Plano de corte</p>
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="corteLargo" etiqueta="Largo" sufijo="mm" valor={corteLargo} onChange={setCorteLargo} />
                    <CampoNumerico id="corteEspesor" etiqueta="Espesor" sufijo="mm" valor={corteEspesor} onChange={setCorteEspesor} />
                    <CampoNumerico id="corteAgujeros" etiqueta="Agujeros" valor={corteAgujeros} onChange={setCorteAgujeros} />
                  </div>
                  <p className="text-sm font-medium">Plano de tracción</p>
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="traccionAncho" etiqueta="Ancho" sufijo="mm" valor={traccionAncho} onChange={setTraccionAncho} />
                    <CampoNumerico id="traccionEspesor" etiqueta="Espesor" sufijo="mm" valor={traccionEspesor} onChange={setTraccionEspesor} />
                    <CampoNumerico id="traccionAgujeros" etiqueta="Agujeros" valor={traccionAgujeros} onChange={setTraccionAgujeros} />
                  </div>
                  <PanelAyuda titulo="Qué es el bloque de corte y cuándo revisarlo">
                    <p>
                      Es una falla local en el extremo de la pieza conectada: se arranca un bloque de
                      material combinando rotura por corte en un plano —paralelo a la fuerza— con
                      rotura por tracción en el plano perpendicular. Aparece en extremos de vigas
                      recortadas, ángulos conectados por una sola ala, y en general cualquier conexión
                      cerca del borde de la pieza.
                    </p>
                    <p>
                      <strong className="text-foreground">Ubs</strong> vale 1,0 cuando la tracción es
                      uniforme en el plano que rompe —una fila de bulones repartida pareja— y 0,5
                      cuando no lo es, como un ángulo conectado por un ala, donde la tracción se
                      concentra hacia el borde.
                    </p>
                    <p>
                      Fy se toma en A36 (248 MPa) para este cálculo. Si el material es otro, avisá para
                      exponerlo como dato.
                    </p>
                  </PanelAyuda>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá el grupo de bulones, el bulón, las chapas y la solicitación con valores
                válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`Bulón más exigido — gobierna ${resultado.bulon.modoDeFalla}`}
                    verifica={resultado.critico.vKN <= resultado.bulon.admisibleKN}
                    detalle={`${fmt(resultado.critico.vKN, 2)} kN / ${fmt(resultado.bulon.admisibleKN, 2)} kN · aprovechamiento ${fmt(
                      (resultado.critico.vKN / resultado.bulon.admisibleKN) * 100,
                      1
                    )} %`}
                  />
                  <p className="font-mono text-xs text-muted-foreground">
                    {resultado.n.filas * resultado.n.columnas} bulones · Vx = {fmt(resultado.critico.vxKN, 2)} kN ·
                    Vy = {fmt(resultado.critico.vyKN, 2)} kN
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Reparto elástico</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver fuerza en cada bulón"
                    filas={resultado.fuerzas.map((f, i) => ({
                      etiqueta: `Bulón ${i + 1} · (${fmt(f.posicion.xM * 1000, 0)}, ${fmt(f.posicion.yM * 1000, 0)}) mm`,
                      valor: `${fmt(f.vKN, 2)} kN`,
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Resistencia del bulón</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Rn corte del vástago  (J3-1)", valor: `${fmt(resultado.bulon.resistenciaCorteKN, 2)} kN` },
                      ...resultado.bulon.resistenciaChapas.flatMap((r, i) => [
                        { etiqueta: `Chapa ${i + 1} · aplastamiento  (J3-6a/b)`, valor: `${fmt(r.aplastamientoKN, 2)} kN` },
                        { etiqueta: `Chapa ${i + 1} · arrancamiento  (J3-6c/d)`, valor: `${fmt(r.arrancamientoKN, 2)} kN` },
                      ]),
                      { etiqueta: "Rn adoptado", valor: `${fmt(resultado.bulon.nominalKN, 2)} kN` },
                      { etiqueta: `Rn/Ω con Ω = ${OMEGA_J}`, valor: `${fmt(resultado.bulon.admisibleKN, 2)} kN` },
                    ]}
                  />
                </CardContent>
              </Card>

              {resultado.traccion && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Interacción tracción-corte — art. J3.7</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Tracción con corte simultáneo"
                      verifica={resultado.traccionReqKN <= resultado.traccion.admisibleKN}
                      detalle={`${fmt(resultado.traccionReqKN, 2)} kN / ${fmt(resultado.traccion.admisibleKN, 2)} kN · aprovechamiento ${fmt(
                        (resultado.traccionReqKN / resultado.traccion.admisibleKN) * 100,
                        1
                      )} %`}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "fv requerida en el vástago", valor: `${fmt(resultado.traccion.fvReqPa / 1e6, 1)} MPa` },
                        { etiqueta: "F'nt reducida  (J3-3b)", valor: `${fmt(resultado.traccion.fntReducidaPa / 1e6, 1)} MPa` },
                        { etiqueta: "Rn = F'nt·Ab", valor: `${fmt(resultado.traccion.nominalKN, 2)} kN` },
                        { etiqueta: `Rn/Ω con Ω = ${OMEGA_J}`, valor: `${fmt(resultado.traccion.admisibleKN, 2)} kN` },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              {resultado.deslizamiento && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Deslizamiento — art. J3.8</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Deslizamiento (slip-critical)"
                      verifica={resultado.critico.vKN <= resultado.deslizamiento.admisibleKN}
                      detalle={`${fmt(resultado.critico.vKN, 2)} kN / ${fmt(resultado.deslizamiento.admisibleKN, 2)} kN · aprovechamiento ${fmt(
                        (resultado.critico.vKN / resultado.deslizamiento.admisibleKN) * 100,
                        1
                      )} %`}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "Rn = μ·Du·hf·Tb·ns  (J3-4)", valor: `${fmt(resultado.deslizamiento.nominalKN, 2)} kN` },
                        { etiqueta: `Rn/Ω con Ω = 1,5/φ = ${fmt(resultado.deslizamiento.omega, 2)}`, valor: `${fmt(resultado.deslizamiento.admisibleKN, 2)} kN` },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              {resultado.bloque && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Bloque de corte</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Bloque de corte — art. J4.3"
                      verifica={resultado.critico.vKN <= resultado.bloque.admisibleKN}
                      detalle={`${fmt(resultado.critico.vKN, 2)} kN / ${fmt(resultado.bloque.admisibleKN, 2)} kN · aprovechamiento ${fmt(
                        (resultado.critico.vKN / resultado.bloque.admisibleKN) * 100,
                        1
                      )} %`}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        { etiqueta: "Rn rotura corte + tracción  (J4-5, 1er término)", valor: `${fmt(resultado.bloque.rnRoturaKN, 2)} kN` },
                        { etiqueta: "Rn fluencia corte + rotura tracción  (J4-5, tope)", valor: `${fmt(resultado.bloque.rnFluenciaKN, 2)} kN` },
                        { etiqueta: "Rn = mín(...)", valor: `${fmt(resultado.bloque.nominalKN, 2)} kN` },
                        { etiqueta: `Rn/Ω con Ω = ${OMEGA_J}`, valor: `${fmt(resultado.bloque.admisibleKN, 2)} kN` },
                      ]}
                    />
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
