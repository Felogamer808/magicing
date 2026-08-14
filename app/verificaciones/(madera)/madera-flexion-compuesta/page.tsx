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
import { CurvaPandeoMadera } from "@/components/verificaciones/madera/CurvaPandeoMadera";
import { DiagramaInteraccionMadera } from "@/components/verificaciones/madera/DiagramaInteraccionMadera";
import {
  SelectorMadera,
  duracionDesdeEtiqueta,
  servicioDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import { pandeoEje } from "@/lib/calc/ec5/axil";
import { NOMBRE_MODO, verificarFlexionCompuesta } from "@/lib/calc/ec5/flexion-compuesta";
import { kcrit, longitudEficazM, tensionCritica } from "@/lib/calc/ec5/flexion";
import {
  GAMMA_M, KM_OTRAS_SECCIONES, KM_RECTANGULAR, kh, kmod, resistenciaDeCalculo,
} from "@/lib/calc/ec5/materiales";
import { propiedades, tensionAxilMPa, tensionFlexionMPa } from "@/lib/calc/ec5/seccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-flexion-compuesta")!;

const SIGNOS = ["Compresión", "Tracción"] as const;
const PROBLEMAS = ["Columna: pandeo por compresión", "Viga: vuelco lateral, ec. (6.35)"] as const;

export default function MaderaFlexionCompuestaPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Madera maciza");
  const [servicio, setServicio] = useCampo("servicio", "Clase 2");
  const [duracion, setDuracion] = useCampo("duracion", "Media (1 semana a 6 meses)");

  const [ancho, setAncho] = useCampo("ancho", "0.2");
  const [canto, setCanto] = useCampo("canto", "0.3");
  const [lky, setLky] = useCampo("lky", "6");
  const [lkz, setLkz] = useCampo("lkz", "3");

  const [fmkV, setFmk] = useCampo("fmk", "24");
  const [ft0k, setFt0k] = useCampo("ft0k", "14");
  const [fc0k, setFc0k] = useCampo("fc0k", "21");
  const [e005, setE005] = useCampo("e005", "9.4");
  const [g005, setG005] = useCampo("g005", "0.59");

  const [signo, setSigno] = useCampo("signo", SIGNOS[0]);
  const [axil, setAxil] = useCampo("axil", "10.8");
  const [my, setMy] = useCampo("my", "5");
  const [mz, setMz] = useCampo("mz", "5");

  const [problema, setProblema] = useCampo("problema", PROBLEMAS[0]);
  const [luz, setLuz] = useCampo("luz", "6");

  const r = useMemo(() => {
    const b = aNumero(ancho);
    const h = aNumero(canto);
    const ly = aNumero(lky);
    const lz = aNumero(lkz);
    const l = aNumero(luz);
    const fmkN = aNumero(fmkV);
    const ft0kN = aNumero(ft0k);
    const fc0kN = aNumero(fc0k);
    const e = aNumero(e005);
    const g = aNumero(g005);
    const n = aNumero(axil);
    const myN = aNumero(my);
    const mzN = aNumero(mz);

    if (![b, h, ly, lz, l, fmkN, ft0kN, fc0kN, e, g].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![n, myN, mzN].every((x) => Number.isFinite(x) && x >= 0)) return null;

    const t = tipoDesdeEtiqueta(tipo);
    const km = kmod(t, servicioDesdeEtiqueta(servicio), duracionDesdeEtiqueta(duracion));
    const gammaM = GAMMA_M[t];

    const fmYd = resistenciaDeCalculo(fmkN, { kmod: km, gammaM, kh: kh(t, h) });
    const fmZd = resistenciaDeCalculo(fmkN, { kmod: km, gammaM, kh: kh(t, b) });
    const ft0d = resistenciaDeCalculo(ft0kN, { kmod: km, gammaM, kh: kh(t, Math.max(b, h)) });
    const fc0d = resistenciaDeCalculo(fc0kN, { kmod: km, gammaM });

    const props = propiedades({ anchoM: b, cantoM: h });

    const ejeY = pandeoEje(ly / props.radioGiroYM, fc0kN, e, t);
    const ejeZ = pandeoEje(lz / props.radioGiroZM, fc0kN, e, t);
    const sinInestabilidad = ejeY.lambdaRel <= 0.3 && ejeZ.lambdaRel <= 0.3;

    const traccionada = signo === SIGNOS[1];
    const sigmaAxil = tensionAxilMPa(n, props.areaM2);
    const sigmaMY = tensionFlexionMPa(myN, props.wyM3);
    const sigmaMZ = tensionFlexionMPa(mzN, props.wzM3);

    // Vuelco, sólo necesario en el modo de la ec. (6.35).
    const esVuelco = !traccionada && problema === PROBLEMAS[1];
    const lef = longitudEficazM(l, "apoyada-distribuida", "comprimido", h);
    const sigmaCrit = tensionCritica({ anchoM: b, cantoM: h }, lef, e, g).simplificadaMPa;
    const lambdaRelM = sigmaCrit > 0 ? Math.sqrt(fmkN / sigmaCrit) : Infinity;
    const factorKcrit = kcrit(lambdaRelM);

    const resultado = verificarFlexionCompuesta({
      sigmaT0dMPa: traccionada ? sigmaAxil : 0,
      sigmaC0dMPa: traccionada ? 0 : sigmaAxil,
      sigmaMYdMPa: sigmaMY,
      sigmaMZdMPa: sigmaMZ,
      ft0dMPa: ft0d.valor,
      fc0dMPa: fc0d.valor,
      fmYdMPa: fmYd.valor,
      fmZdMPa: fmZd.valor,
      km: mzN > 0 ? KM_RECTANGULAR : KM_OTRAS_SECCIONES,
      kcY: ejeY.kc,
      kcZ: ejeZ.kc,
      kcrit: factorKcrit,
      sinInestabilidad,
      verificarVuelco: esVuelco,
    });

    return {
      b, h, t, km, gammaM, props, ejeY, ejeZ, sinInestabilidad, traccionada,
      sigmaAxil, sigmaMY, sigmaMZ, fmYd, fmZd, ft0d, fc0d, resultado,
      esVuelco, lef, sigmaCrit, lambdaRelM, factorKcrit, fc0kN, e,
      ratioAxil: traccionada
        ? sigmaAxil / ft0d.valor
        : sinInestabilidad
          ? sigmaAxil / fc0d.valor
          : sigmaAxil / (Math.min(ejeY.kc, ejeZ.kc) * fc0d.valor),
      ratioFlexion: esVuelco
        ? sigmaMY / (factorKcrit * fmYd.valor)
        : sigmaMY / fmYd.valor,
    };
  }, [ancho, canto, lky, lkz, luz, fmkV, ft0k, fc0k, e005, g005, axil, my, mz,
      tipo, servicio, duracion, signo, problema]);

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
          Cuatro pares de expresiones para lo que parece un solo problema. Cuál se aplica no lo
          elige el proyectista: lo deciden el signo del axil y la esbeltez, y el art. 6.3.2(2) lo
          dice explícito. Acá el despacho es automático, y el modo elegido se declara arriba del
          resultado.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Material y sección</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SelectorMadera
                tipo={tipo} onTipo={setTipo}
                servicio={servicio} onServicio={setServicio}
                duracion={duracion} onDuracion={setDuracion}
              />
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
                <CampoNumerico id="lky" etiqueta="Long. pandeo eje y" sufijo="m" valor={lky} onChange={setLky} />
                <CampoNumerico id="lkz" etiqueta="Long. pandeo eje z" sufijo="m" valor={lkz} onChange={setLkz} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="fmk" etiqueta="fm,k" sufijo="MPa" valor={fmkV} onChange={setFmk} />
                <CampoNumerico id="ft0k" etiqueta="ft,0,k" sufijo="MPa" valor={ft0k} onChange={setFt0k} />
                <CampoNumerico id="fc0k" etiqueta="fc,0,k" sufijo="MPa" valor={fc0k} onChange={setFc0k} />
                <CampoNumerico id="e005" etiqueta="E0,05" sufijo="GPa" valor={e005} onChange={setE005} />
                <CampoNumerico id="g005" etiqueta="G0,05" sufijo="GPa" valor={g005} onChange={setG005} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Esfuerzos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="signo" etiqueta="Signo del axil" valor={signo}
                              opciones={SIGNOS} onChange={setSigno} />
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="axil" etiqueta="Nd" sufijo="kN" valor={axil} onChange={setAxil} />
                <CampoNumerico id="my" etiqueta="My,d" sufijo="kN·m" valor={my} onChange={setMy} />
                <CampoNumerico id="mz" etiqueta="Mz,d" sufijo="kN·m" valor={mz} onChange={setMz} />
              </div>
              {signo === SIGNOS[0] && (
                <>
                  <CampoSeleccion id="problema" etiqueta="Qué gobierna la estabilidad"
                                  valor={problema} opciones={PROBLEMAS} onChange={setProblema} />
                  {problema === PROBLEMAS[1] && (
                    <CampoNumerico id="luz" etiqueta="Luz de la viga" sufijo="m"
                                   valor={luz} onChange={setLuz} />
                  )}
                </>
              )}
              <PanelAyuda titulo="Por qué el axil va al cuadrado en un caso y lineal en el otro">
                <p>
                  En las ecs. <strong className="text-foreground">(6.19) y (6.20)</strong>, que son
                  las de la pieza corta, el término de axil está{" "}
                  <strong className="text-foreground">al cuadrado</strong>. En las{" "}
                  <strong className="text-foreground">(6.23) y (6.24)</strong>, las de la pieza
                  esbelta, es <strong className="text-foreground">lineal</strong>.
                </p>
                <p>
                  No es un descuido de la norma. En la pieza corta el axil casi no interactúa con
                  la flexión y la parábola lo refleja. En la esbelta, el axil amplifica la flecha y
                  con ella el momento, así que penaliza en proporción directa. Usar el cuadrado en
                  una pieza esbelta deja la verificación del lado inseguro, y por eso el modo se
                  despacha por esbeltez y no se puede elegir a mano.
                </p>
                <p>
                  El umbral es λrel ≤ 0,3 <em>en los dos ejes</em>, art. 6.3.2(2). Basta que uno
                  lo supere para ir por el 6.3.2.
                </p>
                <p>
                  La <strong className="text-foreground">ec. (6.35)</strong> es otra cosa: es la
                  viga comprimida cuyo problema es volcar de costado, no pandear como columna. Ahí
                  se invierten los exponentes —la flexión al cuadrado y el axil lineal—.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá sección, resistencias, longitudes de pandeo y esfuerzos con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="rounded-md border border-border bg-card/60 px-3 py-2 font-mono text-[12.5px]">
                    {NOMBRE_MODO[r.resultado.modo]}
                  </p>
                  <ResultadoCheck
                    etiqueta={`Interacción · gobierna la ${r.resultado.gobierna}`}
                    verifica={r.resultado.verifica}
                    comparacion={{
                      real: { etiqueta: "aprovechamiento", valor: r.resultado.aprovechamiento },
                      limite: { etiqueta: "límite", valor: 1 },
                      exige: "≤",
                      decimales: 3,
                    }}
                  />
                  {r.sinInestabilidad && !r.traccionada && (
                    <p className="text-xs text-muted-foreground">
                      λrel,y = {fmt(r.ejeY.lambdaRel, 3)} y λrel,z = {fmt(r.ejeZ.lambdaRel, 3)}, los
                      dos por debajo de 0,3: el art. 6.3.2(2) manda verificar por el 6.2.4 y no
                      reducir por pandeo.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Interacción</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <DiagramaInteraccionMadera
                    modo={r.resultado.modo}
                    ratioAxil={r.ratioAxil}
                    ratioFlexion={r.ratioFlexion}
                    aprovechamiento={r.resultado.aprovechamiento}
                    verifica={r.resultado.verifica}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "σ del axil", valor: `${fmt(r.sigmaAxil, 3)} MPa` },
                      { etiqueta: "σm,y,d", valor: `${fmt(r.sigmaMY, 3)} MPa` },
                      { etiqueta: "σm,z,d", valor: `${fmt(r.sigmaMZ, 3)} MPa` },
                      { etiqueta: r.traccionada ? "ft,0,d" : "fc,0,d",
                        valor: `${fmt(r.traccionada ? r.ft0d.valor : r.fc0d.valor, 3)} MPa` },
                      { etiqueta: "fm,y,d", valor: `${fmt(r.fmYd.valor, 3)} MPa` },
                      { etiqueta: "fm,z,d", valor: `${fmt(r.fmZd.valor, 3)} MPa` },
                      { etiqueta: "kc,y", valor: fmt(r.ejeY.kc, 3) },
                      { etiqueta: "kc,z", valor: fmt(r.ejeZ.kc, 3) },
                      ...(r.esVuelco
                        ? [
                            { etiqueta: "lef del vuelco", valor: `${fmt(r.lef, 2)} m` },
                            { etiqueta: "λrel,m", valor: fmt(r.lambdaRelM, 3) },
                            { etiqueta: "kcrit", valor: fmt(r.factorKcrit, 3) },
                          ]
                        : []),
                      { etiqueta: "Primera expresión", valor: fmt(r.resultado.expresionA, 4) },
                      ...(Number.isNaN(r.resultado.expresionB)
                        ? []
                        : [{ etiqueta: "Segunda expresión", valor: fmt(r.resultado.expresionB, 4) }]),
                    ]}
                  />
                </CardContent>
              </Card>

              {!r.traccionada && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Pandeo de la columna</CardTitle></CardHeader>
                  <CardContent>
                    <CurvaPandeoMadera
                      tipo={r.t}
                      fc0kMPa={r.fc0kN}
                      e005GPa={r.e}
                      lambdaRelY={r.ejeY.lambdaRel}
                      lambdaRelZ={r.ejeZ.lambdaRel}
                      kcY={r.ejeY.kc}
                      kcZ={r.ejeZ.kc}
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
