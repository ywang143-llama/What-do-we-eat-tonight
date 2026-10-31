"use client";

import Link from "next/link";
import { ArrowRight, Search, ShoppingBasket, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { DishCard } from "@/components/diner/DishCard";
import { useKitchen } from "@/components/providers/KitchenProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { DishGridSkeleton, PageLoading } from "@/components/ui/PageLoading";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import type { Category } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn, formatCalories } from "@/lib/utils";

type Filter = Category | "all";

export default function MenuPage() {
  useDocumentTitle("点餐");
  const { ready, dishes, tonight, getDish, addToOrder, role } = useKitchen();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const activeDishes = useMemo(
    () => dishes.filter((dish) => dish.is_active),
    [dishes],
  );

  const addedIds = useMemo(
    () => new Set(tonight?.items.map((item) => item.dish_id) ?? []),
    [tonight],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: activeDishes.length };
    for (const category of CATEGORIES) {
      map[category.id] = activeDishes.filter(
        (dish) => dish.category === category.id,
      ).length;
    }
    return map;
  }, [activeDishes]);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return activeDishes
      .filter((dish) => filter === "all" || dish.category === filter)
      .filter((dish) => !keyword || dish.name.toLowerCase().includes(keyword))
      .sort((a, b) => {
        const order = CATEGORIES.findIndex((item) => item.id === a.category) -
          CATEGORIES.findIndex((item) => item.id === b.category);
        return order !== 0 ? order : a.name.localeCompare(b.name, "zh-CN");
      });
  }, [activeDishes, filter, query]);

  const tonightCalories = useMemo(
    () =>
      (tonight?.items ?? []).reduce((sum, item) => {
        const dish = getDish(item.dish_id);
        return sum + (dish?.calories ?? 0);
      }, 0),
    [tonight, getDish],
  );

  if (!ready) {
    return (
      <div>
        <PageIntro
          eyebrow="点餐员 · 今晚的厨房"
          title="今天想吃点什么？"
          description="正在把菜单端上来…"
        />
        <div className="mt-5">
          <PageLoading label="菜单马上就好" />
        </div>
        <DishGridSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageIntro
        eyebrow={role === "chef" ? "大厨也在挑菜" : "点餐员 · 今晚的厨房"}
        title="今天想吃点什么？"
        description="挑几道想吃的，今晚的菜单就交给你啦。"
      />

      <div className="mt-5 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft/60" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜一道菜，比如「鸡翅」"
            className="h-12 w-full rounded-2xl border border-line bg-paper pl-10 pr-4 text-[14px] text-ink shadow-sm outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          <FilterChip
            label="全部"
            emoji="✨"
            count={counts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {CATEGORIES.map((category) => (
            <FilterChip
              key={category.id}
              label={category.label}
              emoji={category.emoji}
              count={counts[category.id] ?? 0}
              active={filter === category.id}
              onClick={() => setFilter(category.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-0.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
          <Sparkles className="size-3.5 text-amber" />
          {filter === "all"
            ? `家常菜 · 共 ${results.length} 道`
            : CATEGORY_MAP[filter].description}
        </p>
        {filter !== "all" ? (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-[11px] font-semibold text-terracotta"
          >
            看全部
          </button>
        ) : null}
      </div>

      {results.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {results.map((dish, index) => (
            <DishCard
              key={dish.id}
              dish={dish}
              index={index}
              added={addedIds.has(dish.id)}
              onAdd={() => addToOrder(dish.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            emoji="🔍"
            title="没有找到这道菜"
            description="换个关键词，或者去心愿单写下想吃的，让大厨学一学。"
            action={
              <Link
                href="/wishlist"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-terracotta px-4 text-[12px] font-semibold text-white"
              >
                去心愿单
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>
      )}

      {tonight && tonight.items.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 above-nav z-30 px-4">
          <div className="mx-auto w-full max-w-[448px]">
            <Link
              href="/order"
              className="animate-pop pointer-events-auto flex items-center gap-3 rounded-[20px] border border-white/10 bg-ink px-3.5 py-2.5 text-white shadow-float"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[17px]">
                <ShoppingBasket className="size-[18px] text-amber-soft" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold">
                  今晚已选 {tonight.items.length} 道
                </span>
                <span className="block text-[10px] text-white/65">
                  约 {formatCalories(tonightCalories)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-amber-soft">
                去确认
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  emoji,
  count,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition active:scale-95",
        active
          ? "border-terracotta bg-terracotta text-white shadow-[0_8px_18px_-12px_rgba(169,85,58,0.9)]"
          : "border-line bg-paper text-ink-soft",
      )}
    >
      <span className="text-[13px]">{emoji}</span>
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
          active ? "bg-white/20 text-white" : "bg-cream-deep text-ink-soft",
        )}
      >
        {count}
      </span>
    </button>
  );
}
