"use client";

import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { DiagramasViga } from "@/components/verificaciones/estatica/DiagramasViga";
import {
  CASOS_VIGA,
  FAMILIAS_CASO,
  type CasoViga,
  type FamiliaCaso,
} from "@/lib/calc/estatica/casos-viga";
import {
  calcularVigaContinua,
  type EntradaViga,
  type ResultadoViga,
} from "@/lib/calc/estatica/viga-continua";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "formulario-vigas")!;

/**
 * El catálogo agrupado por familia, una sola vez y a nivel de módulo: filtrarlo
 * dentro del componente daría un array nuevo por render y el compilador de React
 * dejaría de poder memoizar lo que depende del caso elegido. Mismo motivo que en
 * la página de propiedades geométricas.
 */
const POR_FAMILIA = new Map<FamiliaCaso, readonly CasoViga[]>(
  FAMILIAS_CASO.map((f) => [f.id, CASOS_VIGA.filter((c) => c.familia === f.id)])
);

function resolverCaso(familia: FamiliaCaso, id: string): CasoViga {
  const lista = POR_FAMILIA.get(familia)!;
  // Al cambiar de familia el caso guardado deja de pertenecer: se cae al primero
  // de la familia nueva, sin efectos ni estado derivado.
  return lista.find((c) => c.id === id) ?? lista[0];
}

/**
 * Todos los parámetros viajan en un solo campo persistido, serializados por
 * caso. Es la única forma de tener un formulario que cambia de campos según el
 * caso elegido sin violar las reglas de los hooks: `useCampo` no se puede llamar
 * en un bucle sobre una lista que cambia de largo.
 */
type Guardados = Record<string, Record<string, string>>;

type Estado =
  | { ok: true; entrada: EntradaViga; resultado: ResultadoViga; valores: Record<string, number> }
  | { ok: false; motivo: string };

function textoPorDefecto(n: number) {
  return String(n).replace(".", ",");
}

function leerGuardados(crudo: string): Guardados {
  try {
    const o: unknown = JSON.parse(crudo);
    return o && typeof o === "object" ? (o as Guardados) : {};
  } catch {
    // Si lo guardado quedó corrupto se vuelve a los valores por defecto en vez
    // de romper la página.
    return {};
  }
}

function calcularEstado(
  caso: CasoViga,
  textos: Record<string, string>,
  eiKNm2: number
): Estado {
  const valores: Record<string, number> = {};
  for (const p of caso.parametros) valores[p.clave] = aNumero(textos[p.clave] ?? "");
  if (Object.values(valores).some((v) => !Number.isFinite(v))) {
    return { ok: false, motivo: "Hay un campo vacío o que no es un número." };
  }
  if (!Number.isFinite(eiKNm2) || eiKNm2 <= 0) {
    return { ok: false, motivo: "El módulo E y la inercia I tienen que ser números positivos." };
  }

  const motivo = caso.validar?.(valores) ?? null;
  if (motivo) return { ok: false, motivo };

  try {
    const entrada: EntradaViga = { ...caso.armar(valores), eiKNm2 };
    return { ok: true, entrada, resultado: calcularVigaContinua(entrada), valores };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "No se pudo resolver la viga." };
  }
}

