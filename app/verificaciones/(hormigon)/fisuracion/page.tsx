"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaFisuracion } from "@/components/verificaciones/hormigon/DiagramaFisuracion";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { calcularFisuracion } from "@/lib/calc/hormigon/fisuracion";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  CroquisFamiliaFisuracion,
  CroquisSeccionFisuracion,
} from "@/components/verificaciones/croquis/CroquisVarios";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "fisuracion")!;

/**
 * La separación sigue importando —es la que decide si las zonas de influencia
 * de las barras se solapan, ec. (7.11) contra el tope de la (7.14)—, pero sale
 * del número de barras en vez de cargarse a mano. Se muestra acá para no perder
 * de vista el dato al que uno está acostumbrado a mirar.
 */
function SeparacionEquivalente({
  anchoTxt,
  numeroTxt,
  diametroTxt,
}: {
  anchoTxt: string;
  numeroTxt: string;
  diametroTxt: string;
}) {
  const ancho = aNumero(anchoTxt);
  const numero = aNumero(numeroTxt);
  const diametro = aNumero(diametroTxt);
  if (!Number.isFinite(ancho) || !Number.isFinite(numero) || ancho <= 0 || numero <= 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {fmt(numero, 0)}Ø{fmt(diametro, 0)} en {fmt(ancho, 2)} m · separación equivalente{" "}
      {fmt((ancho / numero) * 1000, 0)} mm
    </p>
  );
}

