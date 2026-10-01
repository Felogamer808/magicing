"use client";

import { useId } from "react";

/**
 * Primitivas de dibujo técnico, compartidas por todas las calculadoras.
 *
 * Existen porque hasta ahora cada diagrama resolvía lo mismo a su manera: los
 * apoyos estaban escritos dentro de los diagramas de estática, las puntas de
 * flecha se definían como marcador en tres archivos distintos, y el relleno de
 * cada material lo elegía quien dibujaba. Con eso, dos croquis de la misma obra
 * no se parecen entre sí y el dibujo deja de ser un lenguaje.
 *
 * Dos decisiones que condicionan el resto:
 *
 *  - **Las puntas de flecha se dibujan como trazo, no como `marker`.** Un
 *    marcador vive en un `<defs>` y obliga a quien use la primitiva a acordarse
 *    de incluirlo; el día que falte, la flecha aparece sin punta y nadie se
 *    entera. Dibujada, la primitiva se basta sola en cualquier SVG.
 *  - **Los ids de patrón salen de `useId`.** Son globales al documento, así que
 *    dos croquis con el mismo id en la misma página se pisarían; con `useId`
 *    cada instancia tiene el suyo y además coincide entre servidor y navegador.
 *
 * Nada de acá calcula: reciben coordenadas ya resueltas, igual que el resto de
 * los diagramas.
 */

/** Punta de flecha dibujada, apuntando en la dirección del ángulo dado (radianes). */
function Punta({ x, y, anguloRad, tamano = 7 }: { x: number; y: number; anguloRad: number; tamano?: number }) {
  const abertura = 0.42;
  const a = [x - tamano * Math.cos(anguloRad - abertura), y - tamano * Math.sin(anguloRad - abertura)];
  const b = [x - tamano * Math.cos(anguloRad + abertura), y - tamano * Math.sin(anguloRad + abertura)];
  return <path d={`M${x} ${y} L${a[0]} ${a[1]} L${b[0]} ${b[1]} Z`} fill="currentColor" stroke="none" />;
}

export type SentidoCarga = "abajo" | "arriba" | "derecha" | "izquierda";

const ANGULO: Record<SentidoCarga, number> = {
  abajo: Math.PI / 2,
  arriba: -Math.PI / 2,
  derecha: 0,
  izquierda: Math.PI,
};

interface FlechaCargaProps {
  /** Punta de la flecha: dónde se aplica la carga. */
  x: number;
  y: number;
  /** Largo del fuste, desde la punta hacia atrás. */
  largo?: number;
  sentido?: SentidoCarga;
  rotulo?: string;
  grosor?: number;
}

/**
 * Carga puntual. La punta marca el punto de aplicación y el fuste sale hacia
 * atrás, que es como se lee en un plano: la flecha apunta a lo que carga.
 */
export function FlechaCarga({
  x,
  y,
  largo = 26,
  sentido = "abajo",
  rotulo,
  grosor = 1.6,
}: FlechaCargaProps) {
  const ang = ANGULO[sentido];
  const cola = [x - largo * Math.cos(ang), y - largo * Math.sin(ang)];

  return (
    <g className="text-[var(--mat-cota)]">
      <path
        d={`M${cola[0]} ${cola[1]} L${x} ${y}`}
        stroke="currentColor"
        strokeWidth={grosor}
        fill="none"
      />
      <Punta x={x} y={y} anguloRad={ang} />
      {rotulo && (
        <text
          x={cola[0]}
          y={cola[1] - 4}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="10.5"
        >
          {rotulo}
        </text>
      )}
    </g>
  );
}

interface CargaDistribuidaProps {
  x0: number;
  x1: number;
  /** Línea sobre la que se apoyan las puntas. */
  y: number;
  alto?: number;
  /** Cuántas flechas dibujar. Es una saturación: el rótulo dice el valor real. */
  flechas?: number;
  rotulo?: string;
  sentido?: "abajo" | "arriba";
}

/**
 * Carga repartida: el peine de flechas más su línea de respaldo.
 *
 * El número de flechas es una saturación del dibujo y no una medida — con
 * veinte el croquis se vuelve una mancha—, así que el valor va siempre en el
 * rótulo.
 */
export function CargaDistribuida({
  x0,
  x1,
  y,
  alto = 20,
  flechas = 7,
  rotulo,
  sentido = "abajo",
}: CargaDistribuidaProps) {
  const n = Math.max(2, Math.round(flechas));
  const paso = (x1 - x0) / (n - 1);
  const yCola = sentido === "abajo" ? y - alto : y + alto;

  return (
    <g className="text-[var(--mat-cota)]">
      <path d={`M${x0} ${yCola} L${x1} ${yCola}`} stroke="currentColor" strokeWidth="1.4" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * paso;
        return (
          <g key={i}>
            <path d={`M${x} ${yCola} L${x} ${y}`} stroke="currentColor" strokeWidth="1" fill="none" />
            <Punta x={x} y={y} anguloRad={ANGULO[sentido]} tamano={5} />
          </g>
        );
      })}
      {rotulo && (
        <text
          x={(x0 + x1) / 2}
          y={sentido === "abajo" ? yCola - 5 : yCola + 12}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="10.5"
        >
          {rotulo}
        </text>
      )}
    </g>
  );
}

