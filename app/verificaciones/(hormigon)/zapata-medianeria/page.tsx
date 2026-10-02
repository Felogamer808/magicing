"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EditorCapas } from "@/components/verificaciones/comun/EditorCapas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { CroquisCargasZapata, CroquisGeometriaZapata } from "@/components/verificaciones/croquis/CroquisCimentacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { TarjetaLadoZapata } from "@/components/verificaciones/hormigon/TarjetaLadoZapata";
import { ZapataMedianeriaDiagrama } from "@/components/verificaciones/hormigon/ZapataMedianeriaDiagrama";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataMedianeria } from "@/lib/calc/hormigon/cimentaciones/zapata-medianeria";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "zapata-medianeria")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría y suelo" },
  { id: "cargas", titulo: "Cargas" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function ZapataMedianeriaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [A, setA] = useCampo("A", "2.5");
  const [B, setB] = useCampo("B", "1.2");
  const [H, setH] = useCampo("H", "0.5");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.05");
  const [distanciaColumnaLimite, setDistanciaColumnaLimite] = useCampo("distanciaColumnaLimite", "0.7");

  const [anchoPilarA, setAnchoPilarA] = useCampo("anchoPilarA", "0.4");
  const [anchoPilarB, setAnchoPilarB] = useCampo("anchoPilarB", "0.4");

  const [sigmaAdmisible, setSigmaAdmisible] = useCampo("sigmaAdmisible", "300");
  const [Nk, setNk] = useCampo("Nk", "300");
  const [MkA, setMkA] = useCampo("MkA", "0");
  const [MkB, setMkB] = useCampo("MkB", "0");

  const [numeroA, setNumeroA] = useCampo("numeroA", "8");
  const [diametroA, setDiametroA] = useCampo("diametroA", "16");
  const [numeroB, setNumeroB] = useCampo("numeroB", "6");
  const [diametroB, setDiametroB] = useCampo("diametroB", "12");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck),
      fyk: aNumero(fyk),
      A: aNumero(A),
      B: aNumero(B),
      H: aNumero(H),
      recubrimiento: aNumero(recubrimiento),
      distanciaColumnaLimite: aNumero(distanciaColumnaLimite),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      sigmaAdmisible: aNumero(sigmaAdmisible),
      Nk: aNumero(Nk),
      MkA: aNumero(MkA),
      MkB: aNumero(MkB),
      numeroA: aNumero(numeroA),
      diametroA: aNumero(diametroA),
      numeroB: aNumero(numeroB),
      diametroB: aNumero(diametroB),
    };

    const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
    const geometriaValida = v.A > 0 && v.B > 0 && v.H > 0 && v.anchoPilarA > 0 && v.anchoPilarB > 0 && v.distanciaColumnaLimite >= 0;
    const materialesValidos = v.fck > 0 && v.fyk > 0 && v.sigmaAdmisible > 0;
    const armadurasValidas = v.numeroA > 0 && v.diametroA > 0 && v.numeroB > 0 && v.diametroB > 0;
    const cargasValidas = v.Nk > 0;

    if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cargasValidas) {
      return null;
    }

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = {
      A: v.A,
      B: v.B,
      H: v.H,
      anchoPilarA: v.anchoPilarA,
      anchoPilarB: v.anchoPilarB,
      recubrimiento: v.recubrimiento,
      distanciaColumnaLimite: v.distanciaColumnaLimite,
    };

    const zapata = calcularZapataMedianeria(materiales, geometria, v.sigmaAdmisible, {
      cargas: { Nk: v.Nk, MkA: v.MkA, MkB: v.MkB },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
    });

    return { zapata };
  }, [
    fck, fyk, A, B, H, recubrimiento, distanciaColumnaLimite, anchoPilarA, anchoPilarB,
    sigmaAdmisible, Nk, MkA, MkB, numeroA, diametroA, numeroB, diametroB,
  ]);

  const diagrama = useMemo(() => {
    const v = {
      A: aNumero(A),
      B: aNumero(B),
      anchoPilarA: aNumero(anchoPilarA),
      anchoPilarB: aNumero(anchoPilarB),
      distanciaColumnaLimite: aNumero(distanciaColumnaLimite),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0) || v.A <= 0 || v.B <= 0) return null;
    return {
      AM: v.A,
      BM: v.B,
      anchoPilarAM: v.anchoPilarA,
      anchoPilarBM: v.anchoPilarB,
      distanciaColumnaLimiteM: v.distanciaColumnaLimite,
    };
  }, [A, B, anchoPilarA, anchoPilarB, distanciaColumnaLimite]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular." });
  } else if (!resultado.zapata.dentroDelNucleo) {
    avisos.push({
      tipo: "aviso",
      texto: "Excentricidad fuera del núcleo central: la distribución lineal dejaría tracciones en el suelo. Con esta geometría hace falta una viga centradora que la conecte con una zapata interior.",
    });
  }

  const planta = diagrama ? (
    <ZapataMedianeriaDiagrama {...diagrama} />
  ) : (
    <CroquisGeometriaZapata />
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
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
        <Etapa id="geometria" numero={1} titulo="Geometría, materiales y suelo" descripcion="Zapata con el pilar pegado al límite del terreno.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Materiales y suelo">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                    <CampoNumerico id="sigmaAdmisible" etiqueta="σ adm. suelo" sufijo="kN/m²" valor={sigmaAdmisible} onChange={setSigmaAdmisible} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Zapata">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="A" etiqueta="A" sufijo="m" valor={A} onChange={setA} />
                    <CampoNumerico id="B" etiqueta="B" sufijo="m" valor={B} onChange={setB} />
                    <CampoNumerico id="H" etiqueta="H" sufijo="m" valor={H} onChange={setH} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="distanciaColumnaLimite" etiqueta="Sep. al límite" sufijo="m" valor={distanciaColumnaLimite} onChange={setDistanciaColumnaLimite} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Pilar">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="anchoPilarA" etiqueta="Ancho // A" sufijo="m" valor={anchoPilarA} onChange={setAnchoPilarA} />
                    <CampoNumerico id="anchoPilarB" etiqueta="Ancho // B" sufijo="m" valor={anchoPilarB} onChange={setAnchoPilarB} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={planta}
          />
        </Etapa>

        <Etapa id="cargas" numero={2} titulo="Cargas" descripcion="Esfuerzos característicos que baja el pilar.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="Nk" etiqueta="Nk" sufijo="kN" valor={Nk} onChange={setNk} />
                <CampoNumerico id="MkA" etiqueta="Mk A" sufijo="kN·m" valor={MkA} onChange={setMkA} />
                <CampoNumerico id="MkB" etiqueta="Mk B" sufijo="kN·m" valor={MkB} onChange={setMkB} />
              </div>
            }
            dibujo={<CroquisCargasZapata />}
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura" descripcion="Parrilla inferior en las dos direcciones.">
          <DatosConDibujo
            datos={
              <Subgrupo titulo="Parrilla">
                <EditorCapas
                  filas={[
                    {
                      posicion: "Dirección A",
                      numero: { id: "numeroA", valor: numeroA, onChange: setNumeroA },
                      diametro: { id: "diametroA", valor: diametroA, onChange: setDiametroA },
                    },
                    {
                      posicion: "Dirección B",
                      numero: { id: "numeroB", valor: numeroB, onChange: setNumeroB },
                      diametro: { id: "diametroB", valor: diametroB, onChange: setDiametroB },
                    },
                  ]}
                />
              </Subgrupo>
            }
            dibujo={planta}
          />
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "A × B × H", valor: `${A} × ${B} × ${H} m` },
              { etiqueta: "σ adm. suelo", valor: `${sigmaAdmisible} kN/m²` },
              ...(resultado
                ? [
                    { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN`, derivado: true },
                    { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.excentricidadM, 3)} m`, derivado: true },
                    { etiqueta: "Tipo", valor: resultado.zapata.esRigida ? "rígida (vuelo ≤ 2H)" : "flexible (vuelo > 2H)", derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "No viene de la planilla: distribución lineal de presiones con la excentricidad del pilar respecto del centro de la zapata.",
              "No incluye punzonamiento. Revisar antes de usar en obra.",
              "Cuantías mínimas heredadas de la planilla (EHE‑08); pendiente pasarlas al Anejo 19, art. 9.8.",
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
                    etiqueta: "tensión del terreno",
                    estado: resultado.zapata.geotecnico.verificaTension ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.geotecnico.sigmaKPa / aNumero(sigmaAdmisible),
                  },
                  {
                    etiqueta: "excentricidad en el núcleo central",
                    estado: resultado.zapata.dentroDelNucleo ? "cumple" : "no-cumple",
                  },
                  {
                    etiqueta: "armadura del lado límite",
                    estado: resultado.zapata.ladoLimite.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.ladoLimite.asNecCm2 / resultado.zapata.ladoLimite.asRealCm2,
                  },
                  {
                    etiqueta: "cortante del lado límite",
                    estado: resultado.zapata.ladoLimite.verificaCorte ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.ladoLimite.vEdKN / resultado.zapata.ladoLimite.vRdCKN,
                  },
                  {
                    etiqueta: "armadura del lado interior",
                    estado: resultado.zapata.ladoInterior.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.ladoInterior.asNecCm2 / resultado.zapata.ladoInterior.asRealCm2,
                  },
                  {
                    etiqueta: "cortante del lado interior",
                    estado: resultado.zapata.ladoInterior.verificaCorte ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.ladoInterior.vEdKN / resultado.zapata.ladoInterior.vRdCKN,
                  },
                  {
                    etiqueta: "armadura en B",
                    estado: resultado.zapata.direccionB.verificaAs ? "cumple" : "no-cumple",
                    utilizacion: resultado.zapata.direccionB.asNecCm2 / resultado.zapata.direccionB.asRealCm2,
                  },
                ]}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.zapata.geotecnico.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(aNumero(sigmaAdmisible))}` },
                  { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.excentricidadM, 3)} m`, nota: resultado.zapata.dentroDelNucleo ? "dentro del núcleo" : "fuera del núcleo" },
                  { etiqueta: "As nec. límite / interior", valor: `${fmt(resultado.zapata.ladoLimite.asNecCm2)} / ${fmt(resultado.zapata.ladoInterior.asNecCm2)} cm²` },
                  { etiqueta: "As nec. B", valor: `${fmt(resultado.zapata.direccionB.asNecCm2)} cm²` },
                ]}
              />

              <Subgrupo titulo="Geotecnia">
                <div>
                  <ResultadoCheck
                    etiqueta="Tensión admisible del terreno"
                    verifica={resultado.zapata.geotecnico.verificaTension}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.zapata.geotecnico.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: aNumero(sigmaAdmisible) },
                      unidad: "kN/m²", exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Excentricidad dentro del núcleo central (±A/6)"
                    verifica={resultado.zapata.dentroDelNucleo}
                    detalle={resultado.zapata.dentroDelNucleo ? undefined : "Hace falta una viga centradora: la zapata sola dejaría tracciones en el suelo."}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo geotécnico"
                    filas={[
                      { etiqueta: "Peso propio", valor: `${fmt(resultado.zapata.geotecnico.pesoPropioKN)} kN` },
                      { etiqueta: "Excentricidad", valor: `${fmt(resultado.zapata.excentricidadM, 3)} m` },
                      { etiqueta: "Zapata rígida (vuelo ≤ 2H)", valor: resultado.zapata.esRigida ? "Sí" : "No" },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Comprobaciones estructurales">
                <div>
                  <TarjetaLadoZapata titulo="Lado límite (vuelo corto)" resultado={resultado.zapata.ladoLimite} />
                  <TarjetaLadoZapata titulo="Lado interior (vuelo largo)" resultado={resultado.zapata.ladoInterior} />
                  <ResultadoCheck
                    etiqueta="Dirección B · armadura suficiente"
                    verifica={resultado.zapata.direccionB.verificaAs}
                    comparacion={{
                      real: { etiqueta: "As real", valor: resultado.zapata.direccionB.asRealCm2 },
                      limite: { etiqueta: "As nec", valor: resultado.zapata.direccionB.asNecCm2 },
                      unidad: "cm²", exige: "≥",
                    }}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
