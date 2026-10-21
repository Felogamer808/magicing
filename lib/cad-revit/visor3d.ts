/**
 * Escena 3D de la planta de fundaciones del proyecto. Las piezas salen de
 * `piezas3D` (misma geometría que la exportación a Revit); la cámara, los
 * colores por estado y el clic son de `Escena3D`.
 *
 * El tramo de pilar ("pilar:CT9-1") se pinta del color de su pieza y, al
 * tocarlo, elige esa pieza: es donde se cargan las cargas.
 *
 * Se importa dinámicamente desde el componente, para que three no pese en el
 * resto del sitio.
 */

import * as THREE from "three";
import type { EstadoElemento } from "@/lib/proyectos/estado";
import { Escena3D } from "@/lib/visor/escena";
import type { Pieza3D } from "./modelo3d";

const PILAR = "pilar:";

export class VisorPlanta extends Escena3D {
  private encuadrada = false;

  /** Arma (o rearma, si cambió un pilar) el modelo. La cámara se encuadra sólo la primera vez. */
  cargar(piezas: Pieza3D[]) {
    this.vaciar();
    for (const p of piezas) {
      const [a, b, c] = p.medidas;
      const geo = p.forma === "caja" ? new THREE.BoxGeometry(a, b, c) : new THREE.CylinderGeometry(a / 2, a / 2, b, 24);
      geo.rotateY(p.giroY);
      geo.translate(...p.centro);
      this.agregar(p.id, geo);
    }
    if (!this.encuadrada) {
      this.encuadrar();
      this.encuadrada = true;
    }
    this.pintar();
  }

  protected estadoDe(id: string): EstadoElemento | undefined {
    if (id.startsWith(PILAR)) return this.estados.get(id.slice(PILAR.length)) ?? "sin-verificar";
    return super.estadoDe(id);
  }

  protected esElegida(id: string): boolean {
    return super.esElegida(id) || (this.seleccionado !== null && id === PILAR + this.seleccionado);
  }

  protected esElegible(id: string): boolean {
    return id.startsWith(PILAR) || super.esElegible(id);
  }

  protected idAlElegir(id: string): string {
    return id.startsWith(PILAR) ? id.slice(PILAR.length) : id;
  }
}
