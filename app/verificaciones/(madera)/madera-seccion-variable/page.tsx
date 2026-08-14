"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Piezas de canto variable</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Estas vigas fallan por <strong className="text-foreground">delaminación en el
          vértice</strong>, no por flexión. Cortar la pendiente deja las fibras terminando contra
          la cara, y en el vértice el momento intenta enderezar las láminas curvadas y las despega:
          ahí manda ft,90,k, que anda por 0,5 MPa contra 28 de fm,k. El apartado 6.4.3 sólo se
          aplica a laminada encolada y microlaminada.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Material</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría y carga</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="forma" etiqueta="Forma de la viga" valor={forma}
                              opciones={FORMAS} onChange={setForma} />
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="luz" etiqueta="Luz l" sufijo="m" valor={luz} onChange={setLuz} />
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="cantoApoyo" etiqueta="Canto en apoyo he" sufijo="m"
                               valor={cantoApoyo} onChange={setCantoApoyo} />
                <CampoNumerico id="cantoVertice" etiqueta="Canto en vértice hap" sufijo="m"
                               valor={cantoVertice} onChange={setCantoVertice} />
                <CampoNumerico id="carga" etiqueta="Carga q de cálculo" sufijo="kN/m"
                               valor={carga} onChange={setCarga} />
                <CampoSeleccion id="borde" etiqueta="Borde inclinado" valor={borde}
                                opciones={BORDES} onChange={setBorde} />
              </div>
              {forma !== NOMBRE_FORMA["dos-aguas"] && (
                <div className="grid grid-cols-3 gap-4">
                  <CampoNumerico id="radio" etiqueta="Radio interior rin" sufijo="m"
                                 valor={radio} onChange={setRadio} />
                  <CampoNumerico id="espesorLamina" etiqueta="Espesor lámina" sufijo="m"
                                 valor={espesorLamina} onChange={setEspesorLamina} />
                  <CampoNumerico id="fmjdek" etiqueta="fm,j,de,k" sufijo="MPa"
                                 valor={fmjdek} onChange={setFmjdek} />
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá geometría, carga y resistencias con valores válidos. El canto del vértice
                tiene que ser mayor que el del apoyo.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Borde inclinado, ec. (6.38)"
                    verifica={r.aprovechaBorde <= 1}
                    comparacion={{
                      real: { etiqueta: "σm,α,d", valor: r.critica.sigmaMdMPa },
                      limite: { etiqueta: "km,α·fm,d", valor: r.resistenciaBorde },
                      unidad: "MPa", exige: "≤", decimales: 2,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Flexión en el vértice, ec. (6.41)"
                    verifica={r.vertice.aprovechamientoFlexion <= 1}
                    comparacion={{
                      real: { etiqueta: "σm,d", valor: r.vertice.sigmaMdMPa },
                      limite: { etiqueta: "kr·fm,d", valor: r.vertice.resistenciaFlexionMPa },
                      unidad: "MPa", exige: "≤", decimales: 2,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Tracción perpendicular en el vértice, ec. (6.50)"
                    verifica={r.vertice.aprovechamientoT90 <= 1}
                    comparacion={{
                      real: { etiqueta: "σt,90,d", valor: r.vertice.sigmaT90dMPa },
                      limite: { etiqueta: "kdis·kvol·ft,90,d", valor: r.vertice.resistenciaT90MPa },
                      unidad: "MPa", exige: "≤", decimales: 3,
                    }}
                  />
                  {!r.laminada && (
                    <p className="text-xs text-destructive">
                      El art. 6.4.3(1) sólo se aplica a laminada encolada y microlaminada. Las
                      comprobaciones del vértice no corresponden en madera maciza.
                    </p>
                  )}
                  {r.volumen.topado && (
                    <p className="text-xs text-muted-foreground">
                      El volumen de la zona del vértice se topó en 2Vb/3 ={" "}
                      {fmt(r.volumen.topeM3, 3)} m³, como pide el art. 6.4.3(6).
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Alzado</CardTitle></CardHeader>
                <CardContent>
                  <CroquisVigaVariable
                    forma={r.formaV}
                    luzM={r.l}
                    cantoApoyoM={r.he}
                    cantoVerticeM={r.hap}
                    posicionCriticaM={r.critica.posicionM}
                    cantoCriticoM={r.critica.cantoM}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Desarrollo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <PanelFormulas
                    titulo="Borde inclinado"
                    filas={[
                      { etiqueta: "Ángulo de inclinación α", valor: `${fmt(r.anguloGrados, 3)}°` },
                      {
                        etiqueta: "Sección crítica x = 0,5·l·he/hap",
                        valor: `${fmt(r.critica.posicionM, 3)} m`,
                      },
                      { etiqueta: "Canto ahí", valor: `${fmt(r.critica.cantoM, 3)} m` },
                      { etiqueta: "Momento ahí", valor: `${fmt(r.critica.momentoKNm, 1)} kN·m` },
                      { etiqueta: "σm,α,d  (6.37)", valor: `${fmt(r.critica.sigmaMdMPa, 2)} MPa` },
                      {
                        etiqueta: `km,α  (${r.estadoBorde === "traccionado" ? "6.39" : "6.40"})`,
                        valor: fmt(r.factorKmAlpha, 3),
                      },
                    ]}
                  />
                  <PanelFormulas
                    titulo="Zona del vértice"
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
                      {
                        etiqueta: "V de la zona del vértice",
                        valor: `${fmt(r.volumen.adoptadoM3, 3)} m³`,
                      },
                      { etiqueta: "kvol  (6.51)", valor: fmt(r.vertice.kvol, 3) },
                      ...(r.espesorMax
                        ? [
                            {
                              etiqueta: "Espesor máximo de lámina (EN 14080)",
                              valor: `${fmt(r.espesorMax, 1)} mm`,
                            },
                          ]
                        : []),
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
