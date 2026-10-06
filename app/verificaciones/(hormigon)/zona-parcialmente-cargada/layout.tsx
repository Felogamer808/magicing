import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zona parcialmente cargada",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
