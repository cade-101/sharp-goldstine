export interface PurchasePattern {
  itemName: string;
  usualStore: string;
  avgIntervalDays: number;
  lastPurchasedAt: Date;
}

export interface FlyerDeal {
  id: string;
  store: string;
  itemName: string;
  salePricePct: number; // discount as a percentage
  salePrice: number;
  regularPrice: number;
  validTo: Date;
}

export interface BudgetContext {
  envelopeBalance: number;
  upcomingBillsTotal: number;
  daysUntilPayday: number;
}

export interface NudgeResult {
  nudge: boolean;
  reason: string;
  deal: FlyerDeal;
  pattern: PurchasePattern;
}

export function shouldNudge(params: {
  pattern: PurchasePattern;
  deal: FlyerDeal;
  budget: BudgetContext;
}): NudgeResult {
  const { pattern, deal, budget } = params;

  const daysSinceLastPurchase = Math.floor(
    (Date.now() - pattern.lastPurchasedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysUntilDue = pattern.avgIntervalDays - daysSinceLastPurchase;
  const isDueSoon = daysUntilDue >= -3 && daysUntilDue <= 7;
  const isBigDiscount = deal.salePricePct >= 30;
  const isUsualStore = deal.store.toLowerCase() === pattern.usualStore.toLowerCase();
  const hasBudgetRoom = budget.envelopeBalance > budget.upcomingBillsTotal * 1.2;

  const base = { deal, pattern };

  if (isDueSoon && isBigDiscount && hasBudgetRoom) {
    const storeNote = isUsualStore
      ? `at your usual store (${deal.store})`
      : `at ${deal.store} — not your usual spot but worth it`;
    return {
      ...base,
      nudge: true,
      reason: `${deal.salePricePct}% off ${storeNote}. Due in ~${Math.max(0, daysUntilDue)} days and budget looks fine.`,
    };
  }

  // Big discount even if not due — flag if budget has significant room
  if (isBigDiscount && deal.salePricePct >= 40 && hasBudgetRoom) {
    return {
      ...base,
      nudge: true,
      reason: `${deal.salePricePct}% off — worth stocking up even if you're not out yet.`,
    };
  }

  return { ...base, nudge: false, reason: '' };
}

/** Run the full nudge pass for a household. Returns nudges that should be shown. */
export function computeNudges(
  patterns: PurchasePattern[],
  deals: FlyerDeal[],
  budget: BudgetContext
): NudgeResult[] {
  const results: NudgeResult[] = [];

  for (const deal of deals) {
    const match = patterns.find(
      p => p.itemName.toLowerCase() === deal.itemName.toLowerCase()
    );
    if (!match) continue;
    const result = shouldNudge({ pattern: match, deal, budget });
    if (result.nudge) results.push(result);
  }

  // Sort by discount desc
  return results.sort((a, b) => b.deal.salePricePct - a.deal.salePricePct);
}
