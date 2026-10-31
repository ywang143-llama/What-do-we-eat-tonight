"use client";

import {
  Camera,
  ExternalLink,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useKitchen } from "@/components/providers/KitchenProvider";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/categories";
import type { Category, DishInput, Wish, WishRecipeInput } from "@/lib/types";
import { cn, errorMessage, blobToDataURL, compressImage } from "@/lib/utils";

interface WishReviewModalProps {
  wish: Wish;
  onClose: () => void;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * "Edit / Complete Recipe" sheet for an item in the chef's wish inbox.
 * Everything is optional: the chef can type it by hand, or let OpenRouter
 * fill in the ingredients, category and calories.
 */
export function WishReviewModal({ wish, onClose }: WishReviewModalProps) {
  const { completeWish, uploadImage, notify } = useKitchen();

  const [title, setTitle] = useState(wish.title);
  const [category, setCategory] = useState<Category>("staple");
  const [calories, setCalories] = useState(
    typeof wish.calories === "number" ? String(wish.calories) : "",
  );
  const [ingredients, setIngredients] = useState(
    wish.ingredients.join("\n"),
  );
  const [steps, setSteps] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(wish.cover_image);
  const [note, setNote] = useState(wish.note ?? "");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const shotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleCoverFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setCoverImage(url);
      notify("封面图准备好啦", "success");
    } catch (uploadError) {
      notify(errorMessage(uploadError), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleScreenshotFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const blob = await compressImage(file, 1000, 0.7);
      setScreenshot(await blobToDataURL(blob));
    } catch (imageError) {
      notify(errorMessage(imageError), "error");
    }
  };

  const handleAiFill = async () => {
    if (aiBusy) return;
    const text = [wish.title, note].filter(Boolean).join("\n").trim();
    if (!text && !screenshot) {
      notify("先写一点笔记内容，或者加一张截图", "error");
      return;
    }

    setAiBusy(true);
    try {
      const response = await fetch("/api/ai/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image: screenshot ?? undefined }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            draft?: {
              title: string;
              category: Category;
              calories: number;
              ingredients: string[];
              steps: string[];
            };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.draft) {
        notify(payload?.error ?? "AI 暂时没回应，先手动写吧", "error");
        return;
      }

      const { draft } = payload;
      if (draft.title) setTitle(draft.title);
      setCategory(draft.category);
      if (draft.calories > 0) setCalories(String(draft.calories));
      if (draft.ingredients.length) setIngredients(draft.ingredients.join("\n"));
      if (draft.steps.length) setSteps(draft.steps.join("\n"));
      notify("AI 已经填好啦，检查一下再保存", "success");
    } catch (aiError) {
      notify(errorMessage(aiError), "error");
    } finally {
      setAiBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (saving || uploading) return;
    if (!title.trim()) {
      notify("先给这道菜起个名字吧", "error");
      return;
    }

    const numericCalories = Number(calories);
    if (calories && (Number.isNaN(numericCalories) || numericCalories < 0)) {
      notify("卡路里要填一个大于等于 0 的数字", "error");
      return;
    }

    const ingredientList = splitLines(ingredients);
    const stepList = splitLines(steps);

    const patch: WishRecipeInput = {
      title,
      calories: calories ? numericCalories : null,
      ingredients: ingredientList,
      cover_image: coverImage,
      rednote_url: wish.rednote_url,
    };

    const dish: DishInput = {
      name: title,
      category,
      calories: calories ? numericCalories : 0,
      emoji: CATEGORY_EMOJI[category],
      image_url: coverImage,
      recipe_steps: stepList.length
        ? stepList
        : ingredientList.length
          ? [`食材：${ingredientList.join("、")}`]
          : [],
      recipe_link: wish.rednote_url,
      is_active: true,
    };

    setSaving(true);
    const ok = await completeWish(wish.id, patch, dish);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="整理这道菜"
        className="animate-rise relative flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-[30px] border border-line bg-paper shadow-float"
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" />
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-cream text-ink-soft"
          >
            <X className="size-4" />
          </button>
          <h2 className="mt-3 pr-10 text-[17px] font-bold text-ink">
            整理这道菜
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            补全食材和热量，保存后会直接上架到点餐菜单。
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {wish.rednote_url ? (
            <a
              href={wish.rednote_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-cream/50 px-3.5 py-2.5 text-[11.5px] font-semibold text-terracotta"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              <span className="truncate">查看原笔记</span>
            </a>
          ) : null}

          <section className="mt-3 rounded-3xl border border-[#EAD8BF] bg-[#FBF1E1] p-3.5">
            <div className="flex items-center gap-1.5">
              <Wand2 className="size-3.5 text-amber" />
              <h3 className="text-[12px] font-bold text-[#7E5B31]">
                让 AI 帮忙整理
              </h3>
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#8A6A42]">
              可以补充笔记文字，或者加一张截图，AI 会猜出食材、分类和大概热量。
            </p>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={800}
              placeholder="粘贴小红书里的做法文字…"
              className="mt-2.5 w-full resize-none rounded-2xl border border-line bg-white/70 px-3 py-2.5 text-[12px] leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60"
            />

            <input
              ref={shotInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => void handleScreenshotFile(event)}
              className="hidden"
            />

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => shotInputRef.current?.click()}
                className="flex h-9 items-center gap-1.5 rounded-full border border-[#E4CFAE] bg-white/70 px-3 text-[11px] font-semibold text-[#7E5B31]"
              >
                <ImagePlus className="size-3.5" />
                {screenshot ? "换一张截图" : "加一张截图"}
              </button>
              {screenshot ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-sage">
                  已选好截图
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    aria-label="移除截图"
                    className="grid size-6 place-items-center rounded-full text-ink-soft/70"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ) : null}
            </div>

