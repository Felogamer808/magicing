"use client";

import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { DiagramaSeccion } from "@/components/verificaciones/geometria/DiagramaSeccion";
import {
  CATALOGO_SECCIONES,
  FAMILIAS,
  type ContornoSeccion,
  type DefinicionSeccion,
  type FamiliaSeccion,
} from "@/lib/calc/geometria/catalogo-secciones";
import {
  calcularPropiedadesSeccion,
  type PropiedadesSeccion,
} from "@/lib/calc/geometria/poligono";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "propiedades-geometricas")!;

/**
 * El catálogo agrupado por familia, una sola vez y a nivel de módulo. Filtrarlo
 * dentro del componente daba un array nuevo por render y el compilador de React
 * lo tomaba como valor mutable, con lo cual no podía preservar los useMemo que
 * dependen de la sección elegida.
 */
const POR_FAMILIA = new Map<FamiliaSeccion, readonly DefinicionSeccion[]>(
  FAMILIAS.map((f) => [f.id, CATALOGO_SECCIONES.filter((s) => s.familia === f.id)])
);

function resolverSeccion(familia: FamiliaSeccion, id: string): DefinicionSeccion {
  const lista = POR_FAMILIA.get(familia)!;
  // Al cambiar de familia la sección guardada deja de pertenecer: se cae a la
  // primera de la nueva familia, sin efectos ni estado derivado.
  return lista.find((s) => s.id === id) ?? lista[0];
}

/**
 * Todos los parámetros viajan en un solo campo persistido, serializados por
 * sección. Es la única forma de tener un formulario que cambia de campos según
 * la sección elegida sin violar las reglas de los hooks: `useCampo` no se puede
 * llamar en un bucle sobre una lista que cambia de largo.
 */
type Guardados = Record<string, Record<string, string>>;

/** Lo que se dibuja y lo que se lista, juntos: salen del mismo contorno. */
type ContornoConPropiedades = ContornoSeccion & { props: PropiedadesSeccion };

type Estado =
  | { ok: true; datos: ContornoConPropiedades }
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

function calcularEstado(def: DefinicionSeccion, textos: Record<string, string>): Estado {
  const valores: Record<string, number> = {};
  for (const q of def.parametros) valores[q.clave] = aNumero(textos[q.clave] ?? "");
  if (Object.values(valores).some((v) => !Number.isFinite(v))) {
    return { ok: false, motivo: "Hay un campo vacío o que no es un número." };
  }

  const motivo = def.validar?.(valores) ?? null;
  if (motivo) return { ok: false, motivo };

  try {
    const contorno = def.contorno(valores);
    return {
      ok: true,
      datos: { ...contorno, props: calcularPropiedadesSeccion(contorno.lleno, contorno.huecos) },
    };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "No se pudo cerrar el contorno." };
  }
}

