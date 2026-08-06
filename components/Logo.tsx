/**
 * Logotipo de MagicIng: la palabra con la varita ocupando el lugar de la "I" de
 * "ING".
 *
 * Va dibujado en SVG y no como imagen por tres razones prácticas: escala sin
 * perder filo en cualquier tamaño, hereda el color del texto —así funciona igual
 * en tema claro y oscuro, y sale en negro en las hojas impresas—, y pesa unos
 * pocos cientos de bytes.
 *
 * La palabra se compone con dos bloques de texto anclados por lados opuestos a
 * la varita: "MAGIc" termina donde ella empieza y "NG" arranca donde termina. De
 * ese modo el dibujo no depende de las métricas exactas de la tipografía; si el
 * corte cambia, las letras siguen abrazando la varita sin recalcular nada.
 */

interface LogoProps {
  /** Alto en píxeles. El ancho sale de la proporción. */
  className?: string;
  /** Texto alternativo; en un enlace que ya dice "MagicIng" conviene vaciarlo. */
  titulo?: string;
}

/** Eje de la varita dentro del viewBox: las dos mitades de la palabra se anclan acá. */
const EJE_VARITA = 352;
/**
 * Las separaciones son distintas a los dos lados, y tienen que serlo: la varita
 * está inclinada 12°, así que a la altura de las mayúsculas su punta ya se corrió
 * unos 27 px hacia la derecha. Con el mismo hueco de los dos lados, el mango
 * pisaría el asta de la "N".
 */
const SEPARACION_IZQ = 30;
const SEPARACION_DER = 56;

export function Logo({ className, titulo = "MagicIng" }: LogoProps) {
  return (
    <svg
      /*
        El encuadre se toma de la tinta real —del destello más alto a la línea de
        base—, no del alto de caja de la tipografía: "MAGIcNG" no tiene ninguna
        letra con cola, así que la caja de texto sobra por abajo y encuadrar con
        ella dejaría el logotipo pegado al techo.
      */
      viewBox="-40 -104 640 296"
      className={className}
      role={titulo ? "img" : "presentation"}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : true}
      fill="currentColor"
    >
      <text
        x={EJE_VARITA - SEPARACION_IZQ}
        y={168}
        textAnchor="end"
        fontFamily="var(--font-logo), system-ui, sans-serif"
        fontWeight={600}
        fontSize={132}
        letterSpacing={-2}
      >
        MAGI
        {/* La "c" va en minúscula y más chica: es la juntura entre las dos palabras. */}
        <tspan fontSize={76} dy={-6}>
          c
        </tspan>
      </text>

      <VaritaMagica x={EJE_VARITA} y={168} />

      <text
        x={EJE_VARITA + SEPARACION_DER}
        y={168}
        textAnchor="start"
        fontFamily="var(--font-logo), system-ui, sans-serif"
        fontWeight={600}
        fontSize={132}
        letterSpacing={-2}
      >
        NG
      </text>
    </svg>
  );
}

/**
 * Varita sola, para los lugares donde no entra la palabra completa: la barra
 * móvil, la pestaña del navegador o un avatar.
 */
export function MarcaVarita({ className, titulo = "MagicIng" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={titulo ? "img" : "presentation"}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : true}
      fill="currentColor"
    >
      <VaritaMagica x={43} y={106} escala={0.5} conDestellos={false} />
    </svg>
  );
}

interface VaritaProps {
  /** Punto de apoyo: el extremo inferior del mango, sobre la línea de base. */
  x: number;
  y: number;
  escala?: number;
  conDestellos?: boolean;
}

/**
 * La varita: mango inclinado con su anillo, estrella de cinco puntas al tope y
 * los destellos alrededor.
 *
 * La inclinación de 12° es la del logotipo original y se conserva a propósito:
 * puesta vertical la varita se confunde con una "I" cualquiera y el guiño se
 * pierde. Todo el trazo comparte grosor y terminaciones redondeadas para que
 * pegue con la tipografía.
 */
function VaritaMagica({ x, y, escala = 1, conDestellos = true }: VaritaProps) {
  const trazo = 11;

  return (
    <g transform={`translate(${x} ${y}) scale(${escala}) rotate(12)`}>
      {/*
        Mango y anillo en un solo trazado, con regla de relleno par-impar: el
        segundo contorno cala el primero. Dibujar el anillo como un rectángulo
        del color del fondo lo haría aparecer como una banda opaca en cuanto el
        logotipo se apoye sobre otra cosa; así es un hueco de verdad.
        Las puntas del mango salen romas, como las terminaciones de las letras.
      */}
      <path
        fillRule="evenodd"
        d="M-11 -139 A11 11 0 0 1 11 -139 L11 -11 A11 11 0 0 1 -11 -11 Z
           M-11 -46 H11 V-37 H-11 Z"
      />

      {/* Estrella de cinco puntas, hueca, centrada sobre la punta del mango. */}
      <g transform="translate(0 -178)">
        <path
          d="M0 -38 L9.5 -13.1 L36.1 -11.7 L15.4 5 L22.3 30.7 L0 16.2 L-22.3 30.7 L-15.4 5 L-36.1 -11.7 L-9.5 -13.1 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={trazo}
          strokeLinejoin="round"
        />
      </g>

      {conDestellos && (
        <g transform="translate(0 -178)">
          <Destello x={-62} y={-30} tamano={13} />
          <Destello x={52} y={-46} tamano={17} />
          <Destello x={70} y={12} tamano={11} />
          <circle cx={-46} cy={22} r={5} />
          <circle cx={30} cy={-62} r={4} />
        </g>
      )}
    </g>
  );
}

/** Destello de cuatro puntas, con los lados cóncavos. */
function Destello({ x, y, tamano }: { x: number; y: number; tamano: number }) {
  const t = tamano;
  const c = t * 0.18;
  return (
    <path
      transform={`translate(${x} ${y})`}
      d={`M0 ${-t} Q${c} ${-c} ${t} 0 Q${c} ${c} 0 ${t} Q${-c} ${c} ${-t} 0 Q${-c} ${-c} 0 ${-t} Z`}
    />
  );
}
