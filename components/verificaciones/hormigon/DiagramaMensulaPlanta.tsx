"use client";

import type { CercoDispuesto } from "@/lib/calc/ec2/mensula-corta";
import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaMensulaPlantaProps {
  hcolM: number;
  vueloTotalM: number;
  bM: number;
  acM: number;
  apM: number;
  bpM: number;
  recubrimientoM: number;
  cercos: CercoDispuesto[];
  numeroBarras: number;
  diametroPrincipalMm: number;
  diametroCercoMm: number;
  anchoCercoM: number;
}

/**
 * La ménsula vista desde arriba. Es la única vista donde los cercos cerrados se
 * leen como lo que son: lazos que cruzan la pieza entera y vuelven, no dos ramas
 * sueltas. En alzado se superponen y parecen una sola línea.
 *
 * Se dibujan encajados y no uno encima del otro porque están a profundidades
 * distintas y cada uno tiene su propia longitud: el de más abajo llega menos
 * lejos, porque el intradós ya se vino para atrás.
 */
export function DiagramaMensulaPlanta({
  hcolM,
  vueloTotalM,
  bM,
  acM,
  apM,
  bpM,
  recubrimientoM,
  cercos,
  numeroBarras,
  diametroPrincipalMm,
  diametroCercoMm,
  anchoCercoM,
}: DiagramaMensulaPlantaProps) {
  const anchoRealM = hcolM + vueloTotalM;
  const W = 300;
  const escala = W / anchoRealM;
  const x0 = 26;
  const y0 = 40;

  const X = (m: number) => x0 + m * escala;
  // y en planta mide el ancho b de la pieza, con el eje en el medio.
  const Y = (m: number) => y0 + m * escala;

  const horizontales = cercos.filter((c) => c.tipo === "horizontal");
  const yCercoSup = Y(recubrimientoM);
  const yCercoInf = Y(recubrimientoM + anchoCercoM);

  const yBase = Y(bM);
  const alto = yBase + 62;

  // Las barras del marco se reparten dentro del cerco, que es lo que las sujeta.
  const xBarraIni = recubrimientoM + diametroCercoMm / 1000 + diametroPrincipalMm / 2000;
  const anchoUtilM = bM - 2 * xBarraIni;

  return (
    <svg
      viewBox={`0 0 ${W + x0 + 26} ${alto}`}
      className="h-auto w-full text-primary"
      fill="none"
      aria-hidden="true"
    >
      {/* pilar y ménsula en planta */}
      <rect
        x={X(0)}
        y={Y(0)}
        width={hcolM * escala}
        height={bM * escala}
        stroke="currentColor"
        strokeWidth="1.8"
        fill="var(--color-muted)"
        fillOpacity="0.3"
      />
      <rect
        x={X(hcolM)}
        y={Y(0)}
        width={vueloTotalM * escala}
        height={bM * escala}
        stroke="currentColor"
        strokeWidth="1.8"
        fill="var(--color-muted)"
        fillOpacity="0.3"
      />

      {/* placa de apoyo */}
      <rect
        x={X(hcolM + acM - apM / 2)}
        y={Y((bM - bpM) / 2)}
        width={apM * escala}
        height={bpM * escala}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="4 3"
        opacity="0.8"
      />

      {/* cercos cerrados, encajados */}
      {horizontales.map((c, i) => (
        <rect
          key={i}
          x={X(c.x1M)}
          y={yCercoSup + i * 2.2}
          width={(c.x2M - c.x1M) * escala}
          height={yCercoInf - yCercoSup - i * 4.4}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity={0.85 - i * 0.08}
          rx="3"
        />
      ))}

      {/* barras del marco, longitudinales */}
      {Array.from({ length: numeroBarras }, (_, i) => {
        const yM =
          xBarraIni + (numeroBarras > 1 ? (i * anchoUtilM) / (numeroBarras - 1) : anchoUtilM / 2);
        return (
          <circle
            key={i}
            cx={X(hcolM + acM)}
            cy={Y(yM)}
            r="3.2"
            fill="currentColor"
            stroke="none"
          />
        );
      })}

      <text
        x={X(hcolM + vueloTotalM)}
        y={yBase + 18}
        textAnchor="end"
        className="fill-current font-mono"
        fontSize="10"
      >
        {horizontales.length} cercos horizontales ø{diametroCercoMm}
      </text>
      <text x={X(0)} y={yBase + 18} className="fill-current font-mono" fontSize="10">
        b = {fmt(bM)} m
      </text>
      <text
        x={X(0)}
        y={yBase + 32}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.85"
      >
        {numeroBarras}ø{diametroPrincipalMm} repartidos en el ancho
      </text>
      <text
        x={X(0)}
        y={yBase + 46}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.7"
      >
        Placa {fmt(apM * 1000, 0)} × {fmt(bpM * 1000, 0)} mm
      </text>
      <text
        x={X(hcolM + acM)}
        y={y0 - 12}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.85"
      >
        eje de la carga
      </text>
    </svg>
  );
}
