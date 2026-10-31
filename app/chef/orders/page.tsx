"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChefHat,
  ClipboardList,
  Clock3,
  Flame,
  MessageSquareText,
  Radio,
  Soup,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DishImage } from "@/components/ui/DishImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import { categoryLabel } from "@/lib/categories";
import type { Dish, ItemStatus, OrderItem } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import {
  cn,
  formatCalories,
  formatDateFriendly,
  formatTime,
  todayISO,
} from "@/lib/utils";

const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "待准备",
  preparing: "备餐中",
  served: "已上菜",
};

export default function ChefOrdersPage() {
  useDocumentTitle("今晚订单");
  const {
    ready,
    mode,
    tonight,
    orders,
    getDish,
    setItemStatus,
    markAllServed,
    completeOrder,
    notify,
  } = useKitchen();
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);

  const today = todayISO();
  const completedToday = useMemo(
    () =>
      orders.filter(
        (order) => order.order_date === today && order.status === "completed",
      ).length > 0,
    [orders, today],
  );

  const entries = useMemo(
    () =>
      (tonight?.items ?? [])
        .map((item) => ({ item, dish: getDish(item.dish_id) }))
        .filter((entry): entry is { item: OrderItem; dish: Dish } =>
          Boolean(entry.dish),
        ),
    [tonight, getDish],
  );

  const stats = useMemo(() => {
    const total = entries.length;
    const served = entries.filter(
      (entry) => entry.item.status === "served",
    ).length;
    const preparing = entries.filter(
      (entry) => entry.item.status === "preparing",
    ).length;
    const pending = entries.filter(
      (entry) => entry.item.status === "pending",
    ).length;
    const calories = entries.reduce(
      (sum, entry) => sum + entry.dish.calories,
      0,
    );
    const progress = total ? Math.round((served / total) * 100) : 0;
    return { total, served, preparing, pending, calories, progress };
  }, [entries]);

  const handleComplete = async () => {
    if (!tonight) return;
    setCompleting(true);
    const ok = await completeOrder(tonight.id);
    setCompleting(false);
    if (ok) setConfirming(false);
  };

  if (!ready) return <PageLoading label="正在系围裙…" />;

  if (!tonight) {
    return (
      <div>
        <PageIntro
          eyebrow="大厨 · 今晚的厨房"
          title="今晚的订单"
          description="订单会自动出现在这里，准备好就开火。"
        />
        <div className="mt-8">
          <EmptyState
            emoji={completedToday ? "🧑‍🍳" : "🍳"}
            title={completedToday ? "今晚已经收工啦" : "今晚还没有订单"}
            description={
              completedToday
                ? "辛苦大厨，去回顾里看看这顿饭的评价吧。"
                : "等点餐员选好菜、提交菜单后，这里就会亮起来。也可以先去整理一下菜单。"
            }
            action={
              completedToday ? (
                <Link href="/history">
                  <Button size="md">
                    看今晚的评价
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              ) : (
                <div className="flex gap-2">
                  <Link href="/chef/menu">
                    <Button variant="secondary" size="md">
                      整理菜单
                    </Button>
                  </Link>
                  <Link href="/chef/wishlist">
                    <Button size="md">看看心愿</Button>
                  </Link>
                </div>
              )
            }
          />
        </div>
      </div>
    );
  }

  const isDraft = tonight.status === "draft";

  return (
    <div className="pb-2">
      <PageIntro
        eyebrow={`大厨 · ${formatDateFriendly(tonight.order_date)}`}
        title="今晚的订单"
        description={
          isDraft
            ? "点餐员还在挑菜，先看看有没有想提前准备的。"
            : "菜单已送达，按自己的节奏来，不着急。"
        }
        action={
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5 text-[10px] font-semibold text-ink-soft">
            <Radio
              className={cn(
                "size-3.5",
                mode === "supabase" ? "animate-pulse text-sage" : "text-amber",
              )}
            />
            {mode === "supabase" ? "实时同步" : "本机演示"}
          </span>
        }
      />

      {isDraft ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#EFD7B2] bg-[#FCF1DE] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#7E571D]">
          <Clock3 className="mt-0.5 size-4 shrink-0" />
          <p>
            点餐员还没正式提交，菜单可能还会变化。
            {stats.total ? ` 现在已经选了 ${stats.total} 道。` : ""}
          </p>
        </div>
      ) : null}

      <section className="mt-4 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-sage-soft text-[#58704B]">
              <ChefHat className="size-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-bold text-ink">出餐进度</p>
              <p className="text-[9.5px] text-ink-soft">
                {tonight.submitted_at
                  ? `${formatTime(tonight.submitted_at)} 收到菜单`
                  : "还在挑选中"}
              </p>
            </div>
          </div>
          <span className="text-[22px] font-bold tracking-tight text-terracotta">
            {stats.progress}
            <span className="text-[11px] font-semibold">%</span>
          </span>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-cream-deep">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E9B36A] via-[#D9855F] to-[#A9553A] transition-all duration-500"
            style={{ width: `${stats.progress}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-4 divide-x divide-line/70 text-center">
          <MiniStat label="菜品" value={stats.total} />
          <MiniStat label="待准备" value={stats.pending} tone="amber" />
          <MiniStat label="备餐中" value={stats.preparing} tone="terracotta" />
          <MiniStat label="已上菜" value={stats.served} tone="sage" />
        </div>
      </section>

      {tonight.note ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-line bg-paper px-3.5 py-3">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-terracotta" />
          <div className="min-w-0">
            <p className="text-[9.5px] font-semibold text-ink-soft">
              点餐员的备注
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink">
              {tonight.note}
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-5">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <ClipboardList className="size-4 text-terracotta" />
            今晚要做
          </h2>
          <span className="flex items-center gap-1 text-[10px] text-ink-soft">
            <Flame className="size-3 text-amber" />
            共 {formatCalories(stats.calories)}
          </span>
        </div>

        <ul className="space-y-2.5">
          {entries.map(({ item, dish }, index) => (
            <ChefOrderItem
              key={item.id}
              item={item}
              dish={dish}
              index={index}
              onStatusChange={setItemStatus}
            />
          ))}
        </ul>
      </section>

      {entries.length ? (
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              if (stats.served === stats.total) {
                notify("全部上菜啦，慢慢吃～", "success");
                return;
              }
              void markAllServed(tonight);
            }}
            className="w-full"
          >
            <CheckCheck className="size-4" />
            全部上菜
          </Button>
          <Button
            size="lg"
            variant="primary"
            onClick={() => setConfirming(true)}
            className="w-full"
          >
            <Soup className="size-4" />
            结束今晚
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            emoji="🥕"
            title="菜单里还没有菜"
            description="点餐员正在挑，也可以先去菜单里准备几道拿手菜。"
            action={
              <Link href="/chef/menu">
                <Button size="sm" variant="secondary">
                  去管理菜单
                </Button>
              </Link>
            }
          />
        </div>
      )}

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-ink-soft/70">
        <Sparkles className="size-3 text-amber" />
        慢慢做，好吃比快更重要
      </p>

      <ConfirmDialog
        open={confirming}
        title="确认结束今晚？"
        description="结束后这顿晚饭会进入「回顾」，点餐员可以给每道菜打分。已上菜状态会保留。"
        confirmLabel="收工，开饭"
        cancelLabel="再等等"
        loading={completing}
        onConfirm={() => void handleComplete()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "amber" | "terracotta" | "sage";
}) {
  const tones = {
    ink: "text-ink",
    amber: "text-[#A5762E]",
    terracotta: "text-terracotta",
    sage: "text-[#58704B]",
  };

  return (
    <div className="px-1">
      <p className={cn("text-[15px] font-bold leading-none", tones[tone])}>
        {value}
      </p>
      <p className="mt-1 text-[9px] text-ink-soft">{label}</p>
    </div>
  );
}

function ChefOrderItem({
  item,
  dish,
  index,
  onStatusChange,
}: {
  item: OrderItem;
  dish: Dish;
  index: number;
  onStatusChange: (itemId: string, status: ItemStatus) => Promise<boolean>;
}) {
  const [pending, setPending] = useState<ItemStatus | null>(null);

  const change = async (status: ItemStatus) => {
    if (pending || item.status === status) return;
    setPending(status);
    await onStatusChange(item.id, status);
    setPending(null);
  };

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="animate-rise rounded-3xl border border-line bg-paper p-3 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="size-[58px] shrink-0 overflow-hidden rounded-2xl border border-line/60">
          <DishImage dish={dish} emojiClassName="text-[26px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[13.5px] font-bold text-ink">
              {dish.name}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                item.status === "served"
                  ? "bg-sage-soft text-[#58704B]"
                  : item.status === "preparing"
                    ? "bg-[#F8DFD4] text-[#A05137]"
                    : "bg-[#FCF1DE] text-[#8A5E1F]",
              )}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-ink-soft">
            {categoryLabel(dish.category)} · {formatCalories(dish.calories)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void change("preparing")}
          disabled={pending !== null}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-semibold transition active:scale-[0.98]",
            item.status === "preparing"
              ? "border-terracotta/30 bg-[#F8DFD4] text-[#A05137]"
              : "border-line bg-cream/40 text-ink-soft",
          )}
        >
          <Flame className="size-3.5" />
          备餐中
        </button>
        <button
          type="button"
          onClick={() => void change("served")}
          disabled={pending !== null}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-semibold transition active:scale-[0.98]",
            item.status === "served"
              ? "border-sage/30 bg-sage text-white"
              : "border-line bg-cream/40 text-ink-soft",
          )}
        >
          <Check className="size-3.5" />
          已上菜
        </button>
      </div>
    </li>
  );
}
