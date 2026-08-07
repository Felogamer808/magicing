"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaVigaApeoArmadoProps {
  luzM: number;
  hM: number;
  posicionCargaM: number;
  anchoPilarApeadoM: number;
  anchoApoyoIzqM: number;
  anchoApoyoDerM: number;
  voladizoIzqM: number;
  voladizoDerM: number;
  recubrimientoM: number;
  numeroTirante: number;
  diametroTiranteMm: number;
  alturaRepartoTiranteM: number;
  /** El anclaje recto no entra: hay que cerrar el tirante con horquillas */
  requiereHorquillas: boolean;
  mallaHorizontalSeparacionM: number;
  mallaHorizontalDiametroMm: number;
  mallaVerticalSeparacionM: number;
  mallaVerticalDiametroMm: number;
  cuelgue: {
    diametroMm: number;
    separacionM: number;
    numeroRamas: number;
    anchoZonaM: number;
  } | null;
}

/**
 * Armado propuesto de la viga de apeo, en alzado.
 *
 * Muestra las cuatro familias que hay que dibujar sí o sí en un apeo y que son
 * las que se olvidan: el tirante inferior corrido de apoyo a apoyo (no
 * escalonado como en una viga a flexión), las horquillas de extremo cuando el
 * apoyo no da longitud para anclar recto (art. 9.7(3)), los estribos de cuelgue
 * concentrados junto al pilar cuando la carga no entra por la cara superior
 * (Montoya §24.9.1), y la malla ortogonal de piel en las dos caras (art. 9.7(1)).
 *
 * Es un croquis de disposición, no un plano: las cantidades dibujadas están
 * saturadas para que se lean, y los números de las etiquetas son los reales.
 */
