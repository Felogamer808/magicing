# CTE DB SE-C — an-f-modelos-de-referencia-cimentaciones-y-contencion

> Texto extraído con pdftotext del PDF oficial (codigotecnico.org). Las figuras no están; las tablas conservan el espaciado del PDF.

<!-- pag 138 -->
Documento Básico SE-C Cimientos

Anejo F. Modelos de referencia para el cálculo de cimentaciones y
elementos de contención
F.1. Cimentaciones directas

F.1.1 Presión de hundimiento

1 La expresión (4.8) consta de tres sumandos que se denominan respectivamente, al igual que los
      factores de capacidad de carga, término de cohesión, de sobrecarga y de peso específico. Cada
      uno de los sumandos representa la contribución de las citadas variables (ck, q0k, k) a la resistencia.

2 En especial cuando las cimentaciones sean someras, se debe considerar prudentemente la conve-
      niencia de emplear el término de sobrecarga, debiendo asegurar en caso afirmativo que las hipóte-
      sis realizadas se mantendrán durante la vida útil de la construcción. (véase E.4.3)

F.1.1.1 Coeficientes correctores o de influencia
F.1.1.1.1 Influencia de la resistencia al corte del terreno situado sobre la base de la cimentación
(coeficientes d)
1 Cuando la base de la cimentación se sitúa a cierta profundidad D bajo la superficie del terreno

      (véase Figura F.1), la superficie de rotura teórica, asociada al estado límite último de hundimiento,
      ha de movilizar la resistencia al corte del terreno situado por encima y alrededor de la cimentación.
      Para tener en cuenta este efecto, que obviamente aumenta la presión de hundimiento disponible, se
      emplearán los coeficientes de corrección dc, dq, dg.

             Figura F.1. Profundidad “D” a considerar en la determinación de la presión de hundimiento
      a) Coeficiente corrector del factor Nc:
      En la Figura F.2 se recoge el coeficiente de corrección (dc) a aplicar al término de cohesión en fun-
      ción de la relación profundidad/ancho de la cimentación.

                                                                                 SE-C-133

<!-- pag 139 -->
Documento Básico SE-C Cimientos

                      Figura F.2. Coeficiente de corrección (dc)  dc  1 0,34·arctg(D / B*)
b) Coeficiente corrector del factor Nq:

dq  1 2 Nq (1 senk )2 arctan D ; para k  0 : dq  1                                      (F.1)

      Nc         B*

  donde el valor de D a introducir en la ecuación no será superior a 2B*.                      (F.2)
  El valor de Nq puede considerarse igual que tg K, con un valor aproximado de 0,2

                 Nc
  c) Coeficiente corrector del factor N:
d  1

2 El proyectista considerará prudentemente la inclusión de estos coeficientes de corrección. No se
      deben tener en cuenta en el caso de construir zapatas poco profundas en terrenos arcillosos, de
      plasticidad elevada, que en épocas secas puedan desarrollar grietas por retracción. En estas cir-
      cunstancias no podría contarse con la resistencia al corte del terreno situado sobre la base de la
      cimentación, ya que sería nula en la dirección a favor de los planos de las grietas.

3 No se deben emplear los factores de corrección anteriores para profundidades de cimentación D
      (véase Figura F.1) bajo la superficie del terreno menores de 2 m. Tampoco se deben considerar en
      cimentaciones cercanas a taludes o cuando no se pueda garantizar la permanencia, en el tiempo,
      del terreno situado por encima de la base de cimentación.

F.1.1.1.2 Influencia de la forma de la cimentación (coeficientes s).

1 El efecto de la forma del cimiento se podrá tener en cuenta mediante los factores de corrección que
      a continuación se indican:
      a) coeficiente corrector del factor Nc:
             sc = 1,20 para zapata circular

sc  1 0,2·B * para zapata rectangular                                                        (F.3)
               L*

b) coeficiente corrector del factor Nq:
      sq= 1,20 para zapata circular

sq  1  1,5·tgk ·B * para zapata rectangular                                                 (F.4)
                     L*

c) coeficiente corrector del factor N:
      s=0,6 para zapata circular

s  1 0,3·B * para zapata rectangular                                                        (F.5)
               L*

F.1.1.1.3 Influencia de la inclinación de la resultante de las acciones sobre la cimentación (coefi-
cientes i)

1 Los coeficientes a aplicar por efecto de la existencia de componentes horizontales de cargas sobre
      la zapata se podrán obtener de las siguientes expresiones:

      a) coeficiente corrector del factor Nc:

ic   iq·Nq  1  ; para k  0 : ic  0,5·1 1    H            

      Nq  1                                     B  *·L  *·c                                 (F.6)
                                                                 
                                                               k

b) coeficiente corrector del factor Nq:                                                        (F.7)
      iq  (1  0,7·tgB )3 ·(1  tgL )

c) coeficiente corrector del factor N:

                                          SE-C-134

<!-- pag 140 -->
Documento Básico SE-C Cimientos

i  (1 tgB )3 ·(1  tgL )                                   (F.8)

      donde , B, L son los ángulos de desviación de la resultante de las acciones respecto a la vertical
      definidos en el párrafo 7 del apartado 4.3.1.3.

2 Cuando se pueda asegurar una cierta cohesión “c” en el contacto de la cimentación con el terreno
      se podrá emplear un ángulo * menor, dado por la expresión;

tg*  tg                                                      (F.9)
        1  B *·L *·c k
               V·tgk

3 Cuando la componente horizontal de la resultante sea menor del 10% de la vertical, se podrá tomar
      ic = iq = i=1.

F.1.1.1.4 Influencia de la proximidad de un talud a la cimentación (coeficientes t)

1 Cuando el terreno situado junto a la cimentación no sea horizontal, sino que presente una incli-
      nación descendente de ángulo  respecto a la horizontal, se podrán emplear los siguientes factores
      de corrección:

      a) coeficiente corrector del término Nc:

t c  e 2tgk                                                 (F.10)

b) coeficiente corrector del término Nq:                        (F.11)
      t q  1 sen2

c) coeficiente corrector del término N:

t   1 sen2                                                  (F.12)

      donde  es el ángulo de inclinación expresado en radianes.

2 En situaciones de dimensionado transitorias en condiciones sin drenaje, el efecto de la inclinación
      del terreno podrá tenerse en cuenta calculando la presión de hundimiento como si la superficie del
      suelo fuera horizontal, reduciéndola posteriormente en un valor 2··cu.

3 Cuando el ángulo de inclinación del terreno sea superior a ’/2 debe llevarse a cabo un estudio
      específico de estabilidad global.

4 Cuando el ángulo de inclinación del terreno sea menor o igual a 5º, se podrá tomar tc = tq = t=1.

F.1.1.2 Presión de hundimiento en condiciones de carga sin drenaje

1 Cuando sean de aplicación situaciones de dimensionado transitorias de carga sin drenaje (véase
      apartado 4.2.3.1), la presión de hundimiento (ecuación 4.8) podrá expresarse en términos de ten-
      siones totales, en cuyo caso la resistencia al corte del terreno vendrá representada por un ángulo
      de rozamiento interno k=0 y una resistencia al corte sin drenaje ck=cu.

2 Los factores de capacidad de carga para esta situación de dimensionado serán:

      Nq = 1

      Nc = 5,14

      N = 0

3 El valor de qok a considerar en el cálculo será la presión vertical total debida a la sobrecarga (de
      tierras u otras) al del nivel de la base de la cimentación y alrededor de ésta.

