/**
 * Escena 3D del modelo: el edificio leído del IFC, pintado por estado.
 *
 * Es three.js con web-ifc directo, sin los componentes de That Open: lo único
 * que hace falta es cargar, pintar por GlobalId y elegir con un clic, y eso son
 * pocas líneas; That Open suma su propio formato (fragments), una conversión
 * previa y una API que cambió mucho entre versiones.
 *
 * No sabe nada de React ni del proyecto: recibe bytes, un estado por GlobalId
 * y avisa qué GlobalId se tocó. Se importa dinámicamente desde el componente,
 * para que three y web-ifc no pesen en el resto del sitio.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { iniciarIfc, leerModelo } from "@/lib/ifc/leer";
import type { EstadoElemento } from "@/lib/proyectos/estado";

/** Colores de la escena, leídos de los tokens de globals.css para respetar el tema. */
interface Paleta {
  fondo: string;
  aristas: string;
  seleccion: string;
  porEstado: Record<EstadoElemento, string>;
  fueraDelProyecto: string;
}

function leerPaleta(): Paleta {
  const css = getComputedStyle(document.documentElement);
  const token = (nombre: string) => css.getPropertyValue(nombre).trim() || "#888888";
  const gris = token("--muted-foreground");
  return {
    fondo: token("--background"),
    aristas: token("--foreground"),
    seleccion: token("--ring"),
    porEstado: {
      "sin-verificar": gris,
      verifica: token("--exito"),
      "no-verifica": token("--destructive"),
      "no-evaluable": gris,
    },
    fueraDelProyecto: token("--border"),
  };
}

const UMBRAL_CLIC_PX = 4;

export class VisorIfc {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
  private controles: OrbitControls;
  private edificio = new THREE.Group();
  /** Las mallas de cada elemento, por GlobalId. */
  private mallas = new Map<string, THREE.Mesh[]>();
  private aristas: THREE.LineSegments[] = [];
  private materiales = new Map<string, THREE.Material>();
  private estados = new Map<string, EstadoElemento>();
  private seleccionado: string | null = null;
  private paleta: Paleta;
  private observadorTamano: ResizeObserver;
  private observadorTema: MutationObserver;
  private cuadro = 0;
  private abajo: { x: number; y: number } | null = null;

  constructor(
    private contenedor: HTMLElement,
    private alSeleccionar: (globalId: string | null) => void
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    contenedor.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.controles = new OrbitControls(this.camara, this.renderer.domElement);
    this.controles.enableDamping = true;

    this.escena.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.4);
    sol.position.set(1, 2, 1.5);
    this.escena.add(sol);
    this.escena.add(this.edificio);

    this.paleta = leerPaleta();
    this.aplicarFondo();

    this.observadorTamano = new ResizeObserver(() => this.ajustarTamano());
    this.observadorTamano.observe(contenedor);
    this.ajustarTamano();

    // El tema se cambia poniendo o sacando la clase `dark` del <html>.
    this.observadorTema = new MutationObserver(() => {
      this.paleta = leerPaleta();
      this.aplicarFondo();
      this.pintar();
    });
    this.observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const lienzo = this.renderer.domElement;
    lienzo.addEventListener("pointerdown", this.alApretar);
    lienzo.addEventListener("pointerup", this.alSoltar);