export default function FisuracionPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [esGPa, setEsGPa] = useCampo("esGPa", "200");
  const [rg, setRg] = useCampo("rg", "0.02");
  const [k2, setK2] = useCampo("k2", "0.5");
  const [wAdm, setWAdm] = useCampo("wAdm", "0.3");

  const [h, setH] = useCampo("h", "0.18");
  const [b, setB] = useCampo("b", "1");
  const [mqp, setMqp] = useCampo("mqp", "22");

  // Cada familia se define por número de barras en el ancho b y diámetro, igual
  // que en las páginas de viga. Antes se pedía la separación y la página la
  // convertía a número (n = b/s), que es lo que el cálculo usa de verdad: pedir
  // las barras saca esa conversión del medio y, sobre todo, hace que lo que se
  // carga acá y lo que llega encadenado desde una viga sean el mismo dato.
  const [numero1, setNumero1] = useCampo("numero1", "7");
  const [phi1, setPhi1] = useCampo("phi1", "8");
  // La segunda familia es opcional y arranca oculta: sin esto quedaba siempre
  // en pantalla un bloque apagado que no se usa casi nunca.
  const [familia2, setFamilia2] = useCampo("familia2", "No");
  const [numero2, setNumero2] = useCampo("numero2", "4");
  const [phi2, setPhi2] = useCampo("phi2", "10");

  const hayFamilia2 = familia2 === "Sí";

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk), esGPa: aNumero(esGPa), rg: aNumero(rg),
      k2: aNumero(k2), wAdm: aNumero(wAdm),
      h: aNumero(h), b: aNumero(b), mqp: aNumero(mqp),
      numero1: aNumero(numero1), phi1: aNumero(phi1),
      numero2: aNumero(numero2), phi2: aNumero(phi2),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.fck <= 0 || n.fyk <= 0 || n.esGPa <= 0 || n.h <= 0 || n.b <= 0) return null;
    if (n.numero1 <= 0 || n.phi1 <= 0 || n.wAdm <= 0) return null;
    if (n.mqp <= 0) return null;

    const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
    const n1 = n.numero1;
    const n2 = hayFamilia2 && n.numero2 > 0 && n.phi2 > 0 ? n.numero2 : 0;

    return {
      n,
      n1,
      n2,
      r: calcularFisuracion(
        materiales,
        { recubrimientoM: n.rg, k2: n.k2, wAdmMm: n.wAdm, esGPa: n.esGPa },
        { hM: n.h, bM: n.b, n1, diametro1Mm: n.phi1, n2, diametro2Mm: n.phi2, mqpKNm: n.mqp }
      ),
    };
  }, [fck, fyk, esGPa, rg, k2, wAdm, h, b, mqp, numero1, phi1, numero2, phi2, hayFamilia2]);

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
          El momento a introducir es el de la combinación cuasipermanente, no el de cálculo:
          la fisuración se verifica en servicio. k2 vale 0,5 para carga mantenida o repetida
          y 1,0 para carga instantánea.
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Materiales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
              <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
              <CampoNumerico id="esGPa" etiqueta="Es" sufijo="GPa" valor={esGPa} onChange={setEsGPa} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Parámetros de fisuración</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CampoNumerico id="rg" etiqueta="Recubrimiento" sufijo="m" valor={rg} onChange={setRg} />
              <CampoNumerico id="k2" etiqueta="k2 (0,5 flexión · 1,0 tracción)" valor={k2} onChange={setK2} />
              <CampoNumerico id="wAdm" etiqueta="w admisible" sufijo="mm" valor={wAdm} onChange={setWAdm} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sección y solicitación</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-full">
                <CroquisSeccionFisuracion />
              </div>
              <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
              <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
              <CampoNumerico id="mqp" etiqueta="M cuasiperm." sufijo="kN·m" valor={mqp} onChange={setMqp} />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Familia 1</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <CroquisFamiliaFisuracion numero={1} />
                </div>
                <CampoDiametro id="phi1" etiqueta="Ø" valor={phi1} onChange={setPhi1} />
                <CampoNumerico
                  id="numero1"
                  etiqueta="Nº de barras"
                  valor={numero1}
                  onChange={setNumero1}
                />
                <div className="col-span-full">
                  <SeparacionEquivalente anchoTxt={b} numeroTxt={numero1} diametroTxt={phi1} />
                </div>
              </CardContent>
            </Card>

            {hayFamilia2 ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Familia 2</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar la segunda familia"
                    onClick={() => setFamilia2("No")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <CroquisFamiliaFisuracion numero={2} />
                  </div>
                  <CampoDiametro id="phi2" etiqueta="Ø" valor={phi2} onChange={setPhi2} />
                  <CampoNumerico
                    id="numero2"
                    etiqueta="Nº de barras"
                    valor={numero2}
                    onChange={setNumero2}
                  />
                  <div className="col-span-full">
                    <SeparacionEquivalente anchoTxt={b} numeroTxt={numero2} diametroTxt={phi2} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex h-full flex-col items-start justify-center gap-2 py-6">
                  <p className="text-sm text-muted-foreground">
                    Una segunda familia de otro diámetro, si la sección la tiene.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Si quedó un diámetro inservible de una sesión anterior,
                      // se repone: agregar la familia y que aparezca en "Ø0" no
                      // le sirve a nadie.
                      if (!(aNumero(phi2) > 0)) setPhi2("10");
                      if (!(aNumero(numero2) > 0)) setNumero2("4");
                      setFamilia2("Sí");
                    }}
                  >
                    <Plus className="h-4 w-4" /> Agregar segunda familia
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos. La familia 1 y el momento cuasipermanente son obligatorios.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Abertura de fisura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Abertura característica admisible"
                    verifica={resultado.r.verifica}
                    detalle={`wk ${fmt(resultado.r.wkMm, 3)} mm / w adm ${fmt(resultado.n.wAdm, 2)} mm`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">wk = s r,max · (εsm − εcm)</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {fmt(resultado.r.srMaxMm, 1)} mm × {resultado.r.epsilonSmMenosCm.toExponential(3)}
                    </p>
                  </div>
                  <DiagramaFisuracion
                    resultado={resultado.r}
                    bM={resultado.n.b}
                    hM={resultado.n.h}
                    n1={Math.round(resultado.n1)}
                    diametro1Mm={resultado.n.phi1}
                    wAdmMm={resultado.n.wAdm}
                  />
                  {resultado.r.usaTopeSeparacionAmplia && (
                    <p className="rounded-md border border-primary/40 p-3 text-xs text-muted-foreground">
                      Las barras están a {fmt(resultado.r.sMm, 0)} mm, por encima del límite
                      5·(c + Ø/2) = {fmt(5 * (resultado.n.rg * 1000 + resultado.r.diametroEqMm / 2), 0)} mm.
                      A partir de ahí la fisura ya no la gobierna la adherencia de las barras sino el
                      canto traccionado, y el articulado pasa al tope de la ec. (7.14),
                      s r,max = 1,3·(h − x). Las dos expresiones no empalman: al cruzar el límite el
                      resultado da un salto. Juntar las barras baja la abertura bastante más de lo que
                      sugiere el cambio de separación.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "d", valor: `${fmt(resultado.r.dM, 3)} m` },
                      { etiqueta: "Fibra neutra x", valor: `${fmt(resultado.r.xM * 1000, 1)} mm` },
                      { etiqueta: "Diámetro equivalente Øeq", valor: `${fmt(resultado.r.diametroEqMm, 1)} mm` },
                      { etiqueta: "Separación entre barras s", valor: `${fmt(resultado.r.sMm, 1)} mm` },
                      // Son las barras que hay en el ancho b, no por metro: con
                      // b=1 coinciden, pero en una viga de 0,30 no.
                      { etiqueta: "Barras familia 1 (en b)", valor: fmt(resultado.n1, 0) },
                      { etiqueta: "Barras familia 2 (en b)", valor: fmt(resultado.n2, 0) },
                      { etiqueta: "As total", valor: `${fmt(resultado.r.asM2 * 10000, 2)} cm²` },
                      { etiqueta: "Canto eficaz hc,ef", valor: `${fmt(resultado.r.hcEfM * 1000, 1)} mm` },
                      { etiqueta: "Ac eficaz", valor: `${fmt(resultado.r.acEficazM2 * 10000, 1)} cm²` },
                      { etiqueta: "Cuantía eficaz ρp,ef", valor: fmt(resultado.r.rhoPEf * 100, 3) + " %" },
                      { etiqueta: "Separación máxima de fisuras s r,max", valor: `${fmt(resultado.r.srMaxMm, 1)} mm` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tensiones en la armadura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-mono text-xs text-muted-foreground">
                      σs = {fmt(resultado.r.sigmaSMPa, 1)} MPa · αe = Es/Ecm = {fmt(resultado.r.alphaE, 2)}
                    </p>
                  </div>
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Brazo mecánico z = d − x/3", valor: `${fmt(resultado.r.dM - resultado.r.xM / 3, 3)} m` },
                      { etiqueta: "kt (carga cuasipermanente)", valor: "0,40" },
                      { etiqueta: "εsm − εcm", valor: resultado.r.epsilonSmMenosCm.toExponential(4) },
                      {
                        etiqueta: "Piso 0,6·σs/Es",
                        valor: ((0.6 * resultado.r.sigmaSMPa) / (resultado.n.esGPa * 1000)).toExponential(4),
                      },
                    ]}
                  />
                  {Math.abs(
                    resultado.r.epsilonSmMenosCm - (0.6 * resultado.r.sigmaSMPa) / (resultado.n.esGPa * 1000)
                  ) < 1e-12 && (
                    <p className="text-xs text-muted-foreground">
                      Manda el piso de 0,6·σs/Es: la colaboración del hormigón entre fisuras se comería
                      más deformación de la que el articulado permite descontar.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
