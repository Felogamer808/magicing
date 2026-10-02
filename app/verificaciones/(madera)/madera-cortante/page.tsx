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

const ETAPAS = [
  { id: "material", titulo: "Material y sección" },
  { id: "entalladura", titulo: "Entalladura" },
  { id: "torsion", titulo: "Torsión" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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

  const avisos: AvisoRevision[] = [];
  if (!r) avisos.push({ tipo: "error", texto: "Cargá sección, resistencia y esfuerzos con valores válidos." });
  else if (r.hay && !r.entalladuraValida) avisos.push({ tipo: "error", texto: "Entalladura: hef tiene que ser mayor que cero y no puede superar el canto total." });

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
        <Etapa id="material" numero={1} titulo="Material y sección" descripcion="Las tres comprobaciones comparten fv,d: cambia el factor que la multiplica.">
          <DatosConDibujo
            datos={
              <>
                <SelectorMadera
                  tipo={tipo} onTipo={setTipo}
                  servicio={servicio} onServicio={setServicio}
                  duracion={duracion} onDuracion={setDuracion}
                />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="fvk" etiqueta="fv,k" sufijo="MPa" valor={fvk} onChange={setFvk} />
                  <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
                  <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                  <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
                </div>
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
              </>
            }
            dibujo={<CroquisSeccionMadera anchoM={aNumero(ancho)} cantoM={aNumero(canto)} anchoEficazM={r?.cortante.anchoEficazM} />}
          />
        </Etapa>

        <Etapa id="entalladura" numero={2} titulo="Entalladura en el apoyo" descripcion="Art. 6.5.2: sólo si la viga está rebajada sobre el apoyo.">
          <DatosConDibujo
            datos={
              <>
                <CampoSeleccion id="conEntalladura" etiqueta="¿La viga está entallada?" valor={conEntalladura} opciones={HAY_ENTALLADURA} onChange={setConEntalladura} />
                {conEntalladura === HAY_ENTALLADURA[1] && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <CampoNumerico id="hef" etiqueta="hef" sufijo="m" valor={hef} onChange={setHef} />
                      <CampoNumerico id="proyeccion" etiqueta="Proyección" sufijo="m" valor={proyeccion} onChange={setProyeccion} />
                      <CampoNumerico id="xApoyo" etiqueta="x" sufijo="m" valor={xApoyo} onChange={setXApoyo} />
                    </div>
                    <CampoSeleccion id="lado" etiqueta="Lado de la entalladura" valor={lado} opciones={LADOS} onChange={setLado} />
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
              </>
            }
            dibujo={
              conEntalladura === HAY_ENTALLADURA[1] ? (
                <CroquisEntalladura
                  cantoM={aNumero(canto)}
                  cantoEficazM={aNumero(hef)}
                  proyeccionM={aNumero(proyeccion)}
                  distanciaApoyoM={aNumero(xApoyo)}
                  lado={ladoDesde(lado)}
                />
              ) : null
            }
          />
        </Etapa>

        <Etapa id="torsion" numero={3} titulo="Torsión" descripcion="Dejalo en cero si la pieza no tiene torsor.">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            <CampoNumerico id="torsor" etiqueta="Td" sufijo="kN·m" valor={torsor} onChange={setTorsor} />
            <CampoSeleccion id="forma" etiqueta="Forma de la sección" valor={forma} opciones={FORMAS} onChange={setForma} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Madera", valor: `${tipo} · ${servicio}` },
              { etiqueta: "Duración de la carga", valor: duracion },
              { etiqueta: "fv,k", valor: `${fvk} MPa` },
              { etiqueta: "Sección b × h", valor: `${ancho} × ${canto} m` },
              { etiqueta: "Vd · Td", valor: `${vd} kN · ${torsor} kN·m` },
              {
                etiqueta: "Entalladura",
                valor: conEntalladura === HAY_ENTALLADURA[1] ? `hef ${hef} m, proyección ${proyeccion} m, x ${xApoyo} m, ${lado.toLowerCase()}` : "sin entalladura",
              },
              ...(r ? [{ etiqueta: "fv,d", valor: `${fmt(r.fvd.valor, 3)} MPa`, derivado: true }] : []),
            ]}
            hipotesis={[
              "EC5, arts. 6.1.7 (cortante), 6.1.8 (torsión) y 6.5.2 (entalladura en el apoyo).",
              "Anchura eficaz bef = kcr·b; kcr recomendado 0,67 en maciza y laminada.",
              "fv,d sin kh ni ksys: los factores de tamaño sólo afectan a fm,k y ft,0,k.",
              "Torsión: α1 interpolado de la tabla clásica de torsión.",
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
                  { etiqueta: "fv,d", valor: `${fmt(r.fvd.valor, 3)} MPa` },
                  { etiqueta: "bef", valor: `${fmt(r.cortante.anchoEficazM, 3)} m`, nota: `kcr = ${fmt(r.kcr, 2)}` },
                  { etiqueta: "kv", valor: r.entalladura ? fmt(r.entalladura.kv, 3) : "—", nota: r.entalladura ? "entalladura" : "sin entalladura" },
                  { etiqueta: "kshape", valor: r.torsion ? fmt(r.torsion.kshape, 3) : "—", nota: r.torsion ? "torsión" : "sin torsor" },
                ]}
              />

              <Subgrupo titulo="Cortante" detalle="ec. (6.13)">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Cortante, ec. (6.13)"
                    verifica={r.cortante.verifica}
                    comparacion={{
                      real: { etiqueta: "τd", valor: r.cortante.tauDMPa },
                      limite: { etiqueta: "fv,d", valor: r.cortante.fvdMPa },
                      unidad: "MPa", exige: "≤", decimales: 3,
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del cortante"
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
                      { etiqueta: "bef = kcr·b  (6.13a)", valor: `${fmt(r.cortante.anchoEficazM, 4)} m` },
                      { etiqueta: "τd = 1,5·Vd/(bef·h)", valor: `${fmt(r.cortante.tauDMPa, 3)} MPa` },
                    ]}
                  />
                </div>
              </Subgrupo>

              {r.entalladura && (
                <Subgrupo titulo="Entalladura en el apoyo" detalle="ec. (6.60)">
                  <div className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Entalladura en el apoyo, ec. (6.60)"
                      verifica={r.entalladura.verifica}
                      comparacion={{
                        real: { etiqueta: "τd", valor: r.entalladura.tauDMPa },
                        limite: { etiqueta: "kv·fv,d", valor: r.entalladura.resistenciaReducidaMPa },
                        unidad: "MPa", exige: "≤", decimales: 3,
                      }}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo de kv"
                      filas={[
                        { etiqueta: "α = hef/h", valor: fmt(r.entalladura.alpha, 3) },
                        { etiqueta: "i = proyección/(h − hef)", valor: fmt(r.entalladura.inclinacion, 3) },
                        { etiqueta: "kn (6.63)", valor: fmt(KN[r.tipoM], 1) },
                        { etiqueta: "kv (6.62)", valor: fmt(r.entalladura.kv, 3) },
                        { etiqueta: "kv·fv,d", valor: `${fmt(r.entalladura.resistenciaReducidaMPa, 3)} MPa` },
                        { etiqueta: "τd = 1,5·Vd/(bef·hef)", valor: `${fmt(r.entalladura.tauDMPa, 3)} MPa` },
                      ]}
                    />
                  </div>
                </Subgrupo>
              )}

              {r.torsion && (
                <Subgrupo titulo="Torsión" detalle="ec. (6.14)">
                  <div className="space-y-3">
                    <ResultadoCheck
                      etiqueta="Torsión, ec. (6.14)"
                      verifica={r.torsion.verifica}
                      comparacion={{
                        real: { etiqueta: "τtor,d", valor: r.torsion.tauTorDMPa },
                        limite: { etiqueta: "kshape·fv,d", valor: r.torsion.resistenciaReducidaMPa },
                        unidad: "MPa", exige: "≤", decimales: 3,
                      }}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo de la torsión"
                      filas={[
                        { etiqueta: "h/b", valor: fmt(r.torsion.relacionHB, 2) },
                        { etiqueta: "α1 (tabla de torsión)", valor: fmt(r.torsion.alpha1, 3) },
                        { etiqueta: "kshape  (6.15)", valor: fmt(r.torsion.kshape, 3) },
                        { etiqueta: "τtor,d = Td/(α1·h·b²)", valor: `${fmt(r.torsion.tauTorDMPa, 3)} MPa` },
                      ]}
                    />
                  </div>
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
