"use client";

import { CapaMaterial } from "@/components/verificaciones/croquis/Primitivas";
import { fmt } from "@/lib/verificaciones/formato";

interface ConvencionMomentosVigaProps {
  momentoPositivoKNm: number;
  /** En valor absoluto, como lo pide el formulario. */
  momentoNegativoKNm: number;
  resaltar?: "positivo" | "negativo" | null;
}

/**
 * Convención de signos de los dos momentos que pide la calculadora: un tramo
 * de viga, sin apoyos ni cargas, porque la herramienta recibe los esfuerzos ya
 * resueltos y dibujar un modelo de vano sería inventar uno que no existe.
 *
 * Lo que se lee: el positivo comprime arriba y tracciona abajo, y lo toma la
 * armadura inferior; el negativo al revés. Es la convención que usa el cálculo:
 * la armadura "positiva" se ubica abajo y de ella sale el canto útil.
 */
export function ConvencionMomentosViga({
  momentoPositivoKNm,
  momentoNegativoKNm,
  resaltar = null,
}: ConvencionMomentosVigaProps) {
  return (
    <svg
      viewBox="0 0 460 140"
      className="h-auto w-full max-w-[34rem] text-primary"
      fill="none"
      role="img"
      aria-label={`Convención de signos. Momento positivo de ${fmt(momentoPositivoKNm, 1)} kN·m: tracciona la cara inferior y lo toma la armadura inferior. Momento negativo de ${fmt(momentoNegativoKNm, 1)} kN·m: tracciona la cara superior y lo toma la armadura superior.`}
    >
      <Panel
        x={10}
        signo="positivo"
        titulo="Momento positivo · armadura inferior"
        valor={`M+ = ${fmt(momentoPositivoKNm, 1)} kN·m`}
        resaltado={resaltar === "positivo"}
      />
      <Panel
        x={240}
        signo="negativo"
        titulo="Momento negativo · armadura superior"
        valor={`M− = ${fmt(momentoNegativoKNm, 1)} kN·m`}
        resaltado={resaltar === "negativo"}
      />
    </svg>
  );
}

function Panel({
  x,
  signo,
  titulo,
  valor,
  resaltado,
}: {
  x: number;
  signo: "positivo" | "negativo";
  titulo: string;
  valor: string;
  resaltado: boolean;
}) {
  const xa = x + 40;
  const xb = x + 170;
  const yc = 52;
  const yArriba = yc - 12;
  const yAbajo = yc + 12;
  const r = 15;
  const positivo = signo === "positivo";
  // Cara traccionada y fila de barras que la toman.
  const yTraccion = positivo ? yAbajo : yArriba;
  const yBarras = positivo ? yAbajo - 4.5 : yArriba + 4.5;
  const color = resaltado ? "var(--mat-cota)" : "currentColor";

  // Arcos de momento en cada extremo. Positivo: horario a la izquierda,
  // antihorario a la derecha, puntas arriba hacia adentro (comprimen arriba).
  // Negativo: el espejo vertical.
  const arcoIzq = positivo
    ? `M${xa} ${yc + r} A${r} ${r} 0 0 1 ${xa} ${yc - r}`
    : `M${xa} ${yc - r} A${r} ${r} 0 0 0 ${xa} ${yc + r}`;
  const puntaIzq = positivo
    ? `M${xa - 5} ${yc - r - 4} L${xa} ${yc - r} L${xa - 5} ${yc - r + 4}`
    : `M${xa - 5} ${yc + r - 4} L${xa} ${yc + r} L${xa - 5} ${yc + r + 4}`;
  const arcoDer = positivo
    ? `M${xb} ${yc + r} A${r} ${r} 0 0 0 ${xb} ${yc - r}`
    : `M${xb} ${yc - r} A${r} ${r} 0 0 1 ${xb} ${yc + r}`;
  const puntaDer = positivo
    ? `M${xb + 5} ${yc - r - 4} L${xb} ${yc - r} L${xb + 5} ${yc - r + 4}`
    : `M${xb + 5} ${yc + r - 4} L${xb} ${yc + r} L${xb + 5} ${yc + r + 4}`;

  return (
    <g>
      {resaltado && (
        <rect x={x} y={6} width={210} height={128} rx={6} fill="var(--mat-cota)" fillOpacity="0.07" />
      )}
      <CapaMaterial x={xa} y={yArriba} ancho={xb - xa} alto={yAbajo - yArriba} material="hormigon" />
      {Array.from({ length: 6 }).map((_, i) => (
        <circle key={i} cx={xa + 12 + (i * (xb - xa - 24)) / 5} cy={yBarras} r={2.4} fill="var(--mat-armadura)" />
      ))}
      {/* Cara traccionada */}
      <path d={`M${xa} ${yTraccion} L${xb} ${yTraccion}`} stroke="var(--destructive)" strokeWidth="2.2" />
      <text
        x={(xa + xb) / 2}
        y={positivo ? yAbajo + 13 : yArriba - 6}
        textAnchor="middle"
        fill="var(--destructive)"
        className="font-mono"
        fontSize="9"
      >
        tracción
      </text>
      <g stroke={color} strokeWidth="1.4">
        <path d={arcoIzq} />
        <path d={puntaIzq} />
        <path d={arcoDer} />
        <path d={puntaDer} />
      </g>
      <text x={x + 105} y={positivo ? 104 : 104} textAnchor="middle" className="fill-foreground" fontSize="11.5" fontWeight={600}>
        {titulo}
      </text>
      <text x={x + 105} y={121} textAnchor="middle" className="font-mono" fontSize="10.5" fill={color}>
        {valor}
      </text>
    </g>
  );
}
