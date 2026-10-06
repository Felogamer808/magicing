# CTE DB SE-C — an-e-interaccion-suelo-estructura

> Texto extraído con pdftotext del PDF oficial (codigotecnico.org). Las figuras no están; las tablas conservan el espaciado del PDF.

<!-- pag 130 -->
Documento Básico SE-C Cimientos

Anejo E. Interacción suelo-estructura
E.1 Concepto de rigidez relativa terreno-estructura

1 Para ilustrar el fenómeno de la interacción, la Figura E.1 a) muestra el caso sencillo de una zapata,
      infinitamente flexible, apoyada directamente sobre la superficie de un terreno horizontal, sobre la
      que se aplica una presión uniforme. Por efecto de ésta, el terreno y la zapata sufrirán un asiento,
      que resultará mayor en el centro que en los extremos y no se limitará al área cargada, sino que se
      extenderá a ambos lados de ella hasta una cierta distancia. Por ser infinitamente flexible, la zapata
      no será capaz de soportar momentos flectores y, en consecuencia, la distribución de presiones con
      que el terreno reaccionará será idéntica a la distribución uniforme de presiones colocada sobre la
      zapata.

2 Si por el contrari, la zapata fuera infinitamente rígida (véase Figura E.1 b), el asiento de la zapata
      sería uniforme. En casos intermedios de rigidez, el valor medio del asiento podrá ser similar al ante-
      rior, pero su distribución estará, evidentemente, condicionada por la rigidez del cimiento. Así, bajo
      los extremos de la zapata (zonas AB y CD), el asiento será mayor que el correspondiente a la zapa-
      ta flexible; mientras que en el centro (zona BC), el asiento será menor. En consecuencia, las pre-
      siones de respuesta del terreno en los extremos de la zapata rígida serán superiores a las corres-
      pondientes a la zapata flexible y, por el contrario, en su centro serán menores. Resulta así una dis-
      tribución no uniforme de presiones, caracterizada por unos valores máximos en los extremos y un
      valor mínimo en el centro.

                         Figura E.1. Distribución de presiones en cimentaciones flexibles y rígidas
3 Si el terreno se considerara elástico y de resistencia indefinida, la presión bajo los bordes A y D de

      la zapata rígida sería infinita. Dado que la resistencia del terreno es limitada, dichas presiones po-
      drán ser elevadas, pero tendrán un valor finito. En el caso de arcillas (véase Figura E.2.a), la distri-
      bución de presiones será en general muy semejante a la teórica del ejemplo anterior. Sin embargo,
      la resistencia limitada del terreno producirá en los extremos unas zonas de plastificación que ate-

                                                                                 SE-C-125

<!-- pag 131 -->
Documento Básico SE-C Cimientos

nuarán las presiones de borde y las redistribuirá hacia el centro de la zapata. En el caso de arenas,
dado que la falta de confinamiento en el borde de la zapata, supuesta ésta en superficie, no permiti-
ría el desarrollo de presiones elevadas, la distribución tomará en general la forma parabólica que se
indica en la Figura E.2.b.

        Figura E.2. Distribución de presiones en zapatas rígidas sobre arcillas y arenas

E.2 Estimación de las condiciones de rigidez relativa terreno-
estructura

1 La rigidez relativa de la estructura con respecto al terreno podrá estimarse mediante la evaluación
      del factor Kr definido en la expresión (E.1).

K r  3 EE ·IB                                                                            (E.1)
       E s ·B

siendo

EE              el módulo de deformación global representativo de los materiales empleados en la es-

                tructura;

IB              el momento de inercia de la estructura, por metro de ancho;

Es              el módulo de deformación del terreno;

B               el ancho de la cimentación.

2 El numerador de la expresión (E.1) representa la rigidez de la estructura por metro de ancho del
      edificio, que puede estimarse sumando las rigideces de la cimentación y de los elementos estructu-
      rales que gravitan sobre ella (vigas, forjados, muros).

3 A los efectos de este DB, se considerará que la estructura es rígida en relación con el terreno cuan-
      do Kr >0,5. Si Kr < 0,5, se considerará flexible.

E.3 Criterios de rigidez para cimentaciones directas

