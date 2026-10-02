"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Button } from "@/components/ui/button";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
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

const ETAPAS = [
  { id: "materiales", titulo: "Materiales" },
  { id: "seccion", titulo: "Sección" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos. La familia 1 y el momento cuasipermanente son obligatorios." });
  } else if (resultado.r.usaTopeSeparacionAmplia) {
    avisos.push({ tipo: "aviso", texto: "La separación supera 5·(c + Ø/2): s r,max sale del tope 1,3·(h − x), ec. (7.14), y no de la adherencia de las barras." });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Estado límite de servicio</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="materiales" numero={1} titulo="Materiales y criterio" descripcion="Hormigón, acero y la abertura que se admite.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
            <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
            <CampoNumerico id="esGPa" etiqueta="Es" sufijo="GPa" valor={esGPa} onChange={setEsGPa} />
            <CampoNumerico id="k2" etiqueta="k2 (0,5 flexión · 1,0 tracción)" valor={k2} onChange={setK2} />
            <CampoNumerico id="wAdm" etiqueta="w admisible" sufijo="mm" valor={wAdm} onChange={setWAdm} />
          </div>
        </Etapa>

        <Etapa id="seccion" numero={2} titulo="Sección y solicitación" descripcion="El momento es el de la combinación cuasipermanente, no el de cálculo: la fisuración se verifica en servicio.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="h" etiqueta="h" sufijo="m" valor={h} onChange={setH} />
                <CampoNumerico id="b" etiqueta="b" sufijo="m" valor={b} onChange={setB} />
                <CampoNumerico id="rg" etiqueta="Recubrimiento" sufijo="m" valor={rg} onChange={setRg} />
                <CampoNumerico id="mqp" etiqueta="M cuasiperm." sufijo="kN·m" valor={mqp} onChange={setMqp} />
              </div>
            }
            dibujo={<CroquisSeccionFisuracion />}
          />
        </Etapa>

        <Etapa id="armadura" numero={3} titulo="Armadura traccionada" descripcion="Barras en el ancho b; la segunda familia es opcional.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Subgrupo titulo="Familia 1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <CroquisFamiliaFisuracion numero={1} />
                </div>
                <CampoDiametro id="phi1" etiqueta="Ø" valor={phi1} onChange={setPhi1} />
                <CampoNumerico id="numero1" etiqueta="Nº de barras" valor={numero1} onChange={setNumero1} />
                <div className="col-span-full">
                  <SeparacionEquivalente anchoTxt={b} numeroTxt={numero1} diametroTxt={phi1} />
                </div>
              </div>
            </Subgrupo>

            {hayFamilia2 ? (
              <Subgrupo titulo="Familia 2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-full flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFamilia2("No")}>
                      <X className="h-4 w-4" /> Quitar
                    </Button>
                  </div>
                  <div className="col-span-full">
                    <CroquisFamiliaFisuracion numero={2} />
                  </div>
                  <CampoDiametro id="phi2" etiqueta="Ø" valor={phi2} onChange={setPhi2} />
                  <CampoNumerico id="numero2" etiqueta="Nº de barras" valor={numero2} onChange={setNumero2} />
                  <div className="col-span-full">
                    <SeparacionEquivalente anchoTxt={b} numeroTxt={numero2} diametroTxt={phi2} />
                  </div>
                </div>
              </Subgrupo>
            ) : (
              <div className="flex flex-col items-start justify-center gap-2 py-6">
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
              </div>
            )}
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "fck / fyk / Es", valor: `${fck} / ${fyk} MPa / ${esGPa} GPa` },
              { etiqueta: "Sección b × h", valor: `${b} × ${h} m, recubrimiento ${rg} m` },
              { etiqueta: "M cuasipermanente", valor: `${mqp} kN·m` },
              { etiqueta: "Armadura", valor: `${numero1}Ø${phi1}${hayFamilia2 ? ` + ${numero2}Ø${phi2}` : ""}` },
              { etiqueta: "k2 · w adm", valor: `${k2} · ${wAdm} mm` },
              ...(resultado ? [{ etiqueta: "As total", valor: `${fmt(resultado.r.asM2 * 10000, 2)} cm²`, derivado: true }] : []),
            ]}
            hipotesis={[
              "Anejo 19, art. 7.3.4: wk = s r,max · (εsm − εcm).",
              "Combinación cuasipermanente; kt = 0,4 (carga de larga duración).",
              "k2 = 0,5 para flexión y 1,0 para tracción pura.",
              "εsm − εcm no baja de 0,6·σs/Es.",
              "Con separación mayor que 5·(c + Ø/2), s r,max = 1,3·(h − x), ec. (7.14).",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!resultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionAutomatica />

              <PanelMetricas
                horizontal
                metricas={[
                  { etiqueta: "wk", valor: `${fmt(resultado.r.wkMm, 3)} mm`, nota: `admisible ${fmt(resultado.n.wAdm, 2)} mm` },
                  { etiqueta: "σs", valor: `${fmt(resultado.r.sigmaSMPa, 1)} MPa` },
                  { etiqueta: "s r,max", valor: `${fmt(resultado.r.srMaxMm, 1)} mm` },
                  { etiqueta: "Fibra neutra x", valor: `${fmt(resultado.r.xM * 1000, 1)} mm` },
                ]}
              />

              <Subgrupo titulo="Abertura de fisura">
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Abertura característica admisible"
                    verifica={resultado.r.verifica}
                    comparacion={{
                      real: { etiqueta: "wk", valor: resultado.r.wkMm },
                      limite: { etiqueta: "w adm", valor: resultado.n.wAdm },
                      unidad: "mm", exige: "≤", decimales: 3,
                    }}
                  />
                  <DiagramaFisuracion
                    resultado={resultado.r}
                    bM={resultado.n.b}
                    hM={resultado.n.h}
                    n1={Math.round(resultado.n1)}
                    diametro1Mm={resultado.n.phi1}
                    wAdmMm={resultado.n.wAdm}
                  />
                  {resultado.r.usaTopeSeparacionAmplia && (
                    <p className="text-xs text-muted-foreground">
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
                    titulo="Ver desarrollo de la abertura de fisura"
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
                      { etiqueta: "wk", formula: "s r,max · (εsm − εcm)", sustitucion: `${fmt(resultado.r.srMaxMm, 1)} × ${resultado.r.epsilonSmMenosCm.toExponential(3)}`, valor: `${fmt(resultado.r.wkMm, 3)} mm` },
                    ]}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Tensiones en la armadura" detalle={`αe = Es/Ecm = ${fmt(resultado.r.alphaE, 2)}`}>
                <div className="space-y-3">
                  {Math.abs(
                    resultado.r.epsilonSmMenosCm - (0.6 * resultado.r.sigmaSMPa) / (resultado.n.esGPa * 1000)
                  ) < 1e-12 && (
                    <p className="text-xs text-muted-foreground">
                      Manda el piso de 0,6·σs/Es: la colaboración del hormigón entre fisuras se comería
                      más deformación de la que el articulado permite descontar.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver desarrollo de las tensiones"
                    filas={[
                      { etiqueta: "Brazo mecánico z = d − x/3", valor: `${fmt(resultado.r.dM - resultado.r.xM / 3, 3)} m` },
                      { etiqueta: "σs", valor: `${fmt(resultado.r.sigmaSMPa, 1)} MPa` },
                      { etiqueta: "kt (carga cuasipermanente)", valor: "0,40" },
                      { etiqueta: "εsm − εcm", valor: resultado.r.epsilonSmMenosCm.toExponential(4) },
                      {
                        etiqueta: "Piso 0,6·σs/Es",
                        valor: ((0.6 * resultado.r.sigmaSMPa) / (resultado.n.esGPa * 1000)).toExponential(4),
                      },
                    ]}
                  />
                </div>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
