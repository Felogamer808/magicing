import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sección mixta (pilar CFT)",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
