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
import { SeccionPlegable } from "@/components/verificaciones/SeccionPlegable";
import { BarraAcciones } from "@/components/verificaciones/BarraAcciones";
import { DiagramaMuro } from "@/components/verificaciones/DiagramaMuro";
import {
  CroquisApoyosMuro,
  CroquisGeometriaMuro,
  CroquisSueloMuro,
} from "@/components/verificaciones/croquis/CroquisMuro";
import {
  FS_DESLIZAMIENTO_MINIMO,
  FS_VUELCO_MINIMO,
  KA_MINIMO,
  areaPorMetroCm2,
  armarPieza,
  calcularMuroContencion,
  separacionParaAs,
} from "@/lib/calc/ec2/muro-contencion";
import type { ResultadoMuroContencion } from "@/lib/calc/ec2/muro-contencion";
import { derivarMateriales } from "@/lib/calc/ec2/materiales";
import { GAMMA_F } from "@/lib/calc/ec2/coeficientes";
import { ArmadoMuroDiagrama } from "@/components/verificaciones/hormigon/ArmadoMuroDiagrama";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "muros-contencion")!;

/** Los datos del formulario ya convertidos a número. */
interface NumerosMuro {
  gamma: number; phi: number; c: number; sigmaAdm: number;
  anchoZap: number; cantoZap: number; altMuro: number; espMuro: number;
  hAct: number; hPas: number; sobrecargaG: number; sobrecargaQ: number; puntera: number;
  l1Caso2: number; l1Caso3: number; l2Caso3: number;
}

/**
 * Desarrollo del caso 1, con los números metidos dentro de la fórmula.
 *
 * La expresión y su sustitución van en la etiqueta y el resultado en el valor,
 * así se puede seguir de dónde sale cada término sin salir de la página. Es la
 * diferencia entre una tabla de resultados y una memoria de cálculo auditable:
 * ver "Fh adm = N·tg φ + c·A = 26,83·tg 34° + 5,00·1,50" permite rehacer la
 * cuenta a mano; ver "Fh adm 20,60" obliga a confiar.
 */
