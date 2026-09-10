import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const openRunde = localFont({
  variable: "--font-open-runde",
  display: "swap",
  src: [
    { path: "../public/fonts/OpenRunde-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/OpenRunde-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/OpenRunde-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/OpenRunde-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "ApplyOS, the easy way to run your job search",
    template: "%s · ApplyOS",
  },
  description:
    "A personal operating system for the job hunt. Track applications, run your pipeline, prep interviews, and know exactly what to do next.",
  applicationName: "ApplyOS",
  keywords: ["job search", "application tracker", "job hunt", "interview prep", "career"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Runs before paint, so the theme never flashes. No provider, no context.
const themeScript = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var d = t === "light" ? false
        : t === "system" ? !window.matchMedia("(prefers-color-scheme: light)").matches
        : true;
  document.documentElement.classList.toggle("dark", d);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${openRunde.variable} flex min-h-full flex-col font-sans antialiased`}
      >
        <Script id="applyos-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
