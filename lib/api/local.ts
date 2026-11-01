import type { KitchenApi } from "@/lib/api/types";
import { createSeedData } from "@/lib/seed";
import type {
  Dish,
  DishInput,
  ItemStatus,
  KitchenSnapshot,
  Order,
  Rating,
  RatingInput,
  SharedWishInput,
  Wish,
  WishRecipeInput,
} from "@/lib/types";
import { blobToDataURL, createId, todayISO } from "@/lib/utils";

const STORAGE_KEY = "tonights-kitchen:v1";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptySnapshot(): KitchenSnapshot {
  return { dishes: [], orders: [], ratings: [], wishlist: [] };
}

/** Rows written before the share-import feature used `name` / `pending` / `approved`. */
function normalizeWish(row: Partial<Wish> & { name?: unknown }): Wish {
  const legacyStatus = String(row.status ?? "");
  const status = legacyStatus === "approved" || legacyStatus === "ready"
    ? "ready"
    : "pending_review";
  const legacyTitle =
    typeof row.title === "string" && row.title.trim()
      ? row.title
      : typeof row.name === "string" && row.name.trim()
        ? row.name
        : null;

  return {
    id: String(row.id ?? createId("wish")),
    title: legacyTitle,
    note: typeof row.note === "string" ? row.note : null,
    status,
    source:
      row.source === "share" || (row.source as string) === "rednote"
        ? "share"
        : "manual",
    dish_id: typeof row.dish_id === "string" ? row.dish_id : null,
    calories: typeof row.calories === "number" ? row.calories : null,
    ingredients: Array.isArray(row.ingredients)
      ? row.ingredients.map(String)
      : [],
    cover_image: typeof row.cover_image === "string" ? row.cover_image : null,
    rednote_url:
      typeof row.rednote_url === "string" ? row.rednote_url : null,
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
    approved_at: typeof row.approved_at === "string" ? row.approved_at : null,
  };
}

function readDB(): KitchenSnapshot {
  if (typeof window === "undefined") return emptySnapshot();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      writeDB(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<KitchenSnapshot>;
    return {
      dishes: Array.isArray(parsed.dishes) ? parsed.dishes : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      ratings: Array.isArray(parsed.ratings) ? parsed.ratings : [],
      wishlist: Array.isArray(parsed.wishlist)
        ? parsed.wishlist.map((wish) => normalizeWish(wish))
        : [],
    };
  } catch {
    const seed = createSeedData();
    writeDB(seed);
    return seed;
  }
}

function writeDB(data: KitchenSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error("本地存储空间不足，试试删除一张菜品图片或重置数据");
  }
}