function desarrolloCaso1(n: NumerosMuro, r: ResultadoMuroContencion) {
  const e = r.empujes;
  const desliz = r.deslizamientoSoloZapata;
  const tension = r.tensionSueloCaso1;
  const g = fmt(n.gamma, 0);
  const A = fmt(n.anchoZap);

  return [
    {
      etiqueta: "ka",
      formula: "(1 − sen φ)/(1 + sen φ)",
      sustitucion: `(1 − sen ${fmt(n.phi, 0)}°)/(1 + sen ${fmt(n.phi, 0)}°) = ${fmt(e.kaTeorico, 3)}${
        e.mandaPisoKa ? `, topado en ${fmt(KA_MINIMO, 2)}` : ""
      }`,
      valor: fmt(e.ka, 3),
    },
    { etiqueta: "kp", formula: "1 / ka", sustitucion: `1 / ${fmt(e.ka, 3)}`, valor: fmt(e.kp, 3) },

    {
      etiqueta: "Ea",
      formula: "½ · γ · ka · h²",
      sustitucion: `½ · ${g} · ${fmt(e.ka, 3)} · ${fmt(n.hAct)}²`,
      valor: `${fmt(e.empujeSueloKN)} kN/m`,
    },
    {
      etiqueta: "Eq",
      formula: "ka · (qg + qq) · h",
      sustitucion: `${fmt(e.ka, 3)} · (${fmt(n.sobrecargaG)} + ${fmt(n.sobrecargaQ)}) · ${fmt(n.hAct)}`,
      valor: `${fmt(e.empujeSobrecargaKN)} kN/m`,
    },
    ...(n.hPas > 0
      ? [
          {
            etiqueta: "Ep",
            formula: "½ · γ · kp · hp²",
            sustitucion: `½ · ${g} · ${fmt(e.kp, 3)} · ${fmt(n.hPas)}²`,
            valor: `${fmt(e.empujePasivoKN)} kN/m`,
          },
        ]
      : []),

    {
      etiqueta: "Peso muro",
      formula: "25 · esp · h",
      sustitucion: `25 · ${fmt(n.espMuro)} · ${fmt(n.altMuro)}`,
      valor: `${fmt(e.pesoMuroKN)} kN/m`,
    },
    {
      etiqueta: "Peso zapata",
      formula: "25 · canto · A",
      sustitucion: `25 · ${fmt(n.cantoZap)} · ${A}`,
      valor: `${fmt(e.pesoZapataKN)} kN/m`,
    },
    {
      etiqueta: "Peso suelo",
      formula: "γ · talón · (h − canto)",
      sustitucion: `${g} · ${fmt(e.talonM)} · ${fmt(e.alturaSobreTalonM)}`,
      valor: `${fmt(e.pesoSueloActivoKN)} kN/m`,
    },
    {
      etiqueta: "Carga perm.",
      formula: "qg · talón",
      sustitucion: `${fmt(n.sobrecargaG)} · ${fmt(e.talonM)}`,
      valor: `${fmt(e.cargaPermanenteKN)} kN/m`,
    },
    {
      etiqueta: "Sobrec. uso",
      formula: "qq · talón",
      sustitucion: `${fmt(n.sobrecargaQ)} · ${fmt(e.talonM)}  (no estabiliza: favorable)`,
      valor: `${fmt(e.cargaUsoKN)} kN/m`,
    },

    {
      etiqueta: "M volc",
      formula: "Ea · h/3 + Eq · h/2",
      sustitucion: `${fmt(e.empujeSueloKN)} · ${fmt(n.hAct / 3)} + ${fmt(e.empujeSobrecargaKN)} · ${fmt(n.hAct / 2)}`,
      valor: `${fmt(e.momentoVolcadorKNm)} kN·m/m`,
    },
    {
      etiqueta: "M estab",
      formula: "Σ (peso · brazo) + carga perm. · brazo talón",
      sustitucion: `${fmt(e.pesoMuroKN)} · ${fmt(n.puntera + n.espMuro / 2)} + ${fmt(e.pesoZapataKN)} · ${fmt(n.anchoZap / 2)} + ${fmt(e.pesoSueloActivoKN)} · ${fmt(e.brazoTalonM)} + ${fmt(e.cargaPermanenteKN)} · ${fmt(e.brazoTalonM)}`,
      valor: `${fmt(e.momentoEstabilizadorKNm)} kN·m/m`,
    },
    {
      etiqueta: "FS vuelco",
      formula: "M estab / M volc",
      sustitucion: `${fmt(e.momentoEstabilizadorKNm)} / ${fmt(e.momentoVolcadorKNm)}`,
      valor: fmt(r.vuelco.factorSeguridad),
    },

    {
      etiqueta: "Fh máx",
      formula: "Ea + Eq   (el pasivo no se cuenta)",
      sustitucion: `${fmt(e.empujeSueloKN)} + ${fmt(e.empujeSobrecargaKN)}`,
      valor: `${fmt(desliz.fhMaxKN)} kN/m`,
    },
    {
      etiqueta: "N desliz",
      formula: "pesos propios + carga perm.",
      sustitucion: `${fmt(e.pesoMuroKN + e.pesoZapataKN + e.pesoSueloActivoKN + e.pesoSueloPasivoKN)} + ${fmt(e.cargaPermanenteKN)}`,
      valor: `${fmt(desliz.nKN)} kN/m`,
    },
    {
      etiqueta: "Fh adm",
      formula: "N · tg(⅔·φ) + c* · A,  con c* = mín(0,5·c ; 50)",
      sustitucion: `${fmt(desliz.nKN)} · tg ${fmt((2 / 3) * n.phi, 1)}° + ${fmt(Math.min(0.5 * n.c, 50))} · ${A}`,
      valor: `${fmt(desliz.fhAdmKN)} kN/m`,
    },
    {
      etiqueta: "FS desliz",
      formula: "Fh adm / Fh máx",
      sustitucion: `${fmt(desliz.fhAdmKN)} / ${fmt(desliz.fhMaxKN)}`,
      valor: fmt(desliz.factorSeguridad),
    },

    {
      etiqueta: "N tensión",
      formula: "pesos propios + carga perm. + sobrec. uso",
      sustitucion: `${fmt(e.pesoMuroKN + e.pesoZapataKN + e.pesoSueloActivoKN + e.pesoSueloPasivoKN)} + ${fmt(e.cargaPermanenteKN)} + ${fmt(e.cargaUsoKN)}`,
      valor: `${fmt(tension.nKN)} kN/m`,
    },
    {
      etiqueta: "M estab σ",
      formula: "Σ (peso · brazo) + (carga perm. + sobrec. uso) · brazo talón",
      sustitucion: `igual que el del vuelco, más ${fmt(e.cargaUsoKN)} · ${fmt(e.brazoTalonM)} de la sobrecarga de uso`,
      valor: `${fmt(tension.momentoEstabilizadorKNm)} kN·m/m`,
    },
    {
      etiqueta: "d",
      formula: "(M estab σ − M volc) / N",
      sustitucion: `(${fmt(tension.momentoEstabilizadorKNm)} − ${fmt(e.momentoVolcadorKNm)}) / ${fmt(tension.nKN)}`,
      valor: `${fmt(tension.brazoResultanteM, 3)} m desde la puntera`,
    },
    {
      etiqueta: "e",
      formula: "A/2 − d",
      sustitucion: `${fmt(n.anchoZap / 2)} − ${fmt(tension.brazoResultanteM, 3)}`,
      valor: `${fmt(tension.excentricidadM, 3)} m  ${
        tension.resultanteEnNucleo ? "≤" : ">"
      } A/6 = ${fmt(n.anchoZap / 6, 3)}`,
    },
    {
      etiqueta: "σ",
      formula: tension.resultanteEnNucleo
        ? "N/A · (1 + 6e/A)   ley trapecial"
        : "2N / (3d)   ley triangular, el terreno no tracciona",
      sustitucion: tension.resultanteEnNucleo
        ? `${fmt(tension.nKN)}/${A} · (1 + 6 · ${fmt(Math.abs(tension.excentricidadM), 3)}/${A})`
        : `2 · ${fmt(tension.nKN)} / (3 · ${fmt(n.anchoZap / 2 - Math.abs(tension.excentricidadM), 3)})`,
      valor: `${fmt(tension.sigmaKPa)} kN/m²`,
    },
  ];
}