4 En el caso de que la resistencia al corte sin drenaje, cu, del terreno aumente con la profundidad, z,
      siguiendo una ley lineal del tipo cu = co + m z, donde c0 es la resistencia al corte sin drenaje en su-
      perficie, se podrá adoptar para la determinación de la presión de hundimiento la resistencia al corte
      sin drenaje a una profundidad B/4 bajo la cimentación, siempre que dicho valor no resulte superior a
      2·c0.

5 A efectos prácticos, para el cálculo de la presión admisible se podrá considerar que el coeficiente
       R sólo afecta al término de la cohesión.

                                          SE-C-135

<!-- pag 141 -->
Documento Básico SE-C Cimientos

F.1.1.3 Presión de hundimiento en tensiones efectivas

1 Para situaciones de dimensionado en las que puedan suponerse disipados los excesos de presión
      intersticial generados por las acciones actuantes sobre la cimentación, la presión de hundimiento
      (ecuación 4.8) se expresará en términos de tensiones efectivas.

2 Aunque no resulta habitual, también será de aplicación la formulación en tensiones efectivas en
      situaciones transitorias en las que la disipación de presiones intersticiales no se haya producido
      (carga sin drenaje) o sea parcial. En estos casos, será necesario determinar previamente el régi-
      men de presión intersticial correspondiente.

3 La resistencia al corte del terreno vendrá expresada por el ángulo de rozamiento interno efectivo
      (k= ’) y la cohesión efectiva (ck=c’).

4 Los factores de capacidad de carga se podrán obtener de las siguientes expresiones:

N q  1  sen  ' 1  sen  ' ·e  ·tg  '                                   (F.13)

N c  ( N q  1 )· cotg  '                                                  (F.14)

N   1,5 (N q  1)·tg '                                                    (F.15)

5 El valor de qok a considerar en cálculo será la presión vertical efectiva debida a la sobrecarga al
      nivel de la base de la cimentación y alrededor de ésta.

6 El valor del peso específico del terreno k a introducir en la formulación analítica será el que re-
      presente el estado de presiones efectivas por debajo del cimiento, siendo:

      a) el peso específico aparente, ap, si el nivel freático se encuentra a una profundidad mayor que
             el ancho B* bajo la base de la cimentación;

      b) el peso específico sumergido, ', si el nivel freático está situado en o por encima de la base de
             la cimentación;

      c) un peso específico intermedio, interpolado linealmente según la expresión (F.16) si el nivel
             freático está comprendido entre los indicados anteriormente

k  '  z  ap  '                                                      (F.16)

            B

      siendo

      z la distancia a la que se encuentra el nivel freático por debajo de la base de la cimenta-
              ción.

d) Si existiera un flujo de agua ascendente, de gradiente iv, el valor característico del peso espe-
      cífico de cálculo será:

k =’ – iv·w                                                               (F.17)

siendo  el peso específico sumergido del terreno;
'      el peso específico del agua;
w      el gradiente vertical medio en la zona de espesor 1,5B* bajo la base de la cimentación.
iv

F.1.2 Estimación de asientos

F.1.2.1 Criterios básicos
1 A efectos de aplicación de este DB se distinguirán, en el caso más general, tres tipos de asiento. En

      la Figura F.3 se muestra de forma esquemática la evolución de dichos asientos y su relación con el
      tiempo tras la aplicación de una carga:

                                            SE-C-136

<!-- pag 142 -->
Documento Básico SE-C Cimientos

     Figura F.3. Definición de asiento instantáneo, de consolidación primaria y de compresión secundaria

      a) asiento instantáneo (Si): se produce de manera inmediata o simultánea con la aplicación de la
             carga. Si el suelo es de baja permeabilidad y se encuentra saturado, en los momentos iniciales
             apenas se produce drenaje alguno, de manera que este asiento inicial corresponde a una dis-
             torsión del suelo, sin cambio de volumen;

      b) asiento de consolidación primaria (Sc): se desarrolla a medida que se disipan los excesos de
             presión intersticial generados por la carga y se eleva la presión efectiva media en el terreno, lo
             que permite la reducción progresiva del volumen de huecos del suelo. Este asiento es espe-
             cialmente importante en suelos arcillosos saturados, ya que puede dilatarse considerablemen-
             te en el tiempo;

      c) asiento de compresión secundaria (Ss): se produce en algunos suelos que presentan una cier-
             ta fluencia (deformación a presión efectiva constante). Aunque puede comenzar desde los
             primeros momentos tras la aplicación de la carga, habitualmente sólo puede distinguirse con
             claridad una vez finalizado el proceso de consolidación primaria.

2 El asiento total resultante será por tanto la suma de las tres componentes anteriores:

St = Si + Sc + Ss                                           (F.18)

3 En relación con este DB, los suelos en los que se puedan desarrollar asientos de compresión se-
      cundaria no despreciables se considerarán desfavorables (tipo T-3 de acuerdo con la tabla 3.2) En
      estos casos se requerirá un estudio especializado para estimar estos asientos y evaluar su repercu-
      sión en la construcción.

4 En los suelos de permeabilidad elevada y en los parcialmente saturados, se podrá suponer que el
      asiento se produce de manera prácticamente simultánea a la aplicación de la carga, por lo que Si y
      Sc no llegarán a diferenciarse.

F.1.2.2 Suelos granulares con una proporción en peso de partículas de más de 20 mm inferior al
          30%

1 Si bien para estimar el asiento de una cimentación directa en un terreno de estas características
      podrán utilizarse correlaciones que permiten determinar el módulo de deformación del terreno en
      función de los resultados obtenidos en ensayos de penetración estática o dinámica realizados “in si-
      tu”, se puede utilizar la expresión (F.19) de Burland y Burbidge, basada directamente en los resulta-
      dos obtenidos en el ensayo SPT o deducidos de ensayos de penetración a través de correlaciones
      debidamente contrastadas.

Si  fl·fs ·q'b ·B0.7 ·Ic                                   (F.19)

                           SE-C-137

<!-- pag 143 -->
Documento Básico SE-C Cimientos

siendo  el asiento medio al final de la construcción, en mm.
Si
q’b     la presión efectiva bruta aplicada en la base de cimentación (en kN/m2).
B
Ic      el ancho de la zapata o losa (en m).

fs      el índice de compresibilidad, definido en el párrafo 3 de este apartado en función del va-
        lor medio de golpeo NSPT del ensayo SPT en una zona de influencia (ZI) bajo la zapata o
        losa, cuya profundidad viene determinada en función del ancho de la cimentación, tal y
        como se indica en la Figura F.4.

        un coeficiente dependiente de las dimensiones de la cimentación directa, supuesta ésta
        rectangular. Su valor viene dado por:

         L 2
         1,25· 
fs        B
        L                                                       (F.20)

          0,25 
        B         

donde
L es el largo de la zapata o losa (en m)

                Figura F.4. Zona de influencia ZI en función del ancho (B) de la cimentación.

fl es un factor de corrección que permite considerar la existencia de una capa rígida por debajo de
la zapata a una profundidad Hs, (Hs  ZI), donde ZI es la profundidad de influencia bajo la zapata,
dentro de la cual se produce el 75% del asiento, definida en la Figura F.4, su valor viene dado por:

     Hs  Hs                                                     (F.21)
fI  2  

      ZI  ZI 

2 Cuando el terreno se encuentre sobreconsolidado o cuando la cimentación se sitúe en el fondo de
      una excavación cuya máxima presión efectiva vertical en el fondo haya sido (’vo), el valor de (q’b) a

      introducir en la ecuación del asiento será:

'2                        '
qb  'v0 cuando 'v0  qb                                        (F.22)
3                                                                 (F.23)

