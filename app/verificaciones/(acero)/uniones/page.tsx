"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Label } from "@/components/ui/label";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { type Electrodo } from "@/lib/calc/acero/uniones";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisChapaBase,
  CroquisPerfilSoldadura,
} from "@/components/verificaciones/croquis/CroquisVarios";
import { resolverChapaBase, resolverSoldadura } from "@/lib/calc/acero/resolver-uniones";
import { recomendarUniones } from "@/lib/verificaciones/recomendaciones/uniones";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "soldaduras")!;

const ETAPAS = [
  { id: "cordon", titulo: "Cordón" },
  { id: "chapa", titulo: "Chapa de base" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const ELECTRODOS: readonly Electrodo[] = ["E60", "E70", "E80"];

export default function UnionesPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");

  // Soldadura
  const [hMm, setHMm] = useCampo("hMm", "150");
  const [bMm, setBMm] = useCampo("bMm", "240");
  const [tfMm, setTfMm] = useCampo("tfMm", "15.9");
  const [twMm, setTwMm] = useCampo("twMm", "12.7");
  const [lado, setLado] = useCampo("lado", "9.5");
  const [electrodo, setElectrodo] = useCampo<Electrodo>("electrodo", "E60");
  const [px, setPx] = useCampo("px", "0");
  const [py, setPy] = useCampo("py", "160");
  const [pz, setPz] = useCampo("pz", "0");
  const [mx, setMx] = useCampo("mx", "40");
  const [my, setMy] = useCampo("my", "0");
  const [mz, setMz] = useCampo("mz", "0");

  // Chapa
  const [fy, setFy] = useCampo("fy", "310");
  const [fu, setFu] = useCampo("fu", "407.8");
  const [fck, setFck] = useCampo("fck", "25");
  const [lx, setLx] = useCampo("lx", "0.4");
  const [ly, setLy] = useCampo("ly", "0.4");
  const [tChapa, setTChapa] = useCampo("tChapa", "0.0095");
  const [dPerno, setDPerno] = useCampo("dPerno", "15");
  const [lc, setLc] = useCampo("lc", "0.137");
  const [nPernos, setNPernos] = useCampo("nPernos", "12");
  const [ag, setAg] = useCampo("ag", "0.041");
  const [ae, setAe] = useCampo("ae", "0.038");
  const [nMax, setNMax] = useCampo("nMax", "400");
  const [cortePerno, setCortePerno] = useCampo("cortePerno", "41.5");
  const [momentoPernos, setMomentoPernos] = useCampo("momentoPernos", "25.2");
  const [distancias, setDistancias] = useCampo("distancias", "0.18, 0.127");

  const campos = useMemo(
    () => ({ hMm, bMm, tfMm, twMm, lado, electrodo, px, py, pz, mx, my, mz, fy, fu, fck, lx, ly, tChapa, dPerno, lc, nPernos, ag, ae, nMax, cortePerno, momentoPernos, distancias }),
    [hMm, bMm, tfMm, twMm, lado, electrodo, px, py, pz, mx, my, mz, fy, fu, fck, lx, ly, tChapa, dPerno, lc, nPernos, ag, ae, nMax, cortePerno, momentoPernos, distancias]
  );
  const soldadura = useMemo(() => resolverSoldadura(campos), [campos]);
  const chapa = useMemo(() => resolverChapaBase(campos), [campos]);
  // Cambios recalculados para lo que no cumple o queda justo.
  const rec = useMemo(() => recomendarUniones(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!soldadura) avisos.push({ tipo: "error", texto: "Cordón: completá los datos del perfil (tw y 2·tf menores que H)." });
  if (!chapa) avisos.push({ tipo: "error", texto: "Chapa de base: completá los datos (Lx tiene que superar 0,12 m y hace falta al menos una distancia de pernos)." });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Uniones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="cordon" numero={1} titulo="Cordón de soldadura" descripcion="Cordón perimetral alrededor de un perfil H, y las solicitaciones que transmite.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <CampoNumerico id="hMm" etiqueta="H" sufijo="mm" valor={hMm} onChange={setHMm} />
                  <CampoNumerico id="bMm" etiqueta="B" sufijo="mm" valor={bMm} onChange={setBMm} />
                  <CampoNumerico id="tfMm" etiqueta="tf" sufijo="mm" valor={tfMm} onChange={setTfMm} />
                  <CampoNumerico id="twMm" etiqueta="tw" sufijo="mm" valor={twMm} onChange={setTwMm} />
                  <CampoNumerico id="lado" etiqueta="Lado D" sufijo="mm" valor={lado} onChange={setLado} />
                  <CampoSeleccion id="electrodo" etiqueta="Electrodo" valor={electrodo} opciones={ELECTRODOS} onChange={(v) => setElectrodo(v as Electrodo)} />
                </div>
                <Subgrupo titulo="Solicitaciones">
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="px" etiqueta="Px" sufijo="kN" valor={px} onChange={setPx} />
                    <CampoNumerico id="py" etiqueta="Py" sufijo="kN" valor={py} onChange={setPy} />
                    <CampoNumerico id="pz" etiqueta="Pz" sufijo="kN" valor={pz} onChange={setPz} />
                    <CampoNumerico id="mx" etiqueta="Mx" sufijo="kN·m" valor={mx} onChange={setMx} />
                    <CampoNumerico id="my" etiqueta="My" sufijo="kN·m" valor={my} onChange={setMy} />
                    <CampoNumerico id="mz" etiqueta="Mz" sufijo="kN·m" valor={mz} onChange={setMz} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={<CroquisPerfilSoldadura />}
          />
        </Etapa>

        <Etapa id="chapa" numero={2} titulo="Chapa de base" descripcion="Chapa de pilar con pernos de anclaje sobre el hormigón.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-3 gap-4">
                  <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
                  <CampoNumerico id="fu" etiqueta="Fu" sufijo="MPa" valor={fu} onChange={setFu} />
                  <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                </div>
                <Subgrupo titulo="Chapa y pernos">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="lx" etiqueta="Lx" sufijo="m" valor={lx} onChange={setLx} />
                    <CampoNumerico id="ly" etiqueta="Ly" sufijo="m" valor={ly} onChange={setLy} />
                    <CampoNumerico id="tChapa" etiqueta="t" sufijo="m" valor={tChapa} onChange={setTChapa} />
                    <CampoNumerico id="dPerno" etiqueta="φ perno" sufijo="mm" valor={dPerno} onChange={setDPerno} />
                    <CampoNumerico id="lc" etiqueta="lc" sufijo="m" valor={lc} onChange={setLc} />
                    <CampoNumerico id="nPernos" etiqueta="Nº pernos" valor={nPernos} onChange={setNPernos} />
                    <CampoNumerico id="ag" etiqueta="Ag" sufijo="m²" valor={ag} onChange={setAg} />
                    <CampoNumerico id="ae" etiqueta="Ae" sufijo="m²" valor={ae} onChange={setAe} />
                  </div>
                </Subgrupo>
                <Subgrupo titulo="Solicitaciones">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <CampoNumerico id="nMax" etiqueta="N máx" sufijo="kN" valor={nMax} onChange={setNMax} />
                      <CampoNumerico id="cortePerno" etiqueta="Corte" sufijo="kN" valor={cortePerno} onChange={setCortePerno} />
                      <CampoNumerico id="momentoPernos" etiqueta="M" sufijo="kN·m" valor={momentoPernos} onChange={setMomentoPernos} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="distancias">Distancias de las filas de pernos al eje (m), separadas por coma</Label>
                      <input
                        id="distancias"
                        type="text"
                        value={distancias}
                        onChange={(e) => setDistancias(e.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={<CroquisChapaBase />}
          />
        </Etapa>

        <Etapa id="revision" numero={3} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Perfil H × B", valor: `${hMm} × ${bMm} mm, tf ${tfMm} · tw ${twMm} mm` },
              { etiqueta: "Cordón", valor: `D = ${lado} mm, ${electrodo}` },
              { etiqueta: "P (x, y, z)", valor: `${px} · ${py} · ${pz} kN` },
              { etiqueta: "M (x, y, z)", valor: `${mx} · ${my} · ${mz} kN·m` },
              { etiqueta: "Chapa", valor: `${lx} × ${ly} m, t = ${tChapa} m · Fy ${fy} / Fu ${fu} MPa` },
              { etiqueta: "Pernos", valor: `${nPernos} φ${dPerno} mm` },
              { etiqueta: "Hormigón", valor: `fck ${fck} MPa` },
              { etiqueta: "N · V · M en la base", valor: `${nMax} kN · ${cortePerno} kN · ${momentoPernos} kN·m` },
            ]}
            hipotesis={[
              "Método ASD, siguiendo el planteo de las hojas SOLDADURA H y CHAPA PILARES de la planilla.",
              "Cordón: tensión admisible 0,6·Fnw/2 según el electrodo; lado mínimo según el menor espesor a unir (AISC J2.4).",
              "Pernos: el momento se reparte entre filas proporcionalmente a su distancia al eje de giro; la fila más alejada toma la fuerza mayor.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={4} titulo="Resultados">
          {!soldadura && !chapa ? (
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
                  { etiqueta: "τ cordón", valor: soldadura ? `${fmt(soldadura.tauKPa / 1000, 1)} MPa` : "—", nota: soldadura ? `adm ${fmt(soldadura.tauAdmKPa / 1000, 1)} MPa` : undefined },
                  { etiqueta: "Garganta", valor: soldadura ? `${fmt(soldadura.gargantaMm, 2)} mm` : "—" },
                  { etiqueta: "N hormigón", valor: chapa ? `${fmt(chapa.aplastamientoHormigon.solicitacionKN)} kN` : "—", nota: chapa ? `adm ${fmt(chapa.aplastamientoHormigon.admisibleKN)} kN` : undefined },
                  { etiqueta: "F1 perno", valor: chapa ? `${fmt(chapa.traccionPernos.solicitacionKN)} kN` : "—", nota: chapa ? `adm ${fmt(chapa.traccionPernos.admisibleKN)} kN` : undefined },
                ]}
              />

              {soldadura ? (
                <Subgrupo titulo="Cordón de soldadura" detalle={`electrodo ${electrodo}`}>
                  <div className="space-y-3">
                    <ResultadoCheck
                      etiqueta={`Tensión admisible del electrodo ${electrodo}`}
                      verifica={soldadura.verifica}
                      comparacion={{
                        real: { etiqueta: "τ", valor: soldadura.tauKPa / 1000 },
                        limite: { etiqueta: "τ adm", valor: soldadura.tauAdmKPa / 1000 },
                        unidad: "MPa", exige: "≤", decimales: 1,
                      }}
                      recomendaciones={rec.soldadura}
                    />
                    <ResultadoCheck
                      etiqueta="Lado del cordón dentro del rango admitido"
                      verifica={soldadura.ladoEnRango}
                      detalle={`D ${fmt(aNumero(lado), 1)} mm · rango ${fmt(soldadura.dMinMm, 0)} a ${fmt(soldadura.dMaxMm, 1)} mm`}
                    />
                    <PanelFormulas
                      titulo="Ver desarrollo del cordón"
                      filas={[
                        { etiqueta: "Garganta g = D/√2", valor: `${fmt(soldadura.gargantaMm, 2)} mm` },
                        { etiqueta: "Longitud total del cordón", valor: `${fmt(soldadura.longitudMm, 1)} mm` },
                        { etiqueta: "Ix", valor: `${fmt(soldadura.ixMm4 / 1e6, 1)} ×10⁶ mm⁴` },
                        { etiqueta: "Iy", valor: `${fmt(soldadura.iyMm4 / 1e6, 1)} ×10⁶ mm⁴` },
                        { etiqueta: "Ip", valor: `${fmt(soldadura.ipMm4 / 1e6, 1)} ×10⁶ mm⁴` },
                        { etiqueta: "τ por fuerza (x, y, z)", valor: `${fmt(soldadura.tauXPKPa / 1000, 1)} / ${fmt(soldadura.tauYPKPa / 1000, 1)} / ${fmt(soldadura.tauZPKPa / 1000, 1)} MPa` },
                        { etiqueta: "τ por momento (x, y, z)", valor: `${fmt(soldadura.tauXMKPa / 1000, 1)} / ${fmt(soldadura.tauYMKPa / 1000, 1)} / ${fmt(soldadura.tauZMKPa / 1000, 1)} MPa` },
                      ]}
                    />
                  </div>
                </Subgrupo>
              ) : (
                <Subgrupo titulo="Cordón de soldadura">
                  <div className="flex items-center gap-3 text-sm">
                    <EstadoVerificacionChip estado="datos-insuficientes" />
                    <span className="text-muted-foreground">Faltan datos del perfil.</span>
                  </div>
                </Subgrupo>
              )}

              {chapa ? (
                <Subgrupo titulo="Chapa de base">
                  <div className="space-y-3">
                    <ResultadoCheck
                      etiqueta="I. Aplastamiento del hormigón"
                      verifica={chapa.aplastamientoHormigon.verifica}
                      comparacion={{ real: { etiqueta: "N", valor: chapa.aplastamientoHormigon.solicitacionKN }, limite: { etiqueta: "admisible", valor: chapa.aplastamientoHormigon.admisibleKN }, unidad: "kN", exige: "≤" }}
                      recomendaciones={rec.aplastamientoHormigon}
                    />
                    <ResultadoCheck
                      etiqueta="II. Aplastamiento de la chapa"
                      verifica={chapa.aplastamientoChapa.verifica}
                      comparacion={{ real: { etiqueta: "R", valor: chapa.aplastamientoChapa.solicitacionKN }, limite: { etiqueta: "admisible", valor: chapa.aplastamientoChapa.admisibleKN }, unidad: "kN", exige: "≤" }}
                      recomendaciones={rec.aplastamientoChapa}
                    />
                    <ResultadoCheck
                      etiqueta="III. Tracción en la chapa"
                      verifica={chapa.traccionChapa.verifica}
                      comparacion={{ real: { etiqueta: "N", valor: chapa.traccionChapa.solicitacionKN }, limite: { etiqueta: "admisible", valor: chapa.traccionChapa.admisibleKN }, unidad: "kN", exige: "≤" }}
                      recomendaciones={rec.traccionChapa}
                    />
                    <ResultadoCheck
                      etiqueta="IV. Corte en los pernos"
                      verifica={chapa.cortePernos.verifica}
                      comparacion={{ real: { etiqueta: "R", valor: chapa.cortePernos.solicitacionKN }, limite: { etiqueta: "admisible", valor: chapa.cortePernos.admisibleKN }, unidad: "kN por perno", exige: "≤" }}
                      recomendaciones={rec.cortePernos}
                    />
                    <ResultadoCheck
                      etiqueta="V. Tracción en los pernos"
                      verifica={chapa.traccionPernos.verifica}
                      comparacion={{ real: { etiqueta: "F1", valor: chapa.traccionPernos.solicitacionKN }, limite: { etiqueta: "admisible", valor: chapa.traccionPernos.admisibleKN }, unidad: "kN", exige: "≤" }}
                      recomendaciones={rec.traccionPernos}
                    />
                    <PanelFormulas
                      titulo="Ver fuerza en cada fila de pernos"
                      filas={chapa.fuerzasPernosKN.map((f, i) => ({ etiqueta: `F${i + 1}`, valor: `${fmt(f)} kN` }))}
                    />
                  </div>
                </Subgrupo>
              ) : (
                <Subgrupo titulo="Chapa de base">
                  <div className="flex items-center gap-3 text-sm">
                    <EstadoVerificacionChip estado="datos-insuficientes" />
                    <span className="text-muted-foreground">Faltan datos de la chapa.</span>
                  </div>
                </Subgrupo>
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
