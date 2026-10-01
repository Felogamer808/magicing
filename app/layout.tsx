import type { Metadata } from "next";
import { Fredoka, IBM_Plex_Mono, Manrope } from "next/font/google";
import { Shell } from "@/components/shell/Shell";
import { scriptTemaInicial } from "@/components/TemaToggle";
import "./globals.css";

/**
 * Dos cortes con un rol cada uno. Manrope para toda la interfaz, incluidos los
 * títulos: la serif editorial que había antes le daba a la página un aire de
 * documento impreso que competía con el de herramienta.
 *
 * La monoespaciada se queda, y no es decorativa: números, cotas y unidades van
 * en ancho fijo para que no bailen al recalcular mientras se tipea.
 */
const sans = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
  "Verificaciones estructurales según Eurocódigo 2, AISC 360 y UNIT: vigas, losas, cimentaciones, muros, viento y uniones, con el detalle de fórmulas a la vista.";

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
      className={`${sans.variable} ${mono.variable} ${logo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el tema guardado antes del primer pintado, para que no destelle en claro. */}
        <script dangerouslySetInnerHTML={{ __html: scriptTemaInicial }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
