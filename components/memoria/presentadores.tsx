import { SeccionVigaDiagrama } from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";
import { resolverVigaFlexionCortante } from "@/lib/calc/hormigon/vigas/resolver";
import { describirCapas, fmt } from "@/lib/verificaciones/formato";
import type { CapituloCalculo, RegistroPresentadores } from "@/components/memoria/tipos";

/**
 * Presentadores: cómo entra cada verificación en la memoria de cálculo.
 *
 * Se van sumando de a uno. La memoria dice explícitamente cuáles todavía no
 * están cubiertas en vez de omitirlas en silencio: un capítulo que falta sin
 * aviso es un elemento que parece no haberse calculado.
 */

/** Detalle de "armadura suficiente": la desigualdad, o por qué no la hay. */
function detalleArmadura(f: { sobrearmada: boolean; mu: number; muLim: number; asRealCm2: number; asNecCm2: number }): string {
  return f.sobrearmada
    ? `Sección sobrearmada: μ = ${fmt(f.mu, 3)} > μlim = ${fmt(f.muLim, 3)}, el acero no fluye`
    : `As real ${fmt(f.asRealCm2)} cm² ≥ As nec ${fmt(f.asNecCm2)} cm²`;
}

function vigaFlexionCortante(campos: Record<string, string>): CapituloCalculo | null {
  const r = resolverVigaFlexionCortante(campos);
  if (!r) return null;

  const { v, d, flexionPositiva: pos, flexionNegativa: neg, cortante, seccionT } = r;
  // Las capas salen del cálculo: en una T las de la cara del ala se reparten
  // en el ancho eficaz y no en el alma.
  const disposicionPositiva = { filas: pos.capas };
  const disposicionNegativa = { filas: neg.capas };
  const rasante = seccionT?.rasante;

  return {
    datos: [
      {
        titulo: "Materiales",
        filas: [
          { etiqueta: "fck", valor: `${fmt(v.fck, 0)} MPa` },
          { etiqueta: "fyk", valor: `${fmt(v.fyk, 0)} MPa` },
        ],
      },
      {
        titulo: "Geometría",
        filas: [
          ...(seccionT
            ? [
                { etiqueta: "Sección", valor: seccionT.tipo === "t" ? "T (ala arriba)" : "T invertida (ala abajo)" },
                { etiqueta: "Ancho del alma bw", valor: `${fmt(v.b, 3)} m` },
                { etiqueta: "Ala: ancho real × hf", valor: `${fmt(seccionT.ala.anchoM, 3)} × ${fmt(seccionT.ala.espesorM, 3)} m` },
                { etiqueta: "l0", valor: `${fmt(seccionT.ala.l0M, 2)} m` },
                { etiqueta: "Ancho eficaz b_eff (ec. 5.7)", valor: `${fmt(seccionT.anchoEficaz.anchoEficazM, 3)} m` },
              ]
            : [{ etiqueta: "Ancho b", valor: `${fmt(v.b, 3)} m` }]),
          { etiqueta: "Canto h", valor: `${fmt(v.h, 3)} m` },
          { etiqueta: "Recubrimiento", valor: `${fmt(v.recubrimiento * 100, 1)} cm` },
          { etiqueta: "Canto útil d", valor: `${fmt(d, 3)} m` },
        ],
      },
      {
        titulo: "Solicitaciones",
        filas: [
          { etiqueta: "Mmax +", valor: `${fmt(v.momentoPos)} kN·m` },
          { etiqueta: "Mmax −", valor: `${fmt(v.momentoNeg)} kN·m` },
          // Si el mínimo de apoyo gobernó, la memoria tiene que decir con qué
          // momento se dimensionó la armadura superior, no sólo el cargado.
          ...(r.gobiernaMinimoApoyo
            ? [
                {
                  etiqueta: "M− de cálculo (0,15·M+, Anejo 19 art. 9.2.1.2)",
                  valor: `${fmt(r.momentoNegativoCalculo)} kN·m`,
                },
              ]
            : []),
          { etiqueta: "Vd", valor: `${fmt(v.vd)} kN` },
        ],
      },
      {
        titulo: "Armadura dispuesta",
        filas: [
          { etiqueta: "Positiva", valor: describirCapas(disposicionPositiva.filas) },
          { etiqueta: "Negativa", valor: describirCapas(disposicionNegativa.filas) },
          {
            etiqueta: "Estribos",
            valor: `${fmt(v.numeroRamas, 0)} ramas Ø${fmt(v.diametroEstribo, 0)} cada ${fmt(cortante.separacionAdoptadaM * 100, 0)} cm`,
          },
        ],
      },
    ],
    comprobaciones: [
      {
        etiqueta: "Flexión positiva — armadura suficiente",
        verifica: pos.verificaAs,
        detalle: detalleArmadura(pos),
      },
      {
        etiqueta: "Flexión positiva — la armadura entra en el ancho",
        verifica: pos.verificaEntraEnAncho,
        detalle: describirCapas(disposicionPositiva.filas),
      },
      {
        etiqueta: "Flexión negativa — armadura suficiente",
        verifica: neg.verificaAs,
        detalle: detalleArmadura(neg),
      },
      {
        etiqueta: "Flexión negativa — la armadura entra en el ancho",
        verifica: neg.verificaEntraEnAncho,
        detalle: describirCapas(disposicionNegativa.filas),
      },
      {
        etiqueta: "Cortante — no se supera la compresión oblicua del alma",
        verifica: cortante.verificaVRdMax,
        detalle: `Vd ${fmt(v.vd)} kN ≤ VRd,max ${fmt(cortante.vRdMax)} kN`,
      },
      {
        etiqueta: "Cortante — armadura transversal dispuesta",
        verifica: cortante.areaRealCm2PorM >= cortante.a90Cm2PorM,
        detalle: `Área real ${fmt(cortante.areaRealCm2PorM)} cm²/m ≥ necesaria ${fmt(cortante.a90Cm2PorM)} cm²/m`,
      },
      {
        etiqueta: "Cortante — separación transversal entre ramas",
        verifica: cortante.verificaSeparacionTransversal,
        detalle: `st ${fmt(cortante.separacionTransversalM * 100, 1)} cm ≤ st,max ${fmt(cortante.separacionTransversalMaxM * 100, 1)} cm (0,75·d ≤ 600 mm, ec. 9.8)`,
      },
      ...(rasante
        ? [
            {
              etiqueta: "Rasante ala–alma — bielas del ala",
              verifica: rasante.verificaBielas,
              detalle: `vEd ${fmt(rasante.vEdMPa, 3)} MPa ≤ ${fmt(rasante.vRdMaxMPa, 3)} MPa (ec. 6.22, cot θf = ${fmt(rasante.cotTheta, 2)}, Δx = l0/4)`,
            },
            {
              etiqueta: "Rasante ala–alma — armadura transversal del ala",
              verifica: rasante.verificaArmadura,
              detalle: rasante.requiereArmadura
                ? `Asf/sf real ${fmt(rasante.asRealCm2PorM)} cm²/m ≥ necesaria ${fmt(rasante.asNecCm2PorM)} cm²/m (ec. 6.21)`
                : `vEd ${fmt(rasante.vEdMPa, 3)} ≤ 0,4·fctd = ${fmt(rasante.limiteSinArmaduraMPa, 3)} MPa: sin armadura adicional (6.2.4 (6))`,
            },
          ]
        : []),
    ],
    formulas: [
      { etiqueta: "d", formula: "h − distancia al centroide de la armadura", valor: `${fmt(d, 3)} m` },
      { etiqueta: "fcd", formula: "fck / γc", sustitucion: `${fmt(v.fck, 0)} / 1,5`, valor: `${fmt(r.materiales.fcd, 2)} MPa` },
      { etiqueta: "fyd", formula: "fyk / γs", sustitucion: `${fmt(v.fyk, 0)} / 1,15`, valor: `${fmt(r.materiales.fyd, 2)} MPa` },
      { etiqueta: "As nec +", valor: pos.sobrearmada ? "sobrearmada" : `${fmt(pos.asNecCm2)} cm²` },
      { etiqueta: "As nec −", valor: neg.sobrearmada ? "sobrearmada" : `${fmt(neg.asNecCm2)} cm²` },
      { etiqueta: "A90 necesaria", valor: `${fmt(cortante.a90NecCm2PorM)} cm²/m` },
      { etiqueta: "A90 mínima", formula: "ρw,min·b = 0,08·√fck/fyk·b", valor: `${fmt(cortante.a90MinCm2PorM)} cm²/m` },
      { etiqueta: "Separación adoptada", valor: `${fmt(cortante.separacionAdoptadaM * 100, 1)} cm` },
      { etiqueta: "VRd,max", valor: `${fmt(cortante.vRdMax)} kN` },
    ],
    croquis: (
      <SeccionVigaDiagrama
        bM={v.b}
        hM={v.h}
        recubrimientoM={v.recubrimiento}
        dM={d}
        armaduraPositiva={{ capas: disposicionPositiva.filas }}
        armaduraNegativa={{ capas: disposicionNegativa.filas }}
        diametroEstriboMm={v.diametroEstribo}
        {...(seccionT
          ? { ala: { anchoM: seccionT.ala.anchoM, espesorM: seccionT.ala.espesorM, arriba: seccionT.tipo === "t", anchoEficazM: seccionT.anchoEficaz.anchoEficazM } }
          : {})}
      />
    ),
  };
}

export const PRESENTADORES: RegistroPresentadores = {
  "vigas-flexion-cortante": vigaFlexionCortante,
};
