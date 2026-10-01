import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Downloaded at build time and served from this app, so visitors make no request to Google.
const hanken = Hanken_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-hanken" });

// The production address; Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time.
const SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "interview-gold-eight.vercel.app"}`;
const TITLE = "Monday digest";
const DESCRIPTION =
  "The weekly digest a Slack community admin reads on Monday: the busiest threads, the questions still waiting for an answer, and an AI summary.";

// The preview image is app/opengraph-image.png (and twitter-image.png); Next.js adds those tags itself.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={hanken.variable}>
      <body>{children}</body>
    </html>
  );
}
