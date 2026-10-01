import type { Metadata } from "next";
import { Inter } from "next/font/google";

/**
 * La sans de la variante C. Se carga sólo en esta ruta, no en el layout raíz:
 * si la dirección no se elige, la fuente se va con la carpeta y el resto del
 * sitio nunca la descargó.
 */
const labSans = Inter({
  variable: "--font-lab-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Laboratorio de estilo",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={labSans.variable}>{children}</div>;
}
