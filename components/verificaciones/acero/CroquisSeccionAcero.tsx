import { propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

/**
 * Croquis a escala de la sección elegida, con sus cotas principales.
 *
 * Dibuja la geometría real —no un ícono— porque la diferencia entre las tres
 * variantes de PNC está justamente en la forma: dos canales soldados por las
 * almas y los mismos dos en cajón tienen idéntico `Ix` y se ven distintos solo
 * acá.
 *
 * Todo se resuelve en milímetros dentro de un viewBox que se ajusta a la pieza,
 * así que el dibujo mantiene proporciones entre familias.
 */

interface Props {
  familia: Familia;
  params: ParametrosPerfil;
}

/*
 * El perfil se pinta con la gramática de material y no con el color de texto:
 * así el acero se ve igual acá, en una sección mixta y en una conexión. El
 * relleno es opaco porque el metal no es translúcido, y además deja que los
 * ejes baricéntricos se dibujen por encima sin competir con el contorno.
 */
const RELLENO = "var(--mat-acero)";
const OPACIDAD = 1;
const BORDE = "var(--mat-acero-borde)";

/** Perfil I: dos alas y un alma, centrado en el origen. */
function caminoPerfilI(h: number, b: number, tw: number, tf: number) {
  const x = b / 2;
  const y = h / 2;
  const w = tw / 2;
  const yi = y - tf;
  return `M${-x} ${-y} H${x} V${-yi} H${w} V${yi} H${x} V${y} H${-x} V${yi} H${-w} V${-yi} H${-x} Z`;
}

/** Canal en U con el alma a la izquierda y las alas hacia +x. */
function caminoCanal(h: number, b: number, tw: number, tf: number, x0: number) {
  const y = h / 2;
  const yi = y - tf;
  return `M${x0} ${-y} H${x0 + b} V${-yi} H${x0 + tw} V${yi} H${x0 + b} V${y} H${x0} Z`;
}

export function CroquisSeccionAcero({ familia, params }: Props) {
  let p;
  try {
    p = propiedades(familia, params);
  } catch {
    // Parámetros incompletos o inválidos: la página ya avisa, acá no se dibuja.
    return null;
  }

  const h = p.hM * 1000;
  const b = p.bM * 1000;
  const tw = p.twM * 1000;
  const tf = p.tfM * 1000;

  const margen = Math.max(h, b) * 0.28;
  const ancho = b + 2 * margen;
  const alto = h + 2 * margen;

  let figura: React.ReactNode;
  let cotas: string;

  switch (familia) {
    case "tubo-redondo": {
      const r = h / 2;
      const ri = r - tw;
      figura = (
        <>
          <circle cx={0} cy={0} r={r} fill={RELLENO} fillOpacity={OPACIDAD} stroke="none" />
          <circle cx={0} cy={0} r={ri} fill="var(--card, #fff)" stroke="none" />
          <circle cx={0} cy={0} r={r} fill="none" stroke={BORDE} strokeWidth={Math.max(h / 140, 0.6)} />
          <circle cx={0} cy={0} r={ri} fill="none" stroke={BORDE} strokeWidth={Math.max(h / 140, 0.6)} />
        </>
      );
      cotas = `Ø ${fmtMm(h)} · e ${fmtMm(tw)}`;
      break;
    }

    case "tubo-rectangular": {
      const x = b / 2;
      const y = h / 2;
      figura = (
        <>
          <rect x={-x} y={-y} width={b} height={h} fill={RELLENO} fillOpacity={OPACIDAD} stroke="none" />
          <rect
            x={-x + tw}
            y={-y + tw}
            width={b - 2 * tw}
            height={h - 2 * tw}
            fill="var(--card, #fff)"
            stroke="none"
          />
          <rect x={-x} y={-y} width={b} height={h} fill="none" stroke={BORDE} strokeWidth={Math.max(h / 140, 0.6)} />
          <rect
            x={-x + tw}
            y={-y + tw}
            width={b - 2 * tw}
            height={h - 2 * tw}
            fill="none"
            stroke={BORDE}
            strokeWidth={Math.max(h / 140, 0.6)}
          />
        </>
      );
      cotas = `${fmtMm(h)} × ${fmtMm(b)} · e ${fmtMm(tw)}`;
      break;
    }

    case "PNC": {
      figura = (
        <path
          d={caminoCanal(h, b, tw, tf, -b / 2)}
          fill={RELLENO}
          fillOpacity={OPACIDAD}
          stroke={BORDE}
          strokeWidth={Math.max(h / 140, 0.6)}
          strokeLinejoin="round"
        />
      );
      cotas = `h ${fmtMm(h)} · b ${fmtMm(b)}`;
      break;
    }

    case "2PNC-almas": {
      // Almas adosadas en el centro, alas hacia afuera: se dibuja un canal y su
      // espejo. La separación entre dorsos queda como hueco central.
      const sep = (params.separacion ?? 0) / 1;
      const bs = (b - sep) / 2;
      figura = (
        <>
          <path
            d={caminoCanal(h, bs, tw, tf, sep / 2)}
            fill={RELLENO}
            fillOpacity={OPACIDAD}
            stroke={BORDE}
            strokeWidth={Math.max(h / 140, 0.6)}
            strokeLinejoin="round"
          />
          <g transform="scale(-1,1)">
            <path
              d={caminoCanal(h, bs, tw, tf, sep / 2)}
              fill={RELLENO}
              fillOpacity={OPACIDAD}
              stroke={BORDE}
              strokeWidth={Math.max(h / 140, 0.6)}
              strokeLinejoin="round"
            />
          </g>
        </>
      );
      cotas = sep ? `h ${fmtMm(h)} · sep. ${fmtMm(sep)}` : `h ${fmtMm(h)} · en contacto`;
      break;
    }

    case "2PNC-cajon": {
      // Alas enfrentadas y soldadas en el centro: las almas quedan afuera.
      const bs = b / 2;
      const canal = caminoCanal(h, bs, tw, tf, -b / 2);
      figura = (
        <>
          <path
            d={canal}
            fill={RELLENO}
            fillOpacity={OPACIDAD}
            stroke={BORDE}
            strokeWidth={Math.max(h / 140, 0.6)}
            strokeLinejoin="round"
          />
          <g transform="scale(-1,1)">
            <path
              d={canal}
              fill={RELLENO}
              fillOpacity={OPACIDAD}
              stroke={BORDE}
              strokeWidth={Math.max(h / 140, 0.6)}
              strokeLinejoin="round"
            />
          </g>
          {/* Cordones de soldadura donde se encuentran las puntas de las alas. */}
          <circle cx={0} cy={-h / 2 + tf / 2} r={Math.max(tf / 2, 1)} fill={BORDE} opacity={0.9} />
          <circle cx={0} cy={h / 2 - tf / 2} r={Math.max(tf / 2, 1)} fill={BORDE} opacity={0.9} />
        </>
      );
      cotas = `h ${fmtMm(h)} · cajón ${fmtMm(b)} de ancho`;
      break;
    }

    default: {
      figura = (
        <path
          d={caminoPerfilI(h, b, tw, tf)}
          fill={RELLENO}
          fillOpacity={OPACIDAD}
          stroke={BORDE}
          strokeWidth={Math.max(h / 140, 0.6)}
          strokeLinejoin="round"
        />
      );
      cotas = `h ${fmtMm(h)} · b ${fmtMm(b)}`;
      break;
    }
  }

  const trazoEje = Math.max(h / 200, 0.4);

  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg
        viewBox={`${-ancho / 2} ${-alto / 2} ${ancho} ${alto}`}
        className="h-40 w-full text-primary"
        role="img"
        aria-label={`Sección ${cotas}`}
      >
        {/* Ejes baricéntricos: x el fuerte, y el débil. */}
        <g
          stroke="var(--mat-cota)"
          strokeWidth={trazoEje}
          strokeDasharray={`${h / 30} ${h / 45}`}
          opacity={0.8}
        >
          <line x1={-ancho / 2 + 2} y1={0} x2={ancho / 2 - 2} y2={0} />
          <line x1={0} y1={-alto / 2 + 2} x2={0} y2={alto / 2 - 2} />
        </g>
        {figura}
        {/*
          Los ejes van rotulados porque el croquis decía dónde estaban pero no
          cuál era cuál, y confundir el fuerte con el débil es el error que más
          caro sale en flexión.
        */}
        <g fill="var(--mat-cota)" fontSize={Math.max(h / 13, 7)} className="font-mono">
          <text x={ancho / 2 - 2} y={-h / 26} textAnchor="end">x</text>
          <text x={h / 26} y={-alto / 2 + Math.max(h / 11, 8)}>y</text>
        </g>
        {/* Baricentro: el punto respecto del que se miden Ix e Iy. */}
        <circle cx={0} cy={0} r={Math.max(h / 70, 1.1)} fill="var(--mat-cota)" />
      </svg>
      <figcaption className="font-mono text-[12.5px] text-muted-foreground tabular-nums">
        {cotas}
      </figcaption>
    </figure>
  );
}

function fmtMm(v: number) {
  const redondeado = Math.round(v * 10) / 10;
  return `${String(redondeado).replace(".", ",")} mm`;
}
