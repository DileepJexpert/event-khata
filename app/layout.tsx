import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AppInit } from "@/components/app-init";

export const metadata: Metadata = {
  title: "EventKhata — Vendor Payment Tracker",
  description: "Digital bahi khata for event planners. Track vendor payments, manage budgets, share reports.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EventKhata",
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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans">
        <AppInit />
        <ToastProvider>
          <main className="min-h-screen bg-navy-50">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
