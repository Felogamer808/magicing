"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import {
  calcularViento,
  generarNiveles,
  type TipoTerreno,
  type TipoTopografia,
  type TipoVelocidad,
} from "@/lib/calc/acciones/viento";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisGeometriaViento,
  CroquisNivelesViento,
} from "@/components/verificaciones/croquis/CroquisVarios";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "viento")!;

export default function VientoPage() {
  const [norma, setNorma] = useCampo("norma", "CIRSOC 102");

  const [altura, setAltura] = useCampo("altura", "53.1");
  const [a, setA] = useCampo("a", "26.7");
  const [b, setB] = useCampo("b", "22.9");

  const [velocidad, setVelocidad] = useCampo<TipoVelocidad>("velocidad", "Costero");
  const [topografia, setTopografia] = useCampo<TipoTopografia>("topografia", "Normal");
  const [terreno, setTerreno] = useCampo<TipoTerreno>("terreno", "II");
  const [kd, setKd] = useCampo("kd", "1");
  const [periodo, setPeriodo] = useCampo("periodo", "20");
  const [gamma, setGamma] = useCampo("gamma", "1");

  const [zInicial, setZInicial] = useCampo("zInicial", "3.19");
  const [nNiveles, setNNiveles] = useCampo("nNiveles", "19");

  const resultado = useMemo(() => {
    const n = {
      altura: aNumero(altura), a: aNumero(a), b: aNumero(b),
      kd: aNumero(kd), periodo: aNumero(periodo), gamma: aNumero(gamma),
      zInicial: aNumero(zInicial), nNiveles: aNumero(nNiveles),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;
    if (n.zInicial >= n.altura || n.nNiveles < 2 || n.nNiveles > 60) return null;

    const niveles = generarNiveles(n.zInicial, n.altura, Math.round(n.nNiveles));
    return {
      n,
      r: calcularViento(
        {
          alturaM: n.altura, aM: n.a, bM: n.b,
          velocidad, topografia, terreno,
          kd: n.kd, periodoRetornoAnios: n.periodo, gamma: n.gamma,
        },
        niveles
      ),
    };
  }, [altura, a, b, velocidad, topografia, terreno, kd, periodo, gamma, zInicial, nNiveles]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Acciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          El coeficiente γ se lee del gráfico de la norma según la relación de dimensiones del
          edificio (λa, λb y a/b, que la página calcula abajo). Los niveles se generan
          equiespaciados entre la primera cota y la coronación.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisGeometriaViento />
              </div>
              <CampoNumerico id="a" etiqueta="a" sufijo="m" valor={a} onChange={setA} />
              <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="altura" etiqueta="h total" sufijo="m" valor={altura} onChange={setAltura} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Características del sitio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion id="velocidad" etiqueta="Velocidad" valor={velocidad} opciones={["Costero", "Continental"]} onChange={(v) => setVelocidad(v as TipoVelocidad)} />
              <CampoSeleccion id="topografia" etiqueta="Topografía" valor={topografia} opciones={["Normal", "Expuesto", "Protegido"]} onChange={(v) => setTopografia(v as TipoTopografia)} />
              <CampoSeleccion id="terreno" etiqueta="Terreno" valor={terreno} opciones={["I", "II", "III", "IV"]} onChange={(v) => setTerreno(v as TipoTerreno)} />
              <CampoNumerico id="periodo" etiqueta="Período de retorno" sufijo="años" valor={periodo} onChange={setPeriodo} />
              <CampoNumerico id="kd" etiqueta="Kd (dimensiones)" valor={kd} onChange={setKd} />
              <CampoNumerico id="gamma" etiqueta="γ (gráfico)" valor={gamma} onChange={setGamma} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Niveles</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisNivelesViento />
              </div>
              <CampoNumerico id="zInicial" etiqueta="Cota del 1er nivel" sufijo="m" valor={zInicial} onChange={setZInicial} />
              <CampoNumerico id="nNiveles" etiqueta="Cantidad de niveles" valor={nNiveles} onChange={setNNiveles} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (entre 2 y 60 niveles, y la primera cota
                por debajo de la coronación).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Coeficientes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Coeficiente total de arrastre: {fmt(resultado.r.coeficientes.cTotal, 2)}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Barlovento {fmt(resultado.r.coeficientes.ceBarlovento, 2)} · Sotavento{" "}
                      {fmt(resultado.r.coeficientes.ceSotavento, 2)} · Interior {fmt(resultado.r.coeficientes.ciPresion, 2)} /{" "}
                      {fmt(resultado.r.coeficientes.ciSuccion, 2)}
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Velocidad característica vk", valor: `${fmt(resultado.r.vkMs, 1)} m/s` },
                      { etiqueta: "Kt (topográfico)", valor: fmt(resultado.r.kt, 2) },
                      { etiqueta: "Kk (período de retorno)", valor: fmt(resultado.r.kk, 2) },
                      { etiqueta: "kz en la coronación", valor: fmt(resultado.r.kzCoronacion, 4) },
                      { etiqueta: "λa = h/a", valor: fmt(resultado.r.lambdaA, 3) },
                      { etiqueta: "λb = h/b", valor: fmt(resultado.r.lambdaB, 3) },
                      { etiqueta: "a/b", valor: fmt(resultado.r.relacionAB, 3) },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cargas por nivel</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] font-mono text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-1.5 text-left font-medium">Nivel</th>
                          <th className="py-1.5 text-right font-medium">z (m)</th>
                          <th className="py-1.5 text-right font-medium">kz</th>
                          <th className="py-1.5 text-right font-medium">vc (m/s)</th>
                          <th className="py-1.5 text-right font-medium">pc (kN/m²)</th>
                          <th className="py-1.5 text-right font-medium">Pc (kN/m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.r.niveles.map((n) => (
                          <tr key={n.nombre} className="border-b border-border/50">
                            <td className="py-1 text-left">{n.nombre}</td>
                            <td className="py-1 text-right tabular-nums">{fmt(n.zM, 2)}</td>
                            <td className="py-1 text-right tabular-nums">{fmt(n.kz, 3)}</td>
                            <td className="py-1 text-right tabular-nums">{fmt(n.vcMs, 1)}</td>
                            <td className="py-1 text-right tabular-nums">{fmt(n.pcKNm2, 3)}</td>
                            <td className="py-1 text-right tabular-nums">{fmt(n.pcKNm, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Resultante sobre una cara: {fmt(resultado.r.resultanteTotalKN)} kN</p>
                    <p className="text-xs text-muted-foreground">
                      Suma de la carga lineal de cada nivel por el ancho expuesto ({fmt(resultado.n.a)} m).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
