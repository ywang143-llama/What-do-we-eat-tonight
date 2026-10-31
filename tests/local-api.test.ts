import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { localApi } from "@/lib/api/local.ts";
import type { DishInput, KitchenSnapshot, Wish } from "@/lib/types.ts";

const STORAGE_KEY = "tonights-kitchen:v1";

class MemoryStorage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const storage = new MemoryStorage();

// The local adapter only touches `window.localStorage`, so a tiny shim is enough.
(globalThis as unknown as { window: unknown }).window = { localStorage: storage };

const emptySnapshot: KitchenSnapshot = {
  dishes: [],
  orders: [],
  ratings: [],
  wishlist: [],
};

function writeSnapshot(patch: Partial<KitchenSnapshot>): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptySnapshot, ...patch }));
}

function readSnapshot(): KitchenSnapshot {
  return JSON.parse(storage.getItem(STORAGE_KEY) ?? "null") as KitchenSnapshot;
}

function makeWish(patch: Partial<Wish> = {}): Wish {
  return {
    id: "wish-test-1",
    title: "番茄牛腩",
    note: null,
    status: "pending_review",
    source: "share",
    dish_id: null,
    calories: null,
    ingredients: [],
    cover_image: null,
    rednote_url: "https://xhslink.com/a/test",
    created_at: "2026-01-01T00:00:00.000Z",
    approved_at: null,
    ...patch,
  };
}

const dishInput: DishInput = {
  name: "番茄牛腩",
  category: "meat",
  calories: 480,
  emoji: "🥩",
  image_url: null,
  recipe_steps: ["牛腩焯水。", "小火炖 60 分钟。"],
  recipe_link: "https://xhslink.com/a/test",
  is_active: true,
};

beforeEach(() => {
  storage.clear();
});

describe("localApi seed", () => {
  it("seeds a fresh kitchen with a shared wish already in the inbox", async () => {
    const snapshot = await localApi.load();

    assert.ok(snapshot.dishes.length > 0);
    assert.ok(
      snapshot.wishlist.some(
        (wish) => wish.status === "pending_review" && wish.source === "share",
      ),
    );
    assert.ok(snapshot.wishlist.some((wish) => wish.status === "ready"));
  });

  it("returns a copy so callers cannot mutate storage", async () => {
    const snapshot = await localApi.load();
    snapshot.wishlist.length = 0;

    const again = await localApi.load();
    assert.ok(again.wishlist.length > 0);
  });
});

describe("localApi.addWish", () => {
  beforeEach(() => writeSnapshot({}));

  it("stores a manual wish awaiting review", async () => {
    await localApi.addWish("  麻辣香锅 ", "多加藕片");

    const [wish] = readSnapshot().wishlist;
    assert.equal(wish.title, "麻辣香锅");
    assert.equal(wish.status, "pending_review");
    assert.equal(wish.source, "manual");
    assert.equal(wish.note, "多加藕片");
    assert.equal(wish.rednote_url, null);
    assert.deepEqual(wish.ingredients, []);
  });

  it("turns a blank note into null and rejects a blank title", async () => {
    await localApi.addWish("番茄牛腩", "   ");
    assert.equal(readSnapshot().wishlist[0].note, null);

    await assert.rejects(() => localApi.addWish("   ", ""), /想吃的那道菜/);
  });
});

describe("localApi.addSharedWish", () => {
  beforeEach(() => writeSnapshot({}));

  it("stores a shared note as a pending inbox item", async () => {
    await localApi.addSharedWish({
      title: "小炒黄牛肉",
      rednote_url: "https://xhslink.com/a/shared",
      note: "大火快炒 30 秒。",
    });

    const [wish] = readSnapshot().wishlist;
    assert.equal(wish.title, "小炒黄牛肉");
    assert.equal(wish.status, "pending_review");
    assert.equal(wish.source, "share");
    assert.equal(wish.rednote_url, "https://xhslink.com/a/shared");
    assert.equal(wish.note, "大火快炒 30 秒。");
  });

  it("refuses a note that is already waiting in the inbox", async () => {
    const input = {
      title: "小炒黄牛肉",
      rednote_url: "https://xhslink.com/a/dupe",
      note: null,
    };

    await localApi.addSharedWish(input);
    await assert.rejects(
      () => localApi.addSharedWish(input),
      /已经在心愿收件箱里啦/,
    );
    assert.equal(readSnapshot().wishlist.length, 1);
  });

  it("allows the same note again once the first copy is ready", async () => {
    const input = {
      title: "小炒黄牛肉",
      rednote_url: "https://xhslink.com/a/repeat",
      note: null,
    };

    await localApi.addSharedWish(input);
    const wishId = readSnapshot().wishlist[0].id;
    await localApi.markWishReady(wishId, "dish-1");

    await localApi.addSharedWish(input);
    assert.equal(readSnapshot().wishlist.length, 2);
  });

  it("keeps links without a URL and rejects an empty title", async () => {
    await localApi.addSharedWish({
      title: "手写的心愿",
      rednote_url: null,
      note: null,
    });

    const [wish] = readSnapshot().wishlist;
    assert.equal(wish.rednote_url, null);
    assert.equal(wish.source, "share");

    await assert.rejects(
      () => localApi.addSharedWish({ title: "  ", rednote_url: null, note: null }),
      /没有菜名/,
    );
  });
});

