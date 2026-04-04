import { supabase } from './supabase';
import { ANTHROPIC_API_KEY } from './config';
import { isInGroundingWindow } from './downtimeDetector';

const CLOSERS = [
  { type: 'mood',     text: 'Tell me something that pissed you off today.' },
  { type: 'mood',     text: 'One good thing about today. Go.' },
  { type: 'physical', text: 'Drop and give me 4 pushups.' },
  { type: 'physical', text: 'Grab a glass of water before you keep scrolling.' },
  { type: 'mood',     text: 'Rate your day 1-10.' },
  { type: 'mood',     text: 'What are you avoiding right now?' },
  { type: 'physical', text: 'Stand up and stretch for 30 seconds.' },
  { type: 'mood',     text: 'Name one thing you did right today.' },
];

export async function noseyQuestionsToAsk(
  userId: string,
  questionText: string,
  options: { optionA: string; optionB: string },
  type: 'clarification' | 'financial' | 'mood' | 'physical' | 'journal',
  priority = 5,
  context: Record<string, unknown> = {},
  linkedClarificationId?: string,
  followUpOf?: string,
): Promise<void> {
  await supabase.from('nosey_questions_queue').insert({
    user_id: userId,
    priority,
    question_type: type,
    question_text: questionText,
    option_a: options.optionA,
    option_b: options.optionB,
    allow_custom: true,
    context,
    linked_clarification_id: linkedClarificationId ?? null,
    follow_up_of: followUpOf ?? null,
    status: 'pending',
  });
}

export async function addCloser(userId: string): Promise<void> {
  const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];
  await noseyQuestionsToAsk(
    userId,
    closer.text,
    { optionA: '✓ Done', optionB: 'Maybe later' },
    closer.type as 'mood' | 'physical',
    1,
  );
}

export async function isGoodWindow(userId: string, hrv: number | null): Promise<boolean> {
  if (await isInGroundingWindow(userId)) return false;

  const hour = new Date().getHours();
  if (hour >= 22 || hour < 8) return false;
  if (hrv !== null && hrv < 30) return false;

  const { data: logs } = await supabase
    .from('nosey_timing_log')
    .select('hour_of_day, questions_answered, questions_asked')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (logs && logs.length >= 5) {
    const thisHourLogs = logs.filter((l: any) => l.hour_of_day === hour);
    if (thisHourLogs.length >= 3) {
      const avgAnswered =
        thisHourLogs.reduce((s: number, l: any) => s + l.questions_answered, 0) /
        thisHourLogs.length;
      if (avgAnswered < 0.5) return false;
    }
  }

  return true;
}

export async function noseyQuestionTime(
  userId: string,
  hrv: number | null,
  sendPush: (title: string, body: string, data: Record<string, unknown>) => Promise<void>,
): Promise<void> {
  const good = await isGoodWindow(userId, hrv);
  if (!good) return;

  const { data: questions } = await supabase
    .from('nosey_questions_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(3);

  if (!questions?.length) return;

  const toAsk = questions.slice(0, 2);
  await addCloser(userId);

  const { data: closer } = await supabase
    .from('nosey_questions_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('question_type', 'mood')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (closer) toAsk.push(closer);

  const first = toAsk[0];
  if (!first) return;

  await sendPush(
    first.question_type === 'clarification' ? '❓ QUICK ONE' : '💬 TETHER',
    first.question_text,
    {
      type: 'nosey_question',
      questionId: first.id,
      optionA: first.option_a,
      optionB: first.option_b,
      allowCustom: true,
      followUpIds: toAsk.slice(1).map((q: any) => q.id),
    },
  );

  await supabase
    .from('nosey_questions_queue')
    .update({ status: 'asked', asked_at: new Date().toISOString() })
    .eq('id', first.id);

  await supabase.from('nosey_timing_log').insert({
    user_id: userId,
    fired_at: new Date().toISOString(),
    questions_asked: toAsk.length,
    questions_answered: 0,
    hrv_at_fire: hrv,
    hour_of_day: new Date().getHours(),
    day_of_week: new Date().getDay(),
    was_good_window: true,
  });
}

export async function answerQuestion(
  userId: string,
  questionId: string,
  answer: string,
  timingLogId?: string,
): Promise<void> {
  await supabase
    .from('nosey_questions_queue')
    .update({ status: 'answered', answer, answered_at: new Date().toISOString() })
    .eq('id', questionId);

  if (timingLogId) {
    const { data: log } = await supabase
      .from('nosey_timing_log')
      .select('questions_answered')
      .eq('id', timingLogId)
      .maybeSingle();
    if (log) {
      await supabase
        .from('nosey_timing_log')
        .update({ questions_answered: (log as any).questions_answered + 1 })
        .eq('id', timingLogId);
    }
  }

  extractAndLogKeywords(userId, questionId, answer).catch(() => {});
}

async function extractAndLogKeywords(
  userId: string,
  _questionId: string,
  text: string,
): Promise<void> {
  if (!text || text.length < 3) return;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system:
          'Extract keywords from this text. Return ONLY JSON with no markdown: { "keywords": ["word1","word2"], "people_mentioned": ["name1"], "stressors": ["topic1"], "sentiment": "positive|neutral|negative" }',
        messages: [{ role: 'user', content: text }],
      }),
    });
    const data = await response.json();
    const raw = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    await supabase.from('journal_entries').insert({
      user_id: userId,
      source: 'nosey_answer',
      raw_text: text,
      keywords: parsed.keywords ?? [],
      people_mentioned: parsed.people_mentioned ?? [],
      stressors: parsed.stressors ?? [],
      sentiment: parsed.sentiment ?? 'neutral',
    });
  } catch {
    // Non-blocking
  }
}

export async function logIntelDropToJournal(userId: string, text: string): Promise<void> {
  if (!text || text.length < 3) return;
  extractAndLogKeywords(userId, 'intel_drop', text).catch(() => {});
}
