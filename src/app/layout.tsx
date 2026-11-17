import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Coy · Discover",
  description: "A swipe-based Discover tab for Coy. Matches only when it's mutual.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a171d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh">
        {/* Phone-width app shell: full-bleed on mobile, a centred column on desktop. */}
        <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-surface sm:border-x sm:border-border">
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
