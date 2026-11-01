"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  ChevronLeft,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageIntro } from "@/components/ui/PageIntro";
import { PageLoading } from "@/components/ui/PageLoading";
import { Toggle } from "@/components/ui/Toggle";
import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_MAP } from "@/lib/categories";
import type { Category, Dish, DishInput, Wish } from "@/lib/types";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn, errorMessage } from "@/lib/utils";
import { wishTitle } from "@/lib/wish";

const EMOJI_CHOICES = [
  "🍜", "🍚", "🍛", "🥟", "🥦", "🥬", "🍆", "🥒",
  "🍗", "🥩", "🍖", "🌶️", "🍅", "🌽", "🥣", "🍲",
  "🧋", "🍮", "🍡", "🍠", "🫓", "🍤", "🥘", "🍳",
];

export function DishForm({
  dishId,
  wishlistId,
}: {
  dishId?: string;
  wishlistId?: string;
}) {
  const { ready, getDish, wishlist } = useKitchen();
  const dish = dishId ? getDish(dishId) : null;
  const wish = wishlistId
    ? wishlist.find((item) => item.id === wishlistId) ?? null
    : null;

  if (!ready) return <PageLoading label="正在翻开菜谱本…" />;

  if (dishId && !dish) {
    return (
      <EmptyState
        emoji="📄"
        title="找不到这道菜"
        description="它可能已经被删除了，回菜谱本看看吧。"
        action={
          <Link href="/chef/menu">
            <Button size="sm">回到菜单</Button>
          </Link>
        }
      />
    );
  }

  if (wishlistId && !wish) {
    return (
      <EmptyState
        emoji="💭"
        title="找不到这个心愿"
        description="它可能已经被实现了，或者被移除了。"
        action={
          <Link href="/chef/wishlist">
            <Button size="sm">回到心愿单</Button>
          </Link>
        }
      />
    );
  }

  return (
    <DishFormInner
      key={dish?.id ?? wishlistId ?? "new"}
      dish={dish}
      wish={wish}
      wishlistId={wishlistId}
    />
  );
}

