"use client";

import { fmt } from "@/lib/verificaciones/formato";
import type { TramoL0 } from "@/lib/calc/hormigon/vigas/seccion-t";
import { CotaH, CotaV, Croquis } from "./Croquis";

const m = (v: number) => `${fmt(v, 2)} m`;

interface CroquisSeccionTProps {
  /** T invertida: el ala abajo. */
  invertida: boolean;
  anchoAlaM: number;
  almaM: number;
  cantoM: number;
  espesorAlaM: number;
  /** b_eff: se marca dentro del ala si es menor que el ancho real. */
  anchoEficazM?: number;
}

/**
 * Geometría de la sección en T, sin barras: qué es el ala, qué es el alma y
 * qué mide cada cota. Las cotas del ala van del lado del ala y la del alma
 * del lado opuesto, así en la T invertida no queda una cota "ala" arriba
 * cuando el ala está abajo.
 *
 * A escala, salvo que el ala o el alma salgan demasiado finos para leerse: ahí
 * se engrosan un poco, y las cotas siguen diciendo la medida real.
 */
export function CroquisSeccionT({ invertida, anchoAlaM, almaM, cantoM, espesorAlaM, anchoEficazM }: CroquisSeccionTProps) {
  if (!(anchoAlaM > 0 && almaM > 0 && cantoM > 0 && espesorAlaM > 0)) return null;

  const ANCHO = 170;
  const ALTO = 104;
  const escala = Math.min(ANCHO / Math.max(anchoAlaM, almaM), ALTO / cantoM);
  const wAla = Math.max(anchoAlaM, almaM) * escala;
  const wAlma = Math.max(almaM * escala, 14);
  const h = cantoM * escala;
  const hf = Math.min(Math.max(espesorAlaM * escala, 10), h - 12);

  const cx = 140;
  const xa0 = cx - wAla / 2;
  const xa1 = cx + wAla / 2;
  const x0 = cx - wAlma / 2;
  const x1 = cx + wAlma / 2;
  const y0 = 34;
  const y1 = y0 + h;
  const yAla0 = invertida ? y1 - hf : y0;
  const yAla1 = yAla0 + hf;

  const contorno = invertida
    ? `M${x0} ${y0} H${x1} V${yAla0} H${xa1} V${y1} H${xa0} V${yAla0} H${x0} Z`
    : `M${xa0} ${y0} H${xa1} V${yAla1} H${x1} V${y1} H${x0} V${yAla1} H${xa0} Z`;

  // Del lado del ala: su ancho y, más afuera, el eficaz. Del otro, el alma.
  // La cota rotula arriba de su línea: abajo de la sección necesita más
  // separación para que el texto no pise el borde.
  const ladoAla = (separacion: number) => (invertida ? y1 + separacion + 8 : y0 - separacion);
  const ladoAlma = (separacion: number) => (invertida ? y0 - separacion : y1 + separacion + 8);
  const conEficaz = anchoEficazM !== undefined && anchoEficazM < anchoAlaM - 1e-9;
  const wEficaz = conEficaz ? anchoEficazM * escala : wAla;

  return (
    <Croquis
      viewBox={`0 0 300 ${y1 + 62}`}
      ancho="max-w-[19rem]"
      nota={
        invertida
          ? "T invertida: el ala está abajo y colabora a compresión con el momento negativo."
          : "T: el ala está arriba y colabora a compresión con el momento positivo."
      }
    >
      <path d={contorno} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      {/* unión ala–alma, punteada: dónde termina el ala */}
      <path
        d={`M${x0} ${invertida ? yAla0 : yAla1} H${x1}`}
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="3 2"
        opacity="0.6"
      />
      {conEficaz && (
        <g stroke="var(--mat-cota)" strokeWidth="1" strokeDasharray="3 3">
          <path d={`M${cx - wEficaz / 2} ${yAla0 - 3} V${yAla1 + 3}`} />
          <path d={`M${cx + wEficaz / 2} ${yAla0 - 3} V${yAla1 + 3}`} />
        </g>
      )}

      <text x={xa0 + 4} y={(yAla0 + yAla1) / 2 + 3.5} className="fill-current font-mono" fontSize="10">
        ala
      </text>
      <text
        x={cx}
        y={invertida ? (y0 + yAla0) / 2 + 3.5 : (yAla1 + y1) / 2 + 3.5}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="10"
      >
        alma
      </text>

      <CotaH x0={xa0} x1={xa1} y={ladoAla(12)} texto={`b = ${m(anchoAlaM)}`} />
      {conEficaz && <CotaH x0={cx - wEficaz / 2} x1={cx + wEficaz / 2} y={ladoAla(30)} texto={`b_eff = ${m(anchoEficazM)}`} />}
      <CotaH x0={x0} x1={x1} y={ladoAlma(12)} texto={`bw = ${m(almaM)}`} />
      <CotaV x={xa0 - 14} y0={y0} y1={y1} texto={`h = ${m(cantoM)}`} />
      <CotaV x={xa1 + 16} y0={yAla0} y1={yAla1} texto="hf" />
      <text x={xa1 + 22} y={(yAla0 + yAla1) / 2 + 3.5} className="fill-current font-mono" fontSize="10">
        {m(espesorAlaM)}
      </text>
    </Croquis>
  );
}

