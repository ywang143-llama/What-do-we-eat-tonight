"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZES = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
};

export function RatingStars({
  value,
  onChange,
  size = "md",
  className,
  label = "评分",
}: RatingStarsProps) {
  const interactive = Boolean(onChange);

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? label : `${label}：${value} 星`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        const icon = (
          <Star
            className={cn(
              SIZES[size],
              "transition-colors",
              active ? "fill-amber text-amber" : "fill-transparent text-line",
            )}
            strokeWidth={1.8}
          />
        );

        if (!interactive) {
          return (
            <span key={star} aria-hidden>
              {icon}
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} 星`}
            onClick={() => onChange?.(star)}
            className="rounded-full p-0.5 transition-transform active:scale-90"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
