"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramaCargaViento } from "@/components/verificaciones/acciones/DiagramaCargaViento";
import {
  calcularCasoApertura,
  calcularFactorFormaGamma0,
  calcularViento,
  nivelesDesdeAlturaPiso,
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
import { CroquisGeometriaViento } from "@/components/verificaciones/croquis/CroquisVarios";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "viento")!;

const NOMBRE_CARA: Record<string, string> = {
  barlovento: "Barlovento",
  sotavento: "Sotavento",
  lateralYTecho: "Caras laterales y techo",
};

interface NivelForm {
  alturaPiso: string;
  a: string;
  b: string;
}

/** Reproduce el caso real de la planilla VIENTO2025: 77×35 m, 4 pisos de 3,5 m (h total 14 m). */
const NIVELES_DEFECTO: NivelForm[] = [
  { alturaPiso: "3.5", a: "77", b: "35" },
  { alturaPiso: "3.5", a: "77", b: "35" },
  { alturaPiso: "3.5", a: "77", b: "35" },
  { alturaPiso: "3.5", a: "77", b: "35" },
];

function leerNiveles(crudo: string): NivelForm[] {
  try {
    const valor: unknown = JSON.parse(crudo);
    if (Array.isArray(valor) && valor.length > 0) return valor as NivelForm[];
  } catch {
    // Si lo guardado quedó corrupto se vuelve a los valores por defecto en vez de romper la página.
  }
  return NIVELES_DEFECTO;
}

interface NivelNumerico {
  alturaPisoM: number;
  aM: number;
  bM: number;
}

interface Geometria {
  niveles: NivelForm[];
  numericos: NivelNumerico[];
  aEnvolvente: number;
  bEnvolvente: number;
  alturaTotal: number;
}

/**
 * γ0, Ce y Kd (fig. 8.2/8.6/6.2) son coeficientes de todo el edificio, no de
 * un nivel — la norma no define cómo sacarlos para un edificio escalonado
 * salvo en el art. 8.7.2, que no está implementado. Mientras tanto se usan
 * como envolvente el mayor a y el mayor b entre los niveles cargados (junto
 * con la altura total): es el criterio más simple y conservador.
 */
function derivarGeometria(crudo: string): Geometria | null {
  const niveles = leerNiveles(crudo);
  const numericos = niveles.map((n) => ({
    alturaPisoM: aNumero(n.alturaPiso),
    aM: aNumero(n.a),
    bM: aNumero(n.b),
  }));
  const validos = numericos.every((n) =>
    [n.alturaPisoM, n.aM, n.bM].every((x) => Number.isFinite(x) && x > 0)
  );
  if (!validos) return null;

  return {
    niveles,
    numericos,
    aEnvolvente: Math.max(...numericos.map((n) => n.aM)),
    bEnvolvente: Math.max(...numericos.map((n) => n.bM)),
    alturaTotal: numericos.reduce((suma, n) => suma + n.alturaPisoM, 0),
  };
}

