import type {
  DishInput,
  ItemStatus,
  KitchenSnapshot,
  RatingInput,
  SharedWishInput,
  WishRecipeInput,
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
  addWish(title: string, note: string): Promise<void>;
  /** Store a RedNote share as a `pending_review` wish from the inbox. */
  addSharedWish(input: SharedWishInput): Promise<void>;
  markWishReady(wishId: string, dishId: string): Promise<void>;
  /** Save the reviewed recipe on the wish and create the dish in one go. */
  completeWish(
    wishId: string,
    patch: WishRecipeInput,
    dish: DishInput,
  ): Promise<string>;
  deleteWish(wishId: string): Promise<void>;
  saveRating(input: RatingInput): Promise<void>;
  uploadImage(blob: Blob): Promise<string>;
  resetLocalData(): Promise<void>;
}
