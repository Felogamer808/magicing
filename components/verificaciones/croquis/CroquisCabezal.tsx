"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";

/** Alzado del cabezal: pilar arriba, cabezal en el medio, dos pilotes abajo. */
function AlzadoCabezal({
  xCentro,
  yTop,
  yBot,
  semiAncho,
  anchoPilar = 16,
  dxPilote = 40,
  anchoPilote = 16,
}: {
  xCentro: number;
  yTop: number;
  yBot: number;
  semiAncho: number;
  anchoPilar?: number;
  dxPilote?: number;
  anchoPilote?: number;
}) {
  return (
    <g>
      {/* pilar */}
      <rect
        x={xCentro - anchoPilar / 2}
        y={yTop - 20}
        width={anchoPilar}
        height={20}
        stroke="currentColor"
        strokeWidth="1.3"
        fill="var(--color-muted)"
        fillOpacity="0.5"
      />
      {/* cabezal */}
      <rect
        x={xCentro - semiAncho}
        y={yTop}
        width={semiAncho * 2}
        height={yBot - yTop}
        stroke="currentColor"
        strokeWidth="1.6"
        fill="var(--color-muted)"
        fillOpacity="0.4"
      />
      {/* pilotes */}
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={xCentro + s * dxPilote - anchoPilote / 2}
          y={yBot}
          width={anchoPilote}
          height={22}
          stroke="currentColor"
          strokeWidth="1.3"
          fill="var(--color-muted)"
          fillOpacity="0.5"
        />
      ))}
    </g>
  );
}

/**
 * Geometría y carga. Lo que más conviene dejar dicho es que la separación entre
 * pilotes **no se carga**: la herramienta la fija en 2,5 diámetros, que es el
 * mínimo habitual, y de ahí sale todo el brazo del modelo.
 */
export function CroquisGeometriaCabezal() {
  const xc = 118;
  const yTop = 58;
  const yBot = 98;

  return (
    <Croquis
      viewBox="0 0 240 176"
      ancho="max-w-[18rem]"
      nota="La separación entre pilotes no es un dato: se toma s = 2,5·D. Nd es la carga del pilar ya mayorada; al peso propio del cabezal la herramienta le aplica γ = 1,35 por su cuenta."
    >
      <AlzadoCabezal xCentro={xc} yTop={yTop} yBot={yBot} semiAncho={62} />

      {/* Nd bien arriba, para no pisar el rótulo del pilar. */}
      <path d={`M${xc} 8 L${xc} 30`} stroke="currentColor" strokeWidth="1.6" markerEnd="url(#croquis-flecha)" />
      <text x={xc + 7} y="22" className="fill-current font-mono" fontSize="10.5">
        Nd
      </text>

      <Referencia x={34} y={yTop - 12} hacia={[xc - 8, yTop - 10]} texto="ancho pilar" />
      <CotaV x={xc - 74} y0={yTop} y1={yBot} texto="H" />

      {/* Las dos cotas de abajo van bien separadas: encimadas no se leía cuál
          era cuál, y son justamente las que se confunden. */}
      <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5">
        <path d={`M${xc - 40} ${yBot + 22} L${xc - 40} ${yBot + 34}`} />
        <path d={`M${xc + 40} ${yBot + 22} L${xc + 40} ${yBot + 34}`} />
      </g>
      <CotaH x0={xc - 40} x1={xc + 40} y={yBot + 34} texto="s = 2,5·D" />
      <CotaH x0={xc - 62} x1={xc + 62} y={yBot + 58} texto="lado x" />

      <Referencia x={192} y={yBot + 18} hacia={[166, yBot + 12]} texto="D pilote" />
    </Croquis>
  );
}

/**
 * Armadura principal: es el tirante del modelo de bielas y tirantes, así que va
 * abajo y de pilote a pilote, no repartida en el canto.
 */
