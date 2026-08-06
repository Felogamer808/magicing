## 11 Estructuras de hormigón con áridos ligeros

## 11.1 Generalidades

(1) En este apartado se incluyen una serie de requisitos adicionales a los recogidos en el Anejo 8 de este Código Estructural “Recomendaciones para la utilización de hormigón ligero”.

## 11.1.1 Alcance

(1) Los apartados del 1 al 10 y el 12 de este anejo, serán de aplicación, a menos que sean sustituidas por criterios especiales incluidos en este apartado. Los valores de resistencia que figuran en las expresiones procedentes de la tabla A19.3.1 se sustituirán por los que corresponden a hormigones con áridos ligeros indicados en la tabla A19.11.3.1.

(2) El apartado 11 se aplica a hormigones de estructura cerrada fabricados con áridos ligeros, naturales o artificiales, a menos que la experiencia indique que puede adoptarse, de manera fiable y en condiciones de seguridad criterios diferentes a los establecidos en este apartado.

## 11.1.2 Notación específica

(1) Para el hormigón ligero se emplea la siguiente notación específica:

HL las clases resistentes de hormigón con áridos ligeros están precedidas por las letras HL

$\eta_{E}$ coeficiente de conversión para el cálculo del módulo de elasticidad

$\eta_{1}$ coeficiente para determinar la resistencia a tracción

$\eta_{2}$ coeficiente para determinar el coeficiente de fluencia

$\eta_{3}$ coeficiente para determinar la retracción de secado

ρ densidad del hormigón con áridos ligeros secado en estufa, en kg/m³.

Para las propiedades mecánicas se utilizará el subíndice adicional l (de ligero).

## 11.2 Bases de cálculo

(1) Para los hormigones ligeros se puede aplicar el apartado 2 de este anejo sin necesidad de hacer modificaciones.

## 11.3 Materiales

Se seguirán los requisitos recogidos en el apartado 5.1 del Anejo 8 de este Código Estructural.

## 11.3.1 Hormigón

(1) Los hormigones con áridos ligeros se clasifican, de acuerdo con su densidad, como se muestra en la tabla A19.11.1. Esta tabla incluye, además, las densidades correspondientes al hormigón en masa y al hormigón armado (con unas cuantías de armaduras normales) que puede utilizarse para el cálculo del peso propio o las cargas permanentes. De forma alternativa, la densidad se puede establecer como un valor objetivo.

Sec. I. Pág. 98455

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 172 -->

(2) Alternativamente, la contribución de la armadura a la densidad puede determinarse mediante el cálculo.

**Tabla A19.11.1 Clases de densidad y densidades de cálculo correspondientes a los hormigones con áridos ligeros**

<table><tr><td colspan="2">Clase de densidad</td><td>1,0</td><td>1,2</td><td>1,4</td><td>1,6</td><td>1,8</td><td>2,0</td></tr><tr><td colspan="2">Densidad( $kg/m^{3}$ )</td><td>801-1000</td><td>1001-1200</td><td>1201-1400</td><td>1401-1600</td><td>1601-1800</td><td>1801-2000</td></tr><tr><td rowspan="2">Densidad( $kg/m^{3}$ )</td><td>Hormigón en masa</td><td>1050</td><td>1250</td><td>1450</td><td>1650</td><td>1850</td><td>2050</td></tr><tr><td>Hormigón armado</td><td>1150</td><td>1350</td><td>1550</td><td>1750</td><td>1950</td><td>2150</td></tr></table>

(3) La resistencia a tracción del hormigón con áridos ligeros puede obtenerse multiplicando los valores de $f_{ct}$ , indicados en la tabla A19.3.1, por el coeficiente:

$$
\eta_ {1} = 0, 4 0 + 0, 6 0 \rho / 2 2 0 0\tag{11.1}
$$

donde:

ρ es el límite superior de la densidad del hormigón secado en estufa para la clase correspondiente, de acuerdo con la tabla A19.11.1.

## 11.3.2 Deformación elástica

Se adoptará lo indicado en el apartado 4.1 del Anejo 8 de este Código Estructural.

En el caso de necesitar datos más precisos, por ejemplo cuando las deformaciones son de gran importancia, se deben realizar ensayos para determinar los valores de $E_{lcm}$ , de acuerdo con la norma ISO 6784.

Sec. I. Pág. 98456

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 173 -->

**Tabla A19.11.3.1 Características de tensión y deformación del hormigón ligero**

