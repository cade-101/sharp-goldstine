import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

/**
 * Returns true if the user is currently in a grounding session (within last 35 minutes).
 * Used by noseyEngine to avoid interrupting active grounding.
 */
export async function isInGroundingWindow(userId: string): Promise<boolean> {
  const thirtyFiveMinutesAgo = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('grounding_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', thirtyFiveMinutesAgo)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

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

      // Also enqueue as a nosey question with the two most likely envelope options
      // Inline insert to avoid circular dependency (noseyEngine imports from this file)
      await supabase.from('nosey_questions_queue').insert({
        user_id: userId,
        priority: 8,
        question_type: 'clarification',
        question_text: `${clarification.transaction_name} — $${Math.abs(clarification.amount).toFixed(2)}. Which envelope?`,
        option_a: 'groceries',
        option_b: 'overflow',
        allow_custom: true,
        context: { transaction_name: clarification.transaction_name, amount: clarification.amount },
        linked_clarification_id: clarification.id,
        status: 'pending',
      }).then(() => {}, () => {});
    } catch {
      // Notification scheduling failed — not fatal
    }
  }
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
