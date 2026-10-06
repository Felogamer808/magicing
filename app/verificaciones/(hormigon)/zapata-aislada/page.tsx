"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramaPresionSuelo } from '@/components/verificaciones/hormigon/DiagramaPresionSuelo';
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { CroquisCargasZapata } from "@/components/verificaciones/croquis/CroquisCimentacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { SolicitacionesZapataDiagrama } from "@/components/verificaciones/hormigon/SolicitacionesZapataDiagrama";
import { ZapataDiagrama } from "@/components/verificaciones/hormigon/ZapataDiagrama";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularZapataAislada } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapatas")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

export default function ZapataAisladaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "2");
  const [B, setB] = useCampo("B", "1.5");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");

  const [anchoPilarA, setAnchoPilarA] = useCampo("anchoPilarA", "0.4");
  const [anchoPilarB, setAnchoPilarB] = useCampo("anchoPilarB", "0.3");

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "500");
  const [MkA, setMkA] = useCampo("MkA", "50");
  const [MkB, setMkB] = useCampo("MkB", "20");

  const [numeroA, setNumeroA] = useCampo("numeroA", "8");
  const [diametroA, setDiametroA] = useCampo("diametroA", "16");
  const [numeroB, setNumeroB] = useCampo("numeroB", "6");
  const [diametroB, setDiametroB] = useCampo("diametroB", "16");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      B: aNumero(B),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      Nk: aNumero(Nk),
      MkA: aNumero(MkA),
      MkB: aNumero(MkB),
      numeroA: aNumero(numeroA),
      diametroA: aNumero(diametroA),
      numeroB: aNumero(numeroB),
      diametroB: aNumero(diametroB),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0 && v.anchoPilarA > 0 && v.anchoPilarB > 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
    const armadurasValidas = v.numeroA > 0 && v.diametroA > 0 && v.numeroB > 0 && v.diametroB > 0;
    const cargasValidas = v.Nk > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = {
      A: v.A,
      B: v.B,
      H: v.H,
      anchoPilarA: v.anchoPilarA,
      anchoPilarB: v.anchoPilarB,
      recubrimiento: v.recubrimiento,
    };

    const zapata = calcularZapataAislada(materiales, geometria, v.sigmaAdmisible, {
      cargas: { Nk: v.Nk, MkA: v.MkA, MkB: v.MkB },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
      formaAnclaje,
    });

    return { zapata };
  }, [
    fck, fyk, A, B, H, recubrimiento, anchoPilarA, anchoPilarB,
    sigmaAdmisible, Nk, MkA, MkB, numeroA, diametroA, numeroB, diametroB, formaAnclaje,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      B: aNumero(B),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      numeroA: aNumero(numeroA),
      numeroB: aNumero(numeroB),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
    return {
      AM: v.A,
      BM: v.B,
      anchoPilarAM: v.anchoPilarA,
      anchoPilarBM: v.anchoPilarB,
      numeroA: v.numeroA,
      numeroB: v.numeroB,
    };
  }, [A, B, anchoPilarA, anchoPilarB, numeroA, numeroB]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });
  } else if (!Number.isFinite(resultado.zapata.geotecnico.sigmaKPa)) {
    avisos.push({
      tipo: "error",
      texto: "La resultante cae fuera de la base: la zapata no tiene apoyo posible. Hay que agrandarla o reducir el momento.",
    });
  } else if (
    resultado.zapata.geotecnico.distribucionA.hayDespegue ||
    resultado.zapata.geotecnico.distribucionB.hayDespegue
  ) {
    avisos.push({
      tipo: "aviso",
      texto: "La resultante sale del núcleo central: hay despegue. La comprobación por área eficaz sigue valiendo, pero conviene revisar la geometría.",
    });
  }

  const planta = diagrama ? (
    <ZapataDiagrama {...diagrama} />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">
      La planta se dibuja cuando la geometría y el armado tienen valores válidos.
    </p>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="La zapata, el pilar que apoya y el terreno.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales y suelo">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="sigmaAdmisible" etiqueta="σ adm. suelo" sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Zapata">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CampoNumerico id="A" etiqueta="A" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="B" etiqueta="B" sufijo="m" valor={B} onChange={setB} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="anchoPilarA" etiqueta="Ancho // A" sufijo="m" valor={anchoPilarA} onChange={setAnchoPilarA} />
                    <CampoNumerico id="anchoPilarB" etiqueta="Ancho // B" sufijo="m" valor={anchoPilarB} onChange={setAnchoPilarB} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={planta}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Esfuerzos característicos que baja el pilar.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
                <CampoNumerico id="MkA" etiqueta="Mk A" sufijo="kN·m" valor={MkA} onChange={setMkA} />
                <CampoNumerico id="MkB" etiqueta="Mk B" sufijo="kN·m" valor={MkB} onChange={setMkB} />
              </div>
            }
            dibujo={
              resultado ? (
                <SolicitacionesZapataDiagrama
                  anchoM={aNumero(A)}
                  cantoM={aNumero(H)}
                  anchoPilarM={aNumero(anchoPilarA)}
                  nkKN={aNumero(Nk)}
                  mkKNm={aNumero(MkA)}
                  sigmaMaxKPa={resultado.zapata.direccionA.sigmaMaxKPa}
                  sigmaMinKPa={resultado.zapata.direccionA.sigmaMinKPa}
                  longitudContactoM={resultado.zapata.direccionA.longitudContactoM}
                />
              ) : (
                <CroquisCargasZapata />
              )
            }
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Parrilla inferior en las dos direcciones.">
          <DatosConDibujo
            datos={
              <Subgrupo titulo="Parrilla">
                <EditorCapas
                  filas={[
                    {
                      posicion: "Dirección A",
                      numero: { id: "numeroA", valor: numeroA, onChange: setNumeroA },
                      diametro: { id: "diametroA", valor: diametroA, onChange: setDiametroA },
                    },
                    {
                      posicion: "Dirección B",
                      numero: { id: "numeroB", valor: numeroB, onChange: setNumeroB },
                      diametro: { id: "diametroB", valor: diametroB, onChange: setDiametroB },
                    },
                  ]}
                />
                <div className="max-w-xs">
                  <CampoSeleccion
                    id="formaAnclaje"
                    etiqueta="Extremo de las barras"
                    valor={FORMAS[formaAnclaje]}
                    opciones={Object.values(FORMAS)}
                    onChange={(v) => setFormaAnclaje(formaPorNombre(v))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Las barras de la dirección A son las paralelas al lado A y resisten el vuelo en esa dirección.
                  Si la barra recta no alcanza a anclar, el art. 9.8.2.2 (4) permite doblarla en patilla.
                </p>
              </Subgrupo>
            }
            dibujo={planta}
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × B × H", valor: `${A} × ${B} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN`, derivado: true },
                    { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "La tensión sobre el terreno incluye el peso propio de la zapata, también en la excentricidad: e = Mk / (Nk + PP).",
              "Si la resultante sale del núcleo central, el terreno no tracciona: se trabaja con el área eficaz, y el armado y el cortante se calculan con la cuña de presiones, no con el trapecio.",
              "Punzonamiento según el Anejo 19, art. 6.4.4 (2): se barren los perímetros hasta 2d (o hasta el vuelo, si es menor) y se informa el que peor verifica. El momento entra por la ec. (6.51), con MEd = 1,5·Mk sin descontar el contramomento del terreno y los dos ejes sumados.",
              "Flexión por el modelo del Anejo 19, art. 9.8.2.2: sección de cálculo a 0,15·c dentro de la cara del pilar, Fs = M/(0,9·d) y As = Fs/fyd.",
              "Cuantía mínima de tracción del art. 9.2.1.1 (1), ec. (9.1), la misma que en vigas y losas. φ ≥ 12 mm (art. 9.8.2.1 (1)).",
              "Anclaje (art. 8.4) comprobado desde x = h/2 hasta la sección de cálculo: Fs(x) tiene que anclarse en x menos el recubrimiento. Buena adherencia, α3 = α5 = 1.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionResultados
                comprobaciones={[
                  {
                    etiqueta: "tensión del terreno",
                    estado: resultado.zapata.geotecnico.verificaTension ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.geotecnico.sigmaKPa / aNumero(sigmaAdmisible),
                  },
                  {
                    etiqueta: "armadura en A",
                    estado: resultado.zapata.direccionA.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionA.asNecCm2 / resultado.zapata.direccionA.asRealCm2,
                  },
                  {
                    etiqueta: "anclaje en A",
                    estado: resultado.zapata.direccionA.anclaje.verifica ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionA.anclaje.lbdMm / resultado.zapata.direccionA.anclaje.disponibleMm,
                  },
                  {
                    etiqueta: "cortante en A",
                    estado: resultado.zapata.direccionA.verificaCorte ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionA.vEdKN / resultado.zapata.direccionA.vRdCKN,
                  },
                  {
                    etiqueta: "armadura en B",
                    estado: resultado.zapata.direccionB.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionB.asNecCm2 / resultado.zapata.direccionB.asRealCm2,
                  },
                  {
                    etiqueta: "anclaje en B",
                    estado: resultado.zapata.direccionB.anclaje.verifica ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionB.anclaje.lbdMm / resultado.zapata.direccionB.anclaje.disponibleMm,
                  },
                  {
                    etiqueta: "diámetro mínimo φ12",
                    estado:
                      resultado.zapata.direccionA.verificaDiametroMinimo && resultado.zapata.direccionB.verificaDiametroMinimo
                        ? "cumple"
                        : "no-cumple",
                  },
                  {
                    etiqueta: "cortante en B",
                    estado: resultado.zapata.direccionB.verificaCorte ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionB.vEdKN / resultado.zapata.direccionB.vRdCKN,
                  },
                  {
                    etiqueta: "punzonamiento",
                    estado: resultado.zapata.punzonamiento.verificaPunzonamiento ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.punzonamiento.aprovechamiento,
                  },
                  {
                    etiqueta: "bielas en la cara del pilar",
                    estado: resultado.zapata.punzonamiento.caraPilar.verifica ? "cumple" : "no-cumple",
                    utilizacion:
                      resultado.zapata.punzonamiento.caraPilar.vEdMPa / resultado.zapata.punzonamiento.caraPilar.vRdMaxMPa,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                  { etiqueta: "As nec. A / B", valor: `${fmt(resultado.zapata.direccionA.asNecCm2)} / ${fmt(resultado.zapata.direccionB.asNecCm2)} cm²` },
                  { etiqueta: "d A / B", valor: `${fmt(resultado.zapata.direccionA.dM, 3)} / ${fmt(resultado.zapata.direccionB.dM, 3)} m` },
                  { etiqueta: "Punzonamiento", valor: `${fmt(resultado.zapata.punzonamiento.vEdKN)} kN`, nota: `VRd,c ${fmt(resultado.zapata.punzonamiento.vRdCKN)} kN` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.zapata.geotecnico.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <div className="grid gap-6 pt-4 md:grid-cols-2">
                    <DiagramaPresionSuelo
                      distribucion={resultado.zapata.geotecnico.distribucionA}
                      lM={aNumero(A)}
                      sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                      etiqueta="Dirección A"
                    />
                    <DiagramaPresionSuelo
                      distribucion={resultado.zapata.geotecnico.distribucionB}
                      lM={aNumero(B)}
                      sigmaAdmisibleKPa={aNumero(sigmaAdmisible)}
                      etiqueta="Dirección B"
                    />
                  </div>
                  <p className="pt-2 text-xs text-muted-foreground">
                    Mientras la resultante cae dentro del núcleo central la zapata apoya entera y el
                    diagrama es trapecial; si sale, el borde opuesto se levanta y la carga se
                    concentra en una cuña más corta.
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo geotécnico"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Vuelo máximo", valor: `${fmt(resultado.zapata.vueloMaxM, 3)} m` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones estructurales">
                <div>
                  {(["A", "B"] as const).map((dir) => {
                    const r = dir === "A" ? resultado.zapata.direccionA : resultado.zapata.direccionB;
                    return (
                      <div key={dir}>
                        <ResultadoCheck
                          etiqueta={`Dirección ${dir} · armadura suficiente`}
                          verifica={r.verificaAs}
                          comparacion={{
                            real: { etiqueta: "As real", valor: r.asRealCm2 },
                            limite: { etiqueta: "As nec", valor: r.asNecCm2 },
                            unidad: "cm²", exige: "≥",
                          }}
                        />
                        <ResultadoCheck
                          etiqueta={`Dirección ${dir} · anclaje de la parrilla`}
                          verifica={r.anclaje.verifica}
                          detalle={`Anejo 19, art. 9.8.2.2 y 8.4. Gobierna x = ${fmt(r.anclaje.xM, 3)} m desde el borde, con Fs = ${fmt(r.anclaje.fsKN)} kN.`}
                          comparacion={{
                            real: { etiqueta: "lbd", valor: r.anclaje.lbdMm },
                            limite: { etiqueta: "disponible", valor: r.anclaje.disponibleMm },
                            unidad: "mm", exige: "≤",
                          }}
                        />
                        <ResultadoCheck
                          etiqueta={`Dirección ${dir} · cortante sin armadura transversal`}
                          verifica={r.verificaCorte}
                          comparacion={{
                            real: { etiqueta: "Vd", valor: r.vEdKN },
                            limite: { etiqueta: "VRd,c", valor: r.vRdCKN },
                            unidad: "kN", exige: "≤",
                          }}
                        />
                        <PanelFormulas
                          titulo={`Ver desarrollo de la dirección ${dir}`}
                          filas={[
                            { etiqueta: "d", valor: `${fmt(r.dM, 3)} m` },
                            { etiqueta: "σ máx / mín", valor: `${fmt(r.sigmaMaxKPa)} / ${fmt(r.sigmaMinKPa)} kN/m²` },
                            { etiqueta: "σ crítica", valor: `${fmt(r.sigmaCriticaKPa)} kN/m²` },
                            { etiqueta: "Borde a sección de cálculo (0,15·c dentro del pilar)", valor: `${fmt(r.lM, 3)} m` },
                            { etiqueta: "M en la sección de cálculo", valor: `${fmt(r.momentoKNm)} kN·m` },
                            { etiqueta: "zi = 0,9·d", valor: `${fmt(r.ziM, 3)} m` },
                            { etiqueta: "Fs,max = M/zi", valor: `${fmt(r.fsKN)} kN` },
                            { etiqueta: "As = Fs/fyd", valor: `${fmt(r.asCalculadoCm2)} cm²` },
                            { etiqueta: "As mín., ec. (9.1)", valor: `${fmt(r.asMinCm2)} cm²` },
                            { etiqueta: "σsd en el anclaje", valor: `${fmt(r.anclaje.sigmaSdMPa, 0)} MPa` },
                          ]}
                        />
                      </div>
                    );
                  })}
                  <ResultadoCheck
                    etiqueta="Punzonamiento"
                    verifica={resultado.zapata.punzonamiento.verificaPunzonamiento}
                    detalle="Anejo 19, art. 6.4.4 (2), ec. (6.51) con los momentos de los dos ejes sumados. No viene de la planilla."
                    comparacion={{
                      real: { etiqueta: "Vd", valor: resultado.zapata.punzonamiento.vEdKN },
                      limite: { etiqueta: "VRd,c", valor: resultado.zapata.punzonamiento.vRdCKN },
                      unidad: "kN", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Bielas en la cara del pilar"
                    verifica={resultado.zapata.punzonamiento.caraPilar.verifica}
                    detalle="Anejo 19, art. 6.4.5 (3), ec. (6.53): β·VEd/(u0·d) ≤ 0,4·ν·fcd."
                    comparacion={{
                      real: { etiqueta: "vEd", valor: resultado.zapata.punzonamiento.caraPilar.vEdMPa },
                      limite: { etiqueta: "vRd,max", valor: resultado.zapata.punzonamiento.caraPilar.vRdMaxMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del punzonamiento"
                    filas={[
                      { etiqueta: "d promedio", valor: `${fmt(resultado.zapata.punzonamiento.dPromedioM, 3)} m` },
                      { etiqueta: "VEd,red (sin momento)", valor: `${fmt(resultado.zapata.punzonamiento.vEdRedKN)} kN` },
                      { etiqueta: "β por momento en el perímetro crítico", valor: fmt(resultado.zapata.punzonamiento.beta, 3) },
                      { etiqueta: "β en la cara del pilar (u1 a 2d)", valor: fmt(resultado.zapata.punzonamiento.caraPilar.beta, 3) },
                      {
                        etiqueta: "Perímetro crítico, a",
                        valor: `${fmt(resultado.zapata.punzonamiento.aCriticaM, 3)} m = ${fmt(resultado.zapata.punzonamiento.aCriticaM / resultado.zapata.punzonamiento.dPromedioM, 2)} d`,
                      },
                      { etiqueta: "Perímetro de control u", valor: `${fmt(resultado.zapata.punzonamiento.u1M, 2)} m` },
                      { etiqueta: "Aprovechamiento", valor: fmt(resultado.zapata.punzonamiento.aprovechamiento, 3) },
                    ]}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
