# Pendientes

Estado al último commit. Lo terminado no se lista: está en `git log` y en el
`README.md`.

## En curso — traspaso del 2026-10-06

Resumen de la sesión del 2026-10-05, para seguir desde otra computadora.

### PR abiertas, en orden de fusión

Las de zapatas van encadenadas: cada una parte de la anterior, así que se
fusionan en este orden. GitHub re-apunta la base sola al fusionar la previa.

1. **#73** Zapata aislada: tres errores del lado inseguro (resultante fuera de
   la base daba "cumple", excentricidad sin peso propio, armado con presiones
   negativas al despegarse).
2. **#74** Zapata aislada: punzonamiento con el momento del pilar, ec. (6.51), y
   bielas en la cara del pilar, ec. (6.53).
3. **#75** Zapata aislada: flexión, cuantía mínima y anclaje según el Anejo 19
   (art. 9.8.2.2). Saca lo último de EHE-08 del módulo.
4. **#76** Zapata de medianería con el Anejo 19, como la aislada.
5. **#79** Viga centradora: página nueva y botón "Resolver con viga centradora"
   desde la medianería.

Independientes, contra `main`:

- **#77** Viga con carga en voladizo por bielas y tirantes, sólo Anejo 19.
  Página nueva. Motivada por una viga real (h 0,89, b 0,77, L 1,24, a 0,33,
  P 1485 kN): el nudo bajo el pilar apeado de 0,14 × 0,50 **no verifica**
  (21,2 MPa contra 15,0 MPa) y el tirante tiene que ir doblado hacia abajo.
- **#78** Mostrar la norma de hormigón como "Anejo 19" en vez de "EC2".

### Lo que sigue

- **Modo proyecto con vínculos entre elementos** (segunda mitad del pedido de
  la viga centradora): que Z-1 (medianería), VC-1 (viga) y Z-2 (interior)
  queden vinculados en un proyecto y las cargas viajen solas. Propuesta: el
  vínculo es un elemento que apunta a otros; las cargas transmitidas se
  muestran, no se copian; si cambia el elemento de origen, el vinculado queda
  marcado como desactualizado; `VERSION_FORMATO` pasa a 2 con conversión
  automática desde 1. **Faltan dos respuestas del usuario:** si el vínculo se
  crea al guardar desde la página o desde la vista del proyecto, y si se piensa
  vincular otros casos (pilar → zapata, viga → viga que la apea) para hacerlo
  genérico. El campo `ifc` del elemento (2026-10-15) **no** subió la versión:
  es opcional. Este salto a 2 es el único previsto y cubre las dos cosas; la
  conversión desde 1 deja `ifc` tal como está.
- **Modelo 3D desde IFC** (hecho, rama `modelo-ifc`, 2026-10-15): importar IFC,
  elementos vinculados por GlobalId, estado derivado y visor pintado por
  estado. Ver `ARCHITECTURE.md` → "Modelo IFC". Queda:
  - **Estado de las verificaciones que no son de cimentaciones.** Hoy dan "no
    evaluable": hace falta que cada módulo de `lib/verificaciones/recomendaciones/`
    exporte su `comprobarX(campos)`, como cimentaciones para el MCP. Son ~30
    archivos que edita el trabajo de comprobaciones: hacerlo coordinado.
  - Cargar la sección leída del IFC en los campos de la verificación (decidido
    no hacerlo todavía: el IFC de Revit es el modelo físico).
  - Contrastar la clase IFC contra los cálculos del elemento (una `IfcColumn`
    con flexión de viga) y avisar.
  - Ejes, niveles y rótulos en el visor, para que se lea "tipo Revit".
