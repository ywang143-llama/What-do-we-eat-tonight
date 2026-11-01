"use client";

import { usePathname } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { cn } from "@/lib/utils";

const TONES = {
  success: {
    wrap: "bg-[#4A5D40] text-white",
    icon: CheckCircle2,
    iconClass: "text-[#D8E8C9]",
  },
  error: {
    wrap: "bg-[#8F4231] text-white",
    icon: AlertCircle,
    iconClass: "text-[#F7D6CC]",
  },
  info: {
    wrap: "bg-ink text-white",
    icon: Info,
    iconClass: "text-amber-soft",
  },
} as const;

export function Toaster() {
  const { toasts, dismissToast, tonight } = useKitchen();
  const pathname = usePathname();

  const hasItems = (tonight?.items.length ?? 0) > 0;
  const hasCartBar = pathname === "/menu" && hasItems;
  const hasActionBar =
    (pathname.startsWith("/chef/menu/") && pathname !== "/chef/menu") ||
    (pathname === "/order" && hasItems && tonight?.status === "draft");
  const placement =
    pathname === "/"
      ? "toast-bottom-landing"
      : hasActionBar
        ? "toast-above-actions"
        : hasCartBar
          ? "toast-above-cart"
          : "toast-safe-bottom";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4",
        placement,
      )}
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "animate-toast pointer-events-auto flex w-full max-w-[420px] items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-medium shadow-float",
              tone.wrap,
            )}
          >
            <Icon className={cn("size-4 shrink-0", tone.iconClass)} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="关闭提示"
              className="shrink-0 rounded-full p-1 opacity-70 transition hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