    const animar = () => {
      this.controles.update();
      this.renderer.render(this.escena, this.camara);
      this.cuadro = requestAnimationFrame(animar);
    };
    animar();
  }

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

            const mesh = new THREE.Mesh(buffer);
            mesh.userData.globalId = globalId;
            this.edificio.add(mesh);
            const lista = this.mallas.get(globalId) ?? [];
            lista.push(mesh);
            this.mallas.set(globalId, lista);

            const lineas = new THREE.LineSegments(new THREE.EdgesGeometry(buffer, 30));
            lineas.userData.globalId = globalId;
            this.edificio.add(lineas);
            this.aristas.push(lineas);
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

  /** Estado de cada GlobalId que está en el proyecto. Lo que no figura queda como "fuera del proyecto". */
  actualizar(estados: Map<string, EstadoElemento>, seleccionado: string | null) {
    this.estados = estados;
    this.seleccionado = seleccionado;
    this.pintar();
  }

  destruir() {
    cancelAnimationFrame(this.cuadro);
    this.observadorTamano.disconnect();
    this.observadorTema.disconnect();
    const lienzo = this.renderer.domElement;
    lienzo.removeEventListener("pointerdown", this.alApretar);
    lienzo.removeEventListener("pointerup", this.alSoltar);
    this.controles.dispose();
    this.edificio.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
    });
    this.materiales.forEach((m) => m.dispose());
    this.renderer.dispose();
    lienzo.remove();
  }

  // -------------------------------------------------------------------------

  private material(clave: string, crear: () => THREE.Material): THREE.Material {
    let m = this.materiales.get(clave);
    if (!m) {
      m = crear();
      this.materiales.set(clave, m);
    }
    return m;
  }

  private pintar() {
    const p = this.paleta;
    // Los materiales se recrean con la paleta del momento: cambiar de tema
    // cambia los colores sin recargar el modelo.
    this.materiales.forEach((m) => m.dispose());
    this.materiales.clear();

    for (const [globalId, mallas] of this.mallas) {
      const estado = this.estados.get(globalId);
      const elegido = globalId === this.seleccionado;
      const clave = `${estado ?? "fuera"}${elegido ? ":sel" : ""}`;
      const material = this.material(clave, () => {
        const color = new THREE.Color(estado ? p.porEstado[estado] : p.fueraDelProyecto);
        // "No evaluable" va semitransparente: es gris como "sin verificar",
        // pero no hay que confundir un elemento sin calcular con uno calculado.
        const translucido = !estado || estado === "no-evaluable";
        // El elegido conserva el color de su estado, más claro: teñirlo de
        // otro color haría que un verde seleccionado no se lea como verde.
        return new THREE.MeshLambertMaterial({
          color,
          emissive: elegido ? color : new THREE.Color(0x000000),
          emissiveIntensity: elegido ? 0.35 : 0,
          transparent: translucido,
          opacity: !estado ? 0.18 : translucido ? 0.4 : 1,
          depthWrite: !translucido,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
      });
      for (const m of mallas) m.material = material;
    }

    const lineas = this.material(
      "aristas",
      () => new THREE.LineBasicMaterial({ color: new THREE.Color(p.aristas), transparent: true, opacity: 0.25 })
    );
    const lineasElegido = this.material("aristas:sel", () => new THREE.LineBasicMaterial({ color: new THREE.Color(p.seleccion) }));
    for (const a of this.aristas) {
      a.material = a.userData.globalId === this.seleccionado ? lineasElegido : lineas;
    }
  }

  private aplicarFondo() {
    this.escena.background = new THREE.Color(this.paleta.fondo);
  }

  private encuadrar() {
    const caja = new THREE.Box3().setFromObject(this.edificio);
    if (caja.isEmpty()) return;
    const centro = caja.getCenter(new THREE.Vector3());
    const tamano = caja.getSize(new THREE.Vector3()).length() || 1;
    // La esfera que envuelve el modelo tiene que entrar en el ángulo más
    // chico de los dos: en un lienzo angosto manda el horizontal.
    const mitadVertical = THREE.MathUtils.degToRad(this.camara.fov / 2);
    const mitadHorizontal = Math.atan(Math.tan(mitadVertical) * this.camara.aspect);
    const distancia = (tamano / 2 / Math.sin(Math.min(mitadVertical, mitadHorizontal))) * 1.1;
    this.controles.target.copy(centro);
    this.camara.near = tamano / 1000;
    this.camara.far = distancia + tamano * 10;
    this.camara.position.copy(centro).add(new THREE.Vector3(0.9, 0.7, 1.1).normalize().multiplyScalar(distancia));
    this.camara.updateProjectionMatrix();
  }

  private ajustarTamano() {
    const { clientWidth: ancho, clientHeight: alto } = this.contenedor;
    if (!ancho || !alto) return;
    this.renderer.setSize(ancho, alto);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
  }

  private alApretar = (e: PointerEvent) => {
    this.abajo = { x: e.clientX, y: e.clientY };
  };

  /** Un clic elige; arrastrar para girar la cámara no. */
  private alSoltar = (e: PointerEvent) => {
    const abajo = this.abajo;
    this.abajo = null;
    if (!abajo || Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > UMBRAL_CLIC_PX) return;

    const r = this.renderer.domElement.getBoundingClientRect();
    const puntero = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rayo = new THREE.Raycaster();
    rayo.setFromCamera(puntero, this.camara);
    // Sólo se eligen elementos del proyecto: lo que quedó fuera es contexto.
    const elegibles = [...this.mallas.entries()].filter(([g]) => this.estados.has(g)).flatMap(([, m]) => m);
    const golpe = rayo.intersectObjects(elegibles, false)[0];
    this.alSeleccionar((golpe?.object.userData.globalId as string | undefined) ?? null);
  };
}