q'
 b cuando 'v0  qb'
3

3 El índice de compresibilidad se podrá obtener de la expresión:

                                          SE-C-138

<!-- pag 144 -->
Documento Básico SE-C Cimientos

Ic  1,71 N1,4                                                                              (F.24)
        med

siendo

Nmed       la media aritmética de los golpeos NSPT a lo largo de la zona de influencia ZI.

El índice Ic determinado según la expresión (F.24) representa la media obtenida del estudio es-
tadístico de más de 200 casos reales. Los índices aproximados correspondientes a la media ± una
desviación standard son:

 3,0                                                                                       (F.25)
Ic 

      N1,4 med

 0,94                                                                                      (F.26)
Ic 

      N1,4 med

4 Como reglas complementarias se deben observar las siguientes:

a) el método no se considera aplicable para valores NSPT < 7 debiéndose en dicho caso realizar
      un estudio especializado no contemplado en este DB;

b) el golpeo NSPT no se corrige por el efecto de la profundidad;

c) en el caso de que el terreno esté compuesto por arenas finas y arenas limosas bajo el nivel
      freático, se puede emplear la corrección de Terzaghi para NSPT > 15:

      NSPT (corregido)  15  0,5(NSPT (medido)  15)                                       (F.27)

F.1.2.3 Suelos granulares con una proporción en peso de partículas de más de 20 mm superior al
          30%

1 En este tipo de suelos los resultados de los ensayos de penetración pueden estar sujetos a in-
      certidumbres (véase párrafo b del apartado 4.2.3.1), por lo que a los efectos de este DB se reco-
      mienda que la estimación de asientos en estos casos se realice siguiendo formulaciones elásticas.

2 El módulo de deformación a considerar podrá estimarse mediante ensayos de carga con placas de
      diámetro superior a 6 veces el diámetro máximo de las partículas del suelo o alternativamente me-
      diante la expresión:

E  Gmax                                                                                    (F.28)
        2

siendo

Gmax       el módulo de rigidez tangencial máximo del terreno deducido a partir de ensayos cross-
           hole o down-hole.

3 En aquellos casos en los que la importancia del edificio no justifique la realización de estos ensa-
      yos, los cálculos se podrán basar exclusivamente en correlaciones que sean suficientemente con-
      servadoras, véase tabla D.23.

F.1.2.4 Suelos con un contenido de finos superior al 35%

1 En arcillas normalmente consolidadas o sobreconsolidadas en las que con las presiones aplicadas
      por el edificio se llegue a superar la presión de sobreconsolidación, el planteamiento de una cimen-
      tación directa requerirá un estudio especializado, no contemplado en este DB.

2 En el caso de arcillas sobreconsolidadas en las que con las presiones aplicadas por el edificio no se
      llegue a superar la presión de sobreconsolidación y no se produzcan plastificaciones locales, se po-
      drán emplear métodos de estimación de asientos basados en la teoría de la Elasticidad. A efectos
      prácticos, se considerará que se cumple esta última condición si la resistencia a compresión simple
      de la arcilla sobreconsolidada es superior a la presión sobre el terreno transmitida por la carga de
      servicio del edificio.

3 Los módulos de deformación del terreno en este caso se podrán obtener mediante:

      a) ensayos triaxiales especiales de laboratorio con medida local de deformaciones en la probeta
             de suelo;

                SE-C-139

<!-- pag 145 -->
Documento Básico SE-C Cimientos

b) ensayos presiómetricos en los que no se tenga en cuenta el nivel de deformaciones inducidas
      en el terreno por la construcción;

c) ensayos cross-hole o down-hole, aplicando a los valores representativos del módulo de rigidez
      tangencial máximo obtenido en el ensayo (Gmax) los factores correctores (fP) que se indican en
      la tabla F.1 para la estimación del módulo de elasticidad sin drenaje Eu=fPGmax. El asiento total
      en estas circunstancias podrá estimarse mediante la siguiente expresión:

        St = 2 Si                                                                                  (F.29)

Tabla F.1. Estimación del módulo de elasticidad sin drenaje de arcillas sobreconsolidadas a partir de ensa-
                                                        yos cross-hole y down-hole.

                                             fP

                   15<IP < 30            30 < IP < 50            IP > 50

                           1,2               1,6                     1,9

d) Métodos empíricos bien establecidos, basados en correlaciones que tengan en cuenta la resis-
      tencia al esfuerzo cortante sin drenaje del suelo, su plasticidad, y su grado de sobreconsolida-
      ción. A título orientativo podrán utilizarse los módulos de elasticidad indicados en la tabla F.2
      para estimar el asiento Si en estas arcillas.

       Tabla F.2. Estimación del módulo de elasticidad sin drenaje de arcillas sobreconsolidadas.

Rango de sobreconsolidación                                      Eu/cu

                                IP < 30                30 < IP < 50       IP > 50

< 3                             800                    350                150

3 – 5                           600                    250                100

> 5                             300                    130                50

F.2. Cimentaciones profundas

F.2.1 Determinación de la resistencia de hundimiento mediante soluciones analí-
ticas

1 Cuando se utilizan métodos basados en la teoría de la plasticidad, y para la obtención aproximada
      de la resistencia unitaria por punta y por fuste, se tendrá en cuenta si se trata de suelos granulares
      o suelos finos.

F.2.1.1 Suelos granulares

1 La resistencia unitaria de hundimiento por punta de pilotes en suelos granulares se podrá estimar
      con la expresión siguiente:

qp = fp· ’vp ·Nq  20 MPa                                                                         (F.30)

siendo

fp = 3  para pilotes hincados;

fp = 2,5 para pilotes hormigonados in situ;

'vp    la presión vertical efectiva al nivel de la punta antes de instalar el pilote;

Nq el factor de capacidad de carga definido por la expresión 1+ sen . e tg , donde  es el
                                                                                              1- sen

        ángulo de rozamiento interno del suelo.

2 Dada la dificultad de obtener muestras inalteradas de suelos granulares, para hallar el valor de  en
      laboratorio, se recomienda proceder a su determinación mediante correlaciones con ensayos”in si-
      tu” de penetración debidamente contrastadas (véase tablas 4.1 y 4.2, figuras D.1 y D.2).

                                         SE-C-140

<!-- pag 146 -->
Documento Básico SE-C Cimientos

3 La resistencia unitaria por fuste en suelos granulares se podrá estimar con la expresión siguiente:

 f  v'  k f  f  tg   120 kPa                                                      (F.31)

siendo

'v         la presión vertical efectiva al nivel considerado;

Kf          el coeficiente de empuje horizontal;

f           el factor de reducción del rozamiento del fuste;

           el ángulo de rozamiento interno del suelo granular.

4 Para pilotes hincados se tomará Kf = 1 y para pilotes perforados se tomará Kf = 0,75. Para pilotes
      híbridos, ejecutados con ayudas que reducen el desplazamiento del terreno, se tomará un valor in-
      termedio en función de la magnitud de esa ayuda.

5 Para pilotes de hormigón "in situ" o de madera se tomará f=1. Para pilotes prefabricados de hormi-
      gón se tomará f = 0,9 y para pilotes de acero en el fuste se tomará f = 0,8.

F.2.1.2 Suelos finos

1 La carga de hundimiento de pilotes verticales en suelos limosos o arcillosos, evaluada mediante
      fórmulas estáticas, debe calcularse en dos situaciones que corresponden al hundimiento sin drenaje
      o a corto plazo y el hundimiento con drenaje o a largo plazo.

2 La resistencia unitaria de hundimiento por punta a corto plazo se podrá obtener mediante la expre-
      sión siguiente:

