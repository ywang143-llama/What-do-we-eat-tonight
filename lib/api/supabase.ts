import type { KitchenApi } from "@/lib/api/types";
import { DISH_IMAGE_BUCKET, supabase } from "@/lib/supabase";
import type {
  Dish,
  DishInput,
  ItemStatus,
  KitchenSnapshot,
  Order,
  OrderItem,
  Rating,
  SharedWishInput,
  Wish,
  WishRecipeInput,
} from "@/lib/types";
import { createId, todayISO } from "@/lib/utils";

function client() {
  if (!supabase) throw new Error("Supabase 还没有配置");
  return supabase;
}

function explain(message: string): string {
  if (/relation .* does not exist/i.test(message) || /schema cache/i.test(message)) {
    return "Supabase 数据表还没创建，请先在 SQL Editor 运行 supabase/schema.sql";
  }
  if (/bucket not found/i.test(message)) {
    return "Supabase 存储桶 dish-images 还没创建，请重新运行 schema.sql";
  }
  if (/anonymous sign-ins are disabled/i.test(message)) {
    return "Supabase 匿名登录未开启（不影响点餐，可在 Authentication 中开启）";
  }
  if (/wishlist_rednote_pending_idx/i.test(message)) {
    return "这条笔记已经在心愿收件箱里啦";
  }
  return message;
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(explain(error?.message || fallback));
}

let sessionPromise: Promise<void> | null = null;

/**
 * Give every visitor an anonymous Supabase session. This keeps storage and
 * table access authenticated, and can later be upgraded to real auth.
 * If anonymous sign-ins are disabled in the dashboard, we simply continue.
 */
