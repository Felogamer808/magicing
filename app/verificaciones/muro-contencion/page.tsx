"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvisoCombinacion } from "@/components/verificaciones/AvisoCombinacion";
import { CampoNumerico } from "@/components/verificaciones/CampoNumerico";
import { PanelFormulas } from "@/components/verificaciones/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/ResultadoCheck";
import { DiagramaEmpujesMuro } from "@/components/verificaciones/hormigon/DiagramaEmpujesMuro";
import { PredimensionadoMuro } from "@/components/verificaciones/hormigon/PredimensionadoMuro";
import { AccionesElementosMuro } from "@/components/verificaciones/hormigon/AccionesElementosMuro";
import { PanelAyuda } from "@/components/verificaciones/PanelAyuda";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { DiagramaMuro } from "@/components/verificaciones/DiagramaMuro";
import {
  CroquisApoyosMuro,
  CroquisGeometriaMuro,
  CroquisSueloMuro,
} from "@/components/verificaciones/croquis/CroquisMuro";
import {
  areaPorMetroCm2,
  armarPieza,
  calcularMuroContencion,
  separacionParaAs,
} from "@/lib/calc/ec2/muro-contencion";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { ArmadoMuroDiagrama } from "@/components/verificaciones/hormigon/ArmadoMuroDiagrama";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "muros-contencion")!;