- **CAD → Revit** (en curso, rama `cad-a-revit`, 2026-10-19): sección de
  MagicIng que lee un DXF de planta de fundaciones, la interpreta y exporta un
  archivo que un script de Dynamo (Revit 2026) usa para colocar las familias
  de la oficina. Decidido así en vez de generar un IFC: un IFC abierto en
  Revit entra como formas no editables. Hecho: lector de DXF (`lib/dxf/`),
  rótulos y pilotes, cabezales, vigas y zonas (`lib/cad-revit/`), y la
  pantalla `/cad-revit` con la planta interpretada y la lista de diferencias,
  y la exportación (JSON en m, origen a origen, desnivel por cabezal, largo
  de pilotes). Falta: el script de Dynamo que la lee y coloca las familias
  (necesita el nombre del parámetro de largo del cabezal: correr
  `listar-familias-magicing.dyn`). Criterios dados por el usuario:
  - El CAD se vincula en Revit **origen a origen** (2026-10-19). Ajustado
    tras la prueba en Revit: el script coloca sobre el CAD vinculado con el
    mismo nombre, esté donde esté (el REV08 está corrido ~164 m, ~39 m del
    FUNDO132 sobre el que se modeló a mano).
  - **Geometría de las vigas: de cara a cara del cabezal** (para la vista y
    para Revit; 2026-10-19). No cambia el cálculo:
  - **Largo de cálculo** (2026-10-19): las **vigas centradoras**, desde el
    pilar que descarga hasta el pilote más lejano; las **riostras**, de cara
    a cara de cabezal. Cuando una viga del modelo pase a una verificación,
    el largo sale de esta regla y no de la geometría.
  - Cara superior de cabezales y vigas a una cota común, salvo el CT14
    (ascensor) 1,30 m más abajo; canto de cada pieza según su rótulo.
  - El CT14 (ascensor) usa la familia **Cimentacion-Rectangular**, no
    "Cabezal ascensor" (2026-10-19).
  - **Planta en el proyecto** (2026-10-21): al llevar la planta se guarda su
    dibujo (`Proyecto.planta`, unas decenas de KB); el proyecto la dibuja sin
    el DXF, pintada por estado. Tocar una pieza abre su panel: G, Q, Nd a mano,
    el pilar sobre un croquis del cabezal (lados A y B, A = dirección de los
    pilotes) y el botón a su cálculo con lo que falta cargar.
  - **3D de la fundación** (2026-10-21): paso 1 del objetivo "modelo 3D que
    se completa con colores". Hecho para la planta de CAD. Siguen: paso 2,
    que el IFC de Revit se entienda solo (familias CTn, bxh, ⌀); paso 3,
    vigas y pilares de la estructura.
  - **Pilotes** (2026-10-21): por defecto **sólo descargas** para la pilotera
    (no se verifican); verificarlos es opcional por proyecto. Tabla de
    capacidad por diámetro de la pilotera, por proyecto: dice si el diámetro
    alcanza y cuál es el más chico que alcanzaría.
  - **Cargas de los pilares** (2026-10-19): por ahora se cargan **a mano en
    MagicIng**. Después, un Excel que las saque de Robot.
  - Probado en Revit 2026 sobre una copia de FUNDACIONES MAGICING: 21
    cabezales, 35 vigas, 50 pilotes, alturas correctas, CT14 en −1300.
  - **Calcular la planta** (rama `calcular-planta`). Criterios: Nd = 1,35·G +
    1,5·Q; Nk por pilote = (G + Q + peso propio del cabezal a 25 kN/m³) / nº de
    pilotes; suelo (fs, qp, FS) uno por proyecto; armadura y sección del pilar a
    mano. Hecho: paso 1 (planta → proyecto), paso 2 (cargas del pilar y suelo,
    derivados) y paso 3 (planta pintada por estado). Cabezal de 1 pilote
    hecho (2026-10-19): el Anejo 19 deja los encepados fuera (art. 9.8.1),
    así que compresión localizada (6.7) y tracción transversal por mitad del
    canto (6.5.3), pilote como cuadrado de igual área, y con a > H/2 (fuera
    de la ec. 6.59) T sale de la ec. 6.58 con b = lado del cabezal. VC sobre pilotes hecha (2026-10-19, ver
    "Para no volver a preguntarlos"). Cabezales de 3 o más pilotes hechos
    (2026-10-23, `cabezal-n-pilotes`): un modelo general para cualquier
    cantidad y disposición, ver "Criterios". La armadura se carga pieza por
    pieza en su formulario.
  - **Cabezal de núcleo** (pendiente): los núcleos bajan muros con N, Mx y My,
    no un pilar centrado. Las memorias de PEA 2022/2024/2025 los resuelven con
    reparto rígido N/n ± M·x/Σx² (o losa rígida sobre resortes en Robot) y
    fajas, con pilotes que pueden quedar traccionados. Es una verificación
    aparte: preguntar el modelo antes de implementarla.
  - **σ del tirante en cabezales** (pendiente de confirmar): el de 2 y el de n
    pilotes usan mín(fyd; 0,8·fyk) = 400 MPa con B500, más conservador que el
    fyd del art. 6.5.3. Las memorias usan 400 MPa (EHE-08).
  - **Cabezal medianero de 2 pilotes** (CT11, CT12; hecho, 2026-10-22): la VC
    centra el momento del pilar descentrado, así que el cabezal se verifica
    con R₁d de la palanca, centrada, en lugar del Nd (`cargas.ts`). Sin e en
    la VC queda sin evaluar. El cabezal de 1 pilote medianero sigue con el Nd.
  - **Dos centradoras en el mismo nodo** (hecho, 2026-10-23): superposición de
    las dos palancas, R₁ = N + ΔR_x + ΔR_y, con M_acc en las dos direcciones;
    en el Nk del pilote y en el R₁d del cabezal. Supone las VC en cruz.
  - **Anclaje de la superior y fisuración de la VC** (hecho, 2026-10-23): el
    anclaje va de la cara interior del pilar a la exterior, donde termina la
    viga (el largo de cálculo sigue desde el eje), por los arts. 6.5.4 (7) y
    8.4; la fisuración, por el art. 7.3.4 en el pilote con Nqp = G + ψ2·Q (ψ2
    por proyecto, 0,3 sin dato) y wmax de la tabla 27.2 (XC2: 0,3 mm). Con
    barras gruesas sobre un pilar chico el anclaje no entra ni con patilla
    (Ø25 sobre 0,40 m: lbd ≈ 960 mm contra 880). Resuelto el 2026-10-26: el
    extremo puede ser la misma barra en U (se dimensiona el retorno por
    abajo) u horquillas solapadas (art. 8.7.3, α6 = 1,5), con el mandril de
    la tabla A19.8.1 y la ec. (8.1) y la curva dentro de h − 2·rec.
    Contraste con la planilla REV08: Md al 1 % en VC1, VC2, VC5 y VC6; en VC3
    y VC4 (medianero de 2 pilotes) −8 % y +5 % porque la planilla usa el F de
    Robot. El voladizo pilar–pilote, por la ec. (6.19), pide estribos densos
    (VC2: unos 7,4 cm² en 0,32 m) que la planilla no tenía.
  - Pilotes 10 cm dentro de la pieza que tienen encima, 12 m de largo
    representativo (no se calculan pilotes).
  - Cabezales y vigas se cierran a partir del contorno corrido; los huecos en
    el contorno de una centradora son donde llegan las riostras.
  - **Si lo dibujado no coincide con el rótulo, manda el rótulo** y la
    diferencia se informa (2026-10-19).
  - Los pilares no se dibujan: entran como cargas.
  - Familias de Revit: vigas "Solid Wall - Rectangular Beam" (`#Ancho`,
    `#Altura`; son vigas in situ), cabezales "Cimentacion-Rectangular"
    (`#Ancho`, `#Profundidad`), pilotes "M_Pile-Steel Pipe" (`Diameter`,
    `Depth`), con `IfcExportAs` cargado en las de cabezal y pilote.
