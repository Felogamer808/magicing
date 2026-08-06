# MagicIng

Herramienta web de verificaciones estructurales.

Nace para reemplazar un conjunto de planillas de Excel (`CALCULOS TODO.xlsx`, 24 hojas) por
una interfaz clara, con el detalle de fórmulas visible para poder auditar cada resultado.

## Correr el proyecto

```bash
npm install
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run test` | Tests del motor de cálculo (Vitest) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |

## Trabajar desde otra computadora

El repositorio se basta solo: un clon limpio pasa los tests y compila sin ningún
paso extra. Todo lo necesario está versionado, incluidas las instrucciones de
trabajo (`CLAUDE.md`), la documentación (`ARCHITECTURE.md`, `API.md`,
`STYLEGUIDE.md`, `TODO.md`) y el articulado de la norma como skill.

**Git es el único mecanismo de sincronización, y los cambios no viajan solos.**
Al empezar en cualquier máquina:

```bash
npm run empezar
```

Eso trae lo que haya en GitHub (`git pull --rebase --autostash`, así que no
molesta si hay trabajo a medio hacer), instala lo que falte si cambiaron las
dependencias, y activa el hook de envío automático.

Del otro lado no hace falta acordarse de nada: el hook `.githooks/post-commit`
manda el commit a GitHub apenas se cierra. Alcanza con commitear.

El hook se activa por máquina, no viaja activado en el clon — Git nunca ejecuta
hooks de un repositorio recién clonado, porque sería correr código ajeno sin que
nadie lo pida. Por eso `npm run empezar` lo activa: en una computadora nueva,
correrlo una vez deja todo listo.

Si el envío falla, es porque la otra computadora subió algo primero. El commit
local está a salvo; se resuelve con `npm run empezar` y después `git push`.

Lo que sigue siendo manual es lo que necesita criterio: **cuándo** cerrar un
avance y **con qué mensaje**. Este historial se lee para saber qué pasó, y un
commit automático cada cinco minutos lo llenaría de ruido y subiría estados a
medio hacer, con los tests en rojo.

El proyecto vive **fuera de OneDrive** a propósito. Tenerlo adentro parecía
cómodo pero rompía de tres formas: OneDrive sincroniza `.git` sin entender las
operaciones atómicas de Git y genera copias en conflicto que corrompen el
repositorio; `node_modules` son ~36.000 archivos con binarios compilados para un
sistema operativo concreto, que no sirven en otra máquina; y `.next` es caché de
compilación local que, a medio sincronizar, tira 500 en todas las páginas. Si el
proyecto vuelve a quedar dentro de una carpeta sincronizada, esto se rompe.

**Desde el navegador**, sin instalar nada: entrar a la cuenta de Claude, abrir
Claude Code en la web y elegir el repositorio `magicing`. Hace falta que la
cuenta de GitHub esté conectada, porque el repositorio es **privado**.

**Con Claude Code instalado en esa computadora**, si se quiere además levantar el
servidor de desarrollo y ver la página:

```bash
gh auth login
git clone https://github.com/Felogamer808/magicing.git
cd magicing
npm install
```

Dos cosas que **no** viajan con el repositorio, a propósito:

- La skill `jimenez-montoya` está en `.gitignore` por derechos de autor. En otra
  computadora no va a estar disponible; el articulado
  (`codigo-estructural-hormigon`) sí, porque es texto legal oficial.
- `.claude/settings.local.json` guarda los permisos concedidos en cada máquina,
  así que la primera sesión en una computadora nueva vuelve a preguntar.

Las planillas de Excel y los PDF de normas tampoco están versionados, pero no
hacen falta para editar la aplicación: los valores que salieron de ellos ya están
en los tests.

## Logotipo

`components/Logo.tsx` dibuja la palabra con la varita en el lugar de la "I" de "ING". Va en SVG y
no como imagen: escala sin perder filo, hereda el color del texto —así funciona en tema claro y
oscuro, y sale en negro al imprimir— y pesa unos cientos de bytes.

La palabra se arma con dos bloques de texto anclados por lados opuestos a la varita, así el dibujo
no depende de las métricas exactas de la tipografía. Las separaciones a los dos lados son
distintas a propósito: la varita está inclinada 12°, y a la altura de las mayúsculas su punta ya se
corrió unos 27 px hacia la derecha.

El único uso del corte redondeado (Fredoka) es este; el resto del sitio no lo carga.

## Estructura

