"use client";

import { useMemo } from "react";
import { useCampo } from "@/lib/hooks/useCampo";
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
import { DiagramaEmpujesMuro } from "@/components/verificaciones/hormigon/DiagramaEmpujesMuro";
import { PredimensionadoMuro } from "@/components/verificaciones/hormigon/PredimensionadoMuro";
import { AccionesElementosMuro } from "@/components/verificaciones/hormigon/AccionesElementosMuro";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import { SeccionPlegable } from "@/components/verificaciones/comun/SeccionPlegable";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { DiagramaMuro } from "@/components/verificaciones/hormigon/DiagramaMuro";
import {
  CroquisApoyosMuro,
  CroquisGeometriaMuro,
  CroquisSueloMuro,
} from "@/components/verificaciones/croquis/CroquisMuro";
import {
  CUANTIA_GEOMETRICA_MINIMA,
  FS_DESLIZAMIENTO_MINIMO,
  FS_VUELCO_MINIMO,
  KA_MINIMO,
} from "@/lib/calc/hormigon/muros/contencion";
import type { ArmaduraPieza, ResultadoMuroContencion } from "@/lib/calc/hormigon/muros/contencion";
import { GAMMA_G, GAMMA_Q } from "@/lib/calc/hormigon/comun/coeficientes";
import { ArmadoMuroDiagrama } from "@/components/verificaciones/hormigon/ArmadoMuroDiagrama";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { resolverMuroContencion, type NumerosMuro } from "@/lib/calc/hormigon/muros/resolver-muro-contencion";
import { recomendarMuroContencion } from "@/lib/verificaciones/recomendaciones/muro-contencion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const meta = registroVerificaciones.find((v) => v.id === "muros-contencion")!;

const ETAPAS = [
  { id: "suelo", titulo: "Suelo" },
  { id: "geometria", titulo: "Geometría" },
  { id: "terreno", titulo: "Terreno" },
  { id: "armadura", titulo: "Armadura" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

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
      formula: "N · tg φ + c* · A,  con c* = mín(0,5·c ; 50)",
      sustitucion: `${fmt(desliz.nKN)} · tg ${fmt(n.phi, 0)}° + ${fmt(Math.min(0.5 * n.c, 50))} · ${A}`,
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
      etiqueta: "Eq,g hastial",
      formula: "ka · qg · h",
      sustitucion: `${fmt(r.empujes.ka, 3)} · ${fmt(n.sobrecargaG)} · ${fmt(m.alturaHastialM)}`,
      valor: `${fmt(m.empujeSobrecargaPermHastialKN)} kN/m`,
    },
    {
      etiqueta: "Eq,q hastial",
      formula: "ka · qq · h",
      sustitucion: `${fmt(r.empujes.ka, 3)} · ${fmt(n.sobrecargaQ)} · ${fmt(m.alturaHastialM)}`,
      valor: `${fmt(m.empujeSobrecargaUsoHastialKN)} kN/m`,
    },
    {
      etiqueta: "M hastial",
      formula: "γG · (Ea · h/3 + Eq,g · h/2) + γQ · Eq,q · h/2",
      sustitucion: `${fmt(GAMMA_G, 2)} · (${fmt(m.empujeSueloHastialKN)} · ${fmt(m.alturaHastialM / 3)} + ${fmt(m.empujeSobrecargaPermHastialKN)} · ${fmt(m.alturaHastialM / 2)}) + ${fmt(GAMMA_Q, 2)} · ${fmt(m.empujeSobrecargaUsoHastialKN)} · ${fmt(m.alturaHastialM / 2)}`,
      valor: `${fmt(m.hastialKNm)} kN·m/m`,
    },

    {
      etiqueta: "Carga talón",
      formula: "γ · (h − canto) + qg + qq + 25 · canto",
      sustitucion: `${g} · ${fmt(r.empujes.alturaSobreTalonM)} + ${fmt(n.sobrecargaG)} + ${fmt(n.sobrecargaQ)} + 25 · ${fmt(n.cantoZap)}`,
      valor: `${fmt(m.cargaSobreTalonKPa)} kN/m²`,
    },
    {
      etiqueta: "M talón",
      formula: "(γG · carga perm. + γQ · qq) · talón² / 2",
      sustitucion: `(${fmt(GAMMA_G, 2)} · ${fmt(m.cargaSobreTalonKPa - n.sobrecargaQ)} + ${fmt(GAMMA_Q, 2)} · ${fmt(n.sobrecargaQ)}) · ${fmt(m.talonM)}² / 2`,
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
      formula: "trapecio de presiones (ELU) − γG · peso propio de la losa",
      sustitucion: `presiones ya mayoradas sobre un vuelo de ${fmt(m.punteraM)} m, menos ${fmt(GAMMA_G, 2)} · 25 · ${fmt(n.cantoZap)} de peso propio`,
      valor: `${fmt(m.punteraKNm)} kN·m/m`,
    },
  ]);
}

