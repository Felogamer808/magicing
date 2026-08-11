"use client";

import { CotaH, CotaV, Croquis, Referencia } from "./Croquis";

/** Terreno rayado sobre una línea horizontal, del lado activo. */
function LineaTerreno({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const n = Math.max(2, Math.floor((x1 - x0) / 9));
  return (
    <g stroke="currentColor" strokeWidth="0.7" opacity="0.5">
      <path d={`M${x0} ${y} L${x1} ${y}`} strokeWidth="1" />
      {Array.from({ length: n }).map((_, i) => (
        <path key={i} d={`M${x0 + i * 9 + 4} ${y} L${x0 + i * 9} ${y - 5}`} />
      ))}
    </g>
  );
}

/** Triángulo de empuje activo apoyado en la cara trasera del alzado. */
function DiagramaEmpuje({
  x,
  yTop,
  yBase,
  ancho = 22,
}: {
  x: number;
  yTop: number;
  yBase: number;
  ancho?: number;
}) {
  const n = 3;
  return (
    <g>
      <path
        d={`M${x} ${yTop} L${x + ancho} ${yBase} L${x} ${yBase} Z`}
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.8"
      />
      {Array.from({ length: n }).map((_, i) => {
        const t = (i + 1) / (n + 1);
        const y = yTop + t * (yBase - yTop);
        return (
          <path
            key={i}
            d={`M${x + ancho * t} ${y} L${x + 2} ${y}`}
            stroke="currentColor"
            strokeWidth="0.9"
            markerEnd="url(#croquis-flecha)"
            opacity="0.85"
          />
        );
      })}
    </g>
  );
}

/**
 * Apoyo horizontal: la reacción que el contrapiso o la losa le dan al muro.
 * El rótulo va arriba de la flecha y no a su izquierda, porque a la izquierda
 * van las cotas y se pisaban.
 */
function Apoyo({ x, y, texto }: { x: number; y: number; texto: string }) {
  return (
    <g>
      <path
        d={`M${x - 18} ${y} L${x - 2} ${y}`}
        stroke="currentColor"
        strokeWidth="1.6"
        markerEnd="url(#croquis-flecha)"
      />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${x - 22} ${y - 5 + i * 5} L${x - 18} ${y - 1 + i * 5}`}
          stroke="currentColor"
          strokeWidth="0.7"
          opacity="0.6"
        />
      ))}
      <path d={`M${x - 22} ${y - 6} L${x - 22} ${y + 6}`} stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <text x={x - 4} y={y - 8} textAnchor="end" className="fill-current font-mono" fontSize="8.5">
        {texto}
      </text>
    </g>
  );
}

/**
 * Geometría del muro: qué mide cada dimensión de la sección y de dónde a dónde
 * llegan las alturas de suelo, que es lo que más se confunde — el alzado y el
 * relleno no tienen por qué medir lo mismo.
 */
export function CroquisGeometriaMuro() {
  const xMuro = 74;
  const anchoMuro = 12;
  const xZapIzq = 52;
  const anchoZap = 62;
  const yTop = 22;
  const yBaseMuro = 96;
  const cantoZap = 12;
  const yBase = yBaseMuro + cantoZap;

  return (
    <Croquis
      viewBox="0 0 230 138"
      ancho="max-w-[17rem]"
      nota="El suelo activo empuja del lado del relleno y el pasivo colabora del lado opuesto. Sus alturas se miden desde la base de la zapata y no tienen por qué llegar a la coronación."
    >
      <LineaTerreno x0={xMuro + anchoMuro} x1={178} y={yTop + 6} />
      <DiagramaEmpuje x={xMuro + anchoMuro} yTop={yTop + 6} yBase={yBase} />

      {/* alzado y zapata */}
      <rect x={xMuro} y={yTop} width={anchoMuro} height={yBaseMuro - yTop} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.5" />
      <rect x={xZapIzq} y={yBaseMuro} width={anchoZap} height={cantoZap} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.5" />

      <CotaV x={42} y0={yTop} y1={yBaseMuro} texto="alt. muro" />
      <CotaH x0={xZapIzq} x1={xZapIzq + anchoZap} y={yBase + 16} texto="ancho zapata" />
      <CotaH x0={xMuro} x1={xMuro + anchoMuro} y={yTop - 8} texto="esp." />
      <Referencia x={122} y={yBaseMuro + 9} hacia={[114, yBaseMuro + 6]} texto="canto zap." />
      {/* Cota, no referencia: h activo es una altura y se mide desde la base. */}
      <CotaV x={192} y0={yTop + 6} y1={yBase} texto="h activo" />
      <path
        d={`M178 ${yBase} L192 ${yBase}`}
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="2 2"
        opacity="0.45"
      />
    </Croquis>
  );
}

/**
 * Posición de los apoyos, que es el dato más opaco del formulario: las
 * etiquetas dicen sólo "L1" y "L2" sin decir desde dónde se miden ni cuál es
 * cuál. Los dos casos se dibujan juntos porque L1 no significa lo mismo en uno
 * que en otro.
 */
const APOYOS_Y_TOP = 20;
const APOYOS_Y_BASE = 108;
const APOYOS_CANTO_ZAP = 10;
const APOYOS_Y_BASE_MURO = APOYOS_Y_BASE - APOYOS_CANTO_ZAP;
const APOYOS_ANCHO_MURO = 10;

/** Un muro chico, con sus apoyos, para dibujar cada caso al lado del otro. */
function CasoApuntalado({
  x,
  titulo,
  apoyos,
}: {
  x: number;
  titulo: string;
  apoyos: { y: number; texto: string }[];
}) {
  return (
    <g>
      <text x={x + 6} y={12} textAnchor="middle" className="fill-current font-mono" fontSize="10.5" opacity="0.75">
        {titulo}
      </text>
      <LineaTerreno x0={x + APOYOS_ANCHO_MURO} x1={x + 40} y={APOYOS_Y_TOP} />
      <DiagramaEmpuje x={x + APOYOS_ANCHO_MURO} yTop={APOYOS_Y_TOP} yBase={APOYOS_Y_BASE} ancho={16} />
      <rect x={x} y={APOYOS_Y_TOP} width={APOYOS_ANCHO_MURO} height={APOYOS_Y_BASE_MURO - APOYOS_Y_TOP} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.5" />
      <rect x={x - 14} y={APOYOS_Y_BASE_MURO} width={38} height={APOYOS_CANTO_ZAP} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.5" />
      {apoyos.map((a) => (
        <Apoyo key={a.texto} x={x} y={a.y} texto={a.texto} />
      ))}
    </g>
  );
}

export function CroquisApoyosMuro() {
  const yBase = APOYOS_Y_BASE;

  const xCaso2 = 62;
  const xCaso3 = 176;

  // Caso 2: un solo apuntalamiento, el contrapiso.
  const yContrapiso2 = yBase - 46;
  // Caso 3: contrapiso abajo y losa arriba.
  const yContrapiso3 = yBase - 26;
  const yLosa3 = yBase - 78;

  return (
    <Croquis
      viewBox="0 0 262 152"
      ancho="max-w-[21rem]"
      nota="Las tres distancias se miden desde la base de la zapata, el mismo nivel respecto del cual se toma el momento de vuelco. Ojo: L1 no significa lo mismo en los dos casos, y en el caso 3 L2 no es una altura sino la separación entre los dos apoyos."
    >
      {/* Línea de base común, para que se lea que las cotas arrancan del mismo
          nivel en los dos casos. Va primero para que quede por detrás. */}
      <path
        d={`M18 ${yBase} L250 ${yBase}`}
        stroke="currentColor"
        strokeWidth="0.6"
        strokeDasharray="3 3"
        opacity="0.4"
      />

      <CasoApuntalado x={xCaso2} titulo="Caso 2" apoyos={[{ y: yContrapiso2, texto: "contrapiso" }]} />
      <CotaV x={30} y0={yContrapiso2} y1={yBase} texto="L1" />

      <CasoApuntalado
        x={xCaso3}
        titulo="Caso 3"
        apoyos={[
          { y: yLosa3, texto: "losa" },
          { y: yContrapiso3, texto: "contrapiso" },
        ]}
      />
      <CotaV x={144} y0={yContrapiso3} y1={yBase} texto="L1" />
      {/* L2 va del lado del relleno para no pisar la cota de L1. */}
      <CotaV x={240} y0={yLosa3} y1={yContrapiso3} texto="L2" />
      <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.45">
        <path d={`M${xCaso3} ${yLosa3} L240 ${yLosa3}`} />
        <path d={`M${xCaso3} ${yContrapiso3} L240 ${yContrapiso3}`} />
      </g>
    </Croquis>
  );
}

/** Suelo: qué significa cada parámetro geotécnico sobre el propio empuje. */
/**
 * Qué hace cada parámetro del suelo, sobre el muro.
 *
 * El croquis tiene que mostrar los tres datos actuando donde actúan: γ y φ arman
 * el empuje del trasdós, y φ vuelve a aparecer —reducido— en el rozamiento de la
 * base, junto con la cohesión. Que φ intervenga dos veces es lo que lo hace el
 * dato más sensible del cálculo, y por eso se rotula en los dos lugares.
 */
export function CroquisSueloMuro() {
  return (
    <Croquis
      /* El encuadre arranca en 56 y no en 0: el dibujo vive entre 62 y 214, y
         dejar el origen en cero metía 60 px de aire muerto a la izquierda que
         achicaban todo lo demás. */
      viewBox="56 0 166 138"
      ancho="max-w-[19rem]"
      nota="φ interviene dos veces: arma el empuje del trasdós y da el rozamiento de la base. La cohesión sólo colabora abajo, y va a la mitad."
    >
      {/* sobrecargas repartidas sobre el terreno */}
      {[104, 124, 144, 164].map((x) => (
        <path
          key={x}
          d={`M${x} 8 L${x} 22`}
          stroke="currentColor"
          strokeWidth="1"
          markerEnd="url(#croquis-flecha)"
          opacity="0.85"
        />
      ))}
      <text x={172} y={15} className="fill-current font-mono" fontSize="10">
        qg + qq
      </text>

      <LineaTerreno x0={96} x1={182} y={26} />

      {/* alzado y zapata */}
      <rect x="84" y="26" width="12" height="62" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.5" />
      <rect x="62" y="88" width="56" height="10" stroke="currentColor" strokeWidth="1.5" fill="var(--color-muted)" fillOpacity="0.5" />

      <DiagramaEmpuje x={96} yTop={26} yBase={98} />

      {/*
        El empuje se rotula a la derecha del triángulo, a media altura, para que
        la línea de referencia no cruce las flechas.
      */}
      <Referencia x={150} y={58} hacia={[122, 62]} texto="γ · ka · z" />
      <text x={150} y={72} className="fill-current font-mono" fontSize="8.5" opacity="0.7">
        ka según φ
      </text>

      {/*
        Rozamiento en la base. Va por debajo de la zapata y con la fórmula
        completa: es el término que más cambió respecto de lo que se solía
        escribir, y ponerlo mal acá induce a error al leer el resultado.
      */}
      <path d="M62 106 L118 106" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 2" opacity="0.6" />
      <path d="M68 106 L104 106" stroke="currentColor" strokeWidth="1.3" markerEnd="url(#croquis-flecha)" />
      <text x={62} y={122} className="fill-current font-mono" fontSize="9.5">
        N · tg φ + c* · A
      </text>
      <text x={62} y={131} className="fill-current font-mono" fontSize="8" opacity="0.7">
        c* = mín(0,5·c ; 50 kPa)
      </text>
    </Croquis>
  );
}
