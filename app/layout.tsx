import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from '@/components/Navbar';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Partita",
  description: "Gestione partite di calcio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <Navbar />
        <main className="max-w-4xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}