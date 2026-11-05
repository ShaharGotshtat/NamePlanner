import type { Metadata, Viewport } from "next";
import { APP_NAME, APP_NAME_EN } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_NAME_EN}`,
  description: "בואו נמצא שמות לילדים העתידיים שלכם!",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#FFF8F4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Rubik:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