            <Button
              type="button"
              variant="amber"
              size="sm"
              className="mt-2.5 w-full"
              loading={aiBusy}
              onClick={() => void handleAiFill()}
            >
              <Sparkles className="size-3.5" />
              自动填写食材和热量
            </Button>
          </section>

          <div className="mt-4">
            <label
              htmlFor="wish-title"
              className="mb-1.5 block text-[11.5px] font-semibold text-ink"
            >
              菜名 <span className="text-terracotta">*</span>
            </label>
            <input
              id="wish-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={30}
              placeholder="比如「番茄牛腩」"
              className="h-12 w-full rounded-2xl border border-line bg-cream/50 px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10"
            />
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-[11.5px] font-semibold text-ink">分类</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
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

          <div className="mt-3">
            <label
              htmlFor="wish-calories"
              className="mb-1.5 block text-[11.5px] font-semibold text-ink"
            >
              卡路里
            </label>
            <div className="relative">
              <input
                id="wish-calories"
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

          <div className="mt-3">
            <label
              htmlFor="wish-ingredients"
              className="mb-1.5 block text-[11.5px] font-semibold text-ink"
            >
              食材
              <span className="ml-1 font-normal text-ink-soft">
                （一行一个，可留空）
              </span>
            </label>
            <textarea
              id="wish-ingredients"
              value={ingredients}
              onChange={(event) => setIngredients(event.target.value)}
              rows={3}
              placeholder={"牛腩 400g\n番茄 3 个\n洋葱 半个"}
              className="w-full resize-none rounded-2xl border border-line bg-cream/50 px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60"
            />
          </div>

          <div className="mt-3">
            <label
              htmlFor="wish-steps"
              className="mb-1.5 block text-[11.5px] font-semibold text-ink"
            >
              做法步骤
              <span className="ml-1 font-normal text-ink-soft">
                （一行一步，可留空）
              </span>
            </label>
            <textarea
              id="wish-steps"
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              rows={4}
              placeholder={"牛腩焯水切块。\n番茄炒出汁，下牛腩小火炖 60 分钟。"}
              className="w-full resize-none rounded-2xl border border-line bg-cream/50 px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/45 focus:border-terracotta/60"
            />
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-[11.5px] font-semibold text-ink">封面图</p>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => void handleCoverFile(event)}
              className="hidden"
            />
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-dashed border-line bg-cream/50">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt="封面预览"
                  className="size-full object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex size-full flex-col items-center justify-center gap-1.5 text-ink-soft"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-white/80 text-terracotta shadow-sm">
                    <Camera className="size-4" />
                  </span>
                  <span className="text-[11px] font-semibold">
                    拍一张成品图
                  </span>
                </button>
              )}

              {uploading ? (
                <div className="absolute inset-0 grid place-items-center bg-ink/35 backdrop-blur-[2px]">
                  <span className="flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[11px] font-semibold text-ink">
                    <Loader2 className="size-3.5 animate-spin text-terracotta" />
                    正在处理…
                  </span>
                </div>
              ) : null}

              {coverImage && !uploading ? (
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-[10.5px] font-semibold text-ink shadow-sm backdrop-blur"
                  >
                    <Camera className="size-3.5" />
                    更换
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    aria-label="移除封面图"
                    className="grid size-8 place-items-center rounded-full bg-white/90 text-terracotta shadow-sm backdrop-blur"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-paper px-5 pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={saving}
            >
              再想想
            </Button>
            <Button
              className="flex-1"
              loading={saving}
              disabled={uploading}
              onClick={() => void handleSubmit()}
            >
              保存并上架
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
