## Apéndice D Propuesta de método de cálculo detallado de las pérdidas por relajación del pretensado

## D.1 Generalidades

(1) En el caso de que las pérdidas por relajación se calculen para diferentes intervalos de tiempo (etapas) donde la tensión en la armadura activa no es constante, por ejemplo debido al acortamiento elástico del hormigón, debe adoptarse un método de tiempo equivalente.

(2) El concepto del método de tiempo equivalente se muestra en la figura A19.D.1, en la cual en el instante $t_{i}$ existe una deformación instantánea de la armadura activa, siendo:

$\sigma_{p,i}^{-}$ la tensión de tracción en la armadura activa justo antes del instante $t_{i}$

$\sigma_{p,i}^{+}$ la tensión de tracción en la armadura activa justo después del instante $t_{i}$

$\sigma_{p,i-1}^{+}$ la tensión de tracción en la armadura activa en la etapa anterior

$\Delta\sigma_{pr,i-1}$ el valor absoluto de la pérdida por relajación en la etapa anterior

$\Delta\sigma_{pr,i}$ el valor absoluto de la pérdida por relajación en la etapa considerada.

(3) Sea $\sum_{1}^{i-1}\Delta\sigma_{pr,j}$ la suma de todas las pérdidas por relajación de las etapas anteriores y sea $t_{e}$ el tiempo equivalente (en horas) necesario para obtener dicha suma, de forma que se satisfagan las expresiones de las pérdidas por relajación en función del tiempo establecidas en el apartado 3.3.2(7), con una tensión inicial igual a $\sigma_{p,i}^{+}+\sum_{1}^{i-1}\Delta\sigma_{pr,j}$ y con $\mu=\frac{\sigma_{p,i}^{+}+\sum_{1}^{i-1}\Delta\sigma_{pr,j}}{f_{pk}}$ .

(4) Por ejemplo, para una armadura activa de Clase 2, el valor del parámetro $t_{e}$ que se establece en la expresión (3.29) será:

$$
\Sigma_ {1} ^ {i - 1} \Delta \sigma_ {p r, j} = 0, 6 6 \rho_ {1 0 0 0} e ^ {9, 0 9 \mu} \left(\frac {t _ {e}}{1 0 0 0}\right) ^ {0, 7 5 (1 - \mu)} \{\sigma_ {p, i} ^ {+} + \Sigma_ {1} ^ {i - 1} \Delta \sigma_ {p r, j} \} 1 0 ^ {- 5} \tag {D.1}
$$

(5) Después de resolver la ecuación anterior para $t_{e}$ , se puede aplicar la misma formulación con el fin de estimar las pérdidas por relajación de la etapa considerada, $\Delta\sigma_{pr,i}$ (donde el tiempo equivalent $t_{e}$ se añade al intervalo de tiempo considerado):

$$
\Delta \sigma_ {p r, i} = 0, 6 6 \rho_ {1 0 0 0} e ^ {9, 0 9 \mu} \left(\frac {t _ {e} + \Delta t _ {i}}{1 0 0 0}\right) ^ {0, 7 5 (1 - \mu)} \{\sigma_ {p, i} ^ {+} + \sum_ {1} ^ {i - 1} \Delta \sigma_ {p r, j} \} 1 0 ^ {- 5} - \sum_ {1} ^ {i - 1} \Delta \sigma_ {p r, j} (\mathsf {D}. 2)
$$

(6) Se aplicará el mismo principio para las tres clases de tendones de pretensado.

Sec. I. Pág. 98474

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 191 -->