La navegación tiene dos niveles: primero el **material** (sección) y dentro de él
el **tipo de elemento** (categoría). Los dos hacen falta porque el nombre de
categoría no es único entre materiales — "Vigas" existe en hormigón armado y en
metálicas —, así que agrupar solo por categoría las mezclaría.

Secciones abiertas: hormigón armado, estructuras metálicas y acciones. Previstas:
hormigón pretensado, madera y mampostería.

```
app/page.tsx                       Portada: elección de sección
app/secciones/<id>/page.tsx        Índice de verificaciones de una sección
app/verificaciones/<id>/page.tsx   Formulario + resultados de cada verificación
components/verificaciones/         Diagramas SVG y piezas de UI compartidas
lib/calc/ec2/                      Motor de cálculo Eurocódigo 2
lib/calc/aisc/                     Motor de cálculo AISC 360 (acero y mixtas)
lib/calc/cirsoc/                   Motor de cálculo CIRSOC (viento)
lib/verificaciones/registry.ts     Índice de verificaciones (alimenta menú y landing)
```

El motor de cálculo no depende de React: son funciones puras con sus tests al lado
(`*.test.ts`). Agregar una verificación nueva = un archivo de cálculo + sus tests + una
página + una entrada en el registry.

## Verificaciones disponibles

Todas están portadas de la planilla original y sus tests comparan el resultado contra los
valores que produce el Excel, celda por celda.

**Vigas** — flexión y cortante · con torsión (sección hueca equivalente, con la interacción
entre torsión, flexión y cortante) · de apeo (verificación completa: además de flexión y
cortante, armadura secundaria y de piel, anclaje y flecha).

**Losas** — armado a flexión en dos direcciones, con anclaje y momento resistente de la malla.

**Hormigón pretensado** — pieza pretesada según ACI 318-19: tensiones en servicio en las cuatro
situaciones, área de pretensado necesaria, pérdidas instantáneas y diferidas (ES, SH, CR y RE),
flexión última, cuantía mínima y flechas.

Es la única sección que no sigue el Eurocódigo: las planillas de origen están resueltas con ACI 318
y se respetó esa norma en lugar de traducirlas. Las dos —vigas y losas alveolares— resuelven el
mismo cálculo con datos distintos, así que hay un módulo solo.

El elemento se calcula en dos etapas, y esa distinción es la que manda: el pretensado se introduce
sobre la **sección simple**, la pieza premoldeada sola, y las cargas posteriores actúan sobre la
**sección compuesta**, ya con la carpeta. Mezclarlas es el error más fácil de cometer, y de hecho
las planillas lo cometían en un punto.

**Estructuras metálicas** — compresión con pandeo por flexión en los dos ejes (AISC 360 art. E3) ·
flexión en secciones abiertas (arts. F2 y F6) y cerradas (arts. F7 y F8) · corte en secciones
abiertas (art. G2) y cerradas (arts. G4 y G5) · flexo-compresión biaxial (art. H1) · sección mixta
CFT: tubo circular relleno de hormigón · soldaduras y chapa de base.

El catálogo (`lib/calc/aisc/perfiles.ts`) tiene dos clases de familia. Las **de catálogo** —PNI y
PNC 80–300, HEB 100–300— se eligen por altura y están transcritas del catálogo de ArcelorMittal
*Perfiles y barras* (dimensiones según EN 10365:2017). Las **de geometría libre** —tubo redondo y
tubo rectangular— se definen por dimensiones y espesor, y sus propiedades se calculan.

Cada familia declara qué parámetros necesita, y de ahí sale el formulario: al pasar de un PNI a un
tubo redondo el segundo campo deja de ser una altura de catálogo y pasa a ser diámetro con espesor.

Los dos PNC **no se tabulan: se componen**, y de dos maneras que no dan lo mismo. Soldados por las
almas forman una sección en I abierta; enfrentados y soldados por las alas, un cajón cerrado. El
eje fuerte es idéntico en las dos —los perfiles están a la misma altura—, pero el cajón tiene mucha
más inercia débil y una constante de torsión dos órdenes mayor, porque pasa a resistir por Bredt.

Esa diferencia decide qué artículo aplica. Una sección cerrada tiene alabeo nulo, así que las ecs.
F2-6 y F2-7 ni siquiera están definidas para ella. El capítulo F y el G no son un artículo cada uno
sino una familia, y cuál corresponde lo dice la forma de la sección:

| | Sección abierta | Rectangular o cajón | Redonda |
|---|---|---|---|
| **Flexión** | F2 | F7 | F8 |
| **Corte** | G2 | G4 | G5 |

