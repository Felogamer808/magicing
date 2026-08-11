"use client";

import type { CercoDispuesto, PuntoMarco } from "@/lib/calc/ec2/mensula-corta";
import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaMensulaArmadoProps {
  hcM: number;
  h1M: number;
  hcolM: number;
  vueloTotalM: number;
  marco: PuntoMarco[];
  cercos: CercoDispuesto[];
  numeroBarras: number;
  diametroPrincipalMm: number;
  diametroCercoMm: number;
  numeroCercos: number;
  numeroCercosHorizontales: number;
  caso: "horizontales" | "verticales";
  lbdMensulaMm: number;
  disponibleMensulaMm: number;
  lbdPilarMm: number;
  pataPilarMm: number;
}

/**
 * El armado en alzado: el marco principal cerrado y los cercos ya ubicados.
 *
 * El marco no es una barra recta con una patilla, es un lazo: entra en el pilar,
 * corre por la cara superior, baja por el borde exterior y vuelve por el
 * intradós —fig. A19.J.6, letra A, "dispositivos de anclaje o lazos"—. Se dibuja
 * entero porque el anclaje se mide sobre el eje de la barra (art. 8.4.3(3)) y
 * son justamente la bajada y el retorno los que dan la longitud disponible del
 * lado de la ménsula: sin ellos el marco no ancla.
 *
 * Las posiciones vienen calculadas del motor; acá sólo se escalan.
 */
export function DiagramaMensulaArmado({
  hcM,
  h1M,
  hcolM,
  vueloTotalM,
  marco,
  cercos,
  numeroBarras,
  diametroPrincipalMm,
  diametroCercoMm,
  numeroCercos,
  numeroCercosHorizontales,
  caso,
  lbdMensulaMm,
  disponibleMensulaMm,
  lbdPilarMm,
  pataPilarMm,
}: DiagramaMensulaArmadoProps) {
  const anchoRealM = hcolM + vueloTotalM;
  const W = 300;
  const escala = W / anchoRealM;
  const x0 = 26;
  const y0 = 30;

  const X = (m: number) => x0 + m * escala;
  const Y = (m: number) => y0 + m * escala;

  const yBase = Y(hcM);
  const yPilarSup = y0 - 22;
  const yPilarInf = yBase + 54;

  const horizontales = cercos.filter((c) => c.tipo === "horizontal");
  const verticales = cercos.filter((c) => c.tipo === "vertical");

  const alto = yPilarInf + 66;

  return (
    <svg
      viewBox={`0 0 ${W + x0 + 26} ${alto}`}
      className="h-auto w-full text-primary"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x={X(0)}
        y={yPilarSup}
        width={hcolM * escala}
        height={yPilarInf - yPilarSup}
        stroke="currentColor"
        strokeWidth="1.8"
        fill="var(--color-muted)"
        fillOpacity="0.3"
      />
      <path
        d={`M${X(hcolM)} ${y0} L${X(hcolM + vueloTotalM)} ${y0} L${X(
          hcolM + vueloTotalM
        )} ${Y(h1M)} L${X(hcolM)} ${yBase} Z`}
        stroke="currentColor"
        strokeWidth="1.8"
        fill="var(--color-muted)"
        fillOpacity="0.3"
      />

      {/* cercos, por debajo del marco para que el marco se lea encima */}
      {horizontales.map((c, i) => (
        <path
          key={`h${i}`}
          d={`M${X(c.x1M)} ${Y(c.y1M)} L${X(c.x2M)} ${Y(c.y2M)}`}
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.75"
        />
      ))}
      {verticales.map((c, i) => (
        <path
          key={`v${i}`}
          d={`M${X(c.x1M)} ${Y(c.y1M)} L${X(c.x2M)} ${Y(c.y2M)}`}
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.75"
        />
      ))}

      {/* marco principal cerrado */}
      <path
        d={marco
          .map((p, i) => `${i === 0 ? "M" : "L"}${X(p.xM)} ${Y(p.yM)}`)
          .join(" ")}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* rótulos */}
      <text
        x={X(hcolM + vueloTotalM)}
        y={Y(marco[2]?.yM ?? 0) - 8}
        textAnchor="end"
        className="fill-current font-mono"
        fontSize="11"
      >
        {numeroBarras}ø{diametroPrincipalMm}
      </text>
      <text
        x={X(hcolM + vueloTotalM)}
        y={yPilarInf + 18}
        textAnchor="end"
        className="fill-current font-mono"
        fontSize="10"
      >
        {caso === "horizontales"
          ? `${numeroCercos} cercos ø${diametroCercoMm} horizontales`
          : `${numeroCercos} cercos ø${diametroCercoMm} verticales + ${numeroCercosHorizontales} horizontales`}
      </text>
      <text
        x={X(0)}
        y={yPilarInf + 32}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.85"
      >
        Pata en el pilar {fmt(pataPilarMm, 0)} mm para l_bd = {fmt(lbdPilarMm, 0)} mm
      </text>
      <text
        x={X(0)}
        y={yPilarInf + 44}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.85"
      >
        En la ménsula l_bd = {fmt(lbdMensulaMm, 0)}{" "}
        {disponibleMensulaMm >= lbdMensulaMm ? "≤" : ">"} {fmt(disponibleMensulaMm, 0)}{" "}
        mm sobre el eje
      </text>
      <text
        x={X(0)}
        y={yPilarInf + 58}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.7"
      >
        Marco cerrado — fig. A19.J.6, letra A
      </text>
    </svg>
  );
}
