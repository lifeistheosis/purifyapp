import type { Metadata, Viewport } from "next";
import { Cardo, DM_Sans, DM_Serif_Display, Lora } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { websiteSchema } from "@/lib/seo/jsonld";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  // Variable font — pulls 400 / 500 / 600 / 700 + italics.
});

// Cardo: a serif designed for biblical scholarship — covers polytonic Greek
// (U+1F00 to 1FFF) and Hebrew. Used only for the interlinear column.
const cardo = Cardo({
  variable: "--font-greek",
  subsets: ["latin", "greek", "greek-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Purify, Orthodox prayer, calendar, and Scripture",
    template: "%s | Purify",
  },
  description:
    "Daily prayer, the saint of the day, fasting status, and the Septuagint plus KJV with patristic commentary.",
  manifest: "/manifest.webmanifest",
  applicationName: "Purify",
  keywords: [
    "Orthodox",
    "prayer",
    "Bible",
    "Septuagint",
    "patristic",
    "saints",
    "fasting",
    "calendar",
    "Jesus Prayer",
  ],
  authors: [{ name: "Purify Team" }],
  openGraph: {
    type: "website",
    siteName: "Purify",
    title: "Purify, Orthodox prayer, calendar, and Scripture",
    description:
      "Daily prayer, the saint of the day, fasting status, and the Septuagint plus KJV with patristic commentary.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Purify",
    description: "Find God's peace in prayer.",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#161219",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerif.variable} ${lora.variable} ${cardo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={websiteSchema()} />
        {children}
      </body>
    </html>
  );
}
