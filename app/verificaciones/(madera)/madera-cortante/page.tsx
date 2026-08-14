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
import { CroquisEntalladura } from "@/components/verificaciones/madera/CroquisEntalladura";
import { CroquisSeccionMadera } from "@/components/verificaciones/madera/CroquisSeccionMadera";
import {
  SelectorMadera,
  duracionDesdeEtiqueta,
  servicioDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import {
  KN,
  verificarCortante,
  verificarEntalladura,
  verificarTorsion,
  type LadoEntalladura,
} from "@/lib/calc/madera/cortante";
import { GAMMA_M, KCR, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-cortante")!;

const LADOS = ["Mismo lado que el apoyo", "Lado opuesto al apoyo"] as const;
const ladoDesde = (e: string): LadoEntalladura =>
  e === LADOS[1] ? "lado-opuesto" : "mismo-lado";

const HAY_ENTALLADURA = ["Sin entalladura", "Con entalladura en el apoyo"] as const;
const FORMAS = ["Rectangular", "Circular"] as const;

export default function MaderaCortantePage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Laminada encolada (MLE)");
  const [servicio, setServicio] = useCampo("servicio", "Clase 1");
  const [duracion, setDuracion] = useCampo("duracion", "Corta (menos de una semana)");
  const [fvk, setFvk] = useCampo("fvk", "3.5");

  const [ancho, setAncho] = useCampo("ancho", "0.19");
  const [canto, setCanto] = useCampo("canto", "1");
  const [vd, setVd] = useCampo("vd", "70");

  const [conEntalladura, setConEntalladura] = useCampo("conEntalladura", HAY_ENTALLADURA[1]);
  const [hef, setHef] = useCampo("hef", "0.65");
  const [proyeccion, setProyeccion] = useCampo("proyeccion", "1.6");
  const [xApoyo, setXApoyo] = useCampo("xApoyo", "0.25");
  const [lado, setLado] = useCampo("lado", LADOS[0]);

  const [torsor, setTorsor] = useCampo("torsor", "0");
  const [forma, setForma] = useCampo("forma", FORMAS[0]);

  const r = useMemo(() => {
    const b = aNumero(ancho);
    const h = aNumero(canto);
    const v = aNumero(vd);
    const fvkV = aNumero(fvk);
    const t = aNumero(torsor);

    if (![b, h, fvkV].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![v, t].every((x) => Number.isFinite(x) && x >= 0)) return null;

    const tipoM = tipoDesdeEtiqueta(tipo);
    const km = kmod(tipoM, servicioDesdeEtiqueta(servicio), duracionDesdeEtiqueta(duracion));
    const gammaM = GAMMA_M[tipoM];
    const kcr = KCR[tipoM];

    // El cortante no lleva kh ni ksys: los factores de tamaño sólo afectan a
    // fm,k y ft,0,k, arts. 3.2(3) y 3.3(3).
    const fvd = resistenciaDeCalculo(fvkV, { kmod: km, gammaM });

    const cortante = verificarCortante(v, b, h, kcr, fvd.valor);

    const hay = conEntalladura === HAY_ENTALLADURA[1];
    const hefV = aNumero(hef);
    const proy = aNumero(proyeccion);
    const xV = aNumero(xApoyo);
    const entalladuraValida =
      hay && [hefV, proy, xV].every((x) => Number.isFinite(x) && x >= 0) && hefV > 0 && hefV <= h;

    const entalladura = entalladuraValida
      ? verificarEntalladura({
          tipo: tipoM,
          cortanteKN: v,
          anchoM: b,
          cantoM: h,
          cantoEficazM: hefV,
          proyeccionM: proy,
          distanciaApoyoM: xV,
          lado: ladoDesde(lado),
          kcr,
          fvdMPa: fvd.valor,
        })
      : null;

    const torsion =
      t > 0
        ? verificarTorsion({
            torsorKNm: t,
            anchoM: b,
            cantoM: h,
            forma: forma === FORMAS[1] ? "circular" : "rectangular",
            fvdMPa: fvd.valor,
          })
        : null;

    return {
      b, h, v, tipoM, km, gammaM, kcr, fvd, cortante,
      entalladura, entalladuraValida, hay,
      hefV, proy, xV, torsion,
    };
  }, [ancho, canto, vd, fvk, torsor, tipo, servicio, duracion, conEntalladura,
      hef, proyeccion, xApoyo, lado, forma]);

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
          Las tres comprobaciones comparten resistencia —fv,d— porque la madera falla a rasante por
          el mismo plano de fibra, venga el esfuerzo de un cortante, de la concentración de una
          entalladura o de un torsor. Lo que cambia entre ellas es el factor que multiplica a fv,d:
          kv la castiga, kshape la premia.
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
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="fvk" etiqueta="fv,k" sufijo="MPa" valor={fvk} onChange={setFvk} />
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
              </div>
              <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
              <PanelAyuda titulo="Por qué el ancho se reduce a bef">
                <p>
                  El art. 6.1.7(2) manda verificar el cortante con una anchura eficaz
                  bef = kcr·b, y el valor recomendado de kcr es{" "}
                  <strong className="text-foreground">0,67 tanto en maciza como en laminada</strong>.
                  No es un coeficiente de seguridad más: representa que las fendas de secado
                  desconectan parte del ancho, y la madera trabaja a rasante sólo con lo que queda.
                </p>
                <p>
                  Es el coeficiente que más silenciosamente cambia un resultado. Ponerlo en 1,0
                  —como hace la planilla original en la comprobación normal— sobrestima la
                  resistencia a cortante un 49 %.
                </p>
                <p>
                  El cortante no lleva kh ni ksys: los factores de tamaño de los arts. 3.2(3) y
                  3.3(3) sólo suben fm,k y ft,0,k.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Entalladura en el apoyo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="conEntalladura" etiqueta="¿La viga está entallada?"
                              valor={conEntalladura} opciones={HAY_ENTALLADURA}
                              onChange={setConEntalladura} />
              {conEntalladura === HAY_ENTALLADURA[1] && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="hef" etiqueta="hef" sufijo="m" valor={hef} onChange={setHef} />
                    <CampoNumerico id="proyeccion" etiqueta="Proyección" sufijo="m"
                                   valor={proyeccion} onChange={setProyeccion} />
                    <CampoNumerico id="xApoyo" etiqueta="x" sufijo="m" valor={xApoyo} onChange={setXApoyo} />
                  </div>
                  <CampoSeleccion id="lado" etiqueta="Lado de la entalladura"
                                  valor={lado} opciones={LADOS} onChange={setLado} />
                  <PanelAyuda titulo="Qué mide cada cota y por qué kv se desploma">
                    <p>
                      <strong className="text-foreground">Proyección.</strong> El avance horizontal
                      del chaflán. Entra en la ec. (6.62) como inclinación i = proyección/(h − hef),
                      y con el término 1,1·i<sup>1,5</sup>. Es lo único que salva a la entalladura:
                      cortada a escuadra kv se va por debajo de 0,3, y achaflanada puede duplicarse.
                    </p>
                    <p>
                      <strong className="text-foreground">x.</strong> Se mide desde el{" "}
                      <em>eje de la reacción</em> hasta el arranque de la entalladura, no desde el
                      borde de la viga. Cuanto más lejos del apoyo, peor: el brazo de la fisura
                      crece.
                    </p>
                    <p>
                      <strong className="text-foreground">Lado.</strong> Del lado opuesto al apoyo
                      kv = 1 por la ec. (6.61): no se corta la fibra traccionada y no hay
                      concentración. Cuando el proyecto lo permite, es la solución.
                    </p>
                    <p>
                      kn vale {KN.maciza} en maciza, {KN.MLE} en laminada y {KN.LVL} en
                      microlaminada, ec. (6.63).
                    </p>
                  </PanelAyuda>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Torsión</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="torsor" etiqueta="Td" sufijo="kN·m" valor={torsor} onChange={setTorsor} />
                <CampoSeleccion id="forma" etiqueta="Forma de la sección"
                                valor={forma} opciones={FORMAS} onChange={setForma} />
              </div>
              <p className="text-xs text-muted-foreground">
                Dejalo en cero si la pieza no tiene torsor. El coeficiente α1 de la tensión de
                torsión se interpola de la tabla clásica en vez de leerse a mano.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá sección, resistencia y esfuerzos con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Cortante, ec. (6.13)"
                    verifica={r.cortante.verifica}
                    comparacion={{
                      real: { etiqueta: "τd", valor: r.cortante.tauDMPa },
                      limite: { etiqueta: "fv,d", valor: r.cortante.fvdMPa },
                      unidad: "MPa",
                      exige: "≤",
                      decimales: 3,
                    }}
                  />
                  {r.entalladura && (
                    <ResultadoCheck
                      etiqueta="Entalladura en el apoyo, ec. (6.60)"
                      verifica={r.entalladura.verifica}
                      comparacion={{
                        real: { etiqueta: "τd", valor: r.entalladura.tauDMPa },
                        limite: { etiqueta: "kv·fv,d", valor: r.entalladura.resistenciaReducidaMPa },
                        unidad: "MPa",
                        exige: "≤",
                        decimales: 3,
                      }}
                    />
                  )}
                  {r.torsion && (
                    <ResultadoCheck
                      etiqueta="Torsión, ec. (6.14)"
                      verifica={r.torsion.verifica}
                      comparacion={{
                        real: { etiqueta: "τtor,d", valor: r.torsion.tauTorDMPa },
                        limite: { etiqueta: "kshape·fv,d", valor: r.torsion.resistenciaReducidaMPa },
                        unidad: "MPa",
                        exige: "≤",
                        decimales: 3,
                      }}
                    />
                  )}
                  {r.hay && !r.entalladuraValida && (
                    <p className="text-xs text-destructive">
                      El canto eficaz tiene que ser mayor que cero y no puede superar el canto total.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Anchura eficaz</CardTitle></CardHeader>
                <CardContent>
                  <CroquisSeccionMadera anchoM={r.b} cantoM={r.h}
                                        anchoEficazM={r.cortante.anchoEficazM} />
                </CardContent>
              </Card>

              {r.entalladura && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Entalladura</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <CroquisEntalladura
                      cantoM={r.h}
                      cantoEficazM={r.hefV}
                      proyeccionM={r.proy}
                      distanciaApoyoM={r.xV}
                      lado={ladoDesde(lado)}
                    />
                    <PanelFormulas
                      titulo="Ver cálculo de kv"
                      filas={[
                        { etiqueta: "α = hef/h", valor: fmt(r.entalladura.alpha, 3) },
                        { etiqueta: "i = proyección/(h − hef)", valor: fmt(r.entalladura.inclinacion, 3) },
                        { etiqueta: "kn (6.63)", valor: fmt(KN[r.tipoM], 1) },
                        { etiqueta: "kv (6.62)", valor: fmt(r.entalladura.kv, 3) },
                        { etiqueta: "kv·fv,d", valor: `${fmt(r.entalladura.resistenciaReducidaMPa, 3)} MPa` },
                        { etiqueta: "τd = 1,5·Vd/(bef·hef)", valor: `${fmt(r.entalladura.tauDMPa, 3)} MPa` },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Desarrollo</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Resistencia y tensiones"
                    filas={[
                      { etiqueta: "kmod (tabla 3.1)", valor: fmt(r.km, 2) },
                      { etiqueta: "γM (tabla 2.3)", valor: fmt(r.gammaM, 2) },
                      {
                        etiqueta: "fv,d  (2.14)",
                        valor: `${fmt(r.fvd.valor, 3)} MPa`,
                        formula: "kmod · fv,k / γM",
                        sustitucion: `${fmt(r.km, 2)} · ${fmt(aNumero(fvk), 2)} / ${fmt(r.gammaM, 2)}`,
                      },
                      { etiqueta: "kcr (art. 6.1.7)", valor: fmt(r.kcr, 2) },
                      {
                        etiqueta: "bef = kcr·b  (6.13a)",
                        valor: `${fmt(r.cortante.anchoEficazM, 4)} m`,
                      },
                      {
                        etiqueta: "τd = 1,5·Vd/(bef·h)",
                        valor: `${fmt(r.cortante.tauDMPa, 3)} MPa`,
                      },
                      ...(r.torsion
                        ? [
                            { etiqueta: "h/b", valor: fmt(r.torsion.relacionHB, 2) },
                            { etiqueta: "α1 (tabla de torsión)", valor: fmt(r.torsion.alpha1, 3) },
                            { etiqueta: "kshape  (6.15)", valor: fmt(r.torsion.kshape, 3) },
                            {
                              etiqueta: "τtor,d = Td/(α1·h·b²)",
                              valor: `${fmt(r.torsion.tauTorDMPa, 3)} MPa`,
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
