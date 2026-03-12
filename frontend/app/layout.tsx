import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeMentor AI | Professional Trading Academy",
  description: "Specialized educational platform for SMC/ICT traders with AI-powered mentorship.",
  icons: {
    icon: '/favicon-logo.png',
  },
};

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
