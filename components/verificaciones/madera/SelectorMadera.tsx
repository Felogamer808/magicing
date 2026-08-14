"use client";

import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { PanelAyuda } from "@/components/verificaciones/comun/PanelAyuda";
import {
  DESCRIPCION_SERVICIO,
  EJEMPLOS_DURACION,
  GAMMA_M,
  NOMBRE_DURACION,
  NOMBRE_MADERA,
  kdef,
  kmod,
  type ClaseServicio,
  type DuracionCarga,
  type TipoMadera,
} from "@/lib/calc/ec5/materiales";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Elección de material, clase de servicio y duración de la carga, con los tres
 * coeficientes que salen de ahí ya resueltos.
 *
 * Es el bloque que más trabajo ahorra de toda la sección. En la planilla
 * original kmod, kdef y γM se teclean a mano en cada hoja, y ahí pasan dos
 * cosas: se copia el valor de la hoja de al lado sin releer la tabla, y se
 * olvida el art. 3.1.3(2) —kmod lo fija la acción de MENOR duración de la
 * combinación, no la dominante—. Las dos llevan al mismo lado: un kmod
 * demasiado alto, que sube toda la resistencia de la pieza.
 */

export const TIPOS_MADERA: readonly string[] = Object.values(NOMBRE_MADERA);
export const CLASES_SERVICIO = ["Clase 1", "Clase 2", "Clase 3"] as const;
export const DURACIONES: readonly string[] = Object.values(NOMBRE_DURACION);

export function tipoDesdeEtiqueta(etiqueta: string): TipoMadera {
  const par = (Object.entries(NOMBRE_MADERA) as [TipoMadera, string][]).find(
    ([, nombre]) => nombre === etiqueta
  );
  return par ? par[0] : "maciza";
}

export function duracionDesdeEtiqueta(etiqueta: string): DuracionCarga {
  const par = (Object.entries(NOMBRE_DURACION) as [DuracionCarga, string][]).find(
    ([, nombre]) => nombre === etiqueta
  );
  return par ? par[0] : "media";
}

export function servicioDesdeEtiqueta(etiqueta: string): ClaseServicio {
  if (etiqueta === CLASES_SERVICIO[0]) return 1;
  if (etiqueta === CLASES_SERVICIO[2]) return 3;
  return 2;
}

interface Props {
  tipo: string;
  onTipo: (v: string) => void;
  servicio: string;
  onServicio: (v: string) => void;
  duracion: string;
  onDuracion: (v: string) => void;
  /** Se oculta la fila de kdef en las verificaciones de ELU, que no lo usan. */
  mostrarKdef?: boolean;
}

export function SelectorMadera({
  tipo, onTipo, servicio, onServicio, duracion, onDuracion, mostrarKdef = false,
}: Props) {
  const t = tipoDesdeEtiqueta(tipo);
  const cs = servicioDesdeEtiqueta(servicio);
  const dc = duracionDesdeEtiqueta(duracion);

  const valorKmod = kmod(t, cs, dc);
  const valorKdef = kdef(t, cs);
  const gammaM = GAMMA_M[t];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSeleccion id="tipo-madera" etiqueta="Material" valor={tipo}
                        opciones={TIPOS_MADERA} onChange={onTipo} />
        <CampoSeleccion id="clase-servicio" etiqueta="Clase de servicio" valor={servicio}
                        opciones={CLASES_SERVICIO} onChange={onServicio} />
        <CampoSeleccion id="duracion-carga" etiqueta="Duración de la carga" valor={duracion}
                        opciones={DURACIONES} onChange={onDuracion} />
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-md border border-border bg-card/60 px-4 py-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">kmod · tabla 3.1</dt>
          <dd className="font-mono tabular-nums">{fmt(valorKmod, 2)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">γM · tabla 2.3</dt>
          <dd className="font-mono tabular-nums">{fmt(gammaM, 2)}</dd>
        </div>
        {mostrarKdef ? (
          <div>
            <dt className="text-xs text-muted-foreground">kdef · tabla 3.2</dt>
            <dd className="font-mono tabular-nums">{fmt(valorKdef, 2)}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-xs text-muted-foreground">kmod/γM</dt>
            <dd className="font-mono tabular-nums">{fmt(valorKmod / gammaM, 3)}</dd>
          </div>
        )}
      </dl>

      <PanelAyuda titulo="Cómo se eligen estos tres coeficientes">
        <p>
          <strong className="text-foreground">Clase de servicio.</strong> Describe el ambiente,
          no la carga. {DESCRIPCION_SERVICIO[cs]}
        </p>
        <p>
          <strong className="text-foreground">Duración de la carga.</strong> Ejemplos de la tabla
          2.2 para esta clase: {EJEMPLOS_DURACION[dc]}. Ojo con el art. 3.1.3(2): en una
          combinación hay que tomar el kmod de la acción de <em>menor</em> duración, no el de la
          dominante. Permanente más viento se verifica con el kmod del viento.
        </p>
        <p>
          <strong className="text-foreground">kmod.</strong> Recoge de una vez el efecto de la
          humedad y del tiempo bajo carga. Va de 0,50 a 1,10: entre el peor y el mejor caso hay
          un factor 2,2 sobre toda la resistencia de la pieza, más que cualquier otra decisión de
          la verificación.
        </p>
        <p>
          <strong className="text-foreground">γM.</strong> Tabla 2.3, por material. Baja al
          encolar —1,30 en maciza, 1,25 en laminada, 1,20 en microlaminada— porque el proceso
          reparte los defectos y la dispersión de la resistencia es menor. En combinación
          accidental, incendio incluido, vale 1,00.
        </p>
      </PanelAyuda>
    </div>
  );
}
