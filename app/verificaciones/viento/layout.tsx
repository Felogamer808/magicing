import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acción del viento",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
