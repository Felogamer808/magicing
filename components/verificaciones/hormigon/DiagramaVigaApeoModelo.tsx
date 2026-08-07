"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaVigaApeoModeloProps {
  luzM: number;
  hM: number;
  dM: number;
  zM: number;
  posicionCargaM: number;
  anchoPilarApeadoM: number;
  anchoApoyoIzqM: number;
  anchoApoyoDerM: number;
  aIzqM: number;
  aDerM: number;
  aIzqSobreD: number;
  aDerSobreD: number;
  esRegionD: boolean;
  anguloIzqGrados: number;
  anguloDerGrados: number;
  ndPilarKN: number;
  reaccionIzqKN: number;
  reaccionDerKN: number;
  traccionTiranteKN: number;
}

/**
 * La viga de apeo vista de frente, con el pilar que descarga arriba, los dos
 * apoyos abajo y el modelo de bielas y tirante dibujado encima.
 *
 * La franja rayada de cada extremo es la extensión de la región D: un canto h
 * desde cada discontinuidad (art. 5.6.4(1)). Si las franjas de los apoyos y la
 * del pilar se tocan, no queda región B en el medio y toda la pieza va por
 * bielas y tirantes.
 *
 * El dibujo satura el canto para que se lea en pantalla, pero las cotas siempre
 * dicen el número real.
 */
