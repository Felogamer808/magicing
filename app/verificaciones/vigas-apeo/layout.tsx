import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vigas de apeo",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
