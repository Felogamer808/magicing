## Apéndice B Métodos recomendados para estimar la deformación de fluencia y retracción

## B.1 Ecuaciones básicas para determinar el coeficiente de fluencia

(1) El coeficiente de fluencia $\varphi(t, t_{0})$ se puede calcular a partir de:

$$
\varphi (t, t _ {0}) = \varphi_ {0} \cdot \beta_ {c} (t, t _ {0})\tag{B.1}
$$

donde $\varphi_{0}$ es el coeficiente básico de fluencia, que puede estimarse mediante la siguiente expresión:

$$
\varphi_ {0} = \varphi_ {H R} \cdot \beta (f _ {c m}) \cdot \beta (t _ {0})\tag{B.2}
$$

donde:

$\varphi_{HR}$ es un coeficiente que permite tener en cuenta el efecto de la humedad relativa sobre el coeficiente básico de fluencia:

$$
\varphi_ {H R} = 1 + \frac {1 - H R / 1 0 0}{0 , 1 \cdot \sqrt [ 3 ]{h _ {0}}} \quad \mathrm{si} f _ {c m} \leq 3 5 \mathrm{N/mm} ^ {2}\tag{B.3a}
$$

$$
\varphi_ {H R} = \left[ 1 + \frac {1 - H R / 1 0 0}{0 , 1 \cdot \sqrt [ 3 ]{h _ {0}}} \cdot \alpha_ {1} \right] \cdot \alpha_ {2} \qquad \mathrm{si} f _ {c m} > 3 5 \mathrm{N/mm} ^ {2}\tag{B.3b}
$$

HR es la humedad relativa del ambiente, dada en %

$\beta(f_{cm})$ es un coeficiente que permite tener en cuenta el efecto de la resistencia del hormigón sobre el coeficiente básico de fluencia:

$$
\beta (f _ {c m}) = \frac {1 6 , 8}{\sqrt {f _ {c m}}}\tag{B.4}
$$

$f_{cm}$ es la resistencia media a compresión del hormigón, en N/mm2, a la edad de 28 días $\beta(t_{0})$ es un coeficiente que permite tener en cuenta el efecto de la edad de puesta en carga del hormigón sobre el coeficiente básico de fluencia:

$$
\beta (t _ {0}) = \frac {1}{(0 , 1 + t _ {0} ^ {0 , 2 0})}\tag{B.5}
$$

$h_{0}$ es el tamaño teórico del elemento en mm, donde:

$$
h_0 = \frac{2A_c}{u}\tag{B.6}
$$

$A_{c}$ es el área de la sección

u es el perímetro del elemento en contacto con la atmósfera

$\beta_{c}(t,t_{0})$ es un coeficiente que describe el desarrollo de la fluencia con el paso del tiempo tras la puesta en carga. Puede estimarse mediante la siguiente expresión:

$$
\beta_ {c} (t, t _ {0}) = \left[ \frac {(t - t _ {0})}{(\beta_ {H} + t - t _ {0})} \right] ^ {0, 3}\tag{B.7}
$$

t es la edad del hormigón en días en el momento considerado

$t_{0}$ es la edad de puesta en carga del hormigón, en días

$(t - t_{0})$ periodo durante el cual se aplica la carga, en días

$\beta_{H}$ es un coeficiente que depende de la humedad relativa (HR en %) y del tamaño teórico del elemento ( $h_{0}$ en mm). Se puede estimar a partir de:

$$
\beta_ {H} = 1, 5 [ 1 + (0, 0 1 2 \cdot H R) ^ {1 8} ] h _ {0} + 2 5 0 \leq 1 5 0 0 \mathrm{si} f _ {c m} \leq 3 5 \mathrm{N/mm} ^ {2}\tag{B.8a}
$$

$$
\beta_ {H} = 1, 5 [ 1 + (0, 0 1 2 \cdot H R) ^ {1 8} ] h _ {0} + 2 5 0 \alpha_ {3} \leq 1 5 0 0 \alpha_ {3} \text {si} f _ {c m} \geq 3 5 \text {N / mm} ^ {2}\tag{B.8b}
$$

Sec. I. Pág. 98470

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 187 -->

