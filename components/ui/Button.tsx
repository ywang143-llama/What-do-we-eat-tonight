"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "amber" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-terracotta text-white shadow-[0_14px_26px_-16px_rgba(169,85,58,0.9)] hover:bg-terracotta-deep",
  secondary:
    "border border-line bg-paper text-ink hover:bg-cream-deep/60",
  ghost: "text-ink-soft hover:bg-cream-deep/60 hover:text-ink",
  amber:
    "bg-amber text-white shadow-[0_14px_26px_-16px_rgba(197,131,40,0.85)] hover:bg-[#d8932f]",
  danger: "bg-[#B04A37] text-white hover:bg-[#9b3f2e]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-full px-4 text-[13px]",
  md: "h-11 gap-2 rounded-full px-5 text-[14px]",
  lg: "h-13 gap-2 rounded-full px-6 text-[15px]",
  icon: "h-11 w-11 rounded-full",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
