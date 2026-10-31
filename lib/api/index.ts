import { localApi } from "@/lib/api/local";
import { supabaseApi } from "@/lib/api/supabase";
import type { KitchenApi } from "@/lib/api/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export const kitchenApi: KitchenApi = isSupabaseConfigured
  ? supabaseApi
  : localApi;