export function DiagramaVigaApeoModelo({
  luzM,
  hM,
  dM,
  zM,
  posicionCargaM,
  anchoPilarApeadoM,
  anchoApoyoIzqM,
  anchoApoyoDerM,
  aIzqM,
  aDerM,
  aIzqSobreD,
  aDerSobreD,
  esRegionD,
  anguloIzqGrados,
  anguloDerGrados,
  ndPilarKN,
  reaccionIzqKN,
  reaccionDerKN,
  traccionTiranteKN,
}: DiagramaVigaApeoModeloProps) {
  const W = 340;
  const escala = W / luzM;
  const x0 = 46;
  const y0 = 62;
  // Se acota el canto dibujado: una viga muy esbelta desaparecería y una muy
  // maciza se comería la hoja. La relación real va escrita al lado.
  const hPx = Math.min(Math.max(hM * escala, 34), 150);
  const escalaV = hPx / hM;
  const yBase = y0 + hPx;

  const xIzq = x0;
  const xDer = x0 + W;
  const xC = x0 + posicionCargaM * escala;

  const yTirante = yBase - (hM - dM) * escalaV;
  const yNudoSup = yTirante - zM * escalaV;

  const anchoPilarPx = Math.max(anchoPilarApeadoM * escala, 12);
  const apoyoIzqPx = Math.max(anchoApoyoIzqM * escala, 10);
  const apoyoDerPx = Math.max(anchoApoyoDerM * escala, 10);
  // Franja de región D: un canto desde cada discontinuidad.
  const franjaPx = Math.min(hM * escala, W / 2);

  const yCota = yBase + 62;
  // La última fila de texto es la de h y L/h: va abajo y alineada a la izquierda
  // porque a la derecha del dibujo no entra sin salirse del viewBox, y un texto
  // que se sale del viewBox se corta en pantalla en vez de achicar el dibujo.
  const alto = yCota + 50;

  return (
    <svg
      viewBox={`0 0 ${W + 92} ${alto}`}
      className="h-auto w-full text-primary"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="rayadoD" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.25" />
        </pattern>
      </defs>

      {/* pilar que descarga */}
      <rect
        x={xC - anchoPilarPx / 2}
        y={y0 - 40}
        width={anchoPilarPx}
        height={40}
        stroke="currentColor"
        strokeWidth="1.8"
        fill="var(--color-muted)"
        fillOpacity="0.55"
      />
      <path d={`M${xC} ${y0 - 62} L${xC} ${y0 - 44}`} stroke="currentColor" strokeWidth="1.6" />
      <path d={`M${xC - 4} ${y0 - 50} L${xC} ${y0 - 44} L${xC + 4} ${y0 - 50}`} stroke="currentColor" strokeWidth="1.6" />
      <text x={xC} y={y0 - 66} textAnchor="middle" className="fill-current font-mono" fontSize="11">
        Nd = {fmt(ndPilarKN, 0)} kN
      </text>

      {/* franjas de región D, un canto desde cada discontinuidad */}
      <rect x={xIzq} y={y0} width={franjaPx} height={hPx} fill="url(#rayadoD)" />
      <rect x={xDer - franjaPx} y={y0} width={franjaPx} height={hPx} fill="url(#rayadoD)" />
      <rect
        x={Math.max(xC - franjaPx, xIzq)}
        y={y0}
        width={Math.min(xC + franjaPx, xDer) - Math.max(xC - franjaPx, xIzq)}
        height={hPx}
        fill="url(#rayadoD)"
      />

      {/* viga */}
      <rect x={xIzq} y={y0} width={W} height={hPx} stroke="currentColor" strokeWidth="2.2" />

      {/* bielas comprimidas */}
      <path d={`M${xC} ${yNudoSup} L${xIzq} ${yTirante}`} stroke="currentColor" strokeWidth="1.6" strokeDasharray="6 4" opacity="0.8" />
      <path d={`M${xC} ${yNudoSup} L${xDer} ${yTirante}`} stroke="currentColor" strokeWidth="1.6" strokeDasharray="6 4" opacity="0.8" />
      <text x={(xIzq + xC) / 2} y={(yTirante + yNudoSup) / 2 - 6} textAnchor="middle" className="fill-current font-mono" fontSize="10">
        θ = {fmt(anguloIzqGrados, 1)}°
      </text>
      <text x={(xDer + xC) / 2} y={(yTirante + yNudoSup) / 2 - 6} textAnchor="middle" className="fill-current font-mono" fontSize="10">
        θ = {fmt(anguloDerGrados, 1)}°
      </text>

      {/* tirante */}
      <path d={`M${xIzq} ${yTirante} L${xDer} ${yTirante}`} stroke="currentColor" strokeWidth="3.4" />
      <text x={xC} y={yTirante + 15} textAnchor="middle" className="fill-current font-mono" fontSize="11">
        T = {fmt(traccionTiranteKN, 0)} kN
      </text>

      {/* apoyos */}
      <rect x={xIzq - apoyoIzqPx / 2} y={yBase} width={apoyoIzqPx} height={30} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.55" />
      <rect x={xDer - apoyoDerPx / 2} y={yBase} width={apoyoDerPx} height={30} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.55" />
      <text x={xIzq} y={yBase + 44} textAnchor="middle" className="fill-current font-mono" fontSize="10">
        R = {fmt(reaccionIzqKN, 0)} kN
      </text>
      <text x={xDer} y={yBase + 44} textAnchor="middle" className="fill-current font-mono" fontSize="10">
        R = {fmt(reaccionDerKN, 0)} kN
      </text>

      {/* cotas a1 y a2 */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <path d={`M${xIzq} ${yCota} L${xC} ${yCota}`} />
        <path d={`M${xC} ${yCota} L${xDer} ${yCota}`} />
        {[xIzq, xC, xDer].map((x) => (
          <path key={x} d={`M${x} ${yCota - 6} L${x} ${yCota + 6}`} />
        ))}
      </g>
      <text x={(xIzq + xC) / 2} y={yCota + 20} textAnchor="middle" className="fill-current font-mono" fontSize="11">
        a₁ = {fmt(aIzqM)} m
      </text>
      <text x={(xIzq + xC) / 2} y={yCota + 32} textAnchor="middle" className="fill-current font-mono" fontSize="10" opacity="0.8">
        a₁/d = {fmt(aIzqSobreD)}
      </text>
      <text x={(xC + xDer) / 2} y={yCota + 20} textAnchor="middle" className="fill-current font-mono" fontSize="11">
        a₂ = {fmt(aDerM)} m
      </text>
      <text x={(xC + xDer) / 2} y={yCota + 32} textAnchor="middle" className="fill-current font-mono" fontSize="10" opacity="0.8">
        a₂/d = {fmt(aDerSobreD)}
      </text>

      {/* cota h */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <path d={`M${xDer + 26} ${y0} L${xDer + 26} ${yBase}`} />
        <path d={`M${xDer + 20} ${y0} L${xDer + 32} ${y0}`} />
        <path d={`M${xDer + 20} ${yBase} L${xDer + 32} ${yBase}`} />
      </g>
      <text x={xDer + 36} y={(y0 + yBase) / 2 + 4} className="fill-current font-mono" fontSize="11">
        h
      </text>

      {/* veredicto */}
      <text x={xIzq} y={y0 - 14} className="fill-current font-mono" fontSize="11">
        {esRegionD ? "Región D — vale bielas y tirantes" : "Región B — no corresponde este modelo"}
      </text>
      <text x={xIzq} y={yCota + 48} className="fill-current font-mono" fontSize="10" opacity="0.8">
        h = {fmt(hM)} m · L/h = {fmt(luzM / hM)}
      </text>
    </svg>
  );
}
