import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "D-ID Agents 2.0 API Demo",
  description: "D-ID Agents 2.0 API Demo with WebRTC streaming",
  icons: {
    icon: "https://studio.d-id.com/favicon/favicon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      </head>
      <body
        className={`${manrope.variable} antialiased`}
        style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
