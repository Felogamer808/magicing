"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Losas</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Posición del pilar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CroquisPosicionPilar posicion={posicion} />
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
                <CampoNumerico
                  id="c1"
                  etiqueta={hayBorde ? "c1 — lado ⊥ al borde" : "c1"}
                  sufijo="m"
                  valor={c1}
                  onChange={setC1}
                />
                <CampoNumerico
                  id="c2"
                  etiqueta={hayBorde ? "c2 — lado ∥ al borde" : "c2"}
                  sufijo="m"
                  valor={c2}
                  onChange={setC2}
                />
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
                  <CampoNumerico
                    id="distBordeC2"
                    etiqueta="Distancia al 2.º borde"
                    sufijo="m"
                    valor={distBordeC2}
                    onChange={setDistBordeC2}
                  />
                )}
              </div>
              <PanelAyuda titulo="Por qué importa dónde está el pilar">
                <p>
                  El perímetro crítico rodea al pilar a 2d, pero contra un borde libre se corta: la
                  parte que caería fuera de la losa no existe y el borde en sí no computa
                  (art. 6.4.2(4)). Un pilar de esquina puede quedarse con menos de la mitad de
                  perímetro que el mismo pilar en el interior, con la misma carga.
                </p>
                <p>
                  Si el pilar está retirado del borde, cargá esa distancia: el perímetro se estira
                  hasta el borde. Pasados los 2d ya cierra entero y el pilar es interior a efectos
                  del perímetro —la página lo avisa cuando pasa.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Losa y materiales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CroquisSeccionPunzonamiento />
              <div className="grid grid-cols-2 gap-4">
                <CampoNumerico id="espesor" etiqueta="Espesor h" sufijo="m" valor={espesor} onChange={setEspesor} />
                <CampoNumerico id="recubrimiento" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento} onChange={setRecubrimiento} />
                <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                <CampoNumerico id="fyk" etiqueta="fyk armadura" sufijo="MPa" valor={fyk} onChange={setFyk} />
              </div>
              {resultado && (
                <p className="rounded-md border p-3 font-mono text-xs text-muted-foreground tabular-nums">
                  dy {fmt(resultado.dY * 100, 1)} cm · dz {fmt(resultado.dZ * 100, 1)} cm · d ={" "}
                  <strong className="text-foreground">{fmt(resultado.r.dM * 100, 1)} cm</strong> — media
                  de los dos, ec. (6.32). Salen del espesor, el recubrimiento y los diámetros de
                  negativos: la capa de adentro pierde un diámetro entero.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Armadura de negativos sobre el pilar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoDiametro id="phiNegY" etiqueta="Ø dirección y" valor={phiNegY} onChange={setPhiNegY} />
                <CampoNumerico id="sNegY" etiqueta="s dirección y" sufijo="m" valor={sNegY} onChange={setSNegY} />
                <CampoDiametro id="phiNegZ" etiqueta="Ø dirección z" valor={phiNegZ} onChange={setPhiNegZ} />
                <CampoNumerico id="sNegZ" etiqueta="s dirección z" sufijo="m" valor={sNegZ} onChange={setSNegZ} />
              </div>
              <PanelAyuda titulo="Qué armadura va acá">
                <p>
                  La de negativos, la de arriba: es la que cose la fisura de punzonamiento y la que
                  entra en ρl. No es la malla general del paño sino la que efectivamente está sobre
                  el pilar, y tiene que existir en un ancho de c + 3d a cada lado (art. 6.4.4(1));
                  la página dice abajo cuánto es ese ancho en este caso.
                </p>
                <p>
                  Pesa poco y mucho a la vez: entra con raíz cúbica, así que duplicarla no duplica
                  nada, pero una losa con cuantía pobre cae contra el mínimo vmin y ahí la cuantía
                  deja de servir del todo.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Esfuerzo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    <p className="pb-2 font-mono text-sm tabular-nums">
                      β = {fmt(BETA_RECOMENDADO[posicion], 2)}
                    </p>
                  </div>
                )}
              </div>
              <PanelAyuda titulo="Cuándo vale el β recomendado">
                <p>
                  Los 1,15 / 1,40 / 1,50 de la figura A19.6.21 son valores aproximados y el
                  art. 6.4.3(6) los condiciona a dos cosas: que la estabilidad lateral{" "}
                  <strong>no</strong> dependa de que losas y pilares trabajen como pórtico, y que
                  las luces de los vanos contiguos no difieran más del 25 %.
                </p>
                <p>
                  Si tu caso no cumple eso, β sale de la ec. (6.39) con el momento desequilibrado
                  que transmite el nudo, β = 1 + k·(MEd/VEd)·(u1/W1), y se carga a mano acá. En un
                  pórtico de nudos rígidos puede irse bastante por encima de 1,15, y es el número
                  que más pesa de toda la comprobación: multiplica directo la tensión.
                </p>
              </PanelAyuda>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Armadura de punzonamiento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CroquisArmaduraPunzonamiento />
              <div className="grid grid-cols-2 gap-4">
                <CampoDiametro id="phiCerco" etiqueta="Ø rama" valor={phiCerco} onChange={setPhiCerco} />
                <CampoNumerico id="ramas" etiqueta="Ramas por perímetro" valor={ramas} onChange={setRamas} />
                <CampoNumerico id="sr" etiqueta="sr — separación radial" sufijo="m" valor={sr} onChange={setSr} />
                <CampoNumerico id="st" etiqueta="st — separación tangencial" sufijo="m" valor={st} onChange={setSt} />
                <CampoNumerico id="nPerimetros" etiqueta="N.º de perímetros" valor={nPerimetros} onChange={setNPerimetros} />
                <CampoNumerico id="distPrimer" etiqueta="Al 1.er perímetro" sufijo="m" valor={distPrimer} onChange={setDistPrimer} />
              </div>
              <p className="text-xs text-muted-foreground">
                Sólo se usa si el perímetro crítico no verifica solo. Se suponen cercos verticales
                (α = 90°).
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores numéricos válidos para ver los resultados.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="drafting-marks">
                <CardHeader><CardTitle className="text-base">Planta — perímetros de control</CardTitle></CardHeader>
                <CardContent className="py-2">
                  <PlantaPunzonamiento
                    planta={resultado.r.planta}
                    dM={resultado.r.dM}
                    u1M={resultado.r.critico.u1M}
                    verificaCritico={resultado.r.critico.verifica}
                  />
                </CardContent>
              </Card>

              {resultado.r.perimetroCierraComoInterior && (
                <p className="rounded-md border p-3 text-xs text-muted-foreground">
                  Con esa distancia al borde el perímetro cierra entero: da lo mismo que un pilar
                  interior. El borde deja de recortar nada más allá de 2d = {fmt(2 * resultado.r.dM * 100, 0)} cm
                  (art. 6.4.2(4)). β y u0 siguen siendo los de la posición que elegiste, que es lo
                  correcto: los define cómo trabaja el nudo, no la forma del perímetro.
                </p>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">1 · Cara del pilar — biela comprimida</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Tensión en el perímetro del pilar"
                    verifica={resultado.r.caraPilar.verifica}
                    comparacion={{
                      real: { etiqueta: "vEd", valor: resultado.r.caraPilar.vEdMPa },
                      limite: { etiqueta: "vRd,max", valor: resultado.r.caraPilar.vRdMaxMPa },
                      unidad: "MPa",
                      exige: "≤",
                    }}
                  />
                  {!resultado.r.caraPilar.verifica && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-xs text-destructive">
                      Éste es el techo absoluto y <strong>no se levanta con armadura</strong>: lo que
                      se agota es la biela de hormigón contra la cara del pilar. Las salidas son
                      agrandar el pilar, subir el canto de la losa, subir fck o poner un capitel.
                    </p>
                  )}
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      {
                        etiqueta: "u0",
                        valor: `${fmt(resultado.r.caraPilar.u0M * 100, 1)} cm`,
                        formula:
                          posicion === "interior"
                            ? "2·(c1 + c2)"
                            : posicion === "borde"
                              ? "mín(c2 + 3d ; c2 + 2c1)"
                              : "mín(3d ; c1 + c2)",
                        sustitucion:
                          posicion === "interior"
                            ? `2·(${fmt(resultado.n.c1, 2)} + ${fmt(resultado.n.c2, 2)})`
                            : undefined,
                      },
                      {
                        etiqueta: "ν",
                        valor: fmt(resultado.r.caraPilar.nu, 3),
                        formula: "0,6·(1 − fck/250)",
                        sustitucion: `0,6·(1 − ${fmt(resultado.n.fck, 0)}/250)`,
                      },
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">2 · Perímetro crítico a 2d</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Losa sin armadura de punzonamiento"
                    verifica={resultado.r.critico.verifica}
                    comparacion={{
                      real: { etiqueta: "vEd", valor: resultado.r.critico.vEdMPa },
                      limite: { etiqueta: "vRd,c", valor: resultado.r.critico.vRdCMPa },
                      unidad: "MPa",
                      exige: "≤",
                    }}
                    detalle={`u1 ${fmt(resultado.r.critico.u1M * 100, 0)} cm · ρl ${fmt(resultado.r.critico.rhoL * 100, 3)} % · k ${fmt(resultado.r.critico.k, 3)}`}
                  />

                  {resultado.r.critico.verifica ? (
                    <p className="rounded-md border p-3 text-xs text-muted-foreground">
                      No hace falta armadura de punzonamiento (art. 6.4.3(2)(b)). Lo que sí hace
                      falta es que los negativos estén de verdad puestos en un ancho de{" "}
                      {fmt(resultado.r.critico.anchoCuantiaC1M * 100, 0)} ×{" "}
                      {fmt(resultado.r.critico.anchoCuantiaC2M * 100, 0)} cm alrededor del pilar
                      (c + 3d a cada lado): la cuantía de la que sale este vRd,c se supone presente
                      ahí.
                    </p>
                  ) : (
                    <p className="rounded-md border p-3 text-xs text-muted-foreground">
                      Hace falta armadura de punzonamiento: se dimensiona abajo.
                    </p>
                  )}

                  {resultado.r.critico.gobiernaVMin && (
                    <p className="rounded-md border p-3 text-xs text-muted-foreground">
                      Gobierna el mínimo vmin, no la cuantía: con ρl = {fmt(resultado.r.critico.rhoL * 100, 3)} %
                      el término de la ec. (6.47) queda por debajo del piso. Agregar negativos no
                      va a mover vRd,c hasta salir de esa zona.
                    </p>
                  )}

                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "u1", valor: `${fmt(resultado.r.critico.u1M * 100, 1)} cm` },
                      {
                        etiqueta: "k",
                        valor: fmt(resultado.r.critico.k, 3),
                        formula: "mín(1 + √(200/d) ; 2)",
                        sustitucion: `mín(1 + √(200/${fmt(resultado.r.dM * 1000, 0)}) ; 2)`,
                      },
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
                      {
                        etiqueta: "vRd,c",
                        valor: `${fmt(resultado.r.critico.vRdCMPa, 3)} MPa`,
                        formula: "máx(0,18/γc·k·(100·ρl·fck)^⅓ ; vmin)",
                      },
                      {
                        etiqueta: "vEd",
                        valor: `${fmt(resultado.r.critico.vEdMPa, 3)} MPa`,
                        formula: "β·VEd/(u1·d)",
                        sustitucion: `${fmt(resultado.r.beta, 2)}·${fmt(resultado.n.vEd, 1)}/(${fmt(resultado.r.critico.u1M, 3)}·${fmt(resultado.r.dM, 3)})`,
                      },
                    ]}
                  />
                </CardContent>
              </Card>

              {resultado.r.armadura && resultado.r.detallado && (
                <Card>
                  <CardHeader><CardTitle className="text-base">3 · Armadura de punzonamiento</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {resultado.r.armadura.fueraDeAlcance ? (
                      <p className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-xs text-destructive">
                        vEd = {fmt(resultado.r.critico.vEdMPa, 3)} MPa supera el techo{" "}
                        {fmt(K_MAX_ARMADURA, 1)}·vRd,c = {fmt(resultado.r.armadura.vRdCsTopeMPa, 3)} MPa que
                        fija la ec. (6.52). <strong>Ninguna cantidad de armadura alcanza</strong>:
                        pasado ese límite la losa rompe igual, por más cercos que se pongan. Hay que
                        subir el canto, agrandar el pilar o poner capitel.
                      </p>
                    ) : (
                      <ResultadoCheck
                        etiqueta="Losa con la armadura dispuesta"
                        verifica={resultado.r.armadura.verifica}
                        comparacion={{
                          real: { etiqueta: "vEd", valor: resultado.r.critico.vEdMPa },
                          limite: { etiqueta: "vRd,cs", valor: resultado.r.armadura.vRdCsMPa },
                          unidad: "MPa",
                          exige: "≤",
                        }}
                        detalle={`Asw dispuesta ${fmt(resultado.r.armadura.aswRealMm2, 0)} mm²/perímetro · necesaria ${fmt(resultado.r.armadura.aswNecesariaMm2, 0)} mm²`}
                      />
                    )}

                    {!resultado.r.armadura.fueraDeAlcance && (
                    <div className="rounded-md border p-3 text-xs text-muted-foreground">
                      <p>
                        Hacen falta{" "}
                        <strong className="text-foreground">
                          {fmt(resultado.r.armadura.aswNecesariaMm2, 0)} mm² por perímetro
                        </strong>{" "}
                        con sr = {fmt(resultado.n.sr * 100, 0)} cm. Con Ø{fmt(resultado.n.phiCerco, 0)}{" "}
                        son {Math.ceil(resultado.r.armadura.aswNecesariaMm2 / ((Math.PI * resultado.n.phiCerco ** 2) / 4))} ramas;
                        tenés {fmt(resultado.n.ramas, 0)}.
                      </p>
                      <p className="mt-1.5">
                        El acero trabaja a fywd,ef = {fmt(resultado.r.armadura.fywdEfMPa, 0)} MPa y no a
                        fyd = {fmt(resultado.r.armadura.fywdMPa, 0)} MPa: la fisura de punzonado es
                        corta y la rama no llega a plastificar (art. 6.4.5(1)).
                      </p>
                    </div>
                    )}

                    <ResultadoCheck
                      etiqueta="La armadura llega hasta uout"
                      verifica={resultado.r.armadura.alcanzaUOut}
                      comparacion={{
                      real: { etiqueta: "último perímetro", valor: resultado.r.armadura.distUltimoPerimetroRealM * 100 },
                      limite: { etiqueta: "exigido", valor: resultado.r.armadura.distUltimoPerimetroExigidaM * 100 },
                      unidad: "cm", exige: "≥", decimales: 0,
                    }}
                      detalle={`uout a ${fmt(resultado.r.armadura.distUOutM * 100, 0)} cm, menos 1,5d`}
                    />

                    <div className="grid gap-2 sm:grid-cols-2">
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
                        etiqueta="sr ≤ 0,75d"
                        verifica={resultado.r.detallado.verificaSr}
                        comparacion={{
                      real: { etiqueta: "sr", valor: resultado.n.sr * 100 },
                      limite: { etiqueta: "0,75d", valor: resultado.r.detallado.srMaxM * 100 },
                      unidad: "cm", exige: "≤", decimales: 1,
                    }}
                      />
                      <ResultadoCheck
                        etiqueta="st ≤ 1,5d"
                        verifica={resultado.r.detallado.verificaSt}
                        comparacion={{
                      real: { etiqueta: "st", valor: resultado.n.st * 100 },
                      limite: { etiqueta: "1,5d", valor: resultado.r.detallado.stMaxM * 100 },
                      unidad: "cm", exige: "≤", decimales: 1,
                    }}
                      />
                      <ResultadoCheck
                        etiqueta="1.er perímetro ≤ d/2"
                        verifica={resultado.r.detallado.verificaPrimerPerimetro}
                        comparacion={{
                      real: { etiqueta: "al 1.er perímetro", valor: resultado.n.distPrimer * 100 },
                      limite: { etiqueta: "d/2", valor: resultado.r.detallado.distPrimerPerimetroMaxM * 100 },
                      unidad: "cm", exige: "≤", decimales: 1,
                    }}
                      />
                      <div className="sm:col-span-2">
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
                    </div>

                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[
                        {
                          etiqueta: "fywd,ef",
                          valor: `${fmt(resultado.r.armadura.fywdEfMPa, 1)} MPa`,
                          formula: "mín(250 + 0,25d ; fywd)",
                          sustitucion: `mín(250 + 0,25·${fmt(resultado.r.dM * 1000, 0)} ; ${fmt(resultado.r.armadura.fywdMPa, 1)})`,
                        },
                        {
                          etiqueta: "vRd,cs",
                          valor: `${fmt(resultado.r.armadura.vRdCsMPa, 3)} MPa`,
                          formula: "0,75·vRd,c + 1,5·(d/sr)·Asw·fywd,ef/(u1·d)",
                        },
                        {
                          etiqueta: "tope",
                          valor: `${fmt(resultado.r.armadura.vRdCsTopeMPa, 3)} MPa`,
                          formula: "kmáx·vRd,c",
                          sustitucion: `1,5·${fmt(resultado.r.critico.vRdCMPa, 3)}`,
                        },
                        {
                          etiqueta: "uout,ef",
                          valor: `${fmt(resultado.r.armadura.uOutEfM * 100, 0)} cm`,
                          formula: "β·VEd/(vRd,c·d)",
                          sustitucion: `${fmt(resultado.r.beta, 2)}·${fmt(resultado.n.vEd, 1)}/(${fmt(resultado.r.critico.vRdCMPa, 3)}·${fmt(resultado.r.dM, 3)})`,
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              <PanelAyuda titulo="Por qué esto no da igual que la planilla PUNZONADO.xlsx">
                <p>
                  La planilla mezcla dos normas: toma el perímetro crítico y la expresión de vRd,c
                  del EC2, pero el mínimo vmin, la resistencia de la biela y el fywd de la armadura
                  los toma de la EHE-08, que está derogada. Acá es todo Anejo 19, y las tres
                  diferencias van del lado seguro:
                </p>
                <p className="font-mono">
                  vmin: 0,035·k^1,5·√fck (acá) contra 0,05·k^1,5·√fck (planilla) — un 43 % más bajo.
                </p>
                <p className="font-mono">
                  Biela: 0,4·ν·fcd (acá) contra 0,30·fcd (planilla) — para fck 30, 4,22 contra 6,00 MPa.
                </p>
                <p className="font-mono">
                  Acero: fywd,ef = 250 + 0,25d (acá) contra 400 MPa planos (planilla).
                </p>
                <p>
                  La planilla tampoco aplica el tope kmáx = 1,5·vRd,c de la ec. (6.52), que es el que
                  dice cuándo armar deja de servir.
                </p>
              </PanelAyuda>

              <p className="text-xs text-muted-foreground">
                No contempla huecos a menos de 6d del pilar (art. 6.4.2(3), hay que descontar la
                parte del perímetro que queda a la sombra), ni capiteles, ni el término k1·σcp de
                axil o pretensado —omitirlo queda del lado seguro—. Los cercos se suponen verticales.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
