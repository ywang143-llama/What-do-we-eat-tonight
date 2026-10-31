"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { DataErrorBanner } from "@/components/layout/DataErrorBanner";
import { Header } from "@/components/layout/Header";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { Toaster } from "@/components/layout/Toaster";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <OfflineBanner />
      {!isLanding ? <Header /> : null}
      <DataErrorBanner />
      <main
        className={cn(
          "flex-1",
          isLanding ? "pb-10" : "px-4 pb-36 pt-5",
        )}
      >
        {children}
      </main>
      {!isLanding ? <BottomNav /> : null}
      <Toaster />
    </div>
  );
}
