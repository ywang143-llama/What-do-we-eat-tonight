import type { Metadata } from "next";

import { DishForm } from "@/components/chef/DishForm";

export const metadata: Metadata = {
  title: "编辑菜谱",
};

export default async function EditDishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DishForm dishId={id} />;
}
