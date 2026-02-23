import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Forest Hills Departure",
    template: "%s | Forest Hills Departure",
  },
  description: "Real-time MBTA Orange Line leave-time timer for Forest Hills.",
  applicationName: "Forest Hills Departure",
  keywords: ["MBTA", "Forest Hills", "Orange Line", "commute", "train timer"],
  openGraph: {
    title: "Forest Hills Departure",
    description: "See when to leave for the next Oak Grove-bound Orange Line train.",
    type: "website",
    siteName: "Forest Hills Departure",
  },
  twitter: {
    card: "summary",
    title: "Forest Hills Departure",
    description: "See when to leave for the next Oak Grove-bound Orange Line train.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
