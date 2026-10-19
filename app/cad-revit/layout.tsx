import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CAD → Revit",
  description:
    "Interpreta una planta de fundaciones en DXF —pilotes, cabezales y vigas— y muestra lo que no cierra antes de llevarla a Revit.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
