"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { FranjaLosaDiagrama } from "@/components/verificaciones/hormigon/FranjaLosaDiagrama";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisPosicionPilares,
} from "@/components/verificaciones/croquis/CroquisCimentacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverLosaFundacion } from "@/lib/calc/hormigon/losas/resolver-losa-fundacion";
import { recomendarLosaFundacion } from "@/lib/verificaciones/recomendaciones/losa-fundacion";

const meta = registroVerificaciones.find((v) => v.id === "losa-fundacion")!;

const ETAPAS = [
  { id: "geometria", titulo: "Franja y suelo" },
  { id: "cargas", titulo: "Pilares" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function LosaFundacionPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [longitud, setLongitud] = useCampo("longitud", "9");
  const [anchoTributario, setAnchoTributario] = useCampo("anchoTributario", "3");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "200");

  const [pos1, setPos1] = useCampo("pos1", "1.5");
  const [Nk1, setNk1] = useCampo("Nk1", "200");
  const [pos2, setPos2] = useCampo("pos2", "4.5");
  const [Nk2, setNk2] = useCampo("Nk2", "200");
  const [pos3, setPos3] = useCampo("pos3", "7.5");
  const [Nk3, setNk3] = useCampo("Nk3", "200");

  const [diametroInferior, setDiametroInferior] = useCampo("diametroInferior", "16");
  const [separacionInferior, setSeparacionInferior] = useCampo("separacionInferior", "0.15");
  const [diametroSuperior, setDiametroSuperior] = useCampo("diametroSuperior", "12");
  const [separacionSuperior, setSeparacionSuperior] = useCampo("separacionSuperior", "0.15");
  const [diametroTransversal, setDiametroTransversal] = useCampo("diametroTransversal", "12");
  const [separacionTransversal, setSeparacionTransversal] = useCampo("separacionTransversal", "0.15");
  const [pilarLargo, setPilarLargo] = useCampo("pilarLargo", "0.3");
  const [pilarAncho, setPilarAncho] = useCampo("pilarAncho", "0.3");

  const campos = useMemo(
    () => ({ fck, fyk, longitud, anchoTributario, H, recubrimiento, sigmaAdmisible, pos1, Nk1, pos2, Nk2, pos3, Nk3, diametroInferior, separacionInferior, diametroSuperior, separacionSuperior, diametroTransversal, separacionTransversal, pilarLargo, pilarAncho }),
    [fck, fyk, longitud, anchoTributario, H, recubrimiento, sigmaAdmisible, pos1, Nk1, pos2, Nk2, pos3, Nk3, diametroInferior, separacionInferior, diametroSuperior, separacionSuperior, diametroTransversal, separacionTransversal, pilarLargo, pilarAncho]
  );
  const resultado = useMemo(() => resolverLosaFundacion(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarLosaFundacion(campos), [campos]);

  const diagrama = useMemo(() => {
    const v = { longitud: aNumero(longitud), H: aNumero(H), pos1: aNumero(pos1), pos2: aNumero(pos2), pos3: aNumero(pos3) };
    if (!Object.values(v).every((n) => Number.isFinite(n)) || v.longitud <= 0 || v.H <= 0) return null;
    return { longitudM: v.longitud, HM: v.H, posicionesColumnasM: [v.pos1, v.pos2, v.pos3] };
  }, [longitud, H, pos1, pos2, pos3]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos: no se puede calcular. Las posiciones de los pilares deben ser crecientes (1 < 2 < 3) y no superar la longitud.",
    });
  } else {
    if (!resultado.franja.geotecnico.dentroDelNucleo)
      avisos.push({ tipo: "aviso", texto: "La resultante de los pilares sale del núcleo central (±longitud/6)." });
    if (!resultado.franja.pilaresDentro)
      avisos.push({ tipo: "error", texto: "Algún pilar se sale de la franja: su cara queda más allá de un extremo." });
  }

  const elevacion = diagrama ? (
    <FranjaLosaDiagrama {...diagrama} />
  ) : (
    <CroquisPosicionPilares cantidad={3} />
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · método de franjas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <p className="text-sm text-muted-foreground">
        Se verifica una línea de pilares como viga sobre el terreno, con el ancho tributario de esa
        franja. Para verificar toda la losa, repetí esto por cada línea de pilares, en las dos
        direcciones.
      </p>

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="La franja que se verifica y su ancho tributario.">
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
                <Subgrupo titulo="Franja">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="longitud" etiqueta="Longitud" sufijo="m" valor={longitud} onChange={setLongitud} />
                    <CampoNumerico id="anchoTributario" etiqueta="Ancho tributario" sufijo="m" valor={anchoTributario} onChange={setAnchoTributario} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={elevacion}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Pilares y cargas" descripcion="Posición desde el extremo izquierdo, carga característica de cada pilar y su sección, la misma para los tres.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="pos1" etiqueta="Pilar 1 · posición" sufijo="m" valor={pos1} onChange={setPos1} />
                <CampoNumerico id="Nk1" etiqueta="Pilar 1 · Nk" sufijo="kN" valor={Nk1} onChange={setNk1} />
                <CampoNumerico id="pos2" etiqueta="Pilar 2 · posición" sufijo="m" valor={pos2} onChange={setPos2} />
                <CampoNumerico id="Nk2" etiqueta="Pilar 2 · Nk" sufijo="kN" valor={Nk2} onChange={setNk2} />
                <CampoNumerico id="pos3" etiqueta="Pilar 3 · posición" sufijo="m" valor={pos3} onChange={setPos3} />
                <CampoNumerico id="Nk3" etiqueta="Pilar 3 · Nk" sufijo="kN" valor={Nk3} onChange={setNk3} />
                <CampoNumerico id="pilarLargo" etiqueta="Pilares · lado a lo largo" sufijo="m" valor={pilarLargo} onChange={setPilarLargo} />
                <CampoNumerico id="pilarAncho" etiqueta="Pilares · lado a lo ancho" sufijo="m" valor={pilarAncho} onChange={setPilarAncho} />
              </div>
            }
            dibujo={elevacion}
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Inferior para el momento positivo y superior para el negativo; la de la otra dirección sólo entra en el punzonamiento.">
          <div className="space-y-5">
            <Subgrupo titulo="Longitudinal">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoDiametro id="diametroInferior" etiqueta="Inferior · Ø" valor={diametroInferior} onChange={setDiametroInferior} />
                <CampoNumerico id="separacionInferior" etiqueta="Inferior · separación" sufijo="m" valor={separacionInferior} onChange={setSeparacionInferior} />
                <CampoDiametro id="diametroSuperior" etiqueta="Superior · Ø" valor={diametroSuperior} onChange={setDiametroSuperior} />
                <CampoNumerico id="separacionSuperior" etiqueta="Superior · separación" sufijo="m" valor={separacionSuperior} onChange={setSeparacionSuperior} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Inferior de la otra dirección" detalle="sólo para el ρl del punzonamiento">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CampoDiametro id="diametroTransversal" etiqueta="Ø" valor={diametroTransversal} onChange={setDiametroTransversal} />
                <CampoNumerico id="separacionTransversal" etiqueta="Separación" sufijo="m" valor={separacionTransversal} onChange={setSeparacionTransversal} />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Longitud × ancho × H", valor: `${longitud} × ${anchoTributario} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              { etiqueta: "Pilares", valor: `${pilarLargo} × ${pilarAncho} m` },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.franja.geotecnico.pesoPropioKN)} kN`, derivado: true },
                    { etiqueta: "Excentricidad", valor: `${fmt(resultado.franja.geotecnico.excentricidadM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Método de franjas: cada línea de pilares es una viga sobre el terreno con su ancho tributario, presión lineal con γF·Nk; no es un análisis de placa.",
              "Flexión por metro con el Anejo 19 (art. 6.1) y la mínima de la ec. (9.1), art. 9.2.1.1. La superior se exige sólo donde tracciona.",
              "Separación máxima de las barras en losas: mín(300 mm; 3h), art. 9.3.1.1(3).",
              "Cortante sin armadura transversal a d de la cara de cada pilar (art. 6.2.2).",
              "Punzonamiento de cada pilar (art. 6.4.4) descontando la reacción del terreno dentro del perímetro. Los extremos de la franja son bordes de la losa; a lo ancho la losa sigue y el perímetro no se recorta.",
              "Sin armadura de reparto: la otra dirección se arma con su propia franja, repitiendo esta página.",
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
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.franja.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                  { etiqueta: "M+ máximo", valor: `${fmt(resultado.franja.inferior.mEdKNmPorM)} kN·m/m`, nota: `en x = ${fmt(resultado.franja.inferior.xM, 2)} m` },
                  resultado.franja.superior.necesaria
                    ? { etiqueta: "M− máximo", valor: `${fmt(resultado.franja.superior.mEdKNmPorM)} kN·m/m`, nota: `en x = ${fmt(resultado.franja.superior.xM, 2)} m` }
                    : { etiqueta: "M− máximo", valor: "—", nota: "no tracciona arriba" },
                  { etiqueta: "Vd", valor: `${fmt(resultado.franja.cortante.vEdKN)} kN`, nota: `VRd,c ${fmt(resultado.franja.cortante.vRdCKN)} kN` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.franja.geotecnico.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.franja.geotecnico.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo geotécnico"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.franja.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Excentricidad", valor: `${fmt(resultado.franja.geotecnico.excentricidadM, 3)} m` },
                      { etiqueta: "Núcleo central (±longitud/6)", valor: resultado.franja.geotecnico.dentroDelNucleo ? "Dentro" : "Fuera" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Flexión" detalle="por metro de ancho">
                <div>
                  <ResultadoCheck
                    etiqueta="Momento positivo · armadura inferior"
                    verifica={resultado.franja.inferior.flexion.verificaAs}
                    detalle={`Anejo 19, art. 6.1 y ec. (9.1): M = ${fmt(resultado.franja.inferior.mEdKNmPorM)} kN·m/m en x = ${fmt(resultado.franja.inferior.xM, 2)} m, As,min = ${fmt(resultado.franja.inferior.flexion.asMinCm2)} cm²/m.`}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.franja.inferior.flexion.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.franja.inferior.flexion.asNecCm2 },
                      unidad: "cm²/m", exige: "≥",
                    }}
                    recomendaciones={rec.inferior}
                  />
                  <ResultadoCheck
                    etiqueta="Momento negativo · armadura superior"
                    verifica={resultado.franja.superior.flexion.verificaAs}
                    estado={resultado.franja.superior.necesaria ? undefined : "no-aplica"}
                    detalle={
                      resultado.franja.superior.necesaria
                        ? `Anejo 19, art. 6.1 y ec. (9.1): M = ${fmt(resultado.franja.superior.mEdKNmPorM)} kN·m/m en x = ${fmt(resultado.franja.superior.xM, 2)} m, As,min = ${fmt(resultado.franja.superior.flexion.asMinCm2)} cm²/m.`
                        : "Ningún punto de la franja tracciona la cara superior."
                    }
                    comparacion={
                      resultado.franja.superior.necesaria
                        ? {
                            real: { etiqueta: "As real", valor: resultado.franja.superior.flexion.asRealCm2 },
                            limite: { etiqueta: "As nec", valor: resultado.franja.superior.flexion.asNecCm2 },
                            unidad: "cm²/m", exige: "≥",
                          }
                        : undefined
                    }
                    recomendaciones={rec.superior}
                  />
                  {([["inferior", separacionInferior], ["superior", separacionSuperior]] as const).map(([c, s]) => (
                    <ResultadoCheck
                      key={c}
                      etiqueta={`Separación de la ${c}`}
                      verifica={resultado.franja[c].verificaSeparacion}
                      detalle="Anejo 19, art. 9.3.1.1(3): mín(300 mm; 3h)."
                      comparacion={{
                        real: { etiqueta: "s", valor: aNumero(s) },
                        limite: { etiqueta: "s,max", valor: resultado.franja[c].separacionMaxM },
                        unidad: "m", exige: "≤", decimales: 2,
                      }}
                    />
                  ))}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Cortante y punzonamiento">
                <div>
                  <ResultadoCheck
                    etiqueta="Cortante sin armadura transversal"
                    verifica={resultado.franja.cortante.verifica}
                    detalle={`Anejo 19, art. 6.2.2: a d de la cara del pilar, en x = ${fmt(resultado.franja.cortante.xM, 2)} m, en todo el ancho tributario.`}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: resultado.franja.cortante.vEdKN },
                      limite: { etiqueta: "VRd,c", valor: resultado.franja.cortante.vRdCKN },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.cortante}
                  />
                  {resultado.franja.punzonamiento.map((p, i) => (
                    <div key={i}>
                      <ResultadoCheck
                        etiqueta={`Punzonamiento P${i + 1}`}
                        verifica={p.verificaPunzonamiento}
                        estado={p.motivoNoEvaluado ? "no-evaluado" : undefined}
                        detalle={
                          p.motivoNoEvaluado ??
                          `Anejo 19, art. 6.4.4: pilar ${p.situacion === "interior" ? "interior" : `de ${p.situacion}`}, β = ${fmt(p.beta, 2)}, u1 = ${fmt(p.u1M, 2)} m a ${fmt(p.aCriticaM, 3)} m de la cara.`
                        }
                        comparacion={
                          p.motivoNoEvaluado
                            ? undefined
                            : { real: { etiqueta: "Vd", valor: p.vEdKN }, limite: { etiqueta: "VRd,c", valor: p.vRdCKN }, unidad: "kN", exige: "≤" }
                        }
                        recomendaciones={rec[`punzonamiento${(i + 1) as 1 | 2 | 3}`]}
                      />
                      <ResultadoCheck
                        etiqueta={`Bielas en la cara de P${i + 1}`}
                        verifica={p.caraPilar.verifica}
                        detalle="Anejo 19, art. 6.4.5 (3), ec. (6.53)."
                        comparacion={{
                          real: { etiqueta: "vEd", valor: p.caraPilar.vEdMPa },
                          limite: { etiqueta: "vRd,max", valor: p.caraPilar.vRdMaxMPa },
                          unidad: "MPa", exige: "≤",
                        }}
                      />
                    </div>
                  ))}
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