- **Pilar que descarga en una viga sobre pilotes, armado como cabezal** (CT6,
  CT7 y CT8 de esa planta, sin medidas propias): falta decidir con qué modelo
  y artículos se verifica. Idea del usuario: definir dentro de la viga las
  dimensiones que harían de cabezal. Es criterio de ingeniería: preguntar
  antes de implementarlo.
- **Vuelco y deslizamiento** (hecho en aislada, corrida y combinada,
  2026-10-07, por el CTE DB SE-C, persistente y extraordinaria). Criterios
  decididos: estabiliza sólo "Nk permanente" (campo aparte, vacío = Nk), sin
  tierras ni pasivo. En la combinada cada pilar baja Mk y Hk en los dos ejes, y
  a lo largo entran en la viga como momento concentrado. La extraordinaria es un
  juego de cargas aparte que sólo comprueba el terreno: 1,5·σadm con despegue
  parcial, vuelco 0,9 / 1,2, deslizamiento γR = 1,1. El hormigón con la
  combinación accidental (hecho, 2026-10-12): cargas sin mayorar, γc = 1,3 y
  γs = 1,0 (tabla A19.2.1; el 1,2 de esta nota era el del EC2). Flexión sin la
  mínima, cortante, punzonamiento, anclaje y tirante, en un bloque aparte.
