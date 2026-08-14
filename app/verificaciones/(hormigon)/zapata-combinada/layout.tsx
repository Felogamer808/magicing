import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zapata combinada",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
