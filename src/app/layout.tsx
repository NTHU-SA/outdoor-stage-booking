import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppFooter } from "@/components/app-footer";
import { AppPreferencesProvider } from "@/components/app-preferences-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "國立清華大學學生會野台借用系統",
  description: "國立清華大學學生會野台借用系統 - 線上預約野台空間，輕鬆管理您的借用申請",
  openGraph: {
    title: "國立清華大學學生會野台借用系統",
    description: "國立清華大學學生會野台借用系統 - 線上預約野台空間，輕鬆管理您的借用申請",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "國立清華大學學生會野台借用系統",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "國立清華大學學生會野台借用系統",
    description: "國立清華大學學生會野台借用系統 - 線上預約野台空間，輕鬆管理您的借用申請",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <AppPreferencesProvider>
          <div className="flex-1">
            {children}
          </div>
          <AppFooter />
          <Toaster richColors />
          <Analytics />
          <SpeedInsights />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
