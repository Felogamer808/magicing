import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Utilidades de línea de comandos, no código de la aplicación: corren con
    // `node` sueltas y usan require(), que la config de Next prohíbe.
    "scripts/**",
    // Copias del repositorio que crea Claude Code para trabajar en paralelo.
    // Git ya las excluye, pero ESLint no lee esa exclusión y las lintaba como
    // si fueran del proyecto: una sola tarea en segundo plano tiraba cientos de
    // errores ajenos y dejaba `npm run lint` inservible.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
