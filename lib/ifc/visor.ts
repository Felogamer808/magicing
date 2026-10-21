/**
 * Escena 3D del modelo: el edificio leído del IFC, pintado por estado.
 *
 * Es three.js con web-ifc directo, sin los componentes de That Open: lo único
 * que hace falta es cargar, pintar por GlobalId y elegir con un clic, y eso son
 * pocas líneas; That Open suma su propio formato (fragments), una conversión
 * previa y una API que cambió mucho entre versiones.
 *
 * La cámara, los colores y el clic son de `Escena3D` (lib/visor/escena.ts),
 * compartida con el 3D de la planta de fundaciones. Acá sólo se cargan las
 * mallas del IFC, con el GlobalId como id de cada pieza.
 *
 * No sabe nada de React ni del proyecto: recibe bytes, un estado por GlobalId
 * y avisa qué GlobalId se tocó. Se importa dinámicamente desde el componente,
 * para que three y web-ifc no pesen en el resto del sitio.
 */

import * as THREE from "three";
import { iniciarIfc, leerModelo } from "@/lib/ifc/leer";
import { Escena3D } from "@/lib/visor/escena";

export class VisorIfc extends Escena3D {
  /** Arma la geometría del IFC. Sólo los elementos estructurales: puertas y demás no se dibujan. */
  async cargar(bytes: Uint8Array): Promise<void> {
    const api = await iniciarIfc();
    // COORDINATE_TO_ORIGIN: Revit exporta con coordenadas de proyecto que
    // pueden estar a kilómetros del origen, y three pierde precisión ahí.
    const modelo = api.OpenModel(bytes, { COORDINATE_TO_ORIGIN: true });
    if (modelo < 0) throw new Error("web-ifc no pudo abrir el archivo.");
    try {
      const globalIdDe = new Map(leerModelo(api, modelo).elementos.map((e) => [e.expressId, e.globalId]));
      const matriz = new THREE.Matrix4();

      api.StreamAllMeshes(modelo, (malla) => {
        const globalId = globalIdDe.get(malla.expressID);
        if (globalId) {
          for (let i = 0; i < malla.geometries.size(); i++) {
            const colocada = malla.geometries.get(i);
            const geo = api.GetGeometry(modelo, colocada.geometryExpressID);
            const vertices = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
            const indices = api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
            geo.delete();

            // web-ifc entrega posición y normal intercaladas: 6 números por vértice.
            const intercalado = new THREE.InterleavedBuffer(new Float32Array(vertices), 6);
            const buffer = new THREE.BufferGeometry();
            buffer.setAttribute("position", new THREE.InterleavedBufferAttribute(intercalado, 3, 0));
            buffer.setAttribute("normal", new THREE.InterleavedBufferAttribute(intercalado, 3, 3));
            buffer.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
            buffer.applyMatrix4(matriz.fromArray(colocada.flatTransformation));
            this.agregar(globalId, buffer);
          }
        }
        // Sin malla.delete(): los tipos de web-ifc 0.0.78 lo declaran, pero la
        // malla que llega al callback no lo tiene y la libera la librería.
      });
    } finally {
      api.CloseModel(modelo);
    }
    this.encuadrar();
    this.pintar();
  }
}
