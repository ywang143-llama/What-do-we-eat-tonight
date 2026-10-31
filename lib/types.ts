export type Role = "diner" | "chef";

export type Category = "staple" | "vegetable" | "meat" | "soup" | "snack";

export type ItemStatus = "pending" | "preparing" | "served";

export type OrderStatus = "draft" | "submitted" | "completed";

export type WishStatus = "pending" | "approved";

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
  name: string;
  note: string | null;
  status: WishStatus;
  dish_id: string | null;
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
