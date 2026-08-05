"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { calcularMuroContencion } from "@/lib/calc/ec2/muro-contencion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "muros-contencion")!;

function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n: number, decimales = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

function DiagramaMuro({
  anchoZapataM, cantoZapataM, alturaMuroM, espesorMuroM, alturaSueloActivoM,
}: { anchoZapataM: number; cantoZapataM: number; alturaMuroM: number; espesorMuroM: number; alturaSueloActivoM: number }) {
  const totalH = alturaMuroM + cantoZapataM;
  const escala = Math.min(200 / totalH, 150 / Math.max(anchoZapataM, 0.1));
  const zapW = anchoZapataM * escala;
  const zapH = cantoZapataM * escala;
  const muroW = espesorMuroM * escala;
  const muroH = alturaMuroM * escala;
  const x0 = 66;
  const yBase = 24 + muroH + zapH;

  const nFlechas = 4;
  const hSueloPx = Math.min(alturaSueloActivoM * escala, muroH + zapH);

  return (
    <svg viewBox={`0 0 ${x0 + zapW + 70} ${yBase + 34}`} className="h-auto w-full max-w-sm text-primary" fill="none" aria-hidden="true">
      {/* terreno del lado activo (derecha) */}
      <path d={`M${x0 + muroW} ${yBase - hSueloPx} L${x0 + zapW + 56} ${yBase - hSueloPx}`} stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      {Array.from({ length: 10 }).map((_, i) => (
        <path key={i} d={`M${x0 + muroW + i * 12} ${yBase - hSueloPx} L${x0 + muroW + i * 12 - 5} ${yBase - hSueloPx - 6}`} stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
      ))}

      {/* diagrama triangular de empuje */}
      {Array.from({ length: nFlechas }).map((_, i) => {
        const t = (i + 1) / (nFlechas + 1);
        const y = yBase - hSueloPx + t * hSueloPx;
        const len = 10 + 26 * t;
        return (
          <path key={i} d={`M${x0 + muroW + len} ${y} L${x0 + muroW + 3} ${y}`} stroke="currentColor" strokeWidth="1.1" markerEnd="url(#arrMuro)" opacity="0.8" />
        );
      })}
      <defs>
        <marker id="arrMuro" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0 0 L5 3 L0 6 Z" fill="currentColor" />
        </marker>
      </defs>

      {/* alzado y zapata */}
      <rect x={x0} y={24} width={muroW} height={muroH} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.45" />
      <rect x={x0} y={24 + muroH} width={zapW} height={zapH} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.45" />

      {/* cota altura */}
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <path d={`M${x0 - 16} 24 L${x0 - 4} 24`} />
        <path d={`M${x0 - 16} ${yBase} L${x0 - 4} ${yBase}`} />
        <path d={`M${x0 - 10} 24 L${x0 - 10} ${yBase}`} />
      </g>
      <text x={x0 - 22} y={(24 + yBase) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="8" transform={`rotate(-90 ${x0 - 22} ${(24 + yBase) / 2})`}>
        H = {fmt(totalH)} m
      </text>
      <text x={x0 + zapW / 2} y={yBase + 20} textAnchor="middle" className="fill-current font-mono" fontSize="8">
        A = {fmt(anchoZapataM)} m
      </text>
    </svg>
  );
}

export default function MuroContencionPage() {
  const [norma, setNorma] = useCampo("norma", "EC7");

  const [gamma, setGamma] = useCampo("gamma", "18");
  const [phi, setPhi] = useCampo("phi", "34");
  const [c, setC] = useCampo("c", "5");
  const [sigmaAdm, setSigmaAdm] = useCampo("sigmaAdm", "100");

  const [anchoZap, setAnchoZap] = useCampo("anchoZap", "0.5");
  const [cantoZap, setCantoZap] = useCampo("cantoZap", "0.3");
  const [altMuro, setAltMuro] = useCampo("altMuro", "3.2");
  const [espMuro, setEspMuro] = useCampo("espMuro", "0.15");
  const [hAct, setHAct] = useCampo("hAct", "3.2");
  const [hPas, setHPas] = useCampo("hPas", "0");
  const [sobrecarga, setSobrecarga] = useCampo("sobrecarga", "5");

  const [l1Caso2, setL1Caso2] = useCampo("l1Caso2", "2");
  const [l1Caso3, setL1Caso3] = useCampo("l1Caso3", "0.95");
  const [l2Caso3, setL2Caso3] = useCampo("l2Caso3", "2.45");

  const resultado = useMemo(() => {
    const n = {
      gamma: aNumero(gamma), phi: aNumero(phi), c: aNumero(c), sigmaAdm: aNumero(sigmaAdm),
      anchoZap: aNumero(anchoZap), cantoZap: aNumero(cantoZap), altMuro: aNumero(altMuro),
      espMuro: aNumero(espMuro), hAct: aNumero(hAct), hPas: aNumero(hPas), sobrecarga: aNumero(sobrecarga),
      l1Caso2: aNumero(l1Caso2), l1Caso3: aNumero(l1Caso3), l2Caso3: aNumero(l2Caso3),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.gamma <= 0 || n.phi <= 0 || n.phi >= 90 || n.sigmaAdm <= 0) return null;
    if (n.anchoZap <= 0 || n.cantoZap <= 0 || n.altMuro <= 0 || n.espMuro <= 0 || n.hAct <= 0) return null;
    if (n.espMuro >= n.anchoZap) return null;
    if (n.l1Caso2 <= 0 || n.l2Caso3 <= 0) return null;

    return {
      n,
      r: calcularMuroContencion(
        { gammaKNm3: n.gamma, phiGrados: n.phi, cKPa: n.c, sigmaAdmisibleKPa: n.sigmaAdm },
        {
          anchoZapataM: n.anchoZap, cantoZapataM: n.cantoZap, alturaMuroM: n.altMuro,
          espesorMuroM: n.espMuro, alturaSueloActivoM: n.hAct, alturaSueloPasivoM: n.hPas,
          sobrecargaKPa: n.sobrecarga,
        },
        { l1Caso2M: n.l1Caso2, l1Caso3M: n.l1Caso3, l2Caso3M: n.l2Caso3 }
      ),
    };
  }, [gamma, phi, c, sigmaAdm, anchoZap, cantoZap, altMuro, espMuro, hAct, hPas, sobrecarga, l1Caso2, l1Caso3, l2Caso3]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Contención</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader><CardTitle className="text-base">Sección</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <DiagramaMuro
              anchoZapataM={resultado.n.anchoZap}
              cantoZapataM={resultado.n.cantoZap}
              alturaMuroM={resultado.n.altMuro}
              espesorMuroM={resultado.n.espMuro}
              alturaSueloActivoM={resultado.n.hAct}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Suelo</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="gamma" etiqueta="γ" sufijo="kN/m³" valor={gamma} onChange={setGamma} />
              <CampoNumerico id="phi" etiqueta="φ" sufijo="°" valor={phi} onChange={setPhi} />
              <CampoNumerico id="c" etiqueta="Cohesión c" sufijo="kPa" valor={c} onChange={setC} />
              <CampoNumerico id="sigmaAdm" etiqueta="σ adm." sufijo="kN/m²" valor={sigmaAdm} onChange={setSigmaAdm} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="anchoZap" etiqueta="A zapata" sufijo="m" valor={anchoZap} onChange={setAnchoZap} />
              <CampoNumerico id="cantoZap" etiqueta="H zapata" sufijo="m" valor={cantoZap} onChange={setCantoZap} />
              <CampoNumerico id="altMuro" etiqueta="H muro" sufijo="m" valor={altMuro} onChange={setAltMuro} />
              <CampoNumerico id="espMuro" etiqueta="Espesor muro" sufijo="m" valor={espMuro} onChange={setEspMuro} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Terreno y sobrecarga</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="hAct" etiqueta="h activo" sufijo="m" valor={hAct} onChange={setHAct} />
              <CampoNumerico id="hPas" etiqueta="h pasivo" sufijo="m" valor={hPas} onChange={setHPas} />
              <CampoNumerico id="sobrecarga" etiqueta="Sobrecarga" sufijo="kN/m²" valor={sobrecarga} onChange={setSobrecarga} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Posición de los apoyos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="l1Caso2" etiqueta="L1 (caso 2)" sufijo="m" valor={l1Caso2} onChange={setL1Caso2} />
              <CampoNumerico id="l1Caso3" etiqueta="L1 (caso 3)" sufijo="m" valor={l1Caso3} onChange={setL1Caso3} />
              <CampoNumerico id="l2Caso3" etiqueta="L2 (caso 3)" sufijo="m" valor={l2Caso3} onChange={setL2Caso3} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (el espesor del muro debe ser menor que el ancho de zapata).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Caso 1 — solo zapata</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Vuelco (FS ≥ 1,5)"
                    verifica={resultado.r.vuelco.verifica}
                    detalle={`FS ${fmt(resultado.r.vuelco.factorSeguridad)} · M estab ${fmt(resultado.r.empujes.momentoEstabilizadorKNm)} / M volc ${fmt(resultado.r.empujes.momentoVolcadorKNm)} kN·m/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Deslizamiento (FS ≥ 1,5)"
                    verifica={resultado.r.deslizamientoSoloZapata.verifica}
                    detalle={`FS ${fmt(resultado.r.deslizamientoSoloZapata.factorSeguridad)} · Fh adm ${fmt(resultado.r.deslizamientoSoloZapata.fhAdmKN)} / Fh máx ${fmt(resultado.r.deslizamientoSoloZapata.fhMaxKN)} kN/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCaso1.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCaso1.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Ka (con piso de 0,5)", valor: fmt(resultado.r.empujes.ka, 3) },
                      { etiqueta: "Kp", valor: fmt(resultado.r.empujes.kp, 3) },
                      { etiqueta: "Empuje del suelo", valor: `${fmt(resultado.r.empujes.empujeSueloKN)} kN/m` },
                      { etiqueta: "Empuje por sobrecarga", valor: `${fmt(resultado.r.empujes.empujeSobrecargaKN)} kN/m` },
                      { etiqueta: "Empuje pasivo", valor: `${fmt(resultado.r.empujes.empujePasivoKN)} kN/m` },
                      { etiqueta: "Peso alzado", valor: `${fmt(resultado.r.empujes.pesoMuroKN)} kN/m` },
                      { etiqueta: "Peso zapata", valor: `${fmt(resultado.r.empujes.pesoZapataKN)} kN/m` },
                      { etiqueta: "Peso suelo sobre zapata", valor: `${fmt(resultado.r.empujes.pesoSueloActivoKN)} kN/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 2 — apoyo en contrapiso</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Deslizamiento con el contrapiso apuntalando"
                    verifica={resultado.r.deslizamientoApoyoContrapiso.verifica}
                    detalle={`FS ${fmt(resultado.r.deslizamientoApoyoContrapiso.factorSeguridad)} · sólo pasa R1 = ${fmt(Math.abs(resultado.r.apoyoContrapiso.r1KN))} kN/m por rozamiento`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCasos23.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por el contrapiso</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 = {fmt(resultado.r.apoyoContrapiso.r1KN)} kN/m · R2 = {fmt(resultado.r.apoyoContrapiso.r2KN)} kN/m
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 3 — contrapiso y losa superior</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por las losas</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 (inferior) = {fmt(resultado.r.apoyoContrapisoYLosa.r1KN)} kN/m · R2 (superior) ={" "}
                      {fmt(resultado.r.apoyoContrapisoYLosa.r2KN)} kN/m
                    </p>
                  </div>
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCasos23.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Al calcular el momento estabilizador, la planilla tomaba el peso del alzado con brazo A/2 en
                lugar del centro de gravedad del propio alzado; acá se usa esp/2, coherente con el brazo del
                suelo sobre la zapata y con la otra hoja de muros. Eso reduce el momento estabilizador, así
                que el resultado es más conservador que el de la planilla.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