1 Se podrá considerar que una zapata aislada es rígida (concepto de rigidez relativa) cuando a efec-
      tos de cálculo, la distribución de presiones a que de lugar sobre el terreno pueda considerarse li-
      neal. A efectos prácticos, se considerará aceptable la hipótesis de rigidez relativa cuando (Figura
      E.3):

v   4 4EcIc                                                                             (E.2)
     4 B k sB

siendo          el vuelo de la zapata en una dirección cualquiera;
v
Ec              el módulo de deformación del material de la zapata (usualmente hormigón armado) re-
                presentativo del tipo de carga y su duración;
Ic
                el momento de inercia de la sección de la zapata perpendicular a la dirección del vuelo
B               considerado respecto a la horizontal que pasa por su centro de gravedad;

                el ancho de la zapata en dirección perpendicular al vuelo considerado.

                                             SE-C-126

<!-- pag 132 -->
Documento Básico SE-C Cimientos

ksB     el módulo de balasto de cálculo, representativo de las dimensiones del cimiento (véase

        apartado E.5).

                                   Figura E.3. Criterio de rigidez relativa para zapatas aisladas

2 La condición expresada en el apartado anterior será también de aplicación al caso de zapatas corri-
      das en la dirección transversal a misma.

3 En el caso de no cumplirse, la zapata se considerará flexible, y la distribución de presiones sobre el
      terreno y sus esfuerzos se obtendrán a partir de modelos de cálculo que consideren la interacción
      suelo-estructura.

4 La condición del párrafo 1 de este apartado suele verificarse con los cantos y vuelos usuales en
      zapatas aisladas sobre suelos. En cualquier caso se debe comprobar el cumplimiento de esta con-
      dición si se desea efectuar el cálculo con la hipótesis de distribución lineal de presiones sobre el te-
      rreno.

5 Salvo en el caso de zapatas aisladas sobre suelos muy rígidos o sobre roca, el cumplimiento de la
      rigidez estructural definida en el párrafo 4 del apartado 4.1.1 suele ser más restrictivo que la condi-
      ción de rigidez relativa definida en el párrafo 1 de este apartado.

6 En el caso general de que sobre una zapata aislada actúen momentos además de cargas vertica-
      les, se recomienda que la resultante de las acciones pase por el núcleo central de inercia.

7 Se considerará que una zapata combinada o corrida es rígida cuando a efectos de cálculo la distri-
      bución de presiones a que da lugar sobre el terreno pueda considerarse lineal. A efectos prácticos
      se considerará aceptable la hipótesis de rigidez relativa cuando (véase Figura E.4):

l   4 4EcIc                                            (E.3)
     2 B k sB

v   4 4EcIc                                            (E.4)
     4 B k sB

siendo  la luz del vano que separa, bien los dos pilares de una zapata combinada, bien dos pila-
l       res cualesquiera de una zapata corrida;

v       la luz de cualquier voladizo en la dirección en la dirección longitudinal;
B
Ec      el ancho de la zapata (dirección transversal);

        el módulo de deformación del material de la zapata (usualmente hormigón armado) re-
        presentativo del tipo de carga y su duración.

                        SE-C-127

<!-- pag 133 -->
Documento Básico SE-C Cimientos

Ic   el momento de inercia de la zapata en un plano vertical, transversal (perpendicular al

     plano de alineación de pilares), respecto a la horizontal que pasa por su centro de gra-

     vedad.

ksB  el módulo de balasto de cálculo, representativo de las dimensiones del cimiento (véase

     apartado E.5).

                         Figura E.4. Criterio de rigidez relativa para zapatas combinadas y corridas
8 En el caso de no cumplirse la condición anterior la zapata se considerará flexible.
9 A efectos de cálculo y para los cantos habituales, las zapatas corridas que se empleen para el apo-

      yo de 3 o más pilares, los emparrillados y las losas, se diseñarán mediante el empleo de modelos
      de cálculo que tengan en cuenta la interaccción suelo-estructura. No obstante se considerará que
      estos elementos son rígidos y que la distribución de presiones en el suelo es lineal cuando se cum-
      plan simultáneamente las condiciones de rigidez definidas en el párrafo 3 del apartado E.2 y en el
      párrafo 7 de este apartado.

E.4 Otros factores a considerar en la interacción suelo-estructura

E.4.1 Influencia del tipo de terreno

