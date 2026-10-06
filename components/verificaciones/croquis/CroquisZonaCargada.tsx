"use client";

import { CotaH, CotaV, Croquis } from "./Croquis";

/**
 * Zona parcialmente cargada en alzado: la carga entra por un área chica (b1) y
 * se abre dentro del bloque hasta el área de distribución (b2) a la altura h,
 * que es lo que dibuja la fig. A19.6.29. La distancia al borde (c) es la que
 * impide que Ac1 se abra centrada más allá de la cara de la pieza.
 */
export function CroquisZonaCargada() {
  return (
    <Croquis
      viewBox="0 0 240 170"
      ancho="max-w-[17rem]"
      nota="La carga se abre desde b1 hasta b2 en la altura h. Lo mismo vale en la otra dirección con d1 y d2."
    >
      {/* Bloque */}
      <rect x="40" y="40" width="160" height="100" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.5" />
      {/* Placa cargada */}
      <rect x="100" y="34" width="40" height="6" fill="currentColor" />
      {/* Carga */}
      <path d="M120 8 L120 30" stroke="currentColor" strokeWidth="1.6" markerEnd="url(#croquis-flecha)" />
      <text x="126" y="18" className="fill-current font-mono" fontSize="11.5">NEd</text>
      {/* Difusión hasta Ac1 */}
      <path d="M100 40 L72 140 M140 40 L168 140" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.8" />
      <path d="M72 140 L168 140" stroke="currentColor" strokeWidth="2.2" opacity="0.6" />
      {/* Cotas */}
      <CotaH x0={100} x1={140} y={58} texto="b1" />
      <CotaH x0={72} x1={168} y={156} texto="b2" />
      <CotaV x={30} y0={40} y1={140} texto="h" />
      <CotaH x0={120} x1={200} y={88} texto="c" />
    </Croquis>
  );
}
