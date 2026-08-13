"use client";

import { fmt } from "@/lib/verificaciones/formato";

/**
 * Área eficaz de contacto en compresión perpendicular, figura 6.2.
 *
 * El croquis existe para hacer visible la parte contraintuitiva del art.
 * 6.1.5(1): el área que resiste **no** es la de contacto, sino esa más 30 mm a
 * cada lado, porque la compresión se difunde por dentro de la pieza. En un
 * apoyo de 100 mm eso es un 60 % más de área, o sea la diferencia entre que el
 * apoyo verifique o no.
 *
 * Los dos ensanchamientos están acotados por cosas distintas —el del extremo
 * por el vuelo a, el interior por la mitad de la distancia a la carga vecina—,
 * así que se dibujan por separado y con su cota, que es lo que la planilla
 * resuelve con un MIN de cuatro términos imposible de auditar.
 */

interface Props {
  longitudContactoM: number;
  incrementoExtremoM: number;
  incrementoInteriorM: number;
  vueloM: number;
  cantoM: number;
}

const ANCHO = 420;
const ALTO = 200;

export function CroquisApoyoMadera({
  longitudContactoM: l, incrementoExtremoM: dExt, incrementoInteriorM: dInt, vueloM, cantoM,
}: Props) {
  if (!(l > 0) || !(cantoM > 0)) return null;

  const totalM = vueloM + l + Math.max(0.35 * l, dInt + 0.25 * l);

  /*
   * Escala longitudinal y canto se fijan por separado a propósito. Lo que este
   * croquis tiene que dejar leer son las cotas horizontales —ℓ, los dos
   * ensanchamientos y el vuelo—, y con una escala única un apoyo de 12 cm bajo
   * una viga de 20 de canto queda dibujado en 100 px de ancho, ilegible. El
   * canto se limita a 90 px y no pretende estar a la misma escala.
   */
  const escala = 300 / totalM;

  const izq = 60;
  const arriba = 40;
  const hPx = Math.min(cantoM * escala, 90);
  const abajo = arriba + hPx;

  const xApoyoIni = izq + vueloM * escala;
  const lPx = l * escala;
  const xApoyoFin = xApoyoIni + lPx;
  const xEfIni = xApoyoIni - dExt * escala;
  const xEfFin = xApoyoFin + dInt * escala;
  const der = izq + totalM * escala;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Área eficaz de apoyo: contacto ${fmt(l, 3)} m, eficaz ${fmt(l + dExt + dInt, 3)} m`}>
        {/* Pieza de madera. */}
        <rect x={izq} y={arriba} width={der - izq} height={hPx}
              className="fill-amber-600/15 stroke-amber-800" strokeWidth={1.4} />

        {/* Longitud eficaz, sombreada bajo la pieza. */}
        <rect x={xEfIni} y={abajo} width={xEfFin - xEfIni} height={13}
              className="fill-primary/25" />
        {/* Contacto real, más oscuro. */}
        <rect x={xApoyoIni} y={abajo} width={lPx} height={13} className="fill-primary/70" />

        {/* Rayado del apoyo. */}
        <line x1={xApoyoIni - 6} y1={abajo + 13} x2={xApoyoFin + 6} y2={abajo + 13}
              className="stroke-muted-foreground" strokeWidth={1.6} />
        {Array.from({ length: 7 }, (_, i) => {
          const px = xApoyoIni + ((xApoyoFin - xApoyoIni) * i) / 6;
          return (
            <line key={i} x1={px} y1={abajo + 13} x2={px - 6} y2={abajo + 21}
                  className="stroke-muted-foreground" strokeWidth={0.9} />
          );
        })}

        {/* Flecha de la carga. */}
        <line x1={(xApoyoIni + xApoyoFin) / 2} y1={arriba - 22} x2={(xApoyoIni + xApoyoFin) / 2} y2={arriba - 3}
              className="stroke-destructive" strokeWidth={1.6} />
        <polygon
          points={`${(xApoyoIni + xApoyoFin) / 2},${arriba} ${(xApoyoIni + xApoyoFin) / 2 - 4},${arriba - 8} ${(xApoyoIni + xApoyoFin) / 2 + 4},${arriba - 8}`}
          className="fill-destructive"
        />
        <text x={(xApoyoIni + xApoyoFin) / 2 + 8} y={arriba - 22}
              className="fill-destructive text-[11px]">Fc,90,d</text>

        {/* Cota del contacto real. */}
        <text x={(xApoyoIni + xApoyoFin) / 2} y={abajo + 38} textAnchor="middle"
              className="fill-primary text-[11px] font-medium">ℓ = {fmt(l, 3)} m</text>

        {/* Cota de la longitud eficaz, más abajo. */}
        <line x1={xEfIni} y1={abajo + 50} x2={xEfFin} y2={abajo + 50}
              className="stroke-primary" strokeWidth={0.9} />
        <line x1={xEfIni} y1={abajo + 47} x2={xEfIni} y2={abajo + 53} className="stroke-primary" strokeWidth={0.9} />
        <line x1={xEfFin} y1={abajo + 47} x2={xEfFin} y2={abajo + 53} className="stroke-primary" strokeWidth={0.9} />
        <text x={(xEfIni + xEfFin) / 2} y={abajo + 64} textAnchor="middle"
              className="fill-primary text-[11px]">
          ℓef = {fmt(l + dExt + dInt, 3)} m
        </text>

        {/* Los dos ensanchamientos, rotulados arriba de la pieza. */}
        {dExt > 0 && (
          <text x={xEfIni} y={arriba - 6} textAnchor="middle"
                className="fill-muted-foreground text-[10px]">+{fmt(dExt * 1000, 0)}</text>
        )}
        {dInt > 0 && (
          <text x={xEfFin} y={arriba - 6} textAnchor="middle"
                className="fill-muted-foreground text-[10px]">+{fmt(dInt * 1000, 0)}</text>
        )}

        {/*
          El vuelo se rotula dentro de la propia pieza: abajo compite con la
          cota de ℓ, que en apoyos con poco vuelo cae encima.
        */}
        {vueloM > 0 && (
          <text x={(izq + xApoyoIni) / 2} y={arriba + hPx / 2 + 4} textAnchor="middle"
                className="fill-muted-foreground text-[10px]">a = {fmt(vueloM, 3)}</text>
        )}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        El área que resiste es la de contacto ensanchada 30 mm a cada lado, art. 6.1.5(1). El
        ensanchamiento del extremo no puede pasar del vuelo <em>a</em>, y el interior de la mitad
        de la distancia a la carga vecina. Cifras en milímetros.
      </figcaption>
    </figure>
  );
}
