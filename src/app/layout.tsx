import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import BoutonContact from "@/components/BoutonContact";
import "./globals.css";

const sans = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeFilmGood",
  description:
    "La plateforme de rencontres Auteurs — Producteurs de la Maison des Scénaristes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={sans.variable}>
      <body>
        {children}
        <BoutonContact />
      </body>
    </html>
  );
}
