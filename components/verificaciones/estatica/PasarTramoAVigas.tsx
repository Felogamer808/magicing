"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import {
  COMBINACIONES_LIBRE,
  calcularEnvolventeVigaLibre,
  esfuerzosDeTramo,
  seccionesDeApoyo,
  type DatosVigaLibre,
  type EsfuerzosTramo,
} from "@/lib/calc/estatica/viga-libre";
import { guardarCamposDeRuta, leerCamposDeRuta, useCampo } from "@/lib/hooks/useCampo";
import { tipoSeccionDesdeCampo } from "@/lib/calc/hormigon/vigas/seccion-t";
import { RUTA_VIGAS_FLEXION_CORTANTE, camposVigasDesdeTramo, l0DeTramo } from "@/lib/verificaciones/vinculos";
import { aNumero, fmt } from "@/lib/verificaciones/formato";

const ELU = COMBINACIONES_LIBRE.find((c) => c.id === "elu")!;

interface PasarTramoAVigasProps {
  datos: DatosVigaLibre;
  /** Ancho de cada nudo (m), 0 sin dato. */
  anchosApoyoM: readonly number[];
}

/**
 * Elegir un tramo y mandarlo a la verificación de vigas. Siempre con la
 * envolvente ELU y Q alternada, sea cual sea la combinación que se esté
 * mirando arriba: lo que se dimensiona es eso.
 */
export function PasarTramoAVigas({ datos, anchosApoyoM }: PasarTramoAVigasProps) {
  const router = useRouter();
  const [tramoTexto, setTramo] = useCampo("tramoVigas", "1");
  const [dTexto, setD] = useCampo("dVigas", "");

  const n = datos.lucesM.length;
  const indice = Math.min(Math.max(Math.round(aNumero(tramoTexto)) - 1 || 0, 0), n - 1);
  const dM = aNumero(dTexto);
  const dValido = Number.isFinite(dM) && dM > 0;

  let esfuerzos: EsfuerzosTramo | null = null;
  let motivo: string | null = dValido ? null : "Falta el canto útil d de la viga.";
  if (dValido) {
    try {
      const env = calcularEnvolventeVigaLibre(datos, ELU, seccionesDeApoyo(datos.lucesM, anchosApoyoM, dM));
      esfuerzos = esfuerzosDeTramo(datos, ELU, env, indice, anchosApoyoM, dM);
    } catch (e) {
      motivo = e instanceof Error ? e.message : "No se pudo resolver la viga.";
    }
  }

  // d de la sección cargada en Vigas: h − recubrimiento − Ø estribo − Ø negativa / 2.
  const traerD = () => {
    const c = leerCamposDeRuta(RUTA_VIGAS_FLEXION_CORTANTE);
    const h = aNumero(c.h ?? "0.7");
    const rec = aNumero(c.recubrimiento ?? "0.04");
    const est = aNumero(c.diametroEstribo ?? "10") / 1000;
    const neg = aNumero(c.diametroNeg ?? "12") / 1000;
    const d = h - rec - est - neg / 2;
    if (Number.isFinite(d) && d > 0) setD(d.toFixed(3).replace(".", ","));
  };

  const pasar = () => {
    if (!esfuerzos) return;
    // El caso de l0 depende de dónde se comprime el ala, y eso lo dice la sección de Vigas.
    const tipo = tipoSeccionDesdeCampo(leerCamposDeRuta(RUTA_VIGAS_FLEXION_CORTANTE).tipoSeccion);
    const l0 = l0DeTramo(datos, esfuerzos, tipo !== "t-invertida");
    guardarCamposDeRuta(RUTA_VIGAS_FLEXION_CORTANTE, camposVigasDesdeTramo(esfuerzos, l0));
    router.push(RUTA_VIGAS_FLEXION_CORTANTE);
  };

  const sinAncho = esfuerzos?.extremos.filter((e) => !(anchosApoyoM[e.nudo - 1] > 0)).map((e) => e.nudo) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Tramo</p>
          <div className="flex flex-wrap gap-2">
            {datos.lucesM.map((l, i) => (
              <Button key={i} variant={i === indice ? "default" : "outline"} size="sm" onClick={() => setTramo(String(i + 1))}>
                {i + 1} · {fmt(l, 2)} m
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-36">
            <CampoNumerico id="d-vigas" etiqueta="Canto útil d" sufijo="m" valor={dTexto} onChange={setD} />
          </div>
          <Button variant="ghost" size="sm" onClick={traerD}>
            Usar el de Vigas
          </Button>
        </div>
      </div>

      {!esfuerzos ? (
        <p className="text-sm text-muted-foreground">{motivo}</p>
      ) : (
        <>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <Fila etiqueta="M⁺ máximo del tramo" valor={`${fmt(esfuerzos.momentoPosKNm, 2)} kN·m`} />
            <Fila etiqueta="M⁻ en la cara del apoyo" valor={`${fmt(esfuerzos.momentoNegKNm, 2)} kN·m`} />
            <Fila etiqueta="Vd a d del borde" valor={`${fmt(esfuerzos.vdKN, 2)} kN`} nota={`a ${fmt(esfuerzos.inicioLeyM, 2)} m del eje`} />
            <Fila etiqueta="V en el borde (VRd,max)" valor={`${fmt(esfuerzos.vBordeKN, 2)} kN`} />
            <Fila etiqueta="Vd en el centro del vano" valor={`${fmt(esfuerzos.vdCentroKN, 2)} kN`} />
            <Fila etiqueta="Luz del vano" valor={`${fmt(esfuerzos.luzM, 2)} m`} />
          </div>
          {esfuerzos.extremos.map((e) => (
            <p key={e.nudo} className="text-xs text-muted-foreground">
              Nudo {e.nudo}: M en la cara {fmt(e.momentoCaraKNm, 2)} kN·m
              {e.minimoEmpotramientoKNm > 0 && `, mínimo 0,65 del empotramiento ${fmt(e.minimoEmpotramientoKNm, 2)} kN·m`}
              {e.minimoEmpotramientoKNm > e.momentoCaraKNm && " (gobierna el mínimo)"}; Vd {fmt(e.vdKN, 2)} kN.
            </p>
          ))}
          {sinAncho.length > 0 && (
            <p className="text-xs text-destructive">
              {sinAncho.length === 1 ? "El nudo" : "Los nudos"} {sinAncho.join(", ")} no {sinAncho.length === 1 ? "tiene" : "tienen"} ancho
              de apoyo: ahí la cara se toma en el eje. Se carga tocando el nudo en el dibujo.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              Envolvente ELU con Q alternada. Pisa los esfuerzos de Vigas y el caso de l0 del ancho eficaz (según la
              sección que tenga cargada); la sección, los materiales y las armaduras quedan como estaban.
            </p>
            <Button type="button" size="sm" onClick={pasar}>
              Verificar el tramo {esfuerzos.tramo} en Vigas <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Fila({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5">
      <span className="text-sm text-muted-foreground">
        {etiqueta}
        {nota && <span className="ml-1 text-xs">({nota})</span>}
      </span>
      <span className="font-mono text-sm tabular-nums">{valor}</span>
    </div>
  );
}
