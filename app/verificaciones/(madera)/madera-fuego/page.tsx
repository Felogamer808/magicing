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
import { CroquisSeccionCarbonizada } from "@/components/verificaciones/madera/CroquisSeccionCarbonizada";
import {
  NOMBRE_MADERA,
  GAMMA_M,
  kmod,
  type TipoMadera,
} from "@/lib/calc/madera/materiales";
import {
  CUATRO_CARAS,
  NOMBRE_ESPECIE_FUEGO,
  TRES_CARAS,
  betaN,
  relacionIncendioFrio,
  resistenciaEnIncendioMPa,
  seccionReducida,
  type CarasExpuestas,
  type EspecieFuego,
} from "@/lib/calc/madera/fuego";
import { pandeoEje } from "@/lib/calc/madera/axil";
import { propiedades, tensionAxilMPa, tensionFlexionMPa } from "@/lib/calc/madera/seccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-fuego")!;

const TIPOS = Object.values(NOMBRE_MADERA);
const tipoDesde = (e: string): TipoMadera =>
  ((Object.entries(NOMBRE_MADERA) as [TipoMadera, string][]).find(([, n]) => n === e)?.[0] ?? "maciza");

const ESPECIES = Object.values(NOMBRE_ESPECIE_FUEGO);
const especieDesde = (e: string): EspecieFuego =>
  ((Object.entries(NOMBRE_ESPECIE_FUEGO) as [EspecieFuego, string][]).find(([, n]) => n === e)?.[0] ??
    "conifera");

const EXPOSICIONES = [
  "Tres caras (viga con losa encima)",
  "Cuatro caras (pilar exento)",
  "Dos caras opuestas (vigueta entre forjados)",
] as const;

function carasDesde(e: string): CarasExpuestas {
  if (e === EXPOSICIONES[1]) return CUATRO_CARAS;
  if (e === EXPOSICIONES[2]) return { enAnchura: 2, enCanto: 0 };
  return TRES_CARAS;
}

