/**
 * Propiedades geométricas de una sección definida por su contorno.
 *
 * En vez de tabular una fórmula cerrada por perfil —treinta fórmulas, treinta
 * oportunidades de equivocarse al transcribir— acá hay un único motor que
 * integra sobre el contorno por el teorema de Green, y cada perfil es nada más
 * que la lista de sus vértices. La fórmula del rectángulo no se escribe: sale.
 *
 * Eso además regala dos cosas que las tablas de perfil no suelen traer y que en
 * un ángulo o en un perfil Z hacen falta de verdad: el producto de inercia Ixy
 * y la orientación de los ejes principales. Una L cargada verticalmente flecta
 * también de costado, y sin Ixy eso no se ve.
 *
 * Unidades: entra en cm y sale en cm², cm³, cm⁴. Es la unidad en la que se
 * miran las tablas de perfiles, y evita el 10⁸ de pasar a m⁴.
 */

export interface Punto {
  xCm: number;
  yCm: number;
}

export interface PropiedadesSeccion {
  areaCm2: number;
  perimetroCm: number;
  /** Centroide respecto del origen en que se dio el contorno. */
  centroideXCm: number;
  centroideYCm: number;
  /** Inercias respecto de ejes que pasan por el centroide, paralelos a x e y. */
  ixCm4: number;
  iyCm4: number;
  /** Producto de inercia centroidal. Cero si hay un eje de simetría. */
  ixyCm4: number;
  /** Distancias del centroide a las fibras extremas. */
  ySuperiorCm: number;
  yInferiorCm: number;
  xIzquierdoCm: number;
  xDerechoCm: number;
  /** Módulos resistentes elásticos, uno por fibra: W = I / distancia. */
  wxSuperiorCm3: number;
  wxInferiorCm3: number;
  wyIzquierdoCm3: number;
  wyDerechoCm3: number;
  /** Radios de giro i = √(I/A). */
  radioGiroXCm: number;
  radioGiroYCm: number;
  /** Inercias principales: I1 ≥ I2. */
  i1Cm4: number;
  i2Cm4: number;
  /**
   * Ángulo del eje principal 1 medido desde el eje x, en grados, positivo
   * antihorario. Cero cuando la sección es simétrica.
   */
  anguloPrincipalGrados: number;
  /** Rectángulo que envuelve la sección. */
  anchoTotalCm: number;
  altoTotalCm: number;
}

/**
 * Área con signo por la fórmula del cordón de zapato. El signo dice el sentido
 * de recorrido del contorno: positivo antihorario. Se conserva con signo a
 * propósito, porque es lo que permite descontar un hueco recorriéndolo al revés.
 */
export function areaConSigno(contorno: readonly Punto[]): number {
  let suma = 0;
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i];
    const b = contorno[(i + 1) % contorno.length];
    suma += a.xCm * b.yCm - b.xCm * a.yCm;
  }
  return suma / 2;
}

export function perimetro(contorno: readonly Punto[]): number {
  let suma = 0;
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i];
    const b = contorno[(i + 1) % contorno.length];
    suma += Math.hypot(b.xCm - a.xCm, b.yCm - a.yCm);
  }
  return suma;
}

/**
 * Momentos de área de orden 0, 1 y 2 respecto del origen, integrados sobre el
 * contorno. Son las sumas crudas de Green; la traslación al centroide se hace
 * después, para poder acumular varios contornos antes de trasladar.
 */
interface MomentosCrudos {
  area: number;
  sx: number;
  sy: number;
  ixx: number;
  iyy: number;
  ixy: number;
}

function momentosCrudos(contorno: readonly Punto[]): MomentosCrudos {
  let area = 0;
  let sx = 0;
  let sy = 0;
  let ixx = 0;
  let iyy = 0;
  let ixy = 0;

  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i];
    const b = contorno[(i + 1) % contorno.length];
    // Producto cruzado del lado: aparece como factor en todas las integrales.
    const cruz = a.xCm * b.yCm - b.xCm * a.yCm;

    area += cruz;
    sy += (a.xCm + b.xCm) * cruz;
    sx += (a.yCm + b.yCm) * cruz;
    iyy += (a.xCm * a.xCm + a.xCm * b.xCm + b.xCm * b.xCm) * cruz;
    ixx += (a.yCm * a.yCm + a.yCm * b.yCm + b.yCm * b.yCm) * cruz;
    ixy +=
      (a.xCm * b.yCm + 2 * a.xCm * a.yCm + 2 * b.xCm * b.yCm + b.xCm * a.yCm) * cruz;
  }

  return {
    area: area / 2,
    sx: sx / 6,
    sy: sy / 6,
    ixx: ixx / 12,
    iyy: iyy / 12,
    ixy: ixy / 24,
  };
}

