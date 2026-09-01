"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { useSeccionAcero } from "@/lib/hooks/useSeccionAcero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { SelectorSeccionAcero } from "@/components/verificaciones/acero/SelectorSeccionAcero";
import {
  calcularTraccion,
  factorUCaso2,
  OMEGA_T_FLUENCIA,
  OMEGA_T_ROTURA,
  type AgujeroTraccion,
  type PasoZigzag,
} from "@/lib/calc/acero/traccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "traccion-acero")!;

const SECCION_CRITICA = ["Sin agujeros", "Con agujeros"] as const;
const CADENA = ["Recta", "En zigzag"] as const;
const TRANSMISION = [
  "Toda la sección (U = 1)",
  "Parcial — Caso 2: U = 1 − x̄/L",
  "U conocido, de otro caso de la tabla D3.1",
] as const;

export default function TraccionAceroPage() {
  const [norma, setNorma] = useCampo("norma", "AISC 360");
  const seccion = useSeccionAcero("PNI");

  const [lM, setLM] = useCampo("lM", "3");
  const [fy, setFy] = useCampo("fy", "250");
  const [fu, setFu] = useCampo("fu", "400");
  const [pRequerida, setPRequerida] = useCampo("pRequerida", "150");

  const [seccionCritica, setSeccionCritica] = useCampo("seccionCritica", SECCION_CRITICA[0]);
  const [nAgujeros, setNAgujeros] = useCampo("nAgujeros", "2");
  const [diametroAgujero, setDiametroAgujero] = useCampo("diametroAgujero", "16");
  const [espesorAgujero, setEspesorAgujero] = useCampo("espesorAgujero", "10");
  const [cadena, setCadena] = useCampo("cadena", CADENA[0]);
  const [zigzagS, setZigzagS] = useCampo("zigzagS", "35");
  const [zigzagG, setZigzagG] = useCampo("zigzagG", "44");

  const [transmision, setTransmision] = useCampo("transmision", TRANSMISION[0]);
  const [xBarra, setXBarra] = useCampo("xBarra", "35");
  const [largoConexion, setLargoConexion] = useCampo("largoConexion", "175");
  const [uManual, setUManual] = useCampo("uManual", "0.85");

  const resultado = useMemo(() => {
    const n = { l: aNumero(lM), fy: aNumero(fy), fu: aNumero(fu), p: aNumero(pRequerida) };
    if (!seccion.completos) return null;
    if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

    const hayAgujeros = seccionCritica === SECCION_CRITICA[1];
    let agujeros: AgujeroTraccion[] | undefined;
    let zigzag: PasoZigzag[] | undefined;

    if (hayAgujeros) {
      const cantidad = aNumero(nAgujeros);
      const diametro = aNumero(diametroAgujero);
      const espesor = aNumero(espesorAgujero);
      if (![cantidad, diametro, espesor].every((x) => Number.isFinite(x) && x > 0)) return null;
      agujeros = Array.from({ length: Math.round(cantidad) }, () => ({
        diametroMm: diametro,
        espesorMm: espesor,
      }));

      if (cadena === CADENA[1]) {
        const s = aNumero(zigzagS);
        const g = aNumero(zigzagG);
        if (![s, g].every((x) => Number.isFinite(x) && x > 0)) return null;
        zigzag = [{ sMm: s, gMm: g, espesorMm: espesor }];
      }
    }

    let u: number | undefined;
    if (transmision === TRANSMISION[1]) {
      const x = aNumero(xBarra);
      const largo = aNumero(largoConexion);
      if (![x, largo].every((v) => Number.isFinite(v) && v >= 0) || largo <= 0) return null;
      u = factorUCaso2(x, largo);
    } else if (transmision === TRANSMISION[2]) {
      const uv = aNumero(uManual);
      if (!Number.isFinite(uv) || uv <= 0 || uv > 1) return null;
      u = uv;
    }

    try {
      return calcularTraccion({
        familia: seccion.familia,
        params: seccion.params,
        lM: n.l,
        fyPa: n.fy * 1e6,
        fuPa: n.fu * 1e6,
        agujeros,
        zigzag,
        u,
        pRequeridaKN: n.p,
      });
    } catch {
      return null;
    }
  }, [
    seccion.familia, seccion.params, seccion.completos, lM, fy, fu, pRequerida,
    seccionCritica, nAgujeros, diametroAgujero, espesorAgujero, cadena, zigzagS, zigzagG,
    transmision, xBarra, largoConexion, uManual,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Barras · Estructuras metálicas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <Card className="border-primary/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Artículo D2, por el método ASD: fluencia (Ωt = {fmt(OMEGA_T_FLUENCIA, 2)}) sobre la sección
          bruta y rotura (Ωt = {fmt(OMEGA_T_ROTURA, 2)}) sobre la sección efectiva, descontados los
          agujeros y corregida por shear lag. Con A36 hace falta perder cerca de un cuarto de la
          sección antes de que la rotura llegue a gobernar sobre la fluencia; con aceros de mayor
          límite elástico, mucho menos.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <SelectorSeccionAcero
            familia={seccion.familia}
            paramsTexto={seccion.paramsTexto}
            params={seccion.params}
            onFamiliaChange={seccion.cambiarFamilia}
            onParamChange={seccion.cambiarParam}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Longitud y material</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="lM" etiqueta="Longitud de la barra" sufijo="m" valor={lM} onChange={setLM} />
              <CampoNumerico id="fy" etiqueta="Fy" sufijo="MPa" valor={fy} onChange={setFy} />
              <CampoNumerico id="fu" etiqueta="Fu" sufijo="MPa" valor={fu} onChange={setFu} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sección crítica — art. B4</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion
                id="seccionCritica"
                etiqueta="¿La sección crítica tiene agujeros?"
                valor={seccionCritica}
                opciones={SECCION_CRITICA}
                onChange={setSeccionCritica}
              />
              {seccionCritica === SECCION_CRITICA[1] && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <CampoNumerico id="nAgujeros" etiqueta="Agujeros en la cadena" valor={nAgujeros} onChange={setNAgujeros} />
                    <CampoNumerico id="diametroAgujero" etiqueta="Diámetro nominal" sufijo="mm" valor={diametroAgujero} onChange={setDiametroAgujero} />
                    <CampoNumerico id="espesorAgujero" etiqueta="Espesor perforado" sufijo="mm" valor={espesorAgujero} onChange={setEspesorAgujero} />
                  </div>
                  <CampoSeleccion id="cadena" etiqueta="Traza de la cadena" valor={cadena} opciones={CADENA} onChange={setCadena} />
                  {cadena === CADENA[1] && (
                    <div className="grid grid-cols-2 gap-4">
                      <CampoNumerico id="zigzagS" etiqueta="Paso longitudinal s" sufijo="mm" valor={zigzagS} onChange={setZigzagS} />
                      <CampoNumerico id="zigzagG" etiqueta="Paso transversal g" sufijo="mm" valor={zigzagG} onChange={setZigzagG} />
                    </div>
                  )}
                </>
              )}
              <PanelAyuda titulo="Por qué el área neta puede ser mayor cortando en diagonal">
                <p>
                  Cada agujero descuenta (φnom + 2 mm)·t: el diámetro nominal más 2 mm de holgura
                  de perforación, ec. (B4-3b). El espesor es el del elemento perforado, no
                  necesariamente el de catálogo de toda la sección —puede ser sólo un ala o una
                  chapa soldada aparte—, por eso se carga aparte.
                </p>
                <p>
                  Cuando la cadena de agujeros no es recta, cortar en diagonal alarga el camino de
                  rotura y por eso la norma <em>devuelve</em> área: suma t·s²/(4g) por cada escalón,
                  con s el paso a lo largo de la barra y g el paso entre las filas de agujeros que
                  conecta. Es contraintuitivo —parece que zigzaguear debería perder más sección, y
                  hace lo contrario— pero es la fibra la que sigue el camino más corto, no la línea
                  recta.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shear lag — art. D3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CampoSeleccion
                id="transmision"
                etiqueta="¿Toda la sección transmite la fuerza?"
                valor={transmision}
                opciones={TRANSMISION}
                onChange={setTransmision}
              />
              {transmision === TRANSMISION[1] && (
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="xBarra" etiqueta="Excentricidad x̄" sufijo="mm" valor={xBarra} onChange={setXBarra} />
                  <CampoNumerico id="largoConexion" etiqueta="Largo de la conexión L" sufijo="mm" valor={largoConexion} onChange={setLargoConexion} />
                </div>
              )}
              {transmision === TRANSMISION[2] && (
                <CampoNumerico id="uManual" etiqueta="U" valor={uManual} onChange={setUManual} />
              )}
              <PanelAyuda titulo="Qué es shear lag y por qué no siempre gobierna">
                <p>
                  Cuando la fuerza entra por menos que toda la sección —un ángulo tomado de una sola
                  ala, un perfil conectado sólo por el alma o sólo por las alas—, el tramo cercano a
                  la conexión no llega a repartir la tensión entre todos los elementos: hace falta
                  un corte para transmitirla, y ese corte tiene su propio límite. El área efectiva
                  Ae = U·An, ec. (D3-1), lo recoge bajando el área que se usa contra Fu.
                </p>
                <p>
                  Este formulario resuelve el Caso 2 de la tabla D3.1 —el general, U = 1 − x̄/L—, que
                  es el que cubre la enorme mayoría de las conexiones reales. La tabla completa tiene
                  casos más específicos para geometrías particulares (HSS redondos con chapa pasante
                  entre ellos, por ejemplo) que no están cubiertos acá: si se conoce el U de un caso
                  así, se carga directo con la tercera opción.
                </p>
                <p>
                  Cuanto más corta la conexión o mayor la excentricidad x̄, más castiga U. Con la
                  sección soldada en todo su perímetro o abulonada por todos sus elementos, U = 1 y
                  no hay nada que corregir.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solicitación</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="pRequerida" etiqueta="Tracción requerida" sufijo="kN" valor={pRequerida} onChange={setPRequerida} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá la sección, la longitud, el material y la carga con valores positivos.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resultado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta={`${resultado.designacion} — tracción admisible`}
                    verifica={resultado.verifica === true}
                    detalle={`${fmt(aNumero(pRequerida), 1)} kN / ${fmt(resultado.admisibleKN, 1)} kN · aprovechamiento ${fmt(
                      (resultado.aprovechamiento ?? 0) * 100,
                      1
                    )} %`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      Gobierna {resultado.gobierna}: {fmt(resultado.admisibleKN, 1)} kN
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Ag = {fmt(resultado.areaBrutaM2 * 1e4, 2)} cm² · An = {fmt(resultado.areaNetaM2 * 1e4, 2)} cm² · Ae
                      = {fmt(resultado.areaEfectivaM2 * 1e4, 2)} cm²
                    </p>
                  </div>
                  {resultado.superaEsbeltezRecomendada && (
                    <p className="text-xs text-muted-foreground">
                      La esbeltez L/rmin = {fmt(resultado.esbeltez, 1)} pasa de 300. La nota de
                      usuario del artículo D1 sugiere no superarla, para no tener deformaciones,
                      flexibilidad lateral o vibraciones excesivas en servicio — no es un requisito
                      duro y no bloquea la verificación de arriba.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Fluencia (D2a) · {fmt(resultado.admisibleFluenciaKN, 1)} kN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Ag", valor: `${fmt(resultado.areaBrutaM2 * 1e4, 2)} cm²` },
                      { etiqueta: "Pn = Fy·Ag  (D2-1)", valor: `${fmt(resultado.pnFluenciaKN, 1)} kN` },
                      { etiqueta: `Pn/Ωt con Ωt = ${OMEGA_T_FLUENCIA}`, valor: `${fmt(resultado.admisibleFluenciaKN, 1)} kN` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Rotura (D2b) · {fmt(resultado.admisibleRoturaKN, 1)} kN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "An  (B4-3b)", valor: `${fmt(resultado.areaNetaM2 * 1e4, 2)} cm²` },
                      { etiqueta: "U", valor: fmt(resultado.u, 3) },
                      { etiqueta: "Ae = U·An  (D3-1)", valor: `${fmt(resultado.areaEfectivaM2 * 1e4, 2)} cm²` },
                      { etiqueta: "Pn = Fu·Ae  (D2-2)", valor: `${fmt(resultado.pnRoturaKN, 1)} kN` },
                      { etiqueta: `Pn/Ωt con Ωt = ${OMEGA_T_ROTURA}`, valor: `${fmt(resultado.admisibleRoturaKN, 1)} kN` },
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
