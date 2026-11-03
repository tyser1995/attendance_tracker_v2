import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings/getSettings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The app name is editable in Settings, so no page can be prerendered with it at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { appName, faviconUrl } = await getSettings();
  return {
    title: appName,
    // Set here rather than with app/favicon.ico, which would override an uploaded icon.
    icons: { icon: faviconUrl ?? "/favicon.ico" },
    description: "Student attendance tracking — time log, reports, and management.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
