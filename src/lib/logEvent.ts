import { supabase } from './supabase';

export type EventType =
  | 'brain_state_set'
  | 'workout_start'
  | 'pr_hit'
  | 'blitz_start'
  | 'blitz_complete'
  | 'intel_drop'
  | 'intel_text'
  | 'signal_sent'
  | 'envelope_open'
  | 'supply_run_add'
  | 'drink_logged'
  | 'water_logged'
  | 'grounding_session'
  | 'nightmare_event'
  | 'meal_logged';

export async function logEvent(
  userId: string,
  eventType: EventType,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from('user_events').insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking — analytics should never break UX
  }
}
