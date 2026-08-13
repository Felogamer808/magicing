"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { CroquisSeccionMadera } from "@/components/verificaciones/madera/CroquisSeccionMadera";
import { CurvaVuelco } from "@/components/verificaciones/madera/CurvaVuelco";
import {
  SelectorMadera,
  servicioDesdeEtiqueta,
  duracionDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import {
  NOMBRE_CASO_VUELCO,
  flexionEsviada,
  verificarVuelco,
  type BordeCarga,
  type CasoVuelco,
} from "@/lib/calc/ec5/flexion";
import {
  GAMMA_M,
  KM_OTRAS_SECCIONES,
  KM_RECTANGULAR,
  KSYS_COMPARTIDA,
  kh,
  kmod,
  resistenciaDeCalculo,
} from "@/lib/calc/ec5/materiales";
import { propiedades, tensionFlexionMPa } from "@/lib/calc/ec5/seccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-flexion")!;

const CASOS = Object.values(NOMBRE_CASO_VUELCO);
const casoDesdeEtiqueta = (e: string): CasoVuelco =>
  ((Object.entries(NOMBRE_CASO_VUELCO) as [CasoVuelco, string][]).find(([, n]) => n === e)?.[0] ??
    "apoyada-distribuida");

const BORDES = ["Borde comprimido", "Centro de gravedad", "Borde traccionado"] as const;
const bordeDesde = (e: string): BordeCarga =>
  e === BORDES[0] ? "comprimido" : e === BORDES[2] ? "traccionado" : "centro-gravedad";

const ARRIOSTRADO = ["No", "Sí, en toda su longitud"] as const;
const REPARTO = ["No compartida", "Compartida (ksys = 1,1)"] as const;