export default function FormularioVigasPage() {
  const [norma, setNorma] = useCampo("norma", "Estática");
  const [familiaGuardada, setFamilia] = useCampo("familia", "un-tramo");
  const [idGuardado, setId] = useCampo("caso", "simple-uniforme");
  const [crudo, setCrudo] = useCampo("parametros", "{}");
  const [eGPa, setEGPa] = useCampo("eGPa", "30");
  const [iCm4, setICm4] = useCampo("iCm4", "540000");

  const familia = (FAMILIAS_CASO.find((f) => f.id === familiaGuardada)?.id ??
    "un-tramo") as FamiliaCaso;
  const deLaFamilia = POR_FAMILIA.get(familia)!;
  const caso = resolverCaso(familia, idGuardado);

  // Sin useMemo, igual que en propiedades geométricas: la dependencia sería el
  // objeto del catálogo y el compilador de React no puede preservar esa
  // memoización manual. Resolver una viga de pocos elementos no cuesta nada.
  const guardados = leerGuardados(crudo);

  const textos: Record<string, string> = {};
  for (const p of caso.parametros) textos[p.clave] = textoPorDefecto(p.porDefecto);
  Object.assign(textos, guardados[caso.id] ?? {});

  const cambiarParam = (clave: string, valor: string) => {
    setCrudo(JSON.stringify({ ...guardados, [caso.id]: { ...textos, [clave]: valor } }));
  };

  // E en GPa son 10⁶ kN/m² y I en cm⁴ son 10⁻⁸ m⁴, así que el producto queda
  // multiplicado por 10⁻² para dar kN·m².
  const eiKNm2 = aNumero(eGPa) * aNumero(iCm4) * 1e-2;

  const estado = calcularEstado(caso, textos, eiKNm2);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Estática · Herramientas de análisis</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          No hay una fórmula por caso: la viga se resuelve por rigidez directa, con la matriz y las
          cargas de empotramiento integradas de las funciones de forma, así que no hay ninguna
          expresión de tabla copiada a mano. Los elementos se cortan en cada apoyo, cada carga
          puntual y cada extremo de trapecio, con lo cual la carga queda lineal dentro de cada uno y
          la solución coincide con la exacta de Euler-Bernoulli, no la aproxima. El formulario
          clásico está del otro lado: se usa como test, para contrastar los coeficientes.
        </CardContent>
      </Card>

      {/*
        Los datos ocupan una columna angosta y el dibujo la ancha, al lado, para
        poder cargar un parámetro y verlo en el esquema sin scrollear. Los
        resultados pasan a la banda de abajo, a todo el ancho. Debajo de xl todo
        se apila en una sola columna, en el orden en que se usa: datos, dibujo,
        resultados.

        El corte va en xl y no en lg porque a 1024 px las dos columnas dan 269 y
        404: los campos quedan apretados y el dibujo sale más chico que apilado.
      */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Caso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSeleccion
                  id="familia"
                  etiqueta="Familia"
                  valor={FAMILIAS_CASO.find((f) => f.id === familia)!.nombre}
                  opciones={FAMILIAS_CASO.map((f) => f.nombre)}
                  onChange={(nombre) => {
                    const f = FAMILIAS_CASO.find((x) => x.nombre === nombre);
                    if (!f) return;
                    setFamilia(f.id);
                    const primero = CASOS_VIGA.find((c) => c.familia === f.id);
                    if (primero) setId(primero.id);
                  }}
                />
                <CampoSeleccion
                  id="caso"
                  etiqueta="Esquema"
                  valor={caso.nombre}
                  opciones={deLaFamilia.map((c) => c.nombre)}
                  onChange={(nombre) => {
                    const c = deLaFamilia.find((x) => x.nombre === nombre);
                    if (c) setId(c.id);
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{caso.descripcion}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geometría y cargas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {caso.parametros.map((p) => (
                <CampoNumerico
                  key={`${caso.id}-${p.clave}`}
                  id={`param-${p.clave}`}
                  etiqueta={p.etiqueta}
                  sufijo={p.unidad ?? "m"}
                  valor={textos[p.clave] ?? ""}
                  onChange={(v) => cambiarParam(p.clave, v)}
                  advertencia={p.ayuda}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rigidez</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico
                  id="eGPa"
                  etiqueta="Módulo E"
                  sufijo="GPa"
                  valor={eGPa}
                  onChange={setEGPa}
                />
                <CampoNumerico
                  id="iCm4"
                  etiqueta="Inercia I"
                  sufijo="cm⁴"
                  valor={iCm4}
                  onChange={setICm4}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                EI = {Number.isFinite(eiKNm2) ? fmt(eiKNm2, 0) : "—"} kN·m². Mientras EI sea
                constante en toda la viga no cambia ni las reacciones ni los diagramas de V y M —ni
                siquiera en las hiperestáticas, donde se cancela al plantear la compatibilidad—:
                sólo escala la flecha. La inercia se saca de{" "}
                <a className="underline" href="/verificaciones/propiedades-geometricas">
                  propiedades geométricas
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>

        {/*
          El layout de verificaciones topa los esquemas en 20rem de alto para que
          un dibujo vertical no quede al triple que los demás. Acá el dibujo tiene
          columna propia, así que el tope es lo único que impide que crezca:
          subirlo a 32rem lo deja gobernado por el ancho de la columna, no por el
          alto. Debajo de xl vuelve a valer el tope general.
        */}
        <Card className="self-start xl:[&_svg]:max-h-[32rem]">
          <CardHeader>
            <CardTitle className="text-base">Diagramas</CardTitle>
          </CardHeader>
          <CardContent>
            {estado.ok ? (
              <>
                <DiagramasViga
                  largoM={estado.entrada.largoM}
                  nodos={estado.entrada.nodos}
                  cargas={estado.entrada.cargas}
                  resultado={estado.resultado}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Cargas positivas hacia abajo. El flector se dibuja del lado traccionado, así que lo
                  que queda para abajo es momento positivo y se arma en la cara inferior.
                </p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{estado.motivo}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {!estado.ok ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {estado.motivo}
            </CardContent>
          </Card>
        ) : (
          <ResultadoVigaPanel caso={caso} estado={estado} />
        )}
      </div>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: React.ReactNode; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{etiqueta}</span>
      <span className="font-mono text-sm tabular-nums">{valor}</span>
    </div>
  );
}

/**
 * Un extremo que en realidad vale cero sale del solver como −10⁻¹⁵ y se imprime
 * "−0,00", que se lee como un momento negativo chiquito y no como la ausencia de
 * momento. Se aplasta al formatear, no en el motor, donde el signo del cero es
 * información legítima.
 */
const sinCeroNegativo = (n: number) => (Math.abs(n) < 5e-9 ? 0 : n);

const NOMBRE_APOYO: Record<string, string> = {
  simple: "Apoyo simple",
  empotrado: "Empotramiento",
  libre: "Extremo libre",
};

function ResultadoVigaPanel({
  caso,
  estado,
}: {
  caso: CasoViga;
  estado: Extract<Estado, { ok: true }>;
}) {
  const r = estado.resultado;
  const apoyos = r.reacciones.filter((x) => x.tipo !== "libre");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reacciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            {apoyos.map((x) => (
              <Dato
                key={x.xM}
                etiqueta={`${NOMBRE_APOYO[x.tipo]} en x = ${fmt(x.xM, 2)} m`}
                valor={
                  x.tipo === "empotrado"
                    ? `${fmt(sinCeroNegativo(x.rKN), 2)} kN · ${fmt(sinCeroNegativo(x.mKNm), 2)} kN·m`
                    : `${fmt(sinCeroNegativo(x.rKN), 2)} kN`
                }
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Reacción vertical positiva hacia arriba; momento de empotramiento positivo antihorario.
            Cierre de equilibrio vertical: {fmt(Math.abs(r.desequilibrioKN), 6)} kN.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Esfuerzos máximos</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Dato
            etiqueta={`Cortante máximo (x = ${fmt(r.cortanteMax.xM, 2)} m)`}
            valor={`${fmt(sinCeroNegativo(r.cortanteMax.valor), 2)} kN`}
          />
          <Dato
            etiqueta={`Momento máximo positivo (x = ${fmt(r.momentoMax.xM, 2)} m)`}
            valor={`${fmt(sinCeroNegativo(r.momentoMax.valor), 2)} kN·m`}
          />
          <Dato
            etiqueta={`Momento máximo negativo (x = ${fmt(r.momentoMin.xM, 2)} m)`}
            valor={`${fmt(sinCeroNegativo(r.momentoMin.valor), 2)} kN·m`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flecha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <Dato
              etiqueta={`Flecha máxima (x = ${fmt(r.flechaMax.xM, 2)} m)`}
              valor={`${fmt(sinCeroNegativo(r.flechaMax.valor), 2)} mm`}
            />
            <Dato
              etiqueta="Relación L / δ"
              valor={
                Number.isFinite(r.relacionLSobreFlecha)
                  ? `L / ${fmt(r.relacionLSobreFlecha, 0)}`
                  : "sin flecha"
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Flecha positiva hacia arriba: una viga cargada da negativo. La relación L/δ usa el largo
            total y el módulo de la flecha, y se compara contra el límite del elemento —no lo
            impone esta pantalla, que es de estática y no conoce la norma que aplica.
          </p>
        </CardContent>
      </Card>

      {caso.normalizacion && <Coeficientes caso={caso} estado={estado} />}
    </>
  );
}

/**
 * Los mismos resultados escritos como coeficiente de q·L² o de P·L, que es la
 * forma en que están tabulados en cualquier formulario. Sirve para contrastar
 * contra el manual que uno tenga a mano: el 0,125 de la apoyada uniforme o el
 * 9/128 de la empotrada-apoyada tienen que salir acá igual.
 */
function Coeficientes({
  caso,
  estado,
}: {
  caso: CasoViga;
  estado: Extract<Estado, { ok: true }>;
}) {
  const n = caso.normalizacion!;
  const carga = estado.valores[n.claveCarga];
  const luz = estado.valores[n.claveLuz];
  const r = estado.resultado;

  const baseM = n.patron === "uniforme" ? carga * luz * luz : carga * luz;
  const baseV = n.patron === "uniforme" ? carga * luz : carga;
  const coef = (valor: number, base: number) =>
    Math.abs(base) < 1e-12 ? "—" : fmt(valor / base, 4);

  const simboloM = n.patron === "uniforme" ? `${n.claveCarga}·${n.claveLuz}²` : `${n.claveCarga}·${n.claveLuz}`;
  const simboloV = n.patron === "uniforme" ? `${n.claveCarga}·${n.claveLuz}` : n.claveCarga;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Coeficientes de tabla</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <PanelFormulas
          titulo={`Referidos a ${simboloM} y ${simboloV}`}
          filas={[
            { etiqueta: `M⁺máx / ${simboloM}`, valor: coef(r.momentoMax.valor, baseM) },
            { etiqueta: `M⁻máx / ${simboloM}`, valor: coef(r.momentoMin.valor, baseM) },
            { etiqueta: `Vmáx / ${simboloV}`, valor: coef(r.cortanteMax.valor, baseV) },
            ...r.reacciones
              .filter((x) => x.tipo !== "libre")
              .map((x) => ({
                etiqueta: `R(x = ${fmt(x.xM, 2)} m) / ${simboloV}`,
                valor: coef(x.rKN, baseV),
              })),
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Contrastar estos números contra el formulario impreso es la forma más rápida de detectar
          un dato mal cargado: el coeficiente no depende ni de la luz ni del valor de la carga.
        </p>
      </CardContent>
    </Card>
  );
}