/**
 * Momento: arco con punta, en el sentido que indica `horario`.
 *
 * Se dibuja como arco y no como flecha doble porque es lo que distingue de un
 * vistazo un momento de un par de fuerzas.
 */
export function FlechaMomento({
  x,
  y,
  radio = 16,
  horario = true,
  rotulo,
}: {
  x: number;
  y: number;
  radio?: number;
  horario?: boolean;
  rotulo?: string;
}) {
  // Arco de unos 270°, dejando la boca arriba para que se vea el sentido.
  const desde = horario ? -2.4 : -0.74;
  const hasta = horario ? -0.74 : -2.4;
  const p = (a: number) => [x + radio * Math.cos(a), y + radio * Math.sin(a)];
  const [xi, yi] = p(desde);
  const [xf, yf] = p(hasta);
  // Tangente en el extremo final, que es hacia donde mira la punta.
  const tang = hasta + (horario ? Math.PI / 2 : -Math.PI / 2);

  return (
    <g className="text-[var(--mat-cota)]">
      <path
        d={`M${xi} ${yi} A${radio} ${radio} 0 1 ${horario ? 1 : 0} ${xf} ${yf}`}
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <Punta x={xf} y={yf} anguloRad={tang} />
      {rotulo && (
        <text
          x={x}
          y={y + radio + 13}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="10.5"
        >
          {rotulo}
        </text>
      )}
    </g>
  );
}

export type TipoApoyo = "articulado" | "movil" | "empotrado";

/**
 * Símbolo de apoyo, con la convención de siempre: triángulo para el que impide
 * los dos desplazamientos, triángulo sobre rodillos para el que deja correr, y
 * línea rayada para el empotramiento.
 *
 * Estaba escrito dentro de los diagramas de estática. Acá sirve también para
 * cimentaciones, muros y conexiones, que es donde la convención tiene que ser
 * la misma para que se lea sin pensar.
 */
export function SimboloApoyo({
  x,
  y,
  tipo,
  /** Hacia qué lado mira el rayado del empotramiento. */
  ladoEmpotrado = "izquierda",
  escala = 1,
}: {
  x: number;
  y: number;
  tipo: TipoApoyo;
  ladoEmpotrado?: "izquierda" | "derecha";
  escala?: number;
}) {
  const s = escala;

  if (tipo === "empotrado") {
    const dir = ladoEmpotrado === "izquierda" ? -1 : 1;
    return (
      <g stroke="currentColor" fill="none">
        <path d={`M${x} ${y - 12 * s} L${x} ${y + 12 * s}`} strokeWidth={2 * s} />
        {[-9, -4.5, 0, 4.5, 9].map((d) => (
          <path
            key={d}
            d={`M${x} ${y + d * s} L${x + dir * 7 * s} ${y + (d + 4.5) * s}`}
            strokeWidth={0.9 * s}
            opacity="0.75"
          />
        ))}
      </g>
    );
  }

  return (
    <g stroke="currentColor">
      <path
        d={`M${x} ${y} L${x - 7 * s} ${y + 11 * s} L${x + 7 * s} ${y + 11 * s} Z`}
        strokeWidth={1.3 * s}
        fill="var(--color-card)"
      />
      {tipo === "movil" ? (
        <>
          {[-4, 0, 4].map((d) => (
            <circle
              key={d}
              cx={x + d * s}
              cy={y + 13.6 * s}
              r={2.2 * s}
              strokeWidth={1 * s}
              fill="var(--color-card)"
            />
          ))}
          <path d={`M${x - 9 * s} ${y + 16.5 * s} L${x + 9 * s} ${y + 16.5 * s}`} strokeWidth={1.2 * s} />
        </>
      ) : (
        <path d={`M${x - 9 * s} ${y + 11 * s} L${x + 9 * s} ${y + 11 * s}`} strokeWidth={1.3 * s} />
      )}
    </g>
  );
}

export type Material =
  | "hormigon"
  | "acero"
  | "madera"
  | "mamposteria"
  | "carbon"
  | "calentada"
  | "eficaz";

const RELLENO: Record<Material, { fondo: string; borde: string }> = {
  hormigon: { fondo: "var(--mat-hormigon)", borde: "var(--mat-hormigon-borde)" },
  acero: { fondo: "var(--mat-acero)", borde: "var(--mat-acero-borde)" },
  madera: { fondo: "var(--mat-madera)", borde: "var(--mat-madera-borde)" },
  mamposteria: { fondo: "var(--mat-mamposteria)", borde: "var(--mat-mamposteria-junta)" },
  carbon: { fondo: "var(--mat-carbon)", borde: "var(--mat-carbon)" },
  calentada: { fondo: "var(--mat-calentada)", borde: "var(--mat-madera-borde)" },
  eficaz: { fondo: "var(--mat-eficaz)", borde: "var(--mat-madera-borde)" },
};