qp = Np cu                                                                                (F.32)

siendo

cu          la resistencia al corte sin drenaje del suelo limoso o arcilloso, teniendo en cuenta la pre-

            sión de confinamiento al nivel de la punta (entorno comprendido entre dos diámetros por

            encima y dos diámetros por debajo de ella) obtenida en célula triaxial o, en su caso, en-

            sayo de compresión simple.

Np          depende del empotramiento del pilote, pudiéndose adoptar un valor igual a 9.

3 La resistencia unitaria de hundimiento por fuste a corto plazo será:

f  100cu (f y cu en kPa)                                                               (F.33)
      100  cu

4 En pilotes con fuste de acero en suelos finos, el valor de f a corto plazo se afectará por un coefi-

      ciente reductor de 0,8.

5 Para determinar la resistencia de hundimiento a largo plazo, se utilizará el ángulo de rozamiento
      efectivo deducido de los ensayos de laboratorio, despreciando el valor de la cohesión. Para ello se
      utilizarán las expresiones (F.30) y (F.31) correspondientes a suelos granulares.

6 La resistencia unitaria por fuste a largo plazo f no superará, salvo justificación, al valor límite de 0,1

      MPa.

F.2.2 Determinación de la resistencia de hundimiento mediante ensayos de pe-
netración “in situ”

F.2.2.1 Métodos basados en el ensayo SPT

1 El método de evaluación de la seguridad frente a hundimiento de pilotes basado en el SPT es válido
      para pilotes perforados y para pilotes hincados en suelos granulares, que no tengan gran propor-
      ción de gravas gruesas cantos ó bolos (<30% de tamaño mayor de 2 cm) que pueda desvirtuar el
      resultado del ensayo, en base a la heterogeneidad de los registros obtenidos.

2 La resistencia unitaria por punta se puede evaluar, para pilotes hincados, con la expresión:

qp = fN N (MPa)                                                                           (F.34)

siendo      para pilotes hincados
fN = 0,4

                                        SE-C-141

<!-- pag 147 -->
Documento Básico SE-C Cimientos

fN = 0,2 para pilotes hormigonados in situ

N            el valor medio de NSPT. A estos efectos se obtendrá la media en la zona activa inferior y

             la media en la zona pasiva superior. El valor de N a utilizar será la media de las dos an-

             teriores. (véase Figura 5.5)

3 La resistencia por fuste en un determinado nivel dentro del terreno, para un pilote hincado, se podrá
      considerar igual a:

f = 2,5 NSPT (kPa)                                         (F.35)

      En este caso, NSPT es el valor del SPT al nivel considerado.

4 En cualquier caso no se utilizarán, a efectos de estos cálculos, índices NSPT superiores a 50.

5 Para el caso de pilotes metálicos la resistencia por fuste se reducirá al 80% del valor correspondien-
      te a los pilotes de hormigón.

6 En suelos cohesivos, con una resistencia a la compresión simple, qu, mayor de 0,1 MPa, se podrán
      utilizar, a efectos orientativos, correlaciones entre los ensayos SPT y CPT (penetrómetro estático),
      suficientemente justificadas.

F.2.2.2 Métodos basados en los ensayos continuos de penetración dinámica

1 Si en un suelo se dispone de resultados de ensayos penetrométricos dinámicos continuos, se pue-
      den traducir los resultados correspondientes a índices SPT, y utilizar después el método basado en
      el ensayo SPT.

2 Dada la posible variación en las correlaciones existentes entre unos y otros ensayos de penetra-
      ción, las correlaciones deben justificarse con la experiencia local o disponer, en su caso para la
      obra concreta, de ensayos de contraste que refuercen esta correlación.

F.2.2.3 Método basado en ensayos penetrométricos estáticos

1 Con los penetrómetros estáticos se puede medir, de manera continua, la resistencia unitaria en la
      punta del cono "qc" y también en su fuste "f" en cualquier tipo de suelo, dependiendo de la potencia
      del equipo de ensayo.

2 El valor de "q*c" a utilizar será la media del valor medio de qc correspondiente a la zona activa infe-
      rior y del valor medio de qc correspondiente a la zona pasiva superior. (véase Figura 5.5).

3 La carga unitaria de hundimiento por punta del pilote, se supondrá igual al 80% del valor así de-
      terminado. Esto es:

qp = fq·q*c                                                 (F.36)

      siendo

      fq=0,5 para pilotes hincados

      fq=0,4 para pilotes hormigonados in situ

      Para pilotes de diámetro mayor que 0,5 m, se debe utilizar una estimación conservadora de la me-
      dia a la hora de evaluar qp en el entorno de la punta, se recomienda adoptar el valor mínimo medido
      en esa zona.

4 Si en el ensayo penetrométrico no se ha medido la resistencia unitaria por fuste, se debe suponer
      que tal valor es igual a 1/200 de la resistencia por punta a ese mismo nivel, si el suelo es granular, e
      igual a 1/100, si el suelo es cohesivo. En cualquier caso, la resistencia por fuste obtenida de esta
      manera indirecta no será superior a 0,1 MPa.

F.2.2.4 Métodos basados en ensayos presiómetricos

1 Los presiómetros o dilatómetros miden la presión horizontal necesaria en la pared de un sondeo
      para plastificar el terreno. De manera aproximada, se podrá suponer:

qp = K (pl – Kopo)                                          (F.37)

siendo       la presión límite del ensayo presiométrico
pl           la presión efectiva vertical al nivel de la cimentación en el entorno del apoyo (antes de
po           cargar).
             el coeficiente de empuje al reposo. En general Ko = 0,5.
Ko

                                           SE-C-142

<!-- pag 148 -->
Documento Básico SE-C Cimientos

    K       un coeficiente de proporcionalidad que depende de la geometría del cimiento y del tipo

            de terreno.

    El valor de K puede tomarse igual a 3,2 en suelos granulares, e igual a 1,5 en suelos cohesivos.

2 El valor de "pl" a utilizar en la expresión (F.37) debe ser la media de los valores medios correspon-
      dientes a las zonas activa y pasiva en el entorno de la punta.

3 Como resistencia unitaria por fuste se podrá tomar el siguiente valor:

    f = 1 · (pl – Ko po)                                                                                  (F.38)
         10

4 El valor de f debe limitarse, en función del tipo de terreno, a los siguientes valores:

    a) suelos granulares                     f (máximo) = 120 kPa

    b) suelos finos                          f (máximo) = 100 kPa

F.2.3 Métodos basados en pruebas de carga

1 Para la utilización de este procedimiento se considera fundamental un conocimiento detallado de la
      estratigrafía del terreno.

2 Cuando, para el dimensionado de pilotes, se determine la resistencia por punta Rpk o por fuste Rfk
      del terreno mediante pruebas estáticas de carga in situ hasta rotura podrá adoptarse como valor ca-
      racterístico Rk de cualquiera de esas resistencias el proporcionado por la siguiente expresión:

    Rk = Min {Rmedia/1 ; Rmínima/2}                                                                      (F.39)

    siendo

    1      el coeficiente aplicable al valor medio de los resultados obtenidos en los ensayos;

    2      el coeficiente aplicable al valor mínimo de los resultados obtenidos en los ensayos.

3 Los valores numéricos de los coeficientes 1 y 2 dependen del número de ensayos, n. La tabla F.3
      contiene dichos valores

            Tabla F.3. Valores de los coeficientes 1 y 2 para pruebas de carga in situ de pilotes

n           1                          2           3                       4           5

1          1,40                       1,30        1,20                    1,10        1,00

