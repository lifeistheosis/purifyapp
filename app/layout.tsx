import type { Metadata, Viewport } from "next";
import { Cardo, DM_Sans, DM_Serif_Display, Lora } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
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
  title: "Purify",
  description: "Find God's peace in prayer.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#161219",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
