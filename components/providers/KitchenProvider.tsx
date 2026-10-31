"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { kitchenApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type {
  Dish,
  DishInput,
  ItemStatus,
  KitchenSnapshot,
  Order,
  Rating,
  RatingInput,
  Role,
  Wish,
} from "@/lib/types";
import {
  compressImage,
  createId,
  errorMessage,
  todayISO,
} from "@/lib/utils";

const ROLE_KEY = "tonights-kitchen:role";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface KitchenContextValue {
  ready: boolean;
  busy: boolean;
  error: string | null;
  mode: "local" | "supabase";
  dishes: Dish[];
  orders: Order[];
  ratings: Rating[];
  wishlist: Wish[];
  role: Role | null;
  roleReady: boolean;
  tonight: Order | null;
  pastOrders: Order[];
  toasts: Toast[];
  setRole: (role: Role) => void;
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  refresh: () => Promise<void>;
  getDish: (id: string) => Dish | null;
  getRating: (orderId: string, dishId: string) => Rating | null;
  addToOrder: (dishId: string) => Promise<boolean>;
  removeOrderItem: (itemId: string) => Promise<boolean>;
  saveOrderNote: (orderId: string, note: string) => Promise<boolean>;
  submitOrder: (orderId: string) => Promise<boolean>;
  setItemStatus: (itemId: string, status: ItemStatus) => Promise<boolean>;
  markAllServed: (order: Order) => Promise<boolean>;
  completeOrder: (orderId: string) => Promise<boolean>;
  saveDish: (
    input: DishInput,
    id?: string,
    wishlistId?: string,
  ) => Promise<string | null>;
  setDishActive: (id: string, active: boolean) => Promise<boolean>;
  addWish: (name: string, note: string) => Promise<boolean>;
  approveWish: (wishId: string, dishId: string) => Promise<boolean>;
  deleteWish: (wishId: string) => Promise<boolean>;
  saveRating: (input: RatingInput) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string>;
  resetDemoData: () => Promise<boolean>;
}

const KitchenContext = createContext<KitchenContextValue | null>(null);

function emptySnapshot(): KitchenSnapshot {
  return { dishes: [], orders: [], ratings: [], wishlist: [] };
}

