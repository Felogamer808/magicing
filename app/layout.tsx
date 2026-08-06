import type { Metadata } from "next";
import { Fredoka, IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { scriptTemaInicial } from "@/components/TemaToggle";
import "./globals.css";

/**
 * Tres cortes con un rol cada uno, en línea con el lenguaje de plano técnico:
 * una serif editorial para los títulos (autoridad de memoria de cálculo), una
 * sans técnica para el cuerpo y los formularios densos, y una monoespaciada
 * para números, cotas y etiquetas de especificación.
 */
const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-tecnica",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

/**
 * Corte redondeado, usado solo por el logotipo. No entra en el cuerpo del sitio:
 * su trabajo es que la palabra "MagicIng" tenga el mismo trazo grueso y las
 * mismas terminaciones romas que la varita dibujada al lado.
 */
const logo = Fredoka({
  variable: "--font-logo",
  subsets: ["latin"],
  display: "swap",
  weight: ["600"],
});

const descripcion =
  "Verificaciones estructurales según Eurocódigo 2, AISC 360 y CIRSOC: vigas, losas, cimentaciones, muros, viento y uniones, con el detalle de fórmulas a la vista.";

export const metadata: Metadata = {
  title: {
    default: "MagicIng · Verificaciones estructurales",
    template: "%s · MagicIng",
  },
  description: descripcion,
  applicationName: "MagicIng",
  openGraph: {
    title: "MagicIng · Verificaciones estructurales",
    description: descripcion,
    type: "website",
    locale: "es_AR",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${logo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el tema guardado antes del primer pintado, para que no destelle en claro. */}
        <script dangerouslySetInnerHTML={{ __html: scriptTemaInicial }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
