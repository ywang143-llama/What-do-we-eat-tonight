"use client";

import { Check, Flame, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { DishImage } from "@/components/ui/DishImage";
import { categoryLabel } from "@/lib/categories";
import type { Dish } from "@/lib/types";
import { cn, formatCalories } from "@/lib/utils";

interface DishCardProps {
  dish: Dish;
  added: boolean;
  onAdd: () => Promise<boolean>;
  index?: number;
}

export function DishCard({ dish, added, onAdd, index = 0 }: DishCardProps) {
  const [pending, setPending] = useState(false);

  const handleAdd = async () => {
    if (added || pending) return;
    setPending(true);
    await onAdd();
    setPending(false);
  };

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-rise flex flex-col overflow-hidden rounded-[22px] border border-line/80 bg-paper shadow-card"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-deep">
        <DishImage dish={dish} emojiClassName="text-[44px]" />
        <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[9.5px] font-semibold text-ink-soft backdrop-blur">
          {categoryLabel(dish.category)}
        </span>
        {added ? (
          <span className="animate-pop absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-sage text-white shadow-sm">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-[14px] font-bold leading-snug text-ink">
          {dish.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[10.5px] font-medium text-ink-soft">
          <Flame className="size-3 text-amber" />
          {formatCalories(dish.calories)}
        </p>

        <div className="mt-auto pt-2.5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={added || pending}
            aria-pressed={added}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-bold transition-all active:scale-[0.97]",
              added
                ? "bg-sage-soft text-[#5D744F]"
                : "bg-terracotta text-white shadow-[0_8px_18px_-12px_rgba(169,85,58,0.95)]",
            )}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : added ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : (
              <Plus className="size-3.5" strokeWidth={3} />
            )}
            {added ? "已加入今晚" : "今晚想吃"}
          </button>
        </div>
      </div>
    </article>
  );
}