export function CroquisArmaduraPrincipalCabezal() {
  const xc = 110;
  const yTop = 34;
  const yBot = 84;
  const dx = 40;

  return (
    <Croquis
      viewBox="0 0 224 132"
      ancho="max-w-[17rem]"
      nota="La principal es el tirante que cierra las dos bielas: va en la cara inferior y tiene que anclarse pasando el eje de cada pilote."
    >
      <AlzadoCabezal xCentro={xc} yTop={yTop} yBot={yBot} semiAncho={62} dxPilote={dx} />

      {/* bielas comprimidas */}
      <path d={`M${xc} ${yTop} L${xc - dx} ${yBot}`} stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.7" />
      <path d={`M${xc} ${yTop} L${xc + dx} ${yBot}`} stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.7" />

      {/* tirante */}
      <path d={`M${xc - dx - 10} ${yBot - 8} L${xc + dx + 10} ${yBot - 8}`} stroke="currentColor" strokeWidth="2.6" />
      <text x={xc} y={yBot - 12} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
        Td
      </text>

      <Referencia x={176} y={yBot + 4} hacia={[xc + dx + 10, yBot - 8]} texto="Nº barras · φ" />
      <Referencia x={38} y={yTop + 16} hacia={[xc - dx / 2, yTop + 22]} texto="biela" />
    </Croquis>
  );
}

/**
 * Armadura secundaria: la de reparto, perpendicular al tirante. Se dimensiona
 * como un porcentaje de la principal, no por un esfuerzo propio.
 */
export function CroquisArmaduraSecundariaCabezal() {
  return (
    <Croquis
      viewBox="0 0 216 124"
      ancho="max-w-[15rem]"
      nota="Perpendicular al tirante y calculada como el 10 % de la principal realmente colocada, no de la necesaria."
    >
      {/* planta del cabezal */}
      <rect x="20" y="34" width="130" height="60" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.35" />
      {[40, 130].map((x) => (
        <circle key={x} cx={x} cy="64" r="11" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.75" />
      ))}

      {/* principal, de pilote a pilote */}
      {[54, 64, 74].map((y) => (
        <path key={y} d={`M26 ${y} L144 ${y}`} stroke="currentColor" strokeWidth="2" />
      ))}
      {/* secundaria, cruzada */}
      {[40, 62, 84, 106, 130].map((x) => (
        <path key={x} d={`M${x} 40 L${x} 88`} stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      ))}

      <Referencia x={154} y={56} hacia={[144, 54]} texto="principal" />
      <Referencia x={84} y={28} hacia={[84, 40]} texto="secundaria" anclaje="middle" />
    </Croquis>
  );
}

interface CroquisEstribosCabezalProps {
  /** Plano en que se reparten los estribos de esta tarjeta. */
  direccion: "verticales" | "horizontales";
}

/**
 * Estribos: los verticales se reparten a lo largo del cabezal y los
 * horizontales en su altura. Son dos familias distintas, con separaciones que
 * salen de dimensiones distintas.
 */
export function CroquisEstribosCabezal({ direccion }: CroquisEstribosCabezalProps) {
  const verticales = direccion === "verticales";
  const xc = 100;
  const yTop = 34;
  const yBot = 88;

  return (
    <Croquis
      viewBox="0 0 210 128"
      ancho="max-w-[15rem]"
      nota={
        verticales
          ? "Se reparten a lo largo del cabezal: la separación sale del lado x descontando los extremos."
          : "Se reparten en la altura del cabezal: la separación sale del canto H descontando los extremos."
      }
    >
      <AlzadoCabezal xCentro={xc} yTop={yTop} yBot={yBot} semiAncho={58} dxPilote={36} />

      {verticales
        ? [58, 76, 94, 112, 130].map((x) => (
            <path key={x} d={`M${x} ${yTop + 4} L${x} ${yBot - 4}`} stroke="currentColor" strokeWidth="1.5" />
          ))
        : [44, 56, 68, 80].map((y) => (
            <path key={y} d={`M${xc - 52} ${y} L${xc + 52} ${y}`} stroke="currentColor" strokeWidth="1.5" />
          ))}

      {/* La cota de los verticales va arriba del cabezal: abajo se montaba sobre
          los pilotes y no se leía. */}
      {verticales ? (
        <CotaH x0={58} x1={76} y={yTop - 12} texto="separación" />
      ) : (
        <CotaV x={xc - 68} y0={44} y1={56} texto="separación" />
      )}
    </Croquis>
  );
}
