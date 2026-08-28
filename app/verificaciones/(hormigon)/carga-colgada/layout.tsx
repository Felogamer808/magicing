import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Armadura de cuelgue",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
