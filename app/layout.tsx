import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { AppInit } from "@/components/app-init";

export const metadata: Metadata = {
  title: "EventKhata — Vendor Payment Tracker",
  description: "Digital bahi khata for Indian event planners. Track vendor payments, manage budgets, generate invoices, and share real-time reports with clients.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EventKhata",
  },
  applicationName: "EventKhata",
  keywords: ["event planner", "vendor payments", "bahi khata", "wedding planner", "budget tracker", "India"],
  openGraph: {
    title: "EventKhata — Vendor Payment Tracker",
    description: "Digital bahi khata for Indian event planners. Track vendor payments, manage budgets, share reports.",
    siteName: "EventKhata",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem("ek-theme");const d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body className="font-sans">
        <AppInit />
        <ThemeProvider>
          <ToastProvider>
            <main className="min-h-screen bg-navy-50 dark:bg-navy-950">
              {children}
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
