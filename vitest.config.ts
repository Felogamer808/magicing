import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  /*
   * El alias "@/" ya lo resuelve Next (lee tsconfig "paths" solo) y por eso
   * nunca hizo falta acá: dentro de lib/calc todo se importaba con rutas
   * relativas. Al ordenar por material, algunos módulos pasaron a importar a
   * un hermano de otra carpeta con "@/lib/calc/...", y Vitest —que corre sobre
   * Vite puro, sin leer tsconfig— no sabía qué hacer con eso. Coincide con el
   * mismo mapeo de tsconfig.json: "@/*" -> la raíz del proyecto.
   */
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
