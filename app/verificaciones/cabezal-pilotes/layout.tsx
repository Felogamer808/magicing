import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cabezal de 2 pilotes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
