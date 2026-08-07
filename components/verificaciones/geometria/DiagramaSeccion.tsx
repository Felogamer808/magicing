"use client";

/**
 * Dibujo de la sección con su centroide y sus ejes principales.
 *
 * El dibujo no es decorativo: es la única verificación rápida de que los
 * parámetros que se cargaron son los que uno cree. Un ala puesta del lado
 * equivocado o un espesor que se come el alma dan números perfectamente
 * plausibles, y en el contorno se ven de una.
 *
 * Los ejes principales se dibujan encima porque son lo que no trae una tabla de
 * perfiles: en un ángulo o en una Z están girados, y ese giro es el que explica
 * que la pieza flecte de costado.
 *
 * Recibe el contorno y las propiedades ya calculadas. No calcula nada.
 */

import type { PropiedadesSeccion, Punto } from "@/lib/calc/geometria/poligono";

interface Props {
  lleno: readonly Punto[];
  huecos: readonly (readonly Punto[])[];
  props: PropiedadesSeccion;
  /** Ejes principales encima del dibujo. Se puede apagar si estorban. */
  mostrarEjes?: boolean;
}

const ANCHO = 300;
const ALTO = 230;
const MARGEN = 30;

export function DiagramaSeccion({ lleno, huecos, props, mostrarEjes = true }: Props) {
  const todos = [lleno, ...huecos].flat();
  const xs = todos.map((p) => p.xCm);
  const ys = todos.map((p) => p.yCm);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  // Una sección de 1 cm de ancho y 100 de alto no puede reventar la escala, así
  // que se ajusta por la dirección más comprometida y se centra.
  const escala = Math.min(
    (ANCHO - 2 * MARGEN) / Math.max(xMax - xMin, 1e-9),
    (ALTO - 2 * MARGEN) / Math.max(yMax - yMin, 1e-9)
  );

  const cxRef = (xMin + xMax) / 2;
  const cyRef = (yMin + yMax) / 2;
  // El eje y del SVG crece hacia abajo y el de la sección hacia arriba: la
  // conversión invierte el signo una sola vez, acá.
  const px = (x: number) => ANCHO / 2 + (x - cxRef) * escala;
  const py = (y: number) => ALTO / 2 - (y - cyRef) * escala;

  const aPath = (c: readonly Punto[]) =>
    c.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.xCm).toFixed(2)},${py(p.yCm).toFixed(2)}`).join(" ") + " Z";

  // evenodd descuenta los huecos sin importar en qué sentido se hayan escrito,
  // que es la misma tolerancia que tiene el motor de cálculo.
  const path = [aPath(lleno), ...huecos.map(aPath)].join(" ");

  const gx = px(props.centroideXCm);
  const gy = py(props.centroideYCm);

  const largoEje = Math.max(ANCHO, ALTO);
  const theta = (props.anguloPrincipalGrados * Math.PI) / 180;
  // Al invertir el eje y, un giro antihorario en la sección se ve horario en
  // pantalla: por eso el seno va con signo cambiado.
  const eje = (ang: number) => ({
    x1: gx - (largoEje / 2) * Math.cos(ang),
    y1: gy + (largoEje / 2) * Math.sin(ang),
    x2: gx + (largoEje / 2) * Math.cos(ang),
    y2: gy - (largoEje / 2) * Math.sin(ang),
  });

  const eje1 = eje(theta);
  const eje2 = eje(theta + Math.PI / 2);
  const girado = Math.abs(props.anguloPrincipalGrados) > 0.05;

  return (
    <figure className="w-full space-y-1">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Sección de ${props.anchoTotalCm.toFixed(1)} por ${props.altoTotalCm.toFixed(1)} cm, con el centroide y los ejes principales`}
      >
        <clipPath id="recorte-seccion">
          <rect x={0} y={0} width={ANCHO} height={ALTO} />
        </clipPath>

        <path d={path} fillRule="evenodd" className="fill-primary/15 stroke-primary" strokeWidth={1.5} />

        {/* Ejes centroidales x-y: los de referencia de Ix, Iy y Ixy. */}
        <g clipPath="url(#recorte-seccion)">
          <line
            x1={gx - largoEje / 2} y1={gy} x2={gx + largoEje / 2} y2={gy}
            className="stroke-muted-foreground/60" strokeWidth={0.8} strokeDasharray="4 3"
          />
          <line
            x1={gx} y1={gy - largoEje / 2} x2={gx} y2={gy + largoEje / 2}
            className="stroke-muted-foreground/60" strokeWidth={0.8} strokeDasharray="4 3"
          />

          {mostrarEjes && girado && (
            <>
              <line {...eje1} className="stroke-emerald-600" strokeWidth={1.4} />
              <line {...eje2} className="stroke-emerald-600/60" strokeWidth={1.1} strokeDasharray="6 3" />
            </>
          )}
        </g>

        <circle cx={gx} cy={gy} r={3.2} className="fill-primary" />
        <text x={gx + 6} y={gy - 5} className="fill-foreground text-[10px] font-medium">G</text>

        {/* Dimensiones exteriores, abajo y a la izquierda. */}
        <text x={ANCHO / 2} y={ALTO - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {props.anchoTotalCm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} cm
        </text>
        <text x={10} y={ALTO / 2} className="fill-muted-foreground text-[10px]">
          {props.altoTotalCm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} cm
        </text>

        {mostrarEjes && girado && (
          <text x={ANCHO - 6} y={14} textAnchor="end" className="fill-emerald-700 text-[10px]">
            ejes principales · θ ={" "}
            {props.anguloPrincipalGrados.toLocaleString("es-AR", { maximumFractionDigits: 1 })}°
          </text>
        )}
      </svg>
    </figure>
  );
}
