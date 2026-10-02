"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ConclusionResultados,
  type ComprobacionResumen,
} from "@/components/verificaciones/comun/ConclusionResultados";

/**
 * Registro de las comprobaciones que muestra una página, para armar la
 * conclusión general sin repetir a mano la lista de lo que ya está en
 * pantalla: cada ResultadoCheck se anota solo y ConclusionAutomatica lee el
 * registro.
 *
 * Sin proveedor no pasa nada: ResultadoCheck sigue funcionando igual y las
 * páginas que arman su conclusión a mano (vigas, torsión) no cambian.
 */

interface Registro {
  anotar: (clave: string, c: ComprobacionResumen) => void;
  quitar: (clave: string) => void;
  lista: ComprobacionResumen[];
}

const ContextoRegistro = createContext<Registro | null>(null);

export function ProveedorComprobaciones({ children }: { children: ReactNode }) {
  const [mapa, setMapa] = useState<Record<string, ComprobacionResumen>>({});

  const anotar = useCallback((clave: string, c: ComprobacionResumen) => {
    setMapa((m) => {
      const previa = m[clave];
      if (
        previa &&
        previa.etiqueta === c.etiqueta &&
        previa.estado === c.estado &&
        previa.utilizacion === c.utilizacion
      ) {
        return m;
      }
      return { ...m, [clave]: c };
    });
  }, []);

  const quitar = useCallback((clave: string) => {
    setMapa((m) => {
      if (!(clave in m)) return m;
      const copia = { ...m };
      delete copia[clave];
      return copia;
    });
  }, []);

  const valor = useMemo(() => ({ anotar, quitar, lista: Object.values(mapa) }), [anotar, quitar, mapa]);
  return <ContextoRegistro.Provider value={valor}>{children}</ContextoRegistro.Provider>;
}

/** Anota una comprobación mientras está montada. */
export function useAnotarComprobacion(clave: string, c: ComprobacionResumen) {
  const registro = useContext(ContextoRegistro);
  const { etiqueta, estado, utilizacion } = c;
  useEffect(() => {
    if (!registro) return;
    registro.anotar(clave, { etiqueta, estado, utilizacion });
  }, [registro, clave, etiqueta, estado, utilizacion]);
  useEffect(() => {
    if (!registro) return;
    return () => registro.quitar(clave);
    // Sólo al desmontar: si se reanotara en cada cambio, la fila parpadearía.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
}

/** Conclusión general a partir de lo que anotaron las comprobaciones de la página. */
export function ConclusionAutomatica() {
  const registro = useContext(ContextoRegistro);
  if (!registro || registro.lista.length === 0) return null;
  return <ConclusionResultados comprobaciones={registro.lista} />;
}
