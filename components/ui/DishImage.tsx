"use client";

import { useState } from "react";

import { CATEGORY_MAP } from "@/lib/categories";
import type { Dish } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DishImageProps {
  dish: Pick<Dish, "name" | "emoji" | "category" | "image_url">;
  className?: string;
  emojiClassName?: string;
  sizes?: string;
}

export function DishImage({
  dish,
  className,
  emojiClassName,
  sizes,
}: DishImageProps) {
  const [failed, setFailed] = useState(false);
  const meta = CATEGORY_MAP[dish.category];
  const emoji = dish.emoji || meta?.emoji || "🍲";

  if (dish.image_url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dish.image_url}
        alt={dish.name}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return (
    <div
      aria-label={dish.name}
      role="img"
      className={cn(
        "relative grid size-full place-items-center overflow-hidden bg-gradient-to-br",
        meta?.tile ?? "from-amber-soft to-amber-soft",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(255,255,255,.65) 0 10%, transparent 11%), radial-gradient(circle at 82% 78%, rgba(255,255,255,.4) 0 14%, transparent 15%)",
        }}
      />
      <span
        aria-hidden
        className={cn(
          "relative drop-shadow-[0_6px_10px_rgba(100,60,30,0.18)]",
          emojiClassName ?? "text-[46px]",
        )}
      >
        {emoji}
      </span>
    </div>
  );
}
