import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Downloaded at build time and served from this app, so visitors make no request to Google.
const hanken = Hanken_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-hanken" });

export const metadata: Metadata = {
  title: "Monday digest",
  description: "The weekly digest a Slack community admin gets: top threads and questions waiting for an answer.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={hanken.variable}>
      <body>{children}</body>
    </html>
  );
}
