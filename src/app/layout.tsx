import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import ContactOuAssistant from "@/components/ContactOuAssistant";
import EnregistrerServiceWorker from "@/components/EnregistrerServiceWorker";
import HorsAdmin from "@/components/HorsAdmin";
import InviterInstallation from "@/components/InviterInstallation";
import Traduction from "@/components/Traduction";
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
  applicationName: "WeFilmGood",
  // iPhone : l'application ouverte depuis l'écran d'accueil s'affiche en
  // plein écran, avec son nom sous l'icône.
  appleWebApp: { capable: true, title: "WeFilmGood", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={sans.variable}>
      <body>
        {children}
        {/* Contact (ou assistant) et traduction servent les membres, pas l'administration. */}
        <HorsAdmin>
          <ContactOuAssistant />
          <Traduction />
        </HorsAdmin>
        <EnregistrerServiceWorker />
        <InviterInstallation />
      </body>
    </html>
  );
}