2          1,40                       1,20        1,05                    1,00        1,00

4 Cuando, para el dimensionado de pilotes, se determine la resistencia global del pilote mediante
      pruebas dinámicas de hinca, debidamente contrastadas con pruebas estáticas hasta rotura sobre
      pilotes del mismo tipo y características geométricas en terrenos con las mismas propiedades geo-
      técnicas, podrá adoptarse como valor característico Rk el proporcionado por la siguiente expresión:

    Rk = Min {Rmedia/3 ; Rmínima/4}                                                                      (F.40)

    siendo

    3      el coeficiente aplicable al valor medio de los resultados obtenidos en los ensayos

    4      el coeficiente aplicable al valor mínimo de los resultados obtenidos en los ensayos.

5 Los valores numéricos de los coeficientes 3 y 4 depende del número de ensayos, n. La tabla F.4.
      contiene dichos valores.

            Tabla F.4. Valores de los coeficientes 3 y 4 para ensayos dinámicos de hinca de pilotes

        N             2                      5              10                 15                 20

        3           1,60                    1,50            1,45                1,42                1,40

        4           1,50                    1,35            1,30                1,25                1,25

6 En función de cómo se realice y controle la prueba de carga, los valores de los coeficientes 3 y 4
      de la tabla F.4 deben multiplicarse por los siguientes factores:

      a) 0,85, cuando el ensayo dinámico de hinca se haga con control de deformación y aceleración;

                                                   SE-C-143

<!-- pag 149 -->
Documento Básico SE-C Cimientos

      b) 1,10, cuando se utilice una fórmula de hinca basada en la medida de las compresiones casi-
             elásticas de la cabeza del pilote durante el proceso de la hinca;

      c) 1,20, cuando se utilice una fórmula de hinca sin medir el desplazamiento de la cabeza del pilo-
             te durante el proceso de la hinca.

7 Cuando se realicen pruebas de carga estáticas o dinámicas, para ayudar en la determinación de la
      resistencia de hundimiento, se podrán reducir los coeficientes de seguridad, de acuerdo con los cri-
      terios establecidos, para cada situación de dimensionado, en la tabla 2.1.

F.2.4 Cimentaciones de pilotes en roca

1 El valor de cálculo de la resistencia por punta en roca qp,d de los pilotes excavados se podrá calcu-
      lar de acuerdo con lo indicado en el capítulo 4 para cimentaciones superficiales en roca, introdu-
      ciendo un coeficiente df para tener en cuenta la longitud de empotramiento en roca:

qp,d  K sp qu df                                                                             (F.41)

siendo  el coeficiente dado por la expresión (4.12)
Ksp     la resistencia a compresión simple de la roca
qu

df  1  0,4 Lr  3                                                                           (F.42)
                 d

siendo

Lr      profundidad de empotramiento en roca de la misma o mejor calidad que la existente en

        la base del apoyo

d       diámetro real o equivalente (igual área) del pilote

2 La longitud del empotramiento debe medirse a partir de la profundidad en que se obtiene contacto
      con la roca en toda la sección del pilote. Esta profundidad dependerá de la inclinación local del te-
      cho rocoso.

3 Debe garantizarse la continuidad de la roca con características no inferiores a las consideradas en
      el cálculo del pilote, al menos, en una profundidad de tres diámetros por debajo del apoyo de la
      punta.

4 Dentro de esta zona de roca se debe considerar, para la evaluación de la resistencia de los pilotes
      perforados, un valor de cálculo de la resistencia unitaria por fuste f,d (MPa) igual a:

 f,d  0,2 qu0,5                                                                             (F.43)

qu, vendrá especificado en MPa, debiéndose verificar siempre que la roca es estable en agua.

F.2.5 Estimación de la resistencia del terreno frente a acciones horizontales.

1 La carga de rotura horizontal del terreno "Rhk" para un pilote se puede estimar con el esquema de
      cálculo que se indica en la Figura F.5.

2 El punto donde se aplica la carga H es un punto de momento flector nulo que se debe decidir en
      función de cálculos estructurales.

3 Los casos particulares de c = 0 (terreno puramente granular) y de = 0 (terreno puramente cohesi-
      vo) se recogen en las Figuras F.6. y F.7.

                           SE-C-144

<!-- pag 150 -->
Documento Básico SE-C Cimientos
Figura F.5. Fallo del terreno causado por una fuerza horizontal sobre un pilote

                                                        SE-C-145

<!-- pag 151 -->
Documento Básico SE-C Cimientos

                         200                                                                     e= 0
                                                      1                                          L

                                                      2                                        0.2
                                                                                              0.4
                         160          H
                                                                                               0.8
H                                     e                                                       1.5

 Kp D 3                              L                                                           3.0

RESISTENCIA HORIZONTAL,  120 D

                         80

                         40

                         0    0          4               8         12                     16                    20

                                                         LONGITUD ENTERRADA, L/D

                              1 ___________ Carga que actúa al nivel indicado

                              2 ------------------- Hipótesis de traslación rígida del pilote (“e” negativo)

                              siendo

                              ’                         Peso efectivo (sumergido en su caso) del terreno

                              Kp                         Coeficiente de empuje pasivo. Puede suponerse: Kp=1,8

                                                        el ángulo de rozamiento interno

                                  Figura F.6. Carga de rotura horizontal del terreno (c = 0)

                                                         SE-C-146

<!-- pag 152 -->
Documento Básico SE-C Cimientos

          H                        60                    H                             e= 0
             c D2                         1              e                             D
                                           2                                           1
                    u                                   L                               2
                                   50
          RESISTENCIA HORIZONTAL,                                    D                   4
                                   40
                                                                                         8
                                   30
                                                                                       10
                                   20

                                   10

                                   0   0             8         12                  16        20

                                                  4

                                                  LONGITUD ENTERRADA, L/D

                                          1 ____________ Carga que actúa al nivel indicado

                                          2 -------------------- Hipótesis de traslación rígida del pilote (“e” negativo)

                                          siendo

                                          cu         Resistencia al corte sin drenaje

                                   Figura F.7. Carga de rotura horizontal del terreno ( = 0)

F.2.6 Estimación de asientos en pilotes

F.2.6.1 Asientos del pilote aislado

1 Se puede adoptar la simplificación de que el asiento de un pilote vertical aislado sometido a una
      carga vertical, de servicio, en su cabeza igual a la máxima recomendable por razones de hundi-
      miento, es aproximadamente, el uno por ciento de su diámetro, más el acortamiento elástico del pi-
      lote.

2 El asiento del pilote individual aislado, considerando el acortamiento elástico del pilote se podrá
      expresar mediante la siguiente fórmula aproximada:

si   D +  l1 +  l 2  P                                                                                             (F.44)
 40 Rck  AE 

siendo  el asiento del pilote individual aislado;
si      el diámetro del pilote (para formas no circulares se obtendrá el diámetro equivalente);
D       la carga sobre la cabeza;
P       la carga de hundimiento;
Rck     la longitud del pilote fuera del terreno;
l1      la longitud del pilote dentro del terreno;
l2      el área de la sección transversal del pilote;
A       el módulo de elasticidad del pilote;
E

                                                     SE-C-147

<!-- pag 153 -->
Documento Básico SE-C Cimientos

        un parámetro variable según el tipo de transmisión de cargas al terreno, =1 para pilotes

         que trabajan principalmente por punta y =0.5 para pilotes flotantes. Para situaciones in-

         termedias, se adoptará el siguiente valor de :

 = 1 (0,5 Rfk + Rpk)                                                  (F.45)
      R ck

