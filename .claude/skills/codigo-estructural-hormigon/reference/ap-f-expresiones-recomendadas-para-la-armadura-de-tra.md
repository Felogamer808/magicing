## Apéndice F Expresiones recomendadas para la armadura de tracción bajo condiciones de tensión plana

## F.1 Generalidades

(1) Este apéndice no incluye expresiones para la armadura comprimida.

(2) La armadura de tracción en un elemento sometido a tensiones planas ortogonales $\sigma_{Edx}$ , $\sigma_{Edy}$ y $\tau_{Edxy}$ puede calcularse empleando el procedimiento que a continuación se expone. Las tensiones de compresión deben tomarse como positivas, con $\sigma_{Edx} > \sigma_{Edy}$ , y la dirección de la armadura debe coincidir con los ejes x e y.

La resistencia a tracción que proporciona la armadura debe determinarse a partir de:

$$
f _ {t d x} = \rho_ {x} f _ {y d} \texttt {y} f _ {t d y} = \rho_ {y} f _ {y d}\tag{F.1}
$$

donde $\rho_{x}$ y $\rho_{y}$ son las cuantías geométricas de armadura a lo largo de los ejes x e y, respectivamente.

(3) En los puntos en los que $\sigma_{Edx}$ y $\sigma_{Edy}$ sean ambas de compresión y $\sigma_{Edx} \cdot \sigma_{Edy} > \tau_{Edxy}^{2}$ , no se necesita armadura de cálculo. No obstante, la máxima tensión de compresión no debe superar $f_{cd}$ (véase el apartado 3.1.6).

(4) En los puntos en los que $\sigma_{Edy}$ sea de tracción o $\sigma_{Edx} \cdot \sigma_{Edy} \leq \tau_{Edxy}^{2}$ , se necesita armadura.

El armado óptimo, indicado con el superíndice ‘, y las tensiones en el hormigón asociadas se determinan mediante:

$$
\text {Para} \sigma_ {E d x} \leq \left| \tau_ {E d x y} \right|
$$

$$
f _ {t d x} ^ {\prime} = \left| \tau_ {E d x y} \right| - \sigma_ {E d x}\tag{F.2}
$$

$$
f _ {t d y} ^ {\prime} = \left| \tau_ {E d x y} \right| - \sigma_ {E d y}\tag{F.3}
$$

$$
\sigma_ {c d} = 2 \big | \tau_ {E d y} \big |\tag{F.4}
$$

$$
\text {Para} \sigma_ {E d x} > \left| \tau_ {E d x y} \right|
$$

$$
f _ {t d x} ^ {\prime} = 0\tag{F.5}
$$

$$
f _ {t d y} ^ {\prime} = \frac {\tau_ {E d x y} ^ {2}}{\sigma_ {E d x}} - \sigma_ {E d y}\tag{F.6}
$$

$$
\sigma_ {c d} = \sigma_ {E d x} \left(1 + \left(\frac {\tau_ {E d x y}}{\sigma_ {E d x}}\right) ^ {2}\right)\tag{F.7}
$$

La tensión del hormigón, $\sigma_{cd}$ , debe comprobarse con un modelo realista de secciones fisuradas (véase Anejo 21 de este Código Estructural ), pero normalmente no debe superar $\nu f_{cd}$ (v puede obtenerse de la expresión (6.5)).

NOTA: Se obtiene la armadura mínima si las direcciones de armado son idénticas a las direcciones de las tensiones principales.

Alternativamente, para el caso general, la armadura necesaria y las tensiones en el hormigón pueden determinarse mediante:

$$
f _ {t d x} = \left| \tau_ {E d x y} \right| c o t \theta - \sigma_ {E d x}\tag{F.8}
$$

$$
f _ {t d y} = \left| \tau_ {E d x y} \right| c o t \theta - \sigma_ {E d y}\tag{F.9}
$$

$$
\sigma_ {c d} = \left| \tau_ {E d x y} \right| \left(c o t \theta + \frac {1}{c o t \theta}\right)\tag{F.10}
$$

donde θ es el ángulo que forma la tensión principal de compresión del hormigón con el eje x.

Sec. I. Pág. 98477

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 194 -->

NOTA: El valor de cot θ debe tomarse de forma que se eviten valores de compresión para $f_{td}$ .

Con el fin de evitar fisuras inadmisibles para el Estado Límite de Servicio y para asegurar la capacidad de deformación requerida en Estado Límite Último, la armadura calculada mediante las expresiones (F.8) y (F.9) para cada dirección, no debe ser ni superior al doble, ni inferior a la mitad de la armadura determinada mediante las expresiones (F.2) y (F.3) o (F.5) y (F.6). Estas limitaciones se expresan mediante $1/2 f_{tdx}' \leq f_{tdx} \leq 2f_{tdx}'$ y $1/2 f_{tdy}' \leq f_{tdy} \leq 2f_{tdy}'$ .

(5) La armadura debe quedar completamente anclada en todos los extremos libres, por ejemplo mediante barras en U o un método similar.

Sec. I. Pág. 98478

> cve: BOE-A-2021-13681
Verificable en https://www.boe.es

<!-- pag 195 -->