- **Viga de apeo y ménsula corta, sin Montoya** (hecho, 2026-10-07): todo por
  el Anejo 19. Quedan como avisos que no entran en el cumple d0 ≥ d/2 y los
  cercos en 2/3·d (ménsula), el tirante en 0,12·l y h ≥ 1,2·a (apeo). La
  carga colgada indirecta pasó del 65 % al 100 % (art. 9.2.5(1)) y la ménsula
  ya no ofrece H = 0,15·F automático. "Carga colgada" (`cuelgue.ts`) también:
  As·fyd ≥ Rd por el art. 6.5.3(1), zona de la figura A19.9.7 informativa y
  h ≥ 1,2·a como aviso.
- **Losa de fundación al Anejo 19** (hecho, 2026-10-07): flexión por metro
  (art. 6.1, ec. (9.1)), separación máxima de losas, cortante a d de la cara y
  punzonamiento de los tres pilares con la reacción descontada. Sin armadura
  de reparto: la otra dirección es su propia franja.
- **Pilar de hormigón** (hecho, 2026-10-12): sección rectangular por el Anejo 19,
  con segundo orden por curvatura nominal, esviada por la ec. (5.39), cortante
  y art. 9.5. Queda: pilar circular, barras de distinto diámetro en esquinas y
  caras, y longitud efectiva con k1 y k2 (ecs. (5.15)/(5.16)).
- **Muro portante: λlim y Kφ** (hecho, 2026-10-12): B = 1 + √(1 + 2ω) en la
  ec. (5.13) y Kφ con β = 0,35 + fck/200 − λ/150. Sin φ(∞,t0), φef = 2,14
  también en la curvatura, como el pilar. λlim sube (≈ el doble): muros que
  pedían segundo orden pueden dejar de pedirlo.
- **Cortante de vigas al Anejo 19** (hecho, 2026-10-12): los estribos toman
  VEd entero (ec. 6.8), mínima ρw,min (ec. 9.5) y sl,max = 0,75·d (ec. 9.6).
  Se mantienen cot θ = 1, fywd = mín(fyd; 0,8·fyk) con ν1 = 0,6 y el tope de
  oficina de 25 cm, declarado. La separación transversal entre ramas
  (st,max = 0,75·d ≤ 600 mm, ec. 9.8) se comprueba desde el 2026-10-12: entre
  ejes, con las ramas repartidas parejo; si no cumple avisa y propone más ramas.
- **Torsión: cercos por rama** (hecho, 2026-10-12): At (ec. 6.28) se pide en
  cada rama del cerco, así que el total es A90 + n·At. Antes se sumaba At una
  sola vez, del lado inseguro. El ejemplo de la página pasa a 30 × 70 con un
  cerco de 2 ramas Ø10 y 3Ø25 arriba.
