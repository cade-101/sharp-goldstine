import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Notification category for clarifying unknown e-transfers
export const CLARIFY_CATEGORY = 'clarify_transfer';

// Common envelope options shown as quick-action buttons
const ENVELOPE_ACTIONS = [
  { identifier: 'mortgage',  buttonTitle: '🏠 MORTGAGE' },
  { identifier: 'groceries', buttonTitle: '🛒 GROCERIES' },
  { identifier: 'fuel',      buttonTitle: '⛽ FUEL' },
  { identifier: 'kids_andy', buttonTitle: '👶 KIDS' },
  { identifier: 'overflow',  buttonTitle: '📦 OTHER' },
  { identifier: 'skip',      buttonTitle: 'SKIP' },
];

export async function setupClarifyCategory() {
  try {
    await Notifications.setNotificationCategoryAsync(CLARIFY_CATEGORY, ENVELOPE_ACTIONS);
  } catch {
    // Not supported on this device/platform
  }
}

export async function checkAndSendPendingClarifications(userId: string) {
  if (!userId) return;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: pending } = await supabase
    .from('armory_clarifications')
    .select('id, transaction_name, amount, date, prompt_count')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('answered', false)
    .or(`prompt_count.eq.0,last_prompted_at.lt.${twentyFourHoursAgo}`)
    .order('created_at', { ascending: true })
    .limit(3);

  if (!pending?.length) return;

  for (const clarification of pending) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❓ WHERE DID THIS GO?',
          body: `${clarification.transaction_name} — $${Math.abs(clarification.amount).toFixed(2)}. What envelope?`,
          data: { clarificationId: clarification.id, type: 'clarify_transfer' },
          categoryIdentifier: CLARIFY_CATEGORY,
        },
        trigger: null, // Fire immediately
      });

      // Mark as prompted
      await supabase
        .from('armory_clarifications')
        .update({
          prompt_count: (clarification.prompt_count ?? 0) + 1,
          last_prompted_at: new Date().toISOString(),
        })
        .eq('id', clarification.id);
    } catch {
      // Notification scheduling failed — not fatal
    }
  }
}

/**
 * Returns true when the current time is in a grounding-friendly window:
 * evening (8pm–midnight) or early morning (midnight–9am).
 * These are the highest-risk periods for anxiety/overwhelm spirals.
 */
export function isInGroundingWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 9;
}

// Called when user taps a notification action button
export async function resolveClarification(clarificationId: string, envelopeId: string) {
  if (envelopeId === 'skip') return;

  // Update clarification status
  await supabase
    .from('armory_clarifications')
    .update({
      status: 'resolved',
      answered: true,
      answer: envelopeId,
      resolved_envelope_id: envelopeId,
    })
    .eq('id', clarificationId);

  // Re-categorize the budget_expense that was filed as 'pending'
  const { data: clarifRow } = await supabase
    .from('armory_clarifications')
    .select('transaction_name, amount, date')
    .eq('id', clarificationId)
    .maybeSingle();

  if (clarifRow) {
    await supabase
      .from('budget_expenses')
      .update({ envelope_id: envelopeId })
      .eq('envelope_id', 'pending')
      .eq('note', clarifRow.transaction_name)
      .eq('amount', clarifRow.amount);
  }
}
