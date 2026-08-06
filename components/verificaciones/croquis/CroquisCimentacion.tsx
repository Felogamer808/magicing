"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";

/** Terreno rayado bajo la zapata. */
function BaseTerreno({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const n = Math.max(3, Math.floor((x1 - x0) / 10));
  return (
    <g stroke="currentColor" strokeWidth="0.7" opacity="0.5">
      <path d={`M${x0} ${y} L${x1} ${y}`} strokeWidth="1" />
      {Array.from({ length: n }).map((_, i) => (
        <path key={i} d={`M${x0 + i * 10} ${y} L${x0 + i * 10 - 5} ${y + 6}`} />
      ))}
    </g>
  );
}

/**
 * Geometría en planta: A y B son los lados de la zapata, y el pilar se describe
 * con su ancho paralelo a cada uno. "Ancho // A" es la dimensión del pilar
 * medida en la misma dirección que A, no la perpendicular — que es lo que se
 * suele cruzar.
 */
export function CroquisGeometriaZapata() {
  const x0 = 54;
  const x1 = 178;
  const y0 = 30;
  const y1 = 96;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  return (
    <Croquis
      viewBox="0 0 232 142"
      ancho="max-w-[17rem]"
      nota="A y B son los lados de la zapata en planta; H es el canto. El pilar se describe con su ancho medido en la misma dirección que cada lado."
    >
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />
      <rect x={cx - 16} y={cy - 12} width={32} height={24} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.75" />

      <CotaH x0={x0} x1={x1} y={y1 + 20} texto="A" />
      <CotaV x={x0 - 14} y0={y0} y1={y1} texto="B" />
      <CotaH x0={cx - 16} x1={cx + 16} y={y0 - 8} texto="ancho // A" />
      <CotaV x={x1 + 16} y0={cy - 12} y1={cy + 12} texto="ancho // B" />
      <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5">
        <path d={`M${cx + 16} ${cy - 12} L${x1 + 16} ${cy - 12}`} />
        <path d={`M${cx + 16} ${cy + 12} L${x1 + 16} ${cy + 12}`} />
      </g>
    </Croquis>
  );
}

/**
 * Pilar: cuál de sus dos anchos es cuál. "Ancho // A" es la dimensión medida en
 * la misma dirección que el lado A de la zapata, no la perpendicular — es el
 * cruce más fácil de cometer y no da error, da un punzonamiento mal calculado.
 */
export function CroquisPilarZapata() {
  const cx = 96;
  const cy = 58;

  return (
    <Croquis
      viewBox="0 0 214 116"
      ancho="max-w-[15rem]"
      nota="Cada ancho se mide en la misma dirección que el lado de la zapata que lo nombra: el paralelo, no el perpendicular."
    >
      {/* zapata de fondo, en gris, sólo para dar la referencia de A y B */}
      <rect x={cx - 62} y={cy - 34} width={124} height={68} stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <text x={cx} y={cy + 46} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.6">
        A
      </text>
      <text x={cx - 72} y={cy + 3} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.6">
        B
      </text>

      <rect x={cx - 24} y={cy - 15} width={48} height={30} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.7" />
      <CotaH x0={cx - 24} x1={cx + 24} y={cy - 24} texto="ancho // A" />
      <CotaV x={cx + 42} y0={cy - 15} y1={cy + 15} texto="ancho // B" />
      <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5">
        <path d={`M${cx + 24} ${cy - 15} L${cx + 42} ${cy - 15}`} />
        <path d={`M${cx + 24} ${cy + 15} L${cx + 42} ${cy + 15}`} />
      </g>
    </Croquis>
  );
}

/**
 * Cargas: el axil y los dos momentos, cada uno alrededor de su eje. Se cargan
 * **característicos**, sin mayorar: los coeficientes los aplica la herramienta
 * por dentro según lo que esté verificando.
 */
export function CroquisCargasZapata() {
  const cx = 108;

  return (
    <Croquis
      viewBox="0 0 226 130"
      ancho="max-w-[16rem]"
      nota="Los tres valores van característicos, sin mayorar. Mk A flecta alrededor del eje perpendicular a A, o sea que reparte la presión a lo largo de A."
    >
      {/* pilar y zapata de frente */}
      <rect x={cx - 12} y={34} width={24} height={38} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.6" />
      <rect x={cx - 58} y={72} width={116} height={16} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />
      <BaseTerreno x0={cx - 58} x1={cx + 58} y={88} />

      {/* axil */}
      <path d={`M${cx} 10 L${cx} 30`} stroke="currentColor" strokeWidth="1.8" markerEnd="url(#croquis-flecha)" />
      <text x={cx + 7} y="22" className="fill-current font-mono" fontSize="10.5">
        Nk
      </text>

      {/* momento */}
      <path
        d={`M${cx - 34} 46 A 24 14 0 1 1 ${cx + 34} 46`}
        stroke="currentColor"
        strokeWidth="1.3"
        markerEnd="url(#croquis-flecha)"
      />
      <text x={cx + 42} y="44" className="fill-current font-mono" fontSize="10.5">
        Mk
      </text>

      {/* presión resultante, trapecial por el momento */}
      <path d={`M${cx - 58} 96 L${cx + 58} 96 L${cx + 58} 118 L${cx - 58} 104 Z`} fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="0.8" opacity="0.85" />
      <text x={cx} y="126" textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        σ del terreno
      </text>
    </Croquis>
  );
}

interface CroquisArmadoDireccionProps {
  /** Lado al que va paralela esta armadura. */
  direccion: "A" | "B";
}

/** Armado de una dirección: las barras corren paralelas al lado que las nombra. */
export function CroquisArmadoDireccion({ direccion }: CroquisArmadoDireccionProps) {
  const esA = direccion === "A";
  const x0 = 40;
  const x1 = 168;
  const y0 = 28;
  const y1 = 92;

  return (
    <Croquis
      viewBox="0 0 206 122"
      ancho="max-w-[15rem]"
      nota={`Las barras de la dirección ${direccion} corren paralelas al lado ${direccion} y cubren el momento que flecta en ese sentido.`}
    >
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.35" />
      {esA
        ? [38, 48, 58, 68, 78].map((y) => (
            <path key={y} d={`M${x0 + 6} ${y} L${x1 - 6} ${y}`} stroke="currentColor" strokeWidth="1.9" />
          ))
        : [56, 76, 96, 116, 136, 152].map((x) => (
            <path key={x} d={`M${x} ${y0 + 6} L${x} ${y1 - 6}`} stroke="currentColor" strokeWidth="1.9" />
          ))}
      <CotaH x0={x0} x1={x1} y={y1 + 18} texto="A" />
      <CotaV x={x0 - 12} y0={y0} y1={y1} texto="B" />
      <Referencia x={176} y={esA ? 44 : 40} hacia={esA ? [x1 - 6, 48] : [152, y0 + 10]} texto={`dir. ${direccion}`} />
    </Croquis>
  );
}

/** Zapata corrida: se calcula una rebanada de un metro, no la zapata entera. */
export function CroquisZapataCorrida() {
  const cx = 106;

  return (
    <Croquis
      viewBox="0 0 216 136"
      ancho="max-w-[16rem]"
      nota="Todo el cálculo va por metro corrido: las cargas se dan por metro y el armado principal sale también por metro."
    >
      <rect x={cx - 10} y={26} width={20} height={40} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.6" />
      <rect x={cx - 56} y={66} width={112} height={18} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />
      <BaseTerreno x0={cx - 56} x1={cx + 56} y={84} />

      <CotaH x0={cx - 56} x1={cx + 56} y={104} texto="A (ancho)" />
      <CotaV x={cx - 68} y0={66} y1={84} texto="H" />

      {/* rebanada de 1 m marcada en perspectiva */}
      <g stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7">
        <path d={`M${cx + 56} 66 L${cx + 74} 54`} />
        <path d={`M${cx + 56} 84 L${cx + 74} 72`} />
        <path d={`M${cx + 74} 54 L${cx + 74} 72`} />
      </g>
      <text x={cx + 78} y="50" className="fill-current font-mono" fontSize="9.5">
        1 m
      </text>
    </Croquis>
  );
}

/**
 * Zapata que recibe más de un pilar: la posición de cada uno se mide desde el
 * borde izquierdo, no desde el centro ni desde el pilar anterior.
 */
export function CroquisPosicionPilares({ cantidad = 2 }: { cantidad?: number }) {
  const x0 = 34;
  const x1 = 184;
  const yTop = 62;
  const yBot = 80;
  const xs = cantidad === 2 ? [76, 150] : [62, 110, 158];

  return (
    <Croquis
      viewBox="0 0 218 132"
      ancho="max-w-[16rem]"
      nota="La posición de cada pilar se mide desde el borde izquierdo de la zapata, no entre pilares. Las cargas van características."
    >
      <rect x={x0} y={yTop} width={x1 - x0} height={yBot - yTop} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />
      <BaseTerreno x0={x0} x1={x1} y={yBot} />

      {xs.map((x, i) => (
        <g key={x}>
          <rect x={x - 9} y={yTop - 26} width={18} height={26} stroke="currentColor" strokeWidth="1.3" fill="var(--color-muted)" fillOpacity="0.65" />
          <path d={`M${x} ${yTop - 44} L${x} ${yTop - 30}`} stroke="currentColor" strokeWidth="1.5" markerEnd="url(#croquis-flecha)" />
          <text x={x + 6} y={yTop - 36} className="fill-current font-mono" fontSize="9.5">
            Nk{i + 1}
          </text>
        </g>
      ))}

      {/* Línea de referencia del borde, que es de donde salen las posiciones. */}
      <path d={`M${x0} ${yTop} L${x0} ${yBot + 30}`} stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.6" />
      <CotaH x0={x0} x1={xs[0]} y={yBot + 16} texto="pos. 1" />
      <CotaH x0={x0} x1={xs[1]} y={yBot + 30} texto="pos. 2" />
      <CotaH x0={x0} x1={x1} y={112} texto="A (largo)" />
    </Croquis>
  );
}

/**
 * Pilote: de dónde sale cada resistencia. El fuste trabaja por rozamiento en
 * toda la longitud y la punta por apoyo en el área de la base; el factor de
 * seguridad se aplica a la suma.
 */
export function CroquisGeotecniaPilote() {
  const cx = 96;
  const yTop = 26;
  const yBot = 104;

  return (
    <Croquis
      viewBox="0 0 218 136"
      ancho="max-w-[15rem]"
      nota="fs actúa en toda la superficie lateral y qp sólo en el área de la punta. El FS se aplica sobre la suma de las dos, no sobre cada una."
    >
      <rect x={cx - 14} y={yTop} width={28} height={yBot - yTop} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.45" />

      {/* rozamiento por fuste, a los dos lados */}
      {[40, 56, 72, 88].map((y) => (
        <g key={y}>
          <path d={`M${cx - 26} ${y} L${cx - 16} ${y}`} stroke="currentColor" strokeWidth="1.1" markerEnd="url(#croquis-flecha)" opacity="0.85" />
          <path d={`M${cx + 26} ${y} L${cx + 16} ${y}`} stroke="currentColor" strokeWidth="1.1" markerEnd="url(#croquis-flecha)" opacity="0.85" />
        </g>
      ))}
      <Referencia x={150} y={54} hacia={[cx + 26, 56]} texto="fs (fuste)" />

      {/* apoyo en punta */}
      {[-8, 0, 8].map((dx) => (
        <path key={dx} d={`M${cx + dx} ${yBot + 16} L${cx + dx} ${yBot + 4}`} stroke="currentColor" strokeWidth="1.3" markerEnd="url(#croquis-flecha)" />
      ))}
      <Referencia x={150} y={yBot + 14} hacia={[cx + 10, yBot + 10]} texto="qp (punta)" />

      <CotaV x={cx - 36} y0={yTop} y1={yBot} texto="L" />
      <CotaH x0={cx - 14} x1={cx + 14} y={yTop - 10} texto="D" />
    </Croquis>
  );
}

/** Armadura del pilote: barras longitudinales y zuncho helicoidal. */
export function CroquisArmaduraPilote() {
  const cx = 66;
  const cy = 62;
  const r = 34;

  return (
    <Croquis
      viewBox="0 0 206 124"
      ancho="max-w-[15rem]"
      nota="Las barras van repartidas en el perímetro y el zuncho las abraza; Nk es la carga característica que baja por el pilote."
    >
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />
      <circle cx={cx} cy={cy} r={r - 8} stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (2 * Math.PI * i) / 8 - Math.PI / 2;
        return <circle key={i} cx={cx + (r - 8) * Math.cos(a)} cy={cy + (r - 8) * Math.sin(a)} r="3.4" fill="currentColor" />;
      })}
      <Referencia x={112} y={40} hacia={[cx + 20, 42]} texto="Nº barras · φ" />
      <Referencia x={112} y={86} hacia={[cx + 24, 80]} texto="φ zuncho" />
    </Croquis>
  );
}