export default function MaderaFlexionPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Laminada encolada (MLE)");
  const [servicio, setServicio] = useCampo("servicio", "Clase 1");
  const [duracion, setDuracion] = useCampo("duracion", "Media (1 semana a 6 meses)");
  const [reparto, setReparto] = useCampo("reparto", REPARTO[0]);

  const [ancho, setAncho] = useCampo("ancho", "0.2");
  const [canto, setCanto] = useCampo("canto", "1.25");
  const [luz, setLuz] = useCampo("luz", "5.6");

  const [fmk, setFmk] = useCampo("fmk", "20");
  const [e005, setE005] = useCampo("e005", "10.8");
  const [g005, setG005] = useCampo("g005", "0.54");

  const [my, setMy] = useCampo("my", "400");
  const [mz, setMz] = useCampo("mz", "0");

  const [caso, setCaso] = useCampo("caso", NOMBRE_CASO_VUELCO["apoyada-distribuida"]);
  const [borde, setBorde] = useCampo("borde", BORDES[0]);
  const [arriostrado, setArriostrado] = useCampo("arriostrado", ARRIOSTRADO[0]);

  const r = useMemo(() => {
    const b = aNumero(ancho);
    const h = aNumero(canto);
    const l = aNumero(luz);
    const fmkV = aNumero(fmk);
    const e = aNumero(e005);
    const g = aNumero(g005);
    const myV = aNumero(my);
    const mzV = aNumero(mz);

    if (![b, h, l, fmkV, e, g].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![myV, mzV].every((x) => Number.isFinite(x) && x >= 0)) return null;

    const t = tipoDesdeEtiqueta(tipo);
    const km = kmod(t, servicioDesdeEtiqueta(servicio), duracionDesdeEtiqueta(duracion));
    const gammaM = GAMMA_M[t];
    const ksys = reparto === REPARTO[1] ? KSYS_COMPARTIDA : 1;

    /*
     * kh se calcula por separado en cada eje: para el eje fuerte manda el canto
     * y para el débil la anchura, porque el "h" de las ecs. (3.1)/(3.2) es la
     * dimensión perpendicular al eje de flexión.
     */
    const khY = kh(t, h);
    const khZ = kh(t, b);

    const fmYd = resistenciaDeCalculo(fmkV, { kmod: km, gammaM, kh: khY, ksys });
    const fmZd = resistenciaDeCalculo(fmkV, { kmod: km, gammaM, kh: khZ, ksys });

    const seccion = { anchoM: b, cantoM: h };
    const props = propiedades(seccion);

    const sigmaY = tensionFlexionMPa(myV, props.wyM3);
    const sigmaZ = tensionFlexionMPa(mzV, props.wzM3);

    const esviada = flexionEsviada(
      sigmaY, sigmaZ, fmYd.valor, fmZd.valor,
      mzV > 0 ? KM_RECTANGULAR : KM_OTRAS_SECCIONES
    );

    const vuelco = verificarVuelco({
      seccion,
      luzM: l,
      caso: casoDesdeEtiqueta(caso),
      borde: bordeDesde(borde),
      e005GPa: e,
      g005GPa: g,
      fmkMPa: fmkV,
      fmdMPa: fmYd.valor,
      sigmaMdMPa: sigmaY,
      arriostrado: arriostrado === ARRIOSTRADO[1],
    });

    return {
      b, h, l, t, km, gammaM, ksys, khY, khZ, fmYd, fmZd, props,
      sigmaY, sigmaZ, esviada, vuelco, hayEsviada: mzV > 0,
    };
  }, [ancho, canto, luz, fmk, e005, g005, my, mz, tipo, servicio, duracion, reparto,
      caso, borde, arriostrado]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Piezas rectas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Dos comprobaciones sobre la misma viga, y conviene no confundirlas. El art. 6.1.6 agota
          el material a flexión. El art. 6.3.3 la vuelca de costado <em>antes</em> de agotarla: una
          viga de mucho canto y poca anchura puede pasar holgada la primera y no llegar a la mitad
          en la segunda.
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
              <CampoSeleccion id="reparto" etiqueta="Reparto transversal de carga"
                              valor={reparto} opciones={REPARTO} onChange={setReparto} />
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="fmk" etiqueta="fm,k" sufijo="MPa" valor={fmk} onChange={setFmk} />
                <CampoNumerico id="e005" etiqueta="E0,05" sufijo="GPa" valor={e005} onChange={setE005} />
                <CampoNumerico id="g005" etiqueta="G0,05" sufijo="GPa" valor={g005} onChange={setG005} />
              </div>
              <p className="text-xs text-muted-foreground">
                Los valores característicos se cargan a mano, como en la planilla. Salen de EN 338
                para maciza y de EN 14080 para laminada; en coníferas G0,05 anda por E0,05/16.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría y esfuerzos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
              <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
              <CampoNumerico id="luz" etiqueta="Luz l" sufijo="m" valor={luz} onChange={setLuz} />
              <div />
              <CampoNumerico id="my" etiqueta="My,d (eje fuerte)" sufijo="kN·m" valor={my} onChange={setMy} />
              <CampoNumerico id="mz" etiqueta="Mz,d (eje débil)" sufijo="kN·m" valor={mz} onChange={setMz} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Condiciones de vuelco</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="caso" etiqueta="Viga y carga (tabla 6.1)"
                              valor={caso} opciones={CASOS} onChange={setCaso} />
              <CampoSeleccion id="borde" etiqueta="Dónde se aplica la carga"
                              valor={borde} opciones={BORDES} onChange={setBorde} />
              <CampoSeleccion id="arriostrado" etiqueta="¿Borde comprimido arriostrado?"
                              valor={arriostrado} opciones={ARRIOSTRADO} onChange={setArriostrado} />
              <PanelAyuda titulo="Por qué importa tanto dónde se apoya la carga">
                <p>
                  La nota a la tabla 6.1 suma <strong className="text-foreground">2h</strong> a la
                  longitud eficaz cuando la carga cuelga del borde comprimido, y descuenta 0,5h
                  cuando se apoya en el traccionado. Entre los dos extremos hay 2,5 veces el canto:
                  en una viga de 1,25 m son más de 3 m de longitud eficaz.
                </p>
                <p>
                  El motivo es físico. Si la carga va arriba, al girar la viga la carga la acompaña
                  y aumenta el vuelco. Si va colgada abajo, actúa como un péndulo y endereza.
                </p>
                <p>
                  <strong className="text-foreground">Arriostrar</strong> el borde comprimido en
                  toda su longitud —una losa clavada, correas continuas— permite tomar kcrit = 1 por
                  el art. 6.3.3(5), y suele ser mucho más barato que ensanchar la viga.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá geometría, resistencias y momentos con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta={r.hayEsviada ? "Flexión esviada, ecs. (6.11) y (6.12)" : "Flexión, art. 6.1.6"}
                    verifica={r.esviada.verifica}
                    comparacion={{
                      real: { etiqueta: "aprovechamiento", valor: r.esviada.aprovechamiento },
                      limite: { etiqueta: "límite", valor: 1 },
                      exige: "≤",
                      decimales: 3,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Vuelco lateral, ec. (6.33)"
                    verifica={r.vuelco.verifica}
                    comparacion={{
                      real: { etiqueta: "σm,d", valor: r.vuelco.sigmaMdMPa },
                      limite: { etiqueta: "kcrit·fm,d", valor: r.vuelco.resistenciaReducidaMPa },
                      unidad: "MPa",
                      exige: "≤",
                      decimales: 2,
                    }}
                  />
                  {r.vuelco.sinReduccion && !r.vuelco.verifica === false && (
                    <p className="text-xs text-muted-foreground">
                      kcrit = 1: con esta esbeltez el vuelco no descuenta nada y la comprobación de
                      arriba es la misma que la del art. 6.1.6.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Sección</CardTitle></CardHeader>
                <CardContent>
                  <CroquisSeccionMadera anchoM={r.b} cantoM={r.h} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Vuelco lateral</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <CurvaVuelco
                    lambdaRelM={r.vuelco.lambdaRelM}
                    kcritActual={r.vuelco.kcrit}
                    arriostrado={arriostrado === ARRIOSTRADO[1]}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo del vuelco"
                    filas={[
                      { etiqueta: "lef (tabla 6.1 + nota)", valor: `${fmt(r.vuelco.longitudEficazM, 3)} m` },
                      { etiqueta: "Itor", valor: `${fmt(r.props.itorM4 * 1e4, 2)} ·10⁻⁴ m⁴` },
                      { etiqueta: "σm,crit  (6.32)", valor: `${fmt(r.vuelco.sigmaCritMPa, 2)} MPa` },
                      { etiqueta: "λrel,m = √(fm,k/σm,crit)  (6.30)", valor: fmt(r.vuelco.lambdaRelM, 3) },
                      { etiqueta: "kcrit  (6.34)", valor: fmt(r.vuelco.kcrit, 3) },
                      { etiqueta: "kcrit·fm,d", valor: `${fmt(r.vuelco.resistenciaReducidaMPa, 2)} MPa` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Desarrollo</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Resistencias y tensiones"
                    filas={[
                      { etiqueta: "kmod (tabla 3.1)", valor: fmt(r.km, 2) },
                      { etiqueta: "γM (tabla 2.3)", valor: fmt(r.gammaM, 2) },
                      { etiqueta: "kh eje fuerte (canto h)", valor: fmt(r.khY, 3) },
                      { etiqueta: "kh eje débil (anchura b)", valor: fmt(r.khZ, 3) },
                      { etiqueta: "ksys", valor: fmt(r.ksys, 2) },
                      {
                        etiqueta: "fm,y,d  (2.14)",
                        valor: `${fmt(r.fmYd.valor, 2)} MPa`,
                        formula: "kmod · kh · ksys · fm,k / γM",
                        sustitucion: `${fmt(r.km, 2)} · ${fmt(r.khY, 3)} · ${fmt(r.ksys, 2)} · ${fmt(aNumero(fmk), 1)} / ${fmt(r.gammaM, 2)}`,
                      },
                      { etiqueta: "fm,z,d", valor: `${fmt(r.fmZd.valor, 2)} MPa` },
                      { etiqueta: "Wy", valor: `${fmt(r.props.wyM3 * 1e3, 3)} ·10⁻³ m³` },
                      { etiqueta: "Wz", valor: `${fmt(r.props.wzM3 * 1e3, 3)} ·10⁻³ m³` },
                      { etiqueta: "σm,y,d", valor: `${fmt(r.sigmaY, 2)} MPa` },
                      { etiqueta: "σm,z,d", valor: `${fmt(r.sigmaZ, 2)} MPa` },
                      { etiqueta: "Ec. (6.11)", valor: fmt(r.esviada.aprovechamiento611, 3) },
                      { etiqueta: "Ec. (6.12)", valor: fmt(r.esviada.aprovechamiento612, 3) },
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
