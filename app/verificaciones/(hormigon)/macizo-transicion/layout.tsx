import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macizo de transición",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