- **Zapata corrida, combinada, losa de fundación y pilotes** siguen sin
  auditar. La corrida ya sigue el Anejo 19 (modelo de la aislada, por metro,
  2026-10-06), pero sin repaso independiente.
- **Par tirante–terreno**: el pilar o muro queda con M y V en el arranque y
  sólo se informan; no hay todavía verificación de pilar de hormigón que los
  tome. La losa tampoco se verifica con la tracción del tirante sumada.
- **Recomendaciones cuando no cumple o queda justa**: el motor está en
  `lib/verificaciones/recomendaciones/` y ya lo usan todas las páginas con
  comprobaciones (hormigón, acero, madera y pretensado). Cada página calcula
  con un resolver en `lib/calc/` que toma los campos tal como se cargaron, así
  las propuestas repiten el mismo cálculo. Una verificación nueva tiene que
  traer su resolver y sus palancas. Sin propuestas a propósito: los casos
  apuntalados del muro de contención (son alternativas), el anclaje con
  horquilla de la viga de apeo (es la alternativa al recto), las tensiones del
  pretensado (se resuelven con la sección, que se carga como un juego de
  propiedades que no se pueden mover sueltas) y el rango del lado del cordón
  de soldadura (puede fallar por grande o por chico).
- **Viga de atado: asiento diferencial** (hecho, 2026-10-12): CTE DB SE-C,
  art. 4.1.1 (7). δ es un dato; sin dato, la distorsión límite de la tabla 2.2
  por la distancia entre ejes. Empotrada en las dos zapatas (6·EI·δ/L²), EI =
  Ecm·I bruta, γ = 1,35, combinado con el axil por sección. Del lado seguro:
  con la tabla, el ejemplo de 0,40 × 0,40 ya no cumple.
- **MCP para el resto de las familias.** El servidor (`mcp/servidor.ts`) cubre
  sólo cimentaciones (2026-10-10). Sumar vigas, losas, muros, acero, madera y
  pretensado sigue los pasos de `ARCHITECTURE.md` → "Servidor MCP".
- **Vigas en T: lo que quedó fuera** (2026-10-23). Flexión y cortante y
  torsión ya tienen T y T invertida. Faltan: el ala de la T invertida como
  apoyo de losas o vigas (talón, región D); vigas en L (un solo vuelo); el
  rasante combinado con la flexión transversal del ala (art. 6.2.4 (5)), y
  el rasante también en la página de torsión; y el diagrama de rotura, que
  sigue siendo rectangular y por eso se oculta con ala. Fisuración y
  deformaciones ya tienen T y T invertida, y los vínculos desde las vigas
  llevan el ala (2026-10-27).
- **Contrastar un caso propio** de zapata aislada y medianería: quedan en
  "probada" hasta que alguien lo haga.

### Pendiente de confirmar por el usuario

- **Los proyectos son para Uruguay.** El viento ya va por UNIT. Queda por
  confirmar si para hormigón rige una norma UNIT (posiblemente la UNIT 1050) y
  en qué se basa, o si se acepta el Código Estructural / EC2 por criterio del
  proyectista. Conviene resolverlo antes de otra migración grande de norma.

### Criterios decididos el 2026-10-05

Para no volver a preguntarlos:

- Zapatas: excentricidad del terreno con peso propio, e = Mk/(Nk+PP).
- Punzonamiento con momento: los dos ejes se suman; MEd = 1,5·Mk sin descontar
  el contramomento del terreno; en la cara del pilar VEd = 1,5·Nk entero.
- Anclaje de zapatas: si la sección de cálculo queda a menos de h/2 del borde,
  ese lado no tiene tirante que anclar.
- Viga centradora: une zapata con zapata y no apoya en el terreno; ΔN no se
  descuenta de la interior; peso propio de la viga en toda la luz; M₁ con su
  signo; reparto del 20 % (art. 9.3.1.1 (2)); va en Cimentaciones, dentro de
  Hormigón armado.