<table><tr><td colspan="14">Classes resistentes para los hormigones ligeros</td><td>Expresión analítica/Comentarios</td></tr><tr><td> $f_{lck}\ (N/mm^2)$ </td><td>12</td><td>16</td><td>20</td><td>25</td><td>30</td><td>35</td><td>40</td><td>45</td><td>50</td><td>55</td><td>60</td><td>70</td><td>80</td><td></td></tr><tr><td> $f_{lcm}\ (N/mm^2)$ </td><td>17</td><td>22</td><td>28</td><td>33</td><td>38</td><td>43</td><td>48</td><td>53</td><td>58</td><td>63</td><td>68</td><td>78</td><td>88</td><td>Para  $f_{lck} \geq 20$  $f_{lcm} = f_{lck} + 8 (N/mm^2)$ </td></tr><tr><td> $f_{lctm}\ (N/mm^2)$ </td><td colspan="13"> $f_{lctm} = f_{ctm} \cdot \eta_1$ </td><td> $\eta_1 = 0,40 + 0,60\rho/2200$ </td></tr><tr><td> $f_{lctk,0,05}\ (N/mm^2)$ </td><td colspan="13"> $f_{lctk,0,05} = f_{ctk,0,05} \cdot \eta_1$ </td><td>Cuantil del 5%</td></tr><tr><td> $f_{lctk,o,95}\ (N/mm^2)$ </td><td colspan="13"> $f_{lctk,0,95} = f_{ctk,0,95} \cdot \eta_1$ </td><td>Cuantil del 95%</td></tr><tr><td> $E_{lcm}\ (103N/mm^2)$ </td><td colspan="13"> $E_{lcm} = E_{cm} \cdot \eta_E$ </td><td> $\eta_E = (\rho/2200)^2$ </td></tr><tr><td> $\varepsilon_{lc1}$  ( )</td><td colspan="13"> $k\ f_{lcm}/(E_{cm} \cdot \eta_E) k = 1,1$  para hormigones con áridos ligeros finos. $k = 1,0$  para el resto de hormigones con áridos ligeros.</td><td>Véase la figura A19.3.2</td></tr><tr><td> $\varepsilon_{lcu1}$  ( )</td><td colspan="13"> $\varepsilon_{lc1}$ </td><td>Véase la figura A19.3.2</td></tr><tr><td> $\varepsilon_{lc2}$  ( )</td><td colspan="8">2,0</td><td>2,2</td><td>2,3</td><td>2,4</td><td colspan="2">2,5</td><td>Véase la figura A19.3.3</td></tr><tr><td> $\varepsilon_{lcu2}$  ( )</td><td colspan="8"> $3,5\ \eta_1$ </td><td>3,1 $\eta_1$ </td><td>2,9 $\eta_1$ </td><td>2,7 $\eta_1$ </td><td>2,6 $\eta_1$ </td><td colspan="2"> $|\varepsilon_{lcu2}| \geq |\varepsilon_{lc2}|$ </td></tr><tr><td>n</td><td colspan="8">2,0</td><td>1,75</td><td>1,6</td><td>1,45</td><td>1,4</td><td colspan="2"></td></tr><tr><td> $\varepsilon_{lc3}$  ( )</td><td colspan="8">1,75</td><td>1,8</td><td>1,9</td><td>2,0</td><td>2,2</td><td colspan="2">Véase la figura A19.3.4</td></tr><tr><td> $\varepsilon_{lcu3}$  ( )</td><td colspan="8"> $3,5\ \eta_1$ </td><td>3,1 $\eta_1$ </td><td>2,9 $\eta_1$ </td><td>2,7 $\eta_1$ </td><td>2,6 $\eta_1$ </td><td colspan="2"> $|\varepsilon_{lcu3}| \geq |\varepsilon_{lc3}|$ </td></tr></table>

B

> Núm. 190

> Martes 10 de agosto de 2021

> BOLETÍN OFICIAL DEL ESTADO

> Sec. I. Pág. 98457

cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 174 -->

## 11.3.3 Fluencia y retracción

(1) Para el hormigón con áridos ligeros el coeficiente de fluencia $\varphi$ puede suponerse igual al valor correspondiente a un hormigón de densidad convencional multiplicado por un coeficiente $(\rho/2200)^{2}$ .

Las deformaciones de fluencia obtenidas deberán multiplicarse por un coeficiente $\eta_{2}$ , que se obtiene mediante las siguientes expresiones:

$$
\begin{array}{l l} \eta_ {2} = 1, 3 & \quad \mathrm{para} f _ {l c k} \leq 1 6 \mathrm{N/mm} ^ {2} \\ \eta_ {2} = 1, 0 & \quad \mathrm{para} f _ {l c k} \leq 2 0 \mathrm{N/mm} ^ {2} \end{array}
$$

