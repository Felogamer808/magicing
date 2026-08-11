"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaMensulaModeloProps {
  acM: number;
  hcM: number;
  h1M: number;
  hcolM: number;
  apM: number;
  vueloTotalM: number;
  zM: number;
  yTiranteM: number;
  thetaGrados: number;
  d0M: number;
  d0MinM: number;
  fEdKN: number;
  hEdKN: number;
  traccionTiranteKN: number;
  compresionBielaKN: number;
  esMensulaCorta: boolean;
  tanEnRango: boolean;
}

/**
 * La ménsula de frente con el modelo de bielas y tirantes encima: el tirante
 * horizontal arriba, la biela que baja de la placa a la cara del pilar, y las
 * cotas que deciden si el modelo aplica —a_c contra z— y si hay degollamiento
 * —d₀ contra d/2—.
 *
 * Va a escala real: la ménsula es un elemento compacto y deformarla escondería
 * justamente lo que se está mirando, que es la pendiente del intradós y lo
 * tendida o parada que queda la biela.
 */
export function DiagramaMensulaModelo({
  acM,
  hcM,
  h1M,
  hcolM,
  apM,
  vueloTotalM,
  zM,
  yTiranteM,
  thetaGrados,
  d0M,
  d0MinM,
  fEdKN,
  hEdKN,
  traccionTiranteKN,
  compresionBielaKN,
  esMensulaCorta,
  tanEnRango,
}: DiagramaMensulaModeloProps) {
  const anchoRealM = hcolM + vueloTotalM;
  const W = 300;
  const escala = W / anchoRealM;
  // Margen izquierdo para la cota de z y el rótulo del pilar; el derecho aloja
  // la cota de d.
  const x0 = 54;
  const y0 = 78;

  const X = (m: number) => x0 + m * escala;
  const Y = (m: number) => y0 + m * escala;

  const yBase = Y(hcM);
  const xCaraPilar = X(hcolM);
  const xCarga = X(hcolM + acM);
  const anchoPlacaPx = Math.max(apM * escala, 14);
  const espesorPlaca = 9;

  // El pilar se dibuja pasado de largo por arriba y por abajo: la ménsula no es
  // una pieza suelta y el nudo sólo se entiende con el pilar continuo.
  const yPilarSup = y0 - 34;
  const yPilarInf = yBase + 46;

  const yTirante = Y(yTiranteM);
  const yNudoInferior = Y(yTiranteM + zM);
  const xTiranteIzq = X(0.03);
  const xTiranteDer = X(hcolM + acM + apM / 2);

  const yCotaAc = yPilarInf + 22;
  const alto = yCotaAc + 62;

  return (
    <svg
      viewBox={`0 0 ${W + x0 + 62} ${alto}`}
      className="h-auto w-full text-primary"
      fill="none"
      aria-hidden="true"
    >
      {/* pilar, pasado de largo arriba y abajo */}
      <rect
        x={X(0)}
        y={yPilarSup}
        width={hcolM * escala}
        height={yPilarInf - yPilarSup}
        stroke="currentColor"
        strokeWidth="2.2"
        fill="var(--color-muted)"
        fillOpacity="0.35"
      />

      {/* ménsula: cara superior horizontal, borde exterior h₁ e intradós inclinado */}
      <path
        d={`M${xCaraPilar} ${y0} L${X(hcolM + vueloTotalM)} ${y0} L${X(
          hcolM + vueloTotalM
        )} ${Y(h1M)} L${xCaraPilar} ${yBase} Z`}
        stroke="currentColor"
        strokeWidth="2.2"
        fill="var(--color-muted)"
        fillOpacity="0.35"
      />

      {/* placa de apoyo y cargas */}
      <rect
        x={xCarga - anchoPlacaPx / 2}
        y={y0 - espesorPlaca}
        width={anchoPlacaPx}
        height={espesorPlaca}
        stroke="currentColor"
        strokeWidth="1.6"
        fill="var(--color-muted)"
        fillOpacity="0.7"
      />
      <path
        d={`M${xCarga} ${y0 - 48} L${xCarga} ${y0 - espesorPlaca - 3}`}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d={`M${xCarga - 4} ${y0 - espesorPlaca - 10} L${xCarga} ${
          y0 - espesorPlaca - 3
        } L${xCarga + 4} ${y0 - espesorPlaca - 10}`}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <text
        x={xCarga}
        y={y0 - 54}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="11"
      >
        F = {fmt(fEdKN, 0)} kN
      </text>
      <path
        d={`M${xCarga + 30} ${y0 - espesorPlaca / 2} L${xCarga + 6} ${
          y0 - espesorPlaca / 2
        }`}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d={`M${xCarga + 13} ${y0 - espesorPlaca / 2 - 4} L${xCarga + 6} ${
          y0 - espesorPlaca / 2
        } L${xCarga + 13} ${y0 - espesorPlaca / 2 + 4}`}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <text
        x={xCarga + 34}
        y={y0 - espesorPlaca / 2 + 4}
        className="fill-current font-mono"
        fontSize="10"
      >
        H = {fmt(hEdKN, 0)}
      </text>

      {/* biela comprimida */}
      <path
        d={`M${xCarga} ${yTirante} L${xCaraPilar} ${yNudoInferior}`}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray="6 4"
        opacity="0.85"
      />
      <text
        x={(xCarga + xCaraPilar) / 2 + 12}
        y={(yTirante + yNudoInferior) / 2 + 12}
        className="fill-current font-mono"
        fontSize="10"
      >
        θ = {fmt(thetaGrados, 1)}°
      </text>
      <text
        x={(xCarga + xCaraPilar) / 2 + 12}
        y={(yTirante + yNudoInferior) / 2 + 24}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.8"
      >
        C = {fmt(compresionBielaKN, 0)} kN
      </text>

      {/* tirante */}
      <path
        d={`M${xTiranteIzq} ${yTirante} L${xTiranteDer} ${yTirante}`}
        stroke="currentColor"
        strokeWidth="3.4"
      />
      <text
        x={xTiranteDer}
        y={yTirante - 7}
        textAnchor="end"
        className="fill-current font-mono"
        fontSize="11"
      >
        T = {fmt(traccionTiranteKN, 0)} kN
      </text>

      {/* cota z, del tirante al nudo inferior */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <path d={`M${x0 - 20} ${yTirante} L${x0 - 20} ${yNudoInferior}`} />
        <path d={`M${x0 - 26} ${yTirante} L${x0 - 14} ${yTirante}`} />
        <path d={`M${x0 - 26} ${yNudoInferior} L${x0 - 14} ${yNudoInferior}`} />
      </g>
      <text
        x={x0 - 30}
        y={(yTirante + yNudoInferior) / 2 + 4}
        textAnchor="end"
        className="fill-current font-mono"
        fontSize="10"
      >
        z
      </text>

      {/* cota d, del borde superior al tirante */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <path
          d={`M${X(hcolM + vueloTotalM) + 22} ${yTirante} L${
            X(hcolM + vueloTotalM) + 22
          } ${yBase}`}
        />
        <path
          d={`M${X(hcolM + vueloTotalM) + 16} ${yTirante} L${
            X(hcolM + vueloTotalM) + 28
          } ${yTirante}`}
        />
        <path
          d={`M${X(hcolM + vueloTotalM) + 16} ${yBase} L${
            X(hcolM + vueloTotalM) + 28
          } ${yBase}`}
        />
      </g>
      <text
        x={X(hcolM + vueloTotalM) + 32}
        y={(yTirante + yBase) / 2 + 4}
        className="fill-current font-mono"
        fontSize="10"
      >
        d
      </text>

      {/* cota a_c, del paramento del pilar al eje de la carga */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <path d={`M${xCaraPilar} ${yCotaAc} L${xCarga} ${yCotaAc}`} />
        <path d={`M${xCaraPilar} ${yCotaAc - 6} L${xCaraPilar} ${yCotaAc + 6}`} />
        <path d={`M${xCarga} ${yCotaAc - 6} L${xCarga} ${yCotaAc + 6}`} />
      </g>
      <text
        x={(xCaraPilar + xCarga) / 2}
        y={yCotaAc + 19}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="11"
      >
        a꜀ = {fmt(acM)} m
      </text>

      {/* veredictos */}
      <text x={X(0)} y={yCotaAc + 36} className="fill-current font-mono" fontSize="10">
        {esMensulaCorta
          ? `a꜀ = ${fmt(acM)} < z = ${fmt(zM)} m — es ménsula corta`
          : `a꜀ = ${fmt(acM)} ≥ z = ${fmt(zM)} m — NO es ménsula corta`}
      </text>
      <text
        x={X(0)}
        y={yCotaAc + 48}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.85"
      >
        {tanEnRango
          ? `tg θ = ${fmt(zM / acM)} dentro de 1,0–2,5 (§J.3(1))`
          : `tg θ = ${fmt(zM / acM)} FUERA de 1,0–2,5 (§J.3(1))`}
      </text>
      <text
        x={X(0)}
        y={yCotaAc + 60}
        className="fill-current font-mono"
        fontSize="10"
        opacity="0.85"
      >
        d₀ = {fmt(d0M)} m {d0M >= d0MinM ? "≥" : "<"} d/2 = {fmt(d0MinM)} m
      </text>
    </svg>
  );
}
