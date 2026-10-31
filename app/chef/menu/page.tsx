"use client";

import Link from "next/link";
import {
  Plus,
  Search,
  Star,
  ListOrdered,
  Archive,
  BookOpen,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { DishImage } from "@/components/ui/DishImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import { Toggle } from "@/components/ui/Toggle";
import { CATEGORIES } from "@/lib/categories";
import type { Dish } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import { averageRating, cn, formatCalories } from "@/lib/utils";

export default function ChefMenuPage() {
  useDocumentTitle("菜单管理");
  const { ready, dishes, ratings, setDishActive } = useKitchen();
  const [query, setQuery] = useState("");

  const ratingMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const rating of ratings) {
      const list = map.get(rating.dish_id) ?? [];
      list.push(rating.rating);
      map.set(rating.dish_id, list);
    }
    return map;
  }, [ratings]);

  const active = useMemo(() => dishes.filter((dish) => dish.is_active), [dishes]);
  const inactive = useMemo(
    () => dishes.filter((dish) => !dish.is_active),
    [dishes],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return active;
    return active.filter((dish) => dish.name.toLowerCase().includes(keyword));
  }, [active, query]);

  const filteredInactive = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return inactive.filter(
      (dish) => !keyword || dish.name.toLowerCase().includes(keyword),
    );
  }, [inactive, query]);

  const overall = useMemo(
    () =>
      averageRating(
        active.flatMap((dish) => ratingMap.get(dish.id) ?? []),
      ),
    [active, ratingMap],
  );

  if (!ready) return <PageLoading label="正在整理菜谱…" />;

  return (
    <div>
      <PageIntro
        eyebrow="大厨 · 菜谱本"
        title="菜单管理"
        description="把拿手菜收进来，点餐员就能在今晚的菜单里看到。"
        action={
          <Link href="/chef/menu/new">
            <Button size="sm" className="shrink-0">
              <Plus className="size-3.5" strokeWidth={2.6} />
              新菜
            </Button>
          </Link>
        }
      />

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft/60" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="找一道菜…"
            className="h-11 w-full rounded-2xl border border-line bg-paper pl-10 pr-4 text-[13px] text-ink shadow-sm outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
          />
        </div>
        <div className="flex h-11 items-center gap-1.5 rounded-2xl border border-line bg-paper px-3 text-[10.5px] font-semibold text-ink-soft">
          <BookOpen className="size-3.5 text-terracotta" />
          在售 {active.length}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-0.5">
        <p className="flex items-center gap-1.5 text-[10.5px] text-ink-soft">
          <Sparkles className="size-3.5 text-amber" />
          菜单越丰富，晚饭越有盼头
        </p>
        {overall ? (
          <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#8A5E1F]">
            <Star className="size-3.5 fill-amber text-amber" />
            平均 {overall.toFixed(1)}
          </span>
        ) : null}
      </div>

      {!dishes.length ? (
        <div className="mt-6">
          <EmptyState
            emoji="📒"
            title="菜谱本还是空的"
            description="先收几道拿手菜进来吧，番茄鸡蛋面、可乐鸡翅都可以。"
            action={
              <Link href="/chef/menu/new">
                <Button size="sm">
                  <Plus className="size-3.5" />
                  添加第一道菜
                </Button>
              </Link>
            }
          />
        </div>
      ) : filtered.length || filteredInactive.length ? (
        <>
          {CATEGORIES.map((category) => {
            const group = filtered.filter(
              (dish) => dish.category === category.id,
            );
            if (!group.length) return null;

            return (
              <section key={category.id} className="mt-5">
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <h2 className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                    <span className="text-[14px]">{category.emoji}</span>
                    {category.label}
                  </h2>
                  <span className="text-[10px] text-ink-soft">
                    {group.length} 道
                  </span>
                </div>
                <ul className="space-y-2">
                  {group.map((dish, index) => (
                    <DishRow
                      key={dish.id}
                      dish={dish}
                      index={index}
                      average={averageRating(ratingMap.get(dish.id) ?? [])}
                      onToggle={(next) => setDishActive(dish.id, next)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          {filteredInactive.length ? (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h2 className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink-soft">
                  <Archive className="size-3.5" />
                  已下架
                </h2>
                <span className="text-[10px] text-ink-soft">
                  {filteredInactive.length} 道
                </span>
              </div>
              <ul className="space-y-2">
                {filteredInactive.map((dish, index) => (
                  <DishRow
                    key={dish.id}
                    dish={dish}
                    index={index}
                    average={averageRating(ratingMap.get(dish.id) ?? [])}
                    onToggle={(next) => setDishActive(dish.id, next)}
                  />
                ))}
              </ul>
              <p className="mt-2.5 px-1 text-[10px] leading-relaxed text-ink-soft/70">
                下架只会把菜从点餐菜单里收起来，历史订单和评价都会保留，随时可以重新上架。
              </p>
            </section>
          ) : null}
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            emoji="🔍"
            title="菜单里没有这道菜"
            description="换个关键词找找，或者直接新建一道。"
            action={
              <Link href="/chef/menu/new">
                <Button size="sm" variant="secondary">
                  <Plus className="size-3.5" />
                  新建菜品
                </Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}

function DishRow({
  dish,
  index,
  average,
  onToggle,
}: {
  dish: Dish;
  index: number;
  average: number | null;
  onToggle: (next: boolean) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);

  const handleToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    await onToggle(next);
    setBusy(false);
  };

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className={cn(
        "animate-rise flex items-center gap-2.5 rounded-3xl border border-line bg-paper p-2.5 shadow-card",
        !dish.is_active && "opacity-70",
      )}
    >
      <Link
        href={`/chef/menu/${dish.id}`}
        className="size-14 shrink-0 overflow-hidden rounded-2xl border border-line/60"
        aria-label={`编辑${dish.name}`}
      >
        <DishImage dish={dish} emojiClassName="text-[24px]" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/chef/menu/${dish.id}`} className="block">
          <h3 className="flex items-center gap-1.5 truncate text-[13px] font-bold text-ink">
            {dish.name}
            {!dish.is_active ? (
              <span className="shrink-0 rounded-full bg-cream-deep px-1.5 py-0.5 text-[8.5px] font-semibold text-ink-soft">
                已下架
              </span>
            ) : null}
          </h3>
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9.5px] text-ink-soft">
          <span>{formatCalories(dish.calories)}</span>
          <span className="text-line">·</span>
          <span className="inline-flex items-center gap-0.5">
            <ListOrdered className="size-2.5" />
            {dish.recipe_steps.length} 步
          </span>
          {average ? (
            <>
              <span className="text-line">·</span>
              <span className="inline-flex items-center gap-0.5 font-semibold text-[#8A5E1F]">
                <Star className="size-2.5 fill-amber text-amber" />
                {average.toFixed(1)}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <Toggle
        checked={dish.is_active}
        onChange={(next) => void handleToggle(next)}
        label={`${dish.name}${dish.is_active ? "下架" : "上架"}`}
        disabled={busy}
      />

      <Link
        href={`/chef/menu/${dish.id}`}
        aria-label={`编辑${dish.name}`}
        className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft/70 transition hover:bg-cream-deep active:scale-90"
      >
        <Pencil className="size-3.5" />
      </Link>
    </li>
  );
}
