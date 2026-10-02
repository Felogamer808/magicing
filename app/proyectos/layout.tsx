import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proyectos",
  description:
    "Los elementos de cada obra con sus cálculos guardados, para revisarlos más adelante y sacar la memoria de cálculo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