export default function PropiedadesGeometricasPage() {
  const [norma, setNorma] = useCampo("norma", "Geometría");
  const [familiaGuardada, setFamilia] = useCampo("familia", "simples");
  const [idGuardado, setId] = useCampo("seccion", "rectangulo");
  const [crudo, setCrudo] = useCampo("parametros", "{}");

  const familia = (FAMILIAS.find((f) => f.id === familiaGuardada)?.id ?? "simples") as FamiliaSeccion;
  const deLaFamilia = POR_FAMILIA.get(familia)!;
  const def = resolverSeccion(familia, idGuardado);

  /*
   * Sin useMemo a propósito. Las otras páginas lo usan porque sus dependencias
   * son strings sueltos; acá la sección elegida es un objeto del catálogo, y el
   * compilador de React no puede preservar una memoización manual con esa
   * dependencia (falla la regla `preserve-manual-memoization`). Memoiza él, que
   * para eso está, y de paso queda una lectura más directa. El costo real es
   * integrar como mucho 720 vértices: nada.
   */
  const guardados = leerGuardados(crudo);

  const textos: Record<string, string> = {};
  for (const q of def.parametros) textos[q.clave] = textoPorDefecto(q.porDefecto);
  Object.assign(textos, guardados[def.id] ?? {});

  const cambiarParam = (clave: string, valor: string) => {
    setCrudo(JSON.stringify({ ...guardados, [def.id]: { ...textos, [clave]: valor } }));
  };

  const estado = calcularEstado(def, textos);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Secciones · Herramientas de análisis</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          No hay una fórmula por perfil: se integra el contorno por el teorema de Green, así que
          cada sección es nada más que la lista de sus vértices. Eso da además el producto de
          inercia I<sub>xy</sub> y la orientación de los ejes principales, que es lo que una tabla
          de perfiles no suele traer y lo que explica que un ángulo cargado en vertical flecte
          también de costado.
        </CardContent>
      </Card>

      {/*
        Los datos ocupan una columna angosta y el dibujo la ancha, al lado, para
        poder cambiar una dimensión y ver el contorno sin scrollear. Los
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
              <CardTitle className="text-base">Sección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSeleccion
                  id="familia"
                  etiqueta="Familia"
                  valor={FAMILIAS.find((f) => f.id === familia)!.nombre}
                  opciones={FAMILIAS.map((f) => f.nombre)}
                  onChange={(nombre) => {
                    const f = FAMILIAS.find((x) => x.nombre === nombre);
                    if (!f) return;
                    setFamilia(f.id);
                    const primera = CATALOGO_SECCIONES.find((s) => s.familia === f.id);
                    if (primera) setId(primera.id);
                  }}
                />
                <CampoSeleccion
                  id="seccion"
                  etiqueta="Forma"
                  valor={def.nombre}
                  opciones={deLaFamilia.map((s) => s.nombre)}
                  onChange={(nombre) => {
                    const s = deLaFamilia.find((x) => x.nombre === nombre);
                    if (s) setId(s.id);
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{def.descripcion}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dimensiones</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {def.parametros.map((q) => {
                const unidad = q.unidad ?? "cm";
                return (
                  <CampoNumerico
                    key={`${def.id}-${q.clave}`}
                    id={`param-${q.clave}`}
                    etiqueta={q.etiqueta}
                    sufijo={unidad || undefined}
                    valor={textos[q.clave] ?? ""}
                    onChange={(v) => cambiarParam(q.clave, v)}
                    advertencia={q.ayuda}
                  />
                );
              })}
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
            <CardTitle className="text-base">Dibujo</CardTitle>
          </CardHeader>
          <CardContent>
            {estado.ok ? (
              <>
                <DiagramaSeccion
                  lleno={estado.datos.lleno}
                  huecos={estado.datos.huecos}
                  props={estado.datos.props}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Punteado gris: ejes centroidales x-y, los de I<sub>x</sub> e I<sub>y</sub>. Verde:
                  ejes principales, sólo se dibujan cuando están girados.
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
          <ResultadoPropiedades datos={estado.datos} />
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

function ResultadoPropiedades({ datos }: { datos: ContornoConPropiedades }) {
  const p = datos.props;
  const w = (n: number) => (Number.isFinite(n) ? `${fmt(n, 1)} cm³` : "—");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Área y centroide</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Dato etiqueta="Área A" valor={`${fmt(p.areaCm2, 2)} cm²`} />
          <Dato etiqueta="Perímetro" valor={`${fmt(p.perimetroCm, 2)} cm`} />
          <Dato etiqueta="Centroide xG" valor={`${fmt(p.centroideXCm, 3)} cm`} />
          <Dato etiqueta="Centroide yG" valor={`${fmt(p.centroideYCm, 3)} cm`} />
          <Dato etiqueta="Envolvente" valor={`${fmt(p.anchoTotalCm, 1)} × ${fmt(p.altoTotalCm, 1)} cm`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inercias respecto del centroide</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Dato etiqueta={<>I<sub>x</sub></>} valor={`${fmt(p.ixCm4, 1)} cm⁴`} />
          <Dato etiqueta={<>I<sub>y</sub></>} valor={`${fmt(p.iyCm4, 1)} cm⁴`} />
          <Dato etiqueta={<>I<sub>xy</sub></>} valor={`${fmt(p.ixyCm4, 1)} cm⁴`} />
          <Dato etiqueta={<>Radio de giro i<sub>x</sub></>} valor={`${fmt(p.radioGiroXCm, 3)} cm`} />
          <Dato etiqueta={<>Radio de giro i<sub>y</sub></>} valor={`${fmt(p.radioGiroYCm, 3)} cm`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos resistentes elásticos</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Dato etiqueta={<>W<sub>x</sub> fibra superior (v = {fmt(p.ySuperiorCm, 2)} cm)</>} valor={w(p.wxSuperiorCm3)} />
          <Dato etiqueta={<>W<sub>x</sub> fibra inferior (v = {fmt(p.yInferiorCm, 2)} cm)</>} valor={w(p.wxInferiorCm3)} />
          <Dato etiqueta={<>W<sub>y</sub> izquierda (v = {fmt(p.xIzquierdoCm, 2)} cm)</>} valor={w(p.wyIzquierdoCm3)} />
          <Dato etiqueta={<>W<sub>y</sub> derecha (v = {fmt(p.xDerechoCm, 2)} cm)</>} valor={w(p.wyDerechoCm3)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ejes principales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <Dato etiqueta={<>I<sub>1</sub> (máxima)</>} valor={`${fmt(p.i1Cm4, 1)} cm⁴`} />
            <Dato etiqueta={<>I<sub>2</sub> (mínima)</>} valor={`${fmt(p.i2Cm4, 1)} cm⁴`} />
            <Dato etiqueta="Ángulo θ del eje 1 con el eje x" valor={`${fmt(p.anguloPrincipalGrados, 2)}°`} />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.abs(p.anguloPrincipalGrados) < 0.05
              ? "La sección tiene al menos un eje de simetría: Ixy se anula y los ejes principales coinciden con x-y."
              : "Los ejes principales están girados respecto de x-y. Una carga vertical sobre esta sección produce también flexión lateral, y el pandeo débil se controla con I₂, no con el menor de Ix e Iy."}
          </p>
          <PanelFormulas
            titulo="Cómo salen"
            filas={[
              { etiqueta: "I1,2 = (Ix+Iy)/2 ± R", valor: `R = ${fmt(Math.hypot((p.ixCm4 - p.iyCm4) / 2, p.ixyCm4), 1)} cm⁴` },
              { etiqueta: "R = √( ((Ix−Iy)/2)² + Ixy² )", valor: "círculo de Mohr" },
              { etiqueta: "θ = ½·atan2(−2Ixy, Ix−Iy)", valor: `${fmt(p.anguloPrincipalGrados, 3)}°` },
              { etiqueta: "Comprobación I1 + I2 = Ix + Iy", valor: `${fmt(p.i1Cm4 + p.i2Cm4, 1)} = ${fmt(p.ixCm4 + p.iyCm4, 1)} cm⁴` },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
