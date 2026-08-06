# Herramientas de lectura de normas y planillas

Los scripts se versionan; **lo que producen, no**. Las normas con derechos de autor
no pueden subirse al repositorio, y una extracción del texto de la norma sigue
siendo la norma. Por eso `.gitignore` excluye la carpeta de salida.

La distinción es la misma que ya usa el repositorio: el articulado del Código
Estructural va versionado por ser un real decreto —texto legal oficial—, mientras
que Jiménez Montoya está excluido por ser un libro con derechos. **ANSI/AISC
360-16 cae del lado de Jiménez Montoya**: es una norma con copyright del American
Institute of Steel Construction, no legislación.

Con estos scripts, cada máquina reconstruye lo que necesita a partir de su propia
copia del PDF, sin que el texto pase nunca por GitHub.

## Requisitos

`pdftotext`, de poppler. En Windows:

```bash
winget install --id oschwartz10612.Poppler -e
```

## Leer una norma en PDF

Primero el texto plano completo, y después un índice de artículo a página:

```bash
pdftotext -layout "AISC 360-16.pdf" scripts/normas/salida/aisc360.txt
```

```bash
node scripts/normas/indexar.js scripts/normas/salida/aisc360.txt scripts/normas/salida/aisc360-indice.txt
```

El índice ocupa unos 4 kB para una norma de 680 páginas. Con él a la vista se abre
solo el artículo que hace falta, en lugar de cargar el documento entero:

```bash
node scripts/normas/paginas.js scripts/normas/salida/aisc360.txt 105 107
```

## Leer una planilla de Excel

Vuelca un `.xlsx` a texto, con las fórmulas de cada celda además de los valores.
No necesita Excel ni Python: un `.xlsx` es un zip de XML.

```bash
powershell -File scripts/normas/dump-xlsx.ps1 -Xlsx "AISC 360.xlsx" -Salida scripts/normas/salida/planilla.txt
```

Ver las fórmulas y no solo los resultados es lo que permitió encontrar los errores
de las planillas originales que documenta `AUDITORIA.md`.
