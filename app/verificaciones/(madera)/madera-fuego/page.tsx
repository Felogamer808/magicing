"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { LeyendaTecnica } from "@/components/verificaciones/comun/LeyendaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import {
  CroquisSeccionCarbonizada,
  type CarasDibujo,
  type NombreCara,
} from "@/components/verificaciones/madera/CroquisSeccionCarbonizada";
import { SelectorVista } from "@/components/verificaciones/comun/SelectorVista";
import {
  NOMBRE_MADERA,
  GAMMA_M,
  kmod,
  type TipoMadera,
} from "@/lib/calc/madera/materiales";
import {
  NOMBRE_ESPECIE_FUEGO,
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

const ETAPAS = [
  { id: "exposicion", titulo: "Exposición" },
  { id: "seccion", titulo: "Sección" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const TIPOS = Object.values(NOMBRE_MADERA);
const tipoDesde = (e: string): TipoMadera =>
  ((Object.entries(NOMBRE_MADERA) as [TipoMadera, string][]).find(([, n]) => n === e)?.[0] ?? "maciza");

const ESPECIES = Object.values(NOMBRE_ESPECIE_FUEGO);
const especieDesde = (e: string): EspecieFuego =>
  ((Object.entries(NOMBRE_ESPECIE_FUEGO) as [EspecieFuego, string][]).find(([, n]) => n === e)?.[0] ??
    "conifera");

/**
 * Atajos para los tres montajes de siempre. Siguen estando porque son el 95 %
 * de los casos y elegirlos de una es más rápido que marcar cara por cara, pero
 * ya no son las únicas combinaciones posibles: debajo se puede marcar
 * cualquiera sobre el dibujo.
 */
const MONTAJES: { nombre: string; caras: CarasDibujo }[] = [
  {
    nombre: "Tres caras · viga con losa encima",
    caras: { izquierda: true, derecha: true, superior: false, inferior: true },
  },
  {
    nombre: "Cuatro caras · pilar exento",
    caras: { izquierda: true, derecha: true, superior: true, inferior: true },
  },
  {
    nombre: "Dos opuestas · vigueta entre forjados",
    caras: { izquierda: true, derecha: true, superior: false, inferior: false },
  },
];

/**
 * El motor sólo necesita cuántas caras arden, no cuáles: con la sección
 * reducida, quemar arriba o abajo da el mismo canto eficaz. El dibujo sí
 * necesita cuáles, así que la pantalla guarda las cuatro y acá se cuentan.
 */
function contarCaras(c: CarasDibujo): CarasExpuestas {
  const enAnchura = (Number(c.izquierda) + Number(c.derecha)) as 0 | 1 | 2;
  const enCanto = (Number(c.superior) + Number(c.inferior)) as 0 | 1 | 2;
  return { enAnchura, enCanto };
}

function describirCaras(c: CarasDibujo): string {
  const n = Object.values(c).filter(Boolean).length;
  const atajo = MONTAJES.find(
    (m) =>
      m.caras.izquierda === c.izquierda &&
      m.caras.derecha === c.derecha &&
      m.caras.superior === c.superior &&
      m.caras.inferior === c.inferior
  );
  if (atajo) return atajo.nombre;
  if (n === 0) return "Ninguna cara expuesta";
  return `${n} cara${n === 1 ? "" : "s"} · combinación propia`;
}

/** Tiempos de resistencia que se piden en obra. */
const TIEMPOS = [0, 15, 30, 60, 90] as const;

export default function MaderaFuegoPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Laminada encolada (MLE)");
  const [especie, setEspecie] = useCampo("especie", NOMBRE_ESPECIE_FUEGO.conifera);
  // Una cara por campo: así se guarda cualquier combinación y no sólo los tres
  // montajes de siempre.
  const [caraIzq, setCaraIzq] = useCampo("caraIzq", "si");
  const [caraDer, setCaraDer] = useCampo("caraDer", "si");
  const [caraSup, setCaraSup] = useCampo("caraSup", "no");
  const [caraInf, setCaraInf] = useCampo("caraInf", "si");
  /** Qué se dibuja en el panel de la sección. */
  const [vista, setVista] = useCampo<"actual" | "superpuesta" | "lado">("vistaFuego", "actual");
  const [tiempo, setTiempo] = useCampo("tiempo", "30");

  const [ancho, setAncho] = useCampo("ancho", "0.14");
  const [canto, setCanto] = useCampo("canto", "0.364");

  const [fmk, setFmk] = useCampo("fmk", "24");
  const [fc0k, setFc0k] = useCampo("fc0k", "24");
  const [e005, setE005] = useCampo("e005", "9.6");

  const [momento, setMomento] = useCampo("momento", "11.68");
  const [axil, setAxil] = useCampo("axil", "0");
  const [lkz, setLkz] = useCampo("lkz", "2.05");

  const carasDibujo: CarasDibujo = useMemo(
    () => ({
      izquierda: caraIzq === "si",
      derecha: caraDer === "si",
      superior: caraSup === "si",
      inferior: caraInf === "si",
    }),
    [caraIzq, caraDer, caraSup, caraInf]
  );

  const ponerCaras = (c: CarasDibujo) => {
    setCaraIzq(c.izquierda ? "si" : "no");
    setCaraDer(c.derecha ? "si" : "no");
    setCaraSup(c.superior ? "si" : "no");
    setCaraInf(c.inferior ? "si" : "no");
  };

  const alternarCara = (cara: NombreCara) =>
    ponerCaras({ ...carasDibujo, [cara]: !carasDibujo[cara] });

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
    const caras = contarCaras(carasDibujo);
    const velocidad = betaN(tipoM, esp);

    const reducida = seccionReducida(b, h, t, velocidad, caras);
    const reducidaFria = seccionReducida(b, h, 0, velocidad, caras);

    // Resistencias del art. 4.2.2(5): kmod,fi = 1 y γM,fi = 1, con kfi.
    const fmdFi = resistenciaEnIncendioMPa(fmkV, tipoM);
    const fc0dFi = resistenciaEnIncendioMPa(fc0kV, tipoM);
    const e005Fi = resistenciaEnIncendioMPa(e, tipoM);

    if (reducida.agotada) {
      return {
        b, h, tipoM, caras, velocidad, reducida, reducidaFria,
        fmdFi, fc0dFi, agotada: true as const,
      };
    }

    const props = propiedades({ anchoM: reducida.anchoEficazM, cantoM: reducida.cantoEficazM });
    const propsFrias = propiedades({ anchoM: b, cantoM: h });

    const sigmaM = tensionFlexionMPa(m, props.wyM3);
    const sigmaC = tensionAxilMPa(n, props.areaM2);

    const ejeZ = pandeoEje(lz / props.radioGiroZM, fc0kV, e005Fi, tipoM);

    const relacion = relacionIncendioFrio(tipoM, kmod(tipoM, 1, "media"), GAMMA_M[tipoM]);

    return {
      b, h, tipoM, caras, velocidad, reducida, reducidaFria, props, propsFrias,
      fmdFi, fc0dFi, e005Fi, sigmaM, sigmaC, ejeZ, relacion,
      aprovechaFlexion: fmdFi > 0 ? sigmaM / fmdFi : Infinity,
      aprovechaCompresion: ejeZ.kc * fc0dFi > 0 ? sigmaC / (ejeZ.kc * fc0dFi) : Infinity,
      agotada: false as const,
    };
  }, [ancho, canto, tiempo, fmk, fc0k, e005, momento, axil, lkz, tipo, especie, carasDibujo]);

  const avisos: AvisoRevision[] = [];
  if (!r) {
    avisos.push({ tipo: "error", texto: "Cargá sección, tiempo de exposición y resistencias con valores válidos." });
  } else if (r.agotada) {
    avisos.push({ tipo: "error", texto: `A los ${fmt(aNumero(tiempo), 0)} minutos no queda sección eficaz: el descuento por cara es de ${fmt(r.reducida.profundidadEficazM * 1000, 1)} mm.` });
  } else if (!(aNumero(momento) > 0) && !(aNumero(axil) > 0)) {
    avisos.push({ tipo: "aviso", texto: "Md,fi y Nd,fi son cero: no hay esfuerzo que verificar sobre la sección eficaz." });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Situación accidental</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="exposicion" numero={1} titulo="Exposición" descripcion="Material, caras que arden y tiempo requerido. Las caras también se marcan sobre el dibujo.">
          <DatosConDibujo
            datos={
              <>
                <CampoSeleccion id="tipo" etiqueta="Material" valor={tipo} opciones={TIPOS} onChange={setTipo} />
                <CampoSeleccion id="especie" etiqueta="Especie (tabla 3.1)" valor={especie} opciones={ESPECIES} onChange={setEspecie} />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Caras expuestas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MONTAJES.map((m) => {
                      const activo = describirCaras(carasDibujo) === m.nombre;
                      return (
                        <button
                          key={m.nombre}
                          type="button"
                          onClick={() => ponerCaras(m.caras)}
                          aria-pressed={activo}
                          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                            activo
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-input text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {m.nombre}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {describirCaras(carasDibujo)}. También se puede marcar cada cara haciendo clic
                    sobre el dibujo.
                  </p>
                </div>

                <div className="space-y-2">
                  <CampoNumerico id="tiempo" etiqueta="Tiempo requerido t" sufijo="min" valor={tiempo} onChange={setTiempo} sugerencias={[15, 30, 45, 60, 90, 120]} />
                  <div className="flex flex-wrap gap-1.5">
                    {TIEMPOS.map((t) => {
                      const activo = aNumero(tiempo) === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTiempo(String(t))}
                          aria-pressed={activo}
                          className={`rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors ${
                            activo
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-input text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {t === 0 ? "0 · en frío" : `R${t}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
              </>
            }
            dibujo={
              r ? (
                <CroquisSeccionCarbonizada
                  anchoM={r.b} cantoM={r.h}
                  reducida={r.agotada ? r.reducidaFria : r.reducida}
                  caras={carasDibujo}
                  onToggleCara={alternarCara}
                  ocultarNota
                />
              ) : null
            }
          />
        </Etapa>

        <Etapa id="seccion" numero={2} titulo="Sección y esfuerzos" descripcion="Esfuerzos de la combinación accidental de incendio: las variables entran con ψ1 o ψ2 y no con γQ.">
          <div className="grid max-w-2xl grid-cols-2 gap-4">
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
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Material · especie", valor: `${tipo} · ${especie}` },
              { etiqueta: "Caras expuestas", valor: describirCaras(carasDibujo) },
              { etiqueta: "Tiempo requerido", valor: `${tiempo} min` },
              { etiqueta: "Sección b × h", valor: `${ancho} × ${canto} m` },
              { etiqueta: "fm,k · fc,0,k · E0,05", valor: `${fmk} · ${fc0k} MPa · ${e005} GPa` },
              { etiqueta: "Md,fi · Nd,fi", valor: `${momento} kN·m · ${axil} kN` },
              { etiqueta: "lk,z", valor: `${lkz} m` },
              ...(r ? [{ etiqueta: "βn", valor: `${fmt(r.velocidad, 2)} mm/min`, derivado: true }] : []),
            ]}
            hipotesis={[
              "EC5-1-2, método de la sección reducida: def = dchar,n + k0·d0, con d0 = 7 mm (ec. 4.1).",
              "βn de la tabla 3.1 según material y especie; k0 de la tabla 4.1.",
              "Resistencias en incendio con kmod,fi = 1, γM,fi = 1 y kfi (art. 4.2.2(5)).",
              "Pandeo en el eje z de la sección eficaz, con E0,05 afectado por kfi.",
              "Esfuerzos de la combinación accidental de incendio; el caso en frío se verifica en las páginas de flexión y axil.",
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
          ) : r.agotada ? (
            <div className="space-y-10">
              <ConclusionAutomatica />
              <Subgrupo titulo="Sección eficaz">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`Queda sección eficaz a los ${fmt(aNumero(tiempo), 0)} min`}
                    verifica={false}
                    detalle={`El descuento por cara es de ${fmt(r.reducida.profundidadEficazM * 1000, 1)} mm y la sección no da para tanto.`}
                  />
                  <p className="text-sm text-muted-foreground">
                    Hay que engrosar la escuadría, reducir el tiempo requerido o proteger las caras
                    expuestas.
                  </p>
                </div>
              </Subgrupo>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionAutomatica />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Área remanente", valor: `${fmt(r.reducida.fraccionAreaRestante * 100, 0)} %`, nota: "de la sección en frío" },
                  { etiqueta: "hef × bef", valor: `${fmt(r.reducida.cantoEficazM * 1000, 0)} × ${fmt(r.reducida.anchoEficazM * 1000, 0)} mm` },
                  { etiqueta: "Descuento por cara", valor: `${fmt(r.reducida.profundidadEficazM * 1000, 1)} mm`, nota: "carbonizada más capa caliente" },
                  { etiqueta: "fm,d,fi", valor: `${fmt(r.fmdFi, 2)} MPa`, nota: `${fmt(r.relacion, 2)} × la de frío` },
                ]}
              />

              <Subgrupo titulo="Resistencia de la sección eficaz">
                <div className="space-y-3">
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
                  <PanelFormulas
                    titulo="Ver desarrollo de la sección reducida"
                    filas={[
                      { etiqueta: "βn (tabla 3.1)", valor: `${fmt(r.velocidad, 2)} mm/min` },
                      { etiqueta: "dchar,n = βn·t  (3.2)", valor: `${fmt(r.reducida.profundidadCarbonizadaM * 1000, 1)} mm` },
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
                </div>
              </Subgrupo>

              <Subgrupo titulo="Sección carbonizada">
                <div className="space-y-3">
                  <SelectorVista
                    etiqueta="Cómo mirar la sección"
                    valor={vista}
                    onChange={setVista}
                    opciones={[
                      { valor: "actual", etiqueta: `A los ${fmt(aNumero(tiempo), 0)} min`, descripcion: "Sólo lo que queda" },
                      { valor: "superpuesta", etiqueta: "Superpuesta", descripcion: "Con el contorno de la sección en frío encima" },
                      { valor: "lado", etiqueta: "Lado a lado", descripcion: "La sección en frío y la de ahora, a la misma escala" },
                    ]}
                  />
                  {vista === "lado" ? (
                    <div className="space-y-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="spec-label mb-1">En frío · t = 0</p>
                          <CroquisSeccionCarbonizada anchoM={r.b} cantoM={r.h} reducida={r.reducidaFria} caras={carasDibujo} ocultarNota />
                        </div>
                        <div>
                          <p className="spec-label mb-1">A los {fmt(aNumero(tiempo), 0)} min</p>
                          <CroquisSeccionCarbonizada anchoM={r.b} cantoM={r.h} reducida={r.reducida} caras={carasDibujo} onToggleCara={alternarCara} ocultarNota />
                        </div>
                      </div>
                      {/* La nota va una sola vez: es la misma para los dos. */}
                      <p className="text-xs text-muted-foreground">
                        Las dos están a la misma escala, así que lo que se achica es lo que se
                        perdió. Hacé clic en una cara de la derecha para marcarla como expuesta.
                      </p>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md">
                      <CroquisSeccionCarbonizada
                        anchoM={r.b} cantoM={r.h} reducida={r.reducida} caras={carasDibujo}
                        onToggleCara={alternarCara}
                        mostrarOriginal={vista === "superpuesta"}
                      />
                    </div>
                  )}
                  <LeyendaTecnica
                    entradas={[
                      { color: "var(--mat-carbon)", etiqueta: "Capa carbonizada", nota: `dchar,n = ${fmt(r.reducida.profundidadCarbonizadaM * 1000, 1)} mm` },
                      { color: "var(--mat-calentada)", etiqueta: "Capa caliente", nota: "no está quemada; la norma le supone resistencia nula", rayado: true },
                      { color: "var(--mat-eficaz)", etiqueta: "Sección eficaz", nota: "la que se verifica" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Qué cambia respecto del cálculo en frío">
                <div className="space-y-3">
                  <dl className="divide-y divide-border/60 text-sm">
                    {[
                      {
                        magnitud: "Área de la sección",
                        frio: "100 %",
                        fuego: `${fmt(r.reducida.fraccionAreaRestante * 100, 0)} %`,
                        nota: "se pierde el perímetro quemado más la capa caliente",
                      },
                      {
                        magnitud: "Módulo resistente Wy",
                        frio: "100 %",
                        fuego: `${fmt((r.props.wyM3 / r.propsFrias.wyM3) * 100, 0)} %`,
                        nota: "cae más que el área: Wy va con el canto al cuadrado",
                      },
                      {
                        magnitud: "Resistencia del material",
                        frio: "100 %",
                        fuego: `${fmt(r.relacion * 100, 0)} %`,
                        nota: "sube, porque en accidental kmod,fi y γM,fi valen 1 y además entra kfi",
                      },
                    ].map((f) => (
                      <div key={f.magnitud} className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2">
                        <dt>
                          {f.magnitud}
                          <span className="block text-xs text-muted-foreground">{f.nota}</span>
                        </dt>
                        <dd className="text-right font-mono tabular-nums text-muted-foreground">{f.frio}</dd>
                        <dd className="w-16 text-right font-mono font-medium tabular-nums">{f.fuego}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">No son dos verificaciones comparables
                    número contra número.</strong>{" "}
                    En incendio la solicitación sale de la combinación accidental, que es bastante
                    menor que la de cálculo, y esta pantalla no resuelve el caso en frío: para eso
                    está flexión y vuelco lateral. Lo que se compara acá es la sección y el
                    material, que sí son la misma pieza mirada en dos momentos.
                  </p>
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
