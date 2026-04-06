/**
 * emailEngine.ts — privacy-first email scanning
 * Reads SUBJECT + SNIPPET only. Never fetches full email body.
 * Uses Claude Haiku to categorize into: bill, appointment, school, action, info, ignore
 */

import { supabase } from './supabase';
import { ANTHROPIC_API_KEY } from './config';

export type EmailCategory = 'bill' | 'appointment' | 'school' | 'action' | 'info' | 'ignore';
export type EmailImportance = 'high' | 'normal' | 'low';

export interface RawEmailItem {
  subject: string;
  snippet: string;
  received_at: string;
}

export interface CategorizedEmail {
  subject: string;
  snippet: string;
  category: EmailCategory;
  importance: EmailImportance;
  received_at: string;
}

// ── GMAIL ─────────────────────────────────────────────────────────────────────

export async function fetchGmailInbox(
  accessToken: string,
  maxResults = 20,
): Promise<RawEmailItem[]> {
  const listResp = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listResp.ok) throw new Error('Gmail list failed');
  const listData = await listResp.json();
  const ids: string[] = (listData.messages ?? []).map((m: any) => m.id);

  const items: RawEmailItem[] = [];
  for (const id of ids.slice(0, 10)) {
    try {
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!msgResp.ok) continue;
      const msg = await msgResp.json();
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)';
      const snippet = msg.snippet ?? '';
      const date = headers.find(h => h.name === 'Date')?.value ?? new Date().toISOString();
      items.push({ subject, snippet: snippet.slice(0, 200), received_at: date });
    } catch { /* skip malformed */ }
  }
  return items;
}

// ── OUTLOOK ───────────────────────────────────────────────────────────────────

export async function fetchOutlookInbox(
  accessToken: string,
  maxResults = 20,
): Promise<RawEmailItem[]> {
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$select=subject,bodyPreview,receivedDateTime&$orderby=receivedDateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!resp.ok) throw new Error('Outlook fetch failed');
  const data = await resp.json();
  return (data.value ?? []).map((m: any) => ({
    subject: m.subject ?? '(no subject)',
    snippet: (m.bodyPreview ?? '').slice(0, 200),
    received_at: m.receivedDateTime ?? new Date().toISOString(),
  }));
}

// ── AI CATEGORIZATION ─────────────────────────────────────────────────────────

export async function categorizeEmails(items: RawEmailItem[]): Promise<CategorizedEmail[]> {
  if (!items.length) return [];

  const prompt = items.map((e, i) =>
    `${i + 1}. Subject: "${e.subject}" | Snippet: "${e.snippet}"`
  ).join('\n');

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `Categorize emails from subject+snippet only.
Categories: bill (payment/invoice), appointment (medical/meeting), school (kids school), action (requires response), info (newsletter/update), ignore (spam/promo).
Importance: high, normal, low.
Return JSON array only: [{"index": 1, "category": "bill", "importance": "high"}, ...]`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    const raw = (data.content?.[0]?.text ?? '[]').replace(/```json|```/g, '').trim();
    const parsed: { index: number; category: EmailCategory; importance: EmailImportance }[] = JSON.parse(raw);
    return items.map((e, i) => {
      const cat = parsed.find(p => p.index === i + 1);
      return {
        ...e,
        category: cat?.category ?? 'info',
        importance: cat?.importance ?? 'normal',
      };
    });
  } catch {
    return items.map(e => ({ ...e, category: 'info' as EmailCategory, importance: 'normal' as EmailImportance }));
  }
}

// ── SAVE TO DB ────────────────────────────────────────────────────────────────

export async function saveEmailIntel(
  userId: string,
  connectionId: string,
  emails: CategorizedEmail[],
): Promise<void> {
  const rows = emails
    .filter(e => e.category !== 'ignore')
    .map(e => ({
      user_id: userId,
      connection_id: connectionId,
      subject: e.subject,
      snippet: e.snippet,
      category: e.category,
      importance: e.importance,
      received_at: e.received_at,
    }));
  if (rows.length) { try { await supabase.from('email_intel').insert(rows); } catch { /* non-blocking */ } }
}
