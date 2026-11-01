import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { KitchenProvider } from "@/components/providers/KitchenProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "今晚吃什么 · 两个人的小厨房",
    template: "%s · 今晚吃什么",
  },
  description:
    "两个人的小厨房：一个人点菜，一个人下厨。今晚吃什么，一起决定。",
  applicationName: "今晚吃什么",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "今晚吃什么",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "今晚吃什么",
    description: "两个人的小厨房，一顿晚饭的决定权。",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#fbf4e8",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        <KitchenProvider>
          <AppShell>{children}</AppShell>
        </KitchenProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
