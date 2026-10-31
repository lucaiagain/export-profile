import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], style: ["normal", "italic"], variable: "--font-lato" });
const barlow = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "Export Profile · IAGAIN",
  description:
    "Quanto è pronta la tua azienda per l'estero? 23 domande, risultato immediato: grado di maturità export, punti di forza e di debolezza, e fin dove puoi arrivare con IAGAIN.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1F232F" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${lato.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