/**
 * Desarrollo de los momentos con los que se arma cada pieza.
 *
 * Las tres son voladizos independientes y con cargas de sentidos distintos, así
 * que no hay una fórmula común: el hastial lo empuja el terreno de costado, al
 * talón lo baja lo que tiene encima, y a la puntera la levanta la reacción del
 * suelo. Verlos separados es lo que explica por qué la armadura cambia de cara
 * en cada uno.
 *
 * Los tres salen ya mayorados con γf: son momentos de cálculo, listos para
 * dimensionar, a diferencia de los del vuelco que van sin mayorar.
 */
function desarrolloMomentos(n: NumerosMuro, r: ResultadoMuroContencion) {
  const m = r.momentos;
  const g = fmt(n.gamma, 0);
  const q = n.sobrecargaG + n.sobrecargaQ;
  const gf = fmt(GAMMA_F, 1);

  const filas = [
    {
      etiqueta: "h hastial",
      formula: "mín(h − canto ; altura del alzado)",
      sustitucion: `mín(${fmt(n.hAct)} − ${fmt(n.cantoZap)} ; ${fmt(n.altMuro)})`,
      valor: `${fmt(m.alturaHastialM)} m`,
    },
    {
      etiqueta: "Ea hastial",
      formula: "½ · γ · ka · h²",
      sustitucion: `½ · ${g} · ${fmt(r.empujes.ka, 3)} · ${fmt(m.alturaHastialM)}²`,
      valor: `${fmt(m.empujeSueloHastialKN)} kN/m`,
    },
    {
      etiqueta: "Eq hastial",
      formula: "ka · q · h",
      sustitucion: `${fmt(r.empujes.ka, 3)} · ${fmt(q)} · ${fmt(m.alturaHastialM)}`,
      valor: `${fmt(m.empujeSobrecargaHastialKN)} kN/m`,
    },
    {
      etiqueta: "M hastial",
      formula: "γf · (Ea · h/3 + Eq · h/2)",
      sustitucion: `${gf} · (${fmt(m.empujeSueloHastialKN)} · ${fmt(m.alturaHastialM / 3)} + ${fmt(m.empujeSobrecargaHastialKN)} · ${fmt(m.alturaHastialM / 2)})`,
      valor: `${fmt(m.hastialKNm)} kN·m/m`,
    },

    {
      etiqueta: "Carga talón",
      formula: "γ · (h − canto) + q + 25 · canto",
      sustitucion: `${g} · ${fmt(r.empujes.alturaSobreTalonM)} + ${fmt(q)} + 25 · ${fmt(n.cantoZap)}`,
      valor: `${fmt(m.cargaSobreTalonKPa)} kN/m²`,
    },
    {
      etiqueta: "M talón",
      formula: "γf · carga · talón² / 2",
      sustitucion: `${gf} · ${fmt(m.cargaSobreTalonKPa)} · ${fmt(m.talonM)}² / 2`,
      valor: `${fmt(m.talonKNm)} kN·m/m`,
    },
  ];

  if (m.punteraM <= 0) return filas;

  /*
   * La puntera se resuelve con el trapecio de presiones bajo la base, no con una
   * presión media: la reacción no es uniforme y el borde es donde más levanta.
   */
  return filas.concat([
    {
      etiqueta: "σ borde",
      formula: "N/A + M/(A²/6)",
      sustitucion: `${fmt(r.tensionSueloCaso1.nKN)}/${fmt(n.anchoZap)} + ${fmt(r.tensionSueloCaso1.momentoKNm)}/${fmt(n.anchoZap ** 2 / 6, 3)}`,
      valor: `${fmt(m.sigmaPunteraBordeKPa)} kN/m²`,
    },
    {
      etiqueta: "σ arranque",
      formula: "σ media + gradiente · (1 − 2·puntera/A)",
      sustitucion: `en el arranque del hastial, a ${fmt(m.punteraM)} m del borde`,
      valor: `${fmt(m.sigmaPunteraArranqueKPa)} kN/m²`,
    },
    {
      etiqueta: "M puntera",
      formula: "γf · (trapecio de presiones − peso propio de la losa)",
      sustitucion: `sobre un vuelo de ${fmt(m.punteraM)} m, descontando 25 · ${fmt(n.cantoZap)} · ${fmt(m.punteraM)}`,
      valor: `${fmt(m.punteraKNm)} kN·m/m`,
    },
  ]);
}

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
  const [sobrecargaG, setSobrecargaG] = useCampo("sobrecargaG", "0");
  const [sobrecargaQ, setSobrecargaQ] = useCampo("sobrecargaQ", "5");
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
    const n: NumerosMuro = {
      gamma: aNumero(gamma), phi: aNumero(phi), c: aNumero(c), sigmaAdm: aNumero(sigmaAdm),
      anchoZap: aNumero(anchoZap), cantoZap: aNumero(cantoZap), altMuro: aNumero(altMuro),
      espMuro: aNumero(espMuro), hAct: aNumero(hAct), hPas: aNumero(hPas),
      sobrecargaG: aNumero(sobrecargaG), sobrecargaQ: aNumero(sobrecargaQ),
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
          sobrecargaPermanenteKPa: n.sobrecargaG, sobrecargaUsoKPa: n.sobrecargaQ,
          punteraM: n.puntera,
        },
        { l1Caso2M: n.l1Caso2, l1Caso3M: n.l1Caso3, l2Caso3M: n.l2Caso3 }
      ),
    };
  }, [gamma, phi, c, sigmaAdm, anchoZap, cantoZap, altMuro, espMuro, hAct, hPas, sobrecargaG, sobrecargaQ, puntera, l1Caso2, l1Caso3, l2Caso3]);

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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
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
              alturaSueloPasivoM={resultado.n.hPas}
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

                <PanelAyuda titulo="De dónde salen ka y kp, y en qué caso valen">
                  <p>
                    Los dos coeficientes se calculan solos a partir de φ, con las expresiones de
                    Rankine:
                  </p>
                  <p className="py-1 text-center font-mono text-[13px] text-foreground">
                    k<sub>a</sub> = (1 − sen φ) / (1 + sen φ)
                    <span className="px-3 text-muted-foreground">·</span>
                    k<sub>p</sub> = (1 + sen φ) / (1 − sen φ)
                  </p>
                  <p>
                    Son recíprocos: k<sub>a</sub>·k<sub>p</sub> = 1. Con φ = 34°, k<sub>a</sub> ≈
                    0,283 y k<sub>p</sub> ≈ 3,54: el terreno empuja con menos de un tercio de lo que
                    pesa y resiste con más del triple.
                  </p>
                  <p>
                    <strong className="text-foreground">Esas fórmulas valen en un caso concreto</strong>,
                    el más habitual, definido por tres condiciones:
                  </p>
                  <p>
                    <strong className="text-foreground">i = 0</strong> — el terreno de arriba está
                    horizontal, sin talud. Si el relleno sube en pendiente, el empuje es mayor y hay
                    que corregir.
                  </p>
                  <p>
                    <strong className="text-foreground">β = 90°</strong> — el trasdós del muro, la
                    cara contra la que apoya la tierra, es vertical. Un muro inclinado recibe además
                    el peso del suelo que le queda encima.
                  </p>
                  <p>
                    <strong className="text-foreground">δ = 0</strong> — no se cuenta el rozamiento
                    entre la tierra y el muro. Existe y ayuda, pero despreciarlo deja del lado
                    seguro y evita depender de cómo quede la cara del hormigón.
                  </p>
                  <p>
                    Con las tres, el empuje sale horizontal y depende sólo de φ, que es lo que hace
                    la expresión tan corta. Fuera de este caso hay que ir a la formulación general
                    de Coulomb, que sí toma i, β y δ.
                  </p>
                  <p>
                    La planilla original topaba k<sub>a</sub> por abajo en 0,5, más conservador que
                    el valor teórico. Ese piso se quitó: lo que se ve es el valor de la fórmula, sin
                    recortes.
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
              <CampoNumerico id="sobrecargaG" etiqueta="Carga permanente" sufijo="kN/m²" valor={sobrecargaG} onChange={setSobrecargaG} />
              <CampoNumerico id="sobrecargaQ" etiqueta="Sobrecarga de uso" sufijo="kN/m²" valor={sobrecargaQ} onChange={setSobrecargaQ} />
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
                    sobrecargaKPa={aNumero(sobrecargaG) + aNumero(sobrecargaQ)}
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

              {/*
                La estabilidad va antes que el armado: primero se define la
                geometría —si el muro vuelca o desliza, el armado no importa— y
                recién con la sección resuelta tiene sentido mirar las barras.
              */}
              <Card>
                <CardHeader><CardTitle className="text-base">Caso 1 — solo zapata</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Vuelco"
                    verifica={resultado.r.vuelco.verifica}
                    comparacion={{
                      real: { etiqueta: "FS", valor: resultado.r.vuelco.factorSeguridad },
                      limite: { etiqueta: "FS mín", valor: FS_VUELCO_MINIMO },
                      exige: "≥",
                    }}
                    detalle={`M estab ${fmt(resultado.r.empujes.momentoEstabilizadorKNm)} / M volc ${fmt(resultado.r.empujes.momentoVolcadorKNm)} kN·m/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Deslizamiento"
                    verifica={resultado.r.deslizamientoSoloZapata.verifica}
                    comparacion={{
                      real: { etiqueta: "FS", valor: resultado.r.deslizamientoSoloZapata.factorSeguridad },
                      limite: { etiqueta: "FS mín", valor: FS_DESLIZAMIENTO_MINIMO },
                      exige: "≥",
                    }}
                    detalle={`Fh adm ${fmt(resultado.r.deslizamientoSoloZapata.fhAdmKN)} / Fh máx ${fmt(resultado.r.deslizamientoSoloZapata.fhMaxKN)} kN/m`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCaso1.verifica}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.tensionSueloCaso1.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: resultado.n.sigmaAdm },
                      unidad: "kN/m²",
                      exige: "≤",
                    }}
                  />
                  <PanelFormulas titulo="Ver cálculo" filas={desarrolloCaso1(resultado.n, resultado.r)} />

                  <PanelAyuda titulo="De dónde sale la tensión sobre el terreno">
                    <p>
                      No es <span className="font-mono">N/A</span>. Eso valdría si la carga
                      estuviera centrada, y en un muro nunca lo está: el empuje la corre hacia la
                      puntera. Hay que ubicar primero por dónde pasa la resultante.
                    </p>
                    <p>
                      <strong className="text-foreground">Dónde cae la resultante.</strong> Se toman
                      momentos respecto de la puntera. Lo que baja estabiliza y lo que empuja vuelca,
                      así que la resultante pasa a una distancia{" "}
                      <span className="font-mono">d = (M estab − M volc) / N</span> del borde
                      delantero. Su separación del centro de la zapata es{" "}
                      <span className="font-mono">e = A/2 − d</span>.
                    </p>
                    <p>
                      <strong className="text-foreground">El momento no es el mismo que el del
                      vuelco.</strong> Ahí la sobrecarga de uso es favorable y va con cero; acá pesa,
                      porque para el terreno bajar es desfavorable. Por eso figuran dos momentos
                      estabilizadores distintos en el desarrollo del cálculo.
                    </p>
                    <p>
                      <strong className="text-foreground">Si e ≤ A/6</strong> —la resultante cae
                      dentro del núcleo central— toda la base comprime y la ley es trapecial:{" "}
                      <span className="font-mono">σ = N/A · (1 + 6e/A)</span>. El término{" "}
                      <span className="font-mono">6e/A</span> es cuánto desnivela la excentricidad
                      una presión que si no sería uniforme.
                    </p>
                    <p>
                      <strong className="text-foreground">Si e &gt; A/6</strong>, esa fórmula daría
                      tracción en el borde de atrás, y el terreno no tracciona: la zapata se despega.
                      El contacto se reduce a <span className="font-mono">3d</span> y la ley pasa a
                      ser triangular, con{" "}
                      <span className="font-mono">σ = 2N / (3d)</span>. El pico sube bastante, así
                      que usar la fórmula lineal en este caso queda del lado inseguro.
                    </p>
                    <p>
                      Conviene que la resultante entre en el núcleo. Si se sale mucho —pasado{" "}
                      <span className="font-mono">A/3</span>— la presión se dispara con cambios
                      chicos de la excentricidad, y lo que corresponde es ensanchar la zapata o
                      darle puntera, no seguir afinando.
                    </p>
                    <p className="text-[11px] opacity-70">
                      Método: Jiménez Montoya, 15ª ed., §25.2.6, pág. 404.
                    </p>
                  </PanelAyuda>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Momentos para armar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PanelFormulas titulo="Ver cálculo" filas={desarrolloMomentos(resultado.n, resultado.r)} />
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
                          comparacion={{
                            real: { etiqueta: "As real", valor: p.asRealCm2 },
                            limite: { etiqueta: "As nec", valor: p.calculo.asNecesarioCm2 },
                            unidad: "cm²/m",
                            exige: "≥",
                          }}
                          detalle={`⌀${p.diametroMm} hasta c/${fmt(p.separacionMaxMm, 0)} mm${p.calculo.mandaMinimo ? " · manda el mínimo" : ""}`}
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

              {/*
                Los casos apuntalados van al final y plegados: son hipótesis
                particulares —el muro necesita que el contrapiso o la losa lo
                sujeten— y abiertos competían en peso con la comprobación
                principal aunque casi siempre no correspondan.
              */}
              <SeccionPlegable
                titulo="Otros casos — muro apuntalado"
                resumen="Si el muro solo no verifica, se lo puede apoyar en el contrapiso, o en el contrapiso y una losa superior. Cambian las reacciones y la tensión del suelo."
              >
                {/*
                  Los apoyos se cargan acá adentro y no arriba con el resto de
                  los datos: sólo intervienen en estos dos casos, y en la columna
                  de datos pedían medidas de un contrapiso y una losa que la
                  mayoría de las veces no existen.
                */}
                <div className="space-y-3">
                  <p className="spec-label">Posición de los apoyos</p>
                  <CroquisApoyosMuro />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <CampoNumerico id="l1Caso2" etiqueta="L1 · altura del contrapiso" sufijo="m" valor={l1Caso2} onChange={setL1Caso2} />
                    <CampoNumerico id="l1Caso3" etiqueta="L1 · altura del contrapiso" sufijo="m" valor={l1Caso3} onChange={setL1Caso3} />
                    <CampoNumerico id="l2Caso3" etiqueta="L2 · contrapiso a losa" sufijo="m" valor={l2Caso3} onChange={setL2Caso3} />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-6">
                  <p className="spec-label">Caso 2 — apoyo en contrapiso</p>
                  <ResultadoCheck
                    etiqueta="Deslizamiento con el contrapiso apuntalando"
                    verifica={resultado.r.deslizamientoApoyoContrapiso.verifica}
                    comparacion={{
                      real: { etiqueta: "FS", valor: resultado.r.deslizamientoApoyoContrapiso.factorSeguridad },
                      limite: { etiqueta: "FS mín", valor: FS_DESLIZAMIENTO_MINIMO },
                      exige: "≥",
                    }}
                    detalle={`Sólo pasa R1 = ${fmt(Math.abs(resultado.r.apoyoContrapiso.r1KN))} kN/m por rozamiento`}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCasos23.verifica}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.tensionSueloCasos23.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: resultado.n.sigmaAdm },
                      unidad: "kN/m²",
                      exige: "≤",
                    }}
                  />
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Reacciones a llevar por el contrapiso</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      R1 = {fmt(resultado.r.apoyoContrapiso.r1KN)} kN/m · R2 = {fmt(resultado.r.apoyoContrapiso.r2KN)} kN/m
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-6">
                  <p className="spec-label">Caso 3 — contrapiso y losa superior</p>
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
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.tensionSueloCasos23.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: resultado.n.sigmaAdm },
                      unidad: "kN/m²",
                      exige: "≤",
                    }}
                  />
                </div>
              </SeccionPlegable>

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