interface CapaMaterialProps {
  /** Contorno de la capa: un rectángulo o cualquier trazado cerrado. */
  d?: string;
  x?: number;
  y?: number;
  ancho?: number;
  alto?: number;
  material: Material;
  /** Rayado diagonal encima del relleno, para distinguir sin depender del tono. */
  rayado?: boolean;
  opacidad?: number;
}

/**
 * Capa de material: relleno, borde y rayado opcional, todo desde la gramática
 * de color.
 *
 * El rayado no es decorativo. Dos materiales que sólo se distinguen por el tono
 * no los distingue quien no ve esos tonos, y en la hoja impresa en blanco y
 * negro no los distingue nadie.
 */
export function CapaMaterial({
  d,
  x = 0,
  y = 0,
  ancho = 0,
  alto = 0,
  material,
  rayado = false,
  opacidad = 1,
}: CapaMaterialProps) {
  // Los ids de patrón son globales al documento: con uno fijo, dos croquis en
  // la misma página se pisarían el rayado.
  const idPatron = `rayado-${useId().replace(/:/g, "")}`;
  const { fondo, borde } = RELLENO[material];

  const forma = (relleno: string, extra?: Record<string, string | number>) =>
    d ? (
      <path d={d} fill={relleno} stroke="none" {...extra} />
    ) : (
      <rect x={x} y={y} width={ancho} height={alto} fill={relleno} stroke="none" {...extra} />
    );

  return (
    <g opacity={opacidad}>
      {rayado && (
        <defs>
          <pattern
            id={idPatron}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke={borde} strokeWidth="1.6" opacity="0.65" />
          </pattern>
        </defs>
      )}
      {forma(fondo)}
      {rayado && forma(`url(#${idPatron})`)}
      {d ? (
        <path d={d} fill="none" stroke={borde} strokeWidth="1.3" />
      ) : (
        <rect x={x} y={y} width={ancho} height={alto} fill="none" stroke={borde} strokeWidth="1.3" />
      )}
    </g>
  );
}

/**
 * Punto crítico: dónde gobierna la comprobación.
 *
 * Un croquis muestra la pieza entera, pero el resultado casi siempre lo decide
 * un punto —la fibra más traccionada, el perímetro que menos da, el conector
 * más exigido—. Sin marcarlo, hay que deducirlo de los números.
 */
export function MarcaPuntoCritico({
  x,
  y,
  rotulo,
  radio = 5,
}: {
  x: number;
  y: number;
  rotulo?: string;
  radio?: number;
}) {
  return (
    <g className="text-[var(--mat-fuego)]">
      <circle cx={x} cy={y} r={radio} fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx={x} cy={y} r={radio * 2.1} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <circle cx={x} cy={y} r={1.6} fill="currentColor" />
      {rotulo && (
        <text
          x={x + radio * 2.6}
          y={y - radio}
          className="fill-current font-mono"
          fontSize="9.5"
        >
          {rotulo}
        </text>
      )}
    </g>
  );
}

/**
 * Exposición al fuego sobre una cara: ondas térmicas entrando hacia la pieza.
 *
 * Deliberadamente sobrio. Un dibujo de llamas queda infantil al lado de un
 * croquis acotado, y lo que hay que comunicar no es que hay fuego sino **por
 * dónde entra el calor**, que es lo que decide cuántas caras descuentan.
 */
export function IndicadorFuego({
  x0,
  y0,
  x1,
  y1,
  /** Hacia dónde entra el calor, en grados: 0 derecha, 90 abajo. */
  haciaGrados,
  ondas = 3,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  haciaGrados: number;
  ondas?: number;
}) {
  const ang = (haciaGrados * Math.PI) / 180;
  // Las ondas se dibujan por fuera de la cara, retrocediendo en la dirección
  // de entrada del calor.
  const nx = -Math.cos(ang);
  const ny = -Math.sin(ang);
  const largo = Math.hypot(x1 - x0, y1 - y0);
  const paso = largo / (ondas + 1);
  const ux = (x1 - x0) / largo;
  const uy = (y1 - y0) / largo;

  return (
    <g className="text-[var(--mat-fuego)]">
      {/* Contorno de calor: la cara expuesta, resaltada. */}
      <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke="currentColor" strokeWidth="2.4" opacity="0.8" />
      {Array.from({ length: ondas }, (_, i) => {
        const t = paso * (i + 1);
        const bx = x0 + ux * t;
        const by = y0 + uy * t;
        return (
          <g key={i}>
            <path
              d={`M${bx + nx * 11} ${by + ny * 11} L${bx + nx * 3} ${by + ny * 3}`}
              stroke="currentColor"
              strokeWidth="1.1"
              fill="none"
            />
            <Punta x={bx + nx * 2} y={by + ny * 2} anguloRad={ang} tamano={4.5} />
          </g>
        );
      })}
    </g>
  );
}
