"use client";

import { fmt } from "@/lib/verificaciones/formato";

/** Los campos de geometría que tienen su cota en el croquis; cada uno se resalta con su foco. */
export const CAMPOS_GEOMETRIA_APEO = [
  "h", "b", "luz", "voladizo", "extremoLibre", "extremoLejano",
  "cargaAncho", "cargaProf", "apoyoCAncho", "apoyoCProf",
  "apoyoLAncho", "apoyoLProf", "elemLAncho", "elemLProf",
] as const;
export type CampoGeometriaApeo = (typeof CAMPOS_GEOMETRIA_APEO)[number];

export const esCampoGeometriaApeo = (id: string | null): id is CampoGeometriaApeo =>
  id !== null && (CAMPOS_GEOMETRIA_APEO as readonly string[]).includes(id);

/** Las medidas tal como se cargan, en m. Cada clave es la del campo. */
export type MedidasApeoVoladizo = Record<CampoGeometriaApeo, number>;

const RESALTE = "var(--mat-cota)";

function Cota({
  x0, y0, x1, y1, texto, activa,
}: { x0: number; y0: number; x1: number; y1: number; texto: string; activa: boolean }) {
  const vertical = x0 === x1;
  const color = activa ? RESALTE : "currentColor";
  const ym = (y0 + y1) / 2;
  return (
    <g stroke={color} strokeWidth={activa ? 1.6 : 0.8} opacity={activa ? 1 : 0.8}>
      <path d={`M${x0} ${y0} L${x1} ${y1}`} />
      <path d={vertical ? `M${x0 - 4} ${y0} L${x0 + 4} ${y0} M${x1 - 4} ${y1} L${x1 + 4} ${y1}` : `M${x0} ${y0 - 4} L${x0} ${y0 + 4} M${x1} ${y1 - 4} L${x1} ${y1 + 4}`} />
      <text
        x={vertical ? x0 - 6 : (x0 + x1) / 2}
        y={vertical ? ym : y0 - 6}
        textAnchor="middle"
        transform={vertical ? `rotate(-90 ${x0 - 6} ${ym})` : undefined}
        stroke="none" fill={color} className="font-mono" fontSize="13" fontWeight={activa ? 700 : 400}
      >
        {texto}
      </text>
    </g>
  );
}

/**
 * Geometría de la viga con el pilar apeado en voladizo: alzado y, debajo,
 * planta con la misma escala horizontal, para que cada pilar quede alineado en
 * los dos dibujos. Una cota por dato, rotulada con el símbolo de su campo; la
 * del campo en edición se resalta. Sólo lo que se carga: el modelo de bielas y
 * tirantes va en resultados. Dibuja a escala real y no calcula nada.
 */
