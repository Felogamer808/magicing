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
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaVigaAtado } from "@/components/verificaciones/hormigon/DiagramaVigaAtado";
import { SeccionVigaDiagrama } from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";
import { fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { DIAMETRO_MINIMO_ATADO_MM } from "@/lib/calc/hormigon/cimentaciones/viga-atado";
import { resolverVigaAtado } from "@/lib/calc/hormigon/cimentaciones/resolver-viga-atado";
import { recomendarVigaAtado } from "@/lib/verificaciones/recomendaciones/viga-atado";

const meta = registroVerificaciones.find((v) => v.id === "viga-atado")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const COMPACTACION = { si: "Sí: q₁ = 10 kN/m", no: "No" } as const;

export default function VigaAtadoPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [b, setB] = useCampo("b", "0.4");
  const [h, setH] = useCampo("h", "0.4");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.04");
  const [luz, setLuz] = useCampo("luz", "5");

  const [n1d, setN1d] = useCampo("n1d", "1000");
  const [n2d, setN2d] = useCampo("n2d", "800");
  const [porcentaje, setPorcentaje] = useCampo("porcentaje", "10");
  const [compactacion, setCompactacion] = useCampo<"si" | "no">("compactacion", "no");

  const [numeroCara, setNumeroCara] = useCampo("numeroCara", "3");
  const [diametroCara, setDiametroCara] = useCampo("diametroCara", "16");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "8");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "2");

  const campos = useMemo(
    () => ({ fck, fyk, b, h, recubrimiento, luz, n1d, n2d, porcentaje, compactacion, numeroCara, diametroCara, diametroEstribo, numeroRamas }),
    [fck, fyk, b, h, recubrimiento, luz, n1d, n2d, porcentaje, compactacion, numeroCara, diametroCara, diametroEstribo, numeroRamas]
  );
  const resultado = useMemo(() => resolverVigaAtado(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarVigaAtado(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos." });
  } else {
    if (!resultado.r.cumpleLadoMontoya || !resultado.r.cumpleFisuracionMontoya) {
      avisos.push({
        tipo: "aviso",
        texto: "La sección no cumple el predimensionado de Jiménez Montoya (ver resultados). No decide el veredicto, pero conviene revisarlo.",
      });
    }
  }

  const armadura = { capas: resultado ? [{ numero: resultado.v.numeroCara, diametroMm: resultado.v.diametroCara }] : [] };
  const dibujo = resultado ? (
    <div className="space-y-4">
      <DiagramaVigaAtado
        luzM={resultado.v.luz}
        hVigaM={resultado.v.h}
        axilKN={resultado.r.axilAtadoKN}
        cargaKNPorM={resultado.r.cargaKNPorM}
      />
      <SeccionVigaDiagrama
        bM={resultado.v.b}
        hM={resultado.v.h}
        recubrimientoM={resultado.v.recubrimiento}
        dM={resultado.r.dM}
        dNegativoM={resultado.r.dM}
        armaduraPositiva={armadura}
        armaduraNegativa={armadura}
        diametroEstriboMm={resultado.v.diametroEstribo}
      />
    </div>
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">El esquema se dibuja con datos válidos.</p>
  );

  const r = resultado?.r;
  const excedeAxil = r ? r.axilAtadoKN > r.nRdMaxKN : false;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Cimentaciones · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Geometría y materiales" descripcion="La viga riostra entre dos zapatas o encepados.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Viga">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CampoNumerico id="b" etiqueta="Ancho b" sufijo="m" valor={b} onChange={setB} />
                    <CampoNumerico id="h" etiqueta="Canto h" sufijo="m" valor={h} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="luz" etiqueta="Luz libre L" sufijo="m" valor={luz} onChange={setLuz} />
                  </div>
                  <p className="pt-2 text-xs text-muted-foreground">
                    L es la luz libre entre las caras de las zapatas. El recubrimiento se mide hasta el estribo.
                  </p>
                </Subgrupo>
              </>
            }
            dibujo={dibujo}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Axiles de cálculo de los dos pilares que une la viga.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CampoNumerico id="n1d" etiqueta="N₁d (pilar 1)" sufijo="kN" valor={n1d} onChange={setN1d} />
              <CampoNumerico id="n2d" etiqueta="N₂d (pilar 2)" sufijo="kN" valor={n2d} onChange={setN2d} />
              <CampoNumerico id="porcentaje" etiqueta="Axil de atado" sufijo="% del mayor" valor={porcentaje} onChange={setPorcentaje} />
            </div>
            <p className="text-xs text-muted-foreground">
              Ni el Anejo 19 (art. 9.8.3) ni el CTE DB SE-C (art. 4.1.1 (5)) fijan el axil de atado. El 10 % es el
              de Jiménez Montoya (§ 25.10.2) para predimensionar a falta de datos, pensado para sismo: es una
              hipótesis de quien proyecta.
            </p>
            <div className="max-w-xs">
              <CampoSeleccion
                id="compactacion"
                etiqueta="¿La compactación puede cargar la viga?"
                valor={COMPACTACION[compactacion]}
                opciones={Object.values(COMPACTACION)}
                onChange={(x) => setCompactacion(x === COMPACTACION.si ? "si" : "no")}
              />
            </div>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Simétrica: la misma en las dos caras, porque el axil cambia de signo.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="numeroCara" etiqueta="Nº barras por cara" valor={numeroCara} onChange={setNumeroCara} />
            <CampoDiametro id="diametroCara" etiqueta="Ø" valor={diametroCara} onChange={setDiametroCara} />
            <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
            <CampoNumerico id="numeroRamas" etiqueta="Ramas" valor={numeroRamas} onChange={setNumeroRamas} />
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Viga b × h, L", valor: `${b} × ${h} m, ${luz} m` },
              { etiqueta: "N₁d / N₂d", valor: `${n1d} / ${n2d} kN` },
              ...(r ? [{ etiqueta: "Axil de atado ± N", valor: `${fmt(r.axilAtadoKN)} kN`, derivado: true }] : []),
            ]}
            hipotesis={[
              `Axil de atado = ${porcentaje} % del axil de cálculo del pilar más cargado, en tracción y en compresión.`,
              "La viga apoya en el terreno: su peso propio no la flecta.",
              compactacion === "si"
                ? "Compactación: q₁ = 10 kN/m (Anejo 19, art. 9.8.3 (2)), biapoyada en la luz libre: M = q·L²/8, V = q·L/2."
                : "Sin compactación sobre la viga: no hay flexión ni cortante de cálculo.",
              "Tracción: sólo el acero; cada cara toma N/2 + M/z.",
              "Compresión: diagrama N–M de la sección, con la excentricidad mínima h/30 ≥ 20 mm (art. 6.1 (4)).",
              "Con tracción, el cortante va entero a los estribos (VRd,c baja con el axil y no se cuenta).",
              "No se considera el asiento diferencial entre zapatas (CTE DB SE-C, art. 4.1.1 (7)).",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultado || !r ? (
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
                  { etiqueta: "Axil de atado", valor: `± ${fmt(r.axilAtadoKN, 0)} kN` },
                  { etiqueta: "Md / Vd", valor: `${fmt(r.momentoKNm, 1)} kN·m / ${fmt(r.cortanteKN, 1)} kN` },
                  { etiqueta: "As por cara", valor: `${fmt(r.asCaraCm2)} cm²` },
                  { etiqueta: "Estribos", valor: `Ø${fmt(resultado.v.diametroEstribo, 0)} c/${fmt(r.separacionEstribosM * 100, 0)} cm` },
                ]}
              />

              <Subgrupo titulo="Axil">
                <div>
                  <ResultadoCheck
                    etiqueta="Tracción"
                    verifica={r.verificaTraccion}
                    detalle="La toma sólo el acero: cara más cargada, N/2 + M/z."
                    comparacion={{
                      real: { etiqueta: "Fcara", valor: r.traccionCaraKN },
                      limite: { etiqueta: "As·fyd", valor: r.capacidadCaraKN },
                      unidad: "kN", exige: "≤",
                    }}
                    recomendaciones={rec.traccion}
                  />
                  <ResultadoCheck
                    etiqueta="Compresión"
                    verifica={r.verificaCompresion}
                    detalle={excedeAxil ? "El axil supera la capacidad a compresión centrada de la sección." : "Momento resistente para el axil de atado, Anejo 19, art. 6.1."}
                    comparacion={
                      excedeAxil
                        ? { real: { etiqueta: "N", valor: r.axilAtadoKN }, limite: { etiqueta: "NRd,max", valor: r.nRdMaxKN }, unidad: "kN", exige: "≤" }
                        : { real: { etiqueta: "MEd", valor: r.momentoCompresionKNm }, limite: { etiqueta: "MRd(N)", valor: r.mRdKNm }, unidad: "kN·m", exige: "≤" }
                    }
                    recomendaciones={rec.compresion}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del axil"
                    filas={[
                      { etiqueta: `N = ${fmt(resultado.v.porcentaje, 0)} % · máx(N₁d, N₂d)`, valor: `${fmt(r.axilAtadoKN)} kN` },
                      { etiqueta: "d′ / d / z = d − d′", valor: `${fmt(r.dPrimaM, 3)} / ${fmt(r.dM, 3)} / ${fmt(r.brazoM, 3)} m` },
                      { etiqueta: "e₀ = máx(h/30; 20 mm)", valor: `${fmt(r.excentricidadMinimaM * 1000, 0)} mm` },
                      { etiqueta: "MEd = máx(Md; N·e₀)", valor: `${fmt(r.momentoCompresionKNm)} kN·m` },
                      { etiqueta: "NRd,max (compresión centrada)", valor: `${fmt(r.nRdMaxKN)} kN` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Armado">
                <div>
                  <ResultadoCheck
                    etiqueta="Armadura mínima por cara"
                    verifica={r.verificaMinima}
                    detalle="Anejo 19, art. 9.2.1.1 (1), ec. (9.1): cualquiera de las dos caras puede quedar traccionada."
                    comparacion={{
                      real: { etiqueta: "As cara", valor: r.asCaraCm2 },
                      limite: { etiqueta: "As mín", valor: r.asMinCaraCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                    recomendaciones={rec.minima}
                  />
                  <ResultadoCheck
                    etiqueta={`Diámetro mínimo Ø${DIAMETRO_MINIMO_ATADO_MM}`}
                    verifica={r.verificaDiametro}
                    detalle="Anejo 19, art. 9.8.3 (1), pág. 154."
                    recomendaciones={rec.diametro}
                  />
                  <ResultadoCheck
                    etiqueta="Compresión oblicua del alma"
                    verifica={r.cortante.verificaVRdMax}
                    estado={r.cortanteKN > 0 ? undefined : "no-aplica"}
                    detalle={r.cortanteKN > 0 ? undefined : "Sin compactación no hay cortante de cálculo: estribos mínimos."}
                    comparacion={
                      r.cortanteKN > 0
                        ? { real: { etiqueta: "Vd", valor: r.cortanteKN }, limite: { etiqueta: "VRd,max", valor: r.cortante.vRdMax }, unidad: "kN", exige: "≤" }
                        : undefined
                    }
                    recomendaciones={rec.bielas}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo de los estribos"
                    filas={[
                      { etiqueta: "Necesaria Vd/(0,9·d·fywd), sin VRd,c", valor: `${fmt(r.a90NecCm2PorM)} cm²/m` },
                      { etiqueta: "Mínima, art. 9.2.2", valor: `${fmt(r.cortante.a90MinCm2PorM)} cm²/m` },
                      { etiqueta: "Separación máxima", valor: `${fmt(r.cortante.separacionMaxM, 2)} m` },
                      { etiqueta: "Separación adoptada", valor: `${fmt(r.separacionEstribosM, 2)} m` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Predimensionado de Jiménez Montoya (informativo)">
                <div className="space-y-2 text-sm">
                  <p className="text-xs text-muted-foreground">
                    § 25.10.2. Son reglas de práctica de la EHE-08: se informan, pero no deciden si la viga cumple.
                  </p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                    <dt>Lado ≥ máx(L/20; 0,25 m)</dt>
                    <dd>
                      {fmt(Math.min(resultado.v.b, resultado.v.h), 2)} m frente a {fmt(r.ladoMinimoMontoyaM, 2)} m —{" "}
                      {r.cumpleLadoMontoya ? "cumple" : "no cumple"}
                    </dd>
                    <dt>As·fyd ≥ 0,15·b·h·fcd</dt>
                    <dd>
                      {fmt((2 * r.asCaraCm2 * resultado.materiales.fyd) / 10, 0)} kN frente a{" "}
                      {fmt(0.15 * resultado.v.b * resultado.v.h * resultado.materiales.fcd * 1000, 0)} kN —{" "}
                      {r.cumpleFisuracionMontoya ? "cumple" : "no cumple"}
                    </dd>
                  </dl>
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