function ensureSession(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) console.warn("匿名登录未启用：", error.message);
        }
      } catch (error) {
        console.warn("匿名登录失败：", error);
      }
    })();
  }
  return sessionPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(row: any): Order {
  const items: OrderItem[] = Array.isArray(row.items)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.items.map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        dish_id: item.dish_id,
        status: item.status as ItemStatus,
        created_at: item.created_at,
      }))
    : [];

  return {
    id: row.id,
    order_date: String(row.order_date),
    status: row.status,
    note: row.note,
    created_at: row.created_at,
    submitted_at: row.submitted_at,
    completed_at: row.completed_at,
    items: items.sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWish(row: any): Wish {
  const title =
    typeof row.title === "string" && row.title.trim()
      ? row.title
      : typeof row.name === "string" && row.name.trim()
        ? row.name
        : null;

  return {
    id: row.id,
    title,
    note: row.note ?? null,
    status: row.status === "ready" || row.status === "approved"
      ? "ready"
      : "pending_review",
    source:
      row.source === "share" || row.source === "rednote" ? "share" : "manual",
    dish_id: row.dish_id ?? null,
    calories: typeof row.calories === "number" ? row.calories : null,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    cover_image: row.cover_image ?? null,
    rednote_url: row.rednote_url ?? null,
    created_at: row.created_at,
    approved_at: row.approved_at ?? null,
  };
}

function dishPayload(input: DishInput) {
  return {
    name: input.name.trim(),
    category: input.category,
    calories: Math.max(0, Math.round(input.calories)),
    emoji: input.emoji || null,
    image_url: input.image_url,
    recipe_steps: input.recipe_steps.map((step) => step.trim()).filter(Boolean),
    recipe_link: input.recipe_link?.trim() || null,
    is_active: input.is_active,
  };
}

async function writeDish(input: DishInput, id?: string): Promise<string> {
  const db = client();
  const payload = dishPayload(input);
  if (!payload.name) throw new Error("先给这道菜起个名字吧");

  if (id) {
    const { data, error } = await db
      .from("dishes")
      .update(payload)
      .eq("id", id)
      .select("id")
      .single();
    if (error) fail(error, "菜品保存失败");
    return data.id as string;
  }

  const { data, error } = await db
    .from("dishes")
    .insert(payload)
    .select("id")
    .single();
  if (error) fail(error, "菜品保存失败");
  return data.id as string;
}

export const supabaseApi: KitchenApi = {
  mode: "supabase",

  async load() {
    await ensureSession();
    const db = client();

    const [dishResult, orderResult, wishResult, ratingResult] = await Promise.all([
      db.from("dishes").select("*").order("created_at", { ascending: false }),
      db
        .from("orders")
        .select("*, items:order_items(*)")
        .order("order_date", { ascending: false })
        .order("created_at", { ascending: false }),
      db.from("wishlist").select("*").order("created_at", { ascending: false }),
      db.from("ratings").select("*").order("created_at", { ascending: false }),
    ]);

    if (dishResult.error) fail(dishResult.error, "菜单加载失败");
    if (orderResult.error) fail(orderResult.error, "订单加载失败");
    if (wishResult.error) fail(wishResult.error, "心愿单加载失败");
    if (ratingResult.error) fail(ratingResult.error, "评价加载失败");

    return {
      dishes: (dishResult.data ?? []) as Dish[],
      orders: (orderResult.data ?? []).map(mapOrder),
      wishlist: (wishResult.data ?? []).map(mapWish),
      ratings: (ratingResult.data ?? []) as Rating[],
    } satisfies KitchenSnapshot;
  },

  async addToOrder(dishId) {
    const db = client();
    const { data: existing, error: findError } = await db
      .from("orders")
      .select("id")
      .eq("order_date", todayISO())
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) fail(findError, "今晚的菜单读取失败");

    let orderId = existing?.id as string | undefined;
    if (!orderId) {
      const { data, error } = await db
        .from("orders")
        .insert({ order_date: todayISO(), status: "draft" })
        .select("id")
        .single();
      if (error) fail(error, "今晚的菜单创建失败");
      orderId = data.id;
    }

    const { data: duplicate } = await db
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("dish_id", dishId)
      .maybeSingle();

    if (duplicate) throw new Error("这道菜已经在今晚的菜单里啦");

    const { error } = await db.from("order_items").insert({
      order_id: orderId,
      dish_id: dishId,
      status: "pending",
    });
    if (error) fail(error, "加入菜单失败");
  },

  async removeOrderItem(itemId) {
    const { error } = await client()
      .from("order_items")
      .delete()
      .eq("id", itemId);
    if (error) fail(error, "移除菜品失败");
  },

  async saveOrderNote(orderId, note) {
    const { error } = await client()
      .from("orders")
      .update({ note: note.trim() || null })
      .eq("id", orderId);
    if (error) fail(error, "备注保存失败");
  },

  async submitOrder(orderId) {
    const db = client();
    const { count, error: countError } = await db
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);
    if (countError) fail(countError, "菜单读取失败");
    if (!count) throw new Error("菜单还是空的，先选几道菜吧");

    const { error } = await db
      .from("orders")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) fail(error, "提交菜单失败");
  },

  async setItemStatus(itemId: string, status: ItemStatus) {
    const { error } = await client()
      .from("order_items")
      .update({ status })
      .eq("id", itemId);
    if (error) fail(error, "更新状态失败");
  },

  async completeOrder(orderId) {
    const db = client();
    const [orderResult, itemResult] = await Promise.all([
      db
        .from("orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId),
      db
        .from("order_items")
        .update({ status: "served" })
        .eq("order_id", orderId),
    ]);
    if (orderResult.error) fail(orderResult.error, "结束今晚失败");
    if (itemResult.error) fail(itemResult.error, "更新菜品状态失败");
  },

  async saveDish(input, id) {
    return writeDish(input, id);
  },

  async setDishActive(id, active) {
    const { error } = await client()
      .from("dishes")
      .update({ is_active: active })
      .eq("id", id);
    if (error) fail(error, "菜品状态更新失败");
  },

  async deleteDish(id) {
    const { error } = await client().from("dishes").delete().eq("id", id);
    if (error) {
      // order_items.dish_id uses `on delete restrict`, so dishes that already
      // appeared in a dinner cannot be removed without losing history.
      if (/foreign key|violates|23503/i.test(error.message)) {
        throw new Error("这道菜上过餐桌了，先下架吧，历史要留着");
      }
      fail(error, "删除菜品失败");
    }
  },

  async addWish(title, note) {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("写下想吃的那道菜吧");
    const { error } = await client().from("wishlist").insert({
      title: trimmed,
      note: note.trim() || null,
      status: "pending_review",
      source: "manual",
    });
    if (error) fail(error, "心愿没有送到，再试一次");
  },

  async addSharedWish({ title, rednote_url, note }: SharedWishInput) {
    const db = client();
    const trimmed = title?.trim() || null;
    if (!trimmed && !rednote_url) {
      throw new Error("这条分享没有菜名，试试换个方式收藏吧");
    }

    if (rednote_url) {
      const { data: duplicate, error: findError } = await db
        .from("wishlist")
        .select("id")
        .eq("rednote_url", rednote_url)
        .eq("status", "pending_review")
        .limit(1)
        .maybeSingle();
      if (findError) fail(findError, "心愿收件箱读取失败");
      if (duplicate) throw new Error("这条笔记已经在心愿收件箱里啦");
    }

    const { error } = await db.from("wishlist").insert({
      title: trimmed,
      note: note?.trim() || null,
      status: "pending_review",
      source: "share",
      rednote_url,
    });
    if (error) fail(error, "分享没有送到，再试一次");
  },

  async markWishReady(wishId, dishId) {
    const { error } = await client()
      .from("wishlist")
      .update({
        status: "ready",
        dish_id: dishId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", wishId);
    if (error) fail(error, "心愿状态更新失败");
  },

  async completeWish(wishId, patch: WishRecipeInput, input: DishInput) {
    const db = client();
    const dishId = await writeDish(input);

    const { error } = await db
      .from("wishlist")
      .update({
        title: patch.title.trim() || input.name.trim(),
        calories: patch.calories,
        ingredients: patch.ingredients
          .map((item) => item.trim())
          .filter(Boolean),
        cover_image: patch.cover_image,
        rednote_url: patch.rednote_url,
        status: "ready",
        dish_id: dishId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", wishId);
    if (error) fail(error, "心愿保存失败，菜已经做好了，可再试一次整理");

    return dishId;
  },

  async deleteWish(wishId) {
    const { error } = await client().from("wishlist").delete().eq("id", wishId);
    if (error) fail(error, "删除心愿失败");
  },

  async saveRating({ orderId, dishId, rating, comment }) {
    const { error } = await client()
      .from("ratings")
      .upsert(
        {
          order_id: orderId,
          dish_id: dishId,
          rating,
          comment: comment.trim() || null,
        },
        { onConflict: "order_id,dish_id" },
      );
    if (error) fail(error, "评价保存失败");
  },

  async uploadImage(blob) {
    const db = client();
    const path = `${todayISO()}/${createId("photo")}.jpg`;
    const { error } = await db.storage
      .from(DISH_IMAGE_BUCKET)
      .upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) fail(error, "图片上传失败");

    const { data } = db.storage.from(DISH_IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async resetLocalData() {
    throw new Error("云端数据不支持一键重置，请在 Supabase 控制台操作");
  },
};
