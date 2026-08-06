"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";

/**
 * Fisuración: dónde se mide el recubrimiento y por qué las dos familias de
 * barras no dan lo mismo. El área eficaz de hormigón que rodea la armadura es
 * lo que gobierna la separación de fisuras.
 */
export function CroquisSeccionFisuracion() {
  const x0 = 46;
  const x1 = 176;
  const yTop = 26;
  const yBot = 100;

  return (
    <Croquis
      viewBox="0 0 234 138"
      ancho="max-w-[17rem]"
      nota="El recubrimiento va hasta la superficie de la barra, no hasta su centro. M cuasipermanente es la carga sostenida, no la de cálculo."
    >
      <rect x={x0} y={yTop} width={x1 - x0} height={yBot - yTop} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />

      {/* zona traccionada eficaz */}
      <rect x={x0} y={yBot - 26} width={x1 - x0} height={26} stroke="currentColor" strokeWidth="0.9" strokeDasharray="4 3" fill="currentColor" fillOpacity="0.08" />

      {[64, 90, 116, 142, 162].map((x) => (
        <circle key={x} cx={x} cy={yBot - 12} r="4" fill="currentColor" />
      ))}

      <CotaV x={34} y0={yTop} y1={yBot} texto="h" />
      <CotaH x0={x0} x1={x1} y={yBot + 20} texto="b" />
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.9">
        <path d={`M${x0 + 6} ${yBot} L${x0 + 6} ${yBot - 8}`} markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
      </g>
      <Referencia x={186} y={yBot - 4} hacia={[x1, yBot - 8]} texto="recubrim." />
      <Referencia x={186} y={yBot - 30} hacia={[x1, yBot - 26]} texto="área eficaz" />
    </Croquis>
  );
}

/** Las dos familias de barras conviven en la misma cara traccionada. */
export function CroquisFamiliaFisuracion({ numero }: { numero: 1 | 2 }) {
  const esPrimera = numero === 1;
  return (
    <Croquis
      viewBox="0 0 206 96"
      ancho="max-w-[14rem]"
      nota={
        esPrimera
          ? "La familia 1 es la principal. φ y separación definen cuántas barras entran por metro."
          : "La familia 2 es opcional: si no hay segunda familia, se deja el diámetro en cero."
      }
    >
      <rect x="26" y="26" width="154" height="44" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.4" />
      {[42, 68, 94, 120, 146, 168].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy="58"
          r={esPrimera || i % 2 === 0 ? 4.5 : 3}
          fill="currentColor"
          fillOpacity={esPrimera ? 1 : i % 2 === 0 ? 0.3 : 1}
        />
      ))}
      <CotaH x0={42} x1={68} y={84} texto="separación" />
      <Referencia x={186} y={52} hacia={[172, 56]} texto="φ" />
    </Croquis>
  );
}

/**
 * Viento: la geometría del edificio en planta y en altura. a y b son los lados
 * y h la altura total; la relación entre ellos es la que entra al gráfico del
 * que se lee γ.
 */
export function CroquisGeometriaViento() {
  return (
    <Croquis
      viewBox="0 0 226 136"
      ancho="max-w-[16rem]"
      nota="a y b son los lados en planta y h la altura total. De su relación sale el γ que hay que leer del gráfico de la norma y cargar acá."
    >
      {/* alzado */}
      <rect x="34" y="24" width="52" height="82" stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.4" />
      <CotaV x={24} y0={24} y1={106} texto="h total" />
      {[36, 54, 72, 90].map((y) => (
        <path key={y} d={`M14 ${y} L30 ${y}`} stroke="currentColor" strokeWidth="1.1" markerEnd="url(#croquis-flecha)" opacity="0.8" />
      ))}
      <path d="M34 110 L86 110" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />

      {/* planta */}
      <rect x="126" y="46" width="68" height="46" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.35" />
      <CotaH x0={126} x1={194} y={110} texto="a" />
      <CotaV x={116} y0={46} y1={92} texto="b" />
      <text x="160" y="36" textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.7">
        planta
      </text>
    </Croquis>
  );
}

/** Niveles: se generan equiespaciados entre la primera cota y la coronación. */
export function CroquisNivelesViento() {
  const ys = [96, 82, 68, 54, 40];
  return (
    <Croquis
      viewBox="0 0 206 128"
      ancho="max-w-[14rem]"
      nota="Los niveles se generan equiespaciados entre la cota del primero y la coronación: no se cargan uno por uno."
    >
      <rect x="60" y="30" width="60" height="80" stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.35" />
      {ys.map((y) => (
        <path key={y} d={`M60 ${y} L120 ${y}`} stroke="currentColor" strokeWidth="1" opacity="0.7" />
      ))}
      <path d="M40 110 L52 110" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      <Referencia x={128} y={100} hacia={[120, 96]} texto="1er nivel" />
      <Referencia x={128} y={36} hacia={[120, 30]} texto="coronación" />
      <CotaV x={50} y0={96} y1={110} texto="cota" />
    </Croquis>
  );
}

