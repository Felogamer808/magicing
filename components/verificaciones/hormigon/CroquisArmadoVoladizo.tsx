"use client";

import { fmt } from "@/lib/verificaciones/formato";
import { mandrilMinimoMm } from "@/lib/calc/hormigon/comun/anclaje";
import type { FormaExtremoTirante } from "@/lib/calc/hormigon/vigas/apeo-voladizo";
import type { ResueltoApeoVoladizo } from "@/lib/calc/hormigon/vigas/resolver-apeo-voladizo";

/** Qué armadura corresponde a cada campo de la etapa, para resaltarla con el foco. */
export type ArmaduraVoladizo = "tirante" | "extremos" | "horquillas" | "estribos" | "piel" | "pilar";

export const ARMADURA_DE_CAMPO: Record<string, ArmaduraVoladizo> = {
  nTirante: "tirante", phiTirante: "tirante", forma: "extremos", phiHorquilla: "horquillas",
  phiEstribo: "estribos", sepEstribo: "estribos", phiPiel: "piel", sepPiel: "piel",
  nPilar: "pilar", phiPilar: "pilar",
};

const RESALTE = "var(--mat-cota)";
const ACERO = "var(--color-destructive)";

/**
 * Las armaduras de la viga de apeo en voladizo, en alzado y, con horquillas,
 * en planta a la altura del tirante. Cada una con su rótulo en la leyenda; la
 * del campo en edición se resalta. Dibuja a escala lo que ya está calculado:
 * posiciones, cantidades y largos salen del resolver.
 */
