"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { TarjetaLadoZapata } from "@/components/verificaciones/hormigon/TarjetaLadoZapata";
import { DiagramaVigaCentradora } from "@/components/verificaciones/hormigon/DiagramaVigaCentradora";
import { DiagramaVuelosViga } from "@/components/verificaciones/hormigon/DiagramaVuelosViga";
import { calcularVigaCentradora } from "@/lib/calc/hormigon/cimentaciones/viga-centradora";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-viga-centradora")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const FORMAS: Record<FormaAnclaje, string> = { recta: "Barra recta", gancho: "Patilla a 90°" };
const formaPorNombre = (nombre: string): FormaAnclaje => (nombre === FORMAS.gancho ? "gancho" : "recta");

export default function ZapataVigaCentradoraPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "250");

  const [A, setA] = useCampo("A", "1.5");
  const [B, setB] = useCampo("B", "2");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [distanciaColumnaLimite, setDistanciaColumnaLimite] = useCampo("distanciaColumnaLimite", "0");
  const [anchoPilarA, setAnchoPilarA] = useCampo("anchoPilarA", "0.3");
  const [anchoPilarB, setAnchoPilarB] = useCampo("anchoPilarB", "0.3");

  const [luz, setLuz] = useCampo("luz", "4");
  const [bViga, setBViga] = useCampo("bViga", "0.4");
  const [hViga, setHViga] = useCampo("hViga", "0.7");

  const [Nk, setNk] = useCampo("Nk", "500");
  const [MkA, setMkA] = useCampo("MkA", "0");
  const [MkB, setMkB] = useCampo("MkB", "0");

  const [numeroB, setNumeroB] = useCampo("numeroB", "10");
  const [diametroB, setDiametroB] = useCampo("diametroB", "16");
  const [numeroA, setNumeroA] = useCampo("numeroA", "8");
  const [diametroA, setDiametroA] = useCampo("diametroA", "12");
  const [formaAnclaje, setFormaAnclaje] = useCampo<FormaAnclaje>("formaAnclaje", "recta");

  const [numeroViga, setNumeroViga] = useCampo("numeroViga", "6");
  const [diametroViga, setDiametroViga] = useCampo("diametroViga", "20");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "10");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "2");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck), fyk: aNumero(fyk), sigmaAdmisible: aNumero(sigmaAdmisible),
      A: aNumero(A), B: aNumero(B), H: aNumero(H), recubrimiento: aNumero(recubrimiento),
      distanciaColumnaLimite: aNumero(distanciaColumnaLimite),
      anchoPilarA: aNumero(anchoPilarA), anchoPilarB: aNumero(anchoPilarB),
      luz: aNumero(luz), bViga: aNumero(bViga), hViga: aNumero(hViga),
      Nk: aNumero(Nk), MkA: aNumero(MkA), MkB: aNumero(MkB),
      numeroB: aNumero(numeroB), diametroB: aNumero(diametroB),
      numeroA: aNumero(numeroA), diametroA: aNumero(diametroA),
      numeroViga: aNumero(numeroViga), diametroViga: aNumero(diametroViga),
      diametroEstribo: aNumero(diametroEstribo), numeroRamas: aNumero(numeroRamas),
    };
    if (!Object.values(v).every((x) => Number.isFinite(x))) return null;
    const positivos = [
      v.fck, v.fyk, v.sigmaAdmisible, v.A, v.B, v.H, v.anchoPilarA, v.anchoPilarB, v.luz, v.bViga, v.hViga,
      v.Nk, v.numeroB, v.diametroB, v.numeroA, v.diametroA, v.numeroViga, v.diametroViga,
      v.diametroEstribo, v.numeroRamas,
    ];
    if (positivos.some((x) => x <= 0) || v.distanciaColumnaLimite < 0 || v.recubrimiento < 0) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const r = calcularVigaCentradora(
      materiales,
      {
        A: v.A, B: v.B, H: v.H, recubrimiento: v.recubrimiento,
        distanciaColumnaLimite: v.distanciaColumnaLimite,
        anchoPilarA: v.anchoPilarA, anchoPilarB: v.anchoPilarB,
        luzM: v.luz, bViga: v.bViga, hViga: v.hViga,
      },
      v.sigmaAdmisible,
      {
        Nk: v.Nk, MkA: v.MkA, MkB: v.MkB,
        armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
        armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
        formaAnclaje,
        vigaSuperior: { numero: v.numeroViga, diametroMm: v.diametroViga },
        diametroEstriboMm: v.diametroEstribo,
        numeroRamas: v.numeroRamas,
      }
    );
    return { v, r };
  }, [
    fck, fyk, sigmaAdmisible, A, B, H, recubrimiento, distanciaColumnaLimite, anchoPilarA, anchoPilarB,
    luz, bViga, hViga, Nk, MkA, MkB, numeroB, diametroB, numeroA, diametroA, formaAnclaje,
    numeroViga, diametroViga, diametroEstribo, numeroRamas,
  ]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos. Si llegaste desde la zapata de medianería, falta la luz hasta la zapata interior y la sección de la viga.",
    });
  } else if (!resultado.r.geometriaValida) {
    avisos.push({ tipo: "error", texto: "La luz tiene que ser mayor que la excentricidad: si no, la viga no hace palanca." });
  }

  const dibujo = resultado ? (
    <DiagramaVigaCentradora
      AM={resultado.v.A}
      anchoPilarAM={resultado.v.anchoPilarA}
      distanciaColumnaLimiteM={resultado.v.distanciaColumnaLimite}
      luzM={resultado.v.luz}
      hZapataM={resultado.v.H}
      hVigaM={resultado.v.hViga}
      nkKN={resultado.v.Nk}
      reaccionKN={resultado.r.reaccionZapataKN}
      descargaKN={resultado.r.descargaInteriorKN}
    />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">El esquema se dibuja con datos válidos.</p>
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
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
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="La zapata de medianería, el pilar y la viga que la une con la zapata interior.">
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
                <Subgrupo titulo="Zapata de medianería">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="A" etiqueta="A (hacia el interior)" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="B" etiqueta="B (a lo largo del límite)" sufijo="m" valor={B} onChange={setB} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="distanciaColumnaLimite" etiqueta="Sep. pilar–límite" sufijo="m" valor={distanciaColumnaLimite} onChange={setDistanciaColumnaLimite} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar medianero">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="anchoPilarA" etiqueta="Ancho // A" sufijo="m" valor={anchoPilarA} onChange={setAnchoPilarA} />
                    <CampoNumerico id="anchoPilarB" etiqueta="Ancho // B" sufijo="m" valor={anchoPilarB} onChange={setAnchoPilarB} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Viga centradora">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="luz" etiqueta="L: pilar → zapata interior" sufijo="m" valor={luz} onChange={setLuz} />
                    <CampoNumerico id="bViga" etiqueta="Ancho" sufijo="m" valor={bViga} onChange={setBViga} />
                    <CampoNumerico id="hViga" etiqueta="Canto" sufijo="m" valor={hViga} onChange={setHViga} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={dibujo}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Esfuerzos característicos que baja el pilar medianero.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
            <CampoNumerico id="MkA" etiqueta="Mk A (+ hacia el límite)" sufijo="kN·m" valor={MkA} onChange={setMkA} />
            <CampoNumerico id="MkB" etiqueta="Mk B" sufijo="kN·m" valor={MkB} onChange={setMkB} />
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Parrilla de la zapata y armadura de la viga.">
          <div className="space-y-6">
            <Subgrupo titulo="Zapata">
              <EditorCapas
                filas={[
                  {
                    posicion: "Paralela a B (principal)",
                    numero: { id: "numeroB", valor: numeroB, onChange: setNumeroB },
                    diametro: { id: "diametroB", valor: diametroB, onChange: setDiametroB },
                  },
                  {
                    posicion: "Paralela a A (reparto)",
                    numero: { id: "numeroA", valor: numeroA, onChange: setNumeroA },
                    diametro: { id: "diametroA", valor: diametroA, onChange: setDiametroA },
                  },
                ]}
              />
              <div className="max-w-xs pt-4">
                <CampoSeleccion
                  id="formaAnclaje"
                  etiqueta="Extremo de las barras"
                  valor={FORMAS[formaAnclaje]}
                  opciones={Object.values(FORMAS)}
                  onChange={(x) => setFormaAnclaje(formaPorNombre(x))}
                />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Viga">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoNumerico id="numeroViga" etiqueta="Nº barras superiores" valor={numeroViga} onChange={setNumeroViga} />
                <CampoDiametro id="diametroViga" etiqueta="Ø" valor={diametroViga} onChange={setDiametroViga} />
                <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
                <CampoNumerico id="numeroRamas" etiqueta="Ramas" valor={numeroRamas} onChange={setNumeroRamas} />
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                El momento de la viga es negativo en todo el tramo: tracciona arriba. La armadura inferior es
                constructiva.
              </p>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Zapata A × B × H", valor: `${A} × ${B} × ${H} m` },
              { etiqueta: "Viga b × h, L", valor: `${bViga} × ${hViga} m, ${luz} m` },
              ...(resultado
                ? [
                    { etiqueta: "Excentricidad e", valor: `${fmt(resultado.r.excentricidadM, 3)} m`, derivado: true },
                    { etiqueta: "R₁ sobre la zapata", valor: `${fmt(resultado.r.reaccionZapataKN)} kN`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "La viga une la zapata de medianería con la interior y no apoya en el terreno: hace de palanca.",
              "R₁ = (Nk·L + Mk + q·L²/2)/(L − e), con el peso propio de la viga en toda la luz y Mk positivo hacia el límite.",
              "La zapata recibe R₁ en su centro: presión uniforme en A y área eficaz en B si hay Mk B.",
              "Los vuelos de la zapata a los lados de la viga se arman como una zapata del Anejo 19 (art. 9.8.2.2), con la viga en el lugar del pilar.",
              "En la dirección de la viga, reparto del 20 % de la principal (art. 9.3.1.1 (2)).",
              "La viga se arma para Nk·e en el centro de la zapata, mayorado con γF = 1,5, con el motor de flexión y cortante.",
              "La descarga ΔN de la zapata interior no se descuenta: esa zapata se calcula aparte con su carga completa.",
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
              <ConclusionAutomatica />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.r.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(resultado.v.sigmaAdmisible)}` },
                  { etiqueta: "R₁ / ΔN", valor: `${fmt(resultado.r.reaccionZapataKN, 0)} / ${fmt(resultado.r.descargaInteriorKN, 0)} kN` },
                  { etiqueta: "Md / Vd de la viga", valor: `${fmt(resultado.r.momentoVigaKNm, 0)} kN·m / ${fmt(resultado.r.cortanteVigaKN, 0)} kN` },
                  { etiqueta: "Estribos", valor: `Ø${fmt(resultado.v.diametroEstribo, 0)} c/${fmt(resultado.r.vigaCortante.separacionAdoptadaM * 100, 0)} cm` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.r.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: resultado.v.sigmaAdmisible },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la palanca"
                    filas={[
                      { etiqueta: "Excentricidad e = A/2 − (sep + c/2)", valor: `${fmt(resultado.r.excentricidadM, 3)} m` },
                      { etiqueta: "Peso propio de la viga q", valor: `${fmt(resultado.r.pesoVigaKNPorM)} kN/m` },
                      { etiqueta: "R₁ = (Nk·L + Mk + q·L²/2)/(L − e)", valor: `${fmt(resultado.r.reaccionZapataKN)} kN` },
                      { etiqueta: "ΔN = R₁ − Nk − q·L (no se descuenta)", valor: `${fmt(resultado.r.descargaInteriorKN)} kN` },
                      { etiqueta: "Peso propio de la zapata", valor: `${fmt(resultado.r.pesoPropioZapataKN)} kN` },
                    ]}
                  />
                  <p className="pt-2 text-xs text-muted-foreground">
                    La zapata interior se verifica en{" "}
                    <Link href="/verificaciones/zapata-aislada" className="underline">Zapata aislada</Link>, con su carga
                    completa.
                  </p>
                </div>
              </Subgrupo>

              <Subgrupo titulo="Zapata de medianería">
                <div>
                  <div className="mb-3 rounded-md border p-3">
                    <DiagramaVuelosViga
                      AM={resultado.v.A}
                      BM={resultado.v.B}
                      hZapataM={resultado.v.H}
                      bVigaM={resultado.v.bViga}
                      dM={resultado.r.zapataDireccionB.dM}
                    />
                    <p className="pt-2 text-xs text-muted-foreground">
                      Las alas rayadas son los vuelos: la parte de la zapata que sobresale a cada lado de la viga. El
                      terreno las empuja hacia arriba y trabajan como ménsulas colgadas de la viga, sin estribos: el
                      cortante lo toma sólo el hormigón.
                    </p>
                  </div>
                  <TarjetaLadoZapata titulo="Vuelos a los lados de la viga (B)" resultado={resultado.r.zapataDireccionB} />
                  <ResultadoCheck
                    etiqueta="Reparto en la dirección de la viga (20 %)"
                    verifica={resultado.r.verificaReparto}
                    detalle="Anejo 19, art. 9.3.1.1 (2), por metro."
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.r.asRepartoRealCm2PorM },
                      limite: { etiqueta: "As nec", valor: resultado.r.asRepartoNecCm2PorM },
                      unidad: "cm²/m", exige: "≥",
                    }}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Viga centradora">
                <div>
                  <ResultadoCheck
                    etiqueta="Viga · armadura superior"
                    verifica={resultado.r.vigaFlexion.verificaAs}
                    detalle={resultado.r.vigaFlexion.sobrearmada ? "Sección sobrearmada: hay que aumentar el canto." : undefined}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.r.vigaFlexion.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.r.vigaFlexion.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Viga · compresión oblicua del alma"
                    verifica={resultado.r.vigaCortante.verificaVRdMax}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: resultado.r.cortanteVigaKN },
                      limite: { etiqueta: "VRd,max", valor: resultado.r.vigaCortante.vRdMax },
                      unidad: "kN", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la viga"
                    filas={[
                      { etiqueta: "Md = 1,5·(Nk·e + Mk + q·e²/2)", valor: `${fmt(resultado.r.momentoVigaKNm)} kN·m` },
                      { etiqueta: "Vd = 1,5·(R₁ − Nk − q·e)", valor: `${fmt(resultado.r.cortanteVigaKN)} kN` },
                      { etiqueta: "Canto útil d", valor: `${fmt(resultado.r.vigaFlexion.d, 3)} m` },
                      { etiqueta: "As mín., ec. (9.1)", valor: `${fmt(resultado.r.vigaFlexion.asMinCm2)} cm²` },
                      { etiqueta: "Estribos necesarios", valor: `${fmt(resultado.r.vigaCortante.a90Cm2PorM)} cm²/m` },
                      { etiqueta: "Separación adoptada", valor: `${fmt(resultado.r.vigaCortante.separacionAdoptadaM, 2)} m` },
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
