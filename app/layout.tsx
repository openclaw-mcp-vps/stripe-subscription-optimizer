import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"]
});

const siteUrl = "https://stripe-subscription-optimizer.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Stripe Subscription Optimizer",
  description:
    "Optimize Stripe subscription pricing for maximum revenue with live metrics, AI recommendations, and conversion-focused pricing experiments.",
  keywords: [
    "Stripe analytics",
    "subscription pricing",
    "SaaS revenue optimization",
    "MRR optimization",
    "trial conversion"
  ],
  openGraph: {
    title: "Stripe Subscription Optimizer",
    description:
      "Analyze Stripe subscription performance and ship higher-converting pricing, trial, and billing strategies.",
    type: "website",
    url: siteUrl,
    siteName: "Stripe Subscription Optimizer"
  },
  twitter: {
    card: "summary_large_image",
    title: "Stripe Subscription Optimizer",
    description: "Increase SaaS revenue with actionable pricing and billing optimization insights."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body className="bg-[#0d1117] text-[#e6edf3]">{children}</body>
    </html>
  );
}
