"use server";

import { revalidatePath } from "next/cache";

export async function revalidateTransactionPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/savings");
}
