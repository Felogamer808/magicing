"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionResultados } from "@/components/verificaciones/comun/ConclusionResultados";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { LosaDiagrama } from "@/components/verificaciones/hormigon/LosaDiagrama";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { TarjetaDireccionLosa } from "@/components/verificaciones/hormigon/TarjetaDireccionLosa";
import { calcularLosa, calcularMomentoResistenteLosa } from "@/lib/calc/hormigon/losas/losa";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisCapasLosa,
  CroquisGeometriaLosa,
  CroquisMomentosLosa,
} from "@/components/verificaciones/croquis/CroquisLosa";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "losas")!;

const ETAPAS = [
  { id: "geometria", titulo: "Geometría" },
  { id: "momentos", titulo: "Momentos" },
  { id: "armado", titulo: "Armado" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

export default function LosasPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [e, setE] = useCampo("e", "0.15");
  const [rgPos, setRgPos] = useCampo("rgPos", "0.02");
  const [rgNeg, setRgNeg] = useCampo("rgNeg", "0.02");
  const [formaAnclaje, setFormaAnclaje] = useCampo("formaAnclaje", "Recta");

  const [mxPos, setMxPos] = useCampo("mxPos", "50");
  const [myPos, setMyPos] = useCampo("myPos", "30");
  const [mxNeg, setMxNeg] = useCampo("mxNeg", "40");
  const [myNeg, setMyNeg] = useCampo("myNeg", "20");

  const [phiPosX, setPhiPosX] = useCampo("phiPosX", "12");
  const [sPosX, setSPosX] = useCampo("sPosX", "0.1");
  const [phiPosY, setPhiPosY] = useCampo("phiPosY", "10");
  const [sPosY, setSPosY] = useCampo("sPosY", "0.15");
  const [phiNegX, setPhiNegX] = useCampo("phiNegX", "12");
  const [sNegX, setSNegX] = useCampo("sNegX", "0.15");
  const [phiNegY, setPhiNegY] = useCampo("phiNegY", "10");
  const [sNegY, setSNegY] = useCampo("sNegY", "0.15");

  const resultado = useMemo(() => {
    const v = {
      fck: aNumero(fck), fyk: aNumero(fyk),
      e: aNumero(e), rgPos: aNumero(rgPos), rgNeg: aNumero(rgNeg),
      mxPos: aNumero(mxPos), myPos: aNumero(myPos), mxNeg: aNumero(mxNeg), myNeg: aNumero(myNeg),
      phiPosX: aNumero(phiPosX), sPosX: aNumero(sPosX),
      phiPosY: aNumero(phiPosY), sPosY: aNumero(sPosY),
      phiNegX: aNumero(phiNegX), sNegX: aNumero(sNegX),
      phiNegY: aNumero(phiNegY), sNegY: aNumero(sNegY),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0)) return null;
    if (v.e <= 0 || v.fck <= 0 || v.fyk <= 0) return null;
    if ([v.phiPosX, v.sPosX, v.phiPosY, v.sPosY, v.phiNegX, v.sNegX, v.phiNegY, v.sNegY].some((n) => n <= 0)) return null;

    const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
    const geometria = { e: v.e, recubrimientoPositivo: v.rgPos, recubrimientoNegativo: v.rgNeg };

    const losa = calcularLosa(materiales, geometria, {
      momentoPositivoX: v.mxPos, momentoPositivoY: v.myPos,
      momentoNegativoX: v.mxNeg, momentoNegativoY: v.myNeg,
      armadoPositivoX: { diametroMm: v.phiPosX, separacionM: v.sPosX },
      armadoPositivoY: { diametroMm: v.phiPosY, separacionM: v.sPosY },
      armadoNegativoX: { diametroMm: v.phiNegX, separacionM: v.sNegX },
      armadoNegativoY: { diametroMm: v.phiNegY, separacionM: v.sNegY },
      formaAnclaje: formaAnclaje === "Patilla o gancho" ? "gancho" : "recta",
    });

    const resistente = calcularMomentoResistenteLosa(materiales, v.e, v.rgPos, {
      diametroMm: v.phiPosX, separacionM: v.sPosX,
    });

    return { losa, resistente, v };
  }, [fck, fyk, e, rgPos, rgNeg, mxPos, myPos, mxNeg, myNeg, phiPosX, sPosX, phiPosY, sPosY, phiNegX, sNegX, phiNegY, sNegY, formaAnclaje]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: el espesor, los materiales, los diámetros y las separaciones tienen que ser positivos." });

  const direcciones = resultado
    ? [
        { etiqueta: "positivo X", r: resultado.losa.positivo.x },
        { etiqueta: "positivo Y", r: resultado.losa.positivo.y },
        { etiqueta: "negativo X", r: resultado.losa.negativo.x },
        { etiqueta: "negativo Y", r: resultado.losa.negativo.y },
      ]
    : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Losas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Materiales y geometría" descripcion="Espesor de la losa, recubrimientos de cada cara y forma de anclaje de las barras.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                <CampoNumerico id="e" etiqueta="Espesor e" sufijo="m" valor={e} onChange={setE} />
                <div />
                <CampoNumerico id="rgPos" etiqueta="rg positivos" sufijo="m" valor={rgPos} onChange={setRgPos} />
                <CampoNumerico id="rgNeg" etiqueta="rg negativos" sufijo="m" valor={rgNeg} onChange={setRgNeg} />
                <div className="col-span-full">
                  <CampoSeleccion
                    id="formaAnclaje"
                    etiqueta="Anclaje de las barras"
                    valor={formaAnclaje}
                    opciones={["Recta", "Patilla o gancho"]}
                    onChange={setFormaAnclaje}
                  />
                </div>
              </div>
            }
            dibujo={<CroquisGeometriaLosa />}
          />
        </Etapa>

        <Etapa id="momentos" numero={2} titulo="Momentos de cálculo" descripcion="Por metro de ancho, en cada dirección y cada cara.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="mxPos" etiqueta="Mx +" sufijo="kN·m/m" valor={mxPos} onChange={setMxPos} />
                <CampoNumerico id="myPos" etiqueta="My +" sufijo="kN·m/m" valor={myPos} onChange={setMyPos} />
                <CampoNumerico id="mxNeg" etiqueta="Mx −" sufijo="kN·m/m" valor={mxNeg} onChange={setMxNeg} />
                <CampoNumerico id="myNeg" etiqueta="My −" sufijo="kN·m/m" valor={myNeg} onChange={setMyNeg} />
              </div>
            }
            dibujo={<CroquisMomentosLosa />}
          />
        </Etapa>

        <Etapa id="armado" numero={3} titulo="Armado" descripcion="Diámetro y separación de cada malla.">
          <div className="grid gap-8 sm:grid-cols-2">
            <Subgrupo titulo="Positivo (cara inferior)">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <CroquisCapasLosa cara="inferior" />
                </div>
                <CampoDiametro id="phiPosX" etiqueta="Ø X" valor={phiPosX} onChange={setPhiPosX} />
                <CampoNumerico id="sPosX" etiqueta="s X" sufijo="m" valor={sPosX} onChange={setSPosX} />
                <CampoDiametro id="phiPosY" etiqueta="Ø Y" valor={phiPosY} onChange={setPhiPosY} />
                <CampoNumerico id="sPosY" etiqueta="s Y" sufijo="m" valor={sPosY} onChange={setSPosY} />
              </div>
            </Subgrupo>
            <Subgrupo titulo="Negativo (cara superior)">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <CroquisCapasLosa cara="superior" />
                </div>
                <CampoDiametro id="phiNegX" etiqueta="Ø X" valor={phiNegX} onChange={setPhiNegX} />
                <CampoNumerico id="sNegX" etiqueta="s X" sufijo="m" valor={sNegX} onChange={setSNegX} />
                <CampoDiametro id="phiNegY" etiqueta="Ø Y" valor={phiNegY} onChange={setPhiNegY} />
                <CampoNumerico id="sNegY" etiqueta="s Y" sufijo="m" valor={sNegY} onChange={setSNegY} />
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk", valor: `${fck} / ${fyk} MPa` },
              { etiqueta: "Espesor", valor: `${e} m` },
              { etiqueta: "rg positivos / negativos", valor: `${rgPos} / ${rgNeg} m` },
              { etiqueta: "Mx+ · My+", valor: `${mxPos} · ${myPos} kN·m/m` },
              { etiqueta: "Mx− · My−", valor: `${mxNeg} · ${myNeg} kN·m/m` },
              { etiqueta: "Positivo X · Y", valor: `Ø${phiPosX}/${sPosX} · Ø${phiPosY}/${sPosY} m` },
              { etiqueta: "Negativo X · Y", valor: `Ø${phiNegX}/${sNegX} · Ø${phiNegY}/${sNegY} m` },
              { etiqueta: "Anclaje", valor: formaAnclaje },
              ...(resultado ? [{ etiqueta: "As,min", valor: `${fmt(resultado.losa.asMinCm2PorM)} cm²/m`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Cada dirección y cada cara se resuelven por separado, por metro de ancho, con bloque rectangular de compresión: ω = 1 − √(1 − 2μ).",
              "Cuantía mínima del Anejo 19, art. 9.3.1.1 (1) → 9.2.1.1 (1), ec. (9.1), con fctm,fl del espesor (ec. 3.23).",
              "Como en la planilla, el armado positivo en X computa la malla general de Y más el refuerzo propio en X.",
              "Canto útil del positivo con el recubrimiento de positivos (la planilla usaba el de negativos).",
              "Anclaje por el Anejo 19, art. 8.4, con σsd = fyd·As,nec/As,real, cd = mín(a/2, c) y adherencia según la fig. A19.8.2.",
              "Separación máxima informada: mín(s necesaria, 3e, 30 cm), redondeada a 2 cm.",
              "No incluye punzonamiento: está en su propia página.",
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
                comprobaciones={direcciones.map((d) => ({
                  etiqueta: `armado ${d.etiqueta}`,
                  estado: d.r.verificaAs ? "cumple" : "no-cumple",
                  utilizacion: d.r.aprovechamiento,
                }))}
              />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "As,min", valor: `${fmt(resultado.losa.asMinCm2PorM)} cm²/m`, nota: `fctm,fl ${fmt(resultado.losa.fctmFlMPa, 2)} MPa` },
                  { etiqueta: "d positivo X", valor: `${fmt(resultado.losa.positivo.x.dM, 3)} m` },
                  { etiqueta: "d negativo X", valor: `${fmt(resultado.losa.negativo.x.dM, 3)} m` },
                  { etiqueta: "MRd positivo X", valor: `${fmt(resultado.resistente.momentoKNmPorM)} kN·m/m`, nota: "sin la malla de Y" },
                ]}
              />

              <Subgrupo titulo="Sección" detalle="escala vertical exagerada">
                <div className="flex justify-center">
                  <LosaDiagrama
                    eM={resultado.v.e}
                    recubrimientoPositivoM={resultado.v.rgPos}
                    recubrimientoNegativoM={resultado.v.rgNeg}
                    diametroPosXMm={resultado.v.phiPosX}
                    diametroPosYMm={resultado.v.phiPosY}
                    diametroNegXMm={resultado.v.phiNegX}
                    diametroNegYMm={resultado.v.phiNegY}
                    dPosXM={resultado.losa.positivo.x.dM}
                    dPosYM={resultado.losa.positivo.y.dM}
                  />
                </div>
              </Subgrupo>

              <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
                <TarjetaDireccionLosa
                  titulo="Positivo — dirección X"
                  r={resultado.losa.positivo.x}
                  diametroMm={resultado.v.phiPosX}
                  separacionM={resultado.v.sPosX}
                  nota="Como en la planilla, el armado en X computa la malla general de Y más el refuerzo propio en X."
                />
                <TarjetaDireccionLosa
                  titulo="Positivo — dirección Y"
                  r={resultado.losa.positivo.y}
                  diametroMm={resultado.v.phiPosY}
                  separacionM={resultado.v.sPosY}
                />
                <TarjetaDireccionLosa
                  titulo="Negativo — dirección X"
                  r={resultado.losa.negativo.x}
                  diametroMm={resultado.v.phiNegX}
                  separacionM={resultado.v.sNegX}
                />
                <TarjetaDireccionLosa
                  titulo="Negativo — dirección Y"
                  r={resultado.losa.negativo.y}
                  diametroMm={resultado.v.phiNegY}
                  separacionM={resultado.v.sNegY}
                />
              </div>

              <Subgrupo titulo="Momento resistente del armado positivo X" detalle="informativo">
                <div className="space-y-2">
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {fmt(resultado.resistente.momentoKNmPorM)} kN·m/m
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lo que resiste Ø{fmt(resultado.v.phiPosX, 0)}/{fmt(resultado.v.sPosX * 100, 0)} cm por sí solo
                    (As {fmt(resultado.resistente.asRealCm2PorM)} cm²/m, d {fmt(resultado.resistente.dM, 3)} m),
                    sin contar la malla de Y.
                  </p>
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}
