"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";

/** Losa vista de canto, con las dos mallas dibujadas de perfil. */
function SeccionLosa({
  x0,
  x1,
  yTop,
  yBot,
}: {
  x0: number;
  x1: number;
  yTop: number;
  yBot: number;
}) {
  return (
    <rect
      x={x0}
      y={yTop}
      width={x1 - x0}
      height={yBot - yTop}
      stroke="currentColor"
      strokeWidth="1.6"
      fill="var(--color-muted)"
      fillOpacity="0.45"
    />
  );
}

/** Barras vistas de punta (la dirección que sale del papel). */
function BarrasDePunta({ xs, y, r = 3 }: { xs: number[]; y: number; r?: number }) {
  return (
    <g>
      {xs.map((x) => (
        <circle key={x} cx={x} cy={y} r={r} fill="currentColor" />
      ))}
    </g>
  );
}

/** Barra vista de costado (la dirección contenida en el plano del corte). */
function BarraDeCostado({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  return <path d={`M${x0} ${y} L${x1} ${y}`} stroke="currentColor" strokeWidth="2.4" />;
}

/**
 * Geometría: el espesor y desde qué cara se mide cada recubrimiento. Son dos
 * datos distintos porque el armado de abajo y el de arriba pueden ir con
 * recubrimientos diferentes.
 */
export function CroquisGeometriaLosa() {
  const x0 = 46;
  const x1 = 200;
  const yTop = 34;
  const yBot = 96;

  return (
    <Croquis
      viewBox="0 0 236 126"
      ancho="max-w-[17rem]"
      nota="Cada recubrimiento se mide desde su propia cara: el de positivos desde abajo y el de negativos desde arriba."
    >
      <SeccionLosa x0={x0} x1={x1} yTop={yTop} yBot={yBot} />

      {/* malla superior (negativos) y malla inferior (positivos) */}
      <BarraDeCostado x0={x0 + 8} x1={x1 - 8} y={yTop + 11} />
      <BarrasDePunta xs={[70, 100, 130, 160, 186]} y={yTop + 6} />
      <BarraDeCostado x0={x0 + 8} x1={x1 - 8} y={yBot - 11} />
      <BarrasDePunta xs={[70, 100, 130, 160, 186]} y={yBot - 6} />

      <CotaV x={34} y0={yTop} y1={yBot} texto="e" />

      <g stroke="currentColor" strokeWidth="0.8" opacity="0.9">
        <path d={`M${x0 + 2} ${yBot} L${x0 + 2} ${yBot - 6}`} markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
        <path d={`M${x0 + 2} ${yTop} L${x0 + 2} ${yTop + 6}`} markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
      </g>
      <Referencia x={206} y={yTop + 4} hacia={[192, yTop + 6]} texto="rg negativos" />
      <Referencia x={206} y={yBot + 2} hacia={[192, yBot - 6]} texto="rg positivos" />
    </Croquis>
  );
}

interface CroquisCapasLosaProps {
  /** Cara donde va esta malla. */
  cara: "inferior" | "superior";
}

/**
 * Cómo se apilan las dos direcciones, que es lo que explica que X e Y tengan
 * distinto canto útil aunque compartan el recubrimiento: la malla de Y va por
 * fuera y la de X se apoya sobre ella, así que X queda una barra más adentro.
 */
export function CroquisCapasLosa({ cara }: CroquisCapasLosaProps) {
  const inferior = cara === "inferior";
  const x0 = 52;
  const x1 = 186;
  const yTop = 30;
  const yBot = 104;

  // La malla exterior es siempre la de Y; la de X se apoya encima. La
  // separación entre capas va exagerada a propósito: en la realidad difieren en
  // un diámetro y las dos cotas saldrían casi iguales, que es justo lo que hay
  // que poder distinguir.
  const yExterior = inferior ? yBot - 10 : yTop + 10;
  const yInterior = inferior ? yBot - 30 : yTop + 30;
  // El canto útil se mide desde la cara comprimida, que es la opuesta.
  const caraComprimida = inferior ? yTop : yBot;

  return (
    <Croquis
      viewBox="0 0 244 136"
      ancho="max-w-[17rem]"
      nota={
        inferior
          ? "La malla de Y va por fuera y la de X se apoya encima, así que dX es menor que dY aunque el recubrimiento sea el mismo."
          : "Mismo apilado que abajo, pero contra la cara superior: Y por fuera y X apoyada encima."
      }
    >
      <SeccionLosa x0={x0} x1={x1} yTop={yTop} yBot={yBot} />

      {/* Y de costado (por fuera), X de punta (por dentro) */}
      <BarraDeCostado x0={x0 + 6} x1={x1 - 6} y={yExterior} />
      <BarrasDePunta xs={[72, 100, 128, 156]} y={yInterior} />

      <Referencia
        x={x1 + 8}
        y={yExterior + (inferior ? 6 : -2)}
        hacia={[x1 - 8, yExterior]}
        texto="Y (fuera)"
      />
      <Referencia
        x={x1 + 8}
        y={yInterior + (inferior ? 6 : -2)}
        hacia={[156, yInterior]}
        texto="X (dentro)"
      />

      {/* Guías hasta cada capa, para que se vea cuál cota termina en cuál barra. */}
      <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5">
        <path d={`M26 ${yExterior} L${x0} ${yExterior}`} />
        <path d={`M14 ${yInterior} L72 ${yInterior}`} />
      </g>
      <CotaV x={26} y0={caraComprimida} y1={yExterior} texto="dY" />
      <CotaV x={14} y0={caraComprimida} y1={yInterior} texto="dX" />
    </Croquis>
  );
}

/**
 * Momentos: qué luz corresponde a cada dirección y qué cara tracciona cada
 * signo. El positivo tracciona abajo, en el centro del paño, y el negativo
 * arriba, sobre los apoyos.
 */
export function CroquisMomentosLosa() {
  return (
    <Croquis
      viewBox="0 0 240 132"
      ancho="max-w-[17rem]"
      nota="Los momentos entran ya mayorados y por metro de ancho. Mx arma la dirección X y My la Y; el signo dice qué cara tracciona."
    >
      {/* paño en planta */}
      <rect x="30" y="24" width="104" height="76" stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.35" />
      <path d="M38 62 L126 62" stroke="currentColor" strokeWidth="1.2" markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
      <text x="82" y="58" textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
        X
      </text>
      <path d="M82 32 L82 92" stroke="currentColor" strokeWidth="1.2" markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
      <text x="90" y="86" className="fill-current font-mono" fontSize="10.5">
        Y
      </text>

      {/* corte con los dos signos */}
      <rect x="156" y="40" width="72" height="16" stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.45" />
      <BarraDeCostado x0={160} x1={224} y={44} />
      <text x="192" y="34" textAnchor="middle" className="fill-current font-mono" fontSize="8.5">
        M −  arriba
      </text>

      <rect x="156" y="76" width="72" height="16" stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.45" />
      <BarraDeCostado x0={160} x1={224} y={88} />
      <text x="192" y="104" textAnchor="middle" className="fill-current font-mono" fontSize="8.5">
        M +  abajo
      </text>
    </Croquis>
  );
}

interface CroquisMallaLosaProps {
  /** Diámetro cargado, sólo para el rótulo. */
  diametroMm: number;
  /** Separación cargada en metros, sólo para el rótulo. */
  separacionM: number;
}

/** Malla en planta: qué significan φ y s, y que el armado se da por metro. */
export function CroquisMallaLosa({ diametroMm, separacionM }: CroquisMallaLosaProps) {
  const xs = [40, 66, 92, 118, 144, 170];
  const ys = [34, 60, 86];

  const rotuloS =
    Number.isFinite(separacionM) && separacionM > 0
      ? `s = ${(separacionM * 100).toLocaleString("es-AR", { maximumFractionDigits: 0 })} cm`
      : "s";
  const rotuloPhi =
    Number.isFinite(diametroMm) && diametroMm > 0
      ? `φ ${diametroMm.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
      : "φ";

  return (
    <Croquis
      viewBox="0 0 210 118"
      ancho="max-w-[15rem]"
      nota="El área de armadura sale de φ y s: no hay que cargar cantidad de barras, la herramienta la deduce por metro."
    >
      {ys.map((y) => (
        <path key={y} d={`M34 ${y} L182 ${y}`} stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
      ))}
      {xs.map((x) => (
        <path key={x} d={`M${x} 26 L${x} 94`} stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      ))}
      <CotaH x0={40} x1={66} y={108} texto={rotuloS} />
      <Referencia x={186} y={34} hacia={[178, 34]} texto={rotuloPhi} />
    </Croquis>
  );
}