function DishFormInner({
  dish,
  wish,
  wishlistId,
}: {
  dish: Dish | null;
  wish: Wish | null;
  wishlistId?: string;
}) {
  const router = useRouter();
  const { saveDish, uploadImage, notify, mode } = useKitchen();
  const editing = Boolean(dish);

  useDocumentTitle(editing ? "编辑菜谱" : "添加新菜");

  const [name, setName] = useState(dish?.name ?? wish?.title ?? "");
  const [category, setCategory] = useState<Category>(
    dish?.category ?? "staple",
  );
  const [calories, setCalories] = useState(
    dish?.calories ? String(dish.calories) : "",
  );
  const [emoji, setEmoji] = useState(
    dish?.emoji || CATEGORY_EMOJI[dish?.category ?? "staple"],
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    dish?.image_url ?? null,
  );
  const [steps, setSteps] = useState<string[]>(
    dish?.recipe_steps.length ? dish.recipe_steps : [""],
  );
  const [recipeLink, setRecipeLink] = useState(dish?.recipe_link ?? "");
  const [isActive, setIsActive] = useState(dish?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojiChoices = useMemo(
    () => Array.from(new Set([emoji, ...EMOJI_CHOICES])),
    [emoji],
  );

  const pickImage = () => fileInputRef.current?.click();

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
      notify("图片已准备好", "success");
    } catch (uploadError) {
      notify(errorMessage(uploadError), "error");
    } finally {
      setUploading(false);
    }
  };

  const updateStep = (index: number, value: string) => {
    setSteps((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? value : step)),
    );
  };

  const removeStep = (index: number) => {
    setSteps((current) =>
      current.length === 1
        ? [""]
        : current.filter((_, stepIndex) => stepIndex !== index),
    );
  };

  const handleCategory = (next: Category) => {
    if (emoji === CATEGORY_EMOJI[category] || !emoji) {
      setEmoji(CATEGORY_EMOJI[next]);
    }
    setCategory(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || uploading) return;

    if (!name.trim()) {
      notify("先给这道菜起个名字吧", "error");
      return;
    }

    const numericCalories = Number(calories);
    if (calories && (Number.isNaN(numericCalories) || numericCalories < 0)) {
      notify("卡路里要填一个大于等于 0 的数字", "error");
      return;
    }

    const input: DishInput = {
      name,
      category,
      calories: calories ? numericCalories : 0,
      emoji,
      image_url: imageUrl,
      recipe_steps: steps,
      recipe_link: recipeLink,
      is_active: isActive,
    };

    setSaving(true);
    const saved = await saveDish(input, dish?.id, wishlistId);
    setSaving(false);

    if (saved) router.push("/chef/menu");
  };

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/chef/menu"
          aria-label="返回菜单管理"
          className="grid size-9 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-sm"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-[11.5px] font-medium text-ink-soft">
          菜谱本 / {editing ? "编辑菜品" : "添加新菜"}
        </span>
      </div>

      <PageIntro
        eyebrow={editing ? "大厨 · 修改菜谱" : "大厨 · 新菜上架"}
        title={editing ? "编辑这道菜" : "添一道新菜"}
        description={
          editing
            ? "改完之后保存，点餐菜单会马上更新。"
            : "写清楚菜名和做法，点餐员就能放心点啦。"
        }
      />

      {wish ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#EAD8BF] bg-[#FBF1E1] px-3.5 py-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#8A5E1F]">
              来自点餐员的心愿
            </p>
            <p className="mt-0.5 text-[12.5px] font-bold text-ink">
              {wishTitle(wish)}
            </p>
            {wish.note ? (
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-soft">
                {wish.note}
              </p>
            ) : null}
            <p className="mt-1 text-[9.5px] text-ink-soft/70">
              保存后，这个心愿会自动标记为「已实现」。
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-5 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <h2 className="text-[12.5px] font-bold text-ink">基本信息</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => void handleFile(event)}
          className="hidden"
        />

        <div className="mt-3">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-dashed border-line bg-cream/50">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="菜品预览"
                className="size-full object-cover"
              />
            ) : (
              <button
                type="button"
                onClick={pickImage}
                className="flex size-full flex-col items-center justify-center gap-1.5 text-ink-soft"
              >
                <span className="grid size-11 place-items-center rounded-full bg-white/80 text-terracotta shadow-sm">
                  <ImagePlus className="size-5" />
                </span>
                <span className="text-[11.5px] font-semibold">
                  拍一张成品图
                </span>
                <span className="text-[9.5px] text-ink-soft/70">
                  也可以从相册选择，会自动压缩
                </span>
              </button>
            )}

            {uploading ? (
              <div className="absolute inset-0 grid place-items-center bg-ink/35 backdrop-blur-[2px]">
                <span className="flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-[11px] font-semibold text-ink">
                  <Loader2 className="size-3.5 animate-spin text-terracotta" />
                  正在处理图片…
                </span>
              </div>
            ) : null}

            {imageUrl && !uploading ? (
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={pickImage}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-[10.5px] font-semibold text-ink shadow-sm backdrop-blur"
                >
                  <Camera className="size-3.5" />
                  更换
                </button>
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  aria-label="移除图片"
                  className="grid size-8 place-items-center rounded-full bg-white/90 text-terracotta shadow-sm backdrop-blur"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
          <p className="mt-1.5 px-0.5 text-[9.5px] text-ink-soft/65">
            {mode === "supabase"
              ? "图片会压缩后上传到 Supabase Storage。"
              : "本机演示模式：图片会压缩后保存在这台设备上。"}
          </p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="dish-name"
            className="mb-1.5 block text-[11.5px] font-semibold text-ink"
          >
            菜名 <span className="text-terracotta">*</span>
          </label>
          <input
            id="dish-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={30}
            placeholder="比如「可乐鸡翅」"
            className="h-12 w-full rounded-2xl border border-line bg-cream/50 px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
          />
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[11.5px] font-semibold text-ink">分类</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCategory(item.id)}
                aria-pressed={category === item.id}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition active:scale-95",
                  category === item.id
                    ? "border-terracotta bg-terracotta text-white"
                    : "border-line bg-cream/40 text-ink-soft",
                )}
              >
                <span className="text-[14px]">{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="dish-calories"
              className="mb-1.5 block text-[11.5px] font-semibold text-ink"
            >
              卡路里
            </label>
            <div className="relative">
              <input
                id="dish-calories"
                type="number"
                inputMode="numeric"
                min={0}
                max={5000}
                step={10}
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                placeholder="520"
                className="h-12 w-full rounded-2xl border border-line bg-cream/50 px-3.5 pr-12 text-[14px] text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-soft">
                千卡
              </span>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11.5px] font-semibold text-ink">
              图标
            </p>
            <div className="flex h-12 items-center gap-1.5 rounded-2xl border border-line bg-cream/50 px-2.5">
              <span className="text-[20px]">{emoji}</span>
              <span className="truncate text-[9.5px] text-ink-soft">
                选一个像它的
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-cream/40 p-2">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {emojiChoices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setEmoji(choice)}
                aria-pressed={emoji === choice}
                aria-label={`选择图标 ${choice}`}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl text-[18px] transition",
                  emoji === choice
                    ? "bg-white shadow-sm ring-2 ring-terracotta/50"
                    : "hover:bg-white/70",
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-4xl border border-line bg-paper p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-[12.5px] font-bold text-ink">做法步骤</h2>
          <span className="text-[9.5px] text-ink-soft">
            {steps.filter((step) => step.trim()).length} 步
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-cream-deep text-[10px] font-bold text-terracotta">
                {index + 1}
              </span>
              <textarea
                value={step}
                onChange={(event) => updateStep(index, event.target.value)}
                rows={2}
                maxLength={200}
                placeholder={
                  index === 0
                    ? "比如：鸡翅两面划刀，冷水下锅焯水。"
                    : "下一步做什么？"
                }
                className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-cream/40 px-3 py-2.5 text-[12px] leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60"
              />
              <button
                type="button"
                onClick={() => removeStep(index)}
                aria-label={`删除第 ${index + 1} 步`}
                className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-soft/60 transition hover:bg-rose-soft hover:text-terracotta"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSteps((current) => [...current, ""])}
          className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-[11.5px] font-semibold text-terracotta transition active:scale-[0.98]"
        >
          <Plus className="size-3.5" />
          添加一步
        </button>

        <div className="mt-4">
          <label
            htmlFor="recipe-link"
            className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink"
          >
            <Link2 className="size-3.5 text-ink-soft" />
            外部菜谱链接
            <span className="font-normal text-ink-soft">（可选）</span>
          </label>
          <input
            id="recipe-link"
            type="url"
            value={recipeLink}
            onChange={(event) => setRecipeLink(event.target.value)}
            placeholder="https://www.xiachufang.com/…"
            className="h-11 w-full rounded-2xl border border-line bg-cream/50 px-3.5 text-[12.5px] text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
          />
        </div>
      </section>

      <section className="mt-3 flex items-center gap-3 rounded-3xl border border-line bg-paper px-4 py-3 shadow-card">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-ink">上架到点餐菜单</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-ink-soft">
            关闭后，这道菜只会留在菜谱本里，点餐员看不到。
          </p>
        </div>
        <Toggle
          checked={isActive}
          onChange={setIsActive}
          label="上架到点餐菜单"
        />
      </section>

      <div className="pointer-events-none fixed inset-x-0 above-nav z-30 bg-gradient-to-t from-cream via-cream/95 to-transparent px-4 pt-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-[448px] gap-2">
          <Link href="/chef/menu" className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="px-5"
              disabled={saving}
            >
              取消
            </Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            loading={saving}
            disabled={uploading}
            className="flex-1 shadow-float"
          >
            <Save className="size-4" />
            {editing ? "保存修改" : "保存并上架"}
          </Button>
        </div>
      </div>
    </form>
  );
}