/** Zona de la viga de cada caso de la fig. A19.5.2, en las coordenadas del croquis. */
const ZONAS: Record<Exclude<TramoL0, "manual">, { x0: number; x1: number; texto: string }> = {
  simple: { x0: 0, x1: 0, texto: "" },
  extremo: { x0: 20, x1: 105, texto: "0,85·l1" },
  apoyo: { x0: 105, x1: 135, texto: "0,15·(l1+l2)" },
  interior: { x0: 135, x1: 205, texto: "0,7·l2" },
  voladizo: { x0: 205, x1: 290, texto: "0,15·l2 + l3" },
};

/**
 * l0 según la fig. A19.5.2 del Anejo 19: la distancia entre los puntos de
 * momento nulo, que en una viga continua no coinciden con los apoyos. Se
 * resalta la zona elegida; en un vano simple los momentos nulos son los
 * apoyos y l0 es la luz.
 */
export function CroquisL0({ tramo }: { tramo: TramoL0 }) {
  if (tramo === "simple") {
    return (
      <Croquis viewBox="0 0 300 78" ancho="max-w-[19rem]" nota="Vano simple: los momentos nulos están en los apoyos, l0 = l.">
        <path d="M40 30 H260" stroke="currentColor" strokeWidth="3" />
        {[40, 260].map((x) => (
          <path key={x} d={`M${x} 32 l-7 12 h14 Z`} stroke="currentColor" strokeWidth="1" />
        ))}
        <rect x="40" y="48" width="220" height="10" fill="var(--mat-cota)" opacity="0.25" />
        <CotaH x0={40} x1={260} y={68} texto="l0 = l" />
      </Croquis>
    );
  }
  return (
    <Croquis
      viewBox="0 0 300 118"
      ancho="max-w-[20rem]"
      nota="Fig. A19.5.2: en una viga continua los momentos nulos no están en los apoyos. Va la zona donde el ala queda comprimida."
    >
      {/* viga continua: apoyo extremo, dos intermedios y un voladizo */}
      <path d="M20 30 H290" stroke="currentColor" strokeWidth="3" />
      {[20, 120, 220].map((x) => (
        <path key={x} d={`M${x} 32 l-7 12 h14 Z`} stroke="currentColor" strokeWidth="1" />
      ))}
      {(Object.keys(ZONAS) as (keyof typeof ZONAS)[])
        .filter((k) => k !== "simple")
        .map((k) => {
          const z = ZONAS[k];
          const activa = k === tramo;
          return (
            <g key={k}>
              <rect
                x={z.x0}
                y={48}
                width={z.x1 - z.x0}
                height={12}
                fill={activa ? "var(--mat-cota)" : "currentColor"}
                opacity={activa ? 0.35 : 0.08}
                stroke="currentColor"
                strokeWidth="0.5"
              />
              <text
                x={(z.x0 + z.x1) / 2}
                y={k === "apoyo" ? 74 : 20}
                textAnchor="middle"
                className="fill-current font-mono"
                fontSize="8.5"
                fontWeight={activa ? 700 : 400}
              >
                {z.texto}
              </text>
            </g>
          );
        })}
      <CotaH x0={20} x1={120} y={102} texto="l1" />
      <CotaH x0={120} x1={220} y={102} texto="l2" />
      <CotaH x0={220} x1={290} y={102} texto="l3" />
    </Croquis>
  );
}
