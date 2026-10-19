import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cabezal de 1 pilote",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
