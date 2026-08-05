import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muros de contención",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