(2) Los valores de la retracción final de secado para los hormigones ligeros puede obtenerse multiplicando los valores de la tabla A19.3.2, correspondientes a hormigones de densidad convencional, por un coeficiente $\eta_{3}$ , que se establece en las siguientes expresiones:

$$
\begin{array}{l l} \eta_ {3} = 1, 5 & \quad \text {para} f _ {l c k} \leq 1 6 \mathrm{N} / \mathrm{mm} ^ {2} \\ \eta_ {3} = 1, 2 & \quad \text {para} f _ {l c k} \leq 2 0 \mathrm{N} / \mathrm{mm} ^ {2} \end{array}
$$

(3) Las expresiones (3.11), (3.12) y (3.13), que proporcionan información sobre la retracción autógena, establecen los valores máximos para los hormigones con áridos ligeros cuando estos no proporcionan agua a la microestructura durante el secado. Si se emplean áridos ligeros saturados de agua, completa o parcialmente, los valores de la retracción autógena se verán considerablemente reducidos.

## 11.3.4 Diagramas tensión-deformación para el análisis estructural no lineal

(1) En el caso de hormigones con áridos ligeros los valores de $\varepsilon_{c1}$ y $\varepsilon_{cu1}$ de la figura A19.3.2 se deben reemplazar por los valores $\varepsilon_{lc1}$ y $\varepsilon_{lcu1}$ de la tabla A19.11.3.1.

## 11.3.5 Valores de cálculo de las resistencias a tracción y a compresión

(1) El valor de cálculo de la resistencia a compresión se define como:

$$
f _ {l c d} = \alpha_ {l c c} f _ {l c k} / \gamma_ {C}\tag{11.3.15}
$$

donde $\gamma_{C}$ es el coeficiente parcial de seguridad del hormigón (véase el apartado 2.4.2.4) y $\alpha_{lcc}$ es un coeficiente de acuerdo con 3.1.6(1), cuyo valor será $\alpha_{lcc} = 0,85$ .

(2) El valor de cálculo de la resistencia a tracción se define como:

$$
f _ {l c t d} = \alpha_ {l c t} f _ {l c t k} / \gamma_ {C}\tag{11.3.16}
$$

donde $\gamma_{C}$ es el coeficiente parcial de seguridad del hormigón (véase el apartado 2.4.2.4) y $\alpha_{lct}$ es un coeficiente de acuerdo con el apartado 3.1.6(2), cuyo valor será $\alpha_{lct} = 0,85$ .

## 11.3.6 Diagrama tensión-deformación para el cálculo de las secciones

(1) En el caso de hormigones con áridos ligeros los valores de $\varepsilon_{c2}$ y $\varepsilon_{cu2}$ de la figura A19.3.3 se deben reemplazar por los valores $\varepsilon_{lc2}$ y $\varepsilon_{lcu2}$ de la tabla A19.11.3.1.

(2) De igual forma los valores de $\varepsilon_{c3}$ y $\varepsilon_{cu3}$ de la figura A19.3.4 se deben reemplazar por los valores $\varepsilon_{lc3}$ y $\varepsilon_{lcu3}$ de la tabla A19.11.3.1.

## 11.3.7 Hormigón confinado

(1) Si no se dispone de una información más precisa, se podrá utilizar el diagrama tensión-deformación que de la figura A19.3.6, pero con un incremento de la resistencia y deformación característica de acuerdo con:

$$
f _ {l c k, c} = f _ {l c k} (1, 0 + k \sigma_ {2} / f _ {l c k})\tag{11.3.24}
$$

donde k tiene varios valores en función de los tipos de áridos:

Sec. I. Pág. 98458

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 175 -->

k = 1,1 para hormigón con árido grueso ligero y árido fino normal

k = 1,0 para hormigones con todos los áridos ligeros, tanto el grueso como el fino

$$
\varepsilon_ {l c 2, c} = \varepsilon_ {l c 2} (f _ {l c k c} / f _ {l c k}) ^ {2}\tag{11.3.26}
$$

$$
\varepsilon_ {l c u 2, c} = \varepsilon_ {l c u 2} + 0, 2 \sigma_ {2} / f _ {l c k}\tag{11.3.27}
$$

donde $\varepsilon_{lc2}$ y $\varepsilon_{lcu2}$ se establecen en la tabla A19.11.3.1.

## 11.4 Durabilidad y recubrimiento de la armadura

Se adoptará lo indicado en el apartado 6 del Anejo 8 de este Código Estructural.