- Viga centradora sobre pilotes (2026-10-19): palanca rígida de JM § 25.5.2;
  ΔN no se descuenta del apoyo lejano; M_acc = Nd·e_acc (0,10 m editable)
  entero en el pilote; Nd del pilar + 1,35·pp de la viga en toda la luz; l del
  pilar al centro de la pieza lejana, e a mano; medianero por regla
  automática; sin axil de atado; cortante del voladizo con β = a_v/2d; el
  pilote medianero recibe (G + Q)·l/(l − e) + la reacción del pp en servicio.
- Cabezal de 3 o más pilotes (2026-10-23): pilar en el centro del grupo, Ri =
  (Nd + 1,35·PP)/n, sin momentos; T = Σ Ri·(|ui| − a/4)/(0,85·d) por
  dirección, sobre el peor lado; nudo con k1/k2/k3 según los tirantes que
  ancla; malla de caras del art. 9.7 con el canto como espesor; parrilla ≥ 1/4
  y superior ≥ 1/10 de las bandas como criterio de oficina (EHE-08), declarado.
- Viga con carga en voladizo: página aparte, sólo Anejo 19; z = h − d′; la
  carga mínima que estabiliza el apoyo lejano se carga ya ponderada como
  favorable (el coeficiente es del Anejo 18, que no está entre las fuentes).

## Terminado: croquis por tarjeta de datos

Las **16 páginas** tienen croquis en sus tarjetas de datos, rotulando los mismos
símbolos que los campos. Viven en `components/verificaciones/croquis/`, agrupados
por familia: `CroquisViga`, `CroquisLosa`, `CroquisCabezal`, `CroquisMuro`,
`CroquisCimentacion` y `CroquisVarios`.

Lo que cada uno vino a resolver, por si hay que revisarlos:

- **Losas** — X va por dentro, apoyada sobre Y, y por eso tiene menor canto útil.
- **Muro** — `L1` no significa lo mismo en el caso 2 que en el 3, y `L2` no es una
  altura sino la separación entre apoyos.
- **Cabezal** — la separación entre pilotes no es un dato: es 2,5·D.
- **Zapatas** — "ancho // A" es el paralelo a A, no el perpendicular.
- **Combinada y losa de fundación** — la posición de los pilares se mide desde el
  borde izquierdo.
- **Corrida** — se calcula una rebanada de un metro.
- **Pilotes** — fs actúa en el fuste y qp sólo en la punta.

Convención para los que se agreguen: el croquis va dentro de `CardContent`,
envuelto en `<div className="col-span-full">` cuando la tarjeta usa grid.

## Funcionalidad pendiente

- **Vigas como en Ftool** (objetivo del usuario, 2026-10-27): cargar la viga
  real —cargas repartidas y puntuales, apoyos— y sacar de ahí M y V para la
  verificación, sin pasar por Ftool. La base es el Formulario de vigas
  (rigidez directa, 20 casos). Hoy los estribos por zonas usan la opción
  rápida: Vd en el apoyo y en el centro, lineal entre medio; con el diagrama
  real, la zona de apoyo saldría del V(x) verdadero y de cada apoyo por
  separado. Mantener también la carga rápida a mano.
  Fase 1 hecha: herramienta **Viga libre** (tramos, apoyos, cargas G/Q,
  combinación ELU / servicio con todo cargado). Fase 2 hecha: envolvente con Q
  alternada por tramo (2^n exacta, γG único). Falta fase 3, mandar el V(x) y los M a la verificación de vigas.
- **Memoria de cálculo de vigas**: todavía no muestra los estribos por zonas
  ni el cerco del ala (2026-10-27).
- **Varios casos guardados por verificación.** Hoy hay un solo juego de valores
  por verificación: no se puede tener "Viga V1" y "Viga V2" y alternar. Es lo más
  valioso que falta para usar la herramienta en un proyecto real.
