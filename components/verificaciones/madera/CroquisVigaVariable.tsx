"use client";

import type { FormaViga } from "@/lib/calc/ec5/seccion-variable";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Alzado de la viga a dos aguas con la zona del vértice y la sección crítica
 * marcadas, figura 6.9.
 *
 * Las dos marcas son el motivo del dibujo. La **sección crítica a flexión** no
 * cae en el centro ni en el vértice sino a 0,5·l·he/hc del apoyo —del orden del
 * 23 % de la luz—, y verla situada evita el reflejo de comprobar el centro. La
 * **zona del vértice** es donde aparece la tracción perpendicular a la fibra,
 * que es lo que realmente rompe estas vigas.
 */

interface Props {
  forma: FormaViga;
  luzM: number;
  cantoApoyoM: number;
  cantoVerticeM: number;
  posicionCriticaM: number;
  cantoCriticoM: number;
}

const ANCHO = 460;
const ALTO = 250;
const IZQ = 30;
const DER = ANCHO - 30;
const BASE = 168;

export function CroquisVigaVariable({
  forma, luzM, cantoApoyoM, cantoVerticeM, posicionCriticaM, cantoCriticoM,
}: Props) {
  if (!(luzM > 0) || !(cantoVerticeM > 0)) return null;

  const escalaX = (DER - IZQ) / luzM;
  // El canto se dibuja con su propia escala: a escala real una viga de 20 m y
  // 1,4 m de canto sale como una línea y no se distingue la pendiente.
  const escalaY = 90 / cantoVerticeM;

  const x = (m: number) => IZQ + m * escalaX;
  const centro = x(luzM / 2);

  const yApoyo = BASE - cantoApoyoM * escalaY;
  const yVertice = BASE - cantoVerticeM * escalaY;

  const xCritica = x(posicionCriticaM);
  const yCritica = BASE - cantoCriticoM * escalaY;

  // Ancho de la zona del vértice, aproximado a un canto a cada lado.
  const semiVertice = Math.min(cantoVerticeM * escalaX, (DER - IZQ) / 4);

  /*
   * Con pendiente suave la sección crítica se corre hacia el centro —tiende a
   * la mitad de la luz cuando he → hap— y su rótulo termina encima del de la
   * zona del vértice. Cuando se acercan, el de la sección crítica se cuelga por
   * debajo de la viga, donde no compite con nada.
   */
  const rotularAbajo = Math.abs(xCritica - centro) < 100;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Viga de ${fmt(luzM, 1)} m, canto de ${fmt(cantoApoyoM, 2)} en apoyo a ${fmt(cantoVerticeM, 2)} en vértice`}>
        {/* Zona del vértice, sombreada. */}
        <rect x={centro - semiVertice} y={yVertice} width={2 * semiVertice}
              height={BASE - yVertice} className="fill-destructive/12" />

        {/* Silueta de la viga. */}
        <path
          d={`M ${IZQ} ${BASE} L ${DER} ${BASE} L ${DER} ${yApoyo} L ${centro} ${yVertice} L ${IZQ} ${yApoyo} Z`}
          className="fill-amber-600/20 stroke-amber-800" strokeWidth={1.6}
        />

        {/* Apoyos. */}
        {[IZQ, DER].map((px) => (
          <polygon key={px} points={`${px},${BASE} ${px - 8},${BASE + 12} ${px + 8},${BASE + 12}`}
                   className="fill-muted-foreground" />
        ))}
        <line x1={IZQ - 14} y1={BASE + 12} x2={IZQ + 14} y2={BASE + 12}
              className="stroke-muted-foreground" strokeWidth={1.4} />
        <line x1={DER - 14} y1={BASE + 12} x2={DER + 14} y2={BASE + 12}
              className="stroke-muted-foreground" strokeWidth={1.4} />

        {/* Sección crítica a flexión. */}
        <line x1={xCritica} y1={yCritica - 12} x2={xCritica} y2={rotularAbajo ? BASE + 26 : BASE + 4}
              className="stroke-primary" strokeWidth={1.6} strokeDasharray="4 3" />
        <circle cx={xCritica} cy={yCritica} r={4} className="fill-primary" />
        {/*
          16 px entre las dos líneas de cada rótulo, no 11: con 10,5 px de tipo
          las cajas de texto miden unos 13 y a menor separación se tocan, cosa
          que no se ve a ojo pero sí al medirlas.
        */}
        <text x={xCritica} y={rotularAbajo ? BASE + 42 : yCritica - 26} textAnchor="middle"
              className="fill-primary text-[10.5px] font-medium">
          sección crítica
        </text>
        <text x={xCritica} y={rotularAbajo ? BASE + 56 : yCritica - 10} textAnchor="middle"
              className="fill-primary text-[9.5px]">
          x = {fmt(posicionCriticaM, 2)} m
        </text>

        {/* Rótulo de la zona del vértice, por encima de la cumbrera. */}
        <text x={centro} y={yVertice - 22} textAnchor="middle"
              className="fill-destructive text-[10.5px] font-medium">
          zona del vértice
        </text>
        <text x={centro} y={yVertice - 8} textAnchor="middle"
              className="fill-destructive text-[9.5px]">
          tracción ⊥ a la fibra
        </text>

        {/* Cotas de canto. */}
        <text x={IZQ + 6} y={(yApoyo + BASE) / 2 + 4} className="fill-foreground text-[10px]">
          he = {fmt(cantoApoyoM, 2)}
        </text>
        <text x={centro + semiVertice + 6} y={BASE - 6} className="fill-foreground text-[10px]">
          hap = {fmt(cantoVerticeM, 2)}
        </text>

        {/* Cota de luz. */}
        <line x1={IZQ} y1={ALTO - 22} x2={DER} y2={ALTO - 22}
              className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={IZQ} y1={ALTO - 25} x2={IZQ} y2={ALTO - 19} className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={DER} y1={ALTO - 25} x2={DER} y2={ALTO - 19} className="stroke-muted-foreground" strokeWidth={0.9} />
        <text x={centro} y={ALTO - 8} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
          l = {fmt(luzM, 2)} m
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        {forma === "dos-aguas"
          ? "Viga recta a dos aguas: el radio interior es infinito y kr = 1."
          : "En vigas curvas la zona del vértice se extiende sobre toda la parte curva, y kr penaliza el radio de fabricación."}{" "}
        Cantos amplificados para que se distinga la pendiente; las abscisas están a escala.
      </figcaption>
    </figure>
  );
}
