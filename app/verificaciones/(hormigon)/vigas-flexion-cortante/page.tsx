"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { EditorCapas, type FilaCapa } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import {
  SeccionVigaDiagrama,
  type ElementoSeccionViga,
} from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";
import { DiagramaRotura } from "@/components/verificaciones/hormigon/DiagramaRotura";
import { ConvencionMomentosViga } from "@/components/verificaciones/hormigon/ConvencionMomentosViga";
import { EstriboLongitudinal, EstriboTransversal } from "@/components/verificaciones/hormigon/EstribosViga";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { PanelVinculos } from "@/components/verificaciones/comun/PanelVinculos";
import { VINCULOS_SERVICIO } from "@/lib/verificaciones/vinculos";
import { armarGrupos, resolverVigaFlexionCortante, tipoSeccionDesdeCampo } from "@/lib/calc/hormigon/vigas/resolver";
import {
  anchoEficazAla,
  calcularL0,
  LUCES_TRAMO_L0,
  ROTULOS_TIPO_SECCION as TIPOS_SECCION,
  ROTULOS_TRAMO_L0,
  tipoSeccionPorRotulo as tipoPorRotulo,
  tramoL0DesdeCampo,
  tramoL0PorRotulo,
  type TipoSeccion,
  type TramoL0,
} from "@/lib/calc/hormigon/vigas/seccion-t";
import { CroquisL0, CroquisSeccionT } from "@/components/verificaciones/croquis/CroquisSeccionT";