$\alpha_{1/2/3}$ son factores que tienen en cuenta la influencia de la resistencia del hormigón:

$$
\alpha_ {1} = \left[ \frac {3 5}{f _ {c m}} \right] ^ {0, 7} \qquad \alpha_ {2} = \left[ \frac {3 5}{f _ {c m}} \right] ^ {0, 2} \qquad \alpha_ {3} = \left[ \frac {3 5}{f _ {c m}} \right] ^ {0, 5}\tag{B.8c}
$$

(2) El efecto del tipo de cemento (véase el apartado 3.1.2(6)) sobre el coeficiente de fluencia del hormigón se puede tener en cuenta modificando la edad de puesta en carga, $t_{0}$ , en la expresión (B.5), de acuerdo con la siguiente expresión:

$$
t _ {0} = t _ {0, T} \cdot \left(\frac {9}{2 + t _ {0 , T} ^ {1 , 2}} + 1\right) ^ {\alpha} \geq 0, 5\tag{B.9}
$$

donde:

$t_{0,T}$ es la edad de puesta en carga del hormigón, en días, corregida en función de la temperatura y de acuerdo con la expresión (B.10)

(3) El efecto de la temperatura alta o baja sobre la madurez de hormigón, dentro del intervalo 0°C – 80°C, se puede tener en cuenta ajustando la edad del hormigón de acuerdo con la siguiente expresión:

$$
t _ {T} = \sum_ {i = 1} ^ {n} e ^ {- (4 0 0 0 / [ 2 7 3 + T (\Delta t _ {i}) ] - 1 3, 6 5)} \cdot \Delta t _ {i}\tag{B.10}
$$

donde:

$t_{T}$ es la edad de puesta en carga del hormigón ajustada, que sustituye al parámetro t en las correspondientes ecuaciones

$$
T (\Delta t _ {i})
$$

$$
^\circ C
$$

$$
\Delta t _ {i}
$$

$\Delta t_{i}$ es el número de días en los que predomina una temperatura T.

El coeficiente medio de variación de los datos de fluencia, estimados anteriormente y deducidos a partir de un banco de datos informáticos de resultados de ensayos de laboratorio, es del orden del 20%.

Los valores $\varphi(t,t_{0})$ que se establecen en párrafos anteriores deberán estar asociados al módulo de elasticidad tangente $E_{c}$ .

Cuando se considere satisfactoria una estimación menos precisa, se pueden adoptar los valores que se establecen en la figura A19.3.1 del apartado 3.1.4 para la fluencia del hormigón a una edad de 70 años.

## B.2 Ecuaciones básicas para determinar la deformación de retracción por secado

(1) La deformación básica de retracción por secado $\varepsilon_{cd,0}$ se calcula a partir de:

$$
\varepsilon_ {c d, 0} = 0, 8 5 \left[ (2 2 0 + 1 1 0 \cdot \alpha_ {d s 1}) e x p \left(- \alpha_ {d s 2} \cdot \frac {f _ {c m}}{f _ {c m 0}}\right) \right] \cdot 1 0 ^ {- 6} \cdot \beta_ {H R}\tag{B.11}
$$

$$
\beta_ {H R} = 1, 5 5 \left[ 1 - \left(\frac {H R}{H R _ {0}}\right) ^ {3} \right]\tag{B.12}
$$

donde:

$$
\begin{array}{l l} f _ {c m} & \text {es la resistencia media a compresión (N / mm^2) ()} \\ f _ {c m 0} = 1 0 N / m m ^ {2} \\ \alpha_ {d s 1} & \text {es un coeficiente que depende del tipo de cemento (véase el apartado 3.1.2(6))} \end{array}
$$

Sec. I. Pág. 98471

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 188 -->

= 3 para cemento de Clase S

= 4 para cemento de Clase N

= 6 para cemento de Clase R

$\alpha_{ds2}$ es un coeficiente que depende del tipo de cemento

= 0,13 para cemento de Clase S

= 0,12 para cemento de Clase N

= 0,11 para cemento de Clase R

HR es la humedad relativa del ambiente (%)

NOTA: $\exp\{\}$ tiene el mismo significado que $e^{()}$ .

Sec. I. Pág. 98472

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 189 -->

