import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Downloaded at build time and served from this app, so visitors make no request to Google.
const hanken = Hanken_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-hanken" });

// The address people share. Fixed rather than read from Vercel, because the project has more than one
// production address and link previews should always point at this one.
const SITE_URL = "https://tightknit-digest.vercel.app";
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