export function CroquisApeoVoladizo({ m, resaltar }: { m: MedidasApeoVoladizo; resaltar: CampoGeometriaApeo | null }) {
  const a = (c: CampoGeometriaApeo) => resaltar === c;
  const contorno = (...cs: CampoGeometriaApeo[]) => (cs.some(a) ? RESALTE : "var(--mat-hormigon-borde)");
  const grosor = (...cs: CampoGeometriaApeo[]) => (cs.some(a) ? 2.4 : 1.4);

  const largoM = m.extremoLibre + m.voladizo + m.luz + m.extremoLejano;
  const escala = Math.min(250 / largoM, 170 / m.h, 120 / Math.max(m.b, m.cargaProf, m.apoyoCProf, m.apoyoLProf, m.elemLProf));
  const x0 = 64;
  const x = (s: number) => x0 + s * escala;
  const xCarga = x(m.extremoLibre);
  const xCerca = x(m.extremoLibre + m.voladizo);
  const xLejos = x(m.extremoLibre + m.voladizo + m.luz);
  const xFin = x(largoM);
  const w = (anchoM: number) => anchoM * escala;
  const ALTO_PILAR = 30;

  // Alzado
  const yTop = 98;
  const yBase = yTop + m.h * escala;
  const altoAlzado = yBase + 124;
  // Planta, centrada en el eje de la viga. Va en su propio SVG: apilada con el
  // alzado en uno solo, el dibujo quedaba alto, el tope de altura de los
  // esquemas (globals.css) lo achicaba entero y los textos no se leían.
  const yPlanta = 34;
  const prof = Math.max(m.b, m.cargaProf, m.apoyoCProf, m.apoyoLProf, m.elemLProf);
  const yEje = yPlanta + (prof * escala) / 2;
  const yp = (t: number) => yEje + t * escala;
  const altoPlanta = yp(prof / 2) + 50;
  const anchoTotal = xFin + 64;

  const pilarPlanta = (xc: number, ancho: number, profundidad: number, campos: CampoGeometriaApeo[], abajo: boolean) => (
    <rect x={xc - w(ancho) / 2} y={yp(-profundidad / 2)} width={w(ancho)} height={profundidad * escala}
          stroke={contorno(...campos)} strokeWidth={grosor(...campos)} strokeDasharray={abajo ? "5 3" : undefined}
          fill="var(--mat-hormigon)" fillOpacity={abajo ? 0.35 : 0.8} />
  );
  const eje = (xc: number, y0: number, y1: number) => (
    <path d={`M${xc} ${y0} L${xc} ${y1}`} stroke="currentColor" strokeWidth="0.6" strokeDasharray="6 3" opacity="0.5" />
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <svg viewBox={`0 0 ${anchoTotal} ${altoAlzado}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <text x={4} y={yTop - 84} className="fill-current font-mono" fontSize="12" opacity="0.7">ALZADO</text>

        {/* lo que baja sobre la viga */}
        <rect x={xCarga - w(m.cargaAncho) / 2} y={yTop - ALTO_PILAR} width={w(m.cargaAncho)} height={ALTO_PILAR}
              stroke={contorno("cargaAncho")} strokeWidth={grosor("cargaAncho")} fill="var(--mat-hormigon)" />
        <rect x={xLejos - w(m.elemLAncho) / 2} y={yTop - ALTO_PILAR} width={w(m.elemLAncho)} height={ALTO_PILAR}
              stroke={contorno("elemLAncho")} strokeWidth={grosor("elemLAncho")} fill="var(--mat-hormigon)" />
        <text x={xCarga - w(m.cargaAncho) / 2} y={yTop - 64} className="fill-current font-mono" fontSize="12.5">
          pilar apeado (P)
        </text>
        {/* Un renglón más arriba, junto al título: con una luz corta, en el mismo se pisaría con el otro. */}
        <text x={xLejos + w(m.elemLAncho) / 2} y={yTop - 84} textAnchor="end" className="fill-current font-mono" fontSize="12.5">
          pilar sobre apoyo lejano (N)
        </text>

        {/* viga */}
        <rect x={x0} y={yTop} width={xFin - x0} height={yBase - yTop} fill="var(--mat-hormigon)"
              stroke={a("h") ? RESALTE : "currentColor"} strokeWidth={a("h") ? 2.6 : 1.8} />

        {/* apoyos */}
        <rect x={xCerca - w(m.apoyoCAncho) / 2} y={yBase} width={w(m.apoyoCAncho)} height={ALTO_PILAR}
              stroke={contorno("apoyoCAncho")} strokeWidth={grosor("apoyoCAncho")} fill="var(--mat-hormigon)" />
        <rect x={xLejos - w(m.apoyoLAncho) / 2} y={yBase} width={w(m.apoyoLAncho)} height={ALTO_PILAR}
              stroke={contorno("apoyoLAncho")} strokeWidth={grosor("apoyoLAncho")} fill="var(--mat-hormigon)" />
        <text x={xCerca} y={yBase + 66} textAnchor="middle" className="fill-current font-mono" fontSize="12.5">apoyo cercano</text>
        <text x={xLejos} y={yBase + 66} textAnchor="middle" className="fill-current font-mono" fontSize="12.5">apoyo lejano</text>

        {eje(xCarga, yTop - 52, yBase + 120)}
        {eje(xCerca, yTop - 6, yBase + 96)}
        {eje(xLejos, yTop - 70, yBase + 96)}

        {/* anchos en el plano */}
        <Cota x0={xCarga - w(m.cargaAncho) / 2} y0={yTop - 40} x1={xCarga + w(m.cargaAncho) / 2} y1={yTop - 40}
              texto={fmt(m.cargaAncho, 2)} activa={a("cargaAncho")} />
        <Cota x0={xLejos - w(m.elemLAncho) / 2} y0={yTop - 40} x1={xLejos + w(m.elemLAncho) / 2} y1={yTop - 40}
              texto={fmt(m.elemLAncho, 2)} activa={a("elemLAncho")} />
        <Cota x0={xCerca - w(m.apoyoCAncho) / 2} y0={yBase + 46} x1={xCerca + w(m.apoyoCAncho) / 2} y1={yBase + 46}
              texto={fmt(m.apoyoCAncho, 2)} activa={a("apoyoCAncho")} />
        <Cota x0={xLejos - w(m.apoyoLAncho) / 2} y0={yBase + 46} x1={xLejos + w(m.apoyoLAncho) / 2} y1={yBase + 46}
              texto={fmt(m.apoyoLAncho, 2)} activa={a("apoyoLAncho")} />

        {/* cadena de cotas entre ejes */}
        <Cota x0={xCarga} y0={yBase + 92} x1={xCerca} y1={yBase + 92} texto={`a ${fmt(m.voladizo, 2)}`} activa={a("voladizo")} />
        <Cota x0={xCerca} y0={yBase + 92} x1={xLejos} y1={yBase + 92} texto={`L ${fmt(m.luz, 2)}`} activa={a("luz")} />
        <Cota x0={x0} y0={yBase + 116} x1={xCarga} y1={yBase + 116} texto={`punta ${fmt(m.extremoLibre, 2)}`} activa={a("extremoLibre")} />
        <Cota x0={xLejos} y0={yBase + 116} x1={xFin} y1={yBase + 116} texto={`extremo ${fmt(m.extremoLejano, 2)}`} activa={a("extremoLejano")} />
        <path d={`M${x0} ${yBase + 2} L${x0} ${yBase + 120} M${xFin} ${yBase + 2} L${xFin} ${yBase + 120}`}
              stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <Cota x0={x0 - 22} y0={yTop} x1={x0 - 22} y1={yBase} texto={`h ${fmt(m.h, 2)}`} activa={a("h")} />
      </svg>

      <svg viewBox={`0 0 ${anchoTotal} ${altoPlanta}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">

        <text x={4} y={yPlanta - 16} className="fill-current font-mono" fontSize="12" opacity="0.7">PLANTA</text>
        {/* viga en planta */}
        <rect x={x0} y={yp(-m.b / 2)} width={xFin - x0} height={m.b * escala}
              stroke={a("b") ? RESALTE : "currentColor"} strokeWidth={a("b") ? 2.4 : 1.6} />
        {/* los apoyos, debajo, a trazos; lo que baja, encima, lleno */}
        {pilarPlanta(xCerca, m.apoyoCAncho, m.apoyoCProf, ["apoyoCAncho", "apoyoCProf"], true)}
        {pilarPlanta(xLejos, m.apoyoLAncho, m.apoyoLProf, ["apoyoLAncho", "apoyoLProf"], true)}
        {pilarPlanta(xCarga, m.cargaAncho, m.cargaProf, ["cargaAncho", "cargaProf"], false)}
        {pilarPlanta(xLejos, m.elemLAncho, m.elemLProf, ["elemLAncho", "elemLProf"], false)}
        {eje(xCarga, yPlanta - 8, yp(prof / 2) + 8)}
        {eje(xCerca, yPlanta - 8, yp(prof / 2) + 8)}
        {eje(xLejos, yPlanta - 8, yp(prof / 2) + 8)}

        {/* profundidades, a través */}
        <Cota x0={x0 - 22} y0={yp(-m.b / 2)} x1={x0 - 22} y1={yp(m.b / 2)} texto={`b ${fmt(m.b, 2)}`} activa={a("b")} />
        <Cota x0={xCarga + w(m.cargaAncho) / 2 + 18} y0={yp(-m.cargaProf / 2)} x1={xCarga + w(m.cargaAncho) / 2 + 18} y1={yp(m.cargaProf / 2)}
              texto={fmt(m.cargaProf, 2)} activa={a("cargaProf")} />
        <Cota x0={xCerca + w(m.apoyoCAncho) / 2 + 18} y0={yp(-m.apoyoCProf / 2)} x1={xCerca + w(m.apoyoCAncho) / 2 + 18} y1={yp(m.apoyoCProf / 2)}
              texto={fmt(m.apoyoCProf, 2)} activa={a("apoyoCProf")} />
        <Cota x0={xLejos - Math.max(w(m.apoyoLAncho), w(m.elemLAncho)) / 2 - 6} y0={yp(-m.apoyoLProf / 2)}
              x1={xLejos - Math.max(w(m.apoyoLAncho), w(m.elemLAncho)) / 2 - 6} y1={yp(m.apoyoLProf / 2)}
              texto={fmt(m.apoyoLProf, 2)} activa={a("apoyoLProf")} />
        <Cota x0={xFin + 30} y0={yp(-m.elemLProf / 2)} x1={xFin + 30} y1={yp(m.elemLProf / 2)}
              texto={fmt(m.elemLProf, 2)} activa={a("elemLProf")} />
        <path d={`M${xLejos + w(m.elemLAncho) / 2} ${yp(-m.elemLProf / 2)} L${xFin + 34} ${yp(-m.elemLProf / 2)} M${xLejos + w(m.elemLAncho) / 2} ${yp(m.elemLProf / 2)} L${xFin + 34} ${yp(m.elemLProf / 2)}`}
              stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

        <text x={4} y={altoPlanta - 22} className="fill-current font-mono" fontSize="11.5" opacity="0.7">
          lleno: baja sobre la viga · a trazos: la sostiene
        </text>
        <text x={4} y={altoPlanta - 6} className="fill-current font-mono" fontSize="11.5" opacity="0.7">
          cotas en m; las del largo, entre ejes
        </text>
      </svg>
    </div>
  );
}
