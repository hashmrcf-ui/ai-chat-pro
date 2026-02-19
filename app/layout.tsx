import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

import { IBM_Plex_Sans_Arabic } from "next/font/google";

const ibmPlex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe AI - Your Creative AI Assistant",
  description: "Create, design, and innovate with AI-powered tools for chat, images, presentations, and websites.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlex.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
