"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { calcularChapaBase, calcularSoldaduraH, type Electrodo } from "@/lib/calc/acero/uniones";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisChapaBase,
  CroquisPerfilSoldadura,
} from "@/components/verificaciones/croquis/CroquisVarios";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "soldaduras")!;

/** Convierte "0.18, 0.127" en [0.18, 0.127]. */
function parsearDistancias(texto: string): number[] {
  return texto
    .split(/[,;]/)
    .map((t) => Number(t.trim().replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
}

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

  const soldadura = useMemo(() => {
    const n = {
      h: aNumero(hMm), b: aNumero(bMm), tf: aNumero(tfMm), tw: aNumero(twMm), lado: aNumero(lado),
      px: aNumero(px), py: aNumero(py), pz: aNumero(pz), mx: aNumero(mx), my: aNumero(my), mz: aNumero(mz),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x))) return null;
    if (n.h <= 0 || n.b <= 0 || n.tf <= 0 || n.tw <= 0 || n.lado <= 0) return null;
    if (n.tw >= n.h || 2 * n.tf >= n.h) return null;
    return calcularSoldaduraH(
      { hMm: n.h, bMm: n.b, tfMm: n.tf, twMm: n.tw },
      n.lado,
      electrodo,
      { pxKN: n.px, pyKN: n.py, pzKN: n.pz, mxKNm: n.mx, myKNm: n.my, mzKNm: n.mz }
    );
  }, [hMm, bMm, tfMm, twMm, lado, electrodo, px, py, pz, mx, my, mz]);

  const chapa = useMemo(() => {
    const n = {
      fy: aNumero(fy), fu: aNumero(fu), fck: aNumero(fck),
      lx: aNumero(lx), ly: aNumero(ly), t: aNumero(tChapa),
      d: aNumero(dPerno), lc: aNumero(lc), nPernos: aNumero(nPernos),
      ag: aNumero(ag), ae: aNumero(ae),
      nMax: aNumero(nMax), corte: aNumero(cortePerno), momento: aNumero(momentoPernos),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.fy <= 0 || n.fu <= 0 || n.fck <= 0 || n.lx <= 0.12 || n.t <= 0 || n.d <= 0 || n.nPernos <= 0) return null;
    const dist = parsearDistancias(distancias);
    if (dist.length === 0) return null;
    return calcularChapaBase(
      { fyKPa: n.fy * 1000, fuKPa: n.fu * 1000, fckKPa: n.fck * 1000 },
      {
        lxM: n.lx, lyM: n.ly, tM: n.t, diametroPernoMm: n.d, lcM: n.lc,
        numeroPernos: n.nPernos, agM2: n.ag, aeM2: n.ae,
      },
      { nMaxKN: n.nMax, cortePorPernoKN: n.corte, momentoKNm: n.momento, distanciasPernosM: dist }
    );
  }, [fy, fu, fck, lx, ly, tChapa, dPerno, lc, nPernos, ag, ae, nMax, cortePerno, momentoPernos, distancias]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Uniones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {/* ---------- Soldadura ---------- */}
      <h2 className="spec-label border-b pb-2">Cordón de soldadura en perfil H</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Perfil y cordón</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisPerfilSoldadura />
              </div>
              <CampoNumerico id="hMm" etiqueta="H" sufijo="mm" valor={hMm} onChange={setHMm} />
              <CampoNumerico id="bMm" etiqueta="B" sufijo="mm" valor={bMm} onChange={setBMm} />
              <CampoNumerico id="tfMm" etiqueta="tf" sufijo="mm" valor={tfMm} onChange={setTfMm} />
              <CampoNumerico id="twMm" etiqueta="tw" sufijo="mm" valor={twMm} onChange={setTwMm} />
              <CampoNumerico id="lado" etiqueta="Lado D" sufijo="mm" valor={lado} onChange={setLado} />
              <div className="space-y-1.5">
                <Label htmlFor="electrodo">Electrodo</Label>
                <Select value={electrodo} onValueChange={(v) => v && setElectrodo(v as Electrodo)}>
                  <SelectTrigger id="electrodo" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["E60", "E70", "E80"].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solicitaciones</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="px" etiqueta="Px" sufijo="kN" valor={px} onChange={setPx} />
              <CampoNumerico id="py" etiqueta="Py" sufijo="kN" valor={py} onChange={setPy} />
              <CampoNumerico id="pz" etiqueta="Pz" sufijo="kN" valor={pz} onChange={setPz} />
              <CampoNumerico id="mx" etiqueta="Mx" sufijo="kN·m" valor={mx} onChange={setMx} />
              <CampoNumerico id="my" etiqueta="My" sufijo="kN·m" valor={my} onChange={setMy} />
              <CampoNumerico id="mz" etiqueta="Mz" sufijo="kN·m" valor={mz} onChange={setMz} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!soldadura ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Completá los datos del perfil.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Verificación del cordón</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <ResultadoCheck
                  etiqueta={`Tensión admisible del electrodo ${electrodo}`}
                  verifica={soldadura.verifica}
                  detalle={`τ ${fmt(soldadura.tauKPa / 1000, 1)} MPa / τ adm ${fmt(soldadura.tauAdmKPa / 1000, 1)} MPa`}
                />
                <ResultadoCheck
                  etiqueta="Lado del cordón dentro del rango admitido"
                  verifica={soldadura.ladoEnRango}
                  detalle={`D ${fmt(aNumero(lado), 1)} mm · rango ${fmt(soldadura.dMinMm, 0)} a ${fmt(soldadura.dMaxMm, 1)} mm`}
                />
                <PanelFormulas
                  titulo="Ver cálculo"
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ---------- Chapa de base ---------- */}
      <h2 className="spec-label border-b pb-2 pt-4">Chapa de base con pernos de anclaje</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="fu" etiqueta="Fu" sufijo="MPa" valor={fu} onChange={setFu} />
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Chapa y pernos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisChapaBase />
              </div>
              <CampoNumerico id="lx" etiqueta="Lx" sufijo="m" valor={lx} onChange={setLx} />
              <CampoNumerico id="ly" etiqueta="Ly" sufijo="m" valor={ly} onChange={setLy} />
              <CampoNumerico id="tChapa" etiqueta="t" sufijo="m" valor={tChapa} onChange={setTChapa} />
              <CampoNumerico id="dPerno" etiqueta="φ perno" sufijo="mm" valor={dPerno} onChange={setDPerno} />
              <CampoNumerico id="lc" etiqueta="lc" sufijo="m" valor={lc} onChange={setLc} />
              <CampoNumerico id="nPernos" etiqueta="Nº pernos" valor={nPernos} onChange={setNPernos} />
              <CampoNumerico id="ag" etiqueta="Ag" sufijo="m²" valor={ag} onChange={setAg} />
              <CampoNumerico id="ae" etiqueta="Ae" sufijo="m²" valor={ae} onChange={setAe} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Solicitaciones</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!chapa ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Completá los datos de la chapa (Lx debe superar 0,12 m).</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Verificaciones</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="I. Aplastamiento del hormigón"
                    verifica={chapa.aplastamientoHormigon.verifica}
                    detalle={`N ${fmt(chapa.aplastamientoHormigon.solicitacionKN)} / adm ${fmt(chapa.aplastamientoHormigon.admisibleKN)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="II. Aplastamiento de la chapa"
                    verifica={chapa.aplastamientoChapa.verifica}
                    detalle={`R ${fmt(chapa.aplastamientoChapa.solicitacionKN)} / adm ${fmt(chapa.aplastamientoChapa.admisibleKN)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="III. Tracción en la chapa"
                    verifica={chapa.traccionChapa.verifica}
                    detalle={`N ${fmt(chapa.traccionChapa.solicitacionKN)} / adm ${fmt(chapa.traccionChapa.admisibleKN)} kN`}
                  />
                  <ResultadoCheck
                    etiqueta="IV. Corte en los pernos"
                    verifica={chapa.cortePernos.verifica}
                    detalle={`R ${fmt(chapa.cortePernos.solicitacionKN)} / adm ${fmt(chapa.cortePernos.admisibleKN)} kN por perno`}
                  />
                  <ResultadoCheck
                    etiqueta="V. Tracción en los pernos"
                    verifica={chapa.traccionPernos.verifica}
                    detalle={`F1 ${fmt(chapa.traccionPernos.solicitacionKN)} / adm ${fmt(chapa.traccionPernos.admisibleKN)} kN`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Fuerza en cada fila de pernos</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
                    {chapa.fuerzasPernosKN.map((f, i) => (
                      <div key={i} className="contents">
                        <dt className="text-muted-foreground">F{i + 1}</dt>
                        <dd className="text-right">{fmt(f)} kN</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