export function DiagramaVigaApeoArmado({
  luzM,
  hM,
  posicionCargaM,
  anchoPilarApeadoM,
  anchoApoyoIzqM,
  anchoApoyoDerM,
  voladizoIzqM,
  voladizoDerM,
  recubrimientoM,
  numeroTirante,
  diametroTiranteMm,
  alturaRepartoTiranteM,
  requiereHorquillas,
  mallaHorizontalSeparacionM,
  mallaHorizontalDiametroMm,
  mallaVerticalSeparacionM,
  mallaVerticalDiametroMm,
  cuelgue,
}: DiagramaVigaApeoArmadoProps) {
  const largoM = luzM + voladizoIzqM + voladizoDerM;
  const W = 340;
  const escala = W / largoM;
  const x0 = 26;
  const y0 = 54;
  const hPx = Math.min(Math.max(hM * escala, 44), 150);
  const escalaV = hPx / hM;
  const yBase = y0 + hPx;

  const xIzq = x0 + voladizoIzqM * escala;
  const xDer = x0 + (voladizoIzqM + luzM) * escala;
  const xC = x0 + (voladizoIzqM + posicionCargaM) * escala;

  const rec = Math.max(recubrimientoM * escalaV, 5);
  const yTiranteInf = yBase - rec;
  // El tirante va repartido en 0,12·L (Montoya §24.7.3.e): se dibujan dos filas
  // para que se entienda que no es una única capa pegada al borde.
  const altoRepartoPx = Math.min(alturaRepartoTiranteM * escalaV, hPx * 0.45);
  const yTiranteSup = yTiranteInf - Math.max(altoRepartoPx, 8);

  const anchoPilarPx = Math.max(anchoPilarApeadoM * escala, 12);
  const apoyoIzqPx = Math.max(anchoApoyoIzqM * escala, 10);
  const apoyoDerPx = Math.max(anchoApoyoDerM * escala, 10);

  // Horquilla: codo semicircular que cierra las dos filas del tirante.
  const rHorq = (yTiranteInf - yTiranteSup) / 2;
  const xHorqIzq = x0 + 4;
  const xHorqDer = x0 + W - 4;
  const entradaHorq = Math.max((xIzq - x0) * 1.2, 34);

  // Estribos de cuelgue: se reparten a lo ancho de la zona, saturando el número
  // dibujado para no llenar el croquis de líneas.
  const zonaCuelguePx = cuelgue ? Math.min(cuelgue.anchoZonaM * escala, W / 2) : 0;
  const nCuelgue = cuelgue
    ? Math.min(Math.max(Math.round((2 * cuelgue.anchoZonaM) / cuelgue.separacionM), 3), 12)
    : 0;

  // Malla de piel: se dibujan como máximo 14 verticales y 5 horizontales.
  const nVert = Math.min(Math.max(Math.round(largoM / mallaVerticalSeparacionM), 4), 14);
  const nHoriz = Math.min(Math.max(Math.round(hM / mallaHorizontalSeparacionM), 2), 5);

  // El texto de un SVG no se corta en varias líneas: en un teléfono una leyenda
  // larga se sale del viewBox y se recorta. Por eso el croquis lleva sólo el
  // título y las leyendas van en HTML debajo, donde envuelven solas.
  const alto = yBase + 40;

  return (
    <div className="space-y-3">
    <svg
      viewBox={`0 0 ${W + 52} ${alto}`}
      className="h-auto w-full text-primary"
      fill="none"
      aria-hidden="true"
    >
      {/* pilar que descarga */}
      <rect x={xC - anchoPilarPx / 2} y={y0 - 30} width={anchoPilarPx} height={30} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.55" />

      {/* contorno de la viga */}
      <rect x={x0} y={y0} width={W} height={hPx} stroke="currentColor" strokeWidth="2.2" fill="var(--color-muted)" fillOpacity="0.12" />

      {/* apoyos */}
      <rect x={xIzq - apoyoIzqPx / 2} y={yBase} width={apoyoIzqPx} height={26} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.55" />
      <rect x={xDer - apoyoDerPx / 2} y={yBase} width={apoyoDerPx} height={26} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.55" />

      {/* malla ortogonal de piel */}
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.3">
        {Array.from({ length: nVert }, (_, i) => {
          const x = x0 + ((i + 0.5) * W) / nVert;
          return <path key={`v${i}`} d={`M${x} ${y0 + rec} L${x} ${yBase - rec}`} />;
        })}
        {Array.from({ length: nHoriz }, (_, i) => {
          const y = y0 + ((i + 0.5) * hPx) / nHoriz;
          return <path key={`h${i}`} d={`M${x0 + rec} ${y} L${x0 + W - rec} ${y}`} />;
        })}
      </g>

      {/* estribos de cuelgue, concentrados junto al pilar */}
      {cuelgue && (
        <g stroke="currentColor" strokeWidth="1.8">
          {Array.from({ length: nCuelgue }, (_, i) => {
            const x = xC - zonaCuelguePx + (i * (2 * zonaCuelguePx)) / (nCuelgue - 1);
            return <path key={`c${i}`} d={`M${x} ${y0 + rec} L${x} ${yTiranteInf}`} />;
          })}
          <path d={`M${xC - zonaCuelguePx} ${y0 + rec} L${xC + zonaCuelguePx} ${y0 + rec}`} strokeWidth="1.4" />
        </g>
      )}

      {/* tirante inferior, dos filas repartidas en 0,12·L */}
      <path d={`M${x0 + rec} ${yTiranteInf} L${x0 + W - rec} ${yTiranteInf}`} stroke="currentColor" strokeWidth="3.2" />
      <path d={`M${x0 + rec} ${yTiranteSup} L${x0 + W - rec} ${yTiranteSup}`} stroke="currentColor" strokeWidth="3.2" />

      {/* horquillas de extremo */}
      {requiereHorquillas && (
        <g stroke="currentColor" strokeWidth="3.2">
          <path
            d={`M${xHorqIzq + entradaHorq} ${yTiranteInf} L${xHorqIzq + rHorq} ${yTiranteInf} A ${rHorq} ${rHorq} 0 0 1 ${xHorqIzq + rHorq} ${yTiranteSup} L${xHorqIzq + entradaHorq} ${yTiranteSup}`}
          />
          <path
            d={`M${xHorqDer - entradaHorq} ${yTiranteInf} L${xHorqDer - rHorq} ${yTiranteInf} A ${rHorq} ${rHorq} 0 0 0 ${xHorqDer - rHorq} ${yTiranteSup} L${xHorqDer - entradaHorq} ${yTiranteSup}`}
          />
        </g>
      )}

      {/* etiquetas */}
      <text x={x0} y={y0 - 34} className="fill-current font-mono" fontSize="11">
        Armado propuesto (alzado)
      </text>
    </svg>

    <ul className="space-y-1 font-mono text-xs text-muted-foreground">
      <li>
        Tirante {numeroTirante}Ø{fmt(diametroTiranteMm, 0)} corrido de apoyo a apoyo, repartido en{" "}
        {fmt(alturaRepartoTiranteM)} m de altura.
      </li>
      <li>
        {cuelgue
          ? `Cuelgue: estribos Ø${fmt(cuelgue.diametroMm, 0)} de ${cuelgue.numeroRamas} ramas cada ${fmt(cuelgue.separacionM * 100, 0)} cm, en ±${fmt(cuelgue.anchoZonaM)} m del eje del pilar.`
          : "Carga directa sobre la cara superior: no lleva armadura de cuelgue."}
      </li>
      <li>
        Malla de piel Ø{fmt(mallaHorizontalDiametroMm, 0)}/{fmt(mallaHorizontalSeparacionM * 100, 0)} cm
        horizontal y Ø{fmt(mallaVerticalDiametroMm, 0)}/{fmt(mallaVerticalSeparacionM * 100, 0)} cm
        vertical, en las dos caras.
      </li>
      <li>
        {requiereHorquillas
          ? "Horquillas en los dos extremos: el anclaje recto no entra en el apoyo."
          : "El anclaje recto entra en el apoyo: no hacen falta horquillas."}
      </li>
    </ul>
    </div>
  );
}