export function KitchenProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<KitchenSnapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);
  const [busyCount, setBusyCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [role, setRoleState] = useState<Role | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const loadedOnce = useRef(false);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const toast: Toast = { id: createId("toast"), message, tone };
    // One snackbar at a time keeps rapid taps from burying the page header.
    setToasts([toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await kitchenApi.load();
      setSnapshot(data);
      setError(null);
    } catch (loadError) {
      const message = errorMessage(loadError);
      setError(message);
      if (loadedOnce.current) notify(message, "error");
    } finally {
      loadedOnce.current = true;
      setReady(true);
    }
  }, [notify]);

  const refreshSilently = useCallback(async () => {
    try {
      const data = await kitchenApi.load();
      setSnapshot(data);
      setError(null);
    } catch {
      // Background refreshes stay quiet; the next explicit action will surface errors.
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ROLE_KEY);
      if (stored === "diner" || stored === "chef") setRoleState(stored);
    } catch {
      // Private mode may block localStorage; the app still works for this visit.
    }
    setRoleReady(true);

    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (kitchenApi.mode === "local") {
      const onStorage = (event: StorageEvent) => {
        if (event.key === "tonights-kitchen:v1") void refreshSilently();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    if (!supabase) return;
    const client = supabase;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refreshSilently(), 300);
    };

    const channel = client.channel("tonights-kitchen-sync");
    let realtime = channel;
    for (const table of [
      "dishes",
      "orders",
      "order_items",
      "ratings",
      "wishlist",
    ]) {
      realtime = realtime.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        schedule,
      );
    }
    realtime.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", schedule);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", schedule);
      void client.removeChannel(realtime);
    };
  }, [refreshSilently]);

  const setRole = useCallback((nextRole: Role) => {
    setRoleState(nextRole);
    try {
      window.localStorage.setItem(ROLE_KEY, nextRole);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      successMessage?: string,
    ): Promise<boolean> => {
      setBusyCount((count) => count + 1);
      try {
        await action();
        await refreshSilently();
        if (successMessage) notify(successMessage, "success");
        return true;
      } catch (actionError) {
        notify(errorMessage(actionError), "error");
        return false;
      } finally {
        setBusyCount((count) => Math.max(0, count - 1));
      }
    },
    [notify, refreshSilently],
  );

  const addToOrder = useCallback(
    (dishId: string) =>
      run(() => kitchenApi.addToOrder(dishId), "已加入今晚菜单"),
    [run],
  );

  const removeOrderItem = useCallback(
    (itemId: string) =>
      run(() => kitchenApi.removeOrderItem(itemId), "已从菜单移除"),
    [run],
  );

  const saveOrderNote = useCallback(
    (orderId: string, note: string) =>
      run(() => kitchenApi.saveOrderNote(orderId, note)),
    [run],
  );

  const submitOrder = useCallback(
    (orderId: string) =>
      run(() => kitchenApi.submitOrder(orderId), "菜单已送到大厨那里 🍳"),
    [run],
  );

  const setItemStatus = useCallback(
    (itemId: string, status: ItemStatus) =>
      run(() => kitchenApi.setItemStatus(itemId, status)),
    [run],
  );

  const markAllServed = useCallback(
    (order: Order) =>
      run(
        () =>
          Promise.all(
            order.items.map((item) =>
              kitchenApi.setItemStatus(item.id, "served"),
            ),
          ),
        "全部上菜啦",
      ),
    [run],
  );

  const completeOrder = useCallback(
    (orderId: string) =>
      run(() => kitchenApi.completeOrder(orderId), "今晚辛苦啦，收工！"),
    [run],
  );

  const saveDish = useCallback(
    async (
      input: DishInput,
      id?: string,
      wishlistId?: string,
    ): Promise<string | null> => {
      setBusyCount((count) => count + 1);
      try {
        const dishId = await kitchenApi.saveDish(input, id);
        if (wishlistId) await kitchenApi.approveWish(wishlistId, dishId);
        await refreshSilently();
        notify(id ? "菜谱已更新" : "新菜已上架 🎉", "success");
        return dishId;
      } catch (saveError) {
        notify(errorMessage(saveError), "error");
        return null;
      } finally {
        setBusyCount((count) => Math.max(0, count - 1));
      }
    },
    [notify, refreshSilently],
  );

  const setDishActive = useCallback(
    (id: string, active: boolean) =>
      run(
        () => kitchenApi.setDishActive(id, active),
        active ? "已重新上架" : "已从菜单下架",
      ),
    [run],
  );

  const addWish = useCallback(
    (name: string, note: string) =>
      run(() => kitchenApi.addWish(name, note), "心愿已经记下啦"),
    [run],
  );

  const approveWish = useCallback(
    (wishId: string, dishId: string) =>
      run(() => kitchenApi.approveWish(wishId, dishId), "心愿已加入菜单"),
    [run],
  );

  const deleteWish = useCallback(
    (wishId: string) => run(() => kitchenApi.deleteWish(wishId)),
    [run],
  );

  const saveRating = useCallback(
    (input: RatingInput) =>
      run(() => kitchenApi.saveRating(input), "谢谢你的评价 💛"),
    [run],
  );

  const uploadImage = useCallback(async (file: File) => {
    const blob = await compressImage(file);
    return kitchenApi.uploadImage(blob);
  }, []);

  const resetDemoData = useCallback(async () => {
    if (kitchenApi.mode !== "local") {
      notify("云端数据不支持一键重置", "error");
      return false;
    }
    return run(() => kitchenApi.resetLocalData(), "演示数据已重置");
  }, [notify, run]);

  const tonight = useMemo(() => {
    const today = todayISO();
    return (
      snapshot.orders
        .filter(
          (order) => order.order_date === today && order.status !== "completed",
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    );
  }, [snapshot.orders]);

  const pastOrders = useMemo(
    () =>
      snapshot.orders
        .filter((order) => order.status === "completed")
        .sort((a, b) =>
          (b.completed_at ?? b.order_date).localeCompare(
            a.completed_at ?? a.order_date,
          ),
        ),
    [snapshot.orders],
  );

  const getDish = useCallback(
    (id: string) => snapshot.dishes.find((dish) => dish.id === id) ?? null,
    [snapshot.dishes],
  );

  const getRating = useCallback(
    (orderId: string, dishId: string) =>
      snapshot.ratings.find(
        (rating) =>
          rating.order_id === orderId && rating.dish_id === dishId,
      ) ?? null,
    [snapshot.ratings],
  );

  const value = useMemo<KitchenContextValue>(
    () => ({
      ready,
      busy: busyCount > 0,
      error,
      mode: kitchenApi.mode,
      dishes: snapshot.dishes,
      orders: snapshot.orders,
      ratings: snapshot.ratings,
      wishlist: snapshot.wishlist,
      role,
      roleReady,
      tonight,
      pastOrders,
      toasts,
      setRole,
      notify,
      dismissToast,
      refresh,
      getDish,
      getRating,
      addToOrder,
      removeOrderItem,
      saveOrderNote,
      submitOrder,
      setItemStatus,
      markAllServed,
      completeOrder,
      saveDish,
      setDishActive,
      addWish,
      approveWish,
      deleteWish,
      saveRating,
      uploadImage,
      resetDemoData,
    }),
    [
      ready,
      busyCount,
      error,
      snapshot,
      role,
      roleReady,
      tonight,
      pastOrders,
      toasts,
      setRole,
      notify,
      dismissToast,
      refresh,
      getDish,
      getRating,
      addToOrder,
      removeOrderItem,
      saveOrderNote,
      submitOrder,
      setItemStatus,
      markAllServed,
      completeOrder,
      saveDish,
      setDishActive,
      addWish,
      approveWish,
      deleteWish,
      saveRating,
      uploadImage,
      resetDemoData,
    ],
  );

  return (
    <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
  );
}

export function useKitchen(): KitchenContextValue {
  const context = useContext(KitchenContext);
  if (!context) {
    throw new Error("useKitchen must be used inside <KitchenProvider>");
  }
  return context;
}