export default function VientoPage() {
  const [norma, setNorma] = useCampo("norma", "UNIT 50-84");

  const [nivelesCrudo, setNivelesCrudo] = useCampo("niveles", JSON.stringify(NIVELES_DEFECTO));
  const niveles = leerNiveles(nivelesCrudo);

  const actualizarNivel = (i: number, campo: keyof NivelForm, valor: string) => {
    setNivelesCrudo(JSON.stringify(niveles.map((n, j) => (j === i ? { ...n, [campo]: valor } : n))));
  };
  const agregarNivel = () => {
    setNivelesCrudo(JSON.stringify([...niveles, { ...niveles[niveles.length - 1] }]));
  };
  const quitarNivel = (i: number) => {
    if (niveles.length <= 1) return;
    setNivelesCrudo(JSON.stringify(niveles.filter((_, j) => j !== i)));
  };

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

  const geometria = useMemo(() => derivarGeometria(nivelesCrudo), [nivelesCrudo]);

  // γ0 sale solo de la geometría (fig. 8.2): se calcula aparte de "resultado"
  // para que las tarjetas de Lado A/B lo muestren aunque el resto del
  // formulario (Ce, Kd) todavía no sea válido. Null = el edificio cae en el
  // ábaco denso (λa≥0,5 o λb≥1) que no está digitalizado: hay que leer γ0 de
  // la fig. 8.2 a mano.
  const factorForma = useMemo(() => {
    if (!geometria) return null;
    return calcularFactorFormaGamma0(
      geometria.alturaTotal / geometria.aEnvolvente,
      geometria.alturaTotal / geometria.bEnvolvente
    );
  }, [geometria]);

  const resultado = useMemo(() => {
    if (!geometria) return null;
    const gammaAEfectivo = factorForma?.ladoA ?? aNumero(gammaA);
    const gammaBEfectivo = factorForma?.ladoB ?? aNumero(gammaB);
    const n = {
      ceLateralA: aNumero(ceLateralA), kdA: aNumero(kdA),
      ceLateralB: aNumero(ceLateralB), kdB: aNumero(kdB),
      gammaA: gammaAEfectivo, gammaB: gammaBEfectivo,
    };
    const numericos = [n.gammaA, n.ceLateralA, n.kdA, n.gammaB, n.ceLateralB, n.kdB];
    if (!numericos.every((x) => Number.isFinite(x))) return null;
    if (n.gammaA <= 0 || n.gammaB <= 0 || n.kdA <= 0 || n.kdB <= 0) return null;

    const metodo = METODOS_CALCULO.find((m) => m.nombre === metodoNombre)?.id;
    const caso = CASOS_APERTURA.find((c) => c.nombre === casoNombre)?.id;
    if (!metodo || !caso) return null;

    const niveles = nivelesDesdeAlturaPiso(geometria.numericos.map((niv) => niv.alturaPisoM));
    const r = calcularViento(
      {
        alturaM: geometria.alturaTotal, aM: geometria.aEnvolvente, bM: geometria.bEnvolvente,
        velocidad, topografia, terreno,
        metodo: metodo as MetodoCalculo, grupo,
        ladoA: { gamma: n.gammaA, ceLateralYTecho: n.ceLateralA, kd: n.kdA },
        ladoB: { gamma: n.gammaB, ceLateralYTecho: n.ceLateralB, kd: n.kdB },
      },
      niveles
    );
    const casoA = calcularCasoApertura(caso as CasoApertura, n.gammaA, n.ceLateralA);
    const casoB = calcularCasoApertura(caso as CasoApertura, n.gammaB, n.ceLateralB);

    return { geometria, r, casoA, casoB };
  }, [
    geometria, factorForma, velocidad, topografia, terreno, metodoNombre, grupo, casoNombre,
    gammaA, ceLateralA, kdA, gammaB, ceLateralB, kdB,
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
          γ0 se calcula solo a partir de la envolvente en planta (el mayor a y el mayor b entre los
          niveles cargados) y la altura total (fig. 8.2), para el caso habitual de construcciones
          apoyadas en el suelo con λa&lt;0,5 o λb&lt;1. Fuera de ese rango (edificios altos en
          relación a su planta) hay que leerlo del gráfico y cargarlo a mano. El coeficiente de
          caras laterales y techo y Kd todavía se leen de la norma (fig. 8.6 y fig. 6.2) según a/b y
          el área expuesta de cada lado. Cada lado (A y B) es una dirección de viento distinta, con
          su propio γ, y por eso se cargan por separado.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Geometría y niveles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CroquisGeometriaViento />
              <div className="space-y-3">
                {niveles.map((nivel, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="grid flex-1 grid-cols-3 gap-3">
                      <CampoNumerico
                        id={`alturaPiso-${i}`}
                        etiqueta={`Piso ${i + 1}, h`}
                        sufijo="m"
                        valor={nivel.alturaPiso}
                        onChange={(v) => actualizarNivel(i, "alturaPiso", v)}
                      />
                      <CampoNumerico
                        id={`a-${i}`}
                        etiqueta="a"
                        sufijo="m"
                        valor={nivel.a}
                        onChange={(v) => actualizarNivel(i, "a", v)}
                      />
                      <CampoNumerico
                        id={`b-${i}`}
                        etiqueta="b"
                        sufijo="m"
                        valor={nivel.b}
                        onChange={(v) => actualizarNivel(i, "b", v)}
                      />
                    </div>
                    {niveles.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar este nivel"
                        onClick={() => quitarNivel(i)}
                        className="mb-1.5"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={agregarNivel}>
                <Plus className="h-4 w-4" /> Agregar nivel
              </Button>
              <p className="text-xs text-muted-foreground">
                {geometria
                  ? `Coronación a ${fmt(geometria.alturaTotal)} m · envolvente ${fmt(geometria.aEnvolvente)}×${fmt(geometria.bEnvolvente)} m.`
                  : "Completá cada nivel con altura de piso, a y b positivos."}
              </p>
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
              <CampoGamma0
                id="gammaA"
                etiqueta="γ0,a"
                lambdaEtiqueta="λa"
                lambdaValor={geometria ? geometria.alturaTotal / geometria.aEnvolvente : NaN}
                umbral="0,5"
                gammaCalculado={factorForma?.ladoA ?? null}
                valorManual={gammaA}
                onChangeManual={setGammaA}
              />
              <CampoNumerico id="ceLateralA" etiqueta="Ce lateral/techo" valor={ceLateralA} onChange={setCeLateralA} />
              <CampoNumerico id="kdA" etiqueta="Kd" valor={kdA} onChange={setKdA} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Lado B (+Y) — γ0,b</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <CampoGamma0
                id="gammaB"
                etiqueta="γ0,b"
                lambdaEtiqueta="λb"
                lambdaValor={geometria ? geometria.alturaTotal / geometria.bEnvolvente : NaN}
                umbral="1"
                gammaCalculado={factorForma?.ladoB ?? null}
                valorManual={gammaB}
                onChangeManual={setGammaB}
              />
              <CampoNumerico id="ceLateralB" etiqueta="Ce lateral/techo" valor={ceLateralB} onChange={setCeLateralB} />
              <CampoNumerico id="kdB" etiqueta="Kd" valor={kdB} onChange={setKdB} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los niveles (altura de piso, a y b positivos) y γ y Kd positivos en ambos
                lados para ver los resultados.
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
                anchosExpuestosM={resultado.geometria.numericos.map((n) => n.aM)}
                alturaTotalM={resultado.geometria.alturaTotal}
              />
              <BloqueLado
                titulo="Lado B (+Y)"
                ladoR={resultado.r.ladoB}
                caso={resultado.casoB}
                anchosExpuestosM={resultado.geometria.numericos.map((n) => n.bM)}
                alturaTotalM={resultado.geometria.alturaTotal}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * γ0 sale solo de la geometría (fig. 8.2, ramas λa<0,5 y λb<1). Cuando el
 * edificio cae en el ábaco denso que no está digitalizado (λ≥umbral), no hay
 * valor calculado: se avisa y se deja el campo para cargarlo a mano leyendo
 * la fig. 8.2 de la norma.
 */
function CampoGamma0({
  id,
  etiqueta,
  lambdaEtiqueta,
  lambdaValor,
  umbral,
  gammaCalculado,
  valorManual,
  onChangeManual,
}: {
  id: string;
  etiqueta: string;
  lambdaEtiqueta: string;
  lambdaValor: number;
  umbral: string;
  gammaCalculado: number | null;
  valorManual: string;
  onChangeManual: (valor: string) => void;
}) {
  if (gammaCalculado !== null) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{etiqueta}</Label>
        <Input id={id} disabled value={fmt(gammaCalculado, 2)} />
        <p className="text-xs text-muted-foreground">
          fig. 8.2, {lambdaEtiqueta}={fmt(lambdaValor, 2)}
        </p>
      </div>
    );
  }
  return (
    <CampoNumerico
      id={id}
      etiqueta={etiqueta}
      valor={valorManual}
      onChange={onChangeManual}
      advertencia={
        Number.isFinite(lambdaValor)
          ? `${lambdaEtiqueta}=${fmt(lambdaValor, 2)} ≥ ${umbral}: leer γ0 de la fig. 8.2 (no está digitalizada para este caso).`
          : undefined
      }
    />
  );
}

function BloqueLado({
  titulo,
  ladoR,
  caso,
  anchosExpuestosM,
  alturaTotalM,
}: {
  titulo: string;
  ladoR: ResultadoLado;
  caso: ResultadoCasoApertura;
  anchosExpuestosM: number[];
  alturaTotalM: number;
}) {
  const niveles = ladoR.niveles.map((n, i) => {
    const pcKNm2 = (n.qKgM2 * caso.cTotalGobernante) / 100;
    const anchoM = anchosExpuestosM[i];
    const pcKNm = pcKNm2 * n.hInflM;
    return { ...n, pcKNm2, pcKNm, anchoM };
  });
  const resultanteTotalKN = niveles.reduce((acc, n) => acc + n.pcKNm * n.anchoM, 0);

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
          <table className="w-full min-w-[480px] font-mono text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1.5 text-left font-medium">Nivel</th>
                <th className="py-1.5 text-right font-medium">z (m)</th>
                <th className="py-1.5 text-right font-medium">kz</th>
                <th className="py-1.5 text-right font-medium">vc (m/s)</th>
                <th className="py-1.5 text-right font-medium">pc (kN/m²)</th>
                <th className="py-1.5 text-right font-medium">ancho (m)</th>
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
                  <td className="py-1 text-right tabular-nums">{fmt(n.anchoM, 1)}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(n.pcKNm, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">Resultante sobre una cara: {fmt(resultanteTotalKN)} kN</p>
          <p className="text-xs text-muted-foreground">
            Con el coeficiente total de arrastre gobernante, suma de la presión de cada nivel por su
            altura de influencia y el ancho expuesto de ese nivel.
          </p>
        </div>

        <DiagramaCargaViento alturaTotalM={alturaTotalM} niveles={niveles} />
      </CardContent>
    </Card>
  );
}
