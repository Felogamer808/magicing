"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaLuzCanto } from "@/components/verificaciones/hormigon/DiagramaLuzCanto";
import { DiagramaFlecha } from "@/components/verificaciones/hormigon/DiagramaFlecha";
import {
  COEF_FLECHA,
  K_SISTEMA,
  NOMBRE_SISTEMA,
  calcularFlecha,
  calcularLuzCanto,
  type SistemaEstructural,
} from "@/lib/calc/hormigon/deformaciones";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "deformaciones")!;

const SISTEMAS = Object.keys(K_SISTEMA) as SistemaEstructural[];
const OPCIONES_SISTEMA = SISTEMAS.map((s) => NOMBRE_SISTEMA[s]);
const sistemaDesdeNombre = (nombre: string): SistemaEstructural =>
  SISTEMAS.find((s) => NOMBRE_SISTEMA[s] === nombre) ?? "simplemente-apoyada";

const OPCIONES_ESQUEMA = [...COEF_FLECHA.map((c) => c.nombre), "Otro (cargar k a mano)"];

/** Separador de sección, para que no se mezcle el método simplificado con el cálculo. */
function TituloSeccion({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2 first:pt-0">
      <h2 className="spec-label shrink-0">{children}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function DeformacionesPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  // Materiales y geometría, compartidos por los dos métodos.
  const [fck, setFck] = useCampo("fckDef", "30");
  const [fyk, setFyk] = useCampo("fykDef", "500");
  const [esGPa, setEsGPa] = useCampo("esGPaDef", "200");
  const [b, setB] = useCampo("bDef", "0.3");
  const [h, setH] = useCampo("hDef", "0.5");
  const [d, setD] = useCampo("dDef", "0.45");
  const [dComp, setDComp] = useCampo("dCompDef", "0.05");
  const [luz, setLuz] = useCampo("luzDef", "6");

  // Armadura.
  const [asProv, setAsProv] = useCampo("asProvDef", "10");
  const [asComp, setAsComp] = useCampo("asCompDef", "0");
  const [asReq, setAsReq] = useCampo("asReqDef", "10");

  // Luz/canto.
  const [sistemaTxt, setSistemaTxt] = useCampo("sistemaDef", NOMBRE_SISTEMA["simplemente-apoyada"]);
  const [alaEnT, setAlaEnT] = useCampo("alaEnTDef", "No");
  const [tabiques, setTabiques] = useCampo("tabiquesDef", "No");

  // Flecha calculada.
  const [mqp, setMqp] = useCampo("mqpDef", "80");
  const [phi, setPhi] = useCampo("phiDef", "2");
  const [epsilonCs, setEpsilonCs] = useCampo("epsilonCsDef", "0.0003");
  const [esquemaTxt, setEsquemaTxt] = useCampo("esquemaDef", COEF_FLECHA[0].nombre);
  const [coefManual, setCoefManual] = useCampo("coefManualDef", "0.104");

  const sistema = sistemaDesdeNombre(sistemaTxt);
  const esquemaElegido = COEF_FLECHA.find((c) => c.nombre === esquemaTxt);
  const coefFlecha = esquemaElegido ? esquemaElegido.valor : aNumero(coefManual);

  // Los dos desplegables describen la misma pieza desde métodos distintos —uno
  // elige la fila de la tabla A19.7.4, el otro el coeficiente de flecha— y nada
  // impide dejarlos contradiciéndose. Un voladizo calculado con el k de una
  // biapoyada da una flecha menos de la mitad de la real, así que conviene
  // avisarlo en vez de dejarlo pasar en silencio.
  const esquemaEsVoladizo = esquemaElegido?.id.startsWith("voladizo") ?? false;
  const sistemaEsVoladizo = sistema === "voladizo";
  const esquemaIncoherente =
    esquemaElegido !== undefined && sistemaEsVoladizo !== esquemaEsVoladizo;

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk), esGPa: aNumero(esGPa),
      b: aNumero(b), h: aNumero(h), d: aNumero(d), dComp: aNumero(dComp), luz: aNumero(luz),
      asProv: aNumero(asProv), asComp: aNumero(asComp), asReq: aNumero(asReq),
      mqp: aNumero(mqp), phi: aNumero(phi), epsilonCs: aNumero(epsilonCs),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.fck <= 0 || n.fyk <= 0 || n.esGPa <= 0) return null;
    if (n.b <= 0 || n.h <= 0 || n.d <= 0 || n.luz <= 0) return null;
    if (n.d >= n.h) return null;
    if (n.asProv <= 0 || n.mqp <= 0) return null;
    if (!Number.isFinite(coefFlecha) || coefFlecha <= 0) return null;

    const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
    // ρ y ρ' del art. 7.4.2 son geométricas sobre b·d, con la armadura del
    // centro de vano (en voladizo, la del arranque).
    const rho = n.asProv / 1e4 / (n.b * n.d);
    const rhoComp = n.asComp / 1e4 / (n.b * n.d);

    return {
      n,
      rho,
      rhoComp,
      luzCanto: calcularLuzCanto({
        sistema,
        luzEfM: n.luz,
        dM: n.d,
        fckMPa: n.fck,
        fykMPa: n.fyk,
        rho,
        rhoComp,
        asReqCm2: n.asReq,
        asProvCm2: n.asProv,
        alaAnchaEnT: alaEnT === "Sí",
        soportaTabiques: tabiques === "Sí",
      }),
      flecha: calcularFlecha({
        bM: n.b,
        hM: n.h,
        dM: n.d,
        dCompM: n.dComp,
        asCm2: n.asProv,
        asCompCm2: n.asComp,
        fckMPa: n.fck,
        fctmMPa: materiales.fctm,
        esGPa: n.esGPa,
        phiFluencia: n.phi,
        epsilonCs: n.epsilonCs,
        mqpKNm: n.mqp,
        luzM: n.luz,
        coefFlecha,
      }),
    };
  }, [
    fck, fyk, esGPa, b, h, d, dComp, luz, asProv, asComp, asReq,
    mqp, phi, epsilonCs, sistema, alaEnT, tabiques, coefFlecha,
  ]);

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
          El articulado da dos caminos y acá están los dos. La <strong>relación luz/canto</strong>{" "}
          (art. 7.4.2) no calcula ninguna flecha: si se cumple, se puede omitir el cálculo. La{" "}
          <strong>flecha calculada</strong> (art. 7.4.3) da los milímetros, interpolando entre
          sección sin fisurar y fisurada con ζ, con la fluencia metida en el módulo efectivo y la
          curvatura de retracción sumada aparte. El momento que entra es el de la combinación
          cuasipermanente, no el de cálculo.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <TituloSeccion>Datos comunes</TituloSeccion>

          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fckDef" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fykDef" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="esGPaDef" etiqueta="Es" sufijo="GPa" valor={esGPa} onChange={setEsGPa} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sección y luz</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="bDef" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="hDef" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="dDef" etiqueta="d (canto útil)" sufijo="m" valor={d} onChange={setD} />
              <CampoNumerico
                id="dCompDef"
                etiqueta="d' (a la comprimida)"
                sufijo="m"
                valor={dComp}
                onChange={setDComp}
              />
              <CampoNumerico
                id="luzDef"
                etiqueta="Luz efectiva leff"
                sufijo="m"
                valor={luz}
                onChange={setLuz}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Armadura</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico
                id="asProvDef"
                etiqueta="As dispuesta"
                sufijo="cm²"
                valor={asProv}
                onChange={setAsProv}
              />
              <CampoNumerico
                id="asCompDef"
                etiqueta="A's compresión"
                sufijo="cm²"
                valor={asComp}
                onChange={setAsComp}
              />
              <CampoNumerico
                id="asReqDef"
                etiqueta="As necesaria (ELU)"
                sufijo="cm²"
                valor={asReq}
                onChange={setAsReq}
                advertencia="Sólo entra en la corrección 310/σs del método luz/canto"
              />
              <div className="col-span-full">
                <PanelAyuda titulo="Por qué se piden las dos áreas de armadura">
                  <p>
                    La <strong className="text-foreground">dispuesta</strong> es la que hay en la
                    sección: gobierna la inercia fisurada y, con ella, la flecha real.
                  </p>
                  <p>
                    La <strong className="text-foreground">necesaria en ELU</strong> sólo entra en
                    el método simplificado, en la corrección de la ec. (7.17): poner más armadura de
                    la estrictamente necesaria baja la tensión del acero en servicio y permite un
                    l/d mayor. Si se dejan iguales, la corrección vale 500/fyk —neutra con fyk=500—.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <TituloSeccion>Relación luz/canto — art. 7.4.2</TituloSeccion>

          <Card>
            <CardHeader><CardTitle className="text-base">Esquema y correcciones</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <CampoSeleccion
                  id="sistemaDef"
                  etiqueta="Sistema estructural (tabla A19.7.4)"
                  valor={sistemaTxt}
                  opciones={OPCIONES_SISTEMA}
                  onChange={setSistemaTxt}
                />
              </div>
              <CampoSeleccion
                id="alaEnTDef"
                etiqueta="Sección en T con ala/alma > 3"
                valor={alaEnT}
                opciones={["No", "Sí"]}
                onChange={setAlaEnT}
              />
              <CampoSeleccion
                id="tabiquesDef"
                etiqueta="Soporta tabiques frágiles"
                valor={tabiques}
                opciones={["No", "Sí"]}
                onChange={setTabiques}
              />
              <div className="sm:col-span-2">
                <PanelAyuda titulo="Qué corrige cada opción">
                  <p>
                    <strong className="text-foreground">Ala ancha en T.</strong> Con ala/alma &gt; 3
                    el l/d de la ec. (7.16) se multiplica por 0,8.
                  </p>
                  <p>
                    <strong className="text-foreground">Tabiques frágiles.</strong> Activa la
                    corrección por luz grande: ×7/leff en vigas y losas de más de 7 m, y ×8,5/leff
                    en losas planas de más de 8,5 m. Sin tabiques que se puedan dañar, el articulado
                    no la pide.
                  </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <TituloSeccion>Flecha calculada — art. 7.4.3</TituloSeccion>

          <Card>
            <CardHeader><CardTitle className="text-base">Carga, tiempo y esquema</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico
                id="mqpDef"
                etiqueta="M cuasipermanente"
                sufijo="kN·m"
                valor={mqp}
                onChange={setMqp}
              />
              <CampoNumerico
                id="phiDef"
                etiqueta="φ(∞,t0) fluencia"
                valor={phi}
                onChange={setPhi}
                advertencia="Art. 3.1.4. En interior de edificio suele caer entre 1,5 y 2,5"
              />
              <CampoNumerico
                id="epsilonCsDef"
                etiqueta="εcs retracción"
                valor={epsilonCs}
                onChange={setEpsilonCs}
                advertencia="Art. 3.1.4. Del orden de 0,0003 en ambiente normal; 0 la desactiva"
              />
              <div className="col-span-full">
                <CampoSeleccion
                  id="esquemaDef"
                  etiqueta="Esquema de carga (coeficiente k de a = k·L²·(1/r))"
                  valor={esquemaTxt}
                  opciones={OPCIONES_ESQUEMA}
                  onChange={setEsquemaTxt}
                />
              </div>
              {!esquemaElegido && (
                <CampoNumerico
                  id="coefManualDef"
                  etiqueta="k a mano"
                  valor={coefManual}
                  onChange={setCoefManual}
                  advertencia="Para esquemas intermedios, que dependen del empotramiento real"
                />
              )}
              <div className="col-span-full">
                <PanelAyuda titulo="De dónde sale el coeficiente k">
                  <p>
                    La flecha se arma como a = k·L²·(1/r), con la curvatura de la sección crítica.
                    Sólo se listan los esquemas de valor exacto conocido: 5/48 biapoyada uniforme,
                    1/12 biapoyada con puntual centrada, 1/16 biempotrada uniforme, 1/4 y 1/3 en
                    voladizo.
                  </p>
                  <p>
                    Un vano extremo de viga continua queda entre 1/16 y 5/48 según cuánto empotre el
                    apoyo interior, y por eso no se tabula: ahí conviene cargar k a mano con el valor
                    que salga del análisis.
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
                Completá la sección, la armadura y el momento cuasipermanente con valores válidos.
                El canto útil tiene que ser menor que el canto total.
              </CardContent>
            </Card>
          ) : (
            <>
              <TituloSeccion>Relación luz/canto</TituloSeccion>

              <Card>
                <CardHeader><CardTitle className="text-base">Art. 7.4.2</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Relación luz/canto"
                    verifica={resultado.luzCanto.verifica}
                    comparacion={{
                      real: { etiqueta: "l/d", valor: resultado.luzCanto.ldReal },
                      limite: { etiqueta: "l/d adm", valor: resultado.luzCanto.ldAdm },
                      exige: "≤",
                    }}
                  />
                  <DiagramaLuzCanto resultado={resultado.luzCanto} />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "K (tabla A19.7.4)", valor: fmt(resultado.luzCanto.k, 1) },
                      { etiqueta: "ρ (tracción)", valor: `${fmt(resultado.rho * 100, 3)} %` },
                      { etiqueta: "ρ' (compresión)", valor: `${fmt(resultado.rhoComp * 100, 3)} %` },
                      { etiqueta: "ρ0 = 10⁻³·√fck", valor: `${fmt(resultado.luzCanto.rho0 * 100, 3)} %` },
                      {
                        etiqueta: "Expresión aplicada",
                        valor: resultado.luzCanto.usaRamaArmada ? "(7.16.b) · ρ > ρ0" : "(7.16.a) · ρ ≤ ρ0",
                      },
                      { etiqueta: "l/d de la ec. (7.16)", valor: fmt(resultado.luzCanto.ldBase) },
                      { etiqueta: "Corrección 310/σs (7.17)", valor: `×${fmt(resultado.luzCanto.factorTension)}` },
                      { etiqueta: "Corrección ala en T", valor: `×${fmt(resultado.luzCanto.factorAla)}` },
                      { etiqueta: "Corrección luz grande", valor: `×${fmt(resultado.luzCanto.factorLuzLarga)}` },
                      { etiqueta: "l/d admisible", valor: fmt(resultado.luzCanto.ldAdm) },
                      { etiqueta: "l/d real", valor: fmt(resultado.luzCanto.ldReal) },
                    ]}
                  />
                  {resultado.luzCanto.factorTension > 1.5 && (
                    <p className="rounded-md border border-primary/40 p-3 text-xs text-muted-foreground">
                      La corrección 310/σs quedó en {fmt(resultado.luzCanto.factorTension)}, bastante
                      por encima de 1,5. El Anejo 19 no le pone tope, pero varios anejos nacionales
                      la limitan a 1,5: conviene no apoyar el cumplimiento sólo en este factor y
                      contrastar con la flecha calculada de acá abajo.
                    </p>
                  )}
                </CardContent>
              </Card>

              <TituloSeccion>Flecha calculada</TituloSeccion>

              <Card>
                <CardHeader><CardTitle className="text-base">Art. 7.4.3</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Flecha total — apariencia (art. 7.4.1(4))"
                    verifica={resultado.flecha.verificaApariencia}
                    comparacion={{
                      real: { etiqueta: "a total", valor: resultado.flecha.flechaTotalMm },
                      limite: { etiqueta: "L/250", valor: resultado.flecha.limiteAparienciaMm },
                      unidad: "mm",
                      exige: "≤",
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Flecha diferida — daño a lo adyacente (art. 7.4.1(5))"
                    verifica={resultado.flecha.verificaDanio}
                    comparacion={{
                      real: { etiqueta: "a diferida", valor: resultado.flecha.flechaDiferidaMm },
                      limite: { etiqueta: "L/500", valor: resultado.flecha.limiteDanioMm },
                      unidad: "mm",
                      exige: "≤",
                    }}
                  />
                  <DiagramaFlecha
                    resultado={resultado.flecha}
                    luzM={resultado.n.luz}
                    voladizo={sistemaEsVoladizo}
                    mqpKNm={resultado.n.mqp}
                  />
                  {esquemaIncoherente && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-xs text-destructive">
                      El sistema estructural dice{" "}
                      {sistemaEsVoladizo ? "voladizo" : "elemento apoyado"} pero el esquema de carga
                      es de {esquemaEsVoladizo ? "voladizo" : "elemento apoyado"}. El coeficiente k
                      de un voladizo es entre dos y cuatro veces el de una biapoyada: con los dos
                      desplegables cruzados, la flecha de acá arriba no corresponde a la pieza.
                    </p>
                  )}
                  <p className="rounded-md border p-3 text-xs text-muted-foreground">
                    La flecha diferida se toma como total − instantánea, o sea suponiendo que lo que
                    se puede dañar se construye apenas desencofrado, con la flecha instantánea ya
                    producida. Es la hipótesis habitual y del lado de la seguridad: si los tabiques
                    se levantan más tarde, la parte que los afecta es menor.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Estados de la sección</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {resultado.flecha.fisura ? "Sección fisurada" : "Sección sin fisurar"} · ζ ={" "}
                      {fmt(resultado.flecha.zeta, 3)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Mcr = {fmt(resultado.flecha.mcrKNm)} kN·m · M = {fmt(resultado.n.mqp)} kN·m
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Ecm", valor: `${fmt(resultado.flecha.ecmGPa)} GPa` },
                      { etiqueta: "Ec,eff = Ecm/(1+φ) (7.20)", valor: `${fmt(resultado.flecha.ecEffGPa)} GPa` },
                      { etiqueta: "αe = Es/Ec,eff", valor: fmt(resultado.flecha.alphaE) },
                      {
                        etiqueta: "Estado I · x",
                        valor: `${fmt(resultado.flecha.sinFisurar.xM * 1000, 1)} mm`,
                      },
                      {
                        etiqueta: "Estado I · I",
                        valor: `${fmt(resultado.flecha.sinFisurar.iM4 * 1e8, 0)} cm⁴`,
                      },
                      {
                        etiqueta: "Estado II · x",
                        valor: `${fmt(resultado.flecha.fisurada.xM * 1000, 1)} mm`,
                      },
                      {
                        etiqueta: "Estado II · I",
                        valor: `${fmt(resultado.flecha.fisurada.iM4 * 1e8, 0)} cm⁴`,
                      },
                      { etiqueta: "Mcr", valor: `${fmt(resultado.flecha.mcrKNm)} kN·m` },
                      { etiqueta: "ζ = 1 − 0,5·(Mcr/M)² (7.19)", valor: fmt(resultado.flecha.zeta, 4) },
                      {
                        etiqueta: "Curvatura de flexión (7.18)",
                        valor: `${resultado.flecha.curvaturaFlexion.toExponential(3)} 1/m`,
                      },
                      {
                        etiqueta: "Curvatura de retracción (7.21)",
                        valor: `${resultado.flecha.curvaturaRetraccion.toExponential(3)} 1/m`,
                      },
                      {
                        etiqueta: "Curvatura total",
                        valor: `${resultado.flecha.curvaturaTotal.toExponential(3)} 1/m`,
                      },
                      { etiqueta: "k del esquema", valor: fmt(coefFlecha, 4) },
                      {
                        etiqueta: "Flecha instantánea",
                        valor: `${fmt(resultado.flecha.flechaInstantaneaMm)} mm`,
                      },
                      {
                        etiqueta: "Flecha total (a = k·L²·(1/r))",
                        valor: `${fmt(resultado.flecha.flechaTotalMm)} mm`,
                      },
                      {
                        etiqueta: "Flecha diferida",
                        valor: `${fmt(resultado.flecha.flechaDiferidaMm)} mm`,
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
