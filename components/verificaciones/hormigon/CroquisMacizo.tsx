"use client";

import { fmt } from "@/lib/verificaciones/formato";

/** Qué parte del dibujo corresponde al campo que se está editando. */
export type ElementoMacizo =
  | "h"
  | "ancho"
  | "profundidad"
  | "recubrimiento"
  | "supPlano"
  | "supTransversal"
  | "infPlano"
  | "infTransversal"
  | "e"
  | "borde"
  | "u"
  | "cercos"
  | "inferior";

export interface MedidasMacizo {
  hM: number;
  anchoM: number;
  profundidadM: number;
  recubrimientoM: number;
  supPlanoM: number;
  supTransversalM: number;
  infPlanoM: number;
  infTransversalM: number;
  excentricidadM: number;
  bordeM: number;
}

const RESALTE = "var(--mat-cota)";

function Cota({
  x0, y0, x1, y1, texto, activa, lado = 1,
}: { x0: number; y0: number; x1: number; y1: number; texto: string; activa: boolean; lado?: 1 | -1 }) {
  const vertical = x0 === x1;
  const color = activa ? RESALTE : "currentColor";
  const tx = vertical ? x0 - 6 * lado : (x0 + x1) / 2;
  const ty = vertical ? (y0 + y1) / 2 + 4 : y0 - 6;
  return (
    <g stroke={color} strokeWidth={activa ? 1.6 : 0.8} opacity={activa ? 1 : 0.8}>
      <path d={`M${x0} ${y0} L${x1} ${y1}`} />
      <path d={vertical ? `M${x0 - 4} ${y0} L${x0 + 4} ${y0} M${x1 - 4} ${y1} L${x1 + 4} ${y1}` : `M${x0} ${y0 - 4} L${x0} ${y0 + 4} M${x1} ${y1 - 4} L${x1} ${y1 + 4}`} />
      <text x={tx} y={ty} textAnchor={vertical ? (lado === 1 ? "end" : "start") : "middle"} stroke="none"
            fill={color} className="font-mono" fontSize="12" fontWeight={activa ? 700 : 400}>
        {texto}
      </text>
    </g>
  );
}

/**
 * Geometría del macizo: alzado en el plano de la excentricidad y planta, con
 * una cota por cada dato. Sólo lo que se carga, sin el modelo de bielas y
 * tirantes, que va en resultados. La cota del campo en edición se resalta.
 */
