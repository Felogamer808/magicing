"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { DiagramaFlechas } from "@/components/verificaciones/madera/DiagramaFlechas";
import {
  SelectorMadera,
  servicioDesdeEtiqueta,
  tipoDesdeEtiqueta,
} from "@/components/verificaciones/madera/SelectorMadera";
import {
  componentesFlecha,
  comprobarFlechas,
  flechaDistribuidaMm,
  flechaPuntualMm,
  type TipoElemento,
} from "@/lib/calc/ec5/deformaciones";
import { kdef } from "@/lib/calc/ec5/materiales";
import { propiedades } from "@/lib/calc/ec5/seccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "madera-deformaciones")!;

const ELEMENTOS = ["Viga sobre dos apoyos", "Voladizo"] as const;
const elementoDesde = (e: string): TipoElemento =>
  e === ELEMENTOS[1] ? "voladizo" : "dos-apoyos";
const EXIGENCIA = ["Estricto (tabiquería o acabados frágiles)", "Laxo (sin elementos frágiles)"] as const;

export default function MaderaDeformacionesPage() {
  const [norma, setNorma] = useCampo("norma", "EC5");

  const [tipo, setTipo] = useCampo("tipo", "Madera maciza");
  const [servicio, setServicio] = useCampo("servicio", "Clase 2");
  const [duracion, setDuracion] = useCampo("duracion", "Media (1 semana a 6 meses)");

  const [ancho, setAncho] = useCampo("ancho", "0.07");
  const [canto, setCanto] = useCampo("canto", "0.14");
  const [luz, setLuz] = useCampo("luz", "4.3");
  const [emean, setEmean] = useCampo("emean", "9.5");
  const [gmean, setGmean] = useCampo("gmean", "0.594");

  const [qg, setQg] = useCampo("qg", "0.2");
  const [qq, setQq] = useCampo("qq", "0.1");
  const [pg, setPg] = useCampo("pg", "0");
  const [pq, setPq] = useCampo("pq", "0");
  const [psi2, setPsi2] = useCampo("psi2", "0.3");
  const [contraflecha, setContraflecha] = useCampo("contraflecha", "0");

  const [elemento, setElemento] = useCampo("elemento", ELEMENTOS[0]);
  const [exigencia, setExigencia] = useCampo("exigencia", EXIGENCIA[0]);

  const r = useMemo(() => {
    const b = aNumero(ancho);
    const h = aNumero(canto);
    const l = aNumero(luz);
    const e = aNumero(emean);
    const g = aNumero(gmean);
    const psi = aNumero(psi2);
    const wc = aNumero(contraflecha);
    const cargas = [aNumero(qg), aNumero(qq), aNumero(pg), aNumero(pq)];

    if (![b, h, l, e, g].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![psi, wc, ...cargas].every((x) => Number.isFinite(x) && x >= 0)) return null;

    const t = tipoDesdeEtiqueta(tipo);
    const cs = servicioDesdeEtiqueta(servicio);
    const factorKdef = kdef(t, cs);
    const props = propiedades({ anchoM: b, cantoM: h });

    const [qgN, qqN, pgN, pqN] = cargas;
    const distG = flechaDistribuidaMm(qgN, l, e, g, props.iyM4, h);
    const distQ = flechaDistribuidaMm(qqN, l, e, g, props.iyM4, h);
    const puntG = flechaPuntualMm(pgN, l, e, g, props.iyM4, h);
    const puntQ = flechaPuntualMm(pqN, l, e, g, props.iyM4, h);

    const componentes = componentesFlecha({
      instantaneaGMm: distG.totalMm + puntG.totalMm,
      instantaneaQMm: distQ.totalMm + puntQ.totalMm,
      kdef: factorKdef,
      psi2: psi,
      contraflechaMm: wc,
    });

    const comprobaciones = comprobarFlechas(
      componentes, l, elementoDesde(elemento), exigencia === EXIGENCIA[0]
    );

    return {
      b, h, l, t, cs, factorKdef, props, componentes, comprobaciones, wc,
      distG, distQ, puntG, puntQ,
      cortanteMm: distG.cortanteMm + distQ.cortanteMm + puntG.cortanteMm + puntQ.cortanteMm,
      relacionEG: e / g,
    };
    // La duración de la carga no entra: kdef sólo depende de la clase de
    // servicio, tabla 3.2. El desplegable se muestra igual porque el bloque de
    // material es el mismo en todas las páginas de la sección.
  }, [ancho, canto, luz, emean, gmean, qg, qq, pg, pq, psi2, contraflecha,
      tipo, servicio, elemento, exigencia]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Estado límite de servicio</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          En madera el servicio suele decidir el canto antes que el agotamiento. Con kdef = 2,00 en
          clase de servicio 3 la fluencia <strong className="text-foreground">triplica</strong> la
          flecha de la parte permanente, un factor que ningún otro material estructural tiene. Y a
          diferencia del hormigón, la deformación por cortante no es despreciable: E/G ronda 16 en
          vez de 2,4.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Material y sección</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SelectorMadera
                tipo={tipo} onTipo={setTipo}
                servicio={servicio} onServicio={setServicio}
                duracion={duracion} onDuracion={setDuracion}
                mostrarKdef
              />
              <div className="grid grid-cols-3 gap-4">
                <CampoNumerico id="ancho" etiqueta="Anchura b" sufijo="m" valor={ancho} onChange={setAncho} />
                <CampoNumerico id="canto" etiqueta="Canto h" sufijo="m" valor={canto} onChange={setCanto} />
                <CampoNumerico id="luz" etiqueta="Luz l" sufijo="m" valor={luz} onChange={setLuz} />
                <CampoNumerico id="emean" etiqueta="Emean" sufijo="GPa" valor={emean} onChange={setEmean} />
                <CampoNumerico id="gmean" etiqueta="Gmean" sufijo="GPa" valor={gmean} onChange={setGmean} />
              </div>
              <p className="text-xs text-muted-foreground">
                Servicio se calcula con los módulos <strong>medios</strong>, art. 2.2.3(2), no con
                los característicos del quinto percentil que usan pandeo y vuelco.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cargas de servicio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="qg" etiqueta="qG distribuida" sufijo="kN/m" valor={qg} onChange={setQg} />
                <CampoNumerico id="qq" etiqueta="qQ distribuida" sufijo="kN/m" valor={qq} onChange={setQq} />
                <CampoNumerico id="pg" etiqueta="PG puntual centro" sufijo="kN" valor={pg} onChange={setPg} />
                <CampoNumerico id="pq" etiqueta="PQ puntual centro" sufijo="kN" valor={pq} onChange={setPq} />
                <CampoNumerico id="psi2" etiqueta="ψ2 de la variable" valor={psi2} onChange={setPsi2} />
                <CampoNumerico id="contraflecha" etiqueta="Contraflecha wc" sufijo="mm"
                               valor={contraflecha} onChange={setContraflecha} />
              </div>
              <PanelAyuda titulo="Por qué hay que separar permanente de variable">
                <p>
                  Las ecs. (2.3) a (2.5) aplican kdef <em>entero</em> a la carga permanente pero
                  sólo <strong className="text-foreground">ψ2·kdef</strong> a la variable: la parte
                  de la sobrecarga que no está permanentemente aplicada no fluye.
                </p>
                <p>
                  Multiplicar la flecha total por (1 + kdef), que es lo que hace la planilla
                  original, es conservador pero puede sobrestimar la flecha final un 18 % o más y
                  llevar a engordar la viga sin necesidad.
                </p>
                <p>
                  <strong className="text-foreground">ψ2</strong> sale de EN 1990, no del EC5: del
                  orden de 0,3 en vivienda y oficinas, 0,6 en almacenamiento, 0 en cubiertas no
                  accesibles.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Límites</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion id="elemento" etiqueta="Tipo de elemento" valor={elemento}
                              opciones={ELEMENTOS} onChange={setElemento} />
              <CampoSeleccion id="exigencia" etiqueta="Extremo del rango de la tabla 7.2"
                              valor={exigencia} opciones={EXIGENCIA} onChange={setExigencia} />
              <p className="text-xs text-muted-foreground">
                La tabla 7.2 da rangos y no valores, porque el límite depende de qué cuelga de la
                viga. La elección es del proyectista y por eso se declara acá.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!r ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargá sección, módulos y cargas con valores válidos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {r.comprobaciones.map((c) => (
                    <ResultadoCheck
                      key={c.etiqueta}
                      etiqueta={`${c.etiqueta} ≤ l/${c.denominador}`}
                      verifica={c.verifica}
                      comparacion={{
                        real: { etiqueta: c.etiqueta, valor: c.valorMm },
                        limite: { etiqueta: `l/${c.denominador}`, valor: c.limiteMm },
                        unidad: "mm",
                        exige: "≤",
                        decimales: 2,
                      }}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Componentes de la deformación</CardTitle></CardHeader>
                <CardContent>
                  <DiagramaFlechas componentes={r.componentes} contraflechaMm={r.wc} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Desarrollo</CardTitle></CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo de la flecha"
                    filas={[
                      { etiqueta: "Iy", valor: `${fmt(r.props.iyM4 * 1e6, 3)} ·10⁻⁶ m⁴` },
                      { etiqueta: "E/G", valor: fmt(r.relacionEG, 1) },
                      { etiqueta: "kdef (tabla 3.2)", valor: fmt(r.factorKdef, 2) },
                      { etiqueta: "winst,G", valor: `${fmt(r.componentes.instantaneaGMm, 2)} mm` },
                      { etiqueta: "winst,Q", valor: `${fmt(r.componentes.instantaneaQMm, 2)} mm` },
                      {
                        etiqueta: "de los cuales, por cortante",
                        valor: `${fmt(r.cortanteMm, 2)} mm`,
                      },
                      {
                        etiqueta: "wcreep,G = winst,G·kdef  (2.3)",
                        valor: `${fmt(r.componentes.fluenciaGMm, 2)} mm`,
                      },
                      {
                        etiqueta: "wcreep,Q = winst,Q·ψ2·kdef  (2.4)",
                        valor: `${fmt(r.componentes.fluenciaQMm, 2)} mm`,
                      },
                      { etiqueta: "wfin", valor: `${fmt(r.componentes.finalMm, 2)} mm` },
                      {
                        etiqueta: "wnet,fin = wfin − wc  (7.2)",
                        valor: `${fmt(r.componentes.netaFinalMm, 2)} mm`,
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
