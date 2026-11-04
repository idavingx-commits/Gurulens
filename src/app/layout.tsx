import type { Metadata, Viewport } from "next";
import { Noto_Sans_Sinhala, Plus_Jakarta_Sans } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { APP_NAME, APP_TAGLINE, COMPANY_NAME } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const sinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  variable: "--font-sinhala",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "GuruLens is Sri Lanka's education-first platform to discover trusted tuition teachers, follow their lessons and share verified learning experiences. සිංහල හා English.",
  applicationName: APP_NAME,
  authors: [{ name: COMPANY_NAME }],
  creator: COMPANY_NAME,
  publisher: COMPANY_NAME,
  keywords: [
    "GuruLens",
    "Guru Lens",
    "GuruLens Sri Lanka",
    "gurulens.us",
    "ගුරු ලෙන්ස්",
    "Sri Lanka teachers",
    "tuition classes",
    "teacher ratings",
    "tuition teachers Sri Lanka",
    "ගුරුවරු",
    "උපකාරක පන්ති",
  ],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    url: "/",
    locale: "en_LK",
    alternateLocale: ["si_LK"],
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Discover trusted teachers, follow educational content, and share verified learning experiences.",
    images: [{ url: "/brand/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    images: ["/brand/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0094fd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${sinhala.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
