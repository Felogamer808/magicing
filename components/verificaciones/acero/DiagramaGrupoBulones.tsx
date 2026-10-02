"use client";

import { MarcaPuntoCritico } from "@/components/verificaciones/croquis/Primitivas";
import type { FuerzaBulon } from "@/lib/calc/acero/tornillos";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Grupo de bulones, a escala y con cada bulón seleccionable.
 *
 * Hasta acá la unión era una tabla de números y el reparto elástico había que
 * imaginarlo. El dibujo contesta de un vistazo lo que el número no dice: que el
 * bulón más exigido **no siempre es el más lejano del centroide** —depende de
 * cómo se compongan Fx, Fy y el momento—, y que la dirección de la fuerza
 * cambia de un bulón a otro.
 *
 * Cada bulón lleva su vector, con longitud proporcional a la fuerza. El más
 * exigido va marcado, y al elegir cualquiera se ven sus números al costado.
 *
 * No calcula nada: las fuerzas vienen resueltas por el reparto elástico.
 */

interface Props {
  fuerzas: FuerzaBulon[];
  /** Distancia al borde más chica de las chapas, para dibujar la chapa (m). */
  lcM: number;
  diametroMm: number;
  /** Índice del bulón que gobierna. */
  indiceCritico: number;
  seleccionado: number;
  onSeleccionar: (indice: number) => void;
}

const ANCHO = 380;
const ALTO = 300;
const MARGEN = 34;

export function DiagramaGrupoBulones({
  fuerzas,
  lcM,
  diametroMm,
  indiceCritico,
  seleccionado,
  onSeleccionar,
}: Props) {
  if (fuerzas.length === 0) return null;

  const xs = fuerzas.map((f) => f.posicion.xM);
  const ys = fuerzas.map((f) => f.posicion.yM);
  // La chapa se extiende la distancia al borde más allá del bulón extremo. Es
  // la geometría que el cálculo ya supone, así que dibujarla así no agrega una
  // hipótesis: la hace visible.
  const borde = Math.max(lcM, 0.02);
  const xMin = Math.min(...xs) - borde;
  const xMax = Math.max(...xs) + borde;
  const yMin = Math.min(...ys) - borde;
  const yMax = Math.max(...ys) + borde;

  const escala = Math.min(
    (ANCHO - 2 * MARGEN) / Math.max(xMax - xMin, 1e-6),
    (ALTO - 2 * MARGEN) / Math.max(yMax - yMin, 1e-6)
  );
  const anchoDibujo = (xMax - xMin) * escala;
  const altoDibujo = (yMax - yMin) * escala;
  const dx = (ANCHO - anchoDibujo) / 2;
  const dy = (ALTO - altoDibujo) / 2;

  const aX = (x: number) => dx + (x - xMin) * escala;
  // El eje y del dibujo crece hacia abajo; el del reparto, hacia arriba.
  const aY = (y: number) => dy + (yMax - y) * escala;

  const radio = Math.max(((diametroMm / 1000) * escala) / 2, 4);
  const vMax = Math.max(...fuerzas.map((f) => f.vKN), 1e-6);
  /** Largo del vector más grande, para que ninguno se salga de la chapa. */
  const LARGO_MAX = 46;

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full"
      role="group"
      aria-label="Grupo de bulones: elegí uno para ver su fuerza"
    >
      {/* Chapa */}
      <rect
        x={aX(xMin)}
        y={aY(yMax)}
        width={anchoDibujo}
        height={altoDibujo}
        fill="var(--mat-acero)"
        stroke="var(--mat-acero-borde)"
        strokeWidth="1.4"
        rx="3"
      />

      {/* Centroide del grupo: el punto sobre el que gira la chapa en el método
          elástico, y por eso el origen de todas las distancias. */}
      <g stroke="var(--mat-cota)" strokeWidth="0.9" opacity="0.7">
        <line x1={aX(0) - 7} y1={aY(0)} x2={aX(0) + 7} y2={aY(0)} />
        <line x1={aX(0)} y1={aY(0) - 7} x2={aX(0)} y2={aY(0) + 7} />
      </g>

      {fuerzas.map((f, i) => {
        const cx = aX(f.posicion.xM);
        const cy = aY(f.posicion.yM);
        const elegido = i === seleccionado;
        const largo = (f.vKN / vMax) * LARGO_MAX;
        // El vector apunta donde empuja la fuerza; vy se invierte porque el
        // dibujo tiene el eje y al revés que el reparto.
        const ang = Math.atan2(-f.vyKN, f.vxKN);
        const px = cx + largo * Math.cos(ang);
        const py = cy + largo * Math.sin(ang);
        const ab = 0.4;
        const punta = 5;

        return (
          <g key={i}>
            {f.vKN > 0 && (
              <g className="text-[var(--mat-cota)]" opacity={elegido ? 1 : 0.55}>
                <path d={`M${cx} ${cy} L${px} ${py}`} stroke="currentColor" strokeWidth={elegido ? 2 : 1.2} />
                <path
                  d={`M${px} ${py} L${px - punta * Math.cos(ang - ab)} ${py - punta * Math.sin(ang - ab)} L${px - punta * Math.cos(ang + ab)} ${py - punta * Math.sin(ang + ab)} Z`}
                  fill="currentColor"
                />
              </g>
            )}

            {/* El agujero, y encima el bulón. */}
            <circle cx={cx} cy={cy} r={radio} fill="var(--color-card)" stroke="var(--mat-acero-borde)" strokeWidth="1.1" />
            <circle
              cx={cx}
              cy={cy}
              r={radio * 0.55}
              fill={elegido ? "var(--mat-cota)" : "var(--mat-acero-borde)"}
            />

            {/* Zona sensible, más grande que el bulón para que sea clicable. */}
            <circle
              cx={cx}
              cy={cy}
              r={Math.max(radio * 1.9, 11)}
              fill="transparent"
              className="cursor-pointer"
              role="radio"
              aria-checked={elegido}
              aria-label={`Bulón ${i + 1}, V = ${fmt(f.vKN, 2)} kN`}
              tabIndex={0}
              onClick={() => onSeleccionar(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeleccionar(i);
                }
              }}
            />

            {i === indiceCritico && <MarcaPuntoCritico x={cx} y={cy} radio={radio * 1.5} />}
          </g>
        );
      })}

      <text
        x={ANCHO / 2}
        y={ALTO - 6}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="9.5"
        opacity="0.55"
      >
        el círculo marca el bulón que gobierna
      </text>
    </svg>
  );
}
