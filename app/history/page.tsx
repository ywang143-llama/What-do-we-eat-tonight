"use client";

import Link from "next/link";
import {
  Check,
  Flame,
  MessageCircle,
  Pencil,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { DishImage } from "@/components/ui/DishImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import { RatingStars } from "@/components/ui/RatingStars";
import type { Dish, Order, Rating } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import {
  averageRating,
  cn,
  formatCalories,
  formatDateFriendly,
  formatTime,
} from "@/lib/utils";

export default function HistoryPage() {
  useDocumentTitle("晚饭回顾");
  const { ready, pastOrders, ratings, getDish, getRating, saveRating } =
    useKitchen();

  const stats = useMemo(() => {
    const average = averageRating(ratings.map((rating) => rating.rating));
    const dishCount = pastOrders.reduce(
      (sum, order) => sum + order.items.length,
      0,
    );
    return {
      meals: pastOrders.length,
      dishes: dishCount,
      average,
      reviews: ratings.length,
    };
  }, [pastOrders, ratings]);

  if (!ready) return <PageLoading label="正在翻看一起吃过的晚饭…" />;

  return (
    <div>
      <PageIntro
        eyebrow="两个人 · 一起吃过的"
        title="晚饭回顾"
        description="每顿饭都值得被记住，也值得被夸一夸。"
      />

      <section className="mt-5 grid grid-cols-3 gap-2 overflow-hidden rounded-4xl bg-gradient-to-br from-[#F8E8D0] via-[#F4D9B3] to-[#EFCB99] p-4 shadow-card">
        <Stat
          label="一起吃过"
          value={`${stats.meals}`}
          unit="顿"
          icon={<UtensilsCrossed className="size-3.5" />}
        />
        <Stat
          label="做过"
          value={`${stats.dishes}`}
          unit="道菜"
          icon={<Flame className="size-3.5" />}
        />
        <Stat
          label="平均评价"
          value={stats.average ? stats.average.toFixed(1) : "—"}
          unit={stats.average ? "星" : "还没评"}
          icon={<Star className="size-3.5 fill-current" />}
        />
      </section>

      {pastOrders.length ? (
        <div className="mt-6 space-y-4">
          {pastOrders.map((order) => (
            <OrderReviewCard
              key={order.id}
              order={order}
              getDish={getDish}
              getRating={getRating}
              saveRating={saveRating}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            emoji="📖"
            title="还没有一起吃过饭"
            description="等今晚的菜单结束后，这里就会留下第一顿饭的记录啦。"
            action={
              <Link href="/menu">
                <Button size="sm">去点今晚的菜</Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[9.5px] font-medium text-[#8B6A4C]">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-[20px] font-bold leading-none text-ink">
        {value}
        <span className="ml-0.5 text-[9.5px] font-medium text-[#8B6A4C]">
          {unit}
        </span>
      </p>
    </div>
  );
}

function OrderReviewCard({
  order,
  getDish,
  getRating,
  saveRating,
}: {
  order: Order;
  getDish: (id: string) => Dish | null;
  getRating: (orderId: string, dishId: string) => Rating | null;
  saveRating: ReturnType<typeof useKitchen>["saveRating"];
}) {
  const items = order.items
    .map((item) => ({ item, dish: getDish(item.dish_id) }))
    .filter((entry) => entry.dish !== null);

  const orderRatings = items
    .map(({ dish }) =>
      dish ? getRating(order.id, dish.id)?.rating : undefined,
    )
    .filter((value): value is number => typeof value === "number");
  const average = averageRating(orderRatings);
  const totalCalories = items.reduce(
    (sum, entry) => sum + (entry.dish?.calories ?? 0),
    0,
  );

  return (
    <article className="animate-rise overflow-hidden rounded-4xl border border-line bg-paper shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-ink">
              {formatDateFriendly(order.order_date)}
            </h2>
            <span className="rounded-full bg-sage-soft px-1.5 py-0.5 text-[9px] font-semibold text-[#58704B]">
              已完成
            </span>
          </div>
          <p className="mt-1 text-[10px] text-ink-soft">
            {order.completed_at ? formatTime(order.completed_at) : ""} 收工 ·{" "}
            {items.length} 道 · {totalCalories} 千卡
          </p>
        </div>
        {average ? (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#FCF2DF] px-2.5 py-1.5 text-[11px] font-bold text-[#8A5E1F]">
            <Star className="size-3.5 fill-amber text-amber" />
            {average.toFixed(1)}
          </div>
        ) : null}
      </div>

      {order.note ? (
        <p className="mx-4 mt-3 rounded-2xl bg-cream/80 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">那天的备注 · </span>
          {order.note}
        </p>
      ) : null}

      <ul className="divide-y divide-line/60 px-4">
        {items.map(({ item, dish }) => {
          if (!dish) return null;
          return (
            <li key={item.id} className="py-3.5">
              <div className="flex items-center gap-3">
                <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-line/60">
                  <DishImage dish={dish} emojiClassName="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[12.5px] font-bold text-ink">
                    {dish.name}
                  </h3>
                  <p className="text-[9.5px] text-ink-soft">
                    {formatCalories(dish.calories)}
                  </p>
                </div>
              </div>
              <ReviewRow
                orderId={order.id}
                dish={dish}
                rating={getRating(order.id, dish.id)}
                saveRating={saveRating}
              />
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function ReviewRow({
  orderId,
  dish,
  rating,
  saveRating,
}: {
  orderId: string;
  dish: Dish;
  rating: Rating | null;
  saveRating: ReturnType<typeof useKitchen>["saveRating"];
}) {
  const [open, setOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(rating?.rating ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const startEditing = (value?: number) => {
    setDraftRating(value ?? rating?.rating ?? 0);
    setComment(rating?.comment ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draftRating || saving) return;
    setSaving(true);
    const ok = await saveRating({
      orderId,
      dishId: dish.id,
      rating: draftRating,
      comment,
    });
    setSaving(false);
    if (ok) setOpen(false);
  };

  if (!open && rating) {
    return (
      <div className="mt-2.5 flex items-start gap-2 pl-0.5">
        <RatingStars value={rating.rating} size="sm" className="mt-0.5" />
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-ink-soft">
          {rating.comment || "只留下了一串星星"}
        </p>
        <button
          type="button"
          onClick={() => startEditing()}
          className="mt-0.5 flex shrink-0 items-center gap-1 text-[9.5px] font-medium text-ink-soft/70"
        >
          <Pencil className="size-3" />
          修改
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-2.5 flex items-center gap-2">
        <RatingStars
          value={draftRating}
          size="sm"
          onChange={(value) => startEditing(value)}
          label={`给${dish.name}评分`}
        />
        <button
          type="button"
          onClick={() => startEditing()}
          className="flex items-center gap-1 text-[10px] font-medium text-terracotta"
        >
          <MessageCircle className="size-3" />
          写点评价
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2.5 rounded-2xl bg-cream/70 p-2.5">
      <div className="flex items-center justify-between">
        <RatingStars
          value={draftRating}
          onChange={setDraftRating}
          label={`给${dish.name}评分`}
        />
        <span className="text-[9.5px] text-ink-soft">
          {draftRating ? `${draftRating} 星` : "点星星评分"}
        </span>
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={2}
        maxLength={120}
        placeholder="这顿饭的味道怎么样？"
        className="mt-2 w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/45 focus:border-terracotta/60"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {rating ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-8 rounded-full px-3 text-[11px] font-medium text-ink-soft"
          >
            取消
          </button>
        ) : null}
        <Button
          size="sm"
          onClick={() => void handleSave()}
          loading={saving}
          disabled={!draftRating}
          className={cn("h-8 px-3 text-[11px]")}
        >
          <Check className="size-3.5" />
          保存评价
        </Button>
      </div>
    </div>
  );
}