describe("localApi.markWishReady", () => {
  beforeEach(() => writeSnapshot({ wishlist: [makeWish()] }));

  it("flips the wish to ready and links the dish", async () => {
    await localApi.markWishReady("wish-test-1", "dish-42");

    const [wish] = readSnapshot().wishlist;
    assert.equal(wish.status, "ready");
    assert.equal(wish.dish_id, "dish-42");
    assert.ok(wish.approved_at);
  });

  it("fails loudly for an unknown wish", async () => {
    await assert.rejects(
      () => localApi.markWishReady("nope", "dish-42"),
      /找不到这条心愿/,
    );
  });
});

describe("localApi.completeWish", () => {
  beforeEach(() => writeSnapshot({ wishlist: [makeWish()] }));

  it("publishes the dish and stores the reviewed recipe on the wish", async () => {
    const dishId = await localApi.completeWish(
      "wish-test-1",
      {
        title: "番茄牛腩煲",
        calories: 520,
        ingredients: [" 牛腩 400g ", "", "番茄 3 个"],
        cover_image: "https://example.test/cover.jpg",
        rednote_url: "https://xhslink.com/a/test",
      },
      { ...dishInput, name: "番茄牛腩煲", calories: 520 },
    );

    const snapshot = readSnapshot();
    const dish = snapshot.dishes.find((candidate) => candidate.id === dishId);
    assert.equal(snapshot.dishes.length, 1);
    assert.equal(dish?.name, "番茄牛腩煲");
    assert.equal(dish?.category, "meat");
    assert.deepEqual(dish?.recipe_steps, ["牛腩焯水。", "小火炖 60 分钟。"]);

    const [wish] = snapshot.wishlist;
    assert.equal(wish.status, "ready");
    assert.equal(wish.dish_id, dishId);
    assert.equal(wish.title, "番茄牛腩煲");
    assert.equal(wish.calories, 520);
    assert.deepEqual(wish.ingredients, ["牛腩 400g", "番茄 3 个"]);
    assert.equal(wish.cover_image, "https://example.test/cover.jpg");
    assert.ok(wish.approved_at);
  });

  it("changes nothing when the dish has no name", async () => {
    await assert.rejects(
      () =>
        localApi.completeWish(
          "wish-test-1",
          {
            title: "",
            calories: null,
            ingredients: [],
            cover_image: null,
            rednote_url: null,
          },
          { ...dishInput, name: "   " },
        ),
      /先给这道菜起个名字吧/,
    );

    const snapshot = readSnapshot();
    assert.equal(snapshot.dishes.length, 0);
    assert.equal(snapshot.wishlist[0].status, "pending_review");
  });

  it("fails for an unknown wish without creating a dish", async () => {
    await assert.rejects(
      () =>
        localApi.completeWish(
          "missing-wish",
          {
            title: "番茄牛腩煲",
            calories: null,
            ingredients: [],
            cover_image: null,
            rednote_url: null,
          },
          dishInput,
        ),
      /找不到这条心愿/,
    );

    assert.equal(readSnapshot().dishes.length, 0);
  });
});

describe("localApi legacy migration", () => {
  it("upgrades name/pending/approved rows written by older versions", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...emptySnapshot,
        wishlist: [
          {
            id: "old-pending",
            name: "麻辣香锅",
            note: "多加藕片",
            status: "pending",
            dish_id: null,
            created_at: "2025-12-01T00:00:00.000Z",
            approved_at: null,
          },
          {
            id: "old-approved",
            name: "糖醋排骨",
            note: null,
            status: "approved",
            dish_id: "dish-sweet-sour-ribs",
            created_at: "2025-12-02T00:00:00.000Z",
            approved_at: "2025-12-03T00:00:00.000Z",
          },
        ],
      }),
    );

    const { wishlist } = await localApi.load();

    assert.equal(wishlist.length, 2);
    assert.deepEqual(
      wishlist.map((wish) => ({
        id: wish.id,
        title: wish.title,
        status: wish.status,
        source: wish.source,
        rednote_url: wish.rednote_url,
        ingredients: wish.ingredients,
      })),
      [
        {
          id: "old-pending",
          title: "麻辣香锅",
          status: "pending_review",
          source: "manual",
          rednote_url: null,
          ingredients: [],
        },
        {
          id: "old-approved",
          title: "糖醋排骨",
          status: "ready",
          source: "manual",
          rednote_url: null,
          ingredients: [],
        },
      ],
    );
  });
});