- **Errores de validación que nombren el campo.** Cuando un dato es inválido los
  resultados desaparecen con un aviso genérico, sin decir cuál falta.
- **Encabezado en la impresión** con obra y fecha. Hoy el PDF sale por el diálogo
  del navegador, que agrega fecha y URL pero no datos de la obra.

## Deuda técnica

Pendiente, aprobado pero todavía sin hacer:

- **`derivarMateriales` no tiene la rama logarítmica de `f_ctm` por encima de
  C50.** La tabla A19.3.1 cambia de expresión ahí: hasta C50 vale la que está
  implementada, y por encima manda `2,12·ln(1 + (f_ck+8)/10)`. El motor de
  ménsula corta la calcula localmente (`lib/calc/ec2/mensula-corta.ts`) en vez
  de arreglar el módulo compartido, porque tocarlo **mueve resultados de otras
  verificaciones y sus tests**, y eso es un refactor aparte. Mientras tanto,
  cualquier otra verificación que use `f_ctm` con hormigón mayor a C50 está
  devolviendo un valor alto de más.

- **Ménsula corta: falta el pórtico plano.** Se decidió a propósito no meter un
  solver matricial 2D para resolver el marco: la ménsula se resuelve entera con
  el modelo de bielas y tirantes, que es lo que pide la norma para una región D.
  Anotado para no volver a proponerlo como si fuera un olvido.

- **Separar `Nk` en permanente y variable, en zapatas y pilotes.** Hoy `Nk` es
  una carga vertical característica agregada, y el motor la mayora entera con un
  único `GAMMA_F = 1,5`. Queda del lado seguro —a la parte permanente le tocaría
  1,35— pero es una simplificación: impide usar γG y γQ como los define la norma,
  y obliga a que la constante se llame γF en vez de γQ (ver
  `lib/calc/ec2/coeficientes.ts`). Pedirlas por separado como `Ng` y `Nq`
  resolvería las dos cosas. **Cambia resultados**, así que hay que rehacer los
  casos de la planilla, no sólo el código.

- **Bloque de validación repetido en las 16 páginas.** Cada `useMemo` de cálculo
  arranca convirtiendo todos sus campos con `aNumero()` y descartando el
  resultado si alguno no es finito o no es positivo (357 llamadas en total). Es
  lo que más pesa hoy al leer una página, y encaja con el pendiente de
  "errores de validación que nombren el campo": un helper que sepa qué campo
  falló resuelve las dos cosas de una vez.

Ya resuelto (queda anotado para no volver a proponerlo):

- `aNumero`, `fmt` y `describirCapas` viven en `lib/verificaciones/formato.ts`.
- Los seis componentes que se definían dentro de una página están en
  `components/verificaciones/`.
- Se fueron `zod` (declarado y nunca importado) y `components/ui/tabs.tsx`.

## Verificaciones fuera de alcance por ahora

Decidido no hacerlas todavía, no olvidado:

- Punzonamiento en zapata combinada y en losa de fundación.
- Grupo de pilotes y pandeo de pilotes.
- Cabezales sobre núcleos (la planilla tiene hojas aparte).
- Del índice siguen en "Próximamente": vigas con torsión ya está hecha, pero
  quedan las que nunca se portaron desde la planilla.

## Advertencia vigente

Cinco cálculos **no existían en la planilla** y se construyeron con el método
general de la norma, sin un caso real contra el cual contrastarlos: zapata de
medianería, zapata combinada, losa de fundación, pilotes, y el punzonamiento de
la zapata aislada. Están verificados a mano y con tests de sanidad, y cada página
lo aclara en pantalla, pero conviene revisarlos antes de usarlos en obra.

También conviene revisar la corrección del **muro de contención**: el brazo del
peso del alzado se cambió de `A/2` a `esp/2`, lo que da resultados **más
conservadores** que la planilla. Muros que antes verificaban podrían no verificar.
