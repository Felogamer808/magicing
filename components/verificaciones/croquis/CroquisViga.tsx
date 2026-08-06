"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";

/** Materiales: qué resistencia corresponde al hormigón y cuál al acero. */
export function CroquisMateriales() {
  return (
    <Croquis viewBox="0 0 220 96" ancho="max-w-[16rem]">
      <rect x="30" y="18" width="88" height="60" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.55" />
      {Array.from({ length: 5 }).map((_, i) => (
        <path key={i} d={`M${34 + i * 18} 78 L${52 + i * 18} 18`} stroke="currentColor" strokeWidth="0.5" opacity="0.28" />
      ))}
      {[46, 74, 102].map((x) => (
        <circle key={x} cx={x} cy="66" r="4.5" fill="currentColor" />
      ))}
      <Referencia x={128} y={34} hacia={[116, 40]} texto="fck  hormigón" />
      <Referencia x={128} y={72} hacia={[107, 66]} texto="fyk  acero" />
    </Croquis>
  );
}

/** Geometría: ancho, canto y hasta dónde llega el recubrimiento. */
export function CroquisGeometriaViga() {
  return (
    <Croquis
      viewBox="0 0 220 118"
      ancho="max-w-[16rem]"
      nota="El recubrimiento se mide desde la cara de hormigón hasta el estribo."
    >
      <rect x="62" y="26" width="86" height="70" stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.5" />
      <rect x="70" y="34" width="70" height="54" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
      <CotaH x0={62} x1={148} y={18} texto="b" />
      <CotaV x={52} y0={26} y1={96} texto="h" />
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.9">
        <path d="M156 34 L152 34" />
        <path d="M156 26 L156 34" markerEnd="url(#croquis-flecha)" />
      </g>
      <text x="160" y="32" className="fill-current font-mono" fontSize="11.5">
        recubrim.
      </text>
    </Croquis>
  );
}

interface CroquisArmaduraProps {
  /** Barras que se están cargando en la tarjeta. */
  numero: number;
  /** Cara donde va esta armadura. */
  cara: "inferior" | "superior";
}

/** Armadura de flexión: en qué cara va y qué momento la tracciona. */
export function CroquisArmaduraFlexion({ numero, cara }: CroquisArmaduraProps) {
  const inferior = cara === "inferior";
  const yBarras = inferior ? 88 : 34;

  // El dibujo es esquemático y satura a ocho puntos para que se sigan
  // distinguiendo, pero el rótulo siempre dice la cantidad real cargada.
  const nReal = Math.max(0, Math.round(numero) || 0);
  const n = Math.max(1, Math.min(nReal || 1, 8));
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? 105 : 74 + (i * 62) / (n - 1)));

  return (
    <Croquis
      viewBox="0 0 220 124"
      ancho="max-w-[16rem]"
      nota={
        inferior
          ? "El momento positivo tracciona la cara inferior: la armadura va abajo."
          : "El momento negativo tracciona la cara superior: la armadura va arriba."
      }
    >
      <rect x="62" y="26" width="86" height="70" stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.5" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={yBarras} r="4.5" fill="currentColor" />
      ))}

      {/* Curva del momento que tracciona esa cara */}
      <path
        d={inferior ? "M28 108 Q105 122 182 108" : "M28 16 Q105 2 182 16"}
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.75"
      />
      <text
        x="105"
        y={inferior ? 120 : 12}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="9.5"
      >
        {inferior ? "Mmax+" : "Mmax−"}
      </text>

      <Referencia
        x={156}
        y={yBarras + 4}
        hacia={[xs[xs.length - 1] + 6, yBarras]}
        texto={`${nReal} barras`}
      />
    </Croquis>
  );
}

interface CroquisRamasProps {
  /** Ramas del estribo que atraviesan la sección. */
  ramas: number;
}

/**
 * Ramas del estribo. Es el dato que más se malinterpreta del formulario: no son
 * los estribos que se colocan a lo largo de la viga, sino las patas verticales
 * que cortan la sección en un mismo plano.
 */
export function CroquisRamasEstribo({ ramas }: CroquisRamasProps) {
  // Igual que en la armadura: el dibujo satura, el rótulo no miente.
  const nReal = Math.max(0, Math.round(ramas) || 0);
  const n = Math.max(1, Math.min(nReal || 1, 10));
  const x0 = 62;
  const x1 = 148;
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? (x0 + x1) / 2 : x0 + 8 + (i * (x1 - x0 - 16)) / (n - 1)));

  return (
    <Croquis
      viewBox="0 0 220 122"
      ancho="max-w-[16rem]"
      nota="Las ramas son las patas verticales que cruzan la sección, no los estribos repartidos a lo largo de la viga."
    >
      <rect x={x0} y="24" width={x1 - x0} height="72" stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.5" />

      {xs.map((x, i) => (
        <path key={i} d={`M${x} 32 L${x} 88`} stroke="currentColor" strokeWidth="1.8" />
      ))}

      <text x={(x0 + x1) / 2} y="112" textAnchor="middle" className="fill-current font-mono" fontSize="11.5">
        {nReal} {nReal === 1 ? "rama" : "ramas"}
      </text>

      {/* Cortante que toman esas ramas */}
      <g stroke="currentColor" strokeWidth="1.4">
        <path d="M40 60 L26 60" markerEnd="url(#croquis-flecha)" />
      </g>
      <text x="30" y="52" className="fill-current font-mono" fontSize="11.5">
        Vd
      </text>
    </Croquis>
  );
}