## 11.4.1 Condiciones ambientales

(1) Las clases de exposición indicadas en la tabla A19.4.1 pueden utilizarse tanto para los hormigones con áridos ligeros como para los hormigones convencionales.

## 11.4.2 Recubrimiento y propiedades del hormigón

(1) Para los hormigones con áridos ligeros, los valores mínimos de recubrimiento establecidos en el apartado 4.4.1 deberán incrementarse en 5 mm.

## 11.5 Análisis estructural

## 11.5.1 Capacidad de giro

NOTA: Para el hormigón con áridos ligeros, se debe multiplicar el valor de $\theta_{pl,d}$ , indicado en la figura 5.6, por un coeficiente $\varepsilon_{lcu2}/\varepsilon_{cu2}$ .

## 11.6 Estados Límite Últimos

## 11.6.1 Elementos que no requieren armadura de cortante

(1) El valor de cálculo de la resistencia a cortante, $V_{lRd,c}$ de un elemento de hormigón ligero sin armadura de cortante se establece mediante:

$$
V _ {l R d, c} = \big [ C _ {l R d, c} \eta_ {1} k (1 0 0 \rho_ {l} f _ {l c k}) ^ {1 / 3} + k _ {1} \sigma_ {c p} \big ] b _ {w} d \geq \big (\eta_ {1} v _ {l, m i n} + k _ {1} \sigma_ {c p} \big) b _ {w} d\tag{11.6.2}
$$

donde $\eta_{1}$ se define en la expresión (11.1), $f_{lck}$ se toma de la tabla A19.11.3.1 y $\sigma_{cp}$ es la tensión media de compresión en la sección debida al esfuerzo axil y al pretensado, cumpliendo $\sigma_{cp} < 0,2f_{cd}$ . Los valores de $C_{lRd,c}$ , $v_{l,min}$ y $k_{1}$ a utilizar serán $0,18/\gamma_{C}$ , $0,035k^{3/2}f_{lck}^{1/2}$ y 0,15 respectivamente.

(2) El esfuerzo cortante, $V_{Ed}$ , calculado sin el coeficiente de reducción $\beta$ (véase el apartado 6.2.2(6)), debe satisfacer siempre la siguiente condición:

$$
V _ {E d} \leq 0, 5 b _ {w} d \nu_ {1} f _ {l c d}\tag{11.6.5}
$$

donde:

$$
\nu_ {1}
$$

se obtiene de acuerdo con el apartado 11.6.2(1).

## 11.6.2 Elementos que requieren armadura de cortante

(1) El coeficiente de reducción para la capacidad resistente de las bielas de hormigón es $\nu_{1}$ cuyo valor se establece mediante la expresión (11.6.6).

$$
\nu_ {1} = 0, 5 \eta_ {1} (1 - f _ {l c k} / 2 5 0)\tag{11.6.6}
$$

donde $\eta_{1}=0,4+0,6\frac{\rho}{2200}$ , siendo $\rho$ la densidad del hormigón en $kg/m^{3}$ , que, de acuerdo al Anejo 8 del Código Estructural, estará comprendida entre $1200\ kg/m^{3}<\rho\leq2000\ kg/m^{3}$ .

Sec. I. Pág. 98459

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 176 -->

## 11.6.3 Torsión

## 11.6.3.1 Procedimiento de cálculo

(1) Para el caso del hormigón con áridos ligeros, en la expresión (6.30) se tomará el valor de $\nu$ igual a $\nu_{1}$ , de acuerdo con el apartado 11.6.2(1).

## 11.6.4 Punzonamiento

## 11.6.4.1 Resistencia a punzonamiento de losas y bases de pilares sin armadura de cortante

(1) La resistencia a punzonamiento por unidad de superficie de una losa de hormigón ligero se establece mediante:

$$
V _ {l R d, c} = C _ {l R d, c} k \eta_ {1} (1 0 0 \rho_ {l} f _ {l c k}) ^ {1 / 3} + k _ {2} \sigma_ {c p} \geq \left(\eta_ {1} v _ {l, m i n} + k _ {1} \sigma_ {c p}\right)\tag{11.6.47}
$$

donde:

$$
\begin{array}{l l} \eta_ {1} & \text {se define en la expresión (11.1)} \\ C _ {l R d, c} & \text {véase el apartado 11.6.1(1)} \\ v _ {l, \min} & \text {véase el apartado 11.6.1(1)} \\ k _ {2} = 0, 0 8. \end{array}
$$

(2) La resistencia a punzonamiento, $v_{lRd}$ , de la base de un pilar de hormigón con áridos ligeros se establece mediante:

$$
v _ {l R d, c} = C _ {l R d, c} \eta_ {1} k (1 0 0 \rho_ {l} f _ {l c k}) ^ {1 / 3} 2 d / a \geq \eta_ {1} v _ {l, m i n} \cdot 2 d / a\tag{11.6.50}
$$

donde:

$$
\begin{array}{l l} \eta_ {1} & \text {se define en la expresión (11.1)} \\ \rho_ {l} \geq 0, 0 0 5 \\ C _ {l R d, c} & \text {véase el apartado 11.6.1(1)} \\ v _ {l, \min} & \text {véase el apatado 11.6.1(1)}. \end{array}
$$

## 11.6.4.2 Resistencia a punzonamiento de losas y bases de pilares con armadura de cortante

(1) En el caso de que sea necesaria la armadura de cortante, la resistencia a punzonamiento se establece mediante:

$$
v _ {l R d, c s} = 0, 7 5 v _ {l R d, c} + 1, 5 \left(\frac {d}{s _ {r}}\right) A _ {s w} f _ {y w d, e f f} \left(\frac {1}{u _ {1} d}\right) s e n \alpha \leq k _ {m a x} v _ {l R d, c}\tag{11.6.52}
$$

donde $v_{lRd,c}$ se define en la expresión (11.6.47) o (11.6.50), según corresponda.

(2) En la zona cercana a las proximidades del pilar, se limitará la resistencia a punzonamiento a un valor máximo establecido mediante la expresión siguiente:

$$
v _ {E d} = \frac {V _ {E d}}{u _ {0} d} \leq v _ {l R d, m a x}\tag{11.6.53}
$$

El valor de $v_{lRd,max}$ es $0,4\nu f_{lcd}$ , donde $\nu$ se tomará igual a $\nu_{1}$ , establecido en la expresión (11.6.6).

## 11.6.5 Áreas parcialmente cargadas

(1) Para una distribución uniforme de carga en un área $A_{c0}$ (véase la figura 6.29) la fuerza resistente concentrada se puede determinar de la siguiente manera:

$$
F _ {R d u} = A _ {c 0} \cdot f _ {l c d} \cdot [ A _ {c 1} / A _ {c 0} ] ^ {\rho / 4 4 0 0} \leq 3, 0 \cdot f _ {l c d} \cdot A _ {c 0} \left(\frac {\rho}{2 2 0 0}\right)\tag{11.6.63}
$$

Sec. I. Pág. 98460

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 177 -->

## 11.6.6 Fatiga

(1) Para la comprobación de fatiga de los elementos fabricados con hormigón con áridos ligeros será necesario un estudio especial. Se debe hacer referencia a la Evaluación Técnica Europea.

## 11.7 Estados Límite de Servicio

(1) En el caso de hormigones con áridos ligeros, la relación luz/canto útil de los elementos de hormigón armado sin axil de compresión, establecida en el apartado 7.4.2, deberá reducirse mediante un coeficiente $\eta_{E}^{0,15}$ .

## 11.8 Definición de los detalles de armado. Generalidades

## 11.8.1 Diámetros admisibles de los mandriles para el doblado de las barras

(1) En el caso de hormigones con áridos ligeros deberán incrementarse un 50% los tamaños de los mandriles establecidos en el apartado 8.3 para un hormigón convencional, con el fin de evitar la rotura del hormigón en las patillas, ganchos y ganchos en U.

## 11.8.2 Tensión última de adherencia

(1) El valor de cálculo de la tensión última de adherencia para las barras en hormigones ligeros puede calcularse utilizando la expresión (8.2), sustituyendo el valor de $f_{ctd}$ por $f_{lctd}$ con $f_{lctd} = f_{lctk,0,05}/\gamma_{C}$ . Los valores de $f_{lctk,0,05}$ se encuentran en la tabla A19.11.3.1.

## 11.9 Definición de los detalles de armado de los elementos y reglas particulares

(1) El diámetro de las barras embebidas en los hormigones con áridos ligeros no debe superar los 32 mm. Para este tipo de hormigones, los grupos de barras no deben tener más de dos barras y el diámetro equivalente no debe superar los 45 mm.

## 11.10 Reglas adicionales para elementos y estructuras de hormigón prefabricado

(1) En el caso de hormigones con áridos ligeros, se puede aplicar el apartado 10 sin necesidad de realizar modificaciones.

## 11.11 Estructuras de hormigón en masa y ligeramente armado

(1) En el caso de hormigones con áridos ligeros se puede aplicar el apartado 12 sin necesidad de realizar modificaciones.