donde    es la carga de hundimiento por punta;
Rpk      es la carga de hundimiento por fuste.
Rfk

F.2.6.2 Consideración del efecto grupo

1 En los grupos de pilotes, y debido a la interferencia de las cargas, el asiento de cada pilote puede
      ser mayor. Para tenerlo en cuenta, se podrán adoptar las siguientes simplificaciones:

2 Para pilotes columna, trabajando por punta en roca, separados más de tres diámetros, el efecto
      grupo se considera despreciable.

3 Para otras situaciones se puede suponer que toda la carga del grupo está uniformemente repartida
      en un plano situado a la profundidad "z" bajo la superficie del terreno:

z=· l2                                                                (F.46)

con los significados de "" y " l 2" indicados anteriormente y con unas dimensiones transversales B1
x L1 dadas por:

B1 = Bgrupo + (1 - ) l 2                                              (F.47)

L1 = Lgrupo + (1 - ) l 2                                              (F.48)

      siendo Bgrupo y Lgrupo las dimensiones del grupo, considerando planos exteriores tangentes a los pilo-
      tes externos del grupo.

4 El cálculo del asiento debido a esta carga vertical repartida en profundidad se estimará de acuerdo
      con los procedimientos generales de cálculo de asientos de cimentaciones superficiales.

F.2.7 Estimación de movimientos horizontales en pilotes

F.2.7.1 Pilote aislado

1 Para el cálculo de los movimientos horizontales del pilote se podrá utilizar la teoría de la “viga elás-
      tica” o del “coeficiente de balasto”.

2 Aunque las soluciones "exactas" de este problema están bien resueltas mediante ábacos y curvas,
      en el presente DB se admitirá como suficientemente preciso utilizar la solución aproximada que se
      esquematiza en la Figura F.8.

3 En la solución aproximada de la Figura F.8 la parte del pilote que queda dentro del terreno queda
      sustituida, a efectos del cálculo de esfuerzos y movimientos al nivel del terreno, por una varilla rígi-
      da de longitud L, sujeta a su base mediante un resorte vertical, otro horizontal y otro de giro, tal co-
      mo se indica en la figura.

         Figura F.8. Barra equivalente para el cálculo de movimientos
                                                   SE-C-148

<!-- pag 154 -->
Documento Básico SE-C Cimientos

4 La línea de terreno, a efectos de cálculo de movimientos horizontales o de esfuerzos en el pilote,
      según la Figura F.8, debe fijarse con prudencia. Se despreciará la colaboración de zonas que sean
      especialmente blandas o deformables en comparación con el terreno inmediato inferior.

5 Los valores de los parámetros del pilote equivalente se pueden obtener de las siguientes expresio-
      nes:

                          l2 
L  1,10  0,15 ln  T  0,8 T                                                                 (F.49)
                          T

                          l2  EI EI
K h  0,68  0,20 ln   3                                                                    (F.50)
                          T  T T3

                          l 2  EI   EI
K   0,3  0,20 ln    0,6                                                                  (F.51)
                          T T       T

Kv =  D               1 (1)                                                                   (F.52)
                         l1  l2 
                                 
               40R  ck     AE     

siendo         la longitud del empotramiento equivalente
L

l 1            la longitud del pilote fuera del terreno

l 2            la longitud enterrada del pilote

T              la longitud elástica del pilote

A              el área de la sección transversal del pilote

E              el módulo de elasticidad del material que forma el pilote

I              el momento de inercia respecto a un eje de giro perpendicular al plano de estudio

              el parámetro definido en la expresión (F.45)

6 Para estimar la presión horizontal que se opone al movimiento del pilote a cierta profundidad (ph) se
      podrá utilizar la teoría del coeficiente de balasto. Según esta teoría el valor de ph viene dado por la
      expresión:

ph = Ks                                                                                          (F.53)

siendo

Ks             el módulo de balasto horizontal del pilote;

              el desplazamiento horizontal del pilote.

7 El módulo de balasto Ks tiene dimensiones de fuerza dividida por longitud al cubo y se debe es-
      timar por alguno de los procedimientos que se citan a continuación:

a) mediante pruebas de carga horizontal, debidamente interpretadas;

b) mediante información local, debidamente contrastada;

c) en función del resultado de ensayos presiométricos o dilatométricos realizados en sondeos;

d) mediante correlaciones empíricas.

8 Cuando se utilicen los resultados de ensayos presiométricos, se determinará el módulo de balasto
      horizontal mediante la expresión :

Ks   · Ep                                                                                       (F.54)
          D

siendo         el módulo presiométrico
Ep             el diámetro del pilote ≥ 0,3 m
D
              un factor adimensional que depende del tipo de terreno y oscila entre 1,5 para arcillas y 3
               para suelos granulares.

                                                 SE-C-149

<!-- pag 155 -->
Documento Básico SE-C Cimientos

9 Cuando se utilicen correlaciones empíricas para determinar el coeficiente de balasto se distinguirá
      entre:

      a) arenas;

      b) arcillas.

10 En arenas se podrá admitir que el módulo de balasto depende no sólo de la profundidad z, sino
      también del diámetro del pilote, D según indica la expresión:

Ks  nh · z                                                                                  (F.55)
            D

siendo         el valor de la tabla F.5.
nh                                        Tabla F.5.- Valores de "nh" en MPa/m3

               Compacidad de la arena                 Situación respecto al nivel freático

                                                  Por encima                     Por debajo

                  Floja                                     2                    1,2

                  Media                                     5                    3

                  Compacta                            10                         6

                  Densa                               20                         12

11 Podrá adoptarse como longitud elástica del pilote, T, el valor adimensional definido por la expresión:

     EI 1/5                                                                                (F.56)
T   

     nh 

siendo

E, I           los definidos anteriormente;

nh             el valor definido en la tabla F.5

12 En arcillas se podrá suponer que el módulo de balasto es proporcional a su resistencia al corte sin
      drenaje, cu, e inversamente proporcional al diámetro del pilote, D, según indica la expresión (F.57):

K s  67 Cu                                                                                  (F.57)
            D

13 En estos casos podrá adoptarse como “longitud elástica” del pilote T, el valor adimensional definido
      por la expresión:

       EI 1/4
T                                                                                       (F.58)
        DK s  

siendo
E, I, D, Ks los definidos anteriormente;

F.2.7.2 Efecto grupo

1 Para estimar el movimiento horizontal del grupo, en aquellos casos en los que no resulte crítico, se
      podrá considerar cada pilote del grupo sustituido, en su parte enterrada, por una varilla rígida virtual
      soportada por los resortes indicados en la Figura F.8, pero afectando a la longitud elástica estimada
      en la hipótesis de "pilote aislado" por un coeficiente de mayoración, m, tal y como se indica en la
      expresión (F.59):

T (pilote dentro del grupo) = m . T (pilote aislado)                                         (F.59)

2 Para espaciamientos entre pilotes superiores a 2,5 D y para pilotes cuya longitud dentro del terreno
      sea superior a 2,5 T, y a falta de datos concretos más fiables, se pueden utilizar los siguientes valo-
      res de m. (véase Figura F.9)

                                                  SE-C-150

<!-- pag 156 -->
Documento Básico SE-C Cimientos

              D 2                       Primera fila                  (F.60)
m  1 0,5   1,10                    Filas siguientes              (F.61)

              S1                   FILA 1ª

        D 2   D 2 
m  1  0,5  ·1      1,30
       S   S  
        1   2  