/**
 * Desarrollo del armado de una pieza, del momento a las barras.
 *
 * El planteo es el adimensional de siempre: se lleva el momento a μ, de ahí sale
 * la cuantía mecánica ω, y de ω el área. Tenerlo escrito importa porque el paso
 * de μ a ω es el único que no se puede seguir de memoria, y porque muchas veces
 * el área que manda no es la del momento sino un mínimo, y conviene ver cuál.
 */
function desarrolloArmado(
  p: { calculo: ArmaduraPieza; asRealCm2: number; diametroMm: number; separacionMm: number },
  fcdMPa: number,
  fydMPa: number,
  recubrimientoM: number
) {
  const c = p.calculo;
  const nombre = c.nombre;
  const fcd = fmt(fcdMPa, 1);
  const fyd = fmt(fydMPa, 1);

  const noDa = !Number.isFinite(c.asCalculadoCm2);

  return [
    {
      etiqueta: `${nombre} · d`,
      formula: "canto − recubrimiento mecánico",
      sustitucion: `${fmt(c.hM)} − ${fmt(recubrimientoM)}`,
      valor: `${fmt(c.dM, 3)} m`,
    },
    {
      etiqueta: `${nombre} · μ`,
      formula: "M / (b · d² · fcd),  con b = 1 m",
      sustitucion: `${fmt(c.momentoKNm)} / (1 · ${fmt(c.dM, 3)}² · ${fcd} · 1000)`,
      valor: fmt(c.mu, 4),
    },
    {
      etiqueta: `${nombre} · ω`,
      formula: noDa ? "1 − √(1 − 2μ)   con μ ≥ 0,50 la raíz no existe" : "1 − √(1 − 2μ)",
      sustitucion: noDa
        ? "la sección no da como simplemente armada: hay que engrosarla"
        : `1 − √(1 − 2 · ${fmt(c.mu, 4)})`,
      valor: noDa ? "—" : fmt(c.omega, 4),
    },
    {
      etiqueta: `${nombre} · As por momento`,
      formula: "ω · b · d · fcd / fyd",
      sustitucion: noDa
        ? "sin ω no hay área que calcular"
        : `${fmt(c.omega, 4)} · 1 · ${fmt(c.dM, 3)} · ${fcd} / ${fyd}`,
      valor: noDa ? "no da: engrosar la pieza" : `${fmt(c.asCalculadoCm2)} cm²/m`,
    },
    {
      etiqueta: `${nombre} · As mín mecánico`,
      formula: "0,045 · b · d · fcd / fyd",
      sustitucion: `0,045 · 1 · ${fmt(c.dM, 3)} · ${fcd} / ${fyd}`,
      valor: `${fmt(c.asMinMecanicoCm2)} cm²/m`,
    },
    {
      etiqueta: `${nombre} · As mín geométrico`,
      formula: "1,8 ‰ · b · canto   (va con el canto total, no con el útil)",
      sustitucion: `${fmt(CUANTIA_GEOMETRICA_MINIMA * 1000, 1)}/1000 · 1 · ${fmt(c.hM)}`,
      valor: `${fmt(c.asMinGeometricoCm2)} cm²/m`,
    },
    {
      etiqueta: `${nombre} · As necesario`,
      formula: "máx(por momento ; mín mecánico ; mín geométrico)",
      sustitucion: c.mandaMinimo
        ? "manda un mínimo, no el momento"
        : "manda el momento",
      valor: `${fmt(c.asNecesarioCm2)} cm²/m`,
    },
    {
      etiqueta: `${nombre} · As real`,
      formula: "área de una barra · 1000 / separación",
      sustitucion: `π · ${fmt(p.diametroMm / 10, 2)}²/4 · 1000 / ${fmt(p.separacionMm, 0)}`,
      valor: `${fmt(p.asRealCm2)} cm²/m`,
    },
  ];
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

  const campos = useMemo(
    () => ({ gamma, phi, c, sigmaAdm, anchoZap, cantoZap, altMuro, espMuro, hAct, hPas, sobrecargaG, sobrecargaQ, puntera, fck, fyk, recArm, phiHastial, sepHastial, phiTalon, sepTalon, phiPuntera, sepPuntera, l1Caso2, l1Caso3, l2Caso3 }),
    [gamma, phi, c, sigmaAdm, anchoZap, cantoZap, altMuro, espMuro, hAct, hPas, sobrecargaG, sobrecargaQ, puntera, fck, fyk, recArm, phiHastial, sepHastial, phiTalon, sepTalon, phiPuntera, sepPuntera, l1Caso2, l1Caso3, l2Caso3]
  );
  const resultado = useMemo(() => resolverMuroContencion(campos), [campos]);
  const armado = resultado?.armado ?? null;
  // Cambios recalculados para lo que no cumple o queda justo.
  const propuestas = useMemo(() => recomendarMuroContencion(campos), [campos]);

  const avisos: AvisoRevision[] = [];
  if (!resultado) {
    avisos.push({ tipo: "error", texto: "Hay datos vacíos o no válidos: el espesor del muro y la puntera tienen que dejar talón dentro de la zapata." });
  } else {
    if (!resultado.r.tensionSueloCaso1.resultanteEnNucleo)
      avisos.push({ tipo: "aviso", texto: "La resultante sale del núcleo central (e > A/6): la base se despega y la ley de presiones pasa a triangular." });
    if (resultado.r.empujes.mandaPisoKa)
      avisos.push({ tipo: "aviso", texto: `ka por Rankine da ${fmt(resultado.r.empujes.kaTeorico, 3)}; manda el piso de ${fmt(KA_MINIMO, 2)}.` });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Contención · verificación por metro</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="suelo" numero={1} titulo="Suelo" descripcion="Parámetros del relleno y del terreno de apoyo.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="gamma" etiqueta="γ" sufijo="kN/m³" valor={gamma} onChange={setGamma} />
                  <CampoNumerico id="phi" etiqueta="φ" sufijo="°" valor={phi} onChange={setPhi} />
                  <CampoNumerico id="c" etiqueta="Cohesión c" sufijo="kPa" valor={c} onChange={setC} />
                  <CampoNumerico id="sigmaAdm" etiqueta="σ adm." sufijo="kN/m²" valor={sigmaAdm} onChange={setSigmaAdm} />
                </div>
                <PanelAyuda titulo="Qué es cada parámetro del suelo">
                  <p>
                    <strong className="text-foreground">γ</strong> multiplica todo el empuje (17–21 kN/m³
                    en suelos corrientes). <strong className="text-foreground">φ</strong> es el que más
                    manda: entra en ka. <strong className="text-foreground">c</strong> sólo suma
                    adherencia al deslizamiento, y no conviene confiar en ella si el terreno se satura.
                    <strong className="text-foreground"> σ adm.</strong> sale del estudio de suelos y
                    limita el ancho de zapata.
                  </p>
                </PanelAyuda>
                <PanelAyuda titulo="De dónde salen ka y kp, y en qué caso valen">
                  <p>
                    Rankine: ka = (1 − sen φ)/(1 + sen φ) y kp = 1/ka, válidos con el terreno
                    horizontal (i = 0), trasdós vertical (β = 90°) y sin rozamiento tierra-muro (δ = 0).
                    Fuera de ese caso hay que ir a Coulomb.
                  </p>
                  <p>
                    A ka se le pone un piso de {fmt(KA_MINIMO, 2)} porque φ es el dato menos confiable.
                    Por eso el rozamiento de la base va con φ pleno y no con tg(⅔·φ) (Jiménez Montoya,
                    §25.11.2 b): aplicar las dos precauciones castigaría φ dos veces. La cohesión sí se
                    reduce: c* = mín(0,5·c ; 50 kPa).
                  </p>
                </PanelAyuda>
              </>
            }
            dibujo={<CroquisSueloMuro />}
          />
        </Etapa>

        <Etapa id="geometria" numero={2} titulo="Geometría" descripcion="Zapata, alzado y puntera.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumerico id="anchoZap" etiqueta="A zapata" sufijo="m" valor={anchoZap} onChange={setAnchoZap} />
                  <CampoNumerico id="cantoZap" etiqueta="H zapata" sufijo="m" valor={cantoZap} onChange={setCantoZap} />
                  <CampoNumerico id="altMuro" etiqueta="H muro" sufijo="m" valor={altMuro} onChange={setAltMuro} />
                  <CampoNumerico id="espMuro" etiqueta="Espesor muro" sufijo="m" valor={espMuro} onChange={setEspMuro} />
                  <CampoNumerico id="puntera" etiqueta="Puntera" sufijo="m" valor={puntera} onChange={setPuntera} />
                </div>
                <PanelAyuda titulo="Qué es la puntera y cuándo va en cero">
                  <p>
                    Es el vuelo de la zapata por delante del hastial. En cero es un caso real: un muro
                    contra un límite de propiedad no puede volar hacia ese lado, y toda la zapata es
                    talón. Sin puntera el muro pierde brazo estabilizador y el vuelco se vuelve más
                    exigente.
                  </p>
                </PanelAyuda>
                <PredimensionadoMuro
                  alturaTotalM={aNumero(altMuro) + aNumero(cantoZap) || 3.5}
                  onAplicar={(d) => {
                    setAnchoZap(String(d.anchoZapataM));
                    setCantoZap(String(d.cantoZapataM));
                    setAltMuro(String(d.alturaMuroM));
                    setEspMuro(String(d.espesorMuroM));
                  }}
                />
              </>
            }
            dibujo={
              resultado ? (
                <DiagramaMuro
                  anchoZapataM={resultado.n.anchoZap}
                  cantoZapataM={resultado.n.cantoZap}
                  alturaMuroM={resultado.n.altMuro}
                  espesorMuroM={resultado.n.espMuro}
                  alturaSueloActivoM={resultado.n.hAct}
                  alturaSueloPasivoM={resultado.n.hPas}
                  punteraM={resultado.n.puntera}
                />
              ) : (
                <CroquisGeometriaMuro />
              )
            }
          />
        </Etapa>

        <Etapa id="terreno" numero={3} titulo="Terreno y sobrecarga" descripcion="Tierra retenida, tierra delante y cargas sobre el relleno.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CampoNumerico id="hAct" etiqueta="h activo" sufijo="m" valor={hAct} onChange={setHAct} />
              <CampoNumerico id="hPas" etiqueta="h pasivo" sufijo="m" valor={hPas} onChange={setHPas} />
              <CampoNumerico id="sobrecargaG" etiqueta="Carga permanente" sufijo="kN/m²" valor={sobrecargaG} onChange={setSobrecargaG} />
              <CampoNumerico id="sobrecargaQ" etiqueta="Sobrecarga de uso" sufijo="kN/m²" valor={sobrecargaQ} onChange={setSobrecargaQ} />
            </div>
            <PanelAyuda titulo="Qué es cada dato del terreno y la sobrecarga">
              <p>
                <strong className="text-foreground">h activo</strong>: tierra retenida desde la base de
                la zapata; el empuje crece al cuadrado. <strong className="text-foreground">h pasivo</strong>:
                tierra delante, que resiste; suele dejarse en cero porque puede excavarse.
                <strong className="text-foreground"> Sobrecarga</strong>: la q del diagrama, un empuje
                ka·q constante en toda la altura.
              </p>
            </PanelAyuda>
            <SeccionPlegable
              titulo="Apoyos para los casos apuntalados (opcional)"
              resumen="Sólo si el muro se apoya en el contrapiso, o en el contrapiso y una losa superior."
            >
              <div className="space-y-3">
                <CroquisApoyosMuro />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <CampoNumerico id="l1Caso2" etiqueta="Caso 2 · L1 altura del contrapiso" sufijo="m" valor={l1Caso2} onChange={setL1Caso2} />
                  <CampoNumerico id="l1Caso3" etiqueta="Caso 3 · L1 altura del contrapiso" sufijo="m" valor={l1Caso3} onChange={setL1Caso3} />
                  <CampoNumerico id="l2Caso3" etiqueta="Caso 3 · L2 contrapiso a losa" sufijo="m" valor={l2Caso3} onChange={setL2Caso3} />
                </div>
              </div>
            </SeccionPlegable>
          </div>
        </Etapa>

        <Etapa id="armadura" numero={4} titulo="Armadura" descripcion="Materiales y barras de cada pieza: hastial, talón y puntera.">
          <DatosConDibujo
            datos={
              <>
                <div className="grid grid-cols-3 gap-4">
                  <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
                  <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
                  <CampoNumerico id="recArm" etiqueta="Recubrimiento mec." sufijo="m" valor={recArm} onChange={setRecArm} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CampoDiametro id="phiHastial" etiqueta="Hastial · Ø" valor={phiHastial} onChange={setPhiHastial} />
                  <CampoNumerico id="sepHastial" etiqueta="Hastial · separación" sufijo="mm" valor={sepHastial} onChange={setSepHastial} />
                  <CampoDiametro id="phiTalon" etiqueta="Talón · Ø" valor={phiTalon} onChange={setPhiTalon} />
                  <CampoNumerico id="sepTalon" etiqueta="Talón · separación" sufijo="mm" valor={sepTalon} onChange={setSepTalon} />
                  {aNumero(puntera) > 0 && (
                    <>
                      <CampoDiametro id="phiPuntera" etiqueta="Puntera · Ø" valor={phiPuntera} onChange={setPhiPuntera} />
                      <CampoNumerico id="sepPuntera" etiqueta="Puntera · separación" sufijo="mm" valor={sepPuntera} onChange={setSepPuntera} />
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Hastial en la cara interior, talón en la superior y puntera en la inferior: cada
                  pieza es un voladizo con la tracción de su lado.
                </p>
              </>
            }
            dibujo={
              resultado && armado ? (
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
              ) : (
                <CroquisGeometriaMuro />
              )
            }
          />
        </Etapa>

        <Etapa id="revision" numero={5} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "γ / φ / c", valor: `${gamma} kN/m³ / ${phi}° / ${c} kPa` },
              { etiqueta: "σ adm.", valor: `${sigmaAdm} kN/m²` },
              { etiqueta: "A × H zapata", valor: `${anchoZap} × ${cantoZap} m` },
              { etiqueta: "H × e muro", valor: `${altMuro} × ${espMuro} m` },
              ...(resultado
                ? [
                    { etiqueta: "ka adoptado", valor: fmt(resultado.r.empujes.ka, 3), derivado: true },
                    { etiqueta: "Excentricidad", valor: `${fmt(resultado.r.tensionSueloCaso1.excentricidadM, 3)} m`, derivado: true },
                  ]
                : []),
            ]}
            hipotesis={[
              `Empujes de Rankine con terreno horizontal, trasdós vertical y δ = 0; ka con piso de ${fmt(KA_MINIMO, 2)}.`,
              "Rozamiento de la base con φ pleno y cohesión reducida c* = mín(0,5·c ; 50 kPa); el pasivo no se cuenta en el deslizamiento.",
              `Factores de seguridad mínimos: vuelco ${fmt(FS_VUELCO_MINIMO, 1)}, deslizamiento ${fmt(FS_DESLIZAMIENTO_MINIMO, 1)}. La sobrecarga de uso es favorable en el vuelco y desfavorable en la tensión.`,
              "Tensión del suelo con ley trapecial si e ≤ A/6 y triangular si se despega (Jiménez Montoya, §25.2.6).",
              "Momentos de armado mayorados con γG = 1,35 y γQ = 1,50; el talón desprecia la reacción del terreno (del lado seguro).",
              "Cuantías mínimas de armado heredadas de la planilla: mecánica 0,045 y geométrica 1,8 ‰ (EHE‑08). No sustituyen la armadura mínima de muros del art. 9.6.",
              "Peso del alzado con brazo esp/2 (la planilla usaba A/2): más conservador.",
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
                  { etiqueta: "FS vuelco", valor: fmt(resultado.r.vuelco.factorSeguridad), nota: `mínimo ${fmt(FS_VUELCO_MINIMO, 1)}` },
                  { etiqueta: "FS deslizamiento", valor: fmt(resultado.r.deslizamientoSoloZapata.factorSeguridad), nota: `mínimo ${fmt(FS_DESLIZAMIENTO_MINIMO, 1)}` },
                  { etiqueta: "σ terreno", valor: `${fmt(resultado.r.tensionSueloCaso1.sigmaKPa)} kN/m²`, nota: `admisible ${fmt(resultado.n.sigmaAdm)}` },
                  { etiqueta: "M hastial", valor: `${fmt(resultado.r.momentos.hastialKNm)} kN·m/m`, nota: "mayorado" },
                ]}
              />

              <Subgrupo titulo="Empujes">
                <div className="space-y-2">
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
                </div>
              </Subgrupo>

              <Subgrupo titulo="Estabilidad · caso 1, sólo zapata">
                <div>
                  <ResultadoCheck
                    etiqueta="Vuelco"
                    verifica={resultado.r.vuelco.verifica}
                    detalle={`M estab ${fmt(resultado.r.empujes.momentoEstabilizadorKNm)} / M volc ${fmt(resultado.r.empujes.momentoVolcadorKNm)} kN·m/m`}
                    comparacion={{
                      real: { etiqueta: "FS", valor: resultado.r.vuelco.factorSeguridad },
                      limite: { etiqueta: "FS mín", valor: FS_VUELCO_MINIMO },
                      exige: "≥",
                    }}
                    recomendaciones={propuestas.vuelco}
                  />
                  <ResultadoCheck
                    etiqueta="Deslizamiento"
                    verifica={resultado.r.deslizamientoSoloZapata.verifica}
                    detalle={`Fh adm ${fmt(resultado.r.deslizamientoSoloZapata.fhAdmKN)} / Fh máx ${fmt(resultado.r.deslizamientoSoloZapata.fhMaxKN)} kN/m`}
                    comparacion={{
                      real: { etiqueta: "FS", valor: resultado.r.deslizamientoSoloZapata.factorSeguridad },
                      limite: { etiqueta: "FS mín", valor: FS_DESLIZAMIENTO_MINIMO },
                      exige: "≥",
                    }}
                    recomendaciones={propuestas.deslizamiento}
                  />
                  <ResultadoCheck
                    etiqueta="Tensión del suelo"
                    verifica={resultado.r.tensionSueloCaso1.verifica}
                    comparacion={{
                      real: { etiqueta: "σ", valor: resultado.r.tensionSueloCaso1.sigmaKPa },
                      limite: { etiqueta: "σ adm", valor: resultado.n.sigmaAdm },
                      unidad: "kN/m²", exige: "≤",
                    }}
                    recomendaciones={propuestas.tension}
                  />
                  <PanelFormulas titulo="Ver desarrollo de la estabilidad" filas={desarrolloCaso1(resultado.n, resultado.r)} />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Armado de las piezas">
                <div>
                  {armado ? (
                    <>
                      {[armado.hastial, armado.talon, armado.puntera]
                        .filter((p): p is NonNullable<typeof p> => p !== null)
                        .map((p) => (
                          <ResultadoCheck
                            key={p.calculo.nombre}
                            etiqueta={`${p.calculo.nombre} · armadura de la cara ${p.calculo.cara}`}
                            verifica={p.verifica}
                            detalle={`Ø${p.diametroMm} sirve hasta c/${fmt(p.separacionMaxMm, 0)} mm${p.calculo.mandaMinimo ? " · manda el mínimo" : ""}`}
                            comparacion={{
                              real: { etiqueta: "As real", valor: p.asRealCm2 },
                              limite: { etiqueta: "As nec", valor: p.calculo.asNecesarioCm2 },
                              unidad: "cm²/m", exige: "≥",
                            }}
                            recomendaciones={p.calculo.nombre === "Hastial" ? propuestas.armadoHastial : p.calculo.nombre === "Talón" ? propuestas.armadoTalon : propuestas.armadoPuntera}
                          />
                        ))}
                      <PanelFormulas titulo="Ver desarrollo de los momentos de armado" filas={desarrolloMomentos(resultado.n, resultado.r)} />
                      <PanelFormulas
                        titulo="Ver desarrollo del armado"
                        filas={[armado.hastial, armado.talon, armado.puntera]
                          .filter((p): p is NonNullable<typeof p> => p !== null)
                          .flatMap((p) => desarrolloArmado(p, armado.fcd, armado.fyd, armado.recubrimientoM))}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Falta un recubrimiento válido para armar las piezas.</p>
                  )}
                </div>
              </Subgrupo>

              <SeccionPlegable
                titulo="Otros casos · muro apuntalado"
                resumen="Si el muro solo no verifica, se lo puede apoyar en el contrapiso, o en el contrapiso y una losa superior. No entran en la conclusión de arriba."
              >
                {/* Registro propio: son alternativas, no comprobaciones del caso principal. */}
                <ProveedorComprobaciones>
                  <div className="space-y-6">
                    <div>
                      <p className="spec-label pb-2">Caso 2 · apoyo en contrapiso</p>
                      <ResultadoCheck
                        etiqueta="Deslizamiento con el contrapiso apuntalando"
                        verifica={resultado.r.deslizamientoApoyoContrapiso.verifica}
                        detalle={`Sólo pasa R1 = ${fmt(Math.abs(resultado.r.apoyoContrapiso.r1KN))} kN/m por rozamiento. Reacciones: R1 = ${fmt(resultado.r.apoyoContrapiso.r1KN)}, R2 = ${fmt(resultado.r.apoyoContrapiso.r2KN)} kN/m`}
                        comparacion={{
                          real: { etiqueta: "FS", valor: resultado.r.deslizamientoApoyoContrapiso.factorSeguridad },
                          limite: { etiqueta: "FS mín", valor: FS_DESLIZAMIENTO_MINIMO },
                          exige: "≥",
                        }}
                      />
                      <ResultadoCheck
                        etiqueta="Tensión del suelo"
                        verifica={resultado.r.tensionSueloCasos23.verifica}
                        comparacion={{
                          real: { etiqueta: "σ", valor: resultado.r.tensionSueloCasos23.sigmaKPa },
                          limite: { etiqueta: "σ adm", valor: resultado.n.sigmaAdm },
                          unidad: "kN/m²", exige: "≤",
                        }}
                      />
                    </div>
                    <div>
                      <p className="spec-label pb-2">Caso 3 · contrapiso y losa superior</p>
                      <ResultadoCheck
                        etiqueta="Tensión del suelo"
                        verifica={resultado.r.tensionSueloCasos23.verifica}
                        detalle={`Reacciones a llevar por las losas: R1 (inferior) = ${fmt(resultado.r.apoyoContrapisoYLosa.r1KN)}, R2 (superior) = ${fmt(resultado.r.apoyoContrapisoYLosa.r2KN)} kN/m`}
                        comparacion={{
                          real: { etiqueta: "σ", valor: resultado.r.tensionSueloCasos23.sigmaKPa },
                          limite: { etiqueta: "σ adm", valor: resultado.n.sigmaAdm },
                          unidad: "kN/m²", exige: "≤",
                        }}
                      />
                    </div>
                  </div>
                </ProveedorComprobaciones>
              </SeccionPlegable>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
