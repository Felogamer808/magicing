"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisCargaColgada } from "@/components/verificaciones/croquis/CroquisVarios";
import { calcularCuelgue } from "@/lib/calc/hormigon/vigas/cuelgue";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "carga-colgada")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y carga" },
  { id: "armadura", titulo: "Estribos" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function CargaColgadaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [reaccion, setReaccion] = useCampo("reaccion", "200");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "10");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "2");
  const [h, setH] = useCampo("h", "0.5");
  const [a, setA] = useCampo("a", "0.3");

  const resultado = useMemo(() => {
    const v = {
      reaccion: aNumero(reaccion),
      fyk: aNumero(fyk),
      diametroEstribo: aNumero(diametroEstribo),
      numeroRamas: aNumero(numeroRamas),
      h: aNumero(h),
      a: aNumero(a),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;

    const r = calcularCuelgue(
      { fykMPa: v.fyk },
      { hM: v.h, aM: v.a },
      { reaccionKN: v.reaccion, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas }
    );
    return { v, r };
  }, [reaccion, fyk, diametroEstribo, numeroRamas, h, a]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: todos tienen que ser positivos." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Vigas · dimensionamiento</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría y carga" descripcion="La viga que cuelga y la reacción que hay que suspender.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="reaccion" etiqueta="Rd (reacción colgada)" sufijo="kN" valor={reaccion} onChange={setReaccion} />
                <div />
                <CampoNumerico id="h" etiqueta="h (viga que cuelga)" sufijo="m" valor={h} onChange={setH} />
                <CampoNumerico id="a" etiqueta="a (ancho colgado)" sufijo="m" valor={a} onChange={setA} />
              </div>
            }
            dibujo={<CroquisCargaColgada />}
          />
        </Etapa>

        <Etapa id="armadura" numero={2} titulo="Estribos" descripcion="Acero y estribo con el que se cuelga la carga.">
          <div className="grid max-w-2xl grid-cols-3 gap-4">
            <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
            <CampoNumerico id="numeroRamas" etiqueta="Ramas por estribo" valor={numeroRamas} onChange={setNumeroRamas} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Rd", valor: `${reaccion} kN` },
              { etiqueta: "h × a", valor: `${h} × ${a} m` },
              { etiqueta: "Estribo", valor: `Ø${diametroEstribo}, ${numeroRamas} ramas` },
              ...(resultado ? [{ etiqueta: "fyd", valor: `${fmt(resultado.r.fydMPa)} MPa`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Carga totalmente colgada (Jiménez Montoya §24.9.1): actúa por debajo de la zona comprimida y se suspende con estribos anclados en la cara comprimida opuesta.",
              "El Anejo 19 exige esta armadura (art. 9.2.5, apoyos indirectos) pero no fija el número: As·fyd ≥ Rd es el criterio del manual.",
              "No contempla el apoyo indirecto con reparto entre fracción directa y colgada.",
              "La cantidad de estribos es un dimensionamiento, no una verificación.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!resultado ? (
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
                  { etiqueta: "As necesaria", valor: `${fmt(resultado.r.asNecesariaCm2)} cm²` },
                  { etiqueta: "Área por estribo", valor: `${fmt(resultado.r.areaPorEstriboCm2)} cm²`, nota: `${fmt(resultado.v.numeroRamas, 0)} ramas Ø${fmt(resultado.v.diametroEstribo, 0)}` },
                  { etiqueta: "Estribos", valor: `${resultado.r.cantidadEstribos}`, nota: "dimensionado" },
                  { etiqueta: "Canto mínimo", valor: `${fmt(resultado.r.cantoMinimoM, 2)} m`, nota: "1,2·a" },
                ]}
              />

              <Subgrupo titulo="Estribado adoptado" detalle="dimensionamiento, no verificación">
                <div className="space-y-2">
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {resultado.r.cantidadEstribos} estribos Ø{fmt(resultado.v.diametroEstribo, 0)} de {fmt(resultado.v.numeroRamas, 0)} ramas
                  </p>
                  <PanelFormulas
                    titulo="Ver desarrollo de la armadura de cuelgue"
                    filas={[
                      { etiqueta: "As", formula: "Rd / fyd", sustitucion: `${fmt(resultado.v.reaccion)} / ${fmt(resultado.r.fydMPa)}`, valor: `${fmt(resultado.r.asNecesariaCm2)} cm²` },
                      { etiqueta: "N° estribos", formula: "As / (ramas·área barra)", sustitucion: `${fmt(resultado.r.asNecesariaCm2)} / ${fmt(resultado.r.areaPorEstriboCm2)}`, valor: `${resultado.r.cantidadEstribos}` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Condiciones constructivas">
                <div>
                  <ResultadoCheck
                    etiqueta="Canto suficiente para que se formen las bielas"
                    verifica={resultado.r.verificaCanto}
                    comparacion={{ real: { etiqueta: "h", valor: resultado.v.h }, limite: { etiqueta: "1,2·a", valor: resultado.r.cantoMinimoM }, unidad: "m", exige: "≥", decimales: 2 }}
                  />
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