export function CroquisGeometriaMacizo({ m, resaltar }: { m: MedidasMacizo; resaltar: ElementoMacizo | null }) {
  // Alzado y planta lado a lado, cada uno con su escala: apilados quedaban
  // altos y el tope de altura de los esquemas (globals.css) los achicaba.
  const P = 150;
  const x0 = 54;
  const escalaA = Math.min(P / m.anchoM, 230 / m.hM);
  const escalaP = Math.min(P / m.anchoM, 190 / m.profundidadM);
  const yIni = -m.infPlanoM / 2 - m.bordeM;
  const xA = (y: number) => x0 + (y - yIni) * escalaA;
  const x0P = x0 + m.anchoM * escalaA + 96;
  const xP = (y: number) => x0P + (y - yIni) * escalaP;
  const a = (e: ElementoMacizo) => resaltar === e;
  const borde = (activo: boolean) => (activo ? RESALTE : "var(--mat-hormigon-borde)");

  // Alzado
  const yTop = 78;
  const hPx = m.hM * escalaA;
  const yBase = yTop + hPx;
  const xIni = xA(yIni);
  const xFin = xA(yIni + m.anchoM);
  const rec = m.recubrimientoM * escalaA;
  // Planta, a la derecha
  const yPlanta = yTop;
  const xPIni = xP(yIni);
  const xPFin = xP(yIni + m.anchoM);
  const pPx = m.profundidadM * escalaP;
  const yp = (t: number) => yPlanta + pPx / 2 + t * escalaP; // t transversal, centrado
  const alto = Math.max(yBase + 100, yPlanta + pPx + 40);
  const anchoTotal = xPFin + 100;

  return (
    <svg viewBox={`0 0 ${anchoTotal} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <text x={4} y={14} className="fill-current font-mono" fontSize="11.5" opacity="0.7">ALZADO, plano de e</text>
      {/* pilar superior */}
      <rect x={xA(m.excentricidadM - m.supPlanoM / 2)} y={yTop - 34} width={m.supPlanoM * escalaA} height={34}
            stroke={borde(a("supPlano"))} strokeWidth={a("supPlano") ? 2.4 : 1.4} fill="var(--mat-hormigon)" />
      {/* macizo */}
      <rect x={xIni} y={yTop} width={m.anchoM * escalaA} height={hPx} fill="var(--mat-hormigon)"
            stroke={a("h") || a("ancho") ? RESALTE : "currentColor"} strokeWidth={a("h") || a("ancho") ? 2.6 : 1.8} />
      <rect x={xIni + rec} y={yTop + rec} width={Math.max(m.anchoM * escalaA - 2 * rec, 0)} height={Math.max(hPx - 2 * rec, 0)}
            stroke={a("recubrimiento") ? RESALTE : "currentColor"} strokeWidth={a("recubrimiento") ? 1.6 : 0.7}
            strokeDasharray="3 3" opacity={a("recubrimiento") ? 1 : 0.5} />
      {/* pilar inferior */}
      <rect x={xA(-m.infPlanoM / 2)} y={yBase} width={m.infPlanoM * escalaA} height={34}
            stroke={borde(a("infPlano"))} strokeWidth={a("infPlano") ? 2.4 : 1.4} fill="var(--mat-hormigon)" />
      {/* ejes */}
      <path d={`M${xA(0)} ${yTop - 6} L${xA(0)} ${yBase + 40}`} stroke="currentColor" strokeWidth="0.6" strokeDasharray="6 3" opacity="0.5" />
      <path d={`M${xA(m.excentricidadM)} ${yTop - 40} L${xA(m.excentricidadM)} ${yBase}`} stroke="currentColor" strokeWidth="0.6" strokeDasharray="6 3" opacity="0.5" />

      <Cota x0={xA(m.excentricidadM - m.supPlanoM / 2)} y0={yTop - 40} x1={xA(m.excentricidadM + m.supPlanoM / 2)} y1={yTop - 40}
            texto={fmt(m.supPlanoM, 2)} activa={a("supPlano")} />
      <Cota x0={xIni - 18} y0={yTop} x1={xIni - 18} y1={yBase} texto={`h ${fmt(m.hM, 2)}`} activa={a("h")} />
      <Cota x0={xA(-m.infPlanoM / 2)} y0={yBase + 46} x1={xA(m.infPlanoM / 2)} y1={yBase + 46} texto={fmt(m.infPlanoM, 2)} activa={a("infPlano")} />
      <Cota x0={xA(0)} y0={yBase + 66} x1={xA(m.excentricidadM)} y1={yBase + 66} texto={`e ${fmt(m.excentricidadM, 3)}`} activa={a("e")} />
      <Cota x0={xIni} y0={yBase + 86} x1={xFin} y1={yBase + 86} texto={fmt(m.anchoM, 2)} activa={a("ancho")} />
      {m.bordeM > 0 && (
        <Cota x0={xIni} y0={yBase + 46} x1={xA(-m.infPlanoM / 2)} y1={yBase + 46} texto={fmt(m.bordeM, 2)} activa={a("borde")} />
      )}
      {a("borde") && m.bordeM === 0 && (
        <text x={xIni} y={yBase + 40} className="font-mono" fontSize="10" fill={RESALTE}>enrasados</text>
      )}

      <text x={x0P} y={14} className="fill-current font-mono" fontSize="11.5" opacity="0.7">PLANTA</text>
      {/* macizo en planta */}
      <rect x={xPIni} y={yPlanta} width={m.anchoM * escalaP} height={pPx}
            stroke={a("ancho") || a("profundidad") ? RESALTE : "currentColor"} strokeWidth={a("ancho") || a("profundidad") ? 2.4 : 1.6} />
      <rect x={xP(-m.infPlanoM / 2)} y={yp(-m.infTransversalM / 2)} width={m.infPlanoM * escalaP} height={m.infTransversalM * escalaP}
            stroke={a("infPlano") || a("infTransversal") ? RESALTE : "var(--mat-hormigon-borde)"} strokeWidth={a("infPlano") || a("infTransversal") ? 2.2 : 1.2}
            strokeDasharray="5 3" fill="var(--mat-hormigon)" fillOpacity="0.6" />
      <rect x={xP(m.excentricidadM - m.supPlanoM / 2)} y={yp(-m.supTransversalM / 2)} width={m.supPlanoM * escalaP} height={m.supTransversalM * escalaP}
            stroke={a("supPlano") || a("supTransversal") ? RESALTE : "currentColor"} strokeWidth={a("supPlano") || a("supTransversal") ? 2.2 : 1.2} />
      <Cota x0={xPFin + 16} y0={yPlanta} x1={xPFin + 16} y1={yPlanta + pPx} texto={fmt(m.profundidadM, 2)} activa={a("profundidad")} lado={-1} />
      <Cota x0={xPIni - 14} y0={yp(-m.infTransversalM / 2)} x1={xPIni - 14} y1={yp(m.infTransversalM / 2)}
            texto={fmt(m.infTransversalM, 2)} activa={a("infTransversal")} />
      <Cota x0={xPFin + 62} y0={yp(-m.supTransversalM / 2)} x1={xPFin + 62} y1={yp(m.supTransversalM / 2)}
            texto={fmt(m.supTransversalM, 2)} activa={a("supTransversal")} lado={-1} />
      <text x={x0P} y={yPlanta + pPx + 26} className="fill-current font-mono" fontSize="9.5" opacity="0.7">
        planta: llena, pilar superior · a trazos, inferior
      </text>
    </svg>
  );
}

export interface ArmadoMacizo {
  numeroU: number;
  diametroUMm: number;
  mandrilUMm: number;
  patillaInferior: boolean;
  diametroCercoMm: number;
  separacionCercosM: number;
  numeroInferior: number;
  diametroInferiorMm: number;
}

/**
 * Armado del macizo, por planos como un cabezal. En el alzado XZ: la U
 * invertida continua —sube del pilar como esperas, gira, cruza como tirante y
 * baja por la cara del lado de la carga—, los cercos horizontales, que en este
 * plano se ven como líneas a cada altura, y las barras de la cara inferior. Al
 * lado, la planta cortada (XY) con el cerco rodeando las dos ramas de la U. La
 * pieza del campo en edición se resalta.
 */
export function CroquisArmadoMacizo({
  m, armado, resaltar,
}: { m: MedidasMacizo; armado: ArmadoMacizo; resaltar: ElementoMacizo | null }) {
  const W = 170;
  const escala = W / Math.max(m.anchoM, m.hM);
  const x0 = 62;
  const yTop = 40;
  const yIni = -m.infPlanoM / 2 - m.bordeM;
  const x = (y: number) => x0 + (y - yIni) * escala;
  const hPx = m.hM * escala;
  const yBase = yTop + hPx;
  const xIni = x(yIni);
  const xFin = x(yIni + m.anchoM);
  const cobM = m.recubrimientoM + armado.diametroCercoMm / 1000;
  const cob = cobM * escala;
  const rec = m.recubrimientoM * escala;
  const a = (e: ElementoMacizo) => resaltar === e;
  const col = (activo: boolean, base: string) => (activo ? RESALTE : base);
  const grosor = (phiMm: number, activo: boolean) => Math.max(phiMm / 6, 1.6) + (activo ? 1.2 : 0);
  const rojo = "var(--color-destructive)";

  // La U por el eje de la barra, con el radio del mandril.
  const r = Math.max(((armado.mandrilUMm / 2 + armado.diametroUMm / 2) / 1000) * escala, 3);
  const xEsp = x(-m.infPlanoM / 2) + cob;
  const xCarga = xFin - cob;
  const yArr = yTop + cob;
  const yAbajo = yBase - cob;
  const xPatilla = Math.max(x(m.infPlanoM / 2), xEsp + 2 * r);
  const pathU = [
    `M${xEsp} ${yBase + 50}`,
    `L${xEsp} ${yArr + r} Q${xEsp} ${yArr} ${xEsp + r} ${yArr}`,
    `L${xCarga - r} ${yArr} Q${xCarga} ${yArr} ${xCarga} ${yArr + r}`,
    armado.patillaInferior
      ? `L${xCarga} ${yAbajo - r} Q${xCarga} ${yAbajo} ${xCarga - r} ${yAbajo} L${xPatilla} ${yAbajo}`
      : `L${xCarga} ${yAbajo}`,
  ].join(" ");

  // Cercos: líneas horizontales entre el recubrimiento inferior y la U.
  const alturasCercos: number[] = [];
  const sPx = armado.separacionCercosM * escala;
  if (sPx > 2) for (let yc = yAbajo; yc > yArr + 2; yc -= sPx) alturasCercos.push(yc);

  // Planta cortada, a la derecha con la misma escala.
  const px0 = xFin + 56;
  const pPx = m.profundidadM * escala;
  const xp = (y: number) => px0 + (y - yIni) * escala;
  const ypt = (t: number) => yTop + pPx / 2 + t * escala;
  const repartir = (n: number, ancho: number) =>
    Array.from({ length: Math.max(Math.round(n), 0) }, (_, i) => (n > 1 ? -ancho / 2 + (ancho * i) / (n - 1) : 0));
  const yEspM = -m.infPlanoM / 2 + cobM + armado.diametroUMm / 2000;
  const yCargaM = yIni + m.anchoM - cobM - armado.diametroUMm / 2000;
  const tU = repartir(armado.numeroU, m.infTransversalM - 2 * cobM - armado.diametroUMm / 1000);
  const alto = Math.max(yBase + 70, yTop + pPx + 46);

  return (
    <svg viewBox={`0 0 ${xp(yIni + m.anchoM) + 70} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <text x={4} y={yTop - 26} className="fill-current font-mono" fontSize="9.5" opacity="0.7">ALZADO XZ</text>
      {/* hormigón */}
      <rect x={x(m.excentricidadM - m.supPlanoM / 2)} y={yTop - 18} width={m.supPlanoM * escala} height={18}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon)" />
      <rect x={xIni} y={yTop} width={m.anchoM * escala} height={hPx} stroke="currentColor" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <rect x={x(-m.infPlanoM / 2)} y={yBase} width={m.infPlanoM * escala} height={50}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon)" />

      {/* cercos horizontales: en este plano, una línea por cerco */}
      {alturasCercos.map((yc, i) => (
        <path key={i} d={`M${xIni + rec} ${yc} L${xFin - rec} ${yc}`}
              stroke={col(a("cercos"), "currentColor")} strokeWidth={a("cercos") ? 2 : 1.1} opacity={a("cercos") ? 1 : 0.75} />
      ))}
      {/* cara inferior, barras aparte en X */}
      <path d={`M${xIni + cob} ${yAbajo + 3} L${xFin - cob} ${yAbajo + 3}`}
            stroke={col(a("inferior"), "currentColor")} strokeWidth={grosor(armado.diametroInferiorMm, a("inferior"))}
            strokeDasharray="6 3" strokeLinecap="round" />
      {/* U invertida continua */}
      <path d={pathU} stroke={col(a("u"), rojo)} strokeWidth={grosor(armado.diametroUMm, a("u"))} strokeLinecap="round" />

      <text x={(xEsp + xCarga) / 2} y={yTop - 24} textAnchor="middle" className="font-mono" fontSize="10.5"
            fill={col(a("u"), rojo)} fontWeight={a("u") ? 700 : 400}>
        U {armado.numeroU}Ø{armado.diametroUMm}
      </text>
      <text x={xEsp - 6} y={yTop + hPx / 2} textAnchor="end" className="fill-current font-mono" fontSize="9" opacity="0.8">esperas</text>
      <text x={xFin + 4} y={yTop + hPx / 2} className="fill-current font-mono" fontSize="9" opacity="0.8">rama</text>
      <text x={xIni + rec + 2} y={(alturasCercos[1] ?? yAbajo) - 4} className="font-mono" fontSize="9.5"
            fill={col(a("cercos"), "currentColor")} fontWeight={a("cercos") ? 700 : 400}>
        cercos Ø{armado.diametroCercoMm} c/{fmt(armado.separacionCercosM * 100, 0)}
      </text>
      <text x={xIni} y={yBase + 64} className="font-mono" fontSize="9.5"
            fill={col(a("inferior"), "currentColor")} fontWeight={a("inferior") ? 700 : 400}>
        inferior {armado.numeroInferior}Ø{armado.diametroInferiorMm}
      </text>

      {/* planta cortada XY */}
      <text x={px0} y={yTop - 26} className="fill-current font-mono" fontSize="9.5" opacity="0.7">PLANTA XY</text>
      <rect x={xp(yIni)} y={yTop} width={m.anchoM * escala} height={pPx} stroke="currentColor" strokeWidth="1.4" fill="var(--mat-hormigon)" />
      <rect x={xp(-m.infPlanoM / 2)} y={ypt(-m.infTransversalM / 2)} width={m.infPlanoM * escala} height={m.infTransversalM * escala}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1" strokeDasharray="4 3" />
      <rect x={xp(yIni) + rec} y={yTop + rec} width={m.anchoM * escala - 2 * rec} height={pPx - 2 * rec} rx="3"
            stroke={col(a("cercos"), "currentColor")} strokeWidth={a("cercos") ? 2.6 : 1.6} />
      {tU.map((t, i) => (
        <g key={i}>
          <path d={`M${xp(yEspM)} ${ypt(t)} L${xp(yCargaM)} ${ypt(t)}`}
                stroke={col(a("u"), rojo)} strokeWidth={a("u") ? 1.8 : 1.1} strokeDasharray="5 3" />
          <circle cx={xp(yEspM)} cy={ypt(t)} r={Math.max(armado.diametroUMm / 6, 2.4)} fill={col(a("u"), rojo)} />
          <circle cx={xp(yCargaM)} cy={ypt(t)} r={Math.max(armado.diametroUMm / 6, 2.4)} fill={col(a("u"), rojo)} />
        </g>
      ))}
      <text x={xp(yIni)} y={yTop + pPx + 16} className="fill-current font-mono" fontSize="9" opacity="0.75">
        cerco · ramas de la U ●
      </text>
      <text x={xp(yIni)} y={yTop + pPx + 28} className="fill-current font-mono" fontSize="9" opacity="0.75">
        tramo superior a trazos
      </text>
    </svg>
  );
}
