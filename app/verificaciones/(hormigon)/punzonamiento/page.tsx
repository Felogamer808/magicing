"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { DatosConDibujo, Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { PanelMetricas } from "@/components/verificaciones/comun/PanelMetricas";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import {
  CroquisArmaduraPunzonamiento,
  CroquisPosicionPilar,
  CroquisSeccionPunzonamiento,
} from "@/components/verificaciones/croquis/CroquisPunzonamiento";
import { PlantaPunzonamiento } from "@/components/verificaciones/hormigon/PlantaPunzonamiento";
import {
  BETA_RECOMENDADO,
  calcularPunzonamiento,
  K_MAX_ARMADURA,
  type PosicionPilar,
} from "@/lib/calc/hormigon/losas/punzonamiento";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "punzonamiento")!;

const POSICIONES = ["Interior", "De borde", "De esquina"] as const;

const ETAPAS = [
  { id: "geometria", titulo: "Pilar y losa" },
  { id: "negativos", titulo: "Negativos" },
  { id: "esfuerzo", titulo: "Esfuerzo" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const ID_POSICION: Record<(typeof POSICIONES)[number], PosicionPilar> = {
  Interior: "interior",
  "De borde": "borde",
  "De esquina": "esquina",
};

export default function PunzonamientoPage() {
  const [norma, setNorma] = useCampo("norma", "EC2");

  const [posicionTexto, setPosicionTexto] = useCampo<(typeof POSICIONES)[number]>("posicion", "Interior");
  const posicion = ID_POSICION[posicionTexto];

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [espesor, setEspesor] = useCampo("espesor", "0.20");
  const [recubrimiento, setRecubrimiento] = useCampo("recubrimiento", "0.025");

  const [c1, setC1] = useCampo("c1", "0.30");
  const [c2, setC2] = useCampo("c2", "0.30");
  const [distBordeC1, setDistBordeC1] = useCampo("distBordeC1", "0");
  const [distBordeC2, setDistBordeC2] = useCampo("distBordeC2", "0");

  const [phiNegY, setPhiNegY] = useCampo("phiNegY", "12");
  const [sNegY, setSNegY] = useCampo("sNegY", "0.15");
  const [phiNegZ, setPhiNegZ] = useCampo("phiNegZ", "12");
  const [sNegZ, setSNegZ] = useCampo("sNegZ", "0.15");

  const [vEd, setVEd] = useCampo("vEd", "256");
  const [betaModo, setBetaModo] = useCampo<"Recomendado" | "A mano">("betaModo", "Recomendado");
  const [betaTexto, setBetaTexto] = useCampo("beta", "1.15");

  const [phiCerco, setPhiCerco] = useCampo("phiCerco", "8");
  const [ramas, setRamas] = useCampo("ramas", "12");
  const [sr, setSr] = useCampo("sr", "0.12");
  const [st, setSt] = useCampo("st", "0.20");
  const [nPerimetros, setNPerimetros] = useCampo("nPerimetros", "3");
  const [distPrimer, setDistPrimer] = useCampo("distPrimer", "0.08");

  const resultado = useMemo(() => {
    const n = {
      fck: aNumero(fck), fyk: aNumero(fyk),
      espesor: aNumero(espesor), recubrimiento: aNumero(recubrimiento),
      c1: aNumero(c1), c2: aNumero(c2),
      distBordeC1: aNumero(distBordeC1), distBordeC2: aNumero(distBordeC2),
      phiNegY: aNumero(phiNegY), sNegY: aNumero(sNegY),
      phiNegZ: aNumero(phiNegZ), sNegZ: aNumero(sNegZ),
      vEd: aNumero(vEd), beta: aNumero(betaTexto),
      phiCerco: aNumero(phiCerco), ramas: aNumero(ramas),
      sr: aNumero(sr), st: aNumero(st),
      nPerimetros: aNumero(nPerimetros), distPrimer: aNumero(distPrimer),
    };

    const positivos = [n.fck, n.fyk, n.espesor, n.c1, n.c2, n.phiNegY, n.sNegY, n.phiNegZ, n.sNegZ,
                       n.phiCerco, n.ramas, n.sr, n.st];
    if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
    const noNegativos = [n.recubrimiento, n.distBordeC1, n.distBordeC2, n.vEd, n.nPerimetros, n.distPrimer];
    if (!noNegativos.every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (betaModo === "A mano" && (!Number.isFinite(n.beta) || n.beta < 1)) return null;

    /*
     * Los dos cantos útiles salen del mismo dato en vez de pedirse por separado:
     * las dos capas de negativos no pueden estar a la misma altura, y la de
     * adentro pierde un diámetro entero. Ésa es justamente la razón por la que
     * la ec. (6.32) promedia dy y dz en vez de usar un solo canto.
     */
    const dY = n.espesor - n.recubrimiento - n.phiNegY / 1000 / 2;
    const dZ = n.espesor - n.recubrimiento - n.phiNegY / 1000 - n.phiNegZ / 1000 / 2;
    if (dY <= 0 || dZ <= 0) return null;

    const r = calcularPunzonamiento(
      { fckMPa: n.fck, fykMPa: n.fyk },
      {
        posicion,
        dYM: dY,
        dZM: dZ,
        c1M: n.c1,
        c2M: n.c2,
        distBordeC1M: n.distBordeC1,
        distBordeC2M: n.distBordeC2,
      },
      {
        diametroYMm: n.phiNegY, separacionYM: n.sNegY,
        diametroZMm: n.phiNegZ, separacionZM: n.sNegZ,
      },
      { vEdKN: n.vEd, betaManual: betaModo === "A mano" ? n.beta : null },
      {
        diametroMm: n.phiCerco,
        ramasPorPerimetro: n.ramas,
        srM: n.sr,
        stM: n.st,
        numeroPerimetros: n.nPerimetros,
        distPrimerPerimetroM: n.distPrimer,
        alphaGrados: 90,
      }
    );

    return { r, n, dY, dZ };
  }, [fck, fyk, espesor, recubrimiento, c1, c2, distBordeC1, distBordeC2, phiNegY, sNegY,
      phiNegZ, sNegZ, vEd, betaModo, betaTexto, phiCerco, ramas, sr, st, nPerimetros,
      distPrimer, posicion]);

  const hayBorde = posicion !== "interior";

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: no se puede calcular (el canto útil tiene que salir positivo)." });
  } else {
    if (resultado.r.perimetroCierraComoInterior)
      avisos.push({
        tipo: "aviso",
        texto: `Con esa distancia al borde el perímetro cierra entero, como un pilar interior (pasados 2d = ${fmt(2 * resultado.r.dM * 100, 0)} cm). β y u0 siguen siendo los de la posición elegida.`,
      });
    if (resultado.r.critico.gobiernaVMin)
      avisos.push({ tipo: "aviso", texto: "Gobierna el mínimo vmin, no la cuantía: agregar negativos no mueve vRd,c hasta salir de esa zona." });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Losas · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Pilar, losa y materiales" descripcion="Dónde apoya el pilar y la losa que lo rodea.">
          <DatosConDibujo
            datos={
              <>
                <Subgrupo titulo="Pilar">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-full">
                      <CampoSeleccion
                        id="posicion"
                        etiqueta="Dónde apoya"
                        valor={posicionTexto}
                        opciones={POSICIONES}
                        onChange={(v) => setPosicionTexto(v as (typeof POSICIONES)[number])}
                      />
                    </div>
                    <CampoNumerico id="c1" etiqueta={hayBorde ? "c1 — lado ⊥ al borde" : "c1"} sufijo="m" valor={c1} onChange={setC1} />
                    <CampoNumerico id="c2" etiqueta={hayBorde ? "c2 — lado ∥ al borde" : "c2"} sufijo="m" valor={c2} onChange={setC2} />
                    {hayBorde && (
                      <CampoNumerico
                        id="distBordeC1"
                        etiqueta="Distancia al borde"
                        sufijo="m"
                        valor={distBordeC1}
                        onChange={setDistBordeC1}
                        advertencia="0 = el pilar llega a ras del borde."
                      />
                    )}
                    {posicion === "esquina" && (
                      <CampoNumerico id="distBordeC2" etiqueta="Distancia al 2.º borde" sufijo="m" valor={distBordeC2} onChange={setDistBordeC2} />
                    )}
                  </div>
                  <PanelAyuda titulo="Por qué importa dónde está el pilar">
                    <p>
                      El perímetro crítico rodea al pilar a 2d, pero contra un borde libre se corta: la
                      parte que caería fuera de la losa no existe y el borde no computa (art. 6.4.2(4)).
                      Un pilar de esquina puede quedarse con menos de la mitad de perímetro que el mismo
                      pilar en el interior.
                    </p>
                  </PanelAyuda>
                </Subgrupo>
                <Subgrupo titulo="Losa y materiales">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumerico id="espesor" etiqueta="Espesor h" sufijo="m" valor={espesor} onChange={setEspesor} />
                    <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                    <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                    <CampoNumerico id="fyk" etiqueta="fyk armadura" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  </div>
                </Subgrupo>
              </>
            }
            dibujo={
              <div className="w-full space-y-4">
                <CroquisPosicionPilar posicion={posicion} />
                <CroquisSeccionPunzonamiento />
              </div>
            }
          />
        </Etapa>

        <Etapa id="negativos" numero={2} titulo="Armadura de negativos" descripcion="La de arriba sobre el pilar: cose la fisura y entra en ρl.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CampoDiametro id="phiNegY" etiqueta="Ø dirección y" valor={phiNegY} onChange={setPhiNegY} />
              <CampoNumerico id="sNegY" etiqueta="s dirección y" sufijo="m" valor={sNegY} onChange={setSNegY} />
              <CampoDiametro id="phiNegZ" etiqueta="Ø dirección z" valor={phiNegZ} onChange={setPhiNegZ} />
              <CampoNumerico id="sNegZ" etiqueta="s dirección z" sufijo="m" valor={sNegZ} onChange={setSNegZ} />
            </div>
            <PanelAyuda titulo="Qué armadura va acá">
              <p>
                No es la malla general del paño sino la que está sobre el pilar, en un ancho de
                c + 3d a cada lado (art. 6.4.4(1)). Entra con raíz cúbica: duplicarla no duplica
                nada, y con cuantía pobre gobierna el mínimo vmin.
              </p>
            </PanelAyuda>
          </div>
        </Etapa>

        <Etapa id="esfuerzo" numero={3} titulo="Esfuerzo" descripcion="Reacción de cálculo del pilar y coeficiente β de excentricidad.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="vEd" etiqueta="VEd" sufijo="kN" valor={vEd} onChange={setVEd} />
              <CampoSeleccion
                id="betaModo"
                etiqueta="β"
                valor={betaModo}
                opciones={["Recomendado", "A mano"] as const}
                onChange={(v) => setBetaModo(v as "Recomendado" | "A mano")}
              />
              {betaModo === "A mano" ? (
                <CampoNumerico id="beta" etiqueta="β" valor={betaTexto} onChange={setBetaTexto} />
              ) : (
                <div className="flex items-end">
                  <p className="pb-2 font-mono text-sm tabular-nums">β = {fmt(BETA_RECOMENDADO[posicion], 2)}</p>
                </div>
              )}
            </div>
            <PanelAyuda titulo="Cuándo vale el β recomendado">
              <p>
                Los 1,15 / 1,40 / 1,50 de la figura A19.6.21 valen si la estabilidad lateral no
                depende de que losas y pilares trabajen como pórtico y las luces contiguas no
                difieren más del 25 % (art. 6.4.3(6)). Si no, β sale de la ec. (6.39) y se carga a
                mano.
              </p>
            </PanelAyuda>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={4} titulo="Armadura de punzonamiento" descripcion="Sólo se usa si el perímetro crítico no verifica solo.">
          <DatosConDibujo
            datos={
              <div className="grid grid-cols-2 gap-4">
                <CampoDiametro id="phiCerco" etiqueta="Ø rama" valor={phiCerco} onChange={setPhiCerco} />
                <CampoNumerico id="ramas" etiqueta="Ramas por perímetro" valor={ramas} onChange={setRamas} />
                <CampoNumerico id="sr" etiqueta="sr — separación radial" sufijo="m" valor={sr} onChange={setSr} />
                <CampoNumerico id="st" etiqueta="st — separación tangencial" sufijo="m" valor={st} onChange={setSt} />
                <CampoNumerico id="nPerimetros" etiqueta="N.º de perímetros" valor={nPerimetros} onChange={setNPerimetros} />
                <CampoNumerico id="distPrimer" etiqueta="Al 1.er perímetro" sufijo="m" valor={distPrimer} onChange={setDistPrimer} />
              </div>
            }
            dibujo={<CroquisArmaduraPunzonamiento />}
          />
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Posición", valor: posicionTexto },
              { etiqueta: "c1 × c2", valor: `${c1} × ${c2} m` },
              { etiqueta: "h / fck", valor: `${espesor} m / ${fck} MPa` },
              { etiqueta: "VEd", valor: `${vEd} kN` },
              ...(resultado
                ? [
                    { etiqueta: "dy / dz", valor: `${fmt(resultado.dY * 100, 1)} / ${fmt(resultado.dZ * 100, 1)} cm`, derivado: true },
                    { etiqueta: "d medio, ec. (6.32)", valor: `${fmt(resultado.r.dM * 100, 1)} cm`, derivado: true },
                    { etiqueta: "β", valor: fmt(resultado.r.beta, 2), derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              "Todo según el Anejo 19: vmin = 0,035·k^1,5·√fck, biela 0,4·ν·fcd, fywd,ef = 250 + 0,25d y tope kmáx = 1,5·vRd,c (ec. 6.52). La planilla PUNZONADO.xlsx mezclaba valores de la EHE‑08.",
              "El perímetro crítico a 2d se recorta contra los bordes libres (art. 6.4.2(4)).",
              "Los negativos tienen que estar dispuestos en un ancho de c + 3d a cada lado del pilar (art. 6.4.4(1)).",
              "Cercos verticales (α = 90°).",
              "No contempla huecos a menos de 6d, capiteles ni el término k1·σcp de axil o pretensado (omitirlo queda del lado seguro).",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={6} titulo="Resultados">
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
                  { etiqueta: "d medio", valor: `${fmt(resultado.r.dM * 100, 1)} cm` },
                  { etiqueta: "u1", valor: `${fmt(resultado.r.critico.u1M * 100, 0)} cm` },
                  { etiqueta: "vRd,c", valor: `${fmt(resultado.r.critico.vRdCMPa, 3)} MPa`, nota: `vEd ${fmt(resultado.r.critico.vEdMPa, 3)} MPa` },
                  { etiqueta: "β", valor: fmt(resultado.r.beta, 2) },
                ]}
              />

              <div className="mx-auto w-full max-w-xl">
                <PlantaPunzonamiento
                  planta={resultado.r.planta}
                  dM={resultado.r.dM}
                  u1M={resultado.r.critico.u1M}
                  verificaCritico={resultado.r.critico.verifica}
                />
              </div>

              <Subgrupo titulo="Comprobaciones resistentes">
                <div>
                  <ResultadoCheck
                    etiqueta="Cara del pilar · biela comprimida"
                    verifica={resultado.r.caraPilar.verifica}
                    detalle={resultado.r.caraPilar.verifica ? undefined : "Techo absoluto: no se levanta con armadura. Agrandar el pilar, subir el canto o fck, o poner capitel."}
                    comparacion={{
                      real: { etiqueta: "vEd", valor: resultado.r.caraPilar.vEdMPa },
                      limite: { etiqueta: "vRd,max", valor: resultado.r.caraPilar.vRdMaxMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo en la cara del pilar"
                    filas={[
                      {
                        etiqueta: "u0",
                        valor: `${fmt(resultado.r.caraPilar.u0M * 100, 1)} cm`,
                        formula: posicion === "interior" ? "2·(c1 + c2)" : posicion === "borde" ? "mín(c2 + 3d ; c2 + 2c1)" : "mín(3d ; c1 + c2)",
                        sustitucion: posicion === "interior" ? `2·(${fmt(resultado.n.c1, 2)} + ${fmt(resultado.n.c2, 2)})` : undefined,
                      },
                      { etiqueta: "ν", valor: fmt(resultado.r.caraPilar.nu, 3), formula: "0,6·(1 − fck/250)", sustitucion: `0,6·(1 − ${fmt(resultado.n.fck, 0)}/250)` },
                      {
                        etiqueta: "vRd,max",
                        valor: `${fmt(resultado.r.caraPilar.vRdMaxMPa, 3)} MPa`,
                        formula: "0,4·ν·fcd",
                        sustitucion: `0,4·${fmt(resultado.r.caraPilar.nu, 3)}·${fmt(resultado.n.fck / 1.5, 2)}`,
                      },
                      {
                        etiqueta: "vEd",
                        valor: `${fmt(resultado.r.caraPilar.vEdMPa, 3)} MPa`,
                        formula: "β·VEd/(u0·d)",
                        sustitucion: `${fmt(resultado.r.beta, 2)}·${fmt(resultado.n.vEd, 1)}/(${fmt(resultado.r.caraPilar.u0M, 3)}·${fmt(resultado.r.dM, 3)})`,
                      },
                    ]}
                  />

                  <ResultadoCheck
                    etiqueta="Perímetro crítico a 2d · losa sin armadura de punzonamiento"
                    verifica={resultado.r.critico.verifica}
                    detalle={
                      resultado.r.critico.verifica
                        ? `No hace falta armadura de punzonamiento (art. 6.4.3(2)(b)), siempre que los negativos estén en ${fmt(resultado.r.critico.anchoCuantiaC1M * 100, 0)} × ${fmt(resultado.r.critico.anchoCuantiaC2M * 100, 0)} cm alrededor del pilar.`
                        : "Hace falta armadura de punzonamiento: se verifica abajo."
                    }
                    comparacion={{
                      real: { etiqueta: "vEd", valor: resultado.r.critico.vEdMPa },
                      limite: { etiqueta: "vRd,c", valor: resultado.r.critico.vRdCMPa },
                      unidad: "MPa", exige: "≤",
                    }}
                  />
                  <PanelFormulas
                    titulo="Ver desarrollo del perímetro crítico"
                    filas={[
                      { etiqueta: "u1", valor: `${fmt(resultado.r.critico.u1M * 100, 1)} cm` },
                      { etiqueta: "k", valor: fmt(resultado.r.critico.k, 3), formula: "mín(1 + √(200/d) ; 2)", sustitucion: `mín(1 + √(200/${fmt(resultado.r.dM * 1000, 0)}) ; 2)` },
                      {
                        etiqueta: "ρl",
                        valor: fmt(resultado.r.critico.rhoL, 5),
                        formula: "mín(√(ρly·ρlz) ; 0,02)",
                        sustitucion: `mín(√(${fmt(resultado.r.critico.rhoLY, 5)}·${fmt(resultado.r.critico.rhoLZ, 5)}) ; 0,02)`,
                      },
                      {
                        etiqueta: "vmin",
                        valor: `${fmt(resultado.r.critico.vMinMPa, 3)} MPa`,
                        formula: "0,035·k^1,5·√fck",
                        sustitucion: `0,035·${fmt(resultado.r.critico.k, 3)}^1,5·√${fmt(resultado.n.fck, 0)}`,
                      },
                      { etiqueta: "vRd,c", valor: `${fmt(resultado.r.critico.vRdCMPa, 3)} MPa`, formula: "máx(0,18/γc·k·(100·ρl·fck)^⅓ ; vmin)" },
                      {
                        etiqueta: "vEd",
                        valor: `${fmt(resultado.r.critico.vEdMPa, 3)} MPa`,
                        formula: "β·VEd/(u1·d)",
                        sustitucion: `${fmt(resultado.r.beta, 2)}·${fmt(resultado.n.vEd, 1)}/(${fmt(resultado.r.critico.u1M, 3)}·${fmt(resultado.r.dM, 3)})`,
                      },
                    ]}
                  />

                  {resultado.r.armadura && (
                    <>
                      {resultado.r.armadura.fueraDeAlcance ? (
                        <ResultadoCheck
                          etiqueta="Losa con armadura de punzonamiento"
                          verifica={false}
                          detalle={`vEd = ${fmt(resultado.r.critico.vEdMPa, 3)} MPa supera el techo ${fmt(K_MAX_ARMADURA, 1)}·vRd,c = ${fmt(resultado.r.armadura.vRdCsTopeMPa, 3)} MPa (ec. 6.52): ninguna cantidad de armadura alcanza. Subir el canto, agrandar el pilar o poner capitel.`}
                        />
                      ) : (
                        <ResultadoCheck
                          etiqueta="Losa con la armadura de punzonamiento dispuesta"
                          verifica={resultado.r.armadura.verifica}
                          detalle={`Asw dispuesta ${fmt(resultado.r.armadura.aswRealMm2, 0)} mm²/perímetro · necesaria ${fmt(resultado.r.armadura.aswNecesariaMm2, 0)} mm² (${Math.ceil(resultado.r.armadura.aswNecesariaMm2 / ((Math.PI * resultado.n.phiCerco ** 2) / 4))} ramas Ø${fmt(resultado.n.phiCerco, 0)}; hay ${fmt(resultado.n.ramas, 0)}). fywd,ef = ${fmt(resultado.r.armadura.fywdEfMPa, 0)} MPa (art. 6.4.5(1)).`}
                          comparacion={{
                            real: { etiqueta: "vEd", valor: resultado.r.critico.vEdMPa },
                            limite: { etiqueta: "vRd,cs", valor: resultado.r.armadura.vRdCsMPa },
                            unidad: "MPa", exige: "≤",
                          }}
                        />
                      )}
                      <PanelFormulas
                        titulo="Ver desarrollo de la armadura de punzonamiento"
                        filas={[
                          {
                            etiqueta: "fywd,ef",
                            valor: `${fmt(resultado.r.armadura.fywdEfMPa, 1)} MPa`,
                            formula: "mín(250 + 0,25d ; fywd)",
                            sustitucion: `mín(250 + 0,25·${fmt(resultado.r.dM * 1000, 0)} ; ${fmt(resultado.r.armadura.fywdMPa, 1)})`,
                          },
                          { etiqueta: "vRd,cs", valor: `${fmt(resultado.r.armadura.vRdCsMPa, 3)} MPa`, formula: "0,75·vRd,c + 1,5·(d/sr)·Asw·fywd,ef/(u1·d)" },
                          { etiqueta: "tope", valor: `${fmt(resultado.r.armadura.vRdCsTopeMPa, 3)} MPa`, formula: "kmáx·vRd,c", sustitucion: `1,5·${fmt(resultado.r.critico.vRdCMPa, 3)}` },
                          {
                            etiqueta: "uout,ef",
                            valor: `${fmt(resultado.r.armadura.uOutEfM * 100, 0)} cm`,
                            formula: "β·VEd/(vRd,c·d)",
                            sustitucion: `${fmt(resultado.r.beta, 2)}·${fmt(resultado.n.vEd, 1)}/(${fmt(resultado.r.critico.vRdCMPa, 3)}·${fmt(resultado.r.dM, 3)})`,
                          },
                        ]}
                      />
                    </>
                  )}
                </div>
              </Subgrupo>

              {resultado.r.armadura && resultado.r.detallado && (
                <Subgrupo titulo="Condiciones constructivas" detalle="disposición de la armadura de punzonamiento">
                  <div>
                    <ResultadoCheck
                      etiqueta="La armadura llega hasta uout"
                      verifica={resultado.r.armadura.alcanzaUOut}
                      detalle={`uout a ${fmt(resultado.r.armadura.distUOutM * 100, 0)} cm, menos 1,5d`}
                      comparacion={{
                        real: { etiqueta: "último perímetro", valor: resultado.r.armadura.distUltimoPerimetroRealM * 100 },
                        limite: { etiqueta: "exigido", valor: resultado.r.armadura.distUltimoPerimetroExigidaM * 100 },
                        unidad: "cm", exige: "≥", decimales: 0,
                      }}
                    />
                    <ResultadoCheck
                      etiqueta="Al menos 2 perímetros"
                      verifica={resultado.r.detallado.verificaNumeroPerimetros}
                      comparacion={{
                        real: { etiqueta: "dispuestos", valor: resultado.n.nPerimetros },
                        limite: { etiqueta: "mínimo", valor: 2 },
                        unidad: "perímetros", exige: "≥", decimales: 0,
                      }}
                    />
                    <ResultadoCheck
                      etiqueta="Separación radial sr ≤ 0,75d"
                      verifica={resultado.r.detallado.verificaSr}
                      comparacion={{
                        real: { etiqueta: "sr", valor: resultado.n.sr * 100 },
                        limite: { etiqueta: "0,75d", valor: resultado.r.detallado.srMaxM * 100 },
                        unidad: "cm", exige: "≤", decimales: 1,
                      }}
                    />
                    <ResultadoCheck
                      etiqueta="Separación tangencial st ≤ 1,5d"
                      verifica={resultado.r.detallado.verificaSt}
                      comparacion={{
                        real: { etiqueta: "st", valor: resultado.n.st * 100 },
                        limite: { etiqueta: "1,5d", valor: resultado.r.detallado.stMaxM * 100 },
                        unidad: "cm", exige: "≤", decimales: 1,
                      }}
                    />
                    <ResultadoCheck
                      etiqueta="1.er perímetro a no más de d/2"
                      verifica={resultado.r.detallado.verificaPrimerPerimetro}
                      comparacion={{
                        real: { etiqueta: "al 1.er perímetro", valor: resultado.n.distPrimer * 100 },
                        limite: { etiqueta: "d/2", valor: resultado.r.detallado.distPrimerPerimetroMaxM * 100 },
                        unidad: "cm", exige: "≤", decimales: 1,
                      }}
                    />
                    <ResultadoCheck
                      etiqueta="Asw,min por rama, ec. (9.11)"
                      verifica={resultado.r.detallado.verificaAswMin}
                      comparacion={{
                        real: { etiqueta: "Asw rama", valor: resultado.r.detallado.aswRamaMm2 },
                        limite: { etiqueta: "Asw,min", valor: resultado.r.detallado.aswMinRamaMm2 },
                        unidad: "mm²", exige: "≥", decimales: 0,
                      }}
                    />
                  </div>
                </Subgrupo>
              )}
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
