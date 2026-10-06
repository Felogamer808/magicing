"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Button } from "@/components/ui/button";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaLuzCanto } from "@/components/verificaciones/hormigon/DiagramaLuzCanto";
import { DiagramaFlecha } from "@/components/verificaciones/hormigon/DiagramaFlecha";
import {
  COEF_FLECHA,
  K_SISTEMA,
  NOMBRE_SISTEMA,
  type SistemaEstructural,
} from "@/lib/calc/hormigon/deformaciones";
import {
  NOMBRE_CEMENTO,
  NOMBRE_EXPOSICION,
  calcularFluencia,
  calcularRetraccion,
  perimetroExpuestoM,
  tamanoTeoricoMm,
  type ClaseCemento,
  type ExposicionSeccion,
} from "@/lib/calc/hormigon/comun/diferidas";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { CroquisArmaduraFlexion, CroquisMateriales } from "@/components/verificaciones/croquis/CroquisViga";
import {
  areaBarrasCm2,
  cementoDesdeNombre,
  exposicionDesdeNombre,
  resolverDeformaciones,
  sistemaDesdeNombre,
} from "@/lib/calc/hormigon/resolver-deformaciones";
import { recomendarDeformaciones } from "@/lib/verificaciones/recomendaciones/deformaciones";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "deformaciones")!;

