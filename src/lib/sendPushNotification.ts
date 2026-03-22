import { supabase } from './supabase';

/**
 * Fetch the partner's push token from user_profiles and fire an Expo push notification.
 * Silent fail — if no token or network error, nothing breaks.
 */
export async function sendPushNotification(
  toUserId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('push_token')
      .eq('id', toUserId)
      .single();

    const token = profile?.push_token;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default' }),
    });
  } catch {
    // Silent fail — notifications are nice-to-have
  }
}
