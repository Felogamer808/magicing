"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
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
import { armarGrupos, resolverVigaFlexionCortante } from "@/lib/calc/hormigon/vigas/resolver";
import { calcularDisposicionArmadura } from "@/lib/calc/hormigon/vigas/flexion-cortante";
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
  const resultado = useMemo(
    () =>
      resolverVigaFlexionCortante({
        fck, fyk, b, h, recubrimiento,
        momentoPos, numeroPos, diametroPos, numeroPos2, diametroPos2,
        momentoNeg, numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
        vd, diametroEstribo, numeroRamas, monolitica,
      }),
    [
    fck, fyk, b, h, recubrimiento,
    momentoPos, numeroPos, diametroPos, numeroPos2, diametroPos2,
    momentoNeg, numeroNeg, diametroNeg, numeroNeg2, diametroNeg2,
    vd, diametroEstribo, numeroRamas, monolitica,
    ]
  );

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

    const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento };
    const gruposPositiva = armarGrupos(v.numeroPos, v.diametroPos, v.numeroPos2, v.diametroPos2);
    const gruposNegativa = armarGrupos(v.numeroNeg, v.diametroNeg, v.numeroNeg2, v.diametroNeg2);
    const disposicionPositiva = calcularDisposicionArmadura(geometria, gruposPositiva);
    const disposicionNegativa = calcularDisposicionArmadura(geometria, gruposNegativa);
    const d = geometria.h - disposicionPositiva.distanciaCentroideM;

    return {
      bM: v.b,
      hM: v.h,
      recubrimientoM: v.recubrimiento,
      dM: d,
      armaduraPositiva: { capas: disposicionPositiva.filas },
      armaduraNegativa: { capas: disposicionNegativa.filas },
      diametroEstriboMm: v.diametroEstribo,
    };
  }, [
    b, h, recubrimiento,
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

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });
  } else {
    if (noEntra.inferior) avisos.push({ tipo: "aviso", texto: "La armadura inferior no entra en el ancho disponible." });
    if (resultado.gobiernaMinimoApoyo)
      avisos.push({
        tipo: "aviso",
        texto: `La armadura superior se dimensiona para el mínimo de apoyo, ${fmt(resultado.momentoNegativoCalculo, 1)} kN·m, mayor que el M− cargado.`,
      });
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
          descripcion="La sección rectangular y los materiales que la forman."
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
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
                    <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico
                      id="recubrimiento"
                      etiqueta="Recubrimiento"
                      sufijo="m"
                      valor={recubrimiento}
                      onChange={setRecubrimiento}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El recubrimiento se mide de la cara exterior al estribo.
                  </p>
                </Subgrupo>
              </>
            }
            dibujo={dibujoSeccion}
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
              { etiqueta: "b × h", valor: `${b} × ${h} m` },
              { etiqueta: "Recubrimiento", valor: `${recubrimiento} m` },
              ...(resultado
                ? [
                    { etiqueta: "Canto útil d", valor: `${fmt(resultado.d, 3)} m`, derivado: true },
                    { etiqueta: "As inferior", valor: `${fmt(resultado.flexionPositiva.asRealCm2)} cm²`, derivado: true },
                    { etiqueta: "As superior", valor: `${fmt(resultado.flexionNegativa.asRealCm2)} cm²`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "γc = 1,5 y γs = 1,15: fcd = fck/γc, fyd = fyk/γs.",
              "Flexión con bloque rectangular de compresión de canto 0,8·x y tensión fcd.",
              "El canto útil d se mide hasta el centroide de la armadura inferior y se usa para los dos momentos.",
              "Cortante con estribos verticales, brazo 0,9·d y fyd de estribos limitada a 400 MPa.",
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
                  },
                  {
                    etiqueta: "flexión negativa",
                    estado: resultado.flexionNegativa.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.flexionNegativa.asNecCm2 / resultado.flexionNegativa.asRealCm2,
                  },
                  {
                    etiqueta: "compresión oblicua del alma",
                    estado: resultado.cortante.verificaVRdMax ? "cumple" : "no-cumple",
                    utilizacion: aNumero(vd) / resultado.cortante.vRdMax,
                  },
                  {
                    etiqueta: "armadura inferior en el ancho",
                    estado: resultado.flexionPositiva.verificaEntraEnAncho ? "cumple" : "no-cumple",
                  },
                  {
                    etiqueta: "armadura superior en el ancho",
                    estado: resultado.flexionNegativa.verificaEntraEnAncho ? "cumple" : "no-cumple",
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Canto útil d", valor: `${fmt(resultado.d, 3)} m` },
                  {
                    etiqueta: "As nec. inferior",
                    valor: `${fmt(resultado.flexionPositiva.asNecCm2)} cm²`,
                    nota: `colocada ${fmt(resultado.flexionPositiva.asRealCm2)} cm²`,
                  },
                  {
                    etiqueta: "As nec. superior",
                    valor: `${fmt(resultado.flexionNegativa.asNecCm2)} cm²`,
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
                    verifica={resultado.flexionPositiva.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.flexionPositiva.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.flexionPositiva.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de flexión positiva"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.d, 3)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionPositiva.mu, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionPositiva.omega, 5) },
                      { etiqueta: "As calculado", valor: `${fmt(resultado.flexionPositiva.asCalculadoCm2)} cm²` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.flexionPositiva.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.flexionPositiva.asMinGeometricoCm2)} cm²` },
                    ]}
                  />
                  <ResultadoCheck
                    etiqueta="Flexión negativa · armadura superior suficiente"
                    verifica={resultado.flexionNegativa.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.flexionNegativa.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.flexionNegativa.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de flexión negativa"
                    filas={[
                      {
                        etiqueta: "M− de cálculo",
                        valor: `${fmt(resultado.momentoNegativoCalculo, 2)} kN·m${resultado.gobiernaMinimoApoyo ? " (0,15·M+)" : ""}`,
                      },
                      { etiqueta: "d", valor: `${fmt(resultado.d, 3)} m` },
                      { etiqueta: "μ", valor: fmt(resultado.flexionNegativa.mu, 5) },
                      { etiqueta: "ω", valor: fmt(resultado.flexionNegativa.omega, 5) },
                      { etiqueta: "As calculado", valor: `${fmt(resultado.flexionNegativa.asCalculadoCm2)} cm²` },
                      { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.flexionNegativa.asMinMecanicoCm2)} cm²` },
                      { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.flexionNegativa.asMinGeometricoCm2)} cm²` },
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
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas" detalle="disposición del armado, sin magnitudes que comparar">
                <div>
                  <ResultadoCheck
                    etiqueta="La armadura inferior entra en el ancho"
                    verifica={resultado.flexionPositiva.verificaEntraEnAncho}
                    detalle={`${describirCapas(resultado.flexionPositiva.capas)} · máx. por fila ${resultado.flexionPositiva.capacidadPorGrupo.join(" + ")}`}
                  />
                  <ResultadoCheck
                    etiqueta="La armadura superior entra en el ancho"
                    verifica={resultado.flexionNegativa.verificaEntraEnAncho}
                    detalle={`${describirCapas(resultado.flexionNegativa.capas)} · máx. por fila ${resultado.flexionNegativa.capacidadPorGrupo.join(" + ")}`}
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
                          { etiqueta: "k", valor: fmt(resultado.cortante.k, 3) },
                          { etiqueta: "ρl", valor: fmt(resultado.cortante.rhoL, 5) },
                          { etiqueta: "VRd,c", valor: `${fmt(resultado.cortante.vRdC)} kN` },
                          { etiqueta: "VRd,c,mín", valor: `${fmt(resultado.cortante.vRdCMin)} kN` },
                          { etiqueta: "Vd a resistir por estribos", valor: `${fmt(resultado.cortante.vEdEstribos)} kN` },
                          { etiqueta: "A90 necesaria", valor: `${fmt(resultado.cortante.a90NecCm2PorM)} cm²/m` },
                          { etiqueta: "A90 mínima", valor: `${fmt(resultado.cortante.a90MinCm2PorM)} cm²/m` },
                          { etiqueta: "Separación necesaria", valor: `${fmt(resultado.cortante.separacionNecM * 100, 1)} cm` },
                          { etiqueta: "Separación máxima admitida", valor: `${fmt(resultado.cortante.separacionMaxM * 100, 1)} cm` },
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

              <PanelVinculos
                vinculos={VINCULOS_SERVICIO}
                datos={{
                  fck, fyk, b, h, recubrimiento,
                  numeroPos, diametroPos, numeroPos2, diametroPos2,
                  diametroNeg,
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