const ETAPAS = [
  { id: "materiales", titulo: "Materiales" },
  { id: "seccion", titulo: "Sección" },
  { id: "armadura", titulo: "Armadura" },
  { id: "luz-canto", titulo: "Luz/canto" },
  { id: "flecha", titulo: "Flecha" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const SISTEMAS = Object.keys(K_SISTEMA) as SistemaEstructural[];
const OPCIONES_SISTEMA = SISTEMAS.map((s) => NOMBRE_SISTEMA[s]);

const OPCIONES_ESQUEMA = [...COEF_FLECHA.map((c) => c.nombre), "Otro (cargar k a mano)"];

const CEMENTOS = Object.keys(NOMBRE_CEMENTO) as ClaseCemento[];
const OPCIONES_CEMENTO = CEMENTOS.map((c) => NOMBRE_CEMENTO[c]);

const EXPOSICIONES = Object.keys(NOMBRE_EXPOSICION) as ExposicionSeccion[];
const OPCIONES_EXPOSICION = EXPOSICIONES.map((e) => NOMBRE_EXPOSICION[e]);


export default function DeformacionesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  // Materiales y geometría, compartidos por los dos métodos.
  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [esGPa, setEsGPa] = useCampo("esGPa", "200");
  const [b, setB] = useCampo("b", "0.3");
  const [h, setH] = useCampo("h", "0.5");
  const [d, setD] = useCampo("d", "0.45");
  const [dComp, setDComp] = useCampo("dComp", "0.05");
  const [luz, setLuz] = useCampo("luz", "6");

  // Armadura, por barras y no por área: es como se carga en las páginas de
  // viga y en fisuración, así que lo que se encadena llega tal cual. El cálculo
  // sólo necesita el área, y se arma acá.
  const [numeroAs, setNumeroAs] = useCampo("numeroAs", "4");
  const [phiAs, setPhiAs] = useCampo("phiAs", "16");
  const [capa2, setCapa2] = useCampo("capa2", "No");
  const [numeroAs2, setNumeroAs2] = useCampo("numeroAs2", "2");
  const [phiAs2, setPhiAs2] = useCampo("phiAs2", "16");
  const [numeroAsComp, setNumeroAsComp] = useCampo("numeroAsComp", "0");
  const [phiAsComp, setPhiAsComp] = useCampo("phiAsComp", "12");
  // La necesaria en ELU sí es un área: es una demanda, no un despiece, y casi
  // nunca cae en un número entero de barras.
  const [asReq, setAsReq] = useCampo("asReq", "10");

  const hayCapa2 = capa2 === "Sí";
  const asProvCm2 =
    areaBarrasCm2(numeroAs, phiAs) + (hayCapa2 ? areaBarrasCm2(numeroAs2, phiAs2) : 0);
  const asCompCm2 = areaBarrasCm2(numeroAsComp, phiAsComp);

  // Luz/canto.
  const [sistemaTxt, setSistemaTxt] = useCampo("sistema", NOMBRE_SISTEMA["simplemente-apoyada"]);
  const [alaEnT, setAlaEnT] = useCampo("alaEnT", "No");
  const [tabiques, setTabiques] = useCampo("tabiques", "No");

  // Flecha calculada.
  const [mqp, setMqp] = useCampo("mqp", "80");
  // Ni la fluencia ni la retracción se cargan a mano: salen del art. 3.1.4 y
  // del Apéndice B con el ambiente, la edad de puesta en carga, el cemento y el
  // tamaño teórico de la sección. Comparten casi todos los datos.
  const [hr, setHr] = useCampo("hr", "70");
  const [t0, setT0] = useCampo("t0", "28");
  const [cementoTxt, setCementoTxt] = useCampo("cemento", NOMBRE_CEMENTO.N);
  const [exposicionTxt, setExposicionTxt] = useCampo("exposicion", NOMBRE_EXPOSICION["tres-caras"]);
  const [esquemaTxt, setEsquemaTxt] = useCampo("esquema", COEF_FLECHA[0].nombre);
  const [coefManual, setCoefManual] = useCampo("coefManual", "0.104");

  const cemento = cementoDesdeNombre(cementoTxt);
  const exposicion = exposicionDesdeNombre(exposicionTxt);

  // h0 y φ dependen de la sección, así que se arman acá y no dentro del useMemo
  // del resultado: se muestran aunque el resto del formulario todavía no cierre.
  const h0Mm = tamanoTeoricoMm(
    aNumero(b) * aNumero(h),
    perimetroExpuestoM(exposicion, aNumero(b), aNumero(h))
  );
  const fluencia = useMemo(
    () =>
      calcularFluencia({
        fckMPa: aNumero(fck),
        hrPct: aNumero(hr),
        t0Dias: aNumero(t0),
        claseCemento: cemento,
        h0Mm,
      }),
    [fck, hr, t0, cemento, h0Mm]
  );
  const retraccion = useMemo(
    () =>
      calcularRetraccion({
        fckMPa: aNumero(fck),
        hrPct: aNumero(hr),
        claseCemento: cemento,
        h0Mm,
      }),
    [fck, hr, cemento, h0Mm]
  );
  const sistema = sistemaDesdeNombre(sistemaTxt);
  const esquemaElegido = COEF_FLECHA.find((c) => c.nombre === esquemaTxt);
  const coefFlecha = esquemaElegido ? esquemaElegido.valor : aNumero(coefManual);

  // Los dos desplegables describen la misma pieza desde métodos distintos —uno
  // elige la fila de la tabla A19.7.4, el otro el coeficiente de flecha— y nada
  // impide dejarlos contradiciéndose. Un voladizo calculado con el k de una
  // biapoyada da una flecha menos de la mitad de la real, así que conviene
  // avisarlo en vez de dejarlo pasar en silencio.
  const esquemaEsVoladizo = esquemaElegido?.id.startsWith("voladizo") ?? false;
  const sistemaEsVoladizo = sistema === "voladizo";
  const esquemaIncoherente =
    esquemaElegido !== undefined && sistemaEsVoladizo !== esquemaEsVoladizo;

  const campos = useMemo(
    () => ({
      fck, fyk, esGPa, b, h, d, dComp, luz, numeroAs, phiAs, capa2, numeroAs2, phiAs2, numeroAsComp, phiAsComp, asReq, alaEnT, tabiques, mqp, hr, t0,
      sistema: sistemaTxt, cemento: cementoTxt, exposicion: exposicionTxt, esquema: esquemaTxt, coefManual,
    }),
    [fck, fyk, esGPa, b, h, d, dComp, luz, numeroAs, phiAs, capa2, numeroAs2, phiAs2, numeroAsComp, phiAsComp, asReq, alaEnT, tabiques, mqp, hr, t0, sistemaTxt, cementoTxt, exposicionTxt, esquemaTxt, coefManual]
  );
  const resultado = useMemo(() => resolverDeformaciones(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarDeformaciones(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: la sección, la armadura y el momento cuasipermanente son obligatorios, y d tiene que ser menor que h." });
  }
  if (esquemaIncoherente) {
    avisos.push({ tipo: "error", texto: `El sistema estructural es de ${sistemaEsVoladizo ? "voladizo" : "elemento apoyado"} y el esquema de carga de ${esquemaEsVoladizo ? "voladizo" : "elemento apoyado"}: la flecha no corresponde a la pieza.` });
  }
  if (resultado?.luzCanto.fueraDeCalibracion) {
    avisos.push({ tipo: "aviso", texto: "ρ < ρ0/2: la ec. (7.16.a) extrapola y el l/d admisible pierde sentido físico. Mirar la flecha calculada." });
  }
  if (resultado && resultado.luzCanto.factorTension > 1.5) {
    avisos.push({ tipo: "aviso", texto: `La corrección 310/σs vale ${fmt(resultado.luzCanto.factorTension)}: el Anejo 19 no la topa, pero varios anejos nacionales la limitan a 1,5.` });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Estado límite de servicio</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="materiales" numero={1} titulo="Materiales" descripcion="Comunes a los dos métodos.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                <CampoNumerico id="esGPa" etiqueta="Es" sufijo="GPa" valor={esGPa} onChange={setEsGPa} />
              </div>
            }
            dibujo={<CroquisMateriales />}
          />
        </Etapa>

        <Etapa id="seccion" numero={2} titulo="Sección y luz" descripcion="Cantos útiles medidos a cada armadura y la luz efectiva del vano.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
            <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
            <CampoNumerico id="d" etiqueta="d (canto útil)" sufijo="m" valor={d} onChange={setD} />
            <CampoNumerico id="dComp" etiqueta="d' (a la comprimida)" sufijo="m" valor={dComp} onChange={setDComp} />
            <CampoNumerico id="luz" etiqueta="Luz efectiva leff" sufijo="m" valor={luz} onChange={setLuz} />
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="La dispuesta en el centro de vano (en voladizo, en el arranque) y la necesaria en ELU.">
          <div className="space-y-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <Subgrupo titulo="Tracción" detalle={`As ${fmt(asProvCm2)} cm²`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <CroquisArmaduraFlexion numero={aNumero(numeroAs)} cara="inferior" />
                  </div>
                  <CampoDiametro id="phiAs" etiqueta="Ø" valor={phiAs} onChange={setPhiAs} />
                  <CampoNumerico id="numeroAs" etiqueta="Nº de barras" valor={numeroAs} onChange={setNumeroAs} />
                  {hayCapa2 ? (
                    <>
                      <CampoDiametro id="phiAs2" etiqueta="Ø 2ª capa" valor={phiAs2} onChange={setPhiAs2} />
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <CampoNumerico id="numeroAs2" etiqueta="Nº de barras 2ª capa" valor={numeroAs2} onChange={setNumeroAs2} />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar la segunda capa"
                          onClick={() => setCapa2("No")}
                          className="mb-1.5"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!(aNumero(phiAs2) > 0)) setPhiAs2("16");
                          if (!(aNumero(numeroAs2) > 0)) setNumeroAs2("2");
                          setCapa2("Sí");
                        }}
                      >
                        <Plus className="h-4 w-4" /> Agregar segunda capa
                      </Button>
                    </div>
                  )}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Compresión" detalle={`A's ${fmt(asCompCm2)} cm²`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <CroquisArmaduraFlexion numero={aNumero(numeroAsComp)} cara="superior" />
                  </div>
                  <CampoDiametro id="phiAsComp" etiqueta="Ø" valor={phiAsComp} onChange={setPhiAsComp} />
                  <CampoNumerico
                    id="numeroAsComp"
                    etiqueta="Nº de barras"
                    valor={numeroAsComp}
                    onChange={setNumeroAsComp}
                    advertencia="Cero si no se cuenta la armadura superior como comprimida"
                  />
                </div>
              </Subgrupo>
            </div>

            <div className="max-w-xl space-y-3">
              <CampoNumerico
                id="asReq"
                etiqueta="As necesaria en ELU"
                sufijo="cm²"
                valor={asReq}
                onChange={setAsReq}
                advertencia="Es una demanda, no un despiece: va como área. Sólo entra en la corrección 310/σs"
              />
              <PanelAyuda titulo="Por qué se piden las dos armaduras">
                <p>
                  La <strong className="text-foreground">dispuesta</strong> es la que hay en la
                  sección: gobierna la inercia fisurada y, con ella, la flecha real.
                </p>
                <p>
                  La <strong className="text-foreground">necesaria en ELU</strong> sólo entra en
                  el método simplificado, en la corrección de la ec. (7.17): poner más armadura de
                  la estrictamente necesaria baja la tensión del acero en servicio y permite un
                  l/d mayor. Si se dejan iguales, la corrección vale 500/fyk —neutra con fyk=500—.
                </p>
              </PanelAyuda>
            </div>
          </div>
        </Etapa>

        <Etapa id="luz-canto" numero={4} titulo="Relación luz/canto" descripcion="Art. 7.4.2. No calcula ninguna flecha: si se cumple, se puede omitir el cálculo.">
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CampoSeleccion id="sistema" etiqueta="Sistema estructural (tabla A19.7.4)" valor={sistemaTxt} opciones={OPCIONES_SISTEMA} onChange={setSistemaTxt} />
            </div>
            <CampoSeleccion id="alaEnT" etiqueta="Sección en T con ala/alma > 3" valor={alaEnT} opciones={["No", "Sí"]} onChange={setAlaEnT} />
            <CampoSeleccion id="tabiques" etiqueta="Soporta tabiques frágiles" valor={tabiques} opciones={["No", "Sí"]} onChange={setTabiques} />
            <div className="sm:col-span-2">
              <PanelAyuda titulo="Qué corrige cada opción">
                <p>
                  <strong className="text-foreground">Ala ancha en T.</strong> Con ala/alma &gt; 3
                  el l/d de la ec. (7.16) se multiplica por 0,8.
                </p>
                <p>
                  <strong className="text-foreground">Tabiques frágiles.</strong> Activa la
                  corrección por luz grande: ×7/leff en vigas y losas de más de 7 m, y ×8,5/leff
                  en losas planas de más de 8,5 m. Sin tabiques que se puedan dañar, el articulado
                  no la pide.
                </p>
              </PanelAyuda>
            </div>
          </div>
        </Etapa>

        <Etapa id="flecha" numero={5} titulo="Flecha calculada" descripcion="Art. 7.4.3. Interpola entre sección sin fisurar y fisurada con ζ; la fluencia entra en el módulo efectivo y la retracción como curvatura aparte.">
          <div className="space-y-8">
            <Subgrupo titulo="Carga y esquema">
              <div className="grid max-w-3xl grid-cols-2 gap-4">
                <CampoNumerico id="mqp" etiqueta="M cuasipermanente" sufijo="kN·m" valor={mqp} onChange={setMqp} />
                <div />
                <div className="col-span-full">
                  <CampoSeleccion id="esquema" etiqueta="Esquema de carga (coeficiente k de a = k·L²·(1/r))" valor={esquemaTxt} opciones={OPCIONES_ESQUEMA} onChange={setEsquemaTxt} />
                </div>
                {!esquemaElegido && (
                  <CampoNumerico
                    id="coefManual"
                    etiqueta="k a mano"
                    valor={coefManual}
                    onChange={setCoefManual}
                    advertencia="Para esquemas intermedios, que dependen del empotramiento real"
                  />
                )}
                <div className="col-span-full">
                  <PanelAyuda titulo="De dónde sale el coeficiente k">
                    <p>
                      La flecha se arma como a = k·L²·(1/r), con la curvatura de la sección crítica.
                      Sólo se listan los esquemas de valor exacto conocido: 5/48 biapoyada uniforme,
                      1/12 biapoyada con puntual centrada, 1/16 biempotrada uniforme, 1/4 y 1/3 en
                      voladizo.
                    </p>
                    <p>
                      Un vano extremo de viga continua queda entre 1/16 y 5/48 según cuánto empotre el
                      apoyo interior, y por eso no se tabula: ahí conviene cargar k a mano con el valor
                      que salga del análisis.
                    </p>
                  </PanelAyuda>
                </div>
              </div>
            </Subgrupo>

            <Subgrupo titulo="Fluencia y retracción" detalle="art. 3.1.4 y Apéndice B">
              <div className="grid max-w-3xl grid-cols-2 gap-4">
                <CampoNumerico id="hr" etiqueta="Humedad relativa" sufijo="%" valor={hr} onChange={setHr} advertencia="Interior de edificio ≈50-70 %; a la intemperie ≈80 %" />
                <CampoNumerico id="t0" etiqueta="Edad de puesta en carga" sufijo="días" valor={t0} onChange={setT0} advertencia="Cuándo entra la carga sostenida, no cuándo se desencofra" />
                <div className="col-span-full">
                  <CampoSeleccion id="cemento" etiqueta="Clase de cemento" valor={cementoTxt} opciones={OPCIONES_CEMENTO} onChange={setCementoTxt} />
                </div>
                <div className="col-span-full">
                  <CampoSeleccion id="exposicion" etiqueta="Caras que secan" valor={exposicionTxt} opciones={OPCIONES_EXPOSICION} onChange={setExposicionTxt} />
                </div>
                <div className="col-span-full">
                  <PanelAyuda titulo="Cómo se calculan la fluencia y la retracción">
                    <p>
                      <strong className="text-foreground">Fluencia.</strong> Sale de la ec. (B.2): φ0
                      = φHR·β(fcm)·β(t0). Se toma a tiempo infinito, que es lo que pide la
                      comprobación de flecha, y ahí el factor de evolución βc de la ec. (B.1) vale 1,
                      así que φ(∞,t0) se reduce al coeficiente básico.
                    </p>
                    <p>
                      <strong className="text-foreground">Retracción.</strong> εcs = εcd + εca (art.
                      3.1.4(6)). La de secado sale de la ec. (B.11) afectada por el kh de la tabla
                      A19.3.3, y depende del ambiente y del espesor porque es migración de agua. La
                      autógena es la ec. (3.12), 2,5·(fck−10)·10⁻⁶: sólo depende de la resistencia y
                      se desarrolla en los primeros días. A tiempo infinito las dos están completas.
                    </p>
                    <p>
                      <strong className="text-foreground">Caras que secan.</strong> Fija el perímetro
                      u de la ec. (B.6) y con él h0 = 2Ac/u. Una viga con la losa encima no seca por
                      arriba, y eso sube h0 y baja la fluencia. En una losa corrida h0 termina siendo
                      su propio espesor.
                    </p>
                    <p>
                      <strong className="text-foreground">Clase de cemento.</strong> No entra directo:
                      corre la edad de puesta en carga por la ec. (B.9), con exponente −1, 0 o +1
                      según sea S, N o R. Con clase N la corrección es neutra.
                    </p>
                  </PanelAyuda>
                </div>
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={6} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk / Es", valor: `${fck} / ${fyk} MPa / ${esGPa} GPa` },
              { etiqueta: "Sección b × h", valor: `${b} × ${h} m · d ${d} m · d' ${dComp} m` },
              { etiqueta: "Luz efectiva", valor: `${luz} m` },
              { etiqueta: "As / A's", valor: `${fmt(asProvCm2)} / ${fmt(asCompCm2)} cm²` },
              { etiqueta: "As necesaria ELU", valor: `${asReq} cm²` },
              { etiqueta: "M cuasipermanente", valor: `${mqp} kN·m` },
              { etiqueta: "Sistema · esquema", valor: `${sistemaTxt} · k = ${fmt(coefFlecha, 4)}` },
              { etiqueta: "h0", valor: `${fmt(h0Mm, 0)} mm`, derivado: true },
              { etiqueta: "φ(∞,t0)", valor: fmt(fluencia.phi, 3), derivado: true },
              { etiqueta: "εcs", valor: `${fmt(retraccion.epsilonCs * 1000, 3)} ‰`, derivado: true },
            ]}
            hipotesis={[
              "Anejo 19, art. 7.4.2 (luz/canto) y 7.4.3 (flecha calculada).",
              "Momento de la combinación cuasipermanente, no el de cálculo.",
              "ρ y ρ' geométricas sobre b·d, con la armadura del centro de vano (en voladizo, la del arranque).",
              "Fluencia y retracción a tiempo infinito (βc = 1), por el Apéndice B; sin corrección por temperatura de la ec. (B.10).",
              "Flecha diferida = total − instantánea: lo que se puede dañar se construye apenas desencofrado. Es del lado de la seguridad.",
              "Límites L/250 para la flecha total (art. 7.4.1(4)) y L/500 para la diferida (art. 7.4.1(5)).",
              "La conclusión se toma de la flecha calculada; la relación luz/canto se informa aparte porque sólo dice si el cálculo se puede omitir.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={7} titulo="Resultados">
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
                  { etiqueta: "Flecha total", valor: `${fmt(resultado.flecha.flechaTotalMm)} mm`, nota: `L/250 = ${fmt(resultado.flecha.limiteAparienciaMm)} mm` },
                  { etiqueta: "Flecha diferida", valor: `${fmt(resultado.flecha.flechaDiferidaMm)} mm`, nota: `L/500 = ${fmt(resultado.flecha.limiteDanioMm)} mm` },
                  { etiqueta: "l/d real", valor: fmt(resultado.luzCanto.ldReal), nota: `admisible ${fmt(resultado.luzCanto.ldAdm)}` },
                  { etiqueta: "ζ", valor: fmt(resultado.flecha.zeta, 3), nota: resultado.flecha.fisura ? "sección fisurada" : "sin fisurar" },
                ]}
              />

              <Subgrupo titulo="Flecha calculada" detalle="art. 7.4.3">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flecha total — apariencia (art. 7.4.1(4))"
                    verifica={resultado.flecha.verificaApariencia}
                    comparacion={{
                      real: { etiqueta: "a total", valor: resultado.flecha.flechaTotalMm },
                      limite: { etiqueta: "L/250", valor: resultado.flecha.limiteAparienciaMm },
                      unidad: "mm",
                      exige: "≤",
                    }}
                    recomendaciones={rec.apariencia}
                  />
                  <ResultadoCheck
                    etiqueta="Flecha diferida — daño a lo adyacente (art. 7.4.1(5))"
                    verifica={resultado.flecha.verificaDanio}
                    comparacion={{
                      real: { etiqueta: "a diferida", valor: resultado.flecha.flechaDiferidaMm },
                      limite: { etiqueta: "L/500", valor: resultado.flecha.limiteDanioMm },
                      unidad: "mm",
                      exige: "≤",
                    }}
                    recomendaciones={rec.danio}
                  />
                  <DiagramaFlecha
                    resultado={resultado.flecha}
                    luzM={resultado.n.luz}
                    voladizo={sistemaEsVoladizo}
                    mqpKNm={resultado.n.mqp}
                  />
                  {esquemaIncoherente && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-xs text-destructive">
                      El sistema estructural dice{" "}
                      {sistemaEsVoladizo ? "voladizo" : "elemento apoyado"} pero el esquema de carga
                      es de {esquemaEsVoladizo ? "voladizo" : "elemento apoyado"}. El coeficiente k
                      de un voladizo es entre dos y cuatro veces el de una biapoyada: con los dos
                      desplegables cruzados, la flecha de acá arriba no corresponde a la pieza.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver desarrollo de la flecha"
                    filas={[
                      { etiqueta: "Ecm", valor: `${fmt(resultado.flecha.ecmGPa)} GPa` },
                      { etiqueta: "Ec,eff = Ecm/(1+φ) (7.20)", valor: `${fmt(resultado.flecha.ecEffGPa)} GPa` },
                      { etiqueta: "αe = Es/Ec,eff", valor: fmt(resultado.flecha.alphaE) },
                      { etiqueta: "Estado I · x", valor: `${fmt(resultado.flecha.sinFisurar.xM * 1000, 1)} mm` },
                      { etiqueta: "Estado I · I", valor: `${fmt(resultado.flecha.sinFisurar.iM4 * 1e8, 0)} cm⁴` },
                      { etiqueta: "Estado II · x", valor: `${fmt(resultado.flecha.fisurada.xM * 1000, 1)} mm` },
                      { etiqueta: "Estado II · I", valor: `${fmt(resultado.flecha.fisurada.iM4 * 1e8, 0)} cm⁴` },
                      { etiqueta: "Mcr", valor: `${fmt(resultado.flecha.mcrKNm)} kN·m` },
                      { etiqueta: "ζ = 1 − 0,5·(Mcr/M)² (7.19)", valor: fmt(resultado.flecha.zeta, 4) },
                      { etiqueta: "Curvatura de flexión (7.18)", valor: `${resultado.flecha.curvaturaFlexion.toExponential(3)} 1/m` },
                      { etiqueta: "Curvatura de retracción (7.21)", valor: `${resultado.flecha.curvaturaRetraccion.toExponential(3)} 1/m` },
                      { etiqueta: "Curvatura total", valor: `${resultado.flecha.curvaturaTotal.toExponential(3)} 1/m` },
                      { etiqueta: "k del esquema", valor: fmt(coefFlecha, 4) },
                      { etiqueta: "Flecha instantánea", valor: `${fmt(resultado.flecha.flechaInstantaneaMm)} mm` },
                      { etiqueta: "Flecha total (a = k·L²·(1/r))", valor: `${fmt(resultado.flecha.flechaTotalMm)} mm` },
                      { etiqueta: "Flecha diferida", valor: `${fmt(resultado.flecha.flechaDiferidaMm)} mm` },
                    ]}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la fluencia y la retracción"
                    filas={[
                      { etiqueta: "h0 = 2Ac/u", valor: `${fmt(h0Mm, 0)} mm` },
                      { etiqueta: "φHR · β(fcm) · β(t0)", valor: `${fmt(fluencia.phiHR, 3)} · ${fmt(fluencia.betaFcm, 3)} · ${fmt(fluencia.betaT0, 3)}` },
                      { etiqueta: "φ(∞,t0)", valor: fmt(fluencia.phi, 3) },
                      { etiqueta: "kh · εcd,0", valor: `${fmt(retraccion.kh, 2)} · ${fmt(retraccion.epsilonCd0 * 1000, 3)} ‰` },
                      { etiqueta: "εcd (secado)", valor: `${fmt(retraccion.epsilonCd * 1000, 3)} ‰` },
                      { etiqueta: "εca (autógena)", valor: `${fmt(retraccion.epsilonCa * 1000, 3)} ‰` },
                      { etiqueta: "εcs = εcd + εca", valor: `${fmt(retraccion.epsilonCs * 1000, 3)} ‰` },
                    ]}
                  />
                </div>
              </Subgrupo>

              {/* El método simplificado no entra en la conclusión: sólo dice si
                  el cálculo de flecha se puede omitir, y acá ese cálculo está. */}
              <ProveedorComprobaciones>
                <Subgrupo titulo="Relación luz/canto" detalle="art. 7.4.2 · informativo">
                  <div className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Relación luz/canto"
                      verifica={resultado.luzCanto.verifica}
                      comparacion={{
                        real: { etiqueta: "l/d", valor: resultado.luzCanto.ldReal },
                        limite: { etiqueta: "l/d adm", valor: resultado.luzCanto.ldAdm },
                        exige: "≤",
                      }}
                      recomendaciones={rec.luzCanto}
                    />
                    <DiagramaLuzCanto resultado={resultado.luzCanto} />
                    {resultado.luzCanto.fueraDeCalibracion && (
                      <p className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-xs text-destructive">
                        ρ = {fmt(resultado.rho * 100, 3)} % es menos de la mitad de ρ0 ={" "}
                        {fmt(resultado.luzCanto.rho0 * 100, 3)} %, y ahí la ec. (7.16.a) está
                        extrapolando: el término 3,2·√fck·(ρ0/ρ − 1)^1,5 domina y hace crecer el l/d
                        admisible sin techo. Los {fmt(resultado.luzCanto.ldAdm)} de arriba no son un
                        límite con sentido físico —la expresión sale de un estudio paramétrico sobre
                        cuantías del orden de 0,5 a 1,5 %, y la tabla A19.7.4 no ilustra nada tan poco
                        armado—. Lo que el resultado sí dice es que la sección está holgada de canto
                        para la armadura que lleva.
                      </p>
                    )}
                    {resultado.luzCanto.factorTension > 1.5 && (
                      <p className="text-xs text-muted-foreground">
                        La corrección 310/σs quedó en {fmt(resultado.luzCanto.factorTension)}, bastante
                        por encima de 1,5. El Anejo 19 no le pone tope, pero varios anejos nacionales
                        la limitan a 1,5: conviene no apoyar el cumplimiento sólo en este factor.
                      </p>
                    )}
                    <PanelFormulas
                      titulo="Ver desarrollo de la relación luz/canto"
                      filas={[
                        { etiqueta: "K (tabla A19.7.4)", valor: fmt(resultado.luzCanto.k, 1) },
                        { etiqueta: "ρ (tracción)", valor: `${fmt(resultado.rho * 100, 3)} %` },
                        { etiqueta: "ρ' (compresión)", valor: `${fmt(resultado.rhoComp * 100, 3)} %` },
                        { etiqueta: "ρ0 = 10⁻³·√fck", valor: `${fmt(resultado.luzCanto.rho0 * 100, 3)} %` },
                        { etiqueta: "Expresión aplicada", valor: resultado.luzCanto.usaRamaArmada ? "(7.16.b) · ρ > ρ0" : "(7.16.a) · ρ ≤ ρ0" },
                        { etiqueta: "l/d de la ec. (7.16)", valor: fmt(resultado.luzCanto.ldBase) },
                        { etiqueta: "Corrección 310/σs (7.17)", valor: `×${fmt(resultado.luzCanto.factorTension)}` },
                        { etiqueta: "Corrección ala en T", valor: `×${fmt(resultado.luzCanto.factorAla)}` },
                        { etiqueta: "Corrección luz grande", valor: `×${fmt(resultado.luzCanto.factorLuzLarga)}` },
                        { etiqueta: "l/d admisible", valor: fmt(resultado.luzCanto.ldAdm) },
                        { etiqueta: "l/d real", valor: fmt(resultado.luzCanto.ldReal) },
                      ]}
                    />
                  </div>
                </Subgrupo>
              </ProveedorComprobaciones>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
