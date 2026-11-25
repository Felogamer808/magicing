"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCampo } from "@/lib/hooks/useCampo";
import { AvisoCombinacion } from "@/components/verificaciones/comun/AvisoCombinacion";
import { ConclusionAutomatica, ProveedorComprobaciones } from "@/components/verificaciones/comun/RegistroComprobaciones";
import { Etapa, IndiceEtapas, Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { EstadoVerificacionChip } from "@/components/verificaciones/comun/EstadoVerificacion";
import { RevisionDatos, type AvisoRevision } from "@/components/verificaciones/comun/RevisionDatos";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { BarraAcciones } from "@/components/verificaciones/comun/BarraAcciones";
import { EsperasUnionVigaViga, type GrupoDibujo } from "@/components/verificaciones/hormigon/EsperasUnionVigaViga";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import {
  GRUPOS_POR_DEFECTO,
  leerGruposUnion,
  resolverUnionVigaViga,
  type GrupoTexto,
} from "@/lib/calc/hormigon/vigas/resolver-union-viga-viga";
import { GAMMA_C_UNION, GAMMA_S_UNION } from "@/lib/calc/hormigon/vigas/union-viga-viga";

const meta = registroVerificaciones.find((v) => v.id === "union-viga-viga")!;

const ETAPAS = [
  { id: "geometria", titulo: "Sección y materiales" },
  { id: "esperas", titulo: "Esperas" },
  { id: "esfuerzos", titulo: "Esfuerzos y junta" },
  { id: "revision", titulo: "Revisión" },
  { id: "resultados", titulo: "Resultados" },
] as const;

const RUGOSIDAD = { baja: "Baja (β = 0,2)", alta: "Alta (β = 0,4)" } as const;
const UNION = { articulada: "Articulada", momento: "Con momento" } as const;
const DINAMICA = { no: "No", si: "Sí" } as const;
const POSICION = { superior: "Superiores", inferior: "Inferiores" } as const;

/** Clave persistida a partir del texto elegido en el desplegable. */
function claveDe<T extends Record<string, string>>(tabla: T, texto: string): keyof T {
  return (Object.keys(tabla) as (keyof T)[]).find((k) => tabla[k] === texto) ?? (Object.keys(tabla)[0] as keyof T);
}

export default function UnionVigaVigaPage() {
  const [norma, setNorma] = useCampo("norma", "EHE-08");

  const [b, setB] = useCampo("b", "200");
  const [h, setH] = useCampo("h", "500");
  const [d, setD] = useCampo("d", "450");
  const [fck, setFck] = useCampo("fck", "25");
  const [fyk, setFyk] = useCampo("fyk", "500");

  const [gruposCrudo, setGruposCrudo] = useCampo("grupos", JSON.stringify(GRUPOS_POR_DEFECTO));
  const grupos = leerGruposUnion(gruposCrudo);
  const guardarGrupos = (lista: GrupoTexto[]) => setGruposCrudo(JSON.stringify(lista));
  const cambiarGrupo = (i: number, cambio: Partial<GrupoTexto>) =>
    guardarGrupos(grupos.map((g, j) => (j === i ? { ...g, ...cambio } : g)));
  const agregarGrupo = () => guardarGrupos([...grupos, { numero: "2", diametro: "12", posicion: "inferior" }]);
  const quitarGrupo = (i: number) => guardarGrupos(grupos.filter((_, j) => j !== i));

  const [vd, setVd] = useCampo("vd", "80");
  const [nd, setNd] = useCampo("nd", "0");
  const [rugosidad, setRugosidad] = useCampo("rugosidad", "baja");
  const [union, setUnion] = useCampo("union", "articulada");
  const [md, setMd] = useCampo("md", "");
  const [z, setZ] = useCampo("z", "");
  const [dinamica, setDinamica] = useCampo("dinamica", "no");

  const campos = useMemo(
    () => ({
      b, h, d, fck, fyk, grupos: gruposCrudo, vd, nd, rugosidad, union, md, z, dinamica,
    }),
    [b, h, d, fck, fyk, gruposCrudo, vd, nd, rugosidad, union, md, z, dinamica]
  );
  const resuelto = useMemo(() => resolverUnionVigaViga(campos), [campos]);
  const res = resuelto.ok ? resuelto : null;
  const r = res?.r;
  const conMomento = union === "momento";

  const avisos: AvisoRevision[] = [];
  if (!resuelto.ok) avisos.push({ tipo: "error", texto: resuelto.motivo });
  else if (r) {
    if (r.traccion) avisos.push({ tipo: "aviso", texto: "Nd de tracción: τc = 0 y Nd no aporta a la junta." });
    if (!r.cumpleCuantiaMinima)
      avisos.push({ tipo: "aviso", texto: "No se llega a la cuantía mínima: el acero no cuenta y la junta queda sólo con la cohesión." });
    if (r.asFlexionMm2 > r.asSuperiorMm2)
      avisos.push({ tipo: "aviso", texto: "La flexión se lleva todas las barras superiores: no queda nada de ellas para coser la junta." });
  }

  const kN = (n: number) => fmt(n / 1000, 1);

  // Para el dibujo, aunque falte algún dato: lo que no se lee no se dibuja.
  const positivo = (t: string, porDefecto: number) => {
    const x = aNumero(t);
    return Number.isFinite(x) && x > 0 ? x : porDefecto;
  };
  const gruposDibujo: GrupoDibujo[] = grupos
    .map((g) => ({ numero: Math.round(aNumero(g.numero)), diametroMm: aNumero(g.diametro), posicion: g.posicion }))
    .filter((g) => Number.isFinite(g.numero) && g.numero > 0 && Number.isFinite(g.diametroMm) && g.diametroMm > 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <ProveedorComprobaciones>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Regiones D · verificación</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.nombre}</h1>
        </div>
        <BarraAcciones normas={meta.normasDisponibles} norma={norma} onNormaChange={setNorma} />
      </div>

      <AvisoCombinacion idVerificacion={meta.id} />

      <IndiceEtapas etapas={ETAPAS} />

      <div className="flex flex-col gap-12">
        <Etapa id="geometria" numero={1} titulo="Sección y materiales" descripcion="La viga apoyada en la junta: Ac = b·h.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            <CampoNumerico id="b" etiqueta="b" sufijo="mm" valor={b} onChange={setB} />
            <CampoNumerico id="h" etiqueta="h" sufijo="mm" valor={h} onChange={setH} />
            <CampoNumerico id="d" etiqueta="d (canto útil)" sufijo="mm" valor={d} onChange={setD} />
            <div />
            <CampoNumerico id="fck" etiqueta="fck" sufijo="MPa" valor={fck} onChange={setFck} />
            <CampoNumerico id="fyk" etiqueta="fyk" sufijo="MPa" valor={fyk} onChange={setFyk} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            γc = {fmt(GAMMA_C_UNION, 2)} y γs = {fmt(GAMMA_S_UNION, 2)}, fijos.
          </p>
        </Etapa>

        <Etapa id="esperas" numero={2} titulo="Esperas" descripcion="Barras que cosen la junta, perpendiculares a ella (α = 90°). Un grupo sin cantidad no se cuenta.">
          <div className="max-w-2xl space-y-3">
            {grupos.map((g, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="grid flex-1 grid-cols-3 gap-4">
                  <CampoNumerico id={`numero-${i}`} etiqueta={`Grupo ${i + 1}: cantidad`} valor={g.numero} onChange={(x) => cambiarGrupo(i, { numero: x })} />
                  <CampoDiametro id={`diametro-${i}`} etiqueta="Ø" valor={g.diametro} onChange={(x) => cambiarGrupo(i, { diametro: x })} />
                  <CampoSeleccion
                    id={`posicion-${i}`}
                    etiqueta="Posición"
                    valor={POSICION[g.posicion]}
                    opciones={Object.values(POSICION)}
                    onChange={(x) => cambiarGrupo(i, { posicion: claveDe(POSICION, x) })}
                  />
                </div>
                {grupos.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar el grupo ${i + 1}`} onClick={() => quitarGrupo(i)} className="mb-1.5">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={agregarGrupo}>
              <Plus className="h-4 w-4" /> Agregar grupo
            </Button>
          </div>
          <div className="mt-6">
            <EsperasUnionVigaViga bMm={positivo(b, 200)} hMm={positivo(h, 500)} grupos={gruposDibujo} conMomento={conMomento} />
          </div>
        </Etapa>

        <Etapa id="esfuerzos" numero={3} titulo="Esfuerzos y junta" descripcion="Solicitaciones mayoradas en la junta y condiciones de la superficie.">
          <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumerico id="vd" etiqueta="Vd" sufijo="kN" valor={vd} onChange={setVd} />
            <CampoNumerico id="nd" etiqueta="Nd (+ compresión)" sufijo="kN" valor={nd} onChange={setNd} />
            <CampoSeleccion
              id="rugosidad"
              etiqueta="Rugosidad de la junta"
              valor={RUGOSIDAD[rugosidad === "alta" ? "alta" : "baja"]}
              opciones={Object.values(RUGOSIDAD)}
              onChange={(x) => setRugosidad(claveDe(RUGOSIDAD, x))}
            />
            <CampoSeleccion
              id="union"
              etiqueta="Unión"
              valor={UNION[conMomento ? "momento" : "articulada"]}
              opciones={Object.values(UNION)}
              onChange={(x) => setUnion(claveDe(UNION, x))}
            />
            {conMomento && (
              <>
                <CampoNumerico id="md" etiqueta="Md" sufijo="kN·m" valor={md} onChange={setMd} />
                <CampoNumerico id="z" etiqueta="z (en blanco: 0,9·d)" sufijo="mm" valor={z} onChange={setZ} />
              </>
            )}
            <CampoSeleccion
              id="dinamica"
              etiqueta="Carga dinámica"
              valor={DINAMICA[dinamica === "si" ? "si" : "no"]}
              opciones={Object.values(DINAMICA)}
              onChange={(x) => setDinamica(claveDe(DINAMICA, x))}
            />
          </div>
        </Etapa>

        <Etapa id="revision" numero={4} titulo="Revisión" descripcion="Con qué datos y bajo qué hipótesis se calcula. Se actualiza mientras se editan los datos.">
          <RevisionDatos
            norma={norma}
            datos={[
              { etiqueta: "Sección", valor: `${b} × ${h} mm, d = ${d} mm` },
              { etiqueta: "Hormigón / acero", valor: `fck ${fck} MPa · fyk ${fyk} MPa (γc 1,5 · γs 1,15)` },
              { etiqueta: "Vd / Nd", valor: `${vd} / ${nd || "0"} kN` },
              { etiqueta: "Junta", valor: `rugosidad ${rugosidad}, ${conMomento ? `con momento, Md = ${md || "0"} kN·m` : "articulada"}${dinamica === "si" ? ", carga dinámica" : ""}` },
              ...(res
                ? [
                    { etiqueta: "Esperas", valor: res.v.grupos.map((g) => `${g.numero}Ø${g.diametroMm} ${g.posicion === "superior" ? "sup." : "inf."}`).join(" + ") },
                    ...(res.v.conMomento ? [{ etiqueta: "z", valor: `${fmt(res.v.z, 0)} mm${res.v.zPorDefecto ? " (0,9·d)" : ""}`, derivado: true }] : []),
                  ]
                : []),
            ]}
            hipotesis={[
              "EHE-08, art. 47 (rasante en juntas entre hormigones), con las fórmulas de la especificación del usuario: no hay texto de la norma en el proyecto. No se usa nada del Anejo 19.",
              "Junta vertical cosida por armadura perpendicular (α = 90°).",
              "Con momento: la junta transmite el Md que da el análisis (empotramiento total o parcial de la viga apoyada en la soporte). La herramienta no lo calcula ni supone empotramiento perfecto.",
              "fyd = mín(fyk/γs; 400 MPa); fct,d = 0,21·fck^(2/3)/γc, válido para fck ≤ 50.",
              "Con momento, As,flex = Md/(z·fyd) se descuenta de las barras superiores (mínimo 0).",
              "La cuantía mínima se compara con el As efectivo; si no se llega, V_Rd = τc·Ac.",
            ]}
            avisos={avisos}
          />
        </Etapa>

        <Etapa id="resultados" numero={5} titulo="Resultados">
          {!res || !r ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <EstadoVerificacionChip estado="datos-insuficientes" />
              <span className="text-muted-foreground">Completá los datos marcados en la revisión.</span>
            </div>
          ) : (
            <div className="space-y-10">
              <ConclusionAutomatica />

              <Subgrupo titulo="Cortante en la junta" detalle={`caso ${r.caso}, ${r.caso === "a" ? "τd ≤ 2,5·τc" : "τd > 2,5·τc"}`}>
                <div className="space-y-3">
                  <ResultadoCheck
                    etiqueta="Transmisión de cortante en la junta"
                    verifica={r.cumple}
                    detalle={`aprovechamiento ${fmt(r.aprovechamiento * 100, 0)} %${r.limitaBielas ? "; manda el límite de bielas" : ""}`}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: res.v.vd },
                      limite: { etiqueta: "V_Rd", valor: r.vRdN / 1000 },
                      unidad: "kN", exige: "≤", decimales: 1,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Cuantía mínima de las esperas"
                    verifica={r.cumpleCuantiaMinima}
                    detalle={r.cumpleCuantiaMinima ? "As ≥ 0,001·Ac" : "no se llega: el acero no cuenta, sólo cohesión"}
                    comparacion={{
                      real: { etiqueta: "As,mín", valor: r.asMinimaMm2 },
                      limite: { etiqueta: "As efectiva", valor: r.asEfectivaMm2 },
                      unidad: "mm²", exige: "≤", decimales: 0,
                    }}
                  />
                  <ResultadoCheck
                    etiqueta="Límite de bielas"
                    verifica={res.v.vd * 1000 <= r.vBielasN}
                    detalle={r.limitaBielas ? "recorta V_Rd de la junta" : "no recorta V_Rd"}
                    comparacion={{
                      real: { etiqueta: "Vd", valor: res.v.vd },
                      limite: { etiqueta: "0,25·fcd·Ac", valor: r.vBielasN / 1000 },
                      unidad: "kN", exige: "≤", decimales: 1,
                    }}
                  />
                </div>
              </Subgrupo>

              <Subgrupo titulo="Valores del cálculo" detalle="unidades internas: mm, N, MPa">
                <table className="w-full max-w-xl text-sm">
                  <tbody className="font-mono tabular-nums">
                    {[
                      ["fcd", `${fmt(r.fcdMPa, 2)} MPa`],
                      ["fyd", `${fmt(r.fydMPa, 1)} MPa`],
                      ["fct,d", `${fmt(r.fctdMPa, 3)} MPa`],
                      ["τc", `${fmt(r.tauCMPa, 3)} MPa${r.traccion ? " (tracción)" : res.v.cargaDinamica ? " (50 %, dinámica)" : ""}`],
                      ["τd", `${fmt(r.tauDMPa, 3)} MPa`],
                      ["2,5·τc", `${fmt(r.limiteCasoAMPa, 3)} MPa`],
                      ["Caso", r.caso],
                      ["β", fmt(r.beta, 1)],
                      ["μ", fmt(r.mu, 1)],
                      ["As total", `${fmt(r.asTotalMm2, 0)} mm²`],
                      ...(res.v.conMomento ? [["As,flex (se descuenta de las superiores)", `${fmt(r.asFlexionMm2, 0)} mm²`]] : []),
                      ["As efectiva", `${fmt(r.asEfectivaMm2, 0)} mm²`],
                      ["V_Rd", `${kN(r.vRdN)} kN`],
                      ["Límite de bielas", `${kN(r.vBielasN)} kN`],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-border/60">
                        <td className="py-1.5 pr-4 font-sans text-muted-foreground">{k}</td>
                        <td className="py-1.5 text-right">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Subgrupo>

              <PanelFormulas
                titulo="Ver desarrollo con los valores"
                filas={[
                  { etiqueta: "fcd", formula: "fck / γc", sustitucion: `${fmt(res.v.fck, 0)} / ${fmt(GAMMA_C_UNION, 2)}`, valor: `${fmt(r.fcdMPa, 2)} MPa` },
                  { etiqueta: "fyd", formula: "mín(fyk / γs; 400)", sustitucion: `mín(${fmt(res.v.fyk, 0)} / ${fmt(GAMMA_S_UNION, 2)}; 400)`, valor: `${fmt(r.fydMPa, 1)} MPa` },
                  { etiqueta: "fct,d", formula: "0,21·fck^(2/3) / γc", sustitucion: `0,21·${fmt(res.v.fck, 0)}^(2/3) / ${fmt(GAMMA_C_UNION, 2)}`, valor: `${fmt(r.fctdMPa, 3)} MPa` },
                  {
                    etiqueta: "τc",
                    formula: `β·(1,3 − 0,30·fck/25)·fct,d${res.v.cargaDinamica ? " · 0,5" : ""}`,
                    sustitucion: r.traccion
                      ? "Nd de tracción: τc = 0"
                      : `${fmt(r.beta, 1)}·(1,3 − 0,30·${fmt(res.v.fck, 0)}/25)·${fmt(r.fctdMPa, 3)}${res.v.cargaDinamica ? " · 0,5" : ""}`,
                    valor: `${fmt(r.tauCMPa, 3)} MPa`,
                  },
                  { etiqueta: "τd", formula: "Vd / (b·h)", sustitucion: `${fmt(res.v.vd * 1000, 0)} / (${fmt(res.v.b, 0)}·${fmt(res.v.h, 0)})`, valor: `${fmt(r.tauDMPa, 3)} MPa` },
                  ...(res.v.conMomento
                    ? [{
                        etiqueta: "As,flex",
                        formula: "Md / (z·fyd)",
                        sustitucion: `${fmt(res.v.md * 1e6, 0)} / (${fmt(res.v.z, 0)}·${fmt(r.fydMPa, 0)})`,
                        valor: `${fmt(r.asFlexionMm2, 0)} mm²`,
                      }, {
                        etiqueta: "As efectiva",
                        formula: "máx(0; As,sup − As,flex) + As,inf",
                        sustitucion: `máx(0; ${fmt(r.asSuperiorMm2, 0)} − ${fmt(r.asFlexionMm2, 0)}) + ${fmt(r.asInferiorMm2, 0)}`,
                        valor: `${fmt(r.asEfectivaMm2, 0)} mm²`,
                      }]
                    : []),
                  !r.cumpleCuantiaMinima
                    ? { etiqueta: "V_Rd junta", formula: "τc·Ac (sin cuantía mínima)", sustitucion: `${fmt(r.tauCMPa, 3)}·${fmt(r.acMm2, 0)}`, valor: `${kN(r.vRdJuntaN)} kN` }
                    : r.caso === "a"
                      ? {
                          etiqueta: "V_Rd junta",
                          formula: "τc·Ac + μa·As·fyd + μa·Nd",
                          sustitucion: `${fmt(r.tauCMPa, 3)}·${fmt(r.acMm2, 0)} + ${fmt(r.mu, 1)}·${fmt(r.asEfectivaMm2, 0)}·${fmt(r.fydMPa, 0)} + ${fmt(r.mu, 1)}·${fmt(r.traccion ? 0 : res.v.nd * 1000, 0)}`,
                          valor: `${kN(r.vRdJuntaN)} kN`,
                        }
                      : {
                          etiqueta: "V_Rd junta",
                          formula: "μb·As·fyd + μb·Nd",
                          sustitucion: `${fmt(r.mu, 1)}·${fmt(r.asEfectivaMm2, 0)}·${fmt(r.fydMPa, 0)} + ${fmt(r.mu, 1)}·${fmt(r.traccion ? 0 : res.v.nd * 1000, 0)}`,
                          valor: `${kN(r.vRdJuntaN)} kN`,
                        },
                  { etiqueta: "Bielas", formula: "0,25·fcd·Ac", sustitucion: `0,25·${fmt(r.fcdMPa, 2)}·${fmt(r.acMm2, 0)}`, valor: `${kN(r.vBielasN)} kN` },
                  { etiqueta: "V_Rd", formula: "mín(V_Rd junta; bielas)", sustitucion: `mín(${kN(r.vRdJuntaN)}; ${kN(r.vBielasN)})`, valor: `${kN(r.vRdN)} kN` },
                  { etiqueta: "Ash", formula: "Vd / fyd", sustitucion: `${fmt(res.v.vd * 1000, 0)} / ${fmt(r.fydMPa, 0)}`, valor: `${fmt(r.ashNecesariaMm2, 0)} mm²` },
                ]}
              />

              <Subgrupo titulo="Para completar la unión" detalle="no entran en el cumple">
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  <li>Las esperas tienen que quedar ancladas por completo a los dos lados de la junta.</li>
                  <li>
                    Estribos de cuelgue en la viga soporte, la que recibe las esperas, en la zona del cruce: cuelgan el Vd que trae la
                    viga apoyada hasta la cabeza comprimida de la soporte. Ash·fyd ≥ Vd, con fyd ≤ 400 MPa →{" "}
                    <span className="font-mono font-semibold tabular-nums">Ash ≥ {fmt(r.ashNecesariaMm2, 0)} mm²</span>.
                  </li>
                  <li>Verificar a cortante (EHE-08 art. 44) el extremo de la viga apoyada, junto a la junta.</li>
                  {res.v.conMomento && <li>Con momento en la unión, la viga soporte recibe torsión: verificarla.</li>}
                </ul>
              </Subgrupo>
            </div>
          )}
        </Etapa>
      </div>
      </ProveedorComprobaciones>
    </main>
  );
}
