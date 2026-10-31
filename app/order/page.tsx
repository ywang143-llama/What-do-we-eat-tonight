"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  MessageSquareText,
  PartyPopper,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { DishImage } from "@/components/ui/DishImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import { categoryLabel } from "@/lib/categories";
import type { ItemStatus } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import {
  cn,
  formatCalories,
  formatDateFriendly,
  formatTime,
  todayISO,
} from "@/lib/utils";

const STATUS_META: Record<
  ItemStatus,
  { label: string; className: string }
> = {
  pending: { label: "待准备", className: "bg-amber-soft/60 text-[#8A5E1F]" },
  preparing: { label: "备餐中", className: "bg-[#F8DFD4] text-[#A05137]" },
  served: { label: "已上菜", className: "bg-sage-soft text-[#58704B]" },
};

export default function OrderPage() {
  useDocumentTitle("今晚菜单");
  const {
    ready,
    tonight,
    orders,
    getDish,
    removeOrderItem,
    submitOrder,
    saveOrderNote,
    role,
  } = useKitchen();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = todayISO();
  const completedToday = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.order_date === today && order.status === "completed",
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
    [orders, today],
  );

  const order = tonight ?? completedToday;

  useEffect(() => {
    setNote(order?.note ?? "");
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(
    () =>
      (order?.items ?? [])
        .map((item) => ({ item, dish: getDish(item.dish_id) }))
        .filter((entry) => entry.dish !== null),
    [order, getDish],
  );

  const totalCalories = items.reduce(
    (sum, entry) => sum + (entry.dish?.calories ?? 0),
    0,
  );
  const noteDirty = note !== (order?.note ?? "");

  const handleSubmit = async () => {
    if (!order || submitting) return;
    setSubmitting(true);
    if (noteDirty) await saveOrderNote(order.id, note);
    const ok = await submitOrder(order.id);
    setSubmitting(false);
    if (ok) setNote(note.trim());
  };

  if (!ready) return <PageLoading label="正在看看今晚的菜单…" />;

  if (!order) {
    return (
      <div>
        <PageIntro
          eyebrow={formatDateFriendly(today)}
          title="今晚菜单"
          description="选几道想吃的，今晚的晚饭就定下来了。"
        />
        <div className="mt-8">
          <EmptyState
            emoji="🥢"
            title="今晚还没有点菜"
            description="去菜单里逛逛吧，挑中了的菜会先放在这里，提交给大厨之前都可以改。"
            action={
              <Link href="/menu" className="inline-flex">
                <Button>
                  去点菜
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const isDraft = order.status === "draft";
  const isSubmitted = order.status === "submitted";
  const isCompleted = order.status === "completed";

  return (
    <div className={cn(isDraft && items.length ? "pb-16" : "pb-2")}>
      <PageIntro
        eyebrow={formatDateFriendly(order.order_date)}
        title="今晚菜单"
        description={
          isDraft
            ? "确认好菜品和备注，再一起交给大厨。"
            : isSubmitted
              ? "菜单已经送到大厨手里，今晚有口福啦。"
              : "这顿饭吃完了，去回顾里留下一点记录吧。"
        }
        action={
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
            <ChefHat className="size-3.5 text-terracotta" />
            {role === "chef" ? "大厨查看" : "点餐员"}
          </span>
        }
      />

      <div className="mt-5 animate-rise">
        {isDraft ? (
          <StatusCard
            icon={<Clock3 className="size-[18px]" />}
            tone="amber"
            title="还在挑选中"
            description="提交之前可以随意加减菜品，也可以写一句想说的话。"
          />
        ) : isSubmitted ? (
          <StatusCard
            icon={<CheckCircle2 className="size-[18px]" />}
            tone="sage"
            title="已提交给大厨"
            description={`${formatTime(order.submitted_at ?? order.created_at)} 送达 · 大厨正在看今晚的菜单`}
          />
        ) : (
          <StatusCard
            icon={<PartyPopper className="size-[18px]" />}
            tone="ink"
            title="今晚收工啦"
            description="辛苦大厨，也谢谢点餐员。去回顾里给今晚打个分吧。"
            action={
              <Link
                href="/history"
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber-soft"
              >
                去回顾
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        )}
      </div>

      <section className="mt-5 overflow-hidden rounded-4xl border border-line bg-paper shadow-card">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <h2 className="text-[13.5px] font-bold text-ink">
            菜品清单
            <span className="ml-1.5 text-[11px] font-medium text-ink-soft">
              {items.length} 道
            </span>
          </h2>
          {isSubmitted ? (
            <Link
              href="/menu"
              className="flex items-center gap-1 text-[11px] font-semibold text-terracotta"
            >
              <Plus className="size-3.5" />
              再加一道
            </Link>
          ) : null}
        </div>

        {items.length ? (
          <ul className="divide-y divide-line/60">
            {items.map(({ item, dish }) => {
              if (!dish) return null;
              const status = STATUS_META[item.status];
              return (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <div className="size-[62px] shrink-0 overflow-hidden rounded-2xl border border-line/60">
                    <DishImage dish={dish} emojiClassName="text-[28px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-[13.5px] font-bold text-ink">
                        {dish.name}
                      </h3>
                      {!isDraft ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-ink-soft">
                      {categoryLabel(dish.category)} ·{" "}
                      {formatCalories(dish.calories)}
                    </p>
                  </div>
                  {isDraft ? (
                    <button
                      type="button"
                      onClick={() => void removeOrderItem(item.id)}
                      aria-label={`移除${dish.name}`}
                      className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft/70 transition hover:bg-rose-soft hover:text-terracotta active:scale-90"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center text-[12px] text-ink-soft">
            菜单还是空的，去挑几道菜吧。
          </div>
        )}

        {isDraft && items.length ? (
          <div className="border-t border-line/60 p-3">
            <Link
              href="/menu"
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-[12px] font-semibold text-terracotta transition active:scale-[0.98]"
            >
              <Plus className="size-4" />
              继续加菜
            </Link>
          </div>
        ) : null}
      </section>

      {items.length ? (
        <section className="mt-3 grid grid-cols-[1.2fr_1fr_1fr] gap-2 rounded-3xl bg-gradient-to-br from-[#F7E7CF] to-[#F2D6B0] p-3.5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-white/50">
              <Flame className="size-4 text-terracotta-deep" />
            </span>
            <div>
              <p className="text-[9.5px] font-medium text-[#8B6A4C]">总热量</p>
              <p className="text-[12.5px] font-bold text-ink">
                {totalCalories} 千卡
              </p>
            </div>
          </div>
          <div className="border-l border-[#DDBC92]/60 pl-3">
            <p className="text-[9.5px] font-medium text-[#8B6A4C]">两人均摊</p>
            <p className="text-[12.5px] font-bold text-ink">
              {Math.round(totalCalories / 2)} 千卡
            </p>
          </div>
          <div className="border-l border-[#DDBC92]/60 pl-3">
            <p className="text-[9.5px] font-medium text-[#8B6A4C]">用餐人数</p>
            <p className="flex items-center gap-1 text-[12.5px] font-bold text-ink">
              <Users className="size-3.5" />2 人
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-3 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <label
          htmlFor="order-note"
          className="flex items-center gap-2 text-[12.5px] font-bold text-ink"
        >
          <MessageSquareText className="size-4 text-terracotta" />
          给大厨的话
          <span className="font-normal text-ink-soft">（可选）</span>
        </label>
        <textarea
          id="order-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (noteDirty && !isCompleted) void saveOrderNote(order.id, note);
          }}
          rows={3}
          maxLength={200}
          placeholder="比如：少放一点盐，想吃辣一点～"
          className="mt-2.5 w-full resize-none rounded-2xl border border-line bg-cream/50 px-3.5 py-3 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
        />
        <div className="mt-1.5 flex items-center justify-between px-0.5">
          <span className="text-[10px] text-ink-soft/70">
            {noteDirty ? "离开输入框会自动保存" : "备注已保存"}
          </span>
          <span className="text-[10px] text-ink-soft/60">{note.length}/200</span>
        </div>
      </section>

      {isDraft && items.length ? (
        <div className="pointer-events-none fixed inset-x-0 above-nav z-30 bg-gradient-to-t from-cream via-cream/95 to-transparent px-4 pt-6">
          <div className="pointer-events-auto mx-auto w-full max-w-[448px]">
            <Button
              size="lg"
              loading={submitting}
              onClick={() => void handleSubmit()}
              className="w-full shadow-float"
            >
              提交今晚菜单 · {items.length} 道
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({
  icon,
  tone,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  tone: "amber" | "sage" | "ink";
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const tones = {
    amber: "border-[#EFD7B2] bg-[#FCF1DE] text-[#8A5E1F]",
    sage: "border-[#D5E3C8] bg-[#EFF5E7] text-[#557046]",
    ink: "border-[#3C3027] bg-ink text-cream",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-3xl border px-4 py-3.5 shadow-card",
        tones[tone],
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
          tone === "ink" ? "bg-white/10" : "bg-white/60",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold">{title}</p>
        <p
          className={cn(
            "mt-0.5 text-[11px] leading-relaxed",
            tone === "ink" ? "text-cream/70" : "opacity-80",
          )}
        >
          {description}
        </p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
