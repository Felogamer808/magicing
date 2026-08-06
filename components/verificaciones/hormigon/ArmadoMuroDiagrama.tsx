"use client";

import type { CaraTraccionada } from "@/lib/calc/ec2/muro-contencion";

/**
 * Disposición de la armadura principal en el muro.
 *
 * Lo que el dibujo fija es de qué cara va cada barra, que es donde más se
 * equivoca uno: el hastial se arma en la cara interior —la que mira al
 * terreno—, el talón arriba y la puntera abajo. Si alguna se coloca en la cara
 * contraria queda del lado comprimido y no trabaja.
 */

interface Pieza {
  nombre: string;
  cara: CaraTraccionada;
  diametroMm: number;
  separacionMm: number;
  verifica: boolean;
}

interface Props {
  alturaMuroM: number;
  espesorMuroM: number;
  anchoZapataM: number;
  cantoZapataM: number;
  punteraM: number;
  recubrimientoM: number;
  hastial: Pieza;
  talon: Pieza;
  puntera: Pieza | null;
}

const ANCHO = 420;
const ALTO = 260;
const Y_BASE = ALTO - 46;

const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

const rotulo = (p: Pieza) => `⌀${p.diametroMm} c/${fmt(p.separacionMm)} mm`;

export function ArmadoMuroDiagrama({
  alturaMuroM, espesorMuroM, anchoZapataM, cantoZapataM, punteraM, recubrimientoM,
  hastial, talon, puntera,
}: Props) {
  const alturaTotalM = alturaMuroM + cantoZapataM;
  const escala = Math.min(160 / alturaTotalM, 150 / anchoZapataM);
  const px = (m: number) => m * escala;

  const xZapata = 92;
  const xMuro = xZapata + px(punteraM);
  const yTopZapata = Y_BASE - px(cantoZapataM);
  const yCoronacion = Y_BASE - px(alturaTotalM);
  const rec = px(recubrimientoM);
  const talonM = Math.max(anchoZapataM - punteraM - espesorMuroM, 0);

  const color = (p: Pieza) => (p.verifica ? "stroke-primary" : "stroke-destructive");

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Armado: hastial ${rotulo(hastial)}, talón ${rotulo(talon)}${puntera ? `, puntera ${rotulo(puntera)}` : ""}`}>
        {/* Contorno de la pieza. */}
        <rect x={xZapata} y={yTopZapata} width={px(anchoZapataM)} height={px(cantoZapataM)}
              className="fill-primary/5 stroke-foreground/60" strokeWidth={1.3} />
        <rect x={xMuro} y={yCoronacion} width={px(espesorMuroM)} height={px(alturaMuroM)}
              className="fill-primary/5 stroke-foreground/60" strokeWidth={1.3} />

        {/* Terreno retenido, para orientar cuál es la cara interior. */}
        <line x1={xMuro + px(espesorMuroM)} y1={yCoronacion} x2={ANCHO - 8} y2={yCoronacion}
              className="stroke-foreground/25" strokeWidth={1} />
        <text x={ANCHO - 8} y={yCoronacion - 5} textAnchor="end"
              className="fill-muted-foreground text-[9px]">terreno</text>

        {/*
          Hastial: la armadura va contra la cara del trasdós, que es la que se
          tracciona, y se ancla doblando dentro de la zapata.
        */}
        <path
          d={`M${xMuro + px(espesorMuroM) - rec} ${yCoronacion + rec}
              L${xMuro + px(espesorMuroM) - rec} ${Y_BASE - rec}
              L${xMuro + px(espesorMuroM) + px(talonM) * 0.55} ${Y_BASE - rec}`}
          fill="none" className={color(hastial)} strokeWidth={2.2} strokeLinejoin="round" />
        <text x={xMuro + px(espesorMuroM) + 6} y={(yCoronacion + yTopZapata) / 2}
              className={hastial.verifica ? "fill-primary text-[9px]" : "fill-destructive text-[9px] font-medium"}>
          hastial {rotulo(hastial)}
        </text>

        {/* Talón: armadura en la cara superior de la zapata. */}
        <line x1={xMuro} y1={yTopZapata + rec}
              x2={xZapata + px(anchoZapataM) - rec} y2={yTopZapata + rec}
              className={color(talon)} strokeWidth={2.2} />
        <text x={xZapata + px(anchoZapataM) + 6} y={yTopZapata + rec + 3}
              className={talon.verifica ? "fill-primary text-[9px]" : "fill-destructive text-[9px] font-medium"}>
          talón {rotulo(talon)}
        </text>

        {/* Puntera: armadura en la cara inferior, solo si hay vuelo. */}
        {puntera && punteraM > 0 && (
          <>
            <line x1={xZapata + rec} y1={Y_BASE - rec}
                  x2={xMuro + px(espesorMuroM)} y2={Y_BASE - rec}
                  className={color(puntera)} strokeWidth={2.2} />
            <text x={xZapata - 6} y={Y_BASE + 16} textAnchor="start"
                  className={puntera.verifica ? "fill-primary text-[9px]" : "fill-destructive text-[9px] font-medium"}>
              puntera {rotulo(puntera)}
            </text>
          </>
        )}

        {/* Leyenda de caras, que es lo que el dibujo viene a fijar. */}
        <text x={8} y={16} className="fill-muted-foreground text-[9px]">
          hastial: cara interior · talón: arriba · puntera: abajo
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Trazos en rojo: la armadura elegida no llega. Las barras se dibujan sobre la cara
        traccionada de cada pieza; puestas en la contraria quedarían del lado comprimido.
      </figcaption>
    </figure>
  );
}
