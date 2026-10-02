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
import { CroquisSeccionMadera } from "@/components/verificaciones/madera/CroquisSeccionMadera";
import { CurvaPandeoMadera } from "@/components/verificaciones/madera/CurvaPandeoMadera";
import { DiagramaInteraccionMadera } from "@/components/verificaciones/madera/DiagramaInteraccionMadera";
import {
  SelectorMadera,
  duracionDesdeEtiqueta,
  servicioDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import { pandeoEje } from "@/lib/calc/madera/axil";
import { NOMBRE_MODO, verificarFlexionCompuesta } from "@/lib/calc/madera/flexion-compuesta";
import { kcrit, longitudEficazM, tensionCritica } from "@/lib/calc/madera/flexion";
import {
  GAMMA_M, KM_OTRAS_SECCIONES, KM_RECTANGULAR, kh, kmod, resistenciaDeCalculo,
} from "@/lib/calc/madera/materiales";
import { propiedades, tensionAxilMPa, tensionFlexionMPa } from "@/lib/calc/madera/seccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-flexion-compuesta")!;

const ETAPAS = [
  { id: "material", titulo: "Material" },
  { id: "seccion", titulo: "Sección" },
  { id: "esfuerzos", titulo: "Esfuerzos" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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

  const avisos: AvisoRevision[] = [];
  if (!r) avisos.push({ tipo: "error", texto: "Cargá sección, resistencias, longitudes de pandeo y esfuerzos con valores válidos." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Piezas rectas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="material" numero={1} titulo="Material" descripcion="Tipo de madera, condiciones de servicio y valores característicos.">
          <div className="max-w-2xl space-y-4">
            <SelectorMadera
              tipo={tipo} onTipo={setTipo}
              servicio={servicio} onServicio={setServicio}
              duracion={duracion} onDuracion={setDuracion}
            />
            <div className="grid grid-cols-3 gap-4">
              <CampoNumerico id="fmk" etiqueta="fm,k" sufijo="MPa" valor={fmkV} onChange={setFmk} />
              <CampoNumerico id="ft0k" etiqueta="ft,0,k" sufijo="MPa" valor={ft0k} onChange={setFt0k} />
              <CampoNumerico id="fc0k" etiqueta="fc,0,k" sufijo="MPa" valor={fc0k} onChange={setFc0k} />
              <CampoNumerico id="e005" etiqueta="E0,05" sufijo="GPa" valor={e005} onChange={setE005} />
              <CampoNumerico id="g005" etiqueta="G0,05" sufijo="GPa" valor={g005} onChange={setG005} />
            </div>
          </div>
        </Etapa>

        <Etapa id="seccion" numero={2} titulo="Sección y pandeo" descripcion="Dimensiones y longitudes de pandeo de cada eje.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
                <CampoNumerico id="lky" etiqueta="Long. pandeo eje y" sufijo="m" valor={lky} onChange={setLky} />
                <CampoNumerico id="lkz" etiqueta="Long. pandeo eje z" sufijo="m" valor={lkz} onChange={setLkz} />
              </div>
            }
            dibujo={<CroquisSeccionMadera anchoM={aNumero(ancho)} cantoM={aNumero(canto)} />}
          />
        </Etapa>

        <Etapa id="esfuerzos" numero={3} titulo="Esfuerzos" descripcion="El signo del axil y la esbeltez deciden qué par de expresiones se aplica.">
          <div className="max-w-2xl space-y-4">
            <CampoSeleccion id="signo" etiqueta="Signo del axil" valor={signo} opciones={SIGNOS} onChange={setSigno} />
            <div className="grid grid-cols-3 gap-4">
              <CampoNumerico id="axil" etiqueta="Nd" sufijo="kN" valor={axil} onChange={setAxil} />
              <CampoNumerico id="my" etiqueta="My,d" sufijo="kN·m" valor={my} onChange={setMy} />
              <CampoNumerico id="mz" etiqueta="Mz,d" sufijo="kN·m" valor={mz} onChange={setMz} />
            </div>
            {signo === SIGNOS[0] && (
              <>
                <CampoSeleccion id="problema" etiqueta="Qué gobierna la estabilidad" valor={problema} opciones={PROBLEMAS} onChange={setProblema} />
                {problema === PROBLEMAS[1] && (
                  <CampoNumerico id="luz" etiqueta="Luz de la viga" sufijo="m" valor={luz} onChange={setLuz} />
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
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Madera", valor: `${tipo} · ${servicio}` },
              { etiqueta: "Duración de la carga", valor: duracion },
              { etiqueta: "fm,k · ft,0,k · fc,0,k", valor: `${fmkV} · ${ft0k} · ${fc0k} MPa` },
              { etiqueta: "E0,05 · G0,05", valor: `${e005} · ${g005} GPa` },
              { etiqueta: "Sección b × h", valor: `${ancho} × ${canto} m` },
              { etiqueta: "lk,y · lk,z", valor: `${lky} · ${lkz} m` },
              { etiqueta: "Nd · My,d · Mz,d", valor: `${axil} kN (${signo.toLowerCase()}) · ${my} · ${mz} kN·m` },
              ...(r ? [{ etiqueta: "Modo", valor: NOMBRE_MODO[r.resultado.modo], derivado: true }] : []),
            ]}
            hipotesis={[
              "EC5, arts. 6.2.3 y 6.2.4 (pieza corta), 6.3.2 (pandeo) y 6.3.3, ec. (6.35) (vuelco con compresión).",
              "El modo lo deciden el signo del axil y la esbeltez: con λrel ≤ 0,3 en los dos ejes no hay reducción por pandeo (art. 6.3.2(2)).",
              "kh por eje en flexión y con la dimensión mayor en tracción; la compresión no lleva kh.",
              "km = 0,7 cuando hay flexión en los dos ejes.",
              "Vuelco: longitud eficaz de viga apoyada con carga distribuida aplicada en el borde comprimido.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
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
                  { etiqueta: "σ axil", valor: `${fmt(r.sigmaAxil, 2)} MPa`, nota: r.traccionada ? "tracción" : "compresión" },
                  { etiqueta: "σm,y,d · σm,z,d", valor: `${fmt(r.sigmaMY, 2)} · ${fmt(r.sigmaMZ, 2)} MPa` },
                  { etiqueta: "λrel,y · λrel,z", valor: `${fmt(r.ejeY.lambdaRel, 2)} · ${fmt(r.ejeZ.lambdaRel, 2)}` },
                  { etiqueta: "Aprovechamiento", valor: fmt(r.resultado.aprovechamiento, 3), nota: `gobierna la ${r.resultado.gobierna}` },
                ]}
              />

              <Subgrupo titulo="Interacción axil-flexión" detalle={NOMBRE_MODO[r.resultado.modo]}>
                <div className="space-y-3">
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
                  <DiagramaInteraccionMadera
                    modo={r.resultado.modo}
                    ratioAxil={r.ratioAxil}
                    ratioFlexion={r.ratioFlexion}
                    aprovechamiento={r.resultado.aprovechamiento}
                    verifica={r.resultado.verifica}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de la interacción"
                    filas={[
                      { etiqueta: "σ del axil", valor: `${fmt(r.sigmaAxil, 3)} MPa` },
                      { etiqueta: "σm,y,d", valor: `${fmt(r.sigmaMY, 3)} MPa` },
                      { etiqueta: "σm,z,d", valor: `${fmt(r.sigmaMZ, 3)} MPa` },
                      { etiqueta: r.traccionada ? "ft,0,d" : "fc,0,d", valor: `${fmt(r.traccionada ? r.ft0d.valor : r.fc0d.valor, 3)} MPa` },
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
                </div>
              </Subgrupo>

              {!r.traccionada && (
                <Subgrupo titulo="Pandeo de la columna">
                  <CurvaPandeoMadera
                    tipo={r.t}
                    fc0kMPa={r.fc0kN}
                    e005GPa={r.e}
                    lambdaRelY={r.ejeY.lambdaRel}
                    lambdaRelZ={r.ejeZ.lambdaRel}
                    kcY={r.ejeY.kc}
                    kcZ={r.ejeZ.kc}
                  />
                </Subgrupo>
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