siendo  el diámetro del pilote
D       la separación entre ejes
S

                                               S1

                                                   DIRECCION DEL
                                                   ESFUERZO HORIZONTAL
                                                   PRINCIPAL

                                                               D
                                                                                   S2

       Figura F.9. Consideración del efecto grupo en la rigidez transversal para el cálculo de movimientos
                                                                      horizontales

F.2.8 Cálculo de esfuerzos en pilotes

1 Para obtener los esfuerzos en la parte enterrada de los pilotes, cuando se utilice el mismo modelo
      que el indicado en el apartado F.2.7.1, se aceptará la solución simplificada que se recoge en la Fi-
      gura F.10.

2 Para poder usar el modelo estructural de la Figura F.10 se determinarán previamente los valores de
      cálculo de los efectos de las acciones de la estructura sobre el pilote según se indica en el apartado
      2.4.2.5 utilizando los coeficientes de seguridad parciales, E, que se indican en la tabla 2.1. En dicha
      figura a estos esfuerzos se les denomina Ho y Mo (cortante y momento flector, respectivamente).

3 El valor de la profundidad zo, en la Figura F.10 es función exclusiva de la longitud enterrada del
      pilote, que se denomina “L” en dicha figura, y de la longitud elástica “T”, que se define en el aparta-
      do F.2.7.1 en función del producto de inercia de la sección transversal del pilote (EI) y de la defor-
      mabilidad del terreno.

4 El momento flector en la parte enterrada de la Figura F.10 se puede evaluar componiendo las par-
      tes debidas al esfuerzo de corte, Ho, parte superior de la figura, y el debido al momento flector Mo,
      parte inferior de la figura.

                                     SE-C-151

<!-- pag 157 -->
Documento Básico SE-C Cimientos

                          Figura F.10. Atenuación de esfuerzos en la parte enterrada de los pilotes

F.3. Elementos de contención

F.3.1 Métodos de equilibrio límite para estudio de la estabilidad de la pantalla

1 La comprobación de la estabilidad propia de la pantalla puede hacerse por el método del equilibrio
      límite, suponiendo que es una estructura rígida y que se produce la rotura del terreno en la base de
      la pantalla, a ambos lados de la misma.

2 Los empujes del terreno y del agua sobre la pantalla se determinan según los criterios definidos en
      el apartado 6.2, tomando en consideración la posible presencia de edificaciones o servicios próxi-
      mos a coronación.

3 Los empujes del terreno no deben ser inferiores, en ningún caso, a 0,25·´v, siendo·´v la presión
      efectiva vertical en cada capa del terreno.

                                                                                 SE-C-152

<!-- pag 158 -->
Documento Básico SE-C Cimientos

4 Los cálculos se podrán efectuar, en las fases intermedias de la excavación o de la construcción del
      edificio, considerando los valores representativos de las acciones y los valores característicos de
      los parámetros del terreno. En el intradós se considerará únicamente una fracción del empuje pasi-
      vo (ya que los corrimientos que serian necesarios para su movilización completa son demasiado
      grandes). En la elección de dicha fracción del empuje pasivo va implícito el coeficiente de seguridad
      de la estabilidad de la pantalla. Se tomarán los empujes activos sin afectar por ningún coeficiente
      de seguridad y los pasivos disminuidos, con relación a los de cálculo, por el coeficiente, E, definido
      en la tabla 2.1.

5 Se plantean las siguientes alternativas para el estudio de la pantalla:
      a) pantalla en voladizo;
      b) pantalla con un punto de sujeción;
      c) pantalla con más de un punto de sujeción;

F.3.1.1 Pantalla en voladizo
1 En la Figura F.11a se representa la deformada de la pantalla y las leyes de empujes unitarios a

      ambos lados de la misma, supuesto un terreno homogéneo sin cohesión y sin agua así como sin
      construcciones ni servicios en su entorno.

            Figura F.11. Pantalla en voladizo

2 En la Figura F.11b se representan las leyes de empujes simplificadas por encima del punto P de
      momento nulo, y la resultante R de los empujes por debajo de dicho punto que se supone actuando
      en P.

3 El planteamiento del equilibrio de fuerzas y momentos con el diagrama de la Figura F.11b, permite
      determinar las dos incógnitas R y to. En general, será suficiente establecer la nulidad de los momen-
      tos en P, con lo que se obtendrá to.

4 Para determinar el empotramiento total de la pantalla, to + t, para que sea estable, se podrá aplicar
      la regla empírica:

t = 0,2 to                                                                       (F.62)

5 Este exceso de profundidad por debajo del punto de momento nulo es suficiente para que pueda
      desarrollarse la fuerza R necesaria para mantener el equilibrio.

6 La magnitud de los empujes del terreno y del agua puede determinarse por medio de los criterios
      definidos en el apartado 6.2, no debiendo ser inferior el empuje unitario obtenido, a 0,25·´v.

7 Si la pantalla es de tablestacas metálicas, el ángulo de rozamiento del terreno con la pantalla se
      considerará nulo. En cualquier otro caso no debe tomarse mayor de los dos tercios del ángulo de
      rozamiento interno del terreno.

8 El rozamiento de la pantalla con el terreno en el intradós (lado de los empujes pasivos) se conside-
      rará nulo.

9 En el cálculo de los empujes se tendrán en cuenta las sobrecargas de cualquier tipo que puedan
      existir sobre el terreno en el trasdós de la pantalla.

10 El coeficiente E de minoración del empuje pasivo se define en la tabla 2.1.

11 Si la excavación se hace por debajo del nivel freático se considerará, a cada lado de la pantalla, la
      correspondiente ley de presiones intersticiales y de empujes del terreno, en términos de tensiones
      efectivas.

            SE-C-153

<!-- pag 159 -->
Documento Básico SE-C Cimientos

F.3.1.2 Pantalla con un punto de sujeción próximo a coronación
1 Se plantean dos posibles métodos de análisis:

      a) método de “base libre”;
      b) método de “base empotrada”.
2 La rotura por rotación o traslación de la pantalla con un punto de sujeción puede efectuarse en la
      hipótesis de que todos los corrimientos de la pantalla, en la parte empotrada, tienen el mismo senti-
      do (hacia el lado de la excavación). Este procedimiento se conoce con el nombre de "base libre".
3 En la Figura F.12a se representa la deformada de la pantalla y las leyes de empujes unitarios, acti-
      vos en el trasdós y pasivos en el intradós por debajo del fondo de excavación; en la Figura F.12b se
      representan las leyes de empujes simplificadas.

             Figura F.12. Pantalla con un punto de sujeción y base libre

4 La magnitud de los empujes puede determinarse por medio de los criterios definidos para pantallas
      en voladizo y en el apartado 6.2, no debiendo ser inferior, el empuje unitario obtenido, a 0,25·´v

5 El coeficiente E de minoración del empuje pasivo se define en la tabla 2.1.

6 El planteamiento del equilibrio de fuerzas y momentos permite determinar las dos únicas incógnitas,
      la fuerza de sujeción F y la profundidad de empotramiento to, estrictamente necesaria para la estabi-
      lidad. Como profundidad real de empotramiento debe tomarse:

to + 0,2 to                                                                     (F.63)

7 Otra posible alternativa de cálculo consiste en el método de la "base empotrada". Este método toma
      en consideración el hecho de que, cuando la profundidad de empotramiento aumenta, aparece un
      cierto empotramiento en la base. Utiliza la hipótesis de Blum (el punto de momento nulo coincide
      aproximadamente con el punto de empuje nulo). En la Figura F.13a se representan la deformada y
      las leyes de empujes, en el caso de suelo homogéneo, sin cohesión y sin agua. En la Figura F.13b
      se representan las leyes de empujes unitarios simplificadas, y en la Figura F.13c, las que se consi-
      deran para el planteamiento del equilibrio, junto con las fuerzas F, de sujeción y R, resultante de
      empujes por debajo del punto P, que se requieren para establecerlo. Se ha representado la ley de
      empujes resultante y puede apreciarse que tiene valor nulo en un cierto punto O (en el cual, el em-
      puje activo en el trasdós iguala al pasivo afectado por el coeficiente de seguridad en el intradós),
      por debajo del nivel de excavación.

             SE-C-154