export function CroquisArmadoVoladizo({
  resuelto, forma, resaltar,
}: { resuelto: ResueltoApeoVoladizo; forma: FormaExtremoTirante; resaltar: ArmaduraVoladizo | null }) {
  const { n, r } = resuelto;
  const a = (x: ArmaduraVoladizo) => resaltar === x;
  const color = (x: ArmaduraVoladizo, base: string) => (a(x) ? RESALTE : base);
  const grueso = (x: ArmaduraVoladizo, base: number) => (a(x) ? base * 1.8 : base);

  const largoM = n.extremoLibre + n.voladizo + n.luz + n.extremoLejano;
  const escala = Math.min(250 / largoM, 170 / n.h, 120 / n.b);
  const x0 = 64;
  const x = (s: number) => x0 + s * escala;
  const xFin = x(largoM);
  const xCarga = x(n.extremoLibre);
  const xCerca = x(n.extremoLibre + n.voladizo);
  const xLejos = x(n.extremoLibre + n.voladizo + n.luz);
  const anchoTotal = xFin + 64;
  const mm = (v: number) => (v / 1000) * escala;

  // ---------------------------------------------------------------- alzado
  const yTop = 52;
  const yBase = yTop + n.h * escala;
  const cob = mm(n.rec * 1000 + n.phiEstribo);
  const yTir = yTop + r.dTirSuperiorM * escala;
  const xIniTir = x0 + cob;
  const xFinTir = xFin - cob;
  const radio = Math.max(mm(mandrilMinimoMm(n.phiTirante) / 2 + n.phiTirante / 2), 3);
  const yAbajo = yBase - cob;

  const tirante =
    forma === "gancho"
      ? `M${xIniTir} ${yAbajo} L${xIniTir} ${yTir + radio} Q${xIniTir} ${yTir} ${xIniTir + radio} ${yTir} ` +
        `L${xFinTir - radio} ${yTir} Q${xFinTir} ${yTir} ${xFinTir} ${yTir + radio} L${xFinTir} ${yAbajo}`
      : `M${xIniTir} ${yTir} L${xFinTir} ${yTir}`;

  // Estribos repartidos de punta a punta; filas de piel de abajo hasta el tirante.
  const xEstribos = Array.from({ length: r.numeroEstribos }, (_, i) =>
    r.numeroEstribos > 1 ? x0 + mm(n.rec * 1000) + (i * (xFin - x0 - 2 * mm(n.rec * 1000))) / (r.numeroEstribos - 1) : (x0 + xFin) / 2
  );
  const yPielInf = yBase - cob - mm(n.phiPiel / 2);
  const yPiel = Array.from({ length: r.filasPiel }, (_, i) => yPielInf - (i * (yPielInf - yTir)) / r.filasPiel);

  const h = r.horquillas;
  const ramaCarga = h ? mm(h.largoRamaCargaMm) : 0;
  const ramaLejano = h ? mm(h.largoRamaLejanoMm) : 0;

  // ---------------------------------------------------------------- leyenda
  const leyenda: { x: ArmaduraVoladizo; texto: string; trazo: string; guiones?: string }[] = [
    { x: "tirante", texto: `tirante ${n.nTirante}Ø${n.phiTirante} · ${forma === "gancho" ? "doblado abajo" : forma === "recta" ? "recto" : "recto, con horquillas"}`, trazo: ACERO },
    ...(h ? [{ x: "horquillas" as const, texto: `${h.numero} horquillas en U Ø${n.phiHorquilla} · rama ${fmt(h.largoRamaCargaMm / 1000, 2)} / ${fmt(h.largoRamaLejanoMm / 1000, 2)} m`, trazo: ACERO, guiones: "5 3" }] : []),
    { x: "estribos", texto: `${r.numeroEstribos} estribos Ø${n.phiEstribo} c/ ${fmt(n.sepEstribo, 3)} m`, trazo: "currentColor" },
    { x: "piel", texto: `${r.filasPiel} filas Ø${n.phiPiel} c/ ${fmt(n.sepPiel, 3)} m por cara`, trazo: "currentColor", guiones: "4 3" },
    { x: "pilar", texto: `pilar lejano ${n.nPilar}Ø${n.phiPilar}, con patilla`, trazo: ACERO },
  ];
  const yLeyenda = yBase + 52;
  const altoAlzado = yLeyenda + leyenda.length * 18 + 4;

  // ---------------------------------------------------------------- planta
  // Capa del tirante con las ramas alternadas, igual que el motor: 2n barras
  // equiespaciadas entre recubrimientos; la U k abraza las barras k y n+1−k.
  const capa = h ? n.nTirante + 2 * h.numero : 0;
  const yPlanta = 30;
  const c0 = mm(n.rec * 1000 + n.phiEstribo + Math.max(n.phiTirante, n.phiHorquilla) / 2);
  const sep = capa > 1 ? (n.b * escala - 2 * c0) / (capa - 1) : 0;
  const yCapa = (i: number) => yPlanta + c0 + i * sep;
  const altoPlanta = yPlanta + n.b * escala + 48;
  // Índices en la capa: de cada cara hacia el centro, rama y barra alternadas.
  const indicesBarras: number[] = [];
  const ramas: [number, number][] = [];
  if (h) {
    for (let k = 0; k < h.numero; k++) {
      ramas.push([2 * k, capa - 1 - 2 * k]);
      indicesBarras.push(2 * k + 1, capa - 2 - 2 * k);
    }
    if (n.nTirante % 2 === 1) indicesBarras.push((capa - 1) / 2);
  }
  const u = (lado: "carga" | "lejano", [i, j]: [number, number]) => {
    const extremo = lado === "carga" ? xIniTir : xFinTir;
    const fin = lado === "carga" ? xIniTir + ramaCarga : xFinTir - ramaLejano;
    // Las del extremo lejano, un poco corridas: los dos solapes se cruzan en la luz.
    const corrimiento = lado === "carga" ? 0 : 2.5;
    const ya = yCapa(i) + corrimiento;
    const yb = yCapa(j) + corrimiento;
    const rr = (yb - ya) / 2;
    const s = lado === "carga" ? 1 : -1;
    // Rama, media vuelta por el extremo y rama de vuelta.
    return `M${fin} ${ya} L${extremo + s * rr} ${ya} A${rr} ${rr} 0 0 ${lado === "carga" ? 0 : 1} ${extremo + s * rr} ${yb} L${fin} ${yb}`;
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <svg viewBox={`0 0 ${anchoTotal} ${altoAlzado}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <text x={4} y={16} className="fill-current font-mono" fontSize="12" opacity="0.7">ALZADO</text>

        {/* pilares, sólo de referencia */}
        {[
          [xCarga, n.cargaAncho, yTop - 26],
          [xLejos, n.elemLAncho, yTop - 26],
          [xCerca, n.apoyoCAncho, yBase],
          [xLejos, n.apoyoLAncho, yBase],
        ].map(([xc, ancho, y], i) => (
          <rect key={i} x={xc - (ancho * escala) / 2} y={y} width={ancho * escala} height={26}
                fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth="1" opacity="0.7" />
        ))}
        <rect x={x0} y={yTop} width={xFin - x0} height={yBase - yTop} fill="var(--mat-hormigon)" stroke="currentColor" strokeWidth="1.6" />

        {/* estribos */}
        {xEstribos.map((xe, i) => (
          <path key={i} d={`M${xe} ${yTop + cob - mm(n.phiEstribo)} L${xe} ${yBase - cob + mm(n.phiEstribo)}`}
                stroke={color("estribos", "currentColor")} strokeWidth={grueso("estribos", 0.7)} opacity={a("estribos") ? 1 : 0.55} />
        ))}
        {/* barras horizontales de las caras */}
        {yPiel.map((yp, i) => (
          <path key={i} d={`M${xIniTir} ${yp} L${xFinTir} ${yp}`} stroke={color("piel", "currentColor")}
                strokeWidth={grueso("piel", 0.8)} strokeDasharray="4 3" opacity={a("piel") ? 1 : 0.6} />
        ))}
        {/* barras del pilar lejano, con la patilla bajo el tirante doblada hacia la luz */}
        {[-1, 1].map((s) => {
          const xb = xLejos + (s * n.apoyoLAncho * escala) / 4;
          return (
            <path key={s} d={`M${xb} ${yBase + 24} L${xb} ${yTir + 6} L${xb - 12} ${yTir + 6}`}
                  stroke={color("pilar", ACERO)} strokeWidth={grueso("pilar", 1.4)} />
          );
        })}
        {/* horquillas: en alzado quedan a la altura del tirante, del extremo hacia adentro */}
        {h && (
          <g stroke={color("horquillas", ACERO)} strokeWidth={grueso("horquillas", 1.4)} strokeDasharray="5 3">
            <path d={`M${xIniTir} ${yTir + 5} L${xIniTir + ramaCarga} ${yTir + 5}`} />
            <path d={`M${xFinTir} ${yTir + 5} L${xFinTir - ramaLejano} ${yTir + 5}`} />
          </g>
        )}
        {/* tirante */}
        <path d={tirante} stroke={a("tirante") || a("extremos") ? RESALTE : ACERO} strokeWidth={a("tirante") || a("extremos") ? 3.6 : 2.4} />

        {leyenda.map((l, i) => {
          const y = yLeyenda + i * 18;
          return (
            <g key={l.x}>
              <path d={`M4 ${y - 4} L28 ${y - 4}`} stroke={color(l.x, l.trazo)} strokeWidth={a(l.x) ? 3 : 2} strokeDasharray={l.guiones} />
              <text x={34} y={y} className="font-mono" fontSize="12" fill={a(l.x) ? RESALTE : "currentColor"} fontWeight={a(l.x) ? 700 : 400}>
                {l.texto}
              </text>
            </g>
          );
        })}
      </svg>

      {h && (
        <svg viewBox={`0 0 ${anchoTotal} ${altoPlanta}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
          <text x={4} y={16} className="fill-current font-mono" fontSize="12" opacity="0.7">PLANTA, A LA ALTURA DEL TIRANTE</text>
          <rect x={x0} y={yPlanta} width={xFin - x0} height={n.b * escala} stroke="currentColor" strokeWidth="1.4" />
          {indicesBarras.map((i) => (
            <path key={i} d={`M${xIniTir} ${yCapa(i)} L${xFinTir} ${yCapa(i)}`}
                  stroke={a("tirante") ? RESALTE : ACERO} strokeWidth={a("tirante") ? 2.4 : 1.4} />
          ))}
          <g stroke={color("horquillas", "currentColor")} strokeWidth={grueso("horquillas", 1.3)}>
            {ramas.map((par, k) => (
              <g key={k}>
                <path d={u("carga", par)} />
                <path d={u("lejano", par)} strokeDasharray="5 3" />
              </g>
            ))}
          </g>
          <text x={4} y={altoPlanta - 22} className="fill-current font-mono" fontSize="11.5" opacity="0.8">
            lleno: U del voladizo · a trazos: lejanas
          </text>
          <text x={4} y={altoPlanta - 6} className="fill-current font-mono" fontSize="11.5" opacity="0.8">
            solape con el tirante l0 = {fmt(h.l0Mm / 1000, 2)} m
          </text>
        </svg>
      )}
    </div>
  );
}
