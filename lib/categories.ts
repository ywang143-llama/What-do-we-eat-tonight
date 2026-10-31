import type { Category } from "@/lib/types";

export interface CategoryMeta {
  id: Category;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  /** Static Tailwind classes — used for illustration tiles. */
  tile: string;
  chip: string;
  badge: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "staple",
    label: "主食",
    shortLabel: "主食",
    emoji: "🍚",
    description: "一碗热乎的，最踏实",
    tile: "from-[#FBE6C2] via-[#F7D7A3] to-[#EFC07C]",
    chip: "bg-[#FDF2DE] text-[#98672C] border-[#F2DCB8]",
    badge: "bg-[#FBF0DA] text-[#98672C]",
  },
  {
    id: "vegetable",
    label: "蔬菜",
    shortLabel: "蔬菜",
    emoji: "🥬",
    description: "绿油油的一盘，清爽解腻",
    tile: "from-[#E8F1DB] via-[#D6E7C4] to-[#BCD5A6]",
    chip: "bg-[#EFF6E6] text-[#5D7A4B] border-[#DCEBCD]",
    badge: "bg-[#EFF6E6] text-[#5D7A4B]",
  },
  {
    id: "meat",
    label: "肉类/禽类",
    shortLabel: "肉类",
    emoji: "🍗",
    description: "今晚的硬菜担当",
    tile: "from-[#FBE1D6] via-[#F5C7B5] to-[#E8A48C]",
    chip: "bg-[#FCEDE6] text-[#A65136] border-[#F4D8CA]",
    badge: "bg-[#FCEDE6] text-[#A65136]",
  },
  {
    id: "soup",
    label: "汤品/饮料",
    shortLabel: "汤饮",
    emoji: "🥣",
    description: "暖暖胃，慢慢喝",
    tile: "from-[#E4EFF0] via-[#CFE3E2] to-[#AED1CE]",
    chip: "bg-[#EDF5F4] text-[#4E7570] border-[#D7E8E5]",
    badge: "bg-[#EDF5F4] text-[#4E7570]",
  },
  {
    id: "snack",
    label: "小吃/甜品",
    shortLabel: "小吃",
    emoji: "🍮",
    description: "给今天加一点甜",
    tile: "from-[#FAE6E0] via-[#F4D3CA] to-[#EAB8AD]",
    chip: "bg-[#FBEEEA] text-[#A05B4A] border-[#F2DAD2]",
    badge: "bg-[#FBEEEA] text-[#A05B4A]",
  },
];

export const CATEGORY_MAP: Record<Category, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<Category, CategoryMeta>;

export const CATEGORY_EMOJI: Record<Category, string> = {
  staple: "🍚",
  vegetable: "🥬",
  meat: "🍗",
  soup: "🥣",
  snack: "🍮",
};

export function categoryLabel(category: Category): string {
  return CATEGORY_MAP[category]?.label ?? "其他";
}
