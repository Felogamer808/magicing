"use client";

import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { DiagramaTorsion } from "@/components/verificaciones/estatica/DiagramaTorsion";
import {
  CASOS_TORSION,
  FAMILIAS_TORSION,
  type CasoTorsion,
  type FamiliaTorsion,
} from "@/lib/calc/estatica/casos-torsion";
import {
  calcularTorsionViga,
  type EntradaTorsion,
  type ResultadoTorsion,
} from "@/lib/calc/estatica/torsion-viga";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "formulario-torsion")!;

const ETAPAS = [
  { id: "caso-carga", titulo: "Caso y carga" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const POR_FAMILIA = new Map<FamiliaTorsion, readonly CasoTorsion[]>(
  FAMILIAS_TORSION.map((f) => [f.id, CASOS_TORSION.filter((c) => c.familia === f.id)])
);

function resolverCaso(familia: FamiliaTorsion, id: string): CasoTorsion {
  const lista = POR_FAMILIA.get(familia)!;
  return lista.find((c) => c.id === id) ?? lista[0];
}

const NOTA_FAMILIA: Record<FamiliaTorsion, string> = {
  voladizo:
    "Empotrada torsionalmente en x=0, libre de girar en x=L. El torsor en cualquier corte sale de la estática pura: la suma de lo aplicado entre el corte y el extremo libre.",
  apoyada:
    "Restringida al giro en los dos extremos. Con dos apoyos hay dos reacciones y una sola ecuación de equilibrio —el caso general es indeterminado, hace falta la rigidez GJ de la pieza—, así que acá sólo entran las cargas simétricas respecto del centro: la simetría reparte el torsor mitad y mitad sin ese dato.",
};

/** Mismo patrón que formulario-vigas: un solo campo persistido, serializado por caso. */
type Guardados = Record<string, Record<string, string>>;

type Estado =
  | { ok: true; entrada: EntradaTorsion; resultado: ResultadoTorsion }
  | { ok: false; motivo: string };

function textoPorDefecto(n: number) {
  return String(n).replace(".", ",");
}

function leerGuardados(crudo: string): Guardados {
  try {
    const o: unknown = JSON.parse(crudo);
    return o && typeof o === "object" ? (o as Guardados) : {};
  } catch {
    return {};
  }
}

function calcularEstado(caso: CasoTorsion, textos: Record<string, string>): Estado {
  const valores: Record<string, number> = {};
  for (const p of caso.parametros) valores[p.clave] = aNumero(textos[p.clave] ?? "");
  if (Object.values(valores).some((v) => !Number.isFinite(v))) {
    return { ok: false, motivo: "Hay un campo vacío o que no es un número." };
  }

  const motivo = caso.validar?.(valores) ?? null;
  if (motivo) return { ok: false, motivo };

  const entrada = caso.armar(valores);
  return { ok: true, entrada, resultado: calcularTorsionViga(entrada, caso.condicion) };
}

export default function FormularioTorsionPage() {
  const [norma, setNorma] = useCampo("norma", "Estática");
  const [familiaGuardada, setFamilia] = useCampo("familia", "voladizo");
  const [idGuardado, setId] = useCampo("caso", CASOS_TORSION[0].id);
  const [crudo, setCrudo] = useCampo("parametros", "{}");

  const familia = (FAMILIAS_TORSION.find((f) => f.id === familiaGuardada)?.id ?? "voladizo") as FamiliaTorsion;
  const deLaFamilia = POR_FAMILIA.get(familia)!;
  const caso = resolverCaso(familia, idGuardado);
  const guardados = leerGuardados(crudo);

  const textos: Record<string, string> = {};
  for (const p of caso.parametros) textos[p.clave] = textoPorDefecto(p.porDefecto);
  Object.assign(textos, guardados[caso.id] ?? {});

  const cambiarParam = (clave: string, valor: string) => {
    setCrudo(JSON.stringify({ ...guardados, [caso.id]: { ...textos, [clave]: valor } }));
  };

  const estado = calcularEstado(caso, textos);

  const avisos: AvisoRevision[] = estado.ok ? [] : [{ tipo: "error", texto: estado.motivo }];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Estática · Herramientas de análisis</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="caso-carga" numero={1} titulo="Caso y carga" descripcion={caso.descripcion}>
          <div className="max-w-2xl space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSeleccion
                id="familia"
                etiqueta="Apoyo"
                valor={FAMILIAS_TORSION.find((f) => f.id === familia)!.nombre}
                opciones={FAMILIAS_TORSION.map((f) => f.nombre)}
                onChange={(nombre) => {
                  const f = FAMILIAS_TORSION.find((x) => x.nombre === nombre);
                  if (!f) return;
                  setFamilia(f.id);
                  const primero = CASOS_TORSION.find((c) => c.familia === f.id);
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
            <Subgrupo titulo="Geometría y carga">
              <div className="grid grid-cols-2 gap-4">
                {caso.parametros.map((p) => (
                  <CampoNumerico
                    key={`${caso.id}-${p.clave}`}
                    id={`param-${p.clave}`}
                    etiqueta={p.etiqueta}
                    sufijo={p.unidad ?? "m"}
                    valor={textos[p.clave] ?? ""}
                    onChange={(v) => cambiarParam(p.clave, v)}
                  />
                ))}
              </div>
            </Subgrupo>
          </div>
        </Etapa>

        <Etapa id="revision" numero={2} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Apoyo", valor: FAMILIAS_TORSION.find((f) => f.id === familia)!.nombre },
              { etiqueta: "Esquema", valor: caso.nombre },
              ...caso.parametros.map((p) => ({ etiqueta: p.etiqueta, valor: `${textos[p.clave] ?? ""} ${p.unidad ?? "m"}` })),
            ]}
            hipotesis={[
              NOTA_FAMILIA[familia],
              "El signo del torsor sigue el que se cargue: es la superposición directa de lo aplicado.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={3} titulo="Resultados">
          {!estado.ok ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">{estado.motivo}</span>
            </div>
          ) : (
            <div className="space-y-10">
              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "Torsor máximo", valor: `${fmt(estado.resultado.torsorMax.valor)} kN·m`, nota: `en x = ${fmt(estado.resultado.torsorMax.xM, 2)} m` },
                  {
                    etiqueta: caso.condicion === "empotrada-libre" ? "Reacción en el empotramiento" : "Reacción en cada apoyo",
                    valor: `${fmt(estado.resultado.reaccionApoyoKNm)} kN·m`,
                    nota: caso.condicion === "apoyada-simetrica" ? "signo opuesto en cada extremo" : undefined,
                  },
                ]}
              />
              <Subgrupo titulo="Diagrama de torsores">
                <DiagramaTorsion
                  largoM={estado.entrada.largoM}
                  cargas={estado.entrada.cargas}
                  resultado={estado.resultado}
                  condicion={caso.condicion}
                />
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