function findActiveOrder(data: KitchenSnapshot): Order | undefined {
  return data.orders
    .filter((order) => order.order_date === todayISO() && order.status !== "completed")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

function ensureActiveOrder(data: KitchenSnapshot): Order {
  const existing = findActiveOrder(data);
  if (existing) return existing;

  const now = new Date().toISOString();
  const order: Order = {
    id: createId("order"),
    order_date: todayISO(),
    status: "draft",
    note: null,
    created_at: now,
    submitted_at: null,
    completed_at: null,
    items: [],
  };
  data.orders.push(order);
  return order;
}

function updateOrder(
  data: KitchenSnapshot,
  orderId: string,
  updater: (order: Order) => void,
): void {
  const order = data.orders.find((candidate) => candidate.id === orderId);
  if (!order) throw new Error("找不到这份菜单，刷新一下试试");
  updater(order);
}

function buildDish(input: DishInput, existing?: Dish): Dish {
  return {
    id: existing?.id ?? createId("dish"),
    name: input.name.trim(),
    category: input.category,
    calories: Math.max(0, Math.round(input.calories)),
    emoji: input.emoji || null,
    image_url: input.image_url,
    recipe_steps: input.recipe_steps.map((step) => step.trim()).filter(Boolean),
    recipe_link: input.recipe_link?.trim() || null,
    is_active: input.is_active,
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
}

export const localApi: KitchenApi = {
  mode: "local",

  async load() {
    return clone(readDB());
  },

  async addToOrder(dishId) {
    const data = readDB();
    const order = ensureActiveOrder(data);
    if (order.items.some((item) => item.dish_id === dishId)) {
      throw new Error("这道菜已经在今晚的菜单里啦");
    }
    order.items.push({
      id: createId("item"),
      order_id: order.id,
      dish_id: dishId,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    writeDB(data);
  },

  async removeOrderItem(itemId) {
    const data = readDB();
    for (const order of data.orders) {
      const index = order.items.findIndex((item) => item.id === itemId);
      if (index >= 0) {
        order.items.splice(index, 1);
        writeDB(data);
        return;
      }
    }
    throw new Error("找不到这道菜");
  },

  async saveOrderNote(orderId, note) {
    const data = readDB();
    updateOrder(data, orderId, (order) => {
      order.note = note.trim() || null;
    });
    writeDB(data);
  },

  async submitOrder(orderId) {
    const data = readDB();
    updateOrder(data, orderId, (order) => {
      if (!order.items.length) throw new Error("菜单还是空的，先选几道菜吧");
      order.status = "submitted";
      order.submitted_at = new Date().toISOString();
      order.items = order.items.map((item) => ({
        ...item,
        status: item.status === "served" ? "served" : "pending",
      }));
    });
    writeDB(data);
  },

  async setItemStatus(itemId: string, status: ItemStatus) {
    const data = readDB();
    for (const order of data.orders) {
      const item = order.items.find((candidate) => candidate.id === itemId);
      if (item) {
        item.status = status;
        writeDB(data);
        return;
      }
    }
    throw new Error("找不到这道菜");
  },

  async completeOrder(orderId) {
    const data = readDB();
    updateOrder(data, orderId, (order) => {
      order.status = "completed";
      order.completed_at = new Date().toISOString();
      order.items = order.items.map((item) => ({ ...item, status: "served" }));
    });
    writeDB(data);
  },

  async saveDish(input, id) {
    const data = readDB();
    const existing = id ? data.dishes.find((dish) => dish.id === id) : undefined;
    if (id && !existing) throw new Error("找不到这道菜");
    const dish = buildDish(input, existing);
    if (!dish.name) throw new Error("先给这道菜起个名字吧");

    if (existing) {
      data.dishes = data.dishes.map((candidate) =>
        candidate.id === dish.id ? dish : candidate,
      );
    } else {
      data.dishes.unshift(dish);
    }
    writeDB(data);
    return dish.id;
  },

  async setDishActive(id, active) {
    const data = readDB();
    const dish = data.dishes.find((candidate) => candidate.id === id);
    if (!dish) throw new Error("找不到这道菜");
    dish.is_active = active;
    writeDB(data);
  },

  async addWish(title, note) {
    const data = readDB();
    const trimmed = title.trim();
    if (!trimmed) throw new Error("写下想吃的那道菜吧");
    data.wishlist.unshift({
      id: createId("wish"),
      title: trimmed,
      note: note.trim() || null,
      status: "pending_review",
      source: "manual",
      dish_id: null,
      calories: null,
      ingredients: [],
      cover_image: null,
      rednote_url: null,
      created_at: new Date().toISOString(),
      approved_at: null,
    });
    writeDB(data);
  },

  async addSharedWish({ title, rednote_url, note }: SharedWishInput) {
    const data = readDB();
    const trimmed = title?.trim() || null;
    if (!trimmed && !rednote_url) {
      throw new Error("这条分享没有菜名，试试换个方式收藏吧");
    }

    const duplicate = rednote_url
      ? data.wishlist.find(
          (wish) =>
            wish.rednote_url === rednote_url && wish.status === "pending_review",
        )
      : undefined;
    if (duplicate) throw new Error("这条笔记已经在心愿收件箱里啦");

    data.wishlist.unshift({
      id: createId("wish"),
      title: trimmed,
      note: note?.trim() || null,
      status: "pending_review",
      source: "share",
      dish_id: null,
      calories: null,
      ingredients: [],
      cover_image: null,
      rednote_url,
      created_at: new Date().toISOString(),
      approved_at: null,
    });
    writeDB(data);
  },

  async markWishReady(wishId, dishId) {
    const data = readDB();
    const wish = data.wishlist.find((candidate) => candidate.id === wishId);
    if (!wish) throw new Error("找不到这条心愿");
    wish.status = "ready";
    wish.dish_id = dishId;
    wish.approved_at = new Date().toISOString();
    writeDB(data);
  },

  async completeWish(wishId, patch, input) {
    const data = readDB();
    const wish = data.wishlist.find((candidate) => candidate.id === wishId);
    if (!wish) throw new Error("找不到这条心愿");

    const dish = buildDish(input);
    if (!dish.name) throw new Error("先给这道菜起个名字吧");

    data.dishes.unshift(dish);
    wish.title = patch.title.trim() || dish.name;
    wish.calories = patch.calories;
    wish.ingredients = patch.ingredients
      .map((item) => item.trim())
      .filter(Boolean);
    wish.cover_image = patch.cover_image;
    wish.rednote_url = patch.rednote_url;
    wish.status = "ready";
    wish.dish_id = dish.id;
    wish.approved_at = new Date().toISOString();
    writeDB(data);
    return dish.id;
  },

  async deleteWish(wishId) {
    const data = readDB();
    data.wishlist = data.wishlist.filter((wish) => wish.id !== wishId);
    writeDB(data);
  },

  async saveRating({ orderId, dishId, rating, comment }: RatingInput) {
    const data = readDB();
    const existing = data.ratings.find(
      (candidate) =>
        candidate.order_id === orderId && candidate.dish_id === dishId,
    );
    if (existing) {
      existing.rating = rating;
      existing.comment = comment.trim() || null;
      existing.created_at = new Date().toISOString();
    } else {
      const newRating: Rating = {
        id: createId("rating"),
        order_id: orderId,
        dish_id: dishId,
        rating,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
      };
      data.ratings.push(newRating);
    }
    writeDB(data);
  },

  async uploadImage(blob) {
    return blobToDataURL(blob);
  },

  async resetLocalData() {
    writeDB(createSeedData());
  },
};
