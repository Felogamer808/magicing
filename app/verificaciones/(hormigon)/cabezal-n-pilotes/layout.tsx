import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cabezal de 3 o más pilotes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