1 Dado que el tipo de terreno puede condicionar la distribución de presiones bajo la cimentación, este
      efecto podrá tenerse en cuenta, a juicio del proyectista, en casos especiales de cimentaciones de
      gran rigidez sobre terrenos arcillosos sobreconsolidados.

2 Los cimientos sobre suelos arcillosos saturados que bajo el efecto de las solicitaciones de la estruc-
      tura puedan quedar sometidos a un proceso de asiento diferido en el tiempo, deben ser objeto de
      un estudio especial. En dicho estudio se debe considerar el asentamiento tras la construcción del
      edificio así como el asiento diferido originado a lo largo del proceso de consolidación.

E.4.2 Influencia del tamaño de la cimentación

1 El incremento de presión transmitido al terreno por una cimentación directa disminuye progresiva-
      mente en profundidad con la distancia a ésta. A efectos de cálculo y salvo en el caso de suelos
      blandos, se podrá suponer que el límite de interés se circunscribe a puntos del terreno en los que el
      incremento de la presión vertical resulte mayor o igual al 10% de la presión media de contacto bajo
      la cimentación.

2 El lugar geométrico del espacio de suelo definido en el apartado anterior se denomina habitual-
      mente “bulbo de tensiones”, cuya forma cualitativa se muestra en la Figura E.5. El incremento de
      presión recibido por el suelo más allá de este bulbo será, en la mayoría de los casos, lo suficiente-
      mente pequeño como para que sus efectos sean comparativamente despreciables, aunque en ge-
      neral debe comprobarse.

                                                                                 SE-C-128

<!-- pag 134 -->
Documento Básico SE-C Cimientos

                                               Figura E.5. Concepto de bulbo de tensiones
3 Las observaciones anteriores indican que, a igualdad del resto de condiciones, el asiento que expe-

      rimentará una cimentación directa dependerá de las dimensiones del área cargada.
4 Este efecto se muestra de forma cualitativa en la Figura E.6, en donde se representan dos pilares

      que, recibiendo cargas distintas, transmiten presiones medias idénticas al terreno. Habida cuenta
      que la zapata de mayor tamaño tendrá una profundidad de influencia mayor (mayor bulbo de ten-
      siones y mayor volumen de terreno sobretensionado), su asiento será también mayor.

                                       Figura E.6. Influencia de las dimensiones del cimiento
5 Como efecto adicional con respecto al fenómeno de la interacción, si ambos pilares pertenecen al

      mismo edificio y se encuentran conectados por la estructura, la tendencia al mayor asiento del pilar
      2 originará una redistribución de esfuerzos en la estructura, que tenderá a su vez a descargar dicho
      pilar y transmitir parte de su carga a los pilares adyacentes.
6 Se debe por tanto prestar especial atención al diseño de las cimentaciones de estructuras con gran
      heterogeneidad de cargas ya que, incluso en la hipótesis de homogeneidad del terreno, el dimen-
      sionado realizado exclusivamente en función de una determinada presión admisible (véase el apar-
      tado 4.3) podría dar lugar a asientos diferenciales inadmisibles.
7 Asimismo, será de gran interés disponer de suficiente información geotécnica referente al posible
      crecimiento del módulo de deformación del terreno con la profundidad, factor éste que puede con-
      tribuir a atenuar los asientos diferenciales asociados a la variación de las dimensiones de las zapa-
      tas.
8 Si el diseño de las cimentaciones da lugar a zapatas relativamente próximas, los bulbos de tensio-
      nes de las zapatas individuales solaparán en profundidad, por lo que, a efectos de asiento, habrá
      que comprobar la cimentación como si tuviera el ancho total del conjunto de las zapatas (véase la
      Figura E.7).

                                                                                 SE-C-129

<!-- pag 135 -->
Documento Básico SE-C Cimientos

                   Figura E.7. Influencia de la proximidad de los cimientos

E.4.3 Otras consideraciones

1 En el análisis estructural, puede considerarse la utilización de modelos específicos para englobar
      detalles de los cimientos, habitualmente no tenidos en cuenta, como puede ser el caso de vigas
      centradoras o de elementos de arriostramiento entre cimientos.

2 La resultante en la base del cimiento debe incluir la solicitación obtenida en el análisis estructural,
      incluyendo el peso propio del cimiento, y en su caso, pozo, y el de los materiales sueltos que gravi-
      tan sobre él.

