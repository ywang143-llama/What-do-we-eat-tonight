import type {
  DishInput,
  ItemStatus,
  KitchenSnapshot,
  RatingInput,
} from "@/lib/types";

export interface KitchenApi {
  mode: "local" | "supabase";
  load(): Promise<KitchenSnapshot>;
  addToOrder(dishId: string): Promise<void>;
  removeOrderItem(itemId: string): Promise<void>;
  saveOrderNote(orderId: string, note: string): Promise<void>;
  submitOrder(orderId: string): Promise<void>;
  setItemStatus(itemId: string, status: ItemStatus): Promise<void>;
  completeOrder(orderId: string): Promise<void>;
  saveDish(input: DishInput, id?: string): Promise<string>;
  setDishActive(id: string, active: boolean): Promise<void>;
  addWish(name: string, note: string): Promise<void>;
  approveWish(wishId: string, dishId: string): Promise<void>;
  deleteWish(wishId: string): Promise<void>;
  saveRating(input: RatingInput): Promise<void>;
  uploadImage(blob: Blob): Promise<string>;
  resetLocalData(): Promise<void>;
}
