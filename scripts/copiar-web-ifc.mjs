/**
 * Copia el wasm de web-ifc a public/web-ifc/, de donde lo pide el navegador.
 *
 * No se versiona: pesa 1,6 MB y tiene que coincidir byte a byte con la versión
 * de web-ifc instalada. Corre antes de `dev` y de `build`.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const origen = require.resolve("web-ifc/web-ifc.wasm");
const destino = path.join(import.meta.dirname, "..", "public", "web-ifc");
mkdirSync(destino, { recursive: true });
copyFileSync(origen, path.join(destino, "web-ifc.wasm"));