3 En el caso de edificios cimentados con zapatas aisladas y corridas, edificios con forjados o cámaras
      sanitarias y soleras, el valor característico qok al nivel de la base de apoyo de la cimentación corres-
      ponde a la presión vertical del terreno en derredor del cimiento, es decir con su cota final. En este
      caso, puede tenerse en cuenta el peso del encache, la solera y demás cargas permanentes que
      pueda garantizarse que existirán durante el periodo de servicio del edificio.

4 En el caso de edificios cimentados en losa, la presión vertical, qok, corresponde al peso de los ele-
      mentos permanentes en el exterior de la misma (véase D, en figura F.1).

5 Si sobre las zapatas o emparrillados se dispone una solera pasante, eficazmente engarzada y con
      suficiente capacidad resistente, ésta puede acabar comportándose como una losa.

E.5 Modelos de interacción. Módulo de balasto

1 El módulo de balasto ks se define como el cociente entre la presión vertical, q, aplicada sobre un
      determinado punto de un cimiento directo y el asiento, s, experimentado por dicho punto:

ks  q                                                                       (E.5)
      s

2 El módulo de balasto así definido, tiene unidades de densidad, lo que indica que la hipótesis efec-
      tuada equivale a suponer que el terreno es un líquido de densidad ks, sobre el que “flota” la cimen-
      tación.

3 La estimación del módulo de balasto podrá realizarse:

      a) A partir de ensayos de carga con placa (véase tabla D.7). De acuerdo con los efectos descritos
             en el apartado E.4.2 y dado que las placas de ensayo son necesariamente de pequeño tama-
             ño, se debe prestar especial atención a la conversión del módulo obtenido en el ensayo, ksp, al
             módulo de cálculo representativo de la anchura, B, real del cimiento, ksB,. A este respecto se
             recomienda emplear placas de diámetro equivalente igual o superior a 60 cm.

      b) A partir de la determinación de parámetros de deformabilidad representativos del terreno bajo
             la zona de influencia de la cimentación, ya sea mediante ensayos in situ o de laboratorio, y el
             posterior cálculo geotécnico de asientos.

4 La conversión del módulo para placa de 30 cm, ks30, al coeficiente de referencia, ksB, se puede ob-
      tener mediante las siguientes expresiones: (véase tabla D.29)

5 Para zapata cuadrada de ancho B:

      a) Para terrenos cohesivos:

k sB  k sp30 0,3                                                            (E.6)
                B

                   SE-C-130

<!-- pag 136 -->
Documento Básico SE-C Cimientos

b) Para terrenos granulares:

ksB  ksp30  B  0,3 2                                                                    (E.7)

            2·B 

6 Para zapata rectangular de ancho B, en cualquier tipo de terreno:

              B                                                                             (E.8)
k sBL  k sB 1  

              2·L 

7 La conversión del módulo para placa de 60 cm (ks60) al coeficiente de referencia ksB se puede obte-
      ner mediante las siguientes expresiones:

8 Para zapata cuadrada de ancho B:

      a) Para terrenos cohesivos:

k sB  k sp60 0,6                                                                             (E.9)
                B

b) Para terrenos granulares:

k sB      k sp60  B  0,3  2
                      2   
         0,6  0,3   2·B                                                                  (E.10)
                  
         2  0,6 

9 Para la cimentación de losas y emparrillados la fiabilidad de los módulos de balasto obtenidos a
      partir de ensayos de carga puede resultar insuficiente, dados los efectos de escala implicados
      (véase el apartado E.4.2). En estas circunstancias, se recomienda recurrir a la comprobación de di-
      chos módulos siguiendo los criterios del párrafo 3.b) anterior o, alternativamente, recurrir al empleo
      de métodos y modelos del terreno más avanzados.

10 La observación anterior puede cobrar especial importancia en el caso de existir terrenos heterogé-
      neos en la vertical (terrenos estratificados), cuando bajo un estrato rígido surge otro más deforma-
      ble. En estas circunstancias (véase la Figura E.8) el reducido bulbo de tensiones de la placa de en-
      sayo puede quedar limitado a las zonas más competentes del terreno, y no reflejar la deformabili-
      dad del conjunto terreno-cimentación.

           Figura E.8. Limitaciones del ensayo de carga con placa en terrenos estratificados
                                                                      SE-C-131

