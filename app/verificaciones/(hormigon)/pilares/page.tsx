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
import { DiagramaInteraccionMuro } from "@/components/verificaciones/hormigon/DiagramaInteraccionMuro";
import { SeccionPilarDiagrama } from "@/components/verificaciones/hormigon/SeccionPilarDiagrama";
import { NOMBRE_CEMENTO, NOMBRE_EXPOSICION, type ClaseCemento, type ExposicionSeccion } from "@/lib/calc/hormigon/comun/diferidas";
import { DIRECCIONES_PILAR } from "@/lib/calc/hormigon/pilares/pilar";
import { ARRIOSTRAMIENTO, COACCIONES_PILAR, MODOS_FLUENCIA, resolverPilar } from "@/lib/calc/hormigon/pilares/resolver-pilar";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { recomendarPilar } from "@/lib/verificaciones/recomendaciones/pilar";

const meta = registroVerificaciones.find((v) => v.id === "pilares")!;

const ETAPAS = [
  { id: "geometria", titulo: "Sección" },
  { id: "esfuerzos", titulo: "Esfuerzos" },
  { id: "fluencia", titulo: "Fluencia" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const OPCIONES_CEMENTO = (Object.keys(NOMBRE_CEMENTO) as ClaseCemento[]).map((c) => NOMBRE_CEMENTO[c]);
const OPCIONES_EXPOSICION = (Object.keys(NOMBRE_EXPOSICION) as ExposicionSeccion[]).map((e) => NOMBRE_EXPOSICION[e]);

const NOMBRE_DIRECCION = { h: "Dirección h (canto h)", b: "Dirección b (canto b)" } as const;

export default function PilaresPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [b, setB] = useCampo("b", "0.3");
  const [h, setH] = useCampo("h", "0.3");
  const [altura, setAltura] = useCampo("altura", "3");
  const [rec, setRec] = useCampo("rec", "0.03");

  const [nEd, setNEd] = useCampo("nEd", "1000");
  const [coaccionH, setCoaccionH] = useCampo("coaccionH", COACCIONES_PILAR[0]);
  const [betaH, setBetaH] = useCampo("betaH", "1");
  const [arriostradoH, setArriostradoH] = useCampo("arriostradoH", ARRIOSTRAMIENTO[0]);
  const [m01H, setM01H] = useCampo("m01H", "0");
  const [m02H, setM02H] = useCampo("m02H", "30");
  const [vEdH, setVEdH] = useCampo("vEdH", "20");
  const [coaccionB, setCoaccionB] = useCampo("coaccionB", COACCIONES_PILAR[0]);
  const [betaB, setBetaB] = useCampo("betaB", "1");
  const [arriostradoB, setArriostradoB] = useCampo("arriostradoB", ARRIOSTRAMIENTO[0]);
  const [m01B, setM01B] = useCampo("m01B", "0");
  const [m02B, setM02B] = useCampo("m02B", "0");
  const [vEdB, setVEdB] = useCampo("vEdB", "0");

  const [modoFluencia, setModoFluencia] = useCampo("modoFluencia", MODOS_FLUENCIA[0]);
  const [phiEf, setPhiEf] = useCampo("phiEf", "2");
  const [hr, setHr] = useCampo("hr", "70");
  const [t0, setT0] = useCampo("t0", "28");
  const [cemento, setCemento] = useCampo("cemento", NOMBRE_CEMENTO.N);
  const [exposicion, setExposicion] = useCampo("exposicion", NOMBRE_EXPOSICION["cuatro-caras"]);
  const [relacionMqp, setRelacionMqp] = useCampo("relacionMqp", "0.7");

  const [phi, setPhi] = useCampo("phi", "16");
  const [nCaraB, setNCaraB] = useCampo("nCaraB", "3");
  const [nCaraH, setNCaraH] = useCampo("nCaraH", "3");
  const [phiCerco, setPhiCerco] = useCampo("phiCerco", "8");
  const [sepCercos, setSepCercos] = useCampo("sepCercos", "0.2");
  const [ramasH, setRamasH] = useCampo("ramasH", "2");
  const [ramasB, setRamasB] = useCampo("ramasB", "2");

  const campos = useMemo(
    () => ({
      fck, fyk, b, h, altura, rec, nEd,
      coaccionH, betaH, arriostradoH, m01H, m02H, vEdH,
      coaccionB, betaB, arriostradoB, m01B, m02B, vEdB,
      modoFluencia, phiEf, hr, t0, cemento, exposicion, relacionMqp,
      phi, nCaraB, nCaraH, phiCerco, sepCercos, ramasH, ramasB,
    }),
    [fck, fyk, b, h, altura, rec, nEd, coaccionH, betaH, arriostradoH, m01H, m02H, vEdH, coaccionB, betaB, arriostradoB, m01B, m02B, vEdB, modoFluencia, phiEf, hr, t0, cemento, exposicion, relacionMqp, phi, nCaraB, nCaraH, phiCerco, sepCercos, ramasH, ramasB]
  );
  const resultado = useMemo(() => resolverPilar(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const propuestas = useMemo(() => recomendarPilar(campos), [campos]);

  const entradas = {
    h: { coaccion: coaccionH, setCoaccion: setCoaccionH, beta: betaH, setBeta: setBetaH, arriostrado: arriostradoH, setArriostrado: setArriostradoH, m01: m01H, setM01: setM01H, m02: m02H, setM02: setM02H, vEd: vEdH, setVEd: setVEdH },
    b: { coaccion: coaccionB, setCoaccion: setCoaccionB, beta: betaB, setBeta: setBetaB, arriostrado: arriostradoB, setArriostrado: setArriostradoB, m01: m01B, setM01: setM01B, m02: m02B, setM02: setM02B, vEd: vEdB, setVEd: setVEdB },
  };

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({
      tipo: "error",
      texto: "Hay datos vacíos o no válidos. Las barras por cara y las ramas tienen que ser enteros desde 2, las barras tienen que entrar con el recubrimiento, β tiene que ser positivo y M0Eqp/M0Ed estar entre 0 y 1.",
    });
  } else {
    const r = resultado.r;
    if (r.fluenciaAdoptada)
      avisos.push({ tipo: "aviso", texto: `Sin φef: se toma A = 0,7 (art. 5.8.3.1) y el φef que lo produce, ${fmt(r.fluenciaEficaz, 2)}, también en la curvatura. Cargarlo o calcularlo lo ajusta.` });
    if (!r.armado.esPilar)
      avisos.push({ tipo: "aviso", texto: "El lado mayor supera cuatro veces el menor: a efectos del art. 9.5.1 no es un pilar sino un muro." });
    if (r.cortante.h.requiereCercos || r.cortante.b.requiereCercos)
      avisos.push({ tipo: "aviso", texto: "El cortante supera VRd,c: los cercos se dimensionan por la ec. (6.8), sin sumar el aporte del hormigón." });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Pilares · flexocompresión</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Sección y materiales" descripcion="Pilar rectangular, su altura libre y el recubrimiento hasta el cerco.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
                <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
                <CampoNumerico id="altura" etiqueta="Altura libre l" sufijo="m" valor={altura} onChange={setAltura} />
                <CampoNumerico id="rec" etiqueta="Recubrimiento geom. al cerco" sufijo="m" valor={rec} onChange={setRec} />
              </div>
            }
            dibujo={
              resultado ? (
                <SeccionPilarDiagrama
                  bM={resultado.v.b} hM={resultado.v.h} recubrimientoM={resultado.v.rec}
                  diametroMm={resultado.v.phi} diametroCercoMm={resultado.v.phiCerco}
                  barrasCaraB={resultado.v.nCaraB} barrasCaraH={resultado.v.nCaraH}
                  ramasH={resultado.v.ramasH} ramasB={resultado.v.ramasB}
                />
              ) : null
            }
          />
        </Etapa>

        <Etapa id="esfuerzos" numero={2} titulo="Esfuerzos" descripcion="Axil y, en cada dirección, coacción, momentos de primer orden en los extremos y cortante. Todo de cálculo.">
          <div className="space-y-6">
            <div className="max-w-xs">
              <CampoNumerico id="nEd" etiqueta="NEd (compresión)" sufijo="kN" valor={nEd} onChange={setNEd} />
            </div>
            {DIRECCIONES_PILAR.map((dir) => {
              const e = entradas[dir];
              const s = dir === "h" ? "H" : "B";
              return (
                <Subgrupo key={dir} titulo={NOMBRE_DIRECCION[dir]}>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoSeleccion id={`coaccion${s}`} etiqueta="Coacción (fig. A19.5.7)" valor={e.coaccion} opciones={COACCIONES_PILAR} onChange={e.setCoaccion} />
                    {e.coaccion === COACCIONES_PILAR[4] && (
                      <CampoNumerico id={`beta${s}`} etiqueta="β" valor={e.beta} onChange={e.setBeta} />
                    )}
                    <CampoSeleccion id={`arriostrado${s}`} etiqueta="Desplazamiento lateral" valor={e.arriostrado} opciones={ARRIOSTRAMIENTO} onChange={e.setArriostrado} />
                    <CampoNumerico id={`m01${s}`} etiqueta="M01" sufijo="kN·m" valor={e.m01} onChange={e.setM01} advertencia="Mismo signo que M02 si tracciona la misma cara" />
                    <CampoNumerico id={`m02${s}`} etiqueta="M02" sufijo="kN·m" valor={e.m02} onChange={e.setM02} />
                    <CampoNumerico id={`vEd${s}`} etiqueta="VEd" sufijo="kN" valor={e.vEd} onChange={e.setVEd} />
                  </div>
                </Subgrupo>
              );
            })}
          </div>
        </Etapa>

        <Etapa id="fluencia" numero={3} titulo="Fluencia" descripcion="φef entra en λlim (factor A) y en la curvatura (Kφ).">
          <div className="space-y-4">
            <div className="max-w-sm">
              <CampoSeleccion id="modoFluencia" etiqueta="φef" valor={modoFluencia} opciones={MODOS_FLUENCIA} onChange={setModoFluencia} />
            </div>
            {modoFluencia === MODOS_FLUENCIA[1] && (
              <div className="max-w-xs">
                <CampoNumerico id="phiEf" etiqueta="φef" valor={phiEf} onChange={setPhiEf} />
              </div>
            )}
            {modoFluencia === MODOS_FLUENCIA[2] && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <CampoNumerico id="hr" etiqueta="Humedad relativa" sufijo="%" valor={hr} onChange={setHr} advertencia="Interior ≈50-70 %; intemperie ≈80 %" />
                  <CampoNumerico id="t0" etiqueta="Edad de puesta en carga" sufijo="días" valor={t0} onChange={setT0} />
                  <CampoSeleccion id="cemento" etiqueta="Clase de cemento" valor={cemento} opciones={OPCIONES_CEMENTO} onChange={setCemento} />
                  <CampoSeleccion id="exposicion" etiqueta="Caras que secan" valor={exposicion} opciones={OPCIONES_EXPOSICION} onChange={setExposicion} />
                  <CampoNumerico id="relacionMqp" etiqueta="M0Eqp/M0Ed" valor={relacionMqp} onChange={setRelacionMqp} advertencia="Fracción cuasipermanente del momento, ec. (5.19)" />
                </div>
                {resultado?.fluencia.basica !== undefined && (
                  <p className="font-mono text-sm tabular-nums">
                    φ(∞,t0) = {fmt(resultado.fluencia.basica, 3)} · φef = {fmt(resultado.r.fluenciaEficaz, 3)}
                    <span className="ml-2 text-xs text-muted-foreground">h0 = {fmt(resultado.fluencia.h0Mm ?? 0, 0)} mm</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </Etapa>

        <Etapa id="armadura" numero={4} titulo="Armadura" descripcion="Barras en las cuatro caras, todas del mismo diámetro, y cercos.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoDiametro id="phi" etiqueta="Ø barras" valor={phi} onChange={setPhi} />
            <CampoNumerico id="nCaraB" etiqueta="Barras por cara b" valor={nCaraB} onChange={setNCaraB} advertencia="Con las de esquina" />
            <CampoNumerico id="nCaraH" etiqueta="Barras por cara h" valor={nCaraH} onChange={setNCaraH} advertencia="Con las de esquina" />
            <CampoDiametro id="phiCerco" etiqueta="Ø cerco" valor={phiCerco} onChange={setPhiCerco} />
            <CampoNumerico id="sepCercos" etiqueta="Separación cercos" sufijo="m" valor={sepCercos} onChange={setSepCercos} />
            <CampoNumerico id="ramasH" etiqueta="Ramas // h" valor={ramasH} onChange={setRamasH} advertencia="Cortante de la dirección h" />
            <CampoNumerico id="ramasB" etiqueta="Ramas // b" valor={ramasB} onChange={setRamasB} advertencia="Cortante de la dirección b" />
          </div>
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "b × h × l", valor: `${b} × ${h} × ${altura} m` },
              { etiqueta: "NEd", valor: `${nEd} kN` },
              ...(resultado
                ? [
                    { etiqueta: "Armadura", valor: `${resultado.r.numeroBarras}Ø${resultado.v.phi} = ${fmt(resultado.r.asTotalCm2)} cm²`, derivado: true },
                    { etiqueta: "β (h / b)", valor: `${fmt(resultado.beta.h, 2)} / ${fmt(resultado.beta.b, 2)}`, derivado: true },
                    { etiqueta: "φef", valor: `${fmt(resultado.r.fluenciaEficaz, 2)}${resultado.r.fluenciaAdoptada ? " (adoptado)" : ""}`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Esbeltez por dirección con l₀ = β·l y λlim de la ec. (5.13); si λ > λlim, segundo orden por curvatura nominal (art. 5.8.8), con d = h/2 + is de la ec. (5.35).",
              "Imperfección ei = l₀/400 (art. 5.2(7)) y excentricidad mínima e₀ = máx(h/30; 20 mm) (art. 6.1(4)). En la esviada, sólo en la dirección más desfavorable.",
              "Arriostrado: MEd = máx(M02 + NEd·ei; M0e + NEd·ei + M2; NEd·e₀). Sin arriostrar: MEd = máx(M02 + NEd·ei + M2; NEd·e₀).",
              "Sección integrada con el bloque rectangular (art. 3.1.7) y los dominios de la fig. A19.6.1.",
              "Esviada por la ec. (5.39), salvo que se cumplan (5.38a) y (5.38b).",
              "Cortante con k1·σcp (art. 6.2.2) y, si no alcanza, cercos por la ec. (6.8) con cot θ = 1.",
              "Armado según el art. 9.5, con el mínimo por cara 0,05·NEd/fyc,d y fyc,d ≤ 400 MPa.",
              "Sin φef se toma A = 0,7 y φef = 2,14, el mismo en λlim y en la curvatura.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={6} titulo="Resultados">
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
                  { etiqueta: "NEd / NRd,máx", valor: `${fmt(resultado.v.nEd, 0)} / ${fmt(resultado.r.nRdMaxKN, 0)} kN` },
                  ...DIRECCIONES_PILAR.map((dir) => ({
                    etiqueta: `MEd / MRd ${dir}`,
                    valor: `${fmt(resultado.r.flexion[dir].mEdKNm, 1)} / ${fmt(resultado.r.flexion[dir].mRdKNm, 1)} kN·m`,
                    nota: resultado.r.flexion[dir].ignoraSegundoOrden ? "sin segundo orden" : `M2 ${fmt(resultado.r.flexion[dir].m2KNm, 1)}`,
                  })),
                  { etiqueta: "Armadura", valor: `${resultado.r.numeroBarras}Ø${resultado.v.phi}`, nota: `${fmt(resultado.r.asTotalCm2)} cm²` },
                ]}
              />

              <Subgrupo titulo="Compresión">
                <ResultadoCheck
                  etiqueta="Compresión centrada"
                  verifica={resultado.r.verificaAxil}
                  detalle="Tope del diagrama: deformación uniforme εc3, art. 6.1(5)."
                  comparacion={{
                    real: { etiqueta: "NEd", valor: resultado.v.nEd },
                    limite: { etiqueta: "NRd,máx", valor: resultado.r.nRdMaxKN },
                    unidad: "kN", exige: "≤", decimales: 0,
                  }}
                  recomendaciones={propuestas.axil}
                />
              </Subgrupo>

              {DIRECCIONES_PILAR.map((dir) => {
                const f = resultado.r.flexion[dir];
                return (
                  <Subgrupo key={dir} titulo={`Flexocompresión · ${NOMBRE_DIRECCION[dir]}`}>
                    <div>
                      <ResultadoCheck
                        etiqueta={`Flexocompresión en la dirección ${dir}`}
                        verifica={f.verifica}
                        detalle={
                          f.ignoraSegundoOrden
                            ? `λ = ${fmt(f.lambda, 1)} ≤ λlim = ${fmt(f.lambdaLimite, 1)}: sin segundo orden.`
                            : `λ = ${fmt(f.lambda, 1)} > λlim = ${fmt(f.lambdaLimite, 1)}: MEd incluye M2 = ${fmt(f.m2KNm, 1)} kN·m.`
                        }
                        comparacion={{
                          real: { etiqueta: "MEd", valor: f.mEdKNm },
                          limite: { etiqueta: "MRd", valor: f.mRdKNm },
                          unidad: "kN·m", exige: "≤", decimales: 1,
                        }}
                        recomendaciones={propuestas[dir === "h" ? "flexionH" : "flexionB"]}
                      />
                      <div className="mx-auto w-full max-w-xl pt-4">
                        <DiagramaInteraccionMuro
                          diagrama={f.diagrama} nEdKN={resultado.v.nEd} mEdKNm={f.mEdKNm} mRdKNm={f.mRdKNm}
                          verifica={f.verifica} porMetro={false}
                        />
                      </div>
                      <PanelFormulas
                        titulo={`Ver desarrollo de la dirección ${dir}`}
                        filas={[
                          { etiqueta: "l₀ = β·l", valor: `${fmt(f.longitudEfectivaM, 2)} m` },
                          { etiqueta: "i = canto/√12", valor: `${fmt(f.radioGiroM * 100, 2)} cm` },
                          { etiqueta: "λ = l₀/i", valor: fmt(f.lambda, 1) },
                          { etiqueta: "n · ω", valor: `${fmt(resultado.r.axilReducido, 3)} · ${fmt(resultado.r.cuantiaMecanica, 3)}` },
                          { etiqueta: "A · B · C (rm)", valor: `${fmt(f.factorA, 3)} · ${fmt(f.factorB, 3)} · ${fmt(f.factorC, 3)} (${fmt(f.rm, 2)})` },
                          { etiqueta: "λlim = 20·A·B·C/√n  (5.13)", valor: fmt(f.lambdaLimite, 1) },
                          { etiqueta: "M02 · M01 · M0e  (5.32)", valor: `${fmt(f.m02KNm, 1)} · ${fmt(f.m01KNm, 1)} · ${fmt(f.m0eKNm, 1)} kN·m` },
                          { etiqueta: "ei = l₀/400 · e₀", valor: `${fmt(f.eiM * 1000, 1)} · ${fmt(f.e0M * 1000, 1)} mm` },
                          ...(f.ignoraSegundoOrden
                            ? []
                            : [
                                { etiqueta: "d = h/2 + is  (5.35)", valor: `${fmt(f.dCurvaturaM * 100, 2)} cm` },
                                { etiqueta: "Kr · Kφ  (5.36), (5.37)", valor: `${fmt(f.kr, 3)} · ${fmt(f.kPhi, 3)}` },
                                { etiqueta: "1/r  (5.34)", valor: `${fmt(f.curvatura * 1000, 3)} ‰/m` },
                                { etiqueta: `e₂ = (1/r)·l₀²/${f.c}`, valor: `${fmt(f.e2M * 1000, 1)} mm` },
                                { etiqueta: "M2 = NEd·e₂  (5.33)", valor: `${fmt(f.m2KNm, 2)} kN·m` },
                              ]),
                          { etiqueta: "MEd  (5.31)", valor: `${fmt(f.mEdKNm, 2)} kN·m (${f.gobierna === "minimo" ? "mínimo NEd·e₀" : f.gobierna === "segundo-orden" ? "tramo, con M2" : "extremo"})` },
                        ]}
                      />
                    </div>
                  </Subgrupo>
                );
              })}

              <Subgrupo titulo="Flexión esviada" detalle="art. 5.8.9">
                <ResultadoCheck
                  etiqueta="Flexión esviada"
                  verifica={resultado.r.esviada.verifica}
                  estado={resultado.r.esviada.cumple538 ? "no-aplica" : undefined}
                  detalle={
                    resultado.r.esviada.cumple538
                      ? `Se cumplen (5.38a) λ ratio ${fmt(resultado.r.esviada.relacionEsbelteces, 2)} ≤ 2 y (5.38b) ${fmt(resultado.r.esviada.relacionExcentricidades, 2)} ≤ 0,2: no hace falta la (5.39).`
                      : `(MEdh/MRdh)^a + (MEdb/MRdb)^a con a = ${fmt(resultado.r.esviada.exponente, 2)} (NEd/NRd = ${fmt(resultado.v.nEd / resultado.r.esviada.nRdKN, 2)}); la imperfección, en la dirección más desfavorable.`
                  }
                  comparacion={
                    resultado.r.esviada.cumple538
                      ? undefined
                      : { real: { etiqueta: "(5.39)", valor: resultado.r.esviada.valor }, limite: { etiqueta: "límite", valor: 1 }, exige: "≤", decimales: 2 }
                  }
                  recomendaciones={propuestas.esviada}
                />
              </Subgrupo>

              <Subgrupo titulo="Cortante" detalle="arts. 6.2.2 y 6.2.3">
                <div>
                  {DIRECCIONES_PILAR.map((dir) => {
                    const c = resultado.r.cortante[dir];
                    return (
                      <ResultadoCheck
                        key={dir}
                        etiqueta={`Cortante en la dirección ${dir}`}
                        verifica={c.verifica}
                        detalle={
                          c.requiereCercos
                            ? `VEd > VRd,c = ${fmt(c.vRdCKN, 1)} kN: cercos por la (6.8), VRd,s = ${fmt(c.vRdSKN, 1)} kN, con VRd,máx = ${fmt(c.vRdMaxKN, 1)} kN.`
                            : `Sin cercos de cálculo: VRd,c con k1·σcp, σcp = ${fmt(c.sigmaCpMPa, 2)} MPa.`
                        }
                        comparacion={{
                          real: { etiqueta: "VEd", valor: c.vEdKN },
                          limite: { etiqueta: c.requiereCercos ? "VRd" : "VRd,c", valor: c.requiereCercos ? Math.min(c.vRdSKN, c.vRdMaxKN) : c.vRdCKN },
                          unidad: "kN", exige: "≤", decimales: 1,
                        }}
                        recomendaciones={propuestas[dir === "h" ? "cortanteH" : "cortanteB"]}
                      />
                    );
                  })}
                </div>
              </Subgrupo>

              <Subgrupo titulo="Armado" detalle="art. 9.5">
                <div>
                  <ResultadoCheck
                    etiqueta="Es un pilar (lado mayor ≤ 4 · lado menor)"
                    verifica={resultado.r.armado.esPilar}
                    detalle="Art. 9.5.1(1)."
                  />
                  <ResultadoCheck
                    etiqueta="Diámetro de las barras"
                    verifica={resultado.r.armado.verificaDiametro}
                    detalle="Art. 9.5.2(1): Ø ≥ 12 mm."
                    recomendaciones={propuestas.diametro}
                  />
                  {DIRECCIONES_PILAR.map((dir) => (
                    <ResultadoCheck
                      key={dir}
                      etiqueta={`Armadura mínima de cada cara ${dir === "h" ? "b" : "h"}`}
                      verifica={resultado.r.armado.verificaMinimaCara[dir]}
                      detalle={`Art. 9.5.2(2): 0,05·NEd/fyc,d con fyc,d = ${fmt(resultado.r.armado.fycdMPa, 0)} MPa.`}
                      comparacion={{
                        real: { etiqueta: "As cara", valor: resultado.r.armado.asCara[dir] },
                        limite: { etiqueta: "mínima", valor: resultado.r.armado.asMinimaCaraCm2 },
                        unidad: "cm²", exige: "≥",
                      }}
                      recomendaciones={propuestas[dir === "h" ? "minimaH" : "minimaB"]}
                    />
                  ))}
                  <ResultadoCheck
                    etiqueta="Armadura máxima"
                    verifica={resultado.r.armado.verificaMaxima}
                    detalle="Art. 9.5.2(3): 0,04·Ac fuera de los solapes."
                    comparacion={{
                      real: { etiqueta: "As", valor: resultado.r.asTotalCm2 },
                      limite: { etiqueta: "máxima", valor: resultado.r.armado.asMaximaCm2 },
                      unidad: "cm²", exige: "≤",
                    }}
                    recomendaciones={propuestas.maxima}
                  />
                  <ResultadoCheck
                    etiqueta="Diámetro del cerco"
                    verifica={resultado.r.armado.verificaDiametroCerco}
                    detalle={`Art. 9.5.3(1): Ø ≥ máx(6 mm; Ø/4) = ${fmt(resultado.r.armado.diametroCercoMinimoMm, 1)} mm.`}
                    recomendaciones={propuestas.diametroCerco}
                  />
                  <ResultadoCheck
                    etiqueta="Separación de los cercos"
                    verifica={resultado.r.armado.verificaSeparacion}
                    detalle={`Art. 9.5.3(3): mín(15Ø; 300 mm; lado menor). En una longitud igual al lado mayor arriba y abajo de cada viga o losa, y en los solapes con Ø > 14, se reduce a 0,6·s = ${fmt(resultado.r.armado.separacionZonaNudoM * 100, 1)} cm (art. 9.5.3(4)).`}
                    comparacion={{
                      real: { etiqueta: "s", valor: aNumero(sepCercos) },
                      limite: { etiqueta: "s,máx", valor: resultado.r.armado.separacionMaximaM },
                      unidad: "m", exige: "≤", decimales: 3,
                    }}
                    recomendaciones={propuestas.separacion}
                  />
                  <ResultadoCheck
                    etiqueta="Barras sujetas por los cercos"
                    verifica={resultado.r.armado.verificaSujecion}
                    detalle={`Art. 9.5.3(6): ninguna barra comprimida a más de 150 mm de una sujeta. Con las ramas repartidas, la más alejada queda a ${fmt(Math.max(resultado.r.armado.distanciaLibre.h, resultado.r.armado.distanciaLibre.b) * 1000, 0)} mm.`}
                    recomendaciones={propuestas.sujecion}
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
