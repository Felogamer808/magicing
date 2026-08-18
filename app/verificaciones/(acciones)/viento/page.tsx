"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramaCargaViento } from "@/components/verificaciones/acciones/DiagramaCargaViento";
import {
  calcularCasoApertura,
  calcularViento,
  generarNiveles,
  CASOS_APERTURA,
  GRUPOS_SEGURIDAD,
  METODOS_CALCULO,
  type CasoApertura,
  type GrupoSeguridad,
  type MetodoCalculo,
  type ResultadoCasoApertura,
  type ResultadoLado,
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

const NOMBRE_CARA: Record<string, string> = {
  barlovento: "Barlovento",
  sotavento: "Sotavento",
  lateralYTecho: "Caras laterales y techo",
};

export default function VientoPage() {
  const [norma, setNorma] = useCampo("norma", "UNIT 50-84");

  const [altura, setAltura] = useCampo("altura", "14");
  const [a, setA] = useCampo("a", "77");
  const [b, setB] = useCampo("b", "35");

  const [velocidad, setVelocidad] = useCampo<TipoVelocidad>("velocidad", "Costero");
  const [topografia, setTopografia] = useCampo<TipoTopografia>("topografia", "Normal");
  const [terreno, setTerreno] = useCampo<TipoTerreno>("terreno", "III");
  const [metodoNombre, setMetodoNombre] = useCampo("metodo", "Estados límite");
  const [grupo, setGrupo] = useCampo<GrupoSeguridad>("grupo", "B");

  const [casoNombre, setCasoNombre] = useCampo("caso", CASOS_APERTURA[0].nombre);

  const [gammaA, setGammaA] = useCampo("gammaA", "0.94");
  const [ceLateralA, setCeLateralA] = useCampo("ceLateralA", "-0.4");
  const [kdA, setKdA] = useCampo("kdA", "0.84");

  const [gammaB, setGammaB] = useCampo("gammaB", "0.85");
  const [ceLateralB, setCeLateralB] = useCampo("ceLateralB", "-0.3");
  const [kdB, setKdB] = useCampo("kdB", "0.86");

  const [zInicial, setZInicial] = useCampo("zInicial", "3.5");
  const [nNiveles, setNNiveles] = useCampo("nNiveles", "4");

  const resultado = useMemo(() => {
    const n = {
      altura: aNumero(altura), a: aNumero(a), b: aNumero(b),
      grupo, zInicial: aNumero(zInicial), nNiveles: aNumero(nNiveles),
      gammaA: aNumero(gammaA), ceLateralA: aNumero(ceLateralA), kdA: aNumero(kdA),
      gammaB: aNumero(gammaB), ceLateralB: aNumero(ceLateralB), kdB: aNumero(kdB),
    };
    const numericos = [
      n.altura, n.a, n.b, n.zInicial, n.nNiveles,
      n.gammaA, n.ceLateralA, n.kdA, n.gammaB, n.ceLateralB, n.kdB,
    ];
    if (!numericos.every((x) => Number.isFinite(x))) return null;
    if (n.altura <= 0 || n.a <= 0 || n.b <= 0 || n.gammaA <= 0 || n.gammaB <= 0 || n.kdA <= 0 || n.kdB <= 0) {
      return null;
    }
    if (n.zInicial >= n.altura || n.nNiveles < 2 || n.nNiveles > 60) return null;

    const metodo = METODOS_CALCULO.find((m) => m.nombre === metodoNombre)?.id;
    const caso = CASOS_APERTURA.find((c) => c.nombre === casoNombre)?.id;
    if (!metodo || !caso) return null;

    const niveles = generarNiveles(n.zInicial, n.altura, Math.round(n.nNiveles));
    const r = calcularViento(
      {
        alturaM: n.altura, aM: n.a, bM: n.b,
        velocidad, topografia, terreno,
        metodo: metodo as MetodoCalculo, grupo,
        ladoA: { gamma: n.gammaA, ceLateralYTecho: n.ceLateralA, kd: n.kdA },
        ladoB: { gamma: n.gammaB, ceLateralYTecho: n.ceLateralB, kd: n.kdB },
      },
      niveles
    );
    const casoA = calcularCasoApertura(caso as CasoApertura, n.gammaA, n.ceLateralA);
    const casoB = calcularCasoApertura(caso as CasoApertura, n.gammaB, n.ceLateralB);

    return { n, r, casoA, casoB };
  }, [
    altura, a, b, velocidad, topografia, terreno, metodoNombre, grupo, casoNombre,
    gammaA, ceLateralA, kdA, gammaB, ceLateralB, kdB, zInicial, nNiveles,
  ]);

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
          γ, el coeficiente de caras laterales y techo, y Kd se leen de los gráficos de la norma
          (fig. 8.2, fig. 8.6 y fig. 6.2) según λa/λb, a/b y el área expuesta de cada lado — son
          datos de entrada, no los calcula la página. Cada lado (A y B) es una dirección de
          viento distinta, con su propio γ, y por eso se cargan por separado.
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
            <CardHeader><CardTitle className="text-base">Sitio y seguridad</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoSeleccion id="velocidad" etiqueta="Velocidad" valor={velocidad} opciones={["Costero", "Continental"]} onChange={(v) => setVelocidad(v as TipoVelocidad)} />
              <CampoSeleccion id="topografia" etiqueta="Topografía" valor={topografia} opciones={["Normal", "Expuesto", "Protegido"]} onChange={(v) => setTopografia(v as TipoTopografia)} />
              <CampoSeleccion id="terreno" etiqueta="Terreno" valor={terreno} opciones={["I", "II", "III", "IV"]} onChange={(v) => setTerreno(v as TipoTerreno)} />
              <CampoSeleccion id="metodo" etiqueta="Método de cálculo" valor={metodoNombre} opciones={METODOS_CALCULO.map((m) => m.nombre)} onChange={setMetodoNombre} />
              <CampoSeleccion id="grupo" etiqueta="Grupo (Tabla 6.3)" valor={grupo} opciones={GRUPOS_SEGURIDAD} onChange={(v) => setGrupo(v as GrupoSeguridad)} />
              <p className="col-span-2 text-xs text-muted-foreground">
                Con tensiones admisibles Kk=1 siempre (7.3.1): el grupo sólo se usa con estados límite.
              </p>
              <div className="col-span-2">
                <PanelAyuda titulo="Qué es cada dato">
                  <p>
                    <strong className="text-foreground">Velocidad.</strong> La velocidad
                    característica vk del lugar (6.2.2.2): Costero es 43,9 m/s, para cualquier punto
                    a menos de 25 km del Río Uruguay, el Río de la Plata o la costa atlántica.
                    Continental es 37,5 m/s, para el resto del territorio.
                  </p>
                  <p>
                    <strong className="text-foreground">Topografía.</strong> Corrige Kt por
                    variaciones locales del terreno (Tabla 6.1): Expuesto (Kt=1,10) para cimas de
                    acantilados o valles que encajonan el viento; Protegido (Kt=0,90) para valles o
                    cunetas resguardadas de todos los vientos en su perímetro. Normal (Kt=1,0) es el
                    resto de los casos.
                  </p>
                  <p>
                    <strong className="text-foreground">Terreno.</strong> La rugosidad del entorno,
                    define cómo crece Kz con la altura (6.2.5): I es campo abierto sin obstáculos; II
                    es llano con obstáculos bajos (setos, cercos); III son zonas con construcciones
                    medianas y árboles; IV son grandes ciudades. Si el sitio está entre dos tipos, se
                    usa el más desfavorable.
                  </p>
                  <p>
                    <strong className="text-foreground">Método de cálculo.</strong> Estados límite es
                    el habitual: Kk sale del grupo elegido abajo (Tabla 6.3). Con tensiones admisibles
                    la norma fija Kk=1 para cualquier grupo (7.3.1).
                  </p>
                  <p>
                    <strong className="text-foreground">Grupo.</strong> Qué tan grave sería el
                    colapso de la construcción (6.2.7.4): A es el más exigente (hospitales,
                    bomberos); B es el caso normal (viviendas, oficinas); C son instalaciones
                    industriales de bajo riesgo; D son elementos secundarios de cierre; E1 son
                    construcciones temporarias; E2 son andamios y encofrados.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Estado de permeabilidad</CardTitle></CardHeader>
            <CardContent>
              <CampoSeleccion id="caso" etiqueta="Caso (Tabla 8.2)" valor={casoNombre} opciones={CASOS_APERTURA.map((c) => c.nombre)} onChange={setCasoNombre} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Lado A (+X) — γ0,a</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoNumerico id="gammaA" etiqueta="γ0,a" valor={gammaA} onChange={setGammaA} />
              <CampoNumerico id="ceLateralA" etiqueta="Ce lateral/techo" valor={ceLateralA} onChange={setCeLateralA} />
              <CampoNumerico id="kdA" etiqueta="Kd" valor={kdA} onChange={setKdA} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Lado B (+Y) — γ0,b</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoNumerico id="gammaB" etiqueta="γ0,b" valor={gammaB} onChange={setGammaB} />
              <CampoNumerico id="ceLateralB" etiqueta="Ce lateral/techo" valor={ceLateralB} onChange={setCeLateralB} />
              <CampoNumerico id="kdB" etiqueta="Kd" valor={kdB} onChange={setKdB} />
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
                Completá los datos con valores válidos (entre 2 y 60 niveles, la primera cota por
                debajo de la coronación, y γ y Kd positivos en ambos lados).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Coeficientes generales</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Velocidad característica vk", valor: `${fmt(resultado.r.vkMs, 1)} m/s` },
                      { etiqueta: "Kt (topográfico)", valor: fmt(resultado.r.kt, 2) },
                      { etiqueta: "Kk (seguridad)", valor: fmt(resultado.r.kk, 2) },
                      { etiqueta: "λa = h/a", valor: fmt(resultado.r.lambdaA, 3) },
                      { etiqueta: "λb = h/b", valor: fmt(resultado.r.lambdaB, 3) },
                      { etiqueta: "a/b", valor: fmt(resultado.r.relacionAB, 3) },
                    ]}
                  />
                </CardContent>
              </Card>

              <BloqueLado
                titulo="Lado A (+X)"
                ladoR={resultado.r.ladoA}
                caso={resultado.casoA}
                anchoExpuestoM={resultado.n.a}
                alturaTotalM={resultado.n.altura}
              />
              <BloqueLado
                titulo="Lado B (+Y)"
                ladoR={resultado.r.ladoB}
                caso={resultado.casoB}
                anchoExpuestoM={resultado.n.b}
                alturaTotalM={resultado.n.altura}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function BloqueLado({
  titulo,
  ladoR,
  caso,
  anchoExpuestoM,
  alturaTotalM,
}: {
  titulo: string;
  ladoR: ResultadoLado;
  caso: ResultadoCasoApertura;
  anchoExpuestoM: number;
  alturaTotalM: number;
}) {
  const niveles = ladoR.niveles.map((n) => {
    const pcKNm2 = (n.qKgM2 * caso.cTotalGobernante) / 100;
    const pcKNm = pcKNm2 * n.hInflM;
    return { ...n, pcKNm2, pcKNm };
  });
  const resultanteTotalKN = niveles.reduce((acc, n) => acc + n.pcKNm * anchoExpuestoM, 0);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">
            Coeficiente total de arrastre: {fmt(caso.cTotalGobernante, 3)}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            candidatos: {caso.cTotalCandidatos.map((c) => fmt(c, 3)).join(" / ")}
          </p>
        </div>

        <PanelFormulas
          titulo="Ver coeficientes por cara"
          filas={caso.caras.flatMap((cara) => [
            { etiqueta: `Ce ${NOMBRE_CARA[cara.cara]}`, valor: fmt(cara.ce, 3) },
            ...cara.candidatos.map((c, i) => ({
              // El signo del candidato de ci (no el de c ya combinado) es lo
              // que distingue sobrepresión de succión: dos candidatos de c
              // pueden terminar con el mismo signo después de combinar con
              // ce, y ahí el rótulo por signo de c colisionaría.
              etiqueta: `c ${NOMBRE_CARA[cara.cara]} (${caso.ci.general[i] >= 0 ? "sobrepresión" : "succión"})`,
              valor: fmt(c, 3),
            })),
          ])}
        />

        {caso.ci.paredAbierta !== undefined && (
          <p className="text-xs text-muted-foreground">
            Ci sobre la pared abierta (μ≥35%): {fmt(caso.ci.paredAbierta, 3)}
          </p>
        )}

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
              {niveles.map((n) => (
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
          <p className="font-medium">Resultante sobre una cara: {fmt(resultanteTotalKN)} kN</p>
          <p className="text-xs text-muted-foreground">
            Con el coeficiente total de arrastre gobernante, suma de la carga lineal de cada nivel
            por el ancho expuesto ({fmt(anchoExpuestoM)} m).
          </p>
        </div>

        <DiagramaCargaViento alturaTotalM={alturaTotalM} niveles={niveles} />
      </CardContent>
    </Card>
  );
}