<!-- pag 160 -->
Documento Básico SE-C Cimientos

            Figura F.13. Pantalla con un solo punto de sujeción y base empotrada

8 En este caso el número de incógnitas es de tres (to, F y R), mientras que el de ecuaciones estáticas
      es de dos (equilibrio de resultante y de momentos). Para resolver el problema se hace uso de una
      hipótesis auxiliar, muy aproximada a la realidad, consistente en suponer que el momento de la fuer-
      za de sujeción en el punto O es igual y contrario al de los empujes unitarios por encima de dicho
      punto, con relación al mismo. O lo que es lo mismo, que el momento flector de la pantalla en el pun-
      to O es nulo. Esta hipótesis proporciona la tercera ecuación necesaria.

9 Para determinar el empotramiento total de la pantalla, to + t, para que sea estable, se aplica la regla
      empírica:

t = 0,2 to                                                                        (F.64)

10 Este exceso de profundidad por debajo del punto de corrimiento nulo es suficiente para que pueda
      desarrollarse la fuerza R necesaria para mantener el equilibrio.

F.3.1.3 Pantalla con más de un punto de sujeción

1 El problema de la estabilidad es estáticamente indeterminado, aún en el caso de que la pantalla se
      proyecte sin soporte fijo en la zona de empotramiento. Los empujes sobre la pantalla se definirán
      según los criterios definidos en el apartado 6.2.

2 En cuanto a las fuerzas de sujeción, será necesario hacer hipótesis suplementarias razonables,
      sobre qué parte de los empujes activos absorbe cada anclaje o elemento de sujeción, siendo con-
      veniente efectuar los cálculos por procedimientos que tomen en consideración la interacción terreno
      - pantalla (basados en el modelo de Winkler o mediante métodos de elementos finitos o diferencias
      finitas).

3 La deformada real, en cada caso, dependerá de la magnitud de los empujes (o de la naturaleza del
      terreno), de la flexibilidad de la pantalla, del tipo de sujeción y del momento en que empiece a ac-
      tuar con relación a la excavación.

F.3.1.4 Métodos basados en el modelo de Winkler para el estudio de la estabilidad de la pantalla

1 La pantalla se modeliza como una viga elástica sobre muelles.

2 En la Figura F.14a se esquematiza una pantalla con el terreno modelado mediante una serie de
      muelles y en la Figura F.14b la ley empuje del terreno – deformación (tensión, desplazamiento) que
      debe definirse para cada uno de ellos.

            SE-C-155

<!-- pag 161 -->
Documento Básico SE-C Cimientos

                                            Estado pasivo

                                  TENSION

                                              Estado en reposo
                                            Estado activo

                                                    DESPLAZAMIENTO

                             (a)                              (b)

          Figura F.14. Pantalla modelada como viga elástica sobre muelles

3 El estudio geotécnico debe proporcionar la información necesaria para definir la ley tensión - des-
      plazamiento de cada uno de los muelles, mediante:

a) coeficientes de balasto;

b) coeficientes de empuje activo y pasivo;

c) empuje al reposo (incluyendo los empujes debidos al terreno y al agua).

4 El coeficiente de balasto kh se define como el cociente entre la presión horizontal (q) aplicada sobre
      un determinado punto del terreno en el paramento de la pantalla y el desplazamiento horizontal ()

      experimentado por dicho punto:

k h  q                                                                    (F.65)

5 El coeficiente de balasto, así definido, tiene unidades de densidad.

6 El coeficiente de balasto no es un parámetro intrínseco del material y en su definición debe tomarse
      en consideración la geometría y características de la pantalla y el nivel de excavación.

7 La estimación del coeficiente de balasto podrá realizarse:

a) a partir de correlaciones suficientemente contrastadas con parámetros geotécnicos del terreno;

b) a partir de la determinación de parámetros de deformabilidad representativos del terreno en la
      zona de influencia de la pantalla, ya sea mediante ensayos in situ o de laboratorio, y el poste-
      rior cálculo geotécnico para estimar movimientos en función del nivel de tensiones en la panta-
      lla.

8 Podrán considerarse valores del coeficiente de balasto diferentes en las ramas de carga y descar-
      ga.

9 Los elementos de apoyo se modelarán mediante muelles caracterizados con sus leyes tensión -
      desplazamiento.

10 Los cálculos se efectuarán considerando los valores representativos de las acciones y los valores
      característicos de los parámetros del terreno.

11 Este método de análisis permite estudiar pantallas con varios niveles de apuntalamiento o anclaje y
      considerar en el cálculo el proceso de ejecución. Asimismo, permite estimar el movimiento horizon-
      tal de la pantalla.

12 Deberá comprobarse que el cociente entre el empuje pasivo total y el movilizado, E, es superior a
      0,6 (pasivo movilizado inferior al 60%) en situaciones permanentes o transitorias y a 0,8 (pasivo
      movilizado inferior al 80%) en situaciones extraordinarias (tabla 2.1).

F.3.1.5 Métodos basados en modelos de elementos finitos o diferencias finitas para el estudio de
la estabilidad de la pantalla

1 El cálculo de la pantalla podrá efectuarse empleando modelos de elementos finitos o diferencias
      finitas, considerando el comportamiento del terreno según un modelo elastoplástico.

                                            SE-C-156

<!-- pag 162 -->
Documento Básico SE-C Cimientos

2 La caracterización de los materiales en los cálculos tensodeformacionales debe ajustarse a partir de
      experiencias comparables, con el mismo modelo de cálculo. La deformabilidad adoptada para los
      materiales debe evaluarse tomando en consideración su nivel de deformación.

3 El cálculo debe efectuarse con programas suficientemente contrastados en este tipo de estudios, y
      en su caso, deben efectuarse análisis de contraste con procedimientos clásicos.

4 La pantalla se modelará como una viga elástica con unos elementos de interface que deben carac-
      terizar el contacto terreno - pantalla.

5 Las herramientas de cálculo deben eliminar las tracciones tanto en el terreno como en los elemen-
      tos de interface.

6 El estudio geotécnico debe proporcionar los parámetros necesarios para definir el comportamiento
      tensodeformacional de los distintos niveles de terreno afectados por la obra.

7 Los cálculos se efectuarán considerando los valores representativos de las acciones y los valores
      característicos de los parámetros del terreno.

8 Este método de análisis permite estudiar pantallas con varios niveles de apuntalamiento o anclaje y
      considerar, en el cálculo, el proceso de ejecución. Asimismo permite estimar el movimiento de la
      pantalla y de los elementos de cimentación o servicios próximos.

9 La estabilidad de la pantalla debe comprobarse por uno de los dos procedimientos siguientes:
      a) efectuando los cálculos minorando los parámetros resistentes del terreno. Se considerarán
             coeficientes de seguridad, M, de 1,5 en situación permanente o transitoria y 1,2 en situación
             extraordinaria (tabla 2.1);
      b) calculando directamente el coeficiente de seguridad, M, que debe ser superior a 1,5 en situa-
             ción permanente o transitoria y a 1,2 en situación extraordinaria.

                                                                                 SE-C-157

