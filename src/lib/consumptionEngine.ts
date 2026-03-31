import { supabase } from './supabase';

// How many days until a pantry item is "running low" based on category defaults
const CATEGORY_LIFESPAN_DAYS: Record<string, number> = {
  produce: 5,
  dairy: 7,
  meat: 3,
  meat_frozen: 60,
  frozen: 30,
  pantry_dry: 60,
  beverages: 14,
  condiments: 90,
  snacks: 10,
  household: 30,
  kids_item: 14,
  personal_care: 30,
  bakery: 5,
};

const LOW_THRESHOLD_FRACTION = 0.25; // flag "running low" when estimated < 25% remains

export type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  purchased_at: string;
  estimated_empty_at: string | null;
  added_via: string | null;
};

// Estimate when an item will run out based on purchase history avg interval
export async function getEstimatedEmptyDate(
  householdId: string,
  itemName: string,
  category: string,
): Promise<Date> {
  const { data: pref } = await supabase
    .from('household_item_preferences')
    .select('avg_purchase_interval_days, last_purchased_at')
    .eq('household_id', householdId)
    .ilike('item_name', itemName)
    .limit(1)
    .maybeSingle();

  const intervalDays = pref?.avg_purchase_interval_days
    ?? CATEGORY_LIFESPAN_DAYS[category]
    ?? 14;

  const base = pref?.last_purchased_at ? new Date(pref.last_purchased_at) : new Date();
  return new Date(base.getTime() + intervalDays * 86400000);
}

// Update estimated_empty_at for all pantry items without one
export async function refreshEstimates(householdId: string) {
  const { data: items } = await supabase
    .from('pantry_items')
    .select('id, name, category, purchased_at, estimated_empty_at')
    .eq('household_id', householdId)
    .is('estimated_empty_at', null);

  if (!items?.length) return;

  for (const item of items) {
    const emptyAt = await getEstimatedEmptyDate(householdId, item.name, item.category);
    await supabase
      .from('pantry_items')
      .update({ estimated_empty_at: emptyAt.toISOString() })
      .eq('id', item.id);
  }
}

// Get items that are running low (estimated empty within next N days)
export async function getRunningLow(
  householdId: string,
  withinDays = 5,
): Promise<PantryItem[]> {
  const cutoff = new Date(Date.now() + withinDays * 86400000).toISOString();

  const { data } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('household_id', householdId)
    .lte('estimated_empty_at', cutoff)
    .order('estimated_empty_at', { ascending: true });

  return (data ?? []) as PantryItem[];
}

// Called when an item is consumed/used — decrements quantity and recalculates empty date
export async function markConsumed(itemId: string, amountUsed = 1) {
  const { data: item } = await supabase
    .from('pantry_items')
    .select('id, household_id, name, category, quantity, unit')
    .eq('id', itemId)
    .maybeSingle();

  if (!item) return;

  const newQty = Math.max(0, (item.quantity ?? 1) - amountUsed);

  if (newQty === 0) {
    // Remove from pantry — it's gone
    await supabase.from('pantry_items').delete().eq('id', itemId);
    return;
  }

  // Update qty + recalculate estimated_empty_at proportionally
  const { data: pref } = await supabase
    .from('household_item_preferences')
    .select('avg_purchase_interval_days')
    .eq('household_id', item.household_id)
    .ilike('item_name', item.name)
    .limit(1)
    .maybeSingle();

  const totalDays = pref?.avg_purchase_interval_days ?? CATEGORY_LIFESPAN_DAYS[item.category] ?? 14;
  const daysLeft = Math.round((newQty / (item.quantity ?? 1)) * totalDays);
  const newEmptyAt = new Date(Date.now() + daysLeft * 86400000).toISOString();

  await supabase.from('pantry_items').update({
    quantity: newQty,
    estimated_empty_at: newEmptyAt,
  }).eq('id', itemId);
}

// Update consumption pattern after each purchase (called by Intel)
export async function updateConsumptionPattern(
  householdId: string,
  itemName: string,
  category: string,
) {
  const emptyAt = await getEstimatedEmptyDate(householdId, itemName, category);

  // Update the pantry item's estimated_empty_at
  await supabase
    .from('pantry_items')
    .update({ estimated_empty_at: emptyAt.toISOString() })
    .eq('household_id', householdId)
    .ilike('name', itemName);
}

// Get all pantry items grouped by location
export async function getPantryByLocation(householdId: string): Promise<Record<string, PantryItem[]>> {
  const { data } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('household_id', householdId)
    .order('name', { ascending: true });

  const grouped: Record<string, PantryItem[]> = {
    fridge: [],
    freezer: [],
    pantry: [],
    household: [],
    kids: [],
  };

  for (const item of (data ?? []) as PantryItem[]) {
    const loc = item.location ?? 'pantry';
    if (!grouped[loc]) grouped[loc] = [];
    grouped[loc].push(item);
  }

  return grouped;
}

// Days until estimated empty (negative = already past due)
export function daysUntilEmpty(item: PantryItem): number | null {
  if (!item.estimated_empty_at) return null;
  return Math.round((new Date(item.estimated_empty_at).getTime() - Date.now()) / 86400000);
}

export function getStatusColor(item: PantryItem): string {
  const days = daysUntilEmpty(item);
  if (days === null) return '#6b7280'; // gray — unknown
  if (days <= 0) return '#ef4444';    // red — empty/past due
  if (days <= 2) return '#f97316';    // orange — critical
  if (days <= 5) return '#eab308';    // yellow — low
  return '#22c55e';                    // green — good
}
