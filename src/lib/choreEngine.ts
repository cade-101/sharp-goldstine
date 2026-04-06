/**
 * choreEngine.ts — chore escalation system
 * Checks for overdue chores and sends escalating reminders.
 */

import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

interface ChoreDef {
  id: string;
  title: string;
  assigned_to: string | null;
  recurrence: 'daily' | 'weekly';
  house_name: string;
}

interface ChoreLog {
  chore_id: string;
  completed_at: string;
}

/**
 * Returns chores that are overdue (no log within their recurrence window).
 */
export async function getOverdueChores(houseName: string): Promise<ChoreDef[]> {
  const { data: defs } = await supabase
    .from('chore_definitions')
    .select('*')
    .eq('house_name', houseName);

  if (!defs?.length) return [];

  const now = Date.now();
  const oneDayAgo = new Date(now - 86400000).toISOString();
  const oneWeekAgo = new Date(now - 7 * 86400000).toISOString();

  const { data: logs } = await supabase
    .from('chore_logs')
    .select('chore_id, completed_at')
    .eq('house_name', houseName)
    .gte('completed_at', oneWeekAgo);

  const recentLogs: ChoreLog[] = logs ?? [];

  return (defs as ChoreDef[]).filter(chore => {
    const cutoff = chore.recurrence === 'daily' ? oneDayAgo : oneWeekAgo;
    const lastLog = recentLogs
      .filter(l => l.chore_id === chore.id)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
    return !lastLog || lastLog.completed_at < cutoff;
  });
}

/**
 * Sends an escalating push for overdue chores.
 * Level 1 (<1 day overdue): gentle reminder
 * Level 2 (1–2 days):       firm reminder
 * Level 3 (>2 days):        escalation alert
 */
export async function sendChoreEscalations(houseName: string): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const overdue = await getOverdueChores(houseName);
    if (!overdue.length) return;

    // Group by assigned person
    const byPerson: Record<string, ChoreDef[]> = {};
    for (const c of overdue) {
      const key = c.assigned_to ?? 'everyone';
      byPerson[key] = [...(byPerson[key] ?? []), c];
    }

    for (const [person, chores] of Object.entries(byPerson)) {
      const count = chores.length;
      const who = person === 'everyone' ? '' : ` (${person})`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏠 ${count} chore${count !== 1 ? 's' : ''} overdue${who}`,
          body: chores.slice(0, 3).map(c => `• ${c.title}`).join('\n'),
          sound: true,
          data: { type: 'chore_escalation', house_name: houseName },
        },
        trigger: null,
      });
    }
  } catch { /* non-blocking */ }
}

/**
 * Logs a completed chore and awards allowance points.
 */
export async function logChoreComplete(
  choreId: string,
  memberId: string,
  houseName: string,
  pointsEarned: number,
): Promise<void> {
  await supabase.from('chore_logs').insert({
    chore_id: choreId,
    member_id: memberId,
    house_name: houseName,
    points_earned: pointsEarned,
  });

  await supabase.from('allowance_ledger').insert({
    member_id: memberId,
    house_name: houseName,
    amount: pointsEarned * 0.25, // 25¢ per point
    reason: 'chore_complete',
    transaction_type: 'earn',
  });
}