Esa decisión vive en un solo lugar (`lib/calc/aisc/seleccion-articulo.ts`), para que ninguna página
la repita —ni la repita mal—. Las páginas muestran en pantalla por qué artículo salió el resultado.

Dos detalles del capítulo G que es fácil pasar por alto y que la herramienta aplica: el
coeficiente de seguridad al corte **no** es 1,67 para todos —las almas robustas de perfiles I
laminados van con 1,50 por el art. G1(a)—, y los canales quedan siempre fuera de esa excepción
aunque su alma sea igual de robusta.

**Cimentaciones** — zapata aislada (con punzonamiento y cortante) · zapata corrida · zapata de
medianería · zapata combinada · losa de fundación · pilotes · cabezal de 2 pilotes.

**Contención** — muro de contención: vuelco, deslizamiento y tensión del suelo, en muro libre
o apuntalado por contrapiso y losa.

**Estado límite de servicio** — fisuración: abertura característica por el método del Anejo 19
(art. 7.3.4), con área eficaz, cuantía eficaz y fibra neutra de la sección fisurada.

**Acciones** — viento (CIRSOC 102): velocidad de cálculo, presión dinámica y carga por nivel.

**Uniones** — cordón de soldadura en perfil H y chapa de base con pernos de anclaje.

De estas, cuatro tipos de fundación (medianería, combinada, losa de fundación y pilotes) más
el punzonamiento de la zapata aislada **no existían en la planilla**: se construyeron con el
método general de la norma, sin un caso real contra el cual contrastarlos. Están verificados a
mano contra fórmulas clásicas y con tests de sanidad, pero conviene revisarlos antes de usarlos
en obra. Cada página lo aclara en pantalla.

## Errores encontrados en la planilla original

Todos corregidos acá a propósito, documentados en los tests y aclarados en la interfaz. El
patrón se repite: la mayoría estaban ocultos porque en el caso de ejemplo los dos valores
involucrados coincidían.

1. **Vigas** — la armadura negativa no aplicaba el As mínimo (`=MAX(L8)` sin el rango de mínimos).
2. **Zapatas** — el armado en dirección B usaba `Mk A` en lugar de `Mk B`.
3. **Losas** — el canto útil de la armadura positiva en X usaba el recubrimiento de negativos,
   y la separación máxima se redondeaba a múltiplos de 2 cm en tres de las cuatro direcciones
   pero no en la cuarta.
4. **Cabezales** — la separación de estribos verticales se dividía por `n+1` en la hoja de pilar
   circular y por `n-1` en la de rectangular.
5. **Muros de contención** — el peso del alzado entraba al momento estabilizador con brazo `A/2`
   (medio ancho de zapata) en lugar del centro de gravedad del propio alzado. La corrección deja
   el resultado más conservador que el de la planilla.
6. **Viento** — los topes de la presión interior estaban escritos como comparaciones encadenadas
   (`-0,2 < x < 0`), que Excel evalúa de izquierda a derecha y por lo tanto nunca se cumplen.
10. **Planillas de pretensado** — cuatro hallazgos, todos con test de regresión en
    `lib/calc/aci/pretensado.test.ts`:
    - `ρp` se calculaba como `Ap/((0,2072 − 9·0,0091)·10⁶)`, un área fija sin relación con la
      sección: daba el mismo denominador para la viga y para la losa, y sobrestimaba la cuantía
      más del doble. Baja `fps` y por lo tanto `Mn`, así que iba **del lado seguro**, pero no es
      el valor del art. 20.3.2.3.1.
    - `Mcr` omitía el módulo de rotura y se quedaba solo con el aporte del pretensado. Eso
      **subestima** `Mcr` y hace pasar la comprobación de cuantía mínima con más holgura de la que
      corresponde: es el único de los cuatro que va del lado inseguro.
    - Convivían **dos excentricidades distintas**: 0,156 m medida desde el baricentro para las
      tensiones y 0,175 m medida desde la media altura para `Mcr`. En una sección no simétrica no
      pueden ser las dos.
    - La tensión de la fibra inferior por momento usaba el brazo de la fibra **superior**
      (`ysup` en lugar de `yg`). En la losa no se notaba porque es simétrica; en la viga sí.

    Además, la hoja de losas usaba el área de la sección **compuesta** para el término axial del
    pretensado donde la de vigas usaba la **simple**. El pretensado actúa antes de que exista la
    carpeta, así que corresponde la simple.

