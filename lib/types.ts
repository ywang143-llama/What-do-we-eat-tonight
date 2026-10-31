export type Role = "diner" | "chef";

export type Category = "staple" | "vegetable" | "meat" | "soup" | "snack";

export type ItemStatus = "pending" | "preparing" | "served";

export type OrderStatus = "draft" | "submitted" | "completed";

/**
 * `pending_review` — waiting in the chef's wish queue (written in-app or
 * shared from RedNote). `ready` — turned into a real dish.
 */
export type WishStatus = "pending_review" | "ready";

/** `manual` came from the diner's wishlist form, `share` from the share sheet. */
export type WishSource = "manual" | "share";

export interface Dish {
  id: string;
  name: string;
  category: Category;
  calories: number;
  emoji: string | null;
  image_url: string | null;
  recipe_steps: string[];
  recipe_link: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  status: ItemStatus;
  created_at: string;
}

export interface Order {
  id: string;
  order_date: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  items: OrderItem[];
}

export interface Rating {
  id: string;
  order_id: string;
  dish_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Wish {
  id: string;
  title: string;
  note: string | null;
  status: WishStatus;
  source: WishSource;
  dish_id: string | null;
  calories: number | null;
  ingredients: string[];
  cover_image: string | null;
  rednote_url: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface KitchenSnapshot {
  dishes: Dish[];
  orders: Order[];
  ratings: Rating[];
  wishlist: Wish[];
}

export interface DishInput {
  name: string;
  category: Category;
  calories: number;
  emoji: string;
  image_url: string | null;
  recipe_steps: string[];
  recipe_link: string | null;
  is_active: boolean;
}

export interface RatingInput {
  orderId: string;
  dishId: string;
  rating: number;
  comment: string;
}

/** A wish that arrived through the Web Share Target (`/import`). */
export interface SharedWishInput {
  title: string;
  rednote_url: string | null;
  note: string | null;
}

/** The recipe details the chef fills in before a wish becomes a dish. */
export interface WishRecipeInput {
  title: string;
  calories: number | null;
  ingredients: string[];
  cover_image: string | null;
  rednote_url: string | null;
}
