"use client";

import { useSyncExternalStore } from "react";

/**
 * El IFC cargado de cada proyecto, sólo en memoria.
 *
 * No va a localStorage: un modelo de edificio pesa decenas de MB y el
 * almacenamiento del navegador ronda los 5. Vive mientras la pestaña esté
 * abierta, y navegar entre el proyecto y el visor no lo pierde porque la
 * navegación de Next no recarga la página. Al recargar o reabrir, el visor
 * pide que se vuelva a cargar: los elementos ya quedaron en el proyecto.
 */

export interface IfcEnMemoria {
  nombreArchivo: string;
  bytes: Uint8Array;
}

const cargados = new Map<string, IfcEnMemoria>();
const oyentes = new Set<() => void>();

export function guardarIfcEnMemoria(idProyecto: string, ifc: IfcEnMemoria) {
  cargados.set(idProyecto, ifc);
  oyentes.forEach((o) => o());
}

function suscribir(alCambiar: () => void) {
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

export function useIfcEnMemoria(idProyecto: string): IfcEnMemoria | null {
  return useSyncExternalStore(
    suscribir,
    () => cargados.get(idProyecto) ?? null,
    () => null
  );
}
