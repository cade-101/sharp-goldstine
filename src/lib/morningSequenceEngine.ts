import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

interface MorningStep {
  label: string;
  minutes: number;
}

/**
 * Schedules a morning sequence as a series of push notifications,
 * each firing `minutes` after the previous one.
 * Clears any previously scheduled morning sequence notifications first.
 */
export async function scheduleMorningSequence(
  houseName: string,
  wakeTimeHour: number,   // e.g. 6 for 6:00am
  wakeTimeMinute: number, // e.g. 30 for 6:30am
): Promise<void> {
  try {
    // Load the household's morning sequence
    const { data: seq } = await supabase
      .from('morning_sequences')
      .select('steps, total_minutes')
      .eq('house_name', houseName)
      .eq('active', true)
      .maybeSingle();

    if (!seq?.steps?.length) return;

    const steps: MorningStep[] = seq.steps;

    // Cancel any previously scheduled morning sequence notifs
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((n.content.data as any)?.morning_sequence === true) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // Schedule each step, offset from wake time
    let offsetMinutes = 0;
    for (const step of steps) {
      const triggerDate = new Date();
      triggerDate.setHours(wakeTimeHour, wakeTimeMinute + offsetMinutes, 0, 0);

      // If trigger is in the past for today, push to tomorrow
      if (triggerDate.getTime() < Date.now()) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏱ ${step.label}`,
          body: `${step.minutes} min`,
          sound: true,
          data: { morning_sequence: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          repeats: false,
        } as any,
      });

      offsetMinutes += step.minutes;
    }
  } catch { /* non-blocking */ }
}

/**
 * Cancels all scheduled morning sequence notifications.
 */
export async function cancelMorningSequence(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((n.content.data as any)?.morning_sequence === true) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch { /* non-blocking */ }
}