export default function MuroContencionPage() {
  const [norma, setNorma] = useCampo("norma", "EC7");

  const [gamma, setGamma] = useCampo("gamma", "18");
  const [phi, setPhi] = useCampo("phi", "34");
  const [c, setC] = useCampo("c", "5");
  const [sigmaAdm, setSigmaAdm] = useCampo("sigmaAdm", "100");

  const [anchoZap, setAnchoZap] = useCampo("anchoZap", "0.5");
  const [cantoZap, setCantoZap] = useCampo("cantoZap", "0.3");
  const [altMuro, setAltMuro] = useCampo("altMuro", "3.2");
  const [espMuro, setEspMuro] = useCampo("espMuro", "0.15");
  const [hAct, setHAct] = useCampo("hAct", "3.2");
  const [hPas, setHPas] = useCampo("hPas", "0");
  const [sobrecarga, setSobrecarga] = useCampo("sobrecarga", "5");
  // Cero por defecto: el muro contra un límite de propiedad no lleva puntera.
  const [puntera, setPuntera] = useCampo("puntera", "0");

  const [fck, setFck] = useCampo("fck", "30");
  const [fyk, setFyk] = useCampo("fyk", "500");
  const [recArm, setRecArm] = useCampo("recArm", "0.05");
  const [phiHastial, setPhiHastial] = useCampo("phiHastial", "12");
  const [sepHastial, setSepHastial] = useCampo("sepHastial", "150");
  const [phiTalon, setPhiTalon] = useCampo("phiTalon", "12");
  const [sepTalon, setSepTalon] = useCampo("sepTalon", "150");
  const [phiPuntera, setPhiPuntera] = useCampo("phiPuntera", "12");
  const [sepPuntera, setSepPuntera] = useCampo("sepPuntera", "150");

  const [l1Caso2, setL1Caso2] = useCampo("l1Caso2", "2");
  const [l1Caso3, setL1Caso3] = useCampo("l1Caso3", "0.95");
  const [l2Caso3, setL2Caso3] = useCampo("l2Caso3", "2.45");

  const resultado = useMemo(() => {
    const n = {
      gamma: aNumero(gamma), phi: aNumero(phi), c: aNumero(c), sigmaAdm: aNumero(sigmaAdm),
      anchoZap: aNumero(anchoZap), cantoZap: aNumero(cantoZap), altMuro: aNumero(altMuro),
      espMuro: aNumero(espMuro), hAct: aNumero(hAct), hPas: aNumero(hPas), sobrecarga: aNumero(sobrecarga),
      puntera: aNumero(puntera),
      l1Caso2: aNumero(l1Caso2), l1Caso3: aNumero(l1Caso3), l2Caso3: aNumero(l2Caso3),
    };
    if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
    if (n.gamma <= 0 || n.phi <= 0 || n.phi >= 90 || n.sigmaAdm <= 0) return null;
    if (n.anchoZap <= 0 || n.cantoZap <= 0 || n.altMuro <= 0 || n.espMuro <= 0 || n.hAct <= 0) return null;
    if (n.espMuro >= n.anchoZap) return null;
    // La puntera y el hastial tienen que caber en la zapata y dejar talon.
    if (n.puntera + n.espMuro >= n.anchoZap) return null;
    if (n.l1Caso2 <= 0 || n.l2Caso3 <= 0) return null;

    return {
      n,
      r: calcularMuroContencion(
        { gammaKNm3: n.gamma, phiGrados: n.phi, cKPa: n.c, sigmaAdmisibleKPa: n.sigmaAdm },
        {
          anchoZapataM: n.anchoZap, cantoZapataM: n.cantoZap, alturaMuroM: n.altMuro,
          espesorMuroM: n.espMuro, alturaSueloActivoM: n.hAct, alturaSueloPasivoM: n.hPas,
          sobrecargaKPa: n.sobrecarga, punteraM: n.puntera,
        },
        { l1Caso2M: n.l1Caso2, l1Caso3M: n.l1Caso3, l2Caso3M: n.l2Caso3 }
      ),
    };
  }, [gamma, phi, c, sigmaAdm, anchoZap, cantoZap, altMuro, espMuro, hAct, hPas, sobrecarga, puntera, l1Caso2, l1Caso3, l2Caso3]);

  /**
   * Armado de las tres piezas. Va aparte del resultado de estabilidad porque
   * depende de los materiales y de las barras elegidas, que no intervienen en
   * vuelco ni deslizamiento.
   */
  const armado = useMemo(() => {
    if (!resultado) return null;
    const m = resultado.r.momentos;
    const materiales = derivarMateriales({ fck: aNumero(fck), fyk: aNumero(fyk) });
    const rec = aNumero(recArm);
    if (!Number.isFinite(rec) || rec <= 0) return null;

    const pieza = (
      nombre: string,
      cara: "interior" | "superior" | "inferior",
      momento: number,
      h: number,
      diam: string,
      sep: string
    ) => {
      const calculo = armarPieza(nombre, cara, momento, h, rec, materiales.fcd, materiales.fyd);
      const asRealCm2 = areaPorMetroCm2(aNumero(diam), aNumero(sep));
      return {
        calculo,
        asRealCm2,
        diametroMm: aNumero(diam),
        separacionMm: aNumero(sep),
        // Separación máxima que todavía cubre el área necesaria.
        separacionMaxMm: separacionParaAs(aNumero(diam), calculo.asNecesarioCm2),
        verifica: asRealCm2 >= calculo.asNecesarioCm2,
      };
    };

    return {
      hastial: pieza("Hastial", "interior", m.hastialKNm, aNumero(espMuro), phiHastial, sepHastial),
      talon: pieza("Talón", "superior", m.talonKNm, aNumero(cantoZap), phiTalon, sepTalon),
      puntera:
        m.punteraM > 0
          ? pieza("Puntera", "inferior", m.punteraKNm, aNumero(cantoZap), phiPuntera, sepPuntera)
          : null,
    };
  }, [resultado, fck, fyk, recArm, espMuro, cantoZap,
      phiHastial, sepHastial, phiTalon, sepTalon, phiPuntera, sepPuntera]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="spec-label">Contención</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      {resultado && (
        <Card className="drafting-marks">
          <CardHeader><CardTitle className="text-base">Sección</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <DiagramaMuro
              anchoZapataM={resultado.n.anchoZap}
              cantoZapataM={resultado.n.cantoZap}
              alturaMuroM={resultado.n.altMuro}
              espesorMuroM={resultado.n.espMuro}
              alturaSueloActivoM={resultado.n.hAct}
              punteraM={resultado.n.puntera}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Suelo</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <CroquisSueloMuro />
              </div>
              <CampoNumerico id="gamma" etiqueta="γ" sufijo="kN/m³" valor={gamma} onChange={setGamma} />
              <CampoNumerico id="phi" etiqueta="φ" sufijo="°" valor={phi} onChange={setPhi} />
              <CampoNumerico id="c" etiqueta="Cohesión c" sufijo="kPa" valor={c} onChange={setC} />
              <CampoNumerico id="sigmaAdm" etiqueta="σ adm." sufijo="kN/m²" valor={sigmaAdm} onChange={setSigmaAdm} />
              <div className="col-span-2">
                <PanelAyuda titulo="Qué es cada parámetro del suelo">
                <p>
                  <strong className="text-foreground">γ — peso específico.</strong> Cuánto pesa un
                  metro cúbico de relleno. Multiplica todo el empuje: el doble de γ es el doble de
                  empuje. Suelos corrientes van entre 17 y 21 kN/m³.
                </p>
                <p>
                  <strong className="text-foreground">φ — ángulo de rozamiento interno.</strong> Qué
                  tan bien se traba el suelo consigo mismo. Es el que más manda: entra en el
                  coeficiente activo ka = tg²(45 − φ/2), así que subirlo baja el empuje rápido.
                  Arenas 30–36°, gravas 35–40°, limos y arcillas menos.
                </p>
                <p>
                  <strong className="text-foreground">c — cohesión.</strong> Lo que el suelo aguanta
                  sin confinar, por atracción entre partículas. Acá solo interviene en el
                  deslizamiento, sumando adherencia bajo la zapata. En arenas limpias vale cero, y
                  conviene no confiar en ella si el terreno puede saturarse.
                </p>
                <p>
                  <strong className="text-foreground">σ adm. — tensión admisible.</strong> Cuánta
                  presión tolera el terreno de apoyo sin asentar de más. No sale de los otros tres:
                  es un dato del estudio de suelos. Es la que limita el ancho de zapata.
                </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Geometría</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <CroquisGeometriaMuro />
              </div>
              <CampoNumerico id="anchoZap" etiqueta="A zapata" sufijo="m" valor={anchoZap} onChange={setAnchoZap} />
              <CampoNumerico id="cantoZap" etiqueta="H zapata" sufijo="m" valor={cantoZap} onChange={setCantoZap} />
              <CampoNumerico id="altMuro" etiqueta="H muro" sufijo="m" valor={altMuro} onChange={setAltMuro} />
              <CampoNumerico id="espMuro" etiqueta="Espesor muro" sufijo="m" valor={espMuro} onChange={setEspMuro} />
              <CampoNumerico id="puntera" etiqueta="Puntera" sufijo="m" valor={puntera} onChange={setPuntera} />
              <div className="col-span-2">
                <PanelAyuda titulo="Qué es la puntera y cuándo va en cero">
                  <p>
                    Es el vuelo de la zapata por delante del hastial, del lado que no retiene
                    tierra. Cargarla en <strong className="text-foreground">cero</strong> es un caso
                    real y frecuente: un muro contra un límite de propiedad o una medianera no puede
                    volar hacia ese lado, y entonces toda la zapata es talón.
                  </p>
                  <p>
                    Sin puntera no hay nada que dimensionar de ese lado, así que esa parte del
                    armado desaparece. A cambio, el muro pierde brazo estabilizador y el vuelco se
                    vuelve más exigente.
                  </p>
                </PanelAyuda>
              </div>
              <div className="col-span-2">
                <PredimensionadoMuro
                  alturaTotalM={aNumero(altMuro) + aNumero(cantoZap) || 3.5}
                  onAplicar={(d) => {
                    setAnchoZap(String(d.anchoZapataM));
                    setCantoZap(String(d.cantoZapataM));
                    setAltMuro(String(d.alturaMuroM));
                    setEspMuro(String(d.espesorMuroM));
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Terreno y sobrecarga</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumerico id="hAct" etiqueta="h activo" sufijo="m" valor={hAct} onChange={setHAct} />
              <CampoNumerico id="hPas" etiqueta="h pasivo" sufijo="m" valor={hPas} onChange={setHPas} />
              <CampoNumerico id="sobrecarga" etiqueta="Sobrecarga" sufijo="kN/m²" valor={sobrecarga} onChange={setSobrecarga} />
              <div className="col-span-2 sm:col-span-3">
                <PanelAyuda titulo="Qué es cada dato del terreno y la sobrecarga">
                <p>
                  <strong className="text-foreground">h activo.</strong> Altura de tierra retenida
                  por detrás, medida desde la base de la zapata. Es la que genera el empuje que
                  vuelca, y crece al cuadrado: pasar de 3 a 4 m casi duplica el empuje.
                </p>
                <p>
                  <strong className="text-foreground">h pasivo.</strong> Altura de tierra que queda
                  por delante, del lado de la puntera, y que resiste. Suele dejarse en cero: es
                  terreno que puede excavarse después y confiar en él es optimista.
                </p>
                <p>
                  <strong className="text-foreground">Sobrecarga.</strong> Sí, es la{" "}
                  <strong className="text-foreground">q</strong> del diagrama de empujes: una carga
                  repartida sobre la superficie del terreno retenido —tránsito, acopio, una losa de
                  acceso—. Se traduce en un empuje horizontal ka·q constante en toda la altura, por
                  eso su diagrama es el rectángulo ámbar y no un triángulo.
                </p>
                </PanelAyuda>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Posición de los apoyos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <CroquisApoyosMuro />
              </div>
              <CampoNumerico id="l1Caso2" etiqueta="L1 · altura del contrapiso" sufijo="m" valor={l1Caso2} onChange={setL1Caso2} />
              <CampoNumerico id="l1Caso3" etiqueta="L1 · altura del contrapiso" sufijo="m" valor={l1Caso3} onChange={setL1Caso3} />
              <CampoNumerico id="l2Caso3" etiqueta="L2 · contrapiso a losa" sufijo="m" valor={l2Caso3} onChange={setL2Caso3} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!resultado ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Completá los datos con valores válidos (el espesor del muro debe ser menor que el ancho de zapata).
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Empujes sobre el muro</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <DiagramaEmpujesMuro
                    alturaTotalM={resultado.r.empujes.alturaTotalM}
                    alturaSueloActivoM={aNumero(hAct)}
                    alturaMuroM={aNumero(altMuro)}
                    espesorMuroM={aNumero(espMuro)}
                    anchoZapataM={aNumero(anchoZap)}
                    cantoZapataM={aNumero(cantoZap)}
                    alturaSueloPasivoM={aNumero(hPas)}
                    punteraM={aNumero(puntera)}
                    ka={resultado.r.empujes.ka}
                    kp={resultado.r.empujes.kp}
                    gammaKNm3={aNumero(gamma)}
                    sobrecargaKPa={aNumero(sobrecarga)}
                    empujeSueloKN={resultado.r.empujes.empujeSueloKN}
                    empujeSobrecargaKN={resultado.r.empujes.empujeSobrecargaKN}
                    empujePasivoKN={resultado.r.empujes.empujePasivoKN}
                  />
                  <AccionesElementosMuro
                    alturaMuroM={aNumero(altMuro)}
                    espesorMuroM={aNumero(espMuro)}
                    anchoZapataM={aNumero(anchoZap)}
                    cantoZapataM={aNumero(cantoZap)}
                    punteraM={aNumero(puntera)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Momentos para armar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      {
                        etiqueta: `Hastial · voladizo de ${fmt(resultado.r.momentos.alturaHastialM, 2)} m`,
                        valor: `${fmt(resultado.r.momentos.hastialKNm)} kN·m/m`,
                      },
                      {
                        etiqueta: `Talón · vuelo de ${fmt(resultado.r.momentos.talonM, 2)} m`,
                        valor: `${fmt(resultado.r.momentos.talonKNm)} kN·m/m`,
                      },
                      ...(resultado.r.momentos.punteraM > 0
                        ? [
                            {
                              etiqueta: `Puntera · vuelo de ${fmt(resultado.r.momentos.punteraM, 2)} m`,
                              valor: `${fmt(resultado.r.momentos.punteraKNm)} kN·m/m`,
                            },
                            {
                              etiqueta: "σ terreno en el borde / arranque",
                              valor: `${fmt(resultado.r.momentos.sigmaPunteraBordeKPa)} / ${fmt(resultado.r.momentos.sigmaPunteraArranqueKPa)} kN/m²`,
                            },
                          ]
                        : []),
                    ]}
                  />
                  {resultado.r.momentos.punteraM === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Sin puntera no hay nada que armar de ese lado: toda la zapata trabaja como
                      talón. Si el muro no está contra un límite de propiedad, darle puntera suele
                      ser la forma más barata de resolver un vuelco justo.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Momentos ya mayorados con γf = 1,5. El talón se resuelve del lado seguro:
                    se cuentan las cargas que bajan y se desprecia la reacción del terreno, que
                    iría a favor.
                  </p>
                </CardContent>
              </Card>

              {armado && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Armado</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                      <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                      <CampoNumerico id="recArm" etiqueta="Recubrimiento mec." sufijo="m" valor={recArm} onChange={setRecArm} />
                      <CampoNumerico id="phiHastial" etiqueta="⌀ hastial" sufijo="mm" valor={phiHastial} onChange={setPhiHastial} />
                      <CampoNumerico id="sepHastial" etiqueta="Sep. hastial" sufijo="mm" valor={sepHastial} onChange={setSepHastial} />
                      <div />
                      <CampoNumerico id="phiTalon" etiqueta="⌀ talón" sufijo="mm" valor={phiTalon} onChange={setPhiTalon} />
                      <CampoNumerico id="sepTalon" etiqueta="Sep. talón" sufijo="mm" valor={sepTalon} onChange={setSepTalon} />
                      <div />
                      {armado.puntera && (
                        <>
                          <CampoNumerico id="phiPuntera" etiqueta="⌀ puntera" sufijo="mm" valor={phiPuntera} onChange={setPhiPuntera} />
                          <CampoNumerico id="sepPuntera" etiqueta="Sep. puntera" sufijo="mm" valor={sepPuntera} onChange={setSepPuntera} />
                        </>
                      )}
                    </div>

                    {[armado.hastial, armado.talon, armado.puntera]
                      .filter((p): p is NonNullable<typeof p> => p !== null)
                      .map((p) => (
                        <ResultadoCheck
                          key={p.calculo.nombre}
                          etiqueta={`${p.calculo.nombre} — cara ${p.calculo.cara}`}
                          verifica={p.verifica}
                          detalle={`As real ${fmt(p.asRealCm2)} / nec ${fmt(p.calculo.asNecesarioCm2)} cm²/m · ⌀${p.diametroMm} hasta c/${fmt(p.separacionMaxMm, 0)} mm${p.calculo.mandaMinimo ? " · manda el mínimo" : ""}`}
                        />
                      ))}

                    <ArmadoMuroDiagrama
                      alturaMuroM={resultado.n.altMuro}
                      espesorMuroM={resultado.n.espMuro}
                      anchoZapataM={resultado.n.anchoZap}
                      cantoZapataM={resultado.n.cantoZap}
                      punteraM={resultado.n.puntera}
                      recubrimientoM={aNumero(recArm)}
                      hastial={{ nombre: "Hastial", cara: "interior", diametroMm: armado.hastial.diametroMm, separacionMm: armado.hastial.separacionMm, verifica: armado.hastial.verifica }}
                      talon={{ nombre: "Talón", cara: "superior", diametroMm: armado.talon.diametroMm, separacionMm: armado.talon.separacionMm, verifica: armado.talon.verifica }}
                      puntera={armado.puntera ? { nombre: "Puntera", cara: "inferior", diametroMm: armado.puntera.diametroMm, separacionMm: armado.puntera.separacionMm, verifica: armado.puntera.verifica } : null}
                    />

                    <PanelFormulas
                      titulo="Ver cálculo"
                      filas={[armado.hastial, armado.talon, armado.puntera]
                        .filter((p): p is NonNullable<typeof p> => p !== null)
                        .flatMap((p) => [
                          { etiqueta: `${p.calculo.nombre} · d`, valor: `${fmt(p.calculo.dM, 3)} m` },
                          { etiqueta: `${p.calculo.nombre} · μ`, valor: fmt(p.calculo.mu, 4) },
                          {
                            etiqueta: `${p.calculo.nombre} · As por momento`,
                            valor: Number.isFinite(p.calculo.asCalculadoCm2)
                              ? `${fmt(p.calculo.asCalculadoCm2)} cm²/m`
                              : "no da: engrosar la pieza",
                          },
                          { etiqueta: `${p.calculo.nombre} · mín. mecánico`, valor: `${fmt(p.calculo.asMinMecanicoCm2)} cm²/m` },
                          { etiqueta: `${p.calculo.nombre} · mín. geométrico`, valor: `${fmt(p.calculo.asMinGeometricoCm2)} cm²/m` },
                        ])}
                    />
                    <p className="text-xs text-muted-foreground">
                      El mínimo geométrico es el de elementos superficiales (1,8 ‰ de la sección
                      bruta). No sustituye a la armadura mínima de muros del art. 9.6 —vertical y
                      horizontal repartida en las dos caras—, que es una comprobación aparte.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 1 — solo zapata</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Vuelco (FS ≥ 1,5)"
                    verifica={resultado.r.vuelco.verifica}
                    detalle={`FS ${fmt(resultado.r.vuelco.factorSeguridad)} · M estab ${fmt(resultado.r.empujes.momentoEstabilizadorKNm)} / M volc ${fmt(resultado.r.empujes.momentoVolcadorKNm)} kN·m/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Deslizamiento (FS ≥ 1,5)"
                    verifica={resultado.r.deslizamientoSoloZapata.verifica}
                    detalle={`FS ${fmt(resultado.r.deslizamientoSoloZapata.factorSeguridad)} · Fh adm ${fmt(resultado.r.deslizamientoSoloZapata.fhAdmKN)} / Fh máx ${fmt(resultado.r.deslizamientoSoloZapata.fhMaxKN)} kN/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCaso1.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCaso1.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                  <PanelFormulas
                    titulo="Ver cálculo"
                    filas={[
                      { etiqueta: "Ka (con piso de 0,5)", valor: fmt(resultado.r.empujes.ka, 3) },
                      { etiqueta: "Kp", valor: fmt(resultado.r.empujes.kp, 3) },
                      { etiqueta: "Empuje del suelo", valor: `${fmt(resultado.r.empujes.empujeSueloKN)} kN/m` },
                      { etiqueta: "Empuje por sobrecarga", valor: `${fmt(resultado.r.empujes.empujeSobrecargaKN)} kN/m` },
                      { etiqueta: "Empuje pasivo", valor: `${fmt(resultado.r.empujes.empujePasivoKN)} kN/m` },
                      { etiqueta: "Peso alzado", valor: `${fmt(resultado.r.empujes.pesoMuroKN)} kN/m` },
                      { etiqueta: "Peso zapata", valor: `${fmt(resultado.r.empujes.pesoZapataKN)} kN/m` },
                      { etiqueta: "Peso suelo sobre zapata", valor: `${fmt(resultado.r.empujes.pesoSueloActivoKN)} kN/m` },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 2 — apoyo en contrapiso</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Deslizamiento con el contrapiso apuntalando"
                    verifica={resultado.r.deslizamientoApoyoContrapiso.verifica}
                    detalle={`FS ${fmt(resultado.r.deslizamientoApoyoContrapiso.factorSeguridad)} · sólo pasa R1 = ${fmt(Math.abs(resultado.r.apoyoContrapiso.r1KN))} kN/m por rozamiento`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCasos23.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por el contrapiso</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 = {fmt(resultado.r.apoyoContrapiso.r1KN)} kN/m · R2 = {fmt(resultado.r.apoyoContrapiso.r2KN)} kN/m
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Caso 3 — contrapiso y losa superior</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por las losas</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 (inferior) = {fmt(resultado.r.apoyoContrapisoYLosa.r1KN)} kN/m · R2 (superior) ={" "}
                      {fmt(resultado.r.apoyoContrapisoYLosa.r2KN)} kN/m
                    </p>
                  </div>
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    detalle={`σ ${fmt(resultado.r.tensionSueloCasos23.sigmaKPa)} / σ adm ${fmt(resultado.n.sigmaAdm)} kN/m²`}
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Al calcular el momento estabilizador, la planilla tomaba el peso del alzado con brazo A/2 en
                lugar del centro de gravedad del propio alzado; acá se usa esp/2, coherente con el brazo del
                suelo sobre la zapata y con la otra hoja de muros. Eso reduce el momento estabilizador, así
                que el resultado es más conservador que el de la planilla.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
