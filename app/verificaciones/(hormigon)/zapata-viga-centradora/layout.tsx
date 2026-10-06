import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zapata de medianería con viga centradora",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
