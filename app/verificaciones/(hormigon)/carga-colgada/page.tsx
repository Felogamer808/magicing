"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CroquisCargaColgada } from "@/components/verificaciones/croquis/CroquisVarios";
import { calcularCuelgue } from "@/lib/calc/hormigon/vigas/cuelgue";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "carga-colgada")!;

export default function CargaColgadaPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [reaccion, setReaccion] = useCampo("reaccion", "200");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [diametroEstribo, setDiametroEstribo] = useCampo("diametroEstribo", "10");
  const [numeroRamas, setNumeroRamas] = useCampo("numeroRamas", "2");
  const [h, setH] = useCampo("h", "0.5");
  const [a, setA] = useCampo("a", "0.3");

  const resultado = useMemo(() => {
    const v = {
      reaccion: aNumero(reaccion),
      fyk: aNumero(fyk),
      diametroEstribo: aNumero(diametroEstribo),
      numeroRamas: aNumero(numeroRamas),
      h: aNumero(h),
      a: aNumero(a),
    };
    if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;

    const r = calcularCuelgue(
      { fykMPa: v.fyk },
      { hM: v.h, aM: v.a },
      { reaccionKN: v.reaccion, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas }
    );
    return { v, r };
  }, [reaccion, fyk, diametroEstribo, numeroRamas, h, a]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Vigas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Carga y materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-full">
                <CroquisCargaColgada />
              </div>
              <CampoNumerico id="reaccion" etiqueta="Rd (reacción colgada)" sufijo="kN" valor={reaccion} onChange={setReaccion} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoDiametro id="diametroEstribo" etiqueta="Ø estribo" valor={diametroEstribo} onChange={setDiametroEstribo} />
              <CampoNumerico id="numeroRamas" etiqueta="Ramas por estribo" valor={numeroRamas} onChange={setNumeroRamas} />
              <CampoNumerico id="h" etiqueta="h (viga que cuelga)" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="a" etiqueta="a (ancho colgado)" sufijo="m" valor={a} onChange={setA} />
              <div className="col-span-full">
                <PanelAyuda titulo="De dónde sale este criterio">
                  <p>
                    Es el caso de carga colgada de Jiménez Montoya (§24.9.1): una carga o reacción
                    que actúa por debajo de la zona comprimida —una viga secundaria que llega al
                    alma de una viga invertida, por ejemplo— y que hay que colgar del nudo de la
                    celosía con estribos anclados en la cara comprimida opuesta.
                  </p>
                  <p>
                    El Anejo 19 exige esta armadura (art. 9.2.5, apoyos indirectos) pero no fija el
                    número: la capacidad mecánica pedida —As·fyd ≥ Rd— es el criterio del manual, no
                    de la norma vigente.
                  </p>
                  <p>
                    Es el caso simple, de carga totalmente colgada. El intermedio de apoyo
                    indirecto (viga que apoya en el alma de otra, con reparto entre fracción directa
                    y colgada) no está contemplado acá.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores numéricos positivos para ver los resultados.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Estribos de cuelgue</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ResultadoCheck
                  etiqueta="Canto suficiente para que se formen las bielas"
                  verifica={resultado.r.verificaCanto}
                  detalle={`h ${fmt(resultado.v.h, 2)} m ≥ 1,2·a = ${fmt(resultado.r.cantoMinimoM, 2)} m`}
                />

                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    Estribos necesarios: {resultado.r.cantidadEstribos} de Ø{fmt(resultado.v.diametroEstribo, 0)},{" "}
                    {fmt(resultado.v.numeroRamas, 0)} ramas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    As necesaria {fmt(resultado.r.asNecesariaCm2)} cm² / área por estribo{" "}
                    {fmt(resultado.r.areaPorEstriboCm2)} cm²
                  </p>
                </div>

                <PanelFormulas
                  titulo="Ver cálculo"
                  filas={[
                    {
                      etiqueta: "As",
                      formula: "Rd / fyd",
                      sustitucion: `${fmt(resultado.v.reaccion)} / ${fmt(resultado.r.fydMPa)}`,
                      valor: `${fmt(resultado.r.asNecesariaCm2)} cm²`,
                    },
                    {
                      etiqueta: "N° estribos",
                      formula: "As / (ramas·área barra)",
                      sustitucion: `${fmt(resultado.r.asNecesariaCm2)} / ${fmt(resultado.r.areaPorEstriboCm2)}`,
                      valor: `${resultado.r.cantidadEstribos}`,
                    },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