export default function MaderaFuegoPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Laminada encolada (MLE)");
  const [especie, setEspecie] = useCampo("especie", NOMBRE_ESPECIE_FUEGO.conifera);
  const [exposicion, setExposicion] = useCampo("exposicion", EXPOSICIONES[0]);
  const [tiempo, setTiempo] = useCampo("tiempo", "30");

  const [ancho, setAncho] = useCampo("ancho", "0.14");
  const [canto, setCanto] = useCampo("canto", "0.364");

  const [fmk, setFmk] = useCampo("fmk", "24");
  const [fc0k, setFc0k] = useCampo("fc0k", "24");
  const [e005, setE005] = useCampo("e005", "9.6");

  const [momento, setMomento] = useCampo("momento", "11.68");
  const [axil, setAxil] = useCampo("axil", "0");
  const [lkz, setLkz] = useCampo("lkz", "2.05");

  const r = useMemo(() => {
    const b = aNumero(ancho);
    const h = aNumero(canto);
    const t = aNumero(tiempo);
    const fmkV = aNumero(fmk);
    const fc0kV = aNumero(fc0k);
    const e = aNumero(e005);
    const m = aNumero(momento);
    const n = aNumero(axil);
    const lz = aNumero(lkz);

    if (![b, h, fmkV, fc0kV, e, lz].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![t, m, n].every((x) => Number.isFinite(x) && x >= 0)) return null;

    const tipoM = tipoDesde(tipo);
    const esp = especieDesde(especie);
    const caras = carasDesde(exposicion);
    const velocidad = betaN(tipoM, esp);

    const reducida = seccionReducida(b, h, t, velocidad, caras);

    // Resistencias del art. 4.2.2(5): kmod,fi = 1 y γM,fi = 1, con kfi.
    const fmdFi = resistenciaEnIncendioMPa(fmkV, tipoM);
    const fc0dFi = resistenciaEnIncendioMPa(fc0kV, tipoM);
    const e005Fi = resistenciaEnIncendioMPa(e, tipoM);

    if (reducida.agotada) {
      return { b, h, tipoM, caras, velocidad, reducida, fmdFi, fc0dFi, agotada: true as const };
    }

    const props = propiedades({ anchoM: reducida.anchoEficazM, cantoM: reducida.cantoEficazM });

    const sigmaM = tensionFlexionMPa(m, props.wyM3);
    const sigmaC = tensionAxilMPa(n, props.areaM2);

    const ejeZ = pandeoEje(lz / props.radioGiroZM, fc0kV, e005Fi, tipoM);

    const relacion = relacionIncendioFrio(tipoM, kmod(tipoM, 1, "media"), GAMMA_M[tipoM]);

    return {
      b, h, tipoM, caras, velocidad, reducida, props,
      fmdFi, fc0dFi, e005Fi, sigmaM, sigmaC, ejeZ, relacion,
      aprovechaFlexion: fmdFi > 0 ? sigmaM / fmdFi : Infinity,
      aprovechaCompresion: ejeZ.kc * fc0dFi > 0 ? sigmaC / (ejeZ.kc * fc0dFi) : Infinity,
      agotada: false as const,
    };
  }, [ancho, canto, tiempo, fmk, fc0k, e005, momento, axil, lkz, tipo, especie, exposicion]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Situación accidental</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          La madera es el único material estructural que se verifica a fuego{" "}
          <strong className="text-foreground">quitando sección</strong> en vez de bajando
          resistencias. La capa carbonizada no resiste pero protege: por dentro de la línea de
          carbonización la madera sigue fría y conserva su resistencia entera. Por eso una viga de
          buena escuadría aguanta 60 minutos sin ninguna protección, y por eso la resistencia al
          fuego se compra con canto y no con tratamientos.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Exposición</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="tipo" etiqueta="Material" valor={tipo} opciones={TIPOS} onChange={setTipo} />
              <CampoSeleccion id="especie" etiqueta="Especie (tabla 3.1)" valor={especie}
                              opciones={ESPECIES} onChange={setEspecie} />
              <CampoSeleccion id="exposicion" etiqueta="Caras expuestas" valor={exposicion}
                              opciones={EXPOSICIONES} onChange={setExposicion} />
              <CampoNumerico id="tiempo" etiqueta="Tiempo requerido t" sufijo="min"
                             valor={tiempo} onChange={setTiempo}
                             sugerencias={[15, 30, 45, 60, 90, 120]} />
              <PanelAyuda titulo="De dónde sale βn y por qué el material importa">
                <p>
                  βn es la velocidad de carbonización ficticia de la tabla 3.1, e incluye el efecto
                  del redondeo de aristas y de las fendas. En coníferas la{" "}
                  <strong className="text-foreground">maciza carboniza a 0,8 mm/min y la
                  laminada a 0,7</strong>: encolar reduce las fendas por donde progresa el frente
                  de llama. Usar 0,7 en maciza subestima lo quemado un 14 % y agranda la sección
                  eficaz, o sea que va del lado inseguro.
                </p>
                <p>
                  Las frondosas densas —ρk ≥ 450 kg/m³— bajan a 0,55 mm/min, casi un tercio menos
                  que la maciza de conífera.
                </p>
                <p>
                  Las <strong className="text-foreground">caras expuestas</strong> deciden casi
                  todo. Una viga con la losa encima pierde tres caras y no cuatro, y esa cara que
                  no arde es canto útil que se conserva entero.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sección y esfuerzos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
                <CampoNumerico id="fmk" etiqueta="fm,k" sufijo="MPa" valor={fmk} onChange={setFmk} />
                <CampoNumerico id="fc0k" etiqueta="fc,0,k" sufijo="MPa" valor={fc0k} onChange={setFc0k} />
                <CampoNumerico id="e005" etiqueta="E0,05" sufijo="GPa" valor={e005} onChange={setE005} />
                <div />
                <CampoNumerico id="momento" etiqueta="Md,fi" sufijo="kN·m" valor={momento} onChange={setMomento} />
                <CampoNumerico id="axil" etiqueta="Nd,fi" sufijo="kN" valor={axil} onChange={setAxil} />
                <CampoNumerico id="lkz" etiqueta="Long. pandeo eje z" sufijo="m" valor={lkz} onChange={setLkz} />
              </div>
              <p className="text-xs text-muted-foreground">
                Los esfuerzos son los de la combinación accidental de incendio, bastante menores
                que los de ELU: las variables entran con ψ1 o ψ2 y no con γQ.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá sección, tiempo de exposición y resistencias con valores válidos.
              </CardContent>
            </Card>
          ) : r.agotada ? (
            <Card>
              <CardContent className="space-y-3 py-8 text-center">
                <p className="text-sm font-medium text-destructive">
                  A los {fmt(aNumero(tiempo), 0)} minutos no queda sección eficaz.
                </p>
                <p className="text-sm text-muted-foreground">
                  El descuento por cara es de {fmt(r.reducida.profundidadEficazM * 1000, 1)} mm y la
                  sección no da para tanto. Hay que engrosar la escuadría, reducir el tiempo
                  requerido o proteger las caras expuestas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {aNumero(momento) > 0 && (
                    <ResultadoCheck
                      etiqueta="Flexión sobre la sección eficaz"
                      verifica={r.aprovechaFlexion <= 1}
                      comparacion={{
                        real: { etiqueta: "σm,d,fi", valor: r.sigmaM },
                        limite: { etiqueta: "fm,d,fi", valor: r.fmdFi },
                        unidad: "MPa", exige: "≤", decimales: 2,
                      }}
                    />
                  )}
                  {aNumero(axil) > 0 && (
                    <ResultadoCheck
                      etiqueta="Compresión con pandeo sobre la sección eficaz"
                      verifica={r.aprovechaCompresion <= 1}
                      comparacion={{
                        real: { etiqueta: "σc,0,d,fi", valor: r.sigmaC },
                        limite: { etiqueta: "kc·fc,0,d,fi", valor: r.ejeZ.kc * r.fc0dFi },
                        unidad: "MPa", exige: "≤", decimales: 2,
                      }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Queda el {fmt(r.reducida.fraccionAreaRestante * 100, 0)} % del área original. La
                    tensión resistente en incendio es {fmt(r.relacion, 2)} veces la de frío, así que
                    si la pieza no verifica el problema es de sección y no de clase resistente.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Sección carbonizada</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <CroquisSeccionCarbonizada
                    anchoM={r.b} cantoM={r.h} reducida={r.reducida} caras={r.caras}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "βn (tabla 3.1)", valor: `${fmt(r.velocidad, 2)} mm/min` },
                      {
                        etiqueta: "dchar,n = βn·t  (3.2)",
                        valor: `${fmt(r.reducida.profundidadCarbonizadaM * 1000, 1)} mm`,
                      },
                      { etiqueta: "k0 (tabla 4.1)", valor: fmt(r.reducida.k0, 2) },
                      {
                        etiqueta: "def = dchar,n + k0·d0  (4.1)",
                        valor: `${fmt(r.reducida.profundidadEficazM * 1000, 1)} mm`,
                        formula: "βn·t + k0·7 mm",
                        sustitucion: `${fmt(r.velocidad, 2)}·${fmt(aNumero(tiempo), 0)} + ${fmt(r.reducida.k0, 2)}·7`,
                      },
                      { etiqueta: "bef", valor: `${fmt(r.reducida.anchoEficazM, 4)} m` },
                      { etiqueta: "hef", valor: `${fmt(r.reducida.cantoEficazM, 4)} m` },
                      { etiqueta: "Wy de la sección eficaz", valor: `${fmt(r.props.wyM3 * 1e3, 4)} ·10⁻³ m³` },
                      { etiqueta: "kfi (tabla 2.1)", valor: fmt(r.fmdFi / aNumero(fmk), 2) },
                      {
                        etiqueta: "fm,d,fi  (2.4)",
                        valor: `${fmt(r.fmdFi, 2)} MPa`,
                        formula: "kmod,fi · kfi · fm,k / γM,fi",
                        sustitucion: `1,00 · ${fmt(r.fmdFi / aNumero(fmk), 2)} · ${fmt(aNumero(fmk), 1)} / 1,00`,
                      },
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
