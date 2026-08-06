// Construye un índice "artículo -> página" del texto plano de la norma, para
// poder abrir después solo el tramo que hace falta en lugar de las 680 páginas.
// pdftotext separa páginas con form feed (\f).
const fs = require("fs");

const [, , entrada, salida] = process.argv;
const paginas = fs.readFileSync(entrada, "utf8").split("\f");

const encabezado =
  /^\s{0,12}(CHAPTER\s+[A-Z]+|APPENDIX\s+\d+|[A-Z]\d{1,2}[a-z]?\.\s+\S|SECTION\s+[A-Z]\d)/;

const filas = [];
paginas.forEach((pagina, i) => {
  for (const linea of pagina.split("\n")) {
    const limpia = linea.replace(/\s+$/, "");
    if (!encabezado.test(limpia)) continue;
    const texto = limpia.trim().replace(/\s{2,}/g, " ");
    // Las líneas del índice del propio PDF terminan en el número de página: se descartan
    // para no duplicar cada artículo con su entrada de la tabla de contenidos.
    if (/\.{3,}\s*\d+$/.test(texto) || /\s\d{1,3}$/.test(texto)) continue;
    if (texto.length > 90) continue;
    filas.push({ pagina: i + 1, texto });
  }
});

// Un artículo puede repetirse (encabezado de página): nos quedamos con la primera aparición.
const vistos = new Set();
const unicas = filas.filter((f) => {
  const clave = f.texto.toUpperCase();
  if (vistos.has(clave)) return false;
  vistos.add(clave);
  return true;
});

const salidaTexto = unicas.map((f) => `p${f.pagina}\t${f.texto}`).join("\n");
fs.writeFileSync(salida, salidaTexto, "utf8");
console.log(`${unicas.length} entradas -> ${salida} (${salidaTexto.length} caracteres)`);