/** Sección mixta: tubo circular relleno, con el acero por fuera y las barras dentro. */
export function CroquisSeccionMixta() {
  const cx = 74;
  const cy = 62;
  const R = 40;

  return (
    <Croquis
      viewBox="0 0 216 128"
      ancho="max-w-[15rem]"
      nota="D es el diámetro exterior del tubo y t su espesor de pared. yG es la distancia del centro a la fila de barras que se está describiendo."
    >
      <circle cx={cx} cy={cy} r={R} stroke="currentColor" strokeWidth="2.4" fill="var(--color-muted)" fillOpacity="0.3" />
      <circle cx={cx} cy={cy} r={R - 6} stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (2 * Math.PI * i) / 6 - Math.PI / 2;
        return <circle key={i} cx={cx + (R - 16) * Math.cos(a)} cy={cy + (R - 16) * Math.sin(a)} r="3.6" fill="currentColor" />;
      })}
      <CotaH x0={cx - R} x1={cx + R} y={cy + R + 18} texto="D" />
      <Referencia x={128} y={30} hacia={[cx + R - 3, 40]} texto="t (pared)" />
      <Referencia x={128} y={66} hacia={[cx + R - 16, 62]} texto="yG" />
      <path d={`M${cx} ${cy} L${cx + R - 16} ${cy}`} stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.7" />
    </Croquis>
  );
}

/** Cordón de soldadura alrededor de un perfil H: qué mide cada dimensión. */
export function CroquisPerfilSoldadura() {
  const cx = 84;
  const yTop = 26;
  const yBot = 96;
  const semiB = 34;

  return (
    <Croquis
      viewBox="0 0 224 134"
      ancho="max-w-[16rem]"
      nota="H y B son las dimensiones exteriores del perfil, tf el espesor del ala y tw el del alma. El lado D es el cateto del cordón, no su garganta."
    >
      {/* alas y alma */}
      <rect x={cx - semiB} y={yTop} width={semiB * 2} height={9} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.6" />
      <rect x={cx - semiB} y={yBot - 9} width={semiB * 2} height={9} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.6" />
      <rect x={cx - 5} y={yTop + 9} width={10} height={yBot - yTop - 18} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.6" />

      {/* cordón en la base */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M${cx + s * semiB} ${yBot} L${cx + s * (semiB + 9)} ${yBot} L${cx + s * semiB} ${yBot - 9} Z`}
          fill="currentColor"
          fillOpacity="0.35"
          stroke="currentColor"
          strokeWidth="0.9"
        />
      ))}

      <CotaV x={cx - semiB - 18} y0={yTop} y1={yBot} texto="H" />
      <CotaH x0={cx - semiB} x1={cx + semiB} y={yTop - 10} texto="B" />
      <Referencia x={146} y={yTop + 12} hacia={[cx + semiB - 4, yTop + 5]} texto="tf" />
      <Referencia x={146} y={62} hacia={[cx + 5, 62]} texto="tw" />
      <Referencia x={146} y={yBot + 4} hacia={[cx + semiB + 5, yBot - 4]} texto="lado D" />
    </Croquis>
  );
}

/** Chapa de base: qué es cada dimensión y dónde se miden lc y las filas de pernos. */
export function CroquisChapaBase() {
  const x0 = 44;
  const x1 = 168;
  const y0 = 30;
  const y1 = 96;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  return (
    <Croquis
      viewBox="0 0 226 136"
      ancho="max-w-[16rem]"
      nota="Lx y Ly son los lados de la chapa y t su espesor. lc es el vuelo libre entre la cara del pilar y el borde, que es el que flecta la chapa."
    >
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.35" />
      <rect x={cx - 24} y={cy - 16} width={48} height={32} stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.85" />

      {[x0 + 12, x1 - 12].map((x) =>
        [y0 + 12, y1 - 12].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" stroke="currentColor" strokeWidth="1.3" />)
      )}

      <CotaH x0={x0} x1={x1} y={y1 + 20} texto="Lx" />
      <CotaV x={x0 - 14} y0={y0} y1={y1} texto="Ly" />
      <CotaH x0={cx + 24} x1={x1} y={y0 - 8} texto="lc" />
      <Referencia x={176} y={y1 - 6} hacia={[x1 - 12, y1 - 12]} texto="pernos" />
    </Croquis>
  );
}
