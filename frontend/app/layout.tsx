import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UnhandledRejectionHandler } from "@/components/UnhandledRejectionHandler";
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
  title: "Moduvox - Your slides. Your voice. No recording.",
  description:
    "Upload a PPTX and a voice sample. Moduvox generates a complete narrated presentation in your voice, with viewer tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UnhandledRejectionHandler />
        {children}
      </body>
    </html>
  );
}
