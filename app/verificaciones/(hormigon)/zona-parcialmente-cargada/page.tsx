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
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisZonaCargada } from "@/components/verificaciones/croquis/CroquisZonaCargada";
import { type TraccionTransversal } from "@/lib/calc/hormigon/zona-parcialmente-cargada";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { resolverZonaParcialmenteCargada } from "@/lib/calc/hormigon/resolver-zona-parcialmente-cargada";
import { recomendarZonaParcialmenteCargada } from "@/lib/verificaciones/recomendaciones/zona-parcialmente-cargada";

const meta = registroVerificaciones.find((v) => v.id === "zona-parcialmente-cargada")!;

const ETAPAS = [
  { id: "materiales", titulo: "Materiales y carga" },
  { id: "geometria", titulo: "Geometría" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

/** Desarrollo de la tracción transversal de una dirección, ec. (6.58) o (6.59). */
function filasTraccion(t: TraccionTransversal, alturaM: number, nEdKN: number, fydMPa: number) {
  return [
    { etiqueta: "Ancho cargado a", valor: `${fmt(t.aM, 3)} m` },
    { etiqueta: "Ancho de la pieza b", valor: `${fmt(t.bM, 3)} m` },
    { etiqueta: "H/2", valor: `${fmt(alturaM / 2, 3)} m` },
    {
      etiqueta: "Discontinuidad",
      valor: t.tipo === "parcial" ? "parcial, b ≤ H/2" : "total, b > H/2",
    },
    t.tipo === "parcial"
      ? {
          etiqueta: "T  (6.58)",
          formula: "¼·(b − a)/b·F",
          sustitucion: `¼·(${fmt(t.bM, 3)} − ${fmt(t.aM, 3)})/${fmt(t.bM, 3)}·${fmt(nEdKN, 1)}`,
          valor: `${fmt(t.tKN, 1)} kN`,
        }
      : {
          etiqueta: "T  (6.59)",
          formula: "¼·(1 − 0,7·a/h)·F, con h = H/2",
          sustitucion: `¼·(1 − 0,7·${fmt(t.aM, 3)}/${fmt(alturaM / 2, 3)})·${fmt(nEdKN, 1)}`,
          valor: `${fmt(t.tKN, 1)} kN`,
        },
    {
      etiqueta: "As = T/fyd",
      sustitucion: `${fmt(t.tKN, 1)} / ${fmt(fydMPa, 1)}`,
      valor: `${fmt(t.asNecCm2)} cm²`,
    },
  ];
}

export default function ZonaParcialmenteCargadaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [nEd, setNEd] = useCampo("nEd", "1500");

  const [b1, setB1] = useCampo("b1", "0.3");
  const [d1, setD1] = useCampo("d1", "0.3");
  const [anchoB, setAnchoB] = useCampo("anchoB", "0.4");
  const [anchoD, setAnchoD] = useCampo("anchoD", "1");
  const [bordeB, setBordeB] = useCampo("bordeB", "0.2");
  const [bordeD, setBordeD] = useCampo("bordeD", "0.5");
  const [altura, setAltura] = useCampo("altura", "0.8");

  const campos = useMemo(
    () => ({ fck, fyk, nEd, b1, d1, anchoB, anchoD, bordeB, bordeD, altura }),
    [fck, fyk, nEd, b1, d1, anchoB, anchoD, bordeB, bordeD, altura]
  );
  const resultado = useMemo(() => resolverZonaParcialmenteCargada(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarZonaParcialmenteCargada(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos: todos tienen que ser positivos, el área cargada tiene que quedar dentro de la pieza (c ≥ b1/2) y c no puede superar la mitad del ancho.",
    });
  } else {
    for (const [dir, t] of [["b", resultado.r.traccionB], ["d", resultado.r.traccionD]] as const) {
      if (t.fueraDeRango) {
        avisos.push({
          tipo: "aviso",
          texto: `Dirección ${dir}: a > H/2, fuera del campo de la fig. A19.6.25 b). La ec. (6.59) no está pensada para este caso; revisar con un modelo de bielas y tirantes propio.`,
        });
      }
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Hormigón armado · Regiones D</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="materiales" numero={1} titulo="Materiales y carga" descripcion="Esfuerzo de compresión de cálculo sobre el área cargada.">
          <div className="grid max-w-2xl grid-cols-3 gap-4">
            <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
            <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            <CampoNumerico id="nEd" etiqueta="NEd" sufijo="kN" valor={nEd} onChange={setNEd} />
          </div>
        </Etapa>

        <Etapa id="geometria" numero={2} titulo="Geometría" descripcion="Área cargada, pieza y posición de la carga en cada dirección en planta.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Dirección b">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="b1" etiqueta="b1 cargada" sufijo="m" valor={b1} onChange={setB1} />
                    <CampoNumerico id="anchoB" etiqueta="Ancho pieza" sufijo="m" valor={anchoB} onChange={setAnchoB} />
                    <CampoNumerico id="bordeB" etiqueta="c al borde" sufijo="m" valor={bordeB} onChange={setBordeB} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Dirección d">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="d1" etiqueta="d1 cargada" sufijo="m" valor={d1} onChange={setD1} />
                    <CampoNumerico id="anchoD" etiqueta="Ancho pieza" sufijo="m" valor={anchoD} onChange={setAnchoD} />
                    <CampoNumerico id="bordeD" etiqueta="c al borde" sufijo="m" valor={bordeD} onChange={setBordeD} />
                  </div>
                </Subgrupo>
                <div className="grid grid-cols-3 gap-4">
                  <CampoNumerico id="altura" etiqueta="Altura h" sufijo="m" valor={altura} onChange={setAltura} />
                </div>
                <p className="text-xs text-muted-foreground">
                  h es la longitud de la pieza en la dirección de la carga. c es la distancia del
                  centro de la carga al borde más cercano; con la carga centrada, c es la mitad del ancho.
                </p>
              </>
            }
            dibujo={<CroquisZonaCargada />}
          />
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "NEd", valor: `${nEd} kN` },
              { etiqueta: "Área cargada b1 × d1", valor: `${b1} × ${d1} m` },
              { etiqueta: "Pieza (ancho b × d)", valor: `${anchoB} × ${anchoD} m, h = ${altura} m` },
              { etiqueta: "c al borde (b · d)", valor: `${bordeB} · ${bordeD} m` },
              ...(resultado ? [{ etiqueta: "fcd · fyd", valor: `${fmt(resultado.materiales.fcd, 2)} · ${fmt(resultado.materiales.fyd, 1)} MPa`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Anejo 19, art. 6.7, ec. (6.63) y fig. A19.6.29, pág. 101: FRdu = Ac0·fcd·√(Ac1/Ac0) ≤ 3·fcd·Ac0.",
              "Ac1 homotética a Ac0 y centrada en la línea de acción: un solo factor k = b2/b1 = d2/d1, el menor entre 3, (b1 + h)/b1, (d1 + h)/d1 y lo que permite el borde más cercano (2c/b1, 2c/d1).",
              "Carga uniforme sobre Ac0 y sin cortante elevado: si no, el art. 6.7 (3) pide reducir FRdu.",
              "Una sola carga: con varias, las áreas de distribución no pueden superponerse.",
              "Tracciones transversales por el art. 6.5.3 (3), ec. (6.58) si b ≤ H/2 y (6.59) si no, en cada dirección, con b el ancho total de la pieza y H = h.",
              "La armadura transversal es dimensionamiento: As = T/fyd, repartida donde las bielas se curvan.",
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
                  { etiqueta: "FRdu", valor: `${fmt(resultado.r.fRduKN, 0)} kN`, nota: `NEd ${fmt(resultado.v.nEd, 0)} kN` },
                  { etiqueta: "k = b2/b1", valor: fmt(resultado.r.k, 3), nota: `limita ${resultado.r.limite}` },
                  { etiqueta: "As transversal b", valor: `${fmt(resultado.r.traccionB.asNecCm2)} cm²`, nota: `T = ${fmt(resultado.r.traccionB.tKN, 0)} kN` },
                  { etiqueta: "As transversal d", valor: `${fmt(resultado.r.traccionD.asNecCm2)} cm²`, nota: `T = ${fmt(resultado.r.traccionD.tKN, 0)} kN` },
                ]}
              />

              <Subgrupo titulo="Aplastamiento local" detalle="art. 6.7, ec. (6.63)">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Compresión concentrada"
                    verifica={resultado.r.verificaAplastamiento}
                    comparacion={{
                      real: { etiqueta: "NEd", valor: resultado.v.nEd },
                      limite: { etiqueta: "FRdu", valor: resultado.r.fRduKN },
                      unidad: "kN", exige: "≤", decimales: 0,
                    }}
                    recomendaciones={rec.aplastamiento}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del aplastamiento"
                    filas={[
                      { etiqueta: "Ac0 = b1·d1", valor: `${fmt(resultado.r.ac0M2, 4)} m²` },
                      { etiqueta: "k = mín(3; (b1+h)/b1; (d1+h)/d1; 2c/b1; 2c/d1)", valor: `${fmt(resultado.r.k, 3)} — ${resultado.r.limite}` },
                      { etiqueta: "b2 × d2", valor: `${fmt(resultado.r.b2M, 3)} × ${fmt(resultado.r.d2M, 3)} m` },
                      { etiqueta: "Ac1", valor: `${fmt(resultado.r.ac1M2, 4)} m²` },
                      {
                        etiqueta: "FRdu  (6.63)",
                        formula: "Ac0·fcd·√(Ac1/Ac0)",
                        sustitucion: `${fmt(resultado.r.ac0M2, 4)}·${fmt(resultado.materiales.fcd, 2)}·√(${fmt(resultado.r.ac1M2, 4)}/${fmt(resultado.r.ac0M2, 4)})`,
                        valor: `${fmt(resultado.r.fRduKN, 0)} kN`,
                      },
                      { etiqueta: "Tope 3·fcd·Ac0", valor: `${fmt(3 * resultado.materiales.fcd * resultado.r.ac0M2 * 1000, 0)} kN` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Tracciones transversales" detalle="dimensionamiento, art. 6.5.3">
                <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                  {([["b", resultado.r.traccionB], ["d", resultado.r.traccionD]] as const).map(([dir, t]) => (
                    <div key={dir} className="space-y-2">
                      <p className="text-sm font-medium">
                        Dirección {dir}: T = {fmt(t.tKN, 1)} kN → As = {fmt(t.asNecCm2)} cm²
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Discontinuidad {t.tipo}, ec. {t.ecuacion}.
                      </p>
                      <PanelFormulas
                        titulo={`Ver desarrollo de la dirección ${dir}`}
                        filas={filasTraccion(t, resultado.v.altura, resultado.v.nEd, resultado.materiales.fyd)}
                      />
                    </div>
                  ))}
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
