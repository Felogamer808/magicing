/**
 * Coeficientes parciales de seguridad, en un solo lugar y con su artículo.
 *
 * Estaban como literales repartidos por los módulos, y eso esconde un problema:
 * γc y γf valen los dos 1,5 pero son cosas distintas —uno minora un material,
 * el otro mayora una acción— así que un `1.5` suelto no dice cuál es. El día que
 * uno cambie hay que poder moverlo sin arrastrar al otro.
 *
 * Este módulo no cambia ningún valor: son los que ya usaba el código y que los
 * tests fijan contra la planilla original. Sólo les pone nombre.
 *
 * El Ω de AISC vive en los módulos de `aisc/`, que siguen otro marco normativo y
 * no deben importar de acá aunque algún número coincida.
 */

/**
 * γc — coeficiente parcial del hormigón, situación permanente o transitoria.
 * Anejo 19, art. 2.4.2.4 (1), tabla A19.2.1, pág. 20.
 * (En situación accidental la tabla da 1,3, que el motor todavía no contempla.)
 */
export const GAMMA_C = 1.5;

/**
 * γs — coeficiente parcial del acero de armar, misma situación y tabla.
 * Anejo 19, art. 2.4.2.4 (1), tabla A19.2.1, pág. 20.
 * (Accidental: 1,0.)
 */
export const GAMMA_S = 1.15;

/**
 * γ para acciones variables desfavorables, usado por las verificaciones que
 * reciben cargas características y mayoran por dentro: en zapatas y pilotes el
 * terreno se comprueba con Nk sin mayorar, pero el armado y el punzonamiento
 * necesitan Nd.
 *
 * Coincide en valor con GAMMA_C y no es lo mismo: éste multiplica una acción.
 *
 * SIN VERIFICAR CONTRA LA NORMA: el Anejo 19 no trae los coeficientes de las
 * acciones. Su art. 2.4.1 (1), pág. 19, remite al apartado 6 del Anejo 18, que
 * no está entre las fuentes del proyecto. El valor es el que ya venía usando el
 * código; antes de apoyarse en él para algo nuevo, contrastarlo con el Anejo 18.
 */
export const GAMMA_F = 1.5;

/**
 * γ para acciones permanentes desfavorables, que es el que corresponde cuando lo
 * que se mayora es un peso propio y no una carga variable (el cabezal lo aplica
 * a su propio peso).
 *
 * SIN VERIFICAR CONTRA LA NORMA, por el mismo motivo que GAMMA_F.
 */
export const GAMMA_G = 1.35;
