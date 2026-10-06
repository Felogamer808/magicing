"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";
import type { PosicionPilar } from "@/lib/calc/hormigon/losas/punzonamiento";

/*
 * Croquis esquemáticos de entrada: acompañan a los campos y rotulan los mismos
 * símbolos. No están a escala y no dependen de los datos cargados — el dibujo a
 * escala del caso real es `PlantaPunzonamiento`, del lado de los resultados.
 */

// Pilar y offset del perímetro, comunes a las tres posiciones para que se vean
// como el mismo dibujo con el borde puesto en distintos lados.
const PX0 = 95;
const PX1 = 145;
const PY0 = 42;
const PY1 = 102;
const R = 20;

function Pilar() {
  return (
    <rect
      x={PX0}
      y={PY0}
      width={PX1 - PX0}
      height={PY1 - PY0}
      fill="var(--mat-hormigon)"
      stroke="var(--mat-hormigon-borde)"
      strokeWidth="1.4"
    />
  );
}

/** Borde libre de la losa, con el rayado del lado de afuera. */
function BordeLibre({ orientacion }: { orientacion: "inferior" | "izquierdo" }) {
  const esInferior = orientacion === "inferior";
  return (
    <g>
      <rect
        x={esInferior ? 0 : 0}
        y={esInferior ? PY1 : 0}
        width={esInferior ? 240 : PX0}
        height={esInferior ? 60 : 170}
        fill="url(#punz-croquis-borde)"
      />
      <line
        x1={esInferior ? 0 : PX0}
        y1={esInferior ? PY1 : 0}
        x2={esInferior ? 240 : PX0}
        y2={esInferior ? PY1 : 170}
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </g>
  );
}

const PERIMETRO_POR_POSICION: Record<PosicionPilar, string> = {
  // Rectángulo redondeado completo: el offset a 2d de un rectángulo.
  interior: `M${PX0} ${PY0 - R} L${PX1} ${PY0 - R} A${R} ${R} 0 0 1 ${PX1 + R} ${PY0} L${PX1 + R} ${PY1} A${R} ${R} 0 0 1 ${PX1} ${PY1 + R} L${PX0} ${PY1 + R} A${R} ${R} 0 0 1 ${PX0 - R} ${PY1} L${PX0 - R} ${PY0} A${R} ${R} 0 0 1 ${PX0} ${PY0 - R} Z`,
  // Cortado contra el borde de abajo: el tramo que caería sobre el borde libre
  // no computa, y por eso la curva queda abierta.
  borde: `M${PX1 + R} ${PY1} L${PX1 + R} ${PY0} A${R} ${R} 0 0 0 ${PX1} ${PY0 - R} L${PX0} ${PY0 - R} A${R} ${R} 0 0 0 ${PX0 - R} ${PY0} L${PX0 - R} ${PY1}`,
  // Cortado contra los dos bordes: sólo queda el cuadrante de adentro.
  esquina: `M${PX1 + R} ${PY1} L${PX1 + R} ${PY0} A${R} ${R} 0 0 0 ${PX1} ${PY0 - R} L${PX0} ${PY0 - R}`,
};

const NOTA_POR_POSICION: Record<PosicionPilar, string> = {
  interior:
    "El perímetro crítico rodea el pilar a 2d de sus caras, con las esquinas redondeadas: u1 = 2(c1 + c2) + 4πd.",
  borde:
    "Contra el borde libre el perímetro se corta y no se cierra: el borde no computa. Si el pilar queda retirado del borde, cargá esa distancia y el perímetro se estira hasta ahí.",
  esquina:
    "Con dos bordes libres sólo queda el cuadrante interior. Es el caso más exigente: mismo pilar y misma carga sobre menos de la mitad de perímetro.",
};

/**
 * Planta del pilar con su perímetro crítico, según dónde esté.
 *
 * c1 y c2 no son intercambiables en borde ni en esquina: la fórmula de u0 del
 * art. 6.4.5(3) distingue el lado perpendicular al borde del paralelo, así que
 * el croquis los rotula sobre el dibujo en vez de dejarlo a la interpretación.
 */