/**
 * Propiedades de una sección formada por uno o más contornos.
 *
 * El primero es el contorno lleno; los siguientes son huecos y se descuentan.
 * No hace falta que el usuario recorra el hueco al revés: el signo se corrige
 * acá, porque acordarse del sentido de giro es exactamente el tipo de detalle
 * que produce una inercia negativa sin que nadie se dé cuenta.
 */
export function calcularPropiedadesSeccion(
  lleno: readonly Punto[],
  huecos: readonly (readonly Punto[])[] = []
): PropiedadesSeccion {
  if (lleno.length < 3) {
    throw new Error("El contorno necesita al menos tres vértices.");
  }

  const signoLleno = Math.sign(areaConSigno(lleno)) || 1;
  const acumulado: MomentosCrudos = { area: 0, sx: 0, sy: 0, ixx: 0, iyy: 0, ixy: 0 };

  const sumar = (contorno: readonly Punto[], factor: number) => {
    const m = momentosCrudos(contorno);
    // Se normaliza por el signo propio del contorno para que el resultado no
    // dependa de en qué sentido lo hayan escrito.
    const s = (Math.sign(m.area) || 1) * factor;
    acumulado.area += s * m.area;
    acumulado.sx += s * m.sx;
    acumulado.sy += s * m.sy;
    acumulado.ixx += s * m.ixx;
    acumulado.iyy += s * m.iyy;
    acumulado.ixy += s * m.ixy;
  };

  sumar(lleno, signoLleno);
  for (const hueco of huecos) sumar(hueco, -signoLleno);

  const areaCm2 = Math.abs(acumulado.area);
  if (areaCm2 < 1e-12) {
    throw new Error("La sección tiene área nula.");
  }

  const signo = Math.sign(acumulado.area) || 1;
  const centroideXCm = acumulado.sy / acumulado.area;
  const centroideYCm = acumulado.sx / acumulado.area;

  // Steiner al centroide. El valor absoluto va después de trasladar, nunca
  // antes: trasladar un valor ya positivado da un número sin sentido.
  const ixCm4 = signo * (acumulado.ixx - acumulado.area * centroideYCm ** 2);
  const iyCm4 = signo * (acumulado.iyy - acumulado.area * centroideXCm ** 2);
  const ixyCm4 = signo * (acumulado.ixy - acumulado.area * centroideXCm * centroideYCm);

  const todos = [lleno, ...huecos].flat();
  const xs = todos.map((p) => p.xCm);
  const ys = todos.map((p) => p.yCm);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const ySuperiorCm = yMax - centroideYCm;
  const yInferiorCm = centroideYCm - yMin;
  const xIzquierdoCm = centroideXCm - xMin;
  const xDerechoCm = xMax - centroideXCm;

  // Los ejes principales son los que anulan el producto de inercia. El factor
  // 1/2 del arco tangente sale de que la transformación es de segundo orden:
  // girar 90° intercambia Ix con Iy, así que el período es 180°, no 360°.
  const semiDiferencia = (ixCm4 - iyCm4) / 2;
  const radio = Math.hypot(semiDiferencia, ixyCm4);
  const media = (ixCm4 + iyCm4) / 2;
  const i1Cm4 = media + radio;
  const i2Cm4 = media - radio;
  const anguloPrincipalGrados =
    radio < 1e-12 ? 0 : (Math.atan2(-ixyCm4, semiDiferencia) * 90) / Math.PI;

  const wSeguro = (i: number, d: number) => (Math.abs(d) < 1e-12 ? Infinity : i / d);

  return {
    areaCm2,
    perimetroCm: perimetro(lleno) + huecos.reduce((s, h) => s + perimetro(h), 0),
    centroideXCm,
    centroideYCm,
    ixCm4,
    iyCm4,
    ixyCm4,
    ySuperiorCm,
    yInferiorCm,
    xIzquierdoCm,
    xDerechoCm,
    wxSuperiorCm3: wSeguro(ixCm4, ySuperiorCm),
    wxInferiorCm3: wSeguro(ixCm4, yInferiorCm),
    wyIzquierdoCm3: wSeguro(iyCm4, xIzquierdoCm),
    wyDerechoCm3: wSeguro(iyCm4, xDerechoCm),
    radioGiroXCm: Math.sqrt(ixCm4 / areaCm2),
    radioGiroYCm: Math.sqrt(iyCm4 / areaCm2),
    i1Cm4,
    i2Cm4,
    anguloPrincipalGrados,
    anchoTotalCm: xMax - xMin,
    altoTotalCm: yMax - yMin,
  };
}
