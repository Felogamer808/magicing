import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fisuración (ELS)",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
