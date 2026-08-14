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
import { CroquisApoyoMadera } from "@/components/verificaciones/madera/CroquisApoyoMadera";
import { CurvaPandeoMadera } from "@/components/verificaciones/madera/CurvaPandeoMadera";
import {
  SelectorMadera,
  duracionDesdeEtiqueta,
  servicioDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import {
  kc90,
  verificarCompresion,
  verificarCompresionPerpendicular,
  verificarTraccion,
  type TipoApoyo,
} from "@/lib/calc/ec5/axil";
import { GAMMA_M, KSYS_COMPARTIDA, kh, kmod, resistenciaDeCalculo } from "@/lib/calc/ec5/materiales";
import { propiedades } from "@/lib/calc/ec5/seccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-axil")!;

const APOYOS = ["Apoyo continuo", "Apoyos aislados"] as const;
const apoyoDesde = (e: string): TipoApoyo => (e === APOYOS[0] ? "continuo" : "aislado");
const ESPECIES = ["Conífera", "Frondosa"] as const;
const REPARTO = ["No compartida", "Compartida (ksys = 1,1)"] as const;

export default function MaderaAxilPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Madera maciza");
  const [servicio, setServicio] = useCampo("servicio", "Clase 2");
  const [duracion, setDuracion] = useCampo("duracion", "Media (1 semana a 6 meses)");
  const [especie, setEspecie] = useCampo("especie", ESPECIES[0]);
  const [reparto, setReparto] = useCampo("reparto", REPARTO[0]);

  const [ancho, setAncho] = useCampo("ancho", "0.1");
  const [canto, setCanto] = useCampo("canto", "0.2");

  const [ft0k, setFt0k] = useCampo("ft0k", "14");
  const [fc0k, setFc0k] = useCampo("fc0k", "21");
  const [fc90k, setFc90k] = useCampo("fc90k", "2.5");
  const [e005, setE005] = useCampo("e005", "7.4");

  const [traccion, setTraccion] = useCampo("traccion", "0");
  const [compresion, setCompresion] = useCampo("compresion", "40");
  const [lky, setLky] = useCampo("lky", "3");
  const [lkz, setLkz] = useCampo("lkz", "3");

  const [cargaApoyo, setCargaApoyo] = useCampo("cargaApoyo", "20");
  const [anchoApoyo, setAnchoApoyo] = useCampo("anchoApoyo", "0.1");
  const [largoApoyo, setLargoApoyo] = useCampo("largoApoyo", "0.12");
  const [vuelo, setVuelo] = useCampo("vuelo", "0.05");
  const [vecina, setVecina] = useCampo("vecina", "1.2");
  const [apoyo, setApoyo] = useCampo("apoyo", APOYOS[1]);

  const r = useMemo(() => {
    const b = aNumero(ancho);
    const h = aNumero(canto);
    const ft0kV = aNumero(ft0k);
    const fc0kV = aNumero(fc0k);
    const fc90kV = aNumero(fc90k);
    const e = aNumero(e005);
    const nt = aNumero(traccion);
    const nc = aNumero(compresion);
    const ly = aNumero(lky);
    const lz = aNumero(lkz);

    if (![b, h, ft0kV, fc0kV, fc90kV, e, ly, lz].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![nt, nc].every((x) => Number.isFinite(x) && x >= 0)) return null;

    const t = tipoDesdeEtiqueta(tipo);
    const km = kmod(t, servicioDesdeEtiqueta(servicio), duracionDesdeEtiqueta(duracion));
    const gammaM = GAMMA_M[t];
    const ksys = reparto === REPARTO[1] ? KSYS_COMPARTIDA : 1;

    /*
     * En tracción el "h" de kh es la anchura de la pieza —la dimensión mayor de
     * la sección, arts. 3.2(3) y 3.3(3)—, no el canto de flexión. Compresión no
     * lleva kh: los factores de tamaño sólo suben fm,k y ft,0,k.
     */
    const khT = kh(t, Math.max(b, h));
    const ft0d = resistenciaDeCalculo(ft0kV, { kmod: km, gammaM, kh: khT, ksys });
    const fc0d = resistenciaDeCalculo(fc0kV, { kmod: km, gammaM, ksys });
    const fc90d = resistenciaDeCalculo(fc90kV, { kmod: km, gammaM });

    const props = propiedades({ anchoM: b, cantoM: h });

    const rTraccion = nt > 0 ? verificarTraccion(nt, props.areaM2, ft0d.valor) : null;

    const rCompresion =
      nc > 0
        ? verificarCompresion({
            axilKN: nc,
            areaM2: props.areaM2,
            radioGiroYM: props.radioGiroYM,
            radioGiroZM: props.radioGiroZM,
            longitudPandeoYM: ly,
            longitudPandeoZM: lz,
            fc0kMPa: fc0kV,
            fc0dMPa: fc0d.valor,
            e005GPa: e,
            tipo: t,
          })
        : null;

    const cargaAp = aNumero(cargaApoyo);
    const ba = aNumero(anchoApoyo);
    const la = aNumero(largoApoyo);
    const a = aNumero(vuelo);
    const l1 = aNumero(vecina);
    const apoyoValido =
      [cargaAp, ba, la, a, l1].every((x) => Number.isFinite(x) && x >= 0) && ba > 0 && la > 0 && cargaAp > 0;

    const factorKc90 = apoyoValido
      ? kc90({
          tipo: t,
          conifera: especie === ESPECIES[0],
          apoyo: apoyoDesde(apoyo),
          longitudContactoM: la,
          distanciaVecinaM: l1,
          cantoM: h,
        })
      : null;

    const rPerpendicular =
      apoyoValido && factorKc90
        ? verificarCompresionPerpendicular({
            cargaKN: cargaAp,
            anchoApoyoM: ba,
            longitudContactoM: la,
            vueloM: a,
            distanciaVecinaM: l1,
            fc90dMPa: fc90d.valor,
            kc90: factorKc90.kc90,
          })
        : null;

    return {
      b, h, t, km, gammaM, ksys, khT, ft0d, fc0d, fc90d, props,
      rTraccion, rCompresion, factorKc90, rPerpendicular, apoyoValido,
      fc0kV, e, la, a,
    };
  }, [ancho, canto, ft0k, fc0k, fc90k, e005, traccion, compresion, lky, lkz,
      tipo, servicio, duracion, especie, reparto,
      cargaApoyo, anchoApoyo, largoApoyo, vuelo, vecina, apoyo]);

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
          La madera es el material donde más se separan las dos compresiones: fc,90,k anda por 2,5
          MPa contra 21 de fc,0,k, un factor diez. Por eso el apoyo de una viga —que trabaja
          perpendicular a la fibra— decide el canto tan a menudo como la flexión, y por eso el art.
          6.1.5 se toma el trabajo de definir un área eficaz mayor que la de contacto.
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
                <CampoSeleccion id="especie" etiqueta="Especie" valor={especie}
                                opciones={ESPECIES} onChange={setEspecie} />
                <CampoSeleccion id="reparto" etiqueta="Reparto de carga" valor={reparto}
                                opciones={REPARTO} onChange={setReparto} />
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="ft0k" etiqueta="ft,0,k" sufijo="MPa" valor={ft0k} onChange={setFt0k} />
                <CampoNumerico id="fc0k" etiqueta="fc,0,k" sufijo="MPa" valor={fc0k} onChange={setFc0k} />
                <CampoNumerico id="fc90k" etiqueta="fc,90,k" sufijo="MPa" valor={fc90k} onChange={setFc90k} />
                <CampoNumerico id="e005" etiqueta="E0,05" sufijo="GPa" valor={e005} onChange={setE005} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Axil paralelo a la fibra</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="traccion" etiqueta="Nt,d (tracción)" sufijo="kN"
                               valor={traccion} onChange={setTraccion} />
                <CampoNumerico id="compresion" etiqueta="Nc,d (compresión)" sufijo="kN"
                               valor={compresion} onChange={setCompresion} />
                <CampoNumerico id="lky" etiqueta="Long. pandeo eje y" sufijo="m" valor={lky} onChange={setLky} />
                <CampoNumerico id="lkz" etiqueta="Long. pandeo eje z" sufijo="m" valor={lkz} onChange={setLkz} />
              </div>
              <PanelAyuda titulo="Qué decide el pandeo y por qué kh no entra en compresión">
                <p>
                  Manda el eje de <strong className="text-foreground">menor kc</strong>, que no es
                  necesariamente el de mayor longitud de pandeo: λ = lk/i y el radio de giro del
                  eje débil es mucho menor. Con longitudes de pandeo iguales, el débil gobierna
                  siempre.
                </p>
                <p>
                  Por debajo de λrel = 0,3 la norma no reduce nada, art. 6.3.2(2), y manda
                  verificar por el 6.2.4. El umbral aparece marcado en la curva.
                </p>
                <p>
                  <strong className="text-foreground">kh no se aplica a compresión.</strong> Los
                  arts. 3.2(3) y 3.3(3) sólo autorizan a subir fm,k y ft,0,k por efecto de tamaño.
                  Extenderlo a fc,0,k sería inventar resistencia.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Apoyo: compresión perpendicular</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="cargaApoyo" etiqueta="Fc,90,d" sufijo="kN"
                               valor={cargaApoyo} onChange={setCargaApoyo} />
                <CampoSeleccion id="apoyo" etiqueta="Tipo de apoyo" valor={apoyo}
                                opciones={APOYOS} onChange={setApoyo} />
                <CampoNumerico id="anchoApoyo" etiqueta="Anchura del apoyo" sufijo="m"
                               valor={anchoApoyo} onChange={setAnchoApoyo} />
                <CampoNumerico id="largoApoyo" etiqueta="Longitud de contacto ℓ" sufijo="m"
                               valor={largoApoyo} onChange={setLargoApoyo} />
                <CampoNumerico id="vuelo" etiqueta="Vuelo a" sufijo="m" valor={vuelo} onChange={setVuelo} />
                <CampoNumerico id="vecina" etiqueta="Distancia ℓ1" sufijo="m" valor={vecina} onChange={setVecina} />
              </div>
              <PanelAyuda titulo="Qué son a y ℓ1, y de dónde sale kc,90">
                <p>
                  <strong className="text-foreground">a</strong> es el vuelo: del extremo de la
                  pieza al arranque del apoyo. Acota cuánto puede ensanchar el área eficaz por ese
                  lado, porque más allá del extremo no hay madera que difunda la carga.
                </p>
                <p>
                  <strong className="text-foreground">ℓ1</strong> es la distancia al apoyo o a la
                  carga vecina. Hace dos cosas: acota el ensanchamiento interior en ℓ1/2, y
                  condiciona kc,90, que sólo pasa de 1 si ℓ1 ≥ 2h.
                </p>
                <p>
                  <strong className="text-foreground">kc,90</strong> no es un dato: sale del
                  articulado según apoyo, material y especie, y sólo está tabulado para coníferas.
                  Va de 1,0 a 1,75 y acá se calcula, diciendo el motivo del valor que salió.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá sección, resistencias y longitudes de pandeo con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {r.rTraccion && (
                    <ResultadoCheck
                      etiqueta="Tracción paralela, ec. (6.1)"
                      verifica={r.rTraccion.verifica}
                      comparacion={{
                        real: { etiqueta: "σt,0,d", valor: r.rTraccion.sigmaT0dMPa },
                        limite: { etiqueta: "ft,0,d", valor: r.rTraccion.ft0dMPa },
                        unidad: "MPa", exige: "≤", decimales: 3,
                      }}
                    />
                  )}
                  {r.rCompresion && (
                    <ResultadoCheck
                      etiqueta={r.rCompresion.sinInestabilidad
                        ? "Compresión paralela, ec. (6.2) · pieza corta"
                        : "Compresión con pandeo, art. 6.3.2"}
                      verifica={r.rCompresion.verifica}
                      comparacion={{
                        real: { etiqueta: "σc,0,d", valor: r.rCompresion.sigmaC0dMPa },
                        limite: { etiqueta: "kc·fc,0,d", valor: r.rCompresion.resistenciaReducidaMPa },
                        unidad: "MPa", exige: "≤", decimales: 3,
                      }}
                    />
                  )}
                  {r.rPerpendicular && (
                    <ResultadoCheck
                      etiqueta="Compresión perpendicular, ec. (6.3)"
                      verifica={r.rPerpendicular.verifica}
                      comparacion={{
                        real: { etiqueta: "σc,90,d", valor: r.rPerpendicular.sigmaC90dMPa },
                        limite: { etiqueta: "kc,90·fc,90,d", valor: r.rPerpendicular.resistenciaReducidaMPa },
                        unidad: "MPa", exige: "≤", decimales: 3,
                      }}
                    />
                  )}
                  {r.factorKc90 && (
                    <p className="text-xs text-muted-foreground">
                      kc,90 = {fmt(r.factorKc90.kc90, 2)}. {r.factorKc90.motivo}
                    </p>
                  )}
                </CardContent>
              </Card>

              {r.rCompresion && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Pandeo</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <CurvaPandeoMadera
                      tipo={r.t}
                      fc0kMPa={r.fc0kV}
                      e005GPa={r.e}
                      lambdaRelY={r.rCompresion.ejeY.lambdaRel}
                      lambdaRelZ={r.rCompresion.ejeZ.lambdaRel}
                      kcY={r.rCompresion.ejeY.kc}
                      kcZ={r.rCompresion.ejeZ.kc}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo del pandeo"
                      filas={[
                        { etiqueta: "iy = √(Iy/A)", valor: `${fmt(r.props.radioGiroYM, 4)} m` },
                        { etiqueta: "iz = √(Iz/A)", valor: `${fmt(r.props.radioGiroZM, 4)} m` },
                        { etiqueta: "λy", valor: fmt(r.rCompresion.ejeY.lambda, 2) },
                        { etiqueta: "λz", valor: fmt(r.rCompresion.ejeZ.lambda, 2) },
                        { etiqueta: "λrel,y  (6.21)", valor: fmt(r.rCompresion.ejeY.lambdaRel, 3) },
                        { etiqueta: "λrel,z  (6.22)", valor: fmt(r.rCompresion.ejeZ.lambdaRel, 3) },
                        { etiqueta: "kc,y  (6.25)", valor: fmt(r.rCompresion.ejeY.kc, 3) },
                        { etiqueta: "kc,z  (6.26)", valor: fmt(r.rCompresion.ejeZ.kc, 3) },
                        { etiqueta: "kc adoptado (el menor)", valor: fmt(r.rCompresion.kc, 3) },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              {r.rPerpendicular && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Área eficaz de apoyo</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <CroquisApoyoMadera
                      longitudContactoM={r.la}
                      incrementoExtremoM={r.rPerpendicular.incrementoExtremoM}
                      incrementoInteriorM={r.rPerpendicular.incrementoInteriorM}
                      vueloM={r.a}
                      cantoM={r.h}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo del apoyo"
                      filas={[
                        { etiqueta: "Ensanche del extremo", valor: `${fmt(r.rPerpendicular.incrementoExtremoM * 1000, 0)} mm` },
                        { etiqueta: "Ensanche interior", valor: `${fmt(r.rPerpendicular.incrementoInteriorM * 1000, 0)} mm` },
                        { etiqueta: "ℓef", valor: `${fmt(r.rPerpendicular.longitudEficazM, 3)} m` },
                        { etiqueta: "Aef  (art. 6.1.5)", valor: `${fmt(r.rPerpendicular.areaEficazM2 * 1e4, 1)} cm²` },
                        { etiqueta: "σc,90,d = Fc,90,d/Aef  (6.4)", valor: `${fmt(r.rPerpendicular.sigmaC90dMPa, 3)} MPa` },
                        { etiqueta: "kc,90·fc,90,d", valor: `${fmt(r.rPerpendicular.resistenciaReducidaMPa, 3)} MPa` },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Resistencias de cálculo</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver desarrollo"
                    filas={[
                      { etiqueta: "kmod (tabla 3.1)", valor: fmt(r.km, 2) },
                      { etiqueta: "γM (tabla 2.3)", valor: fmt(r.gammaM, 2) },
                      { etiqueta: "kh de tracción (dimensión mayor)", valor: fmt(r.khT, 3) },
                      { etiqueta: "ksys", valor: fmt(r.ksys, 2) },
                      { etiqueta: "A", valor: `${fmt(r.props.areaM2 * 1e4, 0)} cm²` },
                      { etiqueta: "ft,0,d", valor: `${fmt(r.ft0d.valor, 3)} MPa` },
                      { etiqueta: "fc,0,d", valor: `${fmt(r.fc0d.valor, 3)} MPa` },
                      { etiqueta: "fc,90,d", valor: `${fmt(r.fc90d.valor, 3)} MPa` },
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
