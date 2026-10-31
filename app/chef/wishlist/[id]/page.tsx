import type { Metadata } from "next";

import { DishForm } from "@/components/chef/DishForm";

export const metadata: Metadata = {
  title: "把心愿做成菜",
};

export default async function ConvertWishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DishForm wishlistId={id} />;
}
