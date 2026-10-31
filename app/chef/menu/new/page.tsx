import type { Metadata } from "next";

import { DishForm } from "@/components/chef/DishForm";

export const metadata: Metadata = {
  title: "添加新菜",
};

export default function NewDishPage() {
  return <DishForm />;
}
