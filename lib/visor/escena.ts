/**
 * La escena 3D común a los visores de MagicIng: cámara que gira alrededor del
 * modelo, piezas pintadas por estado y elegir una con un clic.
 *
 * No sabe de dónde salen las piezas: el visor del IFC las saca de web-ifc
 * (`lib/ifc/visor.ts`) y el de la planta de fundaciones las arma de la planta
 * interpretada (`lib/cad-revit/visor3d.ts`). Cada pieza tiene un id —el
 * GlobalId o la marca— y un estado; las que no tienen estado son contexto.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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

export class Escena3D {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
  private controles: OrbitControls;
  protected modelo = new THREE.Group();
  /** Las mallas de cada pieza, por id. */
  private mallas = new Map<string, THREE.Mesh[]>();
  private aristas: THREE.LineSegments[] = [];
  private materiales = new Map<string, THREE.Material>();
  protected estados = new Map<string, EstadoElemento>();
  protected seleccionado: string | null = null;
  private paleta: Paleta;
  private observadorTamano: ResizeObserver;
  private observadorTema: MutationObserver;
  private cuadro = 0;
  private abajo: { x: number; y: number } | null = null;
  /** Si ya se tocó la cámara: hasta entonces, un cambio de tamaño vuelve a encuadrar. */
  private interactuo = false;

  constructor(
    private contenedor: HTMLElement,
    private alSeleccionar: (id: string | null) => void
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
    this.escena.add(this.modelo);

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
    lienzo.addEventListener("wheel", this.alInteractuar, { passive: true });

    const animar = () => {
      this.controles.update();
      this.renderer.render(this.escena, this.camara);
      this.cuadro = requestAnimationFrame(animar);
    };
    animar();
  }

  /** Estado de cada pieza que está en el proyecto. Lo que no figura queda como contexto. */
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
    lienzo.removeEventListener("wheel", this.alInteractuar);
    this.controles.dispose();
    this.vaciar();
    this.materiales.forEach((m) => m.dispose());
    this.renderer.dispose();
    lienzo.remove();
  }

  // -------------------------------------------------------------------------
  // Para los visores que heredan
  // -------------------------------------------------------------------------

  /** Suma una malla (con sus aristas) a la pieza `id`. */
  protected agregar(id: string, geometria: THREE.BufferGeometry) {
    const mesh = new THREE.Mesh(geometria);
    mesh.userData.id = id;
    this.modelo.add(mesh);
    this.mallas.set(id, [...(this.mallas.get(id) ?? []), mesh]);

    const lineas = new THREE.LineSegments(new THREE.EdgesGeometry(geometria, 30));
    lineas.userData.id = id;
    this.modelo.add(lineas);
    this.aristas.push(lineas);
  }

  /** Saca todas las piezas, para volver a armar el modelo. */
  protected vaciar() {
    this.modelo.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
    });
    this.modelo.clear();
    this.mallas.clear();
    this.aristas = [];
  }

  /** Con qué estado se pinta una pieza. Por defecto, el suyo. */
  protected estadoDe(id: string): EstadoElemento | undefined {
    return this.estados.get(id);
  }

  /** Si la pieza se resalta como elegida. */
  protected esElegida(id: string): boolean {
    return id === this.seleccionado;
  }

  /** Si un clic la puede elegir: por defecto, sólo las del proyecto. */
  protected esElegible(id: string): boolean {
    return this.estados.has(id);
  }

  /** Qué id avisa el clic sobre una pieza (un visor puede redirigir, p. ej. el pilar a su cabezal). */
  protected idAlElegir(id: string): string {
    return id;
  }

  protected pintar() {
    const p = this.paleta;
    // Los materiales se recrean con la paleta del momento: cambiar de tema
    // cambia los colores sin recargar el modelo.
    this.materiales.forEach((m) => m.dispose());
    this.materiales.clear();

    for (const [id, mallas] of this.mallas) {
      const estado = this.estadoDe(id);
      const elegido = this.esElegida(id);
      const clave = `${estado ?? "fuera"}${elegido ? ":sel" : ""}`;
      const material = this.material(clave, () => {
        const color = new THREE.Color(estado ? p.porEstado[estado] : p.fueraDelProyecto);
        // "No evaluable" va semitransparente: es gris como "sin verificar",
        // pero no hay que confundir una pieza sin calcular con una calculada.
        const translucido = !estado || estado === "no-evaluable";
        // La elegida conserva el color de su estado, más claro: teñirla de
        // otro color haría que una verde seleccionada no se lea como verde.
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
    const lineasElegida = this.material("aristas:sel", () => new THREE.LineBasicMaterial({ color: new THREE.Color(p.seleccion) }));
    for (const a of this.aristas) {
      a.material = this.esElegida(a.userData.id as string) ? lineasElegida : lineas;
    }
  }

  protected encuadrar() {
    const caja = new THREE.Box3().setFromObject(this.modelo);
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

  // -------------------------------------------------------------------------

  private material(clave: string, crear: () => THREE.Material): THREE.Material {
    let m = this.materiales.get(clave);
    if (!m) {
      m = crear();
      this.materiales.set(clave, m);
    }
    return m;
  }

  private aplicarFondo() {
    this.escena.background = new THREE.Color(this.paleta.fondo);
  }

  private ajustarTamano() {
    const { clientWidth: ancho, clientHeight: alto } = this.contenedor;
    if (!ancho || !alto) return;
    this.renderer.setSize(ancho, alto);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
    // El recuadro suele tener otro tamaño cuando se arma el modelo (la página
    // todavía se acomoda): mientras no se tocó la cámara, se vuelve a encuadrar.
    if (!this.interactuo && this.mallas.size) this.encuadrar();
  }

  private alApretar = (e: PointerEvent) => {
    this.abajo = { x: e.clientX, y: e.clientY };
    this.interactuo = true;
  };

  private alInteractuar = () => {
    this.interactuo = true;
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
    const elegibles = [...this.mallas.entries()].filter(([id]) => this.esElegible(id)).flatMap(([, m]) => m);
    const golpe = rayo.intersectObjects(elegibles, false)[0];
    const id = golpe?.object.userData.id as string | undefined;
    this.alSeleccionar(id === undefined ? null : this.idAlElegir(id));
  };
}
