import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Intelligence | Carteira Brasil",
  description: "Monitoramento de carteira e risco — demonstração com dados sintéticos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
