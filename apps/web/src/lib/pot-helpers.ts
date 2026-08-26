import { prisma } from "@/lib/prisma";

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Budget period to stamp on the pot entry (the open period when the deposit/withdrawal happens). */
export interface PotEntryPeriod {
  budgetMonth: number;
  budgetYear: number;
}

/** Credit `amount` (in `currencyId`'s smallest unit) into a pot's balance for that currency. */
export async function creditPot(
  tx: PrismaTx,
  potId: string,
  amount: number,
  currencyId: string,
  description: string,
  sourceType = "MANUAL",
  period?: PotEntryPeriod,
): Promise<void> {
  await tx.savingsPotBalance.upsert({
    where: { potId_currencyId: { potId, currencyId } },
    create: { potId, currencyId, amount },
    update: { amount: { increment: amount } },
  });
  await tx.savingsPotEntry.create({
    data: {
      potId,
      amount,
      currencyId,
      sourceType,
      description,
      budgetMonth: period?.budgetMonth ?? null,
      budgetYear: period?.budgetYear ?? null,
    },
  });
}

/** Debit `amount` (in `currencyId`'s smallest unit) from a pot's balance for that currency. */
export async function debitPot(
  tx: PrismaTx,
  potId: string,
  amount: number,
  currencyId: string,
  description: string,
  sourceType = "MANUAL",
  period?: PotEntryPeriod,
): Promise<void> {
  await tx.savingsPotBalance.upsert({
    where: { potId_currencyId: { potId, currencyId } },
    create: { potId, currencyId, amount: -amount },
    update: { amount: { decrement: amount } },
  });
  await tx.savingsPotEntry.create({
    data: {
      potId,
      amount: -amount,
      currencyId,
      sourceType,
      description,
      budgetMonth: period?.budgetMonth ?? null,
      budgetYear: period?.budgetYear ?? null,
    },
  });
}