export function CroquisPosicionPilar({ posicion }: { posicion: PosicionPilar }) {
  return (
    <Croquis viewBox="0 0 240 170" ancho="max-w-[19rem]" nota={NOTA_POR_POSICION[posicion]}>
      <defs>
        <pattern
          id="punz-croquis-borde"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="0.9" opacity="0.35" />
        </pattern>
      </defs>

      {posicion !== "interior" && <BordeLibre orientacion="inferior" />}
      {posicion === "esquina" && <BordeLibre orientacion="izquierdo" />}

      <path
        d={PERIMETRO_POR_POSICION[posicion]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray="6 3"
      />

      <Pilar />

      {/* c2 corre paralelo al borde; c1, perpendicular. */}
      <CotaH x0={PX0} x1={PX1} y={PY0 - R - 8} texto="c2" />
      <CotaV x={PX1 + R + 22} y0={PY0} y1={PY1} texto="c1" />
      <Referencia
        x={PX1 + R + 6}
        y={PY1 + R + 14}
        hacia={[PX1 + R, PY1 - 6]}
        texto="u1 a 2d"
      />
    </Croquis>
  );
}

/**
 * Sección: de dónde salen los dos cortes que se comprueban.
 *
 * Es el dibujo que explica por qué son dos comprobaciones y no una. En la cara
 * del pilar se agota la biela comprimida, y ése es un techo que no se levanta
 * armando. A 2d se agota la tracción diagonal, y eso sí se arregla con armadura.
 */
export function CroquisSeccionPunzonamiento() {
  const yTop = 34;
  const yBot = 86;
  const xPilar0 = 100;
  const xPilar1 = 140;

  return (
    <Croquis
      viewBox="0 0 250 140"
      ancho="max-w-[19rem]"
      nota="El cono rompe a 26,6° (arc tg 1/2), que es lo que pone el perímetro crítico a 2d. En la cara del pilar se comprueba la biela; a 2d, la tracción diagonal."
    >
      {/* Losa de canto. */}
      <rect
        x={10}
        y={yTop}
        width={230}
        height={yBot - yTop}
        fill="var(--mat-hormigon)"
        stroke="var(--mat-hormigon-borde)"
        strokeWidth="1.6"
      />

      {/* Pilar debajo. */}
      <rect
        x={xPilar0}
        y={yBot}
        width={xPilar1 - xPilar0}
        height={34}
        fill="var(--mat-hormigon)"
        stroke="var(--mat-hormigon-borde)"
        strokeWidth="1.4"
      />

      {/* Cono de punzonamiento: 2d en horizontal por d en vertical. */}
      <g stroke="currentColor" strokeWidth="1.6" strokeDasharray="5 3">
        <path d={`M${xPilar0} ${yBot} L${xPilar0 - 2 * (yBot - yTop - 8)} ${yTop + 8}`} />
        <path d={`M${xPilar1} ${yBot} L${xPilar1 + 2 * (yBot - yTop - 8)} ${yTop + 8}`} />
      </g>

      {/* Armadura de negativos: la que entra en ρl. */}
      <path d={`M18 ${yTop + 8} L232 ${yTop + 8}`} stroke="currentColor" strokeWidth="2.2" />

      <CotaV x={24} y0={yTop + 8} y1={yBot} texto="d" />
      <Referencia x={150} y={yTop - 6} hacia={[196, yTop + 10]} texto="ρl (negativos)" />
      <Referencia x={82} y={yBot + 26} hacia={[xPilar0, yBot + 2]} texto="u0" anclaje="end" />
      <Referencia x={200} y={yBot + 26} hacia={[xPilar1 + 2 * (yBot - yTop - 8), yTop + 10]} texto="u1 a 2d" />
    </Croquis>
  );
}

/**
 * Armadura de punzonamiento: los cuatro datos que la norma acota y que son los
 * que se olvidan, porque ninguno sale del cálculo de resistencia sino del
 * art. 9.4.3.
 */
export function CroquisArmaduraPunzonamiento() {
  const yTop = 30;
  const yBot = 78;
  const xPilar1 = 96;
  const ramas = [110, 134, 158, 182];

  return (
    <Croquis
      viewBox="0 0 250 132"
      ancho="max-w-[19rem]"
      nota="El primero no puede pasarse de d/2 de la cara del pilar, y de ahí en más sr ≤ 0,75d. st es la separación entre ramas dentro de un mismo perímetro, medida en planta."
    >
      <rect
        x={10}
        y={yTop}
        width={230}
        height={yBot - yTop}
        fill="var(--mat-hormigon)"
        stroke="var(--mat-hormigon-borde)"
        strokeWidth="1.6"
      />
      <rect
        x={56}
        y={yBot}
        width={xPilar1 - 56}
        height={26}
        fill="var(--mat-hormigon)"
        stroke="var(--mat-hormigon-borde)"
        strokeWidth="1.4"
      />

      {/* Cercos verticales, dibujados como ramas de punta. */}
      <g stroke="currentColor" strokeWidth="2">
        {ramas.map((x) => (
          <path key={x} d={`M${x} ${yTop + 7} L${x} ${yBot - 7}`} />
        ))}
      </g>

      <CotaH x0={xPilar1} x1={ramas[0]} y={yTop - 6} texto="≤ d/2" />
      <CotaH x0={ramas[0]} x1={ramas[1]} y={yBot + 16} texto="sr" />
      <Referencia x={196} y={yTop + 4} hacia={[ramas[3], yTop + 10]} texto="Asw por perímetro" />
    </Croquis>
  );
}
