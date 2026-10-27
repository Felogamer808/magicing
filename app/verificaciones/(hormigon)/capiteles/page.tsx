"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PlantaCapitel } from "@/components/verificaciones/hormigon/PlantaCapitel";
import { BETA_RECOMENDADO, type PosicionPilar } from "@/lib/calc/hormigon/losas/punzonamiento";
import { FORMAS_PILAR, resolverCapitel } from "@/lib/calc/hormigon/losas/resolver-capitel";
import { POSICIONES_PUNZONAMIENTO } from "@/lib/calc/hormigon/losas/resolver-punzonamiento";
import { recomendarCapitel } from "@/lib/verificaciones/recomendaciones/capitel";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "capiteles")!;

const ETAPAS = [
  { id: "geometria", titulo: "Pilar, capitel y losa" },
  { id: "negativos", titulo: "Negativos" },
  { id: "esfuerzo", titulo: "Esfuerzo" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const ID_POSICION: Record<(typeof POSICIONES_PUNZONAMIENTO)[number], PosicionPilar> = {
  Interior: "interior",
  "De borde": "borde",
  "De esquina": "esquina",
};

export default function CapitelesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [posicionTexto, setPosicionTexto] = useCampo<(typeof POSICIONES_PUNZONAMIENTO)[number]>("posicion", "Interior");
  const posicion = ID_POSICION[posicionTexto];
  const [forma, setForma] = useCampo<(typeof FORMAS_PILAR)[number]>("forma", "Rectangular");
  const circular = forma === "Circular";

  const [fck, setFck] = useCampo("fck", "30");
  const [espesor, setEspesor] = useCampo("espesor", "0.20");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.025");

  const [c1, setC1] = useCampo("c1", "0.30");
  const [c2, setC2] = useCampo("c2", "0.30");
  const [distBordeC1, setDistBordeC1] = useCampo("distBordeC1", "0");
  const [distBordeC2, setDistBordeC2] = useCampo("distBordeC2", "0");

  const [lH1, setLH1] = useCampo("lH1", "0.30");
  const [lH2, setLH2] = useCampo("lH2", "0.30");
  const [hH, setHH] = useCampo("hH", "0.20");

  const [phiNegY, setPhiNegY] = useCampo("phiNegY", "12");
  const [sNegY, setSNegY] = useCampo("sNegY", "0.15");
  const [phiNegZ, setPhiNegZ] = useCampo("phiNegZ", "12");
  const [sNegZ, setSNegZ] = useCampo("sNegZ", "0.15");

  const [vEd, setVEd] = useCampo("vEd", "400");
  const [betaModo, setBetaModo] = useCampo<"Recomendado" | "A mano">("betaModo", "Recomendado");
  const [betaTexto, setBetaTexto] = useCampo("beta", "1.15");

  const campos = useMemo(
    () => ({
      posicion: posicionTexto, forma, betaModo, beta: betaTexto,
      fck, espesor, recubrimiento, c1, c2, distBordeC1, distBordeC2, lH1, lH2, hH,
      phiNegY, sNegY, phiNegZ, sNegZ, vEd,
    }),
    [posicionTexto, forma, betaModo, betaTexto, fck, espesor, recubrimiento, c1, c2, distBordeC1, distBordeC2, lH1, lH2, hH,
     phiNegY, sNegY, phiNegZ, sNegZ, vEd]
  );
  const resultado = useMemo(() => resolverCapitel(campos), [campos]);
  const rec = useMemo(() => recomendarCapitel(campos), [campos]);
  const hayBorde = posicion !== "interior";

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular (el canto útil tiene que salir positivo)." });
  } else {
    if (resultado.r.secciones.some((s) => s.gobiernaVMin))
      avisos.push({ tipo: "aviso", texto: "En alguna sección gobierna el mínimo vmin, no la cuantía: más negativos no mueven vRd,c ahí." });
  }

  const r = resultado?.r;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Losas · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Pilar, capitel y losa" descripcion="El pilar, el capitel que lo rodea y la losa que apoya encima.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Pilar">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoSeleccion
                      id="posicion"
                      etiqueta="Dónde apoya"
                      valor={posicionTexto}
                      opciones={POSICIONES_PUNZONAMIENTO}
                      onChange={(v) => setPosicionTexto(v as (typeof POSICIONES_PUNZONAMIENTO)[number])}
                    />
                    <CampoSeleccion id="forma" etiqueta="Forma" valor={forma} opciones={FORMAS_PILAR} onChange={(v) => setForma(v as (typeof FORMAS_PILAR)[number])} />
                    <CampoNumerico id="c1" etiqueta={circular ? "Diámetro c" : hayBorde ? "c1 — lado ⊥ al borde" : "c1"} sufijo="m" valor={c1} onChange={setC1} />
                    {!circular && (
                      <CampoNumerico id="c2" etiqueta={hayBorde ? "c2 — lado ∥ al borde" : "c2"} sufijo="m" valor={c2} onChange={setC2} />
                    )}
                    {hayBorde && (
                      <CampoNumerico id="distBordeC1" etiqueta="Distancia al borde" sufijo="m" valor={distBordeC1} onChange={setDistBordeC1} advertencia="0 = el pilar llega a ras del borde." />
                    )}
                    {posicion === "esquina" && (
                      <CampoNumerico id="distBordeC2" etiqueta="Distancia al 2.º borde" sufijo="m" valor={distBordeC2} onChange={setDistBordeC2} />
                    )}
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Capitel">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="lH1" etiqueta={circular ? "l_H — vuelo" : "l_H1 — vuelo en c1"} sufijo="m" valor={lH1} onChange={setLH1} />
                    {!circular && <CampoNumerico id="lH2" etiqueta="l_H2 — vuelo en c2" sufijo="m" valor={lH2} onChange={setLH2} />}
                    <CampoNumerico id="hH" etiqueta="h_H — canto" sufijo="m" valor={hH} onChange={setHH} />
                  </div>
                  <PanelAyuda titulo="Capitel chico o grande">
                    <p>
                      Con l_H ≤ 2·h_H la superficie de rotura a 26,6° atraviesa todo el capitel y sólo
                      se comprueba la losa, fuera de él (art. 6.4.2 (8)). Con l_H &gt; 2·h_H puede romper
                      también dentro del capitel, y se comprueban las dos secciones (art. 6.4.2 (9)).
                    </p>
                  </PanelAyuda>
                </Subgrupo>
                <Subgrupo titulo="Losa y material">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="espesor" etiqueta="Espesor h" sufijo="m" valor={espesor} onChange={setEspesor} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={r ? <PlantaCapitel resultado={r} /> : <p className="text-sm text-muted-foreground">Completá los datos para ver la planta.</p>}
          />
        </Etapa>

        <Etapa id="negativos" numero={2} titulo="Armadura de negativos" descripcion="La de arriba sobre el pilar: entra en ρl de las dos secciones.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoDiametro id="phiNegY" etiqueta="Ø dirección y" valor={phiNegY} onChange={setPhiNegY} />
            <CampoNumerico id="sNegY" etiqueta="s dirección y" sufijo="m" valor={sNegY} onChange={setSNegY} />
            <CampoDiametro id="phiNegZ" etiqueta="Ø dirección z" valor={phiNegZ} onChange={setPhiNegZ} />
            <CampoNumerico id="sNegZ" etiqueta="s dirección z" sufijo="m" valor={sNegZ} onChange={setSNegZ} />
          </div>
        </Etapa>

        <Etapa id="esfuerzo" numero={3} titulo="Esfuerzo" descripcion="Reacción de cálculo del pilar y coeficiente β de excentricidad.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="vEd" etiqueta="VEd" sufijo="kN" valor={vEd} onChange={setVEd} />
            <CampoSeleccion id="betaModo" etiqueta="β" valor={betaModo} opciones={["Recomendado", "A mano"] as const} onChange={(v) => setBetaModo(v as "Recomendado" | "A mano")} />
            {betaModo === "A mano" ? (
              <CampoNumerico id="beta" etiqueta="β" valor={betaTexto} onChange={setBetaTexto} />
            ) : (
              <div className="flex items-end">
                <p className="pb-2 font-mono text-sm tabular-nums">β = {fmt(BETA_RECOMENDADO[posicion], 2)}</p>
              </div>
            )}
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Posición / forma", valor: `${posicionTexto} / ${forma}` },
              { etiqueta: "Capitel", valor: circular ? `l_H ${lH1} · h_H ${hH} m` : `l_H ${lH1} × ${lH2} · h_H ${hH} m` },
              { etiqueta: "h / fck", valor: `${espesor} m / ${fck} MPa` },
              { etiqueta: "VEd", valor: `${vEd} kN` },
              ...(r
                ? [
                    { etiqueta: "Tipo de capitel", valor: r.tipo === "chico" ? "chico (l_H ≤ 2·h_H)" : "grande (l_H > 2·h_H)", derivado: true },
                    { etiqueta: "d / d_H", valor: `${fmt(r.dM * 100, 1)} / ${fmt(r.dHM * 100, 1)} cm`, derivado: true },
                    { etiqueta: "β", valor: fmt(r.beta, 2), derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Anejo 19, art. 6.4.2 (8) a (11), con la resistencia del art. 6.4.3: vRd,c de la ec. (6.47) con su mínimo vmin, en cada sección con su canto (d en la losa, d_H = d + h_H en el capitel).",
              "Capitel chico: una sección en la losa, r_cont por la ec. (6.33) en circular y por el menor de (6.34) y (6.35) en rectangular interior. En borde y esquina rectangular, a 2d del borde del capitel, recortada contra los bordes libres.",
              "Capitel grande: la losa a 2d del capitel y el capitel a 2·d_H del pilar; en circular, ecs. (6.36) y (6.37).",
              "Biela en la cara del pilar (art. 6.4.5 (3)) con d_H. Pilar circular de borde o esquina: el cuadrado de igual área para u0.",
              "Sólo hormigón: sin armadura de punzonamiento. Si no alcanza, se agranda el capitel.",
              "No contempla huecos a menos de 6d ni el término k1·σcp (omitirlo queda del lado seguro).",
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
              <ConclusionResultados
                comprobaciones={[
                  { etiqueta: "biela en la cara del pilar", estado: r.caraPilar.verifica ? "cumple" : "no-cumple", utilizacion: r.caraPilar.aprovechamiento, conPropuestas: !!rec.caraPilar },
                  ...r.secciones.map((s) => ({
                    etiqueta: s.donde === "losa" ? "sección crítica en la losa" : "sección crítica en el capitel",
                    estado: (s.verifica ? "cumple" : "no-cumple") as "cumple" | "no-cumple",
                    utilizacion: s.aprovechamiento,
                    conPropuestas: !!rec[s.donde],
                  })),
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Capitel", valor: r.tipo === "chico" ? "chico" : "grande" },
                  { etiqueta: "d / d_H", valor: `${fmt(r.dM * 100, 1)} / ${fmt(r.dHM * 100, 1)} cm` },
                  { etiqueta: "u0", valor: `${fmt(r.caraPilar.u0M * 100, 0)} cm` },
                  ...r.secciones.map((s) => ({ etiqueta: s.donde === "losa" ? "u losa" : "u capitel", valor: `${fmt(s.uM * 100, 0)} cm` })),
                ]}
              />

              <Subgrupo titulo="Cara del pilar" detalle="art. 6.4.5 (3), con d_H">
                <ResultadoCheck
                  etiqueta="Biela comprimida en u0"
                  verifica={r.caraPilar.verifica}
                  comparacion={{
                    real: { etiqueta: "vEd", valor: r.caraPilar.vEdMPa },
                    limite: { etiqueta: "0,4·ν·fcd", valor: r.caraPilar.vRdMaxMPa },
                    unidad: "MPa", exige: "≤", decimales: 3,
                  }}
                  recomendaciones={rec.caraPilar}
                />
              </Subgrupo>

              {r.secciones.map((s) => (
                <Subgrupo
                  key={s.donde}
                  titulo={s.donde === "losa" ? "Sección crítica en la losa" : "Sección crítica en el capitel"}
                  detalle={s.ecuacion.startsWith("(") ? `ec. ${s.ecuacion}` : s.ecuacion}
                >
                  <div>
                    <ResultadoCheck
                      etiqueta={s.donde === "losa" ? "Losa fuera del capitel, sin armadura" : "Capitel, sin armadura"}
                      verifica={s.verifica}
                      comparacion={{
                        real: { etiqueta: "vEd", valor: s.vEdMPa },
                        limite: { etiqueta: "vRd,c", valor: s.vRdCMPa },
                        unidad: "MPa", exige: "≤", decimales: 3,
                      }}
                      recomendaciones={rec[s.donde]}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo"
                      filas={[
                        ...(s.rContM !== null ? [{ etiqueta: `r_cont, ec. ${s.ecuacion}`, valor: `${fmt(s.rContM, 3)} m` }] : []),
                        { etiqueta: "u", valor: `${fmt(s.uM, 3)} m` },
                        { etiqueta: "d de la sección", valor: `${fmt(s.dM, 3)} m` },
                        { etiqueta: "ρl", valor: fmt(s.rhoL, 4) },
                        { etiqueta: "k", valor: fmt(s.k, 3) },
                        { etiqueta: "vEd = β·VEd/(u·d)", valor: `${fmt(s.vEdMPa, 3)} MPa` },
                        { etiqueta: s.gobiernaVMin ? "vRd,c (gobierna vmin)" : "vRd,c, ec. (6.47)", valor: `${fmt(s.vRdCMPa, 3)} MPa` },
                      ]}
                    />
                  </div>
                </Subgrupo>
              ))}
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