/** Qué es cada luz en cada caso de la fig. A19.5.2. */
const ETIQUETAS_LUZ: Record<TramoL0, { luz1?: string; luz2?: string }> = {
  simple: { luz1: "l (luz del vano)" },
  extremo: { luz1: "l1 (luz del vano extremo)" },
  interior: { luz1: "l2 (luz de este vano)" },
  apoyo: { luz1: "l1 (vano de un lado)", luz2: "l2 (vano del otro lado)" },
  voladizo: { luz1: "l3 (largo del voladizo)", luz2: "l2 (vano contiguo)" },
  manual: {},
};
import { calcularDisposicionArmadura } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { recomendarVigaFlexionCortante } from "@/lib/verificaciones/recomendaciones/vigas-flexion-cortante";
import { aNumero, fmt, describirCapas } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "vigas-flexion-cortante")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y materiales" },
  { id: "solicitaciones", titulo: "Solicitaciones" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Qué parte de los dibujos corresponde a cada campo, para resaltarla con el foco. */
const ELEMENTO_DE_CAMPO: Record<string, ElementoSeccionViga | "positivo" | "negativo"> = {
  b: "b",
  h: "h",
  recubrimiento: "recubrimiento",
  anchoAla: "ala",
  espesorAla: "hf",
  numeroPos: "inferior",
  diametroPos: "inferior",
  numeroPos2: "inferior",
  diametroPos2: "inferior",
  numeroNeg: "superior",
  diametroNeg: "superior",
  numeroNeg2: "superior",
  diametroNeg2: "superior",
  diametroEstribo: "estribo",
  numeroRamas: "estribo",
  momentoPos: "positivo",
  momentoNeg: "negativo",
};

type Campo = [id: string, valor: string, onChange: (v: string) => void];

/** Motivo, para el detalle de la comprobación, cuando la sección queda sobrearmada. */
function motivoSobrearmada(f: { sobrearmada: boolean; mu: number; muLim: number }): string | undefined {
  return f.sobrearmada
    ? `μ = ${fmt(f.mu, 3)} > μlim = ${fmt(f.muLim, 3)}: el acero no llega a fluir. Hace falta armadura de compresión o más canto.`
    : undefined;
}

/** As necesaria, o el motivo por el que no hay una. */
function asNecesaria(f: { asNecCm2: number }): string {
  return Number.isFinite(f.asNecCm2) ? `${fmt(f.asNecCm2)} cm²` : "sobrearmada";
}

function capa(cara: "Inferior" | "Superior", n: number, numero: Campo, diametro: Campo, onQuitar?: () => void): FilaCapa {
  return {
    posicion: `${cara} · capa ${n}`,
    numero: { id: numero[0], valor: numero[1], onChange: numero[2] },
    diametro: { id: diametro[0], valor: diametro[1], onChange: diametro[2] },
    onQuitar,
  };
}

export default function VigasFlexionCortantePage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [b, setB] = useCampo("b", "0.9");
  const [h, setH] = useCampo("h", "0.7");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.04");

  // Sección en T: b pasa a ser el alma y el ala se carga aparte.
  const [tipoSeccion, setTipoSeccion] = useCampo<TipoSeccion>("tipoSeccion", "rectangular");
  const [anchoAla, setAnchoAla] = useCampo("anchoAla", "1.5");
  const [espesorAla, setEspesorAla] = useCampo("espesorAla", "0.15");
  const [l0, setL0] = useCampo("l0", "6");
  // l0 sale de la fig. A19.5.2 con las luces, o se carga a mano.
  const [tramoL0Campo, setTramoL0] = useCampo<TramoL0>("tramoL0", "manual");
  const [luz1, setLuz1] = useCampo("luz1", "6");
  const [luz2, setLuz2] = useCampo("luz2", "6");
  const tramoL0 = tramoL0DesdeCampo(tramoL0Campo);
  const l0Efectivo = tramoL0 === "manual" ? aNumero(l0) : calcularL0(tramoL0, aNumero(luz1), aNumero(luz2));
  const [diametroAla, setDiametroAla] = useCampo("diametroAla", "8");
  const [separacionAla, setSeparacionAla] = useCampo("separacionAla", "0.2");
  const [capasAla, setCapasAla] = useCampo("capasAla", "1");
  const tipo = tipoSeccionDesdeCampo(tipoSeccion);
  const conAla = tipo !== "rectangular";

  const [momentoPos, setMomentoPos] = useCampo("momentoPos", "32");
  const [numeroPos, setNumeroPos] = useCampo("numeroPos", "10");
  const [diametroPos, setDiametroPos] = useCampo("diametroPos", "10");
  const [numeroPos2, setNumeroPos2] = useCampo("numeroPos2", "0");
  const [diametroPos2, setDiametroPos2] = useCampo("diametroPos2", "10");

  const [momentoNeg, setMomentoNeg] = useCampo("momentoNeg", "14");
  const [numeroNeg, setNumeroNeg] = useCampo("numeroNeg", "5");
  const [diametroNeg, setDiametroNeg] = useCampo("diametroNeg", "12");
  const [numeroNeg2, setNumeroNeg2] = useCampo("numeroNeg2", "0");
  const [diametroNeg2, setDiametroNeg2] = useCampo("diametroNeg2", "12");

  const [monolitica, setMonolitica] = useCampo("monolitica", "si");

  const [vd, setVd] = useCampo("vd", "1076");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "10");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "6");

  const [foco, setFoco] = useState<string | null>(null);

  // El cálculo vive en lib/calc/.../resolver.ts y no acá: la memoria de cálculo
  // tiene que volver a correr un cálculo guardado meses después, y con la
  // conversión duplicada tarde o temprano el documento firmado mostraría un
  // número distinto del que muestra esta pantalla.
  const campos = useMemo(
    () => ({
      fck, fyk, b, h, recubrimiento,
      momentoPos, numeroPos, diametroPos, numeroPos2, diametroPos2,
      momentoNeg, numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
      vd, diametroEstribo, numeroRamas, monolitica,
      tipoSeccion, anchoAla, espesorAla, l0, diametroAla, separacionAla, capasAla, tramoL0: tramoL0Campo, luz1, luz2,
    }),
    [
    fck, fyk, b, h, recubrimiento,
    momentoPos, numeroPos, diametroPos, numeroPos2, diametroPos2,
    momentoNeg, numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
    vd, diametroEstribo, numeroRamas, monolitica,
    tipoSeccion, anchoAla, espesorAla, l0, diametroAla, separacionAla, capasAla, tramoL0Campo, luz1, luz2,
    ]
  );
  const resultado = useMemo(() => resolverVigaFlexionCortante(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarVigaFlexionCortante(campos), [campos]);

  // La sección se dibuja con los datos de geometría y armadura, aunque el
  // resto del formulario (cortante) todavía no sea válido.
  const diagrama = useMemo(() => {
    const v = {
      b: aNumero(b),
      h: aNumero(h),
      recubrimiento: aNumero(recubrimiento),
      numeroPos: aNumero(numeroPos),
      diametroPos: aNumero(diametroPos),
      numeroPos2: aNumero(numeroPos2),
      diametroPos2: aNumero(diametroPos2),
      numeroNeg: aNumero(numeroNeg),
      diametroNeg: aNumero(diametroNeg),
      numeroNeg2: aNumero(numeroNeg2),
      diametroNeg2: aNumero(diametroNeg2),
      diametroEstribo: aNumero(diametroEstribo),
    };

    const validos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
    const segundasCapasValidas =
      (v.numeroPos2 === 0 || v.diametroPos2 > 0) && (v.numeroNeg2 === 0 || v.diametroNeg2 > 0);
    if (
      !validos ||
      !segundasCapasValidas ||
      v.b <= 0 ||
      v.h <= 0 ||
      v.numeroPos <= 0 ||
      v.diametroPos <= 0 ||
      v.numeroNeg <= 0 ||
      v.diametroNeg <= 0 ||
      v.diametroEstribo <= 0
    ) {
      return null;
    }

    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento, diametroEstriboMm: v.diametroEstribo };
    // Con ala, las barras de su cara se reparten en el ancho eficaz, como en el cálculo.
    const datosAla = { anchoM: aNumero(anchoAla), espesorM: aNumero(espesorAla), l0M: l0Efectivo };
    const alaValida = conAla && datosAla.anchoM >= v.b && datosAla.espesorM > 0 && datosAla.espesorM < v.h && datosAla.l0M > 0;
    const anchoEficazM = alaValida ? anchoEficazAla(v.b, datosAla).anchoEficazM : v.b;
    const alaArriba = tipo === "t";
    const gruposPositiva = armarGrupos(v.numeroPos, v.diametroPos, v.numeroPos2, v.diametroPos2);
    const gruposNegativa = armarGrupos(v.numeroNeg, v.diametroNeg, v.numeroNeg2, v.diametroNeg2);
    const disposicionPositiva = calcularDisposicionArmadura(
      alaValida && !alaArriba ? { ...geometria, b: anchoEficazM } : geometria, gruposPositiva
    );
    const disposicionNegativa = calcularDisposicionArmadura(
      alaValida && alaArriba ? { ...geometria, b: anchoEficazM } : geometria, gruposNegativa
    );
    const d = geometria.h - disposicionPositiva.distanciaCentroideM;
    const dNegativo = geometria.h - disposicionNegativa.distanciaCentroideM;

    return {
      bM: v.b,
      hM: v.h,
      recubrimientoM: v.recubrimiento,
      dM: d,
      dNegativoM: dNegativo,
      armaduraPositiva: { capas: disposicionPositiva.filas },
      armaduraNegativa: { capas: disposicionNegativa.filas },
      diametroEstriboMm: v.diametroEstribo,
      ...(alaValida ? { ala: { anchoM: datosAla.anchoM, espesorM: datosAla.espesorM, arriba: alaArriba, anchoEficazM } } : {}),
    };
  }, [
    b, h, recubrimiento, conAla, tipo, anchoAla, espesorAla, l0Efectivo,
    numeroPos, diametroPos, numeroPos2, diametroPos2,
    numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
    diametroEstribo,
  ]);

  // El campo de "otro diámetro" lleva el id del selector más "-otro".
  const elementoFoco = foco ? (ELEMENTO_DE_CAMPO[foco.replace(/-otro$/, "")] ?? null) : null;
  const resaltarSeccion =
    elementoFoco && elementoFoco !== "positivo" && elementoFoco !== "negativo" ? elementoFoco : null;
  const resaltarMomento =
    elementoFoco === "positivo" || elementoFoco === "negativo" ? elementoFoco : null;
  // El foco se sigue en un contenedor: los eventos de foco de React burbujean,
  // así que no hace falta tocar cada campo.
  const seguirFoco = {
    onFocus: (e: FocusEvent<HTMLElement>) => setFoco(e.target.id || null),
    onBlur: () => setFoco(null),
  };

  const noEntra = {
    inferior: resultado ? !resultado.flexionPositiva.verificaEntraEnAncho : false,
    superior: resultado ? !resultado.flexionNegativa.verificaEntraEnAncho : false,
  };

  const dibujoSeccion = diagrama ? (
    <SeccionVigaDiagrama {...diagrama} resaltar={resaltarSeccion} noEntra={noEntra} sinResumen />
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">
      La sección se dibuja cuando la geometría y la armadura tienen valores válidos.
    </p>
  );

  const croquisGeometria =
    conAla && aNumero(b) > 0 && aNumero(h) > 0 && aNumero(anchoAla) > 0 && aNumero(espesorAla) > 0 ? (
      <div className="space-y-2">
        <CroquisSeccionT
          invertida={tipo === "t-invertida"}
          anchoAlaM={aNumero(anchoAla)}
          almaM={aNumero(b)}
          cantoM={aNumero(h)}
          espesorAlaM={aNumero(espesorAla)}
          {...(diagrama?.ala?.anchoEficazM !== undefined ? { anchoEficazM: diagrama.ala.anchoEficazM } : {})}
        />
        <CroquisL0 tramo={tramoL0} />
      </div>
    ) : (
      dibujoSeccion
    );

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });
  } else {
    if (resultado.flexionPositiva.sobrearmada)
      avisos.push({ tipo: "aviso", texto: `Con el momento positivo la sección queda sobrearmada: el acero no fluye y hace falta armadura de compresión o más canto.` });
    if (noEntra.inferior) avisos.push({ tipo: "aviso", texto: "La armadura inferior no entra en el ancho disponible." });
    if (resultado.gobiernaMinimoApoyo)
      avisos.push({
        tipo: "aviso",
        texto: `La armadura superior se dimensiona para el mínimo de apoyo, ${fmt(resultado.momentoNegativoCalculo, 1)} kN·m, mayor que el M− cargado.`,
      });
    if (resultado.flexionNegativa.sobrearmada)
      avisos.push({ tipo: "aviso", texto: `Con el momento negativo la sección queda sobrearmada: el acero no fluye y hace falta armadura de compresión o más canto.` });
    if (noEntra.superior) avisos.push({ tipo: "aviso", texto: "La armadura superior no entra en el ancho disponible." });
  }

  const botonCapa = "text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Vigas · verificación de sección</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12" {...seguirFoco}>
        <Etapa
          id="geometria"
          numero={1}
          titulo="Geometría y materiales"
          descripcion="La sección —rectangular, en T o en T invertida— y los materiales que la forman."
        >
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Sección">
                  <CampoSeleccion
                    id="tipoSeccion"
                    etiqueta="Tipo de sección"
                    valor={TIPOS_SECCION[tipo]}
                    opciones={Object.values(TIPOS_SECCION)}
                    onChange={(x) => setTipoSeccion(tipoPorRotulo(x))}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="b" etiqueta={conAla ? "bw (alma)" : "b"} sufijo="m" valor={b} onChange={setB} />
                    <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico
                      id="recubrimiento"
                      etiqueta="Recubrimiento geom."
                      sufijo="m"
                      valor={recubrimiento}
                      onChange={setRecubrimiento}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El recubrimiento se mide de la cara exterior al estribo.
                  </p>
                </Subgrupo>
                {conAla && (
                  <Subgrupo titulo={tipo === "t" ? "Ala superior" : "Ala inferior"}>
                    <div className="grid grid-cols-3 gap-4">
                      <CampoNumerico id="anchoAla" etiqueta="Ancho del ala" sufijo="m" valor={anchoAla} onChange={setAnchoAla} />
                      <CampoNumerico id="espesorAla" etiqueta="hf" sufijo="m" valor={espesorAla} onChange={setEspesorAla} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El ancho del ala es el real, de borde a borde, con los vuelos iguales a los dos lados.
                    </p>
                    <div className="space-y-3 rounded-md border border-border/60 p-3">
                      <p className="text-sm font-medium">Ancho eficaz: ¿cuánta ala trabaja?</p>
                      <p className="text-xs text-muted-foreground">
                        No toda el ala colabora: la que está lejos del alma se queda atrás. Cuánta trabaja
                        depende de l0, la distancia entre los puntos donde el momento se anula en la zona
                        donde el ala está comprimida (Anejo 19, art. 5.3.2.1 y fig. A19.5.2).{" "}
                        {tipo === "t"
                          ? "En la T el ala se comprime con el momento positivo: es el vano."
                          : "En la T invertida el ala se comprime con el momento negativo: es la zona sobre un apoyo, o un voladizo."}
                      </p>
                      <CampoSeleccion
                        id="tramoL0"
                        etiqueta="¿Dónde está el ala comprimida?"
                        valor={ROTULOS_TRAMO_L0[tramoL0]}
                        opciones={Object.values(ROTULOS_TRAMO_L0)}
                        onChange={(x) => setTramoL0(tramoL0PorRotulo(x))}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        {LUCES_TRAMO_L0[tramoL0].includes("l1") && (
                          <CampoNumerico id="luz1" etiqueta={ETIQUETAS_LUZ[tramoL0].luz1 ?? "l1"} sufijo="m" valor={luz1} onChange={setLuz1} />
                        )}
                        {LUCES_TRAMO_L0[tramoL0].includes("l2") && (
                          <CampoNumerico id="luz2" etiqueta={ETIQUETAS_LUZ[tramoL0].luz2 ?? "l2"} sufijo="m" valor={luz2} onChange={setLuz2} />
                        )}
                        {tramoL0 === "manual" && (
                          <CampoNumerico id="l0" etiqueta="l0" sufijo="m" valor={l0} onChange={setL0} />
                        )}
                      </div>
                      <p className="font-mono text-[13px] tabular-nums">
                        l0 = {Number.isFinite(l0Efectivo) && l0Efectivo > 0 ? `${fmt(l0Efectivo, 2)} m` : "—"}
                        {resultado?.seccionT && (
                          <span className="ml-3">
                            b_eff = <strong>{fmt(resultado.seccionT.anchoEficaz.anchoEficazM, 3)} m</strong>
                            <span className="ml-2 font-sans text-xs text-muted-foreground">
                              {resultado.seccionT.anchoEficaz.mandaAnchoReal ? "(manda el ancho real del ala)" : "(ec. 5.7)"}
                            </span>
                          </span>
                        )}
                      </p>
                    </div>
                  </Subgrupo>
                )}
              </>
            }
            dibujo={croquisGeometria}
          />
        </Etapa>

        <Etapa
          id="solicitaciones"
          numero={2}
          titulo="Solicitaciones"
          descripcion="Esfuerzos de cálculo ya mayorados. La herramienta no modela el vano ni las cargas."
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CampoNumerico id="momentoPos" etiqueta="M+ positivo" sufijo="kN·m" valor={momentoPos} onChange={setMomentoPos} />
              <CampoNumerico id="momentoNeg" etiqueta="M− negativo" sufijo="kN·m" valor={momentoNeg} onChange={setMomentoNeg} />
              <CampoNumerico id="vd" etiqueta="Vd cortante" sufijo="kN" valor={vd} onChange={setVd} />
            </div>
            <div className="flex justify-center">
              <ConvencionMomentosViga
                momentoPositivoKNm={aNumero(momentoPos) || 0}
                momentoNegativoKNm={aNumero(momentoNeg) || 0}
                resaltar={resaltarMomento}
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-start gap-2 text-sm">
                <input
                  id="monolitica"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                  checked={monolitica === "si"}
                  onChange={(e) => setMonolitica(e.target.checked ? "si" : "no")}
                />
                <span>
                  Construcción monolítica: el apoyo se dimensiona para al menos 0,15·M+
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                    Anejo 19, art. 9.2.1.2 (1)
                  </span>
                </span>
              </label>
              {resultado?.gobiernaMinimoApoyo && (
                <p className="pl-6 font-mono text-[13px] tabular-nums">
                  M− de cálculo = 0,15 · {fmt(resultado.v.momentoPos, 1)} ={" "}
                  <strong>{fmt(resultado.momentoNegativoCalculo, 1)} kN·m</strong>
                  <span className="ml-2 font-sans text-xs text-muted-foreground">
                    gobierna sobre el M− cargado ({fmt(resultado.v.momentoNeg, 1)} kN·m)
                  </span>
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Los dos momentos y el cortante se cargan en valor absoluto. El signo sólo dice qué
              cara tracciona y, por eso, qué armadura lo toma.
            </p>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Barras longitudinales por cara y estribos.">
          <DatosConDibujo
            datos={
              <Subgrupo titulo="Longitudinal">
                <EditorCapas
                  filas={[
                    capa("Inferior", 1, ["numeroPos", numeroPos, setNumeroPos], ["diametroPos", diametroPos, setDiametroPos]),
                    ...(aNumero(numeroPos2) > 0
                      ? [capa("Inferior", 2, ["numeroPos2", numeroPos2, setNumeroPos2], ["diametroPos2", diametroPos2, setDiametroPos2], () => setNumeroPos2("0"))]
                      : []),
                    capa("Superior", 1, ["numeroNeg", numeroNeg, setNumeroNeg], ["diametroNeg", diametroNeg, setDiametroNeg]),
                    ...(aNumero(numeroNeg2) > 0
                      ? [capa("Superior", 2, ["numeroNeg2", numeroNeg2, setNumeroNeg2], ["diametroNeg2", diametroNeg2, setDiametroNeg2], () => setNumeroNeg2("0"))]
                      : []),
                  ]}
                />
                <div className="flex flex-wrap gap-x-5">
                  {!(aNumero(numeroPos2) > 0) && (
                    <button type="button" className={botonCapa} onClick={() => setNumeroPos2("2")}>
                      + 2ª capa inferior
                    </button>
                  )}
                  {!(aNumero(numeroNeg2) > 0) && (
                    <button type="button" className={botonCapa} onClick={() => setNumeroNeg2("2")}>
                      + 2ª capa superior
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  La inferior toma el momento positivo; la superior, el negativo.
                </p>
              </Subgrupo>
            }
            dibujo={dibujoSeccion}
          />

          {conAla && (
            <div className="mt-10 max-w-xl">
              <Subgrupo titulo="Transversal del ala">
                <div className="grid grid-cols-3 gap-4">
                  <CampoDiametro id="diametroAla" etiqueta="Ø" valor={diametroAla} onChange={setDiametroAla} />
                  <CampoNumerico id="separacionAla" etiqueta="Separación" sufijo="m" valor={separacionAla} onChange={setSeparacionAla} />
                  <CampoNumerico id="capasAla" etiqueta="Capas" valor={capasAla} onChange={setCapasAla} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Las barras del ala que cruzan la unión con el alma, por metro de viga. Son las que toman
                  el rasante entre ala y alma (art. 6.2.4).
                </p>
              </Subgrupo>
            </div>
          )}

          <div className="mt-10">
            <DatosConDibujo
              datos={
                <Subgrupo titulo="Transversal · estribos">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
                    <CampoNumerico id="numeroRamas" etiqueta="Nº de ramas" valor={numeroRamas} onChange={setNumeroRamas} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Las ramas son las patas verticales que cortan la sección en un mismo plano: un
                    estribo cerrado aporta 2. La separación a lo largo de la viga no se carga: la
                    calcula la herramienta y aparece en los resultados.
                  </p>
                </Subgrupo>
              }
              dibujo={
                <EstriboTransversal
                  ramas={aNumero(numeroRamas)}
                  diametroMm={aNumero(diametroEstribo)}
                  resaltado={resaltarSeccion === "estribo"}
                />
              }
            />
          </div>
        </Etapa>

        <Etapa
          id="revision"
          numero={4}
          titulo="Revisión"
          descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos."
        >
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Sección", valor: TIPOS_SECCION[tipo] },
              { etiqueta: conAla ? "bw × h" : "b × h", valor: `${b} × ${h} m` },
              ...(conAla
                ? [
                    { etiqueta: "Ala: ancho × hf", valor: `${anchoAla} × ${espesorAla} m` },
                    {
                      etiqueta: "l0",
                      valor: tramoL0 === "manual" ? `${l0} m (a mano)` : `${fmt(l0Efectivo, 2)} m (${ROTULOS_TRAMO_L0[tramoL0].toLowerCase()})`,
                    },
                    ...(resultado?.seccionT
                      ? [{ etiqueta: "Ancho eficaz b_eff", valor: `${fmt(resultado.seccionT.anchoEficaz.anchoEficazM, 3)} m`, derivado: true }]
                      : []),
                  ]
                : []),
              { etiqueta: "Recubrimiento geom.", valor: `${recubrimiento} m` },
              ...(resultado
                ? [
                    { etiqueta: "Canto útil d⁺", valor: `${fmt(resultado.d, 3)} m`, derivado: true },
                    { etiqueta: "Canto útil d⁻", valor: `${fmt(resultado.dNegativo, 3)} m`, derivado: true },
                    { etiqueta: "As inferior", valor: `${fmt(resultado.flexionPositiva.asRealCm2)} cm²`, derivado: true },
                    { etiqueta: "As superior", valor: `${fmt(resultado.flexionNegativa.asRealCm2)} cm²`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "γc = 1,5 y γs = 1,15: fcd = fck/γc, fyd = fyk/γs.",
              "Flexión con bloque rectangular de compresión de canto 0,8·x y tensión fcd.",
              "Cuantía mínima de tracción As,min = W/z · fctm,fl/fyd, con z = 0,8·h (Anejo 19, art. 9.2.1.1 (1), ec. (9.1)).",
              ...(conAla
                ? [
                    "Sección en T: ancho eficaz del ala por la ec. (5.7), con alas iguales a los dos lados y tope en el ancho real.",
                    tipo === "t"
                      ? "El ala está arriba: colabora con el momento positivo. Con el negativo queda traccionada y su armadura se reparte en el ancho eficaz (art. 9.2.1.2 (2))."
                      : "El ala está abajo: colabora con el momento negativo. Con el positivo queda traccionada y su armadura se reparte en el ancho eficaz (art. 9.2.1.2 (2)).",
                    "Con el ala comprimida, si el bloque baja al alma los vuelos toman (b_eff − bw)·hf·fcd y el alma el resto.",
                    "W de la ec. (9.1) con la T de ancho b_eff, respecto de la fibra que tracciona en cada caso.",
                    "Rasante entre ala y alma por el art. 6.2.4: ΔFd = compresión en el vuelo de un lado con el momento máximo, en Δx = l0/4; cot θf el mayor que cumple la ec. (6.22). No combina con la flexión transversal del ala (6.2.4 (5)).",
                    "El cortante del alma usa bw. El ala como apoyo de losas (talón de la T invertida) no se verifica acá.",
                  ]
                : []),
              "Canto útil d⁺ hasta la armadura inferior para M+; d⁻ hasta la superior para M− y para el cortante.",
              "Cortante por el art. 6.2.3: estribos verticales, θ = 45° y z = 0,9·d. Si VEd > VRd,c los estribos toman el cortante entero (ec. 6.8), sin sumar el hormigón.",
              "fywd = mín(fyd; 0,8·fyk), que es lo que habilita ν1 = 0,6 en VRd,max (nota del art. 6.2.3(3)).",
              "Mínima ρw,min = 0,08·√fck/fyk y separación máxima 0,75·d (art. 9.2.2). La adoptada se topa además en 25 cm: criterio de oficina, no de la norma.",
              "La cuantía ρl del cortante se toma con la armadura superior.",
              "La separación de estribos la dimensiona la herramienta: no es un dato.",
              monolitica === "si"
                ? "Construcción monolítica: M− de cálculo ≥ 0,15·M+ (Anejo 19, art. 9.2.1.2 (1), pág. 140)."
                : "Sin mínimo de empotramiento parcial: la viga no es monolítica con sus apoyos.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionResultados
                comprobaciones={[
                  {
                    etiqueta: "flexión positiva",
                    estado: resultado.flexionPositiva.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.flexionPositiva.asNecCm2 / resultado.flexionPositiva.asRealCm2,
                    conPropuestas: !!rec.positiva,
                  },
                  {
                    etiqueta: "flexión negativa",
                    estado: resultado.flexionNegativa.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.flexionNegativa.asNecCm2 / resultado.flexionNegativa.asRealCm2,
                    conPropuestas: !!rec.negativa,
                  },
                  {
                    etiqueta: "compresión oblicua del alma",
                    estado: resultado.cortante.verificaVRdMax ? "cumple" : "no-cumple",
                    utilizacion: aNumero(vd) / resultado.cortante.vRdMax,
                    conPropuestas: !!rec.bielas,
                  },
                  {
                    etiqueta: "separación transversal entre ramas",
                    estado: resultado.cortante.verificaSeparacionTransversal ? "cumple" : "no-cumple",
                    utilizacion: resultado.cortante.separacionTransversalM / resultado.cortante.separacionTransversalMaxM,
                    conPropuestas: !!rec.ramas,
                  },
                  ...(resultado.seccionT?.rasante
                    ? [
                        {
                          etiqueta: "bielas del ala",
                          estado: resultado.seccionT.rasante.verificaBielas ? ("cumple" as const) : ("no-cumple" as const),
                          utilizacion: resultado.seccionT.rasante.vEdMPa / resultado.seccionT.rasante.vRdMaxMPa,
                          conPropuestas: !!rec.rasanteBielas,
                        },
                        {
                          etiqueta: "armadura transversal del ala",
                          estado: resultado.seccionT.rasante.verificaArmadura ? ("cumple" as const) : ("no-cumple" as const),
                          ...(resultado.seccionT.rasante.requiereArmadura
                            ? { utilizacion: resultado.seccionT.rasante.asNecCm2PorM / resultado.seccionT.rasante.asRealCm2PorM }
                            : {}),
                          conPropuestas: !!rec.rasanteArmadura,
                        },
                      ]
                    : []),
                  {
                    etiqueta: "armadura inferior en el ancho",
                    estado: resultado.flexionPositiva.verificaEntraEnAncho ? "cumple" : "no-cumple",
                    conPropuestas: !!rec.anchoInferior,
                  },
                  {
                    etiqueta: "armadura superior en el ancho",
                    estado: resultado.flexionNegativa.verificaEntraEnAncho ? "cumple" : "no-cumple",
                    conPropuestas: !!rec.anchoSuperior,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Canto útil d⁺ / d⁻", valor: `${fmt(resultado.d, 3)} / ${fmt(resultado.dNegativo, 3)} m` },
                  {
                    etiqueta: "As nec. inferior",
                    valor: asNecesaria(resultado.flexionPositiva),
                    nota: `colocada ${fmt(resultado.flexionPositiva.asRealCm2)} cm²`,
                  },
                  {
                    etiqueta: "As nec. superior",
                    valor: asNecesaria(resultado.flexionNegativa),
                    nota: `colocada ${fmt(resultado.flexionNegativa.asRealCm2)} cm²`,
                  },
                  {
                    etiqueta: "VRd,max",
                    valor: `${fmt(resultado.cortante.vRdMax)} kN`,
                    nota: `Vd ${fmt(aNumero(vd))} kN`,
                  },
                ]}
              />

              <Subgrupo titulo="Comprobaciones resistentes">
                <div>
                  <ResultadoCheck
                    etiqueta="Flexión positiva · armadura inferior suficiente"
                    detalle={motivoSobrearmada(resultado.flexionPositiva)}
                    verifica={resultado.flexionPositiva.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.flexionPositiva.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.flexionPositiva.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.positiva}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de flexión positiva"
                    filas={[
                      { etiqueta: "d⁺", valor: `${fmt(resultado.d, 3)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionPositiva.mu, 5) },
                      { etiqueta: "μlim (el acero fluye)", valor: fmt(resultado.flexionPositiva.muLim, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionPositiva.omega, 5) },
                      { etiqueta: "As calculado", valor: `${fmt(resultado.flexionPositiva.asCalculadoCm2)} cm²` },
                      { etiqueta: "fctm,fl", valor: `${fmt(resultado.flexionPositiva.fctmFlMPa, 2)} MPa` },
                      ...(resultado.flexionPositiva.alaComprimida
                        ? [
                            { etiqueta: "Bloque comprimido", valor: resultado.flexionPositiva.alaComprimida.bloqueEnAla ? "dentro del ala (rectángulo de b_eff)" : "baja al alma" },
                            { etiqueta: "Compresión en los vuelos del ala", valor: `${fmt(resultado.flexionPositiva.alaComprimida.compresionVuelosKN)} kN` },
                          ]
                        : []),
                      conAla
                        ? { etiqueta: "As,min", formula: "W/(0,8·h) · fctm,fl/fyd, W de la T", valor: `${fmt(resultado.flexionPositiva.asMinCm2)} cm² (Anejo 19, 9.2.1.1)` }
                        : {
                            etiqueta: "As,min",
                            formula: "b·h/4,8 · fctm,fl/fyd",
                            sustitucion: `${fmt(aNumero(b), 2)}·${fmt(aNumero(h), 2)}/4,8 · ${fmt(resultado.flexionPositiva.fctmFlMPa, 2)}/${fmt(resultado.materiales.fyd, 1)}`,
                            valor: `${fmt(resultado.flexionPositiva.asMinCm2)} cm² (Anejo 19, 9.2.1.1)`,
                          },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Flexión negativa · armadura superior suficiente"
                    detalle={motivoSobrearmada(resultado.flexionNegativa)}
                    verifica={resultado.flexionNegativa.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.flexionNegativa.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.flexionNegativa.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.negativa}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de flexión negativa"
                    filas={[
                      {
                        etiqueta: "M− de cálculo",
                        valor: `${fmt(resultado.momentoNegativoCalculo, 2)} kN·m${resultado.gobiernaMinimoApoyo ? " (0,15·M+)" : ""}`,
                      },
                      { etiqueta: "d⁻", valor: `${fmt(resultado.dNegativo, 3)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionNegativa.mu, 5) },
                      { etiqueta: "μlim (el acero fluye)", valor: fmt(resultado.flexionNegativa.muLim, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionNegativa.omega, 5) },
                      { etiqueta: "As calculado", valor: `${fmt(resultado.flexionNegativa.asCalculadoCm2)} cm²` },
                      { etiqueta: "fctm,fl", valor: `${fmt(resultado.flexionNegativa.fctmFlMPa, 2)} MPa` },
                      ...(resultado.flexionNegativa.alaComprimida
                        ? [
                            { etiqueta: "Bloque comprimido", valor: resultado.flexionNegativa.alaComprimida.bloqueEnAla ? "dentro del ala (rectángulo de b_eff)" : "baja al alma" },
                            { etiqueta: "Compresión en los vuelos del ala", valor: `${fmt(resultado.flexionNegativa.alaComprimida.compresionVuelosKN)} kN` },
                          ]
                        : []),
                      conAla
                        ? { etiqueta: "As,min", formula: "W/(0,8·h) · fctm,fl/fyd, W de la T", valor: `${fmt(resultado.flexionNegativa.asMinCm2)} cm² (Anejo 19, 9.2.1.1)` }
                        : {
                            etiqueta: "As,min",
                            formula: "b·h/4,8 · fctm,fl/fyd",
                            sustitucion: `${fmt(aNumero(b), 2)}·${fmt(aNumero(h), 2)}/4,8 · ${fmt(resultado.flexionNegativa.fctmFlMPa, 2)}/${fmt(resultado.materiales.fyd, 1)}`,
                            valor: `${fmt(resultado.flexionNegativa.asMinCm2)} cm² (Anejo 19, 9.2.1.1)`,
                          },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Cortante · compresión oblicua del alma"
                    verifica={resultado.cortante.verificaVRdMax}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: aNumero(vd) },
                      limite: { etiqueta: "VRd,max", valor: resultado.cortante.vRdMax },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.bielas}
                  />
                  <ResultadoCheck
                    etiqueta="Separación transversal entre ramas"
                    verifica={resultado.cortante.verificaSeparacionTransversal}
                    detalle="Ramas repartidas parejo, entre ejes. Anejo 19, art. 9.2.2 (8), ec. (9.8): st,max = 0,75·d ≤ 600 mm."
                    comparacion={{
                      real: { etiqueta: "st", valor: resultado.cortante.separacionTransversalM * 100 },
                      limite: { etiqueta: "st,max", valor: resultado.cortante.separacionTransversalMaxM * 100 },
                      unidad: "cm", exige: "≤", decimales: 1,
                    }}
                    recomendaciones={rec.ramas}
                  />
                </div>
              </Subgrupo>

              {resultado.seccionT && (
                <Subgrupo titulo="Ala de la T" detalle={`b_eff = ${fmt(resultado.seccionT.anchoEficaz.anchoEficazM, 3)} m`}>
                  <div>
                    <PanelFormulas
                      titulo="Ver desarrollo del ancho eficaz"
                      filas={[
                        { etiqueta: "Vuelo real de cada lado b_i", valor: `${fmt(resultado.seccionT.anchoEficaz.vueloM, 3)} m` },
                        {
                          etiqueta: "b_eff,i",
                          formula: "0,2·b_i + 0,1·l0 ≤ 0,2·l0; ≤ b_i  (5.7a, 5.7b)",
                          valor: `${fmt(resultado.seccionT.anchoEficaz.vueloEficazM, 3)} m`,
                        },
                        {
                          etiqueta: "b_eff",
                          formula: "Σ b_eff,i + bw ≤ b  (5.7)",
                          valor: `${fmt(resultado.seccionT.anchoEficaz.anchoEficazM, 3)} m${resultado.seccionT.anchoEficaz.mandaAnchoReal ? " (manda el ancho real)" : ""}`,
                        },
                      ]}
                    />
                    {resultado.seccionT.rasante ? (
                      <>
                        <ResultadoCheck
                          etiqueta="Rasante ala–alma · bielas del ala"
                          verifica={resultado.seccionT.rasante.verificaBielas}
                          detalle={`Anejo 19, art. 6.2.4 (4), ec. (6.22), con cot θf = ${fmt(resultado.seccionT.rasante.cotTheta, 2)}.`}
                          comparacion={{
                            real: { etiqueta: "vEd", valor: resultado.seccionT.rasante.vEdMPa },
                            limite: { etiqueta: "ν·fcd·senθf·cosθf", valor: resultado.seccionT.rasante.vRdMaxMPa },
                            unidad: "MPa", exige: "≤", decimales: 3,
                          }}
                          recomendaciones={rec.rasanteBielas}
                        />
                        {resultado.seccionT.rasante.requiereArmadura ? (
                          <ResultadoCheck
                            etiqueta="Rasante ala–alma · armadura transversal del ala"
                            verifica={resultado.seccionT.rasante.verificaArmadura}
                            detalle="Anejo 19, art. 6.2.4 (4), ec. (6.21): Asf·fyd/sf ≥ vEd·hf/cot θf."
                            comparacion={{
                              real: { etiqueta: "Asf/sf real", valor: resultado.seccionT.rasante.asRealCm2PorM },
                              limite: { etiqueta: "Asf/sf nec", valor: resultado.seccionT.rasante.asNecCm2PorM },
                              unidad: "cm²/m", exige: "≥",
                            }}
                            recomendaciones={rec.rasanteArmadura}
                          />
                        ) : (
                          <ResultadoCheck
                            etiqueta="Rasante ala–alma · armadura transversal del ala"
                            verifica
                            detalle={`vEd = ${fmt(resultado.seccionT.rasante.vEdMPa, 3)} ≤ 0,4·fctd = ${fmt(resultado.seccionT.rasante.limiteSinArmaduraMPa, 3)} MPa: no hace falta armadura adicional a la de flexión (art. 6.2.4 (6)).`}
                          />
                        )}
                        <PanelFormulas
                          titulo="Ver desarrollo del rasante"
                          filas={[
                            { etiqueta: "Momento que comprime el ala", valor: `${fmt(resultado.seccionT.momentoAlaComprimidaKNm, 1)} kN·m` },
                            { etiqueta: "ΔFd: compresión en el vuelo de un lado", valor: `${fmt(resultado.seccionT.rasante.deltaFKN)} kN` },
                            { etiqueta: "Δx = l0/4", valor: `${fmt(resultado.seccionT.rasante.deltaXM, 3)} m` },
                            { etiqueta: "vEd = ΔFd/(hf·Δx)  (6.20)", valor: `${fmt(resultado.seccionT.rasante.vEdMPa, 3)} MPa` },
                            { etiqueta: "0,4·fctd  (6.2.4 (6))", valor: `${fmt(resultado.seccionT.rasante.limiteSinArmaduraMPa, 3)} MPa` },
                            { etiqueta: "cot θf adoptado", valor: fmt(resultado.seccionT.rasante.cotTheta, 2) },
                            { etiqueta: "Transversal del ala colocada", valor: `${fmt(resultado.seccionT.asTransversalAlaCm2PorM)} cm²/m` },
                          ]}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin momento que comprima el ala no hay rasante entre ala y alma que verificar.
                      </p>
                    )}
                  </div>
                </Subgrupo>
              )}

              <Subgrupo titulo="Condiciones constructivas" detalle="disposición del armado, sin magnitudes que comparar">
                <div>
                  <ResultadoCheck
                    etiqueta="La armadura inferior entra en el ancho"
                    verifica={resultado.flexionPositiva.verificaEntraEnAncho}
                    detalle={`${describirCapas(resultado.flexionPositiva.capas)} · máx. por fila ${resultado.flexionPositiva.capacidadPorGrupo.join(" + ")}`}
                    recomendaciones={rec.anchoInferior}
                  />
                  <ResultadoCheck
                    etiqueta="La armadura superior entra en el ancho"
                    verifica={resultado.flexionNegativa.verificaEntraEnAncho}
                    detalle={`${describirCapas(resultado.flexionNegativa.capas)} · máx. por fila ${resultado.flexionNegativa.capacidadPorGrupo.join(" + ")}`}
                    recomendaciones={rec.anchoSuperior}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Estribado adoptado" detalle="dimensionamiento, no verificación">
                <DatosConDibujo
                  datos={
                    <>
                      <p className="font-mono text-base font-semibold tabular-nums">
                        {fmt(aNumero(numeroRamas), 0)} ramas Ø{fmt(aNumero(diametroEstribo), 0)} cada{" "}
                        {fmt(resultado.cortante.separacionAdoptadaM * 100, 0)} cm
                      </p>
                      <p className="text-sm text-muted-foreground">
                        La herramienta elige la separación con las ramas y el diámetro cargados. Área
                        resultante {fmt(resultado.cortante.areaRealCm2PorM)} cm²/m; necesaria{" "}
                        {fmt(resultado.cortante.a90Cm2PorM)} cm²/m.
                      </p>
                      <PanelFormulas
                        titulo="Ver desarrollo del cortante"
                        filas={[
                          { etiqueta: "d⁻", valor: `${fmt(resultado.dNegativo, 3)} m` },
                          { etiqueta: "k", valor: fmt(resultado.cortante.k, 3) },
                          { etiqueta: "ρl", valor: fmt(resultado.cortante.rhoL, 5) },
                          { etiqueta: "VRd,c", valor: `${fmt(resultado.cortante.vRdC)} kN` },
                          { etiqueta: "VRd,c,mín", valor: `${fmt(resultado.cortante.vRdCMin)} kN` },
                          { etiqueta: "VEd que toman los estribos  (6.8)", valor: resultado.cortante.requiereEstribos ? `${fmt(resultado.cortante.vEdEstribos)} kN` : "0 (VEd ≤ VRd,c)" },
                          { etiqueta: "A90 necesaria", valor: `${fmt(resultado.cortante.a90NecCm2PorM)} cm²/m` },
                          { etiqueta: "A90 mínima ρw,min·b  (9.5)", valor: `${fmt(resultado.cortante.a90MinCm2PorM)} cm²/m` },
                          { etiqueta: "Separación necesaria", valor: `${fmt(resultado.cortante.separacionNecM * 100, 1)} cm` },
                          { etiqueta: "Separación máxima 0,75·d  (9.6)", valor: `${fmt(resultado.cortante.separacionMaxM * 100, 1)} cm` },
                          { etiqueta: "Tope de oficina (no del Anejo)", valor: "25 cm" },
                        ]}
                      />
                    </>
                  }
                  dibujo={
                    <EstriboLongitudinal
                      separacionM={resultado.cortante.separacionAdoptadaM}
                      diametroMm={aNumero(diametroEstribo)}
                    />
                  }
                />
              </Subgrupo>

              {!resultado.flexionPositiva.sobrearmada && !conAla && (
              <Subgrupo titulo="Estado de rotura con el momento positivo">
                <div className="mx-auto w-full max-w-xl">
                  <DiagramaRotura
                    bM={aNumero(b)}
                    hM={aNumero(h)}
                    dM={resultado.flexionPositiva.d}
                    xM={resultado.flexionPositiva.xM}
                    zM={resultado.flexionPositiva.zM}
                    deformacionAcero={resultado.flexionPositiva.deformacionAcero}
                    deformacionFluencia={resultado.materiales.fyd / 200000}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Si la deformación del acero supera la de fluencia, la rotura avisa antes de
                  producirse.
                </p>
              </Subgrupo>
              )}

              <PanelVinculos
                vinculos={VINCULOS_SERVICIO}
                datos={{
                  fck, fyk, b, h, recubrimiento,
                  numeroPos, diametroPos, numeroPos2, diametroPos2,
                  diametroNeg, diametroEstribo,
                  // Fisuración y deformaciones ya calculan la T: viaja con su ala.
                  seccionT: conAla
                    ? { tipoSeccion, anchoAla, espesorAla, tramoL0: tramoL0Campo, luz1, luz2, l0 }
                    : undefined,
                  dUtilM: resultado.d,
                  asNecPosCm2: resultado.flexionPositiva.asNecCm2,
                  asRealPosCm2: resultado.flexionPositiva.asRealCm2,
                }}
              />
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
