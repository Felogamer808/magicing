"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
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
import { CroquisVigaVariable } from "@/components/verificaciones/madera/CroquisVigaVariable";
import {
  SelectorMadera,
  duracionDesdeEtiqueta,
  servicioDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import { GAMMA_M, kh, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";
import {
  NOMBRE_FORMA,
  anguloInclinacionGrados,
  espesorMaximoLaminaMm,
  kmAlpha,
  seccionCriticaTaper,
  verificarVertice,
  volumenVertice,
  type EstadoBordeInclinado,
  type FormaViga,
} from "@/lib/calc/madera/seccion-variable";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-seccion-variable")!;

const ETAPAS = [
  { id: "material", titulo: "Material" },
  { id: "geometria", titulo: "Geometría" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const FORMAS = Object.values(NOMBRE_FORMA);
const formaDesde = (e: string): FormaViga =>
  ((Object.entries(NOMBRE_FORMA) as [FormaViga, string][]).find(([, n]) => n === e)?.[0] ??
    "dos-aguas");

const BORDES = ["Traccionado", "Comprimido"] as const;
const bordeDesde = (e: string): EstadoBordeInclinado =>
  e === BORDES[0] ? "traccionado" : "comprimido";

export default function MaderaSeccionVariablePage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Laminada encolada (MLE)");
  const [servicio, setServicio] = useCampo("servicio", "Clase 2");
  const [duracion, setDuracion] = useCampo("duracion", "Media (1 semana a 6 meses)");

  const [forma, setForma] = useCampo("forma", NOMBRE_FORMA["dos-aguas"]);
  const [luz, setLuz] = useCampo("luz", "20");
  const [ancho, setAncho] = useCampo("ancho", "0.19");
  const [cantoApoyo, setCantoApoyo] = useCampo("cantoApoyo", "0.64");
  const [cantoVertice, setCantoVertice] = useCampo("cantoVertice", "1.39");
  const [radio, setRadio] = useCampo("radio", "0");
  const [espesorLamina, setEspesorLamina] = useCampo("espesorLamina", "0.02");

  const [carga, setCarga] = useCampo("carga", "9.86");
  const [borde, setBorde] = useCampo("borde", BORDES[1]);

  const [fmk, setFmk] = useCampo("fmk", "28");
  const [fvk, setFvk] = useCampo("fvk", "3.5");
  const [ft90k, setFt90k] = useCampo("ft90k", "0.5");
  const [fc90k, setFc90k] = useCampo("fc90k", "2.5");
  const [fmjdek, setFmjdek] = useCampo("fmjdek", "18.5");

  const r = useMemo(() => {
    const l = aNumero(luz);
    const b = aNumero(ancho);
    const he = aNumero(cantoApoyo);
    const hap = aNumero(cantoVertice);
    const q = aNumero(carga);
    const rin = aNumero(radio);
    const tLam = aNumero(espesorLamina);
    const fmkV = aNumero(fmk);
    const fvkV = aNumero(fvk);
    const ft90kV = aNumero(ft90k);
    const fc90kV = aNumero(fc90k);

    if (![l, b, he, hap, q, tLam, fmkV, fvkV, ft90kV, fc90kV].every((x) => Number.isFinite(x) && x > 0))
      return null;
    if (!(hap > he)) return null;
    if (!Number.isFinite(rin) || rin < 0) return null;

    const t = tipoDesdeEtiqueta(tipo);
    const km = kmod(t, servicioDesdeEtiqueta(servicio), duracionDesdeEtiqueta(duracion));
    const gammaM = GAMMA_M[t];
    const laminada = t !== "maciza";

    const fmd = resistenciaDeCalculo(fmkV, { kmod: km, gammaM, kh: kh(t, hap) });
    const fvd = resistenciaDeCalculo(fvkV, { kmod: km, gammaM });
    const ft90d = resistenciaDeCalculo(ft90kV, { kmod: km, gammaM });
    const fc90d = resistenciaDeCalculo(fc90kV, { kmod: km, gammaM });

    const formaV = formaDesde(forma);
    const anguloGrados = anguloInclinacionGrados(l, he, hap);

    // Borde inclinado: sección crítica y km,α.
    const critica = seccionCriticaTaper(l, he, hap, b, q);
    const estadoBorde = bordeDesde(borde);
    const factorKmAlpha = kmAlpha(
      estadoBorde, anguloGrados, fmd.valor, fvd.valor,
      estadoBorde === "traccionado" ? ft90d.valor : fc90d.valor
    );
    const resistenciaBorde = factorKmAlpha * fmd.valor;
    const aprovechaBorde =
      resistenciaBorde > 0 ? critica.sigmaMdMPa / resistenciaBorde : Infinity;

    // Vértice.
    const momentoVertice = (q * l ** 2) / 8;
    const volumenTotal = b * ((he + hap) / 2) * l;
    const volumen = volumenVertice(b, hap, anguloGrados, volumenTotal);

    // Rasante en el vértice, con la anchura eficaz del art. 6.1.7.
    const cortanteVertice = 0;
    const tauD = cortanteVertice;

    const vertice = verificarVertice({
      forma: formaV,
      anchoM: b,
      cantoVerticeM: hap,
      anguloVerticeGrados: anguloGrados,
      radioInteriorM: formaV === "dos-aguas" || rin === 0 ? Infinity : rin,
      espesorLaminaM: tLam,
      momentoVerticeKNm: momentoVertice,
      volumenM3: volumen.adoptadoM3,
      laminada,
      fmdMPa: fmd.valor,
      ft90dMPa: ft90d.valor,
      fvdMPa: fvd.valor,
      tauDMPa: tauD,
    });

    const espesorMax =
      formaV !== "dos-aguas" && rin > 0
        ? espesorMaximoLaminaMm(rin * 1000, aNumero(fmjdek))
        : null;

    return {
      l, b, he, hap, q, rin, tLam, laminada, km, gammaM,
      fmd, fvd, ft90d, fc90d, anguloGrados, critica, factorKmAlpha,
      resistenciaBorde, aprovechaBorde, momentoVertice, volumen, vertice,
      formaV, espesorMax, estadoBorde,
    };
  }, [luz, ancho, cantoApoyo, cantoVertice, carga, radio, espesorLamina,
      fmk, fvk, ft90k, fc90k, fmjdek, tipo, servicio, duracion, forma, borde]);

  const avisos: AvisoRevision[] = [];
  if (!r) {
    avisos.push({ tipo: "error", texto: "Cargá geometría, carga y resistencias con valores válidos. El canto del vértice tiene que ser mayor que el del apoyo." });
  } else {
    if (!r.laminada) avisos.push({ tipo: "aviso", texto: "El art. 6.4.3(1) sólo se aplica a laminada encolada y microlaminada: las comprobaciones del vértice no corresponden en madera maciza." });
    if (r.volumen.topado) avisos.push({ tipo: "aviso", texto: `El volumen de la zona del vértice se topó en 2Vb/3 = ${fmt(r.volumen.topeM3, 3)} m³ (art. 6.4.3(6)).` });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Piezas de canto variable</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="material" numero={1} titulo="Material" descripcion="En el vértice manda ft,90,k, que anda por 0,5 MPa contra 28 de fm,k.">
          <div className="max-w-2xl space-y-4">
            <SelectorMadera
              tipo={tipo} onTipo={setTipo}
              servicio={servicio} onServicio={setServicio}
              duracion={duracion} onDuracion={setDuracion}
            />
            <div className="grid grid-cols-2 gap-4">
              <CampoNumerico id="fmk" etiqueta="fm,k" sufijo="MPa" valor={fmk} onChange={setFmk} />
              <CampoNumerico id="fvk" etiqueta="fv,k" sufijo="MPa" valor={fvk} onChange={setFvk} />
              <CampoNumerico id="ft90k" etiqueta="ft,90,k" sufijo="MPa" valor={ft90k} onChange={setFt90k} />
              <CampoNumerico id="fc90k" etiqueta="fc,90,k" sufijo="MPa" valor={fc90k} onChange={setFc90k} />
            </div>
          </div>
        </Etapa>

        <Etapa id="geometria" numero={2} titulo="Geometría y carga" descripcion="Forma de la viga, cantos en apoyo y vértice, y carga de cálculo.">
          <DatosConDibujo
            datos={
              <>
                <CampoSeleccion id="forma" etiqueta="Forma de la viga" valor={forma} opciones={FORMAS} onChange={setForma} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="luz" etiqueta="Luz l" sufijo="m" valor={luz} onChange={setLuz} />
                  <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                  <CampoNumerico id="cantoApoyo" etiqueta="Canto en apoyo he" sufijo="m" valor={cantoApoyo} onChange={setCantoApoyo} />
                  <CampoNumerico id="cantoVertice" etiqueta="Canto en vértice hap" sufijo="m" valor={cantoVertice} onChange={setCantoVertice} />
                  <CampoNumerico id="carga" etiqueta="Carga q de cálculo" sufijo="kN/m" valor={carga} onChange={setCarga} />
                  <CampoSeleccion id="borde" etiqueta="Borde inclinado" valor={borde} opciones={BORDES} onChange={setBorde} />
                </div>
                {forma !== NOMBRE_FORMA["dos-aguas"] && (
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="radio" etiqueta="Radio interior rin" sufijo="m" valor={radio} onChange={setRadio} />
                    <CampoNumerico id="espesorLamina" etiqueta="Espesor lámina" sufijo="m" valor={espesorLamina} onChange={setEspesorLamina} />
                    <CampoNumerico id="fmjdek" etiqueta="fm,j,de,k" sufijo="MPa" valor={fmjdek} onChange={setFmjdek} />
                  </div>
                )}
                <PanelAyuda titulo="Por qué el borde inclinado no se elige por el signo del momento">
                  <p>
                    Las ecs. (6.39) y (6.40) se eligen según el borde inclinado quede{" "}
                    <strong className="text-foreground">traccionado o comprimido</strong>, y eso
                    depende de hacia qué cara se cortó la pendiente, no del signo del momento. La
                    planilla original lo pide como «momento positivo o negativo», y esa traducción
                    falla en cuanto la pendiente cambia de cara.
                  </p>
                  <p>
                    La diferencia no es cosmética: la rama de tracción divide el rasante por 0,75 y
                    la de compresión por 1,5, y compara contra ft,90,d en vez de fc,90,d, que difieren
                    en un factor cinco. A 4,3° la brecha en km,α es del 22 %; a 12°, más del doble.
                  </p>
                </PanelAyuda>
              </>
            }
            dibujo={
              r ? (
                <CroquisVigaVariable
                  forma={r.formaV}
                  luzM={r.l}
                  cantoApoyoM={r.he}
                  cantoVerticeM={r.hap}
                  posicionCriticaM={r.critica.posicionM}
                  cantoCriticoM={r.critica.cantoM}
                />
              ) : null
            }
          />
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Madera", valor: `${tipo} · ${servicio}` },
              { etiqueta: "Duración de la carga", valor: duracion },
              { etiqueta: "fm,k · fv,k", valor: `${fmk} · ${fvk} MPa` },
              { etiqueta: "ft,90,k · fc,90,k", valor: `${ft90k} · ${fc90k} MPa` },
              { etiqueta: "Forma", valor: forma },
              { etiqueta: "Luz · b", valor: `${luz} · ${ancho} m` },
              { etiqueta: "he · hap", valor: `${cantoApoyo} · ${cantoVertice} m` },
              { etiqueta: "q · borde inclinado", valor: `${carga} kN/m · ${borde.toLowerCase()}` },
              ...(r ? [{ etiqueta: "Ángulo α", valor: `${fmt(r.anguloGrados, 2)}°`, derivado: true }] : []),
            ]}
            hipotesis={[
              "EC5, art. 6.4.2 (borde inclinado, ecs. 6.37 a 6.40) y 6.4.3 (zona del vértice).",
              "km,α según el borde inclinado quede traccionado o comprimido, no según el signo del momento.",
              "Sección crítica del borde inclinado en x = 0,5·l·he/hap, con carga uniforme.",
              "Momento en el vértice q·l²/8 (viga biapoyada con carga uniforme).",
              "Volumen de la zona del vértice topado en 2Vb/3 (art. 6.4.3(6)).",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!r ? (
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
                  { etiqueta: "Ángulo α", valor: `${fmt(r.anguloGrados, 2)}°` },
                  { etiqueta: "km,α", valor: fmt(r.factorKmAlpha, 3), nota: `borde ${r.estadoBorde}` },
                  { etiqueta: "Map,d", valor: `${fmt(r.momentoVertice, 1)} kN·m` },
                  { etiqueta: "σt,90,d", valor: `${fmt(r.vertice.sigmaT90dMPa, 3)} MPa`, nota: `adm ${fmt(r.vertice.resistenciaT90MPa, 3)} MPa` },
                ]}
              />

              <Subgrupo titulo="Borde inclinado" detalle="art. 6.4.2">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Borde inclinado, ec. (6.38)"
                    verifica={r.aprovechaBorde <= 1}
                    comparacion={{
                      real: { etiqueta: "σm,α,d", valor: r.critica.sigmaMdMPa },
                      limite: { etiqueta: "km,α·fm,d", valor: r.resistenciaBorde },
                      unidad: "MPa", exige: "≤", decimales: 2,
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del borde inclinado"
                    filas={[
                      { etiqueta: "Ángulo de inclinación α", valor: `${fmt(r.anguloGrados, 3)}°` },
                      { etiqueta: "Sección crítica x = 0,5·l·he/hap", valor: `${fmt(r.critica.posicionM, 3)} m` },
                      { etiqueta: "Canto ahí", valor: `${fmt(r.critica.cantoM, 3)} m` },
                      { etiqueta: "Momento ahí", valor: `${fmt(r.critica.momentoKNm, 1)} kN·m` },
                      { etiqueta: "σm,α,d  (6.37)", valor: `${fmt(r.critica.sigmaMdMPa, 2)} MPa` },
                      { etiqueta: `km,α  (${r.estadoBorde === "traccionado" ? "6.39" : "6.40"})`, valor: fmt(r.factorKmAlpha, 3) },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Zona del vértice" detalle="art. 6.4.3">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flexión en el vértice, ec. (6.41)"
                    verifica={r.vertice.aprovechamientoFlexion <= 1}
                    estado={r.laminada ? undefined : "no-aplica"}
                    detalle={r.laminada ? undefined : "Sólo laminada encolada y microlaminada (art. 6.4.3(1))."}
                    comparacion={{
                      real: { etiqueta: "σm,d", valor: r.vertice.sigmaMdMPa },
                      limite: { etiqueta: "kr·fm,d", valor: r.vertice.resistenciaFlexionMPa },
                      unidad: "MPa", exige: "≤", decimales: 2,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Tracción perpendicular en el vértice, ec. (6.50)"
                    verifica={r.vertice.aprovechamientoT90 <= 1}
                    estado={r.laminada ? undefined : "no-aplica"}
                    detalle={r.laminada ? undefined : "Sólo laminada encolada y microlaminada (art. 6.4.3(1))."}
                    comparacion={{
                      real: { etiqueta: "σt,90,d", valor: r.vertice.sigmaT90dMPa },
                      limite: { etiqueta: "kdis·kvol·ft,90,d", valor: r.vertice.resistenciaT90MPa },
                      unidad: "MPa", exige: "≤", decimales: 3,
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la zona del vértice"
                    filas={[
                      { etiqueta: "Map,d", valor: `${fmt(r.momentoVertice, 1)} kN·m` },
                      { etiqueta: "k1  (6.44)", valor: fmt(r.vertice.factores.k1, 4) },
                      { etiqueta: "k2  (6.45)", valor: fmt(r.vertice.factores.k2, 4) },
                      { etiqueta: "k3  (6.46)", valor: fmt(r.vertice.factores.k3, 4) },
                      { etiqueta: "k4  (6.47)", valor: fmt(r.vertice.factores.k4, 4) },
                      { etiqueta: "kl  (6.43)", valor: fmt(r.vertice.factores.kl, 4) },
                      { etiqueta: "kp  (6.56)", valor: fmt(r.vertice.factores.kp, 4) },
                      { etiqueta: "kr  (6.49)", valor: fmt(r.vertice.kr, 3) },
                      { etiqueta: "kdis  (6.52)", valor: fmt(r.vertice.kdis, 2) },
                      { etiqueta: "V de la zona del vértice", valor: `${fmt(r.volumen.adoptadoM3, 3)} m³` },
                      { etiqueta: "kvol  (6.51)", valor: fmt(r.vertice.kvol, 3) },
                      ...(r.espesorMax
                        ? [{ etiqueta: "Espesor máximo de lámina (EN 14080)", valor: `${fmt(r.espesorMax, 1)} mm` }]
                        : []),
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
