import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoTrader Pro — Smart Trading Analysis",
  description:
    "Professional-grade 12-layer crypto trading analysis system with real-time signals, Smart Money Concepts, and advanced risk management.",
  keywords: [
    "crypto", "trading", "bitcoin", "ethereum", "analysis",
    "signals", "smart money", "order blocks",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
