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
 * Los de los materiales están verificados contra el Anejo 19. Los de las
 * acciones no: el Anejo 19 no los trae —su art. 2.4.1 (1), pág. 19, remite al
 * apartado 6 del Anejo 18— y ese anejo no está entre las fuentes del proyecto.
 * Van con la referencia que aportó @nachoosuarez, atribuida, no comprobada acá.
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
 * γF — coeficiente único con el que zapatas y pilotes mayoran su carga vertical.
 * Esas verificaciones reciben cargas características: el terreno se comprueba
 * con Nk sin mayorar, pero el armado y el punzonamiento necesitan Nd.
 *
 * Se llama γF y no γQ a propósito. γQ es el de las acciones variables, y acá el
 * 1,5 no multiplica una acción variable: multiplica `Nk`, que es una carga
 * vertical característica agregada, con la parte permanente y la variable juntas
 * (ver `CargasZapata`). Ponerle γQ afirmaría una separación G/Q que el motor no
 * hace. Aplicarle 1,5 a todo queda del lado seguro, porque a la parte permanente
 * le tocaría 1,35, pero eso es una simplificación conservadora y conviene que el
 * nombre lo deje ver. γF es justamente el genérico de acción, que engloba a los
 * dos.
 *
 * Separar Nk en Ng y Nq es la mejora que haría posible usar γG y γQ acá; está
 * anotada en TODO.md. Cambiaría resultados, así que no entra en un renombrado.
 *
 * Valor 1,5: coincide con el γQ de UNE-EN 1990, tabla A.1.2(B), pág. 47, según
 * la referencia que aportó @nachoosuarez. No está entre las fuentes del
 * proyecto, así que no se pudo comprobar acá.
 */
export const GAMMA_F = 1.5;

/**
 * γG — coeficiente de las acciones permanentes desfavorables. Es el que
 * corresponde cuando lo que se mayora es un peso propio y no una carga variable:
 * el cabezal lo aplica al suyo.
 *
 * UNE-EN 1990, tabla A.1.2(B), pág. 47. La referencia la aportó @nachoosuarez;
 * no está entre las fuentes del proyecto, así que no se pudo comprobar acá.
 */
export const GAMMA_G = 1.35;