9. **Constante de torsión de los PNC** — la primera versión de la tabla de perfiles se cargó de
   valores de DIN 1026-1 que no coinciden con los del catálogo: el `It` salía alto en diez de las
   doce alturas, hasta un 28 % en el PNC300 (47,9 cm⁴ contra 37,4). No afecta compresión ni
   plastificación, solo el pandeo lateral-torsional, que es justo donde no se nota a simple
   vista. Se corrigió contra el catálogo y quedó con un test por altura.

8. **Perfiles 2PNC (planilla AISC 360.xlsx)** — la única columna de perfil doble traía tres
   valores puestos a mano: `Iy` igual a `Ix` (y por lo tanto `ry = rx`), lo que **sobrestima la
   capacidad a compresión** porque hace desaparecer el pandeo por el eje débil; `J` del mismo
   orden que `Ix`, cuando en secciones abiertas va tres órdenes por debajo; y `Zx` tomado como
   1,09·`Sx` en lugar del módulo plástico tabulado. Los tres están cubiertos por tests de
   regresión en `lib/calc/aisc/perfiles.test.ts`.

7. **Vigas, cortante sin armadura transversal** — la hoja mezclaba dos normas: `C_Rd,c = 0,15/γc`
   (que no es de ninguna; el articulado dice `0,18/γc` y parece un 0,18 mal transcripto) con
   `v_min = 0,075/γc·k^1,5·√fck`, que es el mínimo de la **EHE-08**, la norma anterior. El Anejo 19
   pide `v_min = 0,035·k^(3/2)·√fck`. Importa porque con cuantías bajas manda el mínimo: en una
   viga plana con `ρl = 0,3 %` la planilla devolvía **43 % más resistencia** que la norma, o sea
   podía no pedir estribos donde el articulado sí los pide. Es el único de los siete donde el
   error de la planilla iba del lado inseguro.

## Norma de referencia

El motor implementa el **Anejo 19 del Código Estructural** (RD 470/2021), la
transposición española del Eurocódigo 2. El articulado está disponible como skill
del repositorio y cada fórmula del código cita su artículo, ecuación y página.

La planilla original decía seguir el Eurocódigo pero arrastraba coeficientes de la
**EHE-08**, derogada. La auditoría completa está en `AUDITORIA.md`: seis
hallazgos, todos corregidos. Los que iban del lado inseguro eran el mínimo del
cortante sin estribos, el agotamiento de bielas `V_Rd,max`, la interacción
torsión+cortante que no se comprobaba, y el perímetro crítico de punzonamiento.

Por eso **algunos resultados ya no coinciden con la planilla**, y es a propósito:
donde difieren, manda el articulado. Cada test que cambió de valor esperado
explica por qué el número nuevo es el correcto.

## Pendientes

Fuera de alcance por ahora: punzonamiento en zapata combinada y losa de fundación, grupo de
pilotes, pandeo de pilotes, y cabezales sobre núcleos (la planilla tiene hojas aparte para
esos).

## Cómo se usa

- **Los datos quedan guardados.** Cada verificación recuerda lo cargado entre recargas y
  navegaciones, en su propio espacio, así que se puede saltar de una a otra sin perder nada.
  El botón *Restablecer* vuelve a los valores por defecto.
- **Imprimir** genera una hoja apta para adjuntar a la memoria de cálculo: sin navegación ni
  botones, con los paneles "Ver cálculo" abiertos y sin cortar tarjetas entre páginas. Desde el
  diálogo de impresión se puede guardar como PDF.
- **Tema claro y oscuro**, con la preferencia guardada. Si nunca se eligió, sigue la del sistema.
- Los campos de diámetro de armadura sugieren la serie comercial, pero no la imponen.
- `Ctrl+F` encuentra texto dentro de los paneles "Ver cálculo" aunque estén cerrados, y los abre.

## Convenciones

- Interfaz y nombres de variables en español, con la misma terminología que la planilla
  original, para no tener que reaprender nombres.
- Unidades: metros, kN, kN·m, MPa, cm². Los diámetros de barra van en mm.
- Cada resultado booleano se muestra como Verifica / No verifica, y cada bloque tiene un panel
  "Ver cálculo" con los pasos intermedios.

## Nota sobre las normas

Los PDFs de normas (Eurocódigo, Jiménez Montoya) y las planillas de Excel **no se versionan**
— están en el `.gitignore`. Las normas tienen copyright y no deben subirse al repositorio.
