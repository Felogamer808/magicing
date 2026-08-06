// Saca un rango de páginas del texto plano de la norma, para leer un artículo
// puntual sin abrir las 680.
const fs = require("fs");
const [, , entrada, desde, hasta] = process.argv;
const paginas = fs.readFileSync(entrada, "utf8").split("\f");
const trozo = paginas.slice(Number(desde) - 1, Number(hasta));
process.stdout.write(trozo.map((p, i) => `\n===== p${Number(desde) + i} =====\n${p}`).join(""));
