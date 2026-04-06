import { ANTHROPIC_API_KEY } from './config';
import { supabase } from './supabase';
import { awardOpsPoints } from './opsPoints';

// ── GRADE SYSTEM ──────────────────────────────────────────────────────────────

export type BlitzGrade = 'D' | 'C' | 'B' | 'A' | 'S';

export interface GradeConfig {
  grade: BlitzGrade;
  label: string;
  minRatio: number;   // completed/target time ratio threshold (lower = completed fast)
  opsPoints: number;
  color: string;
  verdict: string;
}

export const GRADE_CONFIGS: GradeConfig[] = [
  { grade: 'S', label: 'S-RANK',   minRatio: 0,   opsPoints: 50, color: '#f9c74f', verdict: 'LEGENDARY. Field cleared ahead of schedule.' },
  { grade: 'A', label: 'A-RANK',   minRatio: 0.6, opsPoints: 35, color: '#90e0ef', verdict: 'SOLID EXECUTION. Objectives met.' },
  { grade: 'B', label: 'B-RANK',   minRatio: 0.8, opsPoints: 20, color: '#80ed99', verdict: 'MISSION COMPLETE. Held the line.' },
  { grade: 'C', label: 'C-RANK',   minRatio: 1.0, opsPoints: 10, color: '#adb5bd', verdict: 'COMPLETED. Could push harder next time.' },
  { grade: 'D', label: 'D-RANK',   minRatio: 1.2, opsPoints: 5,  color: '#e63946', verdict: 'PARTIAL. Ground held, but not secured.' },
];

/** Given elapsed seconds and target minutes, returns the best matching grade. */
export function calculateGrade(elapsedSeconds: number, targetMinutes: number): GradeConfig {
  const ratio = elapsedSeconds / (targetMinutes * 60);
  // S: finished in <60% of time
  // A: 60–79%
  // B: 80–99%
  // C: 100–119%
  // D: 120%+
  if (ratio < 0.6)  return GRADE_CONFIGS[0]; // S
  if (ratio < 0.80) return GRADE_CONFIGS[1]; // A
  if (ratio < 1.00) return GRADE_CONFIGS[2]; // B
  if (ratio < 1.20) return GRADE_CONFIGS[3]; // C
  return GRADE_CONFIGS[4];                   // D
}

// ── DAILY MISSION ─────────────────────────────────────────────────────────────

export interface DailyMission {
  room: string;
  zone: string;
  minutes: number;
  emoji: string;
  grade?: BlitzGrade;
  completedAt?: string;
}

export interface PostCleanChecklist {
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

const DEFAULT_CHECKLIST_ITEMS = [
  { id: 'surfaces', label: 'All surfaces cleared', done: false },
  { id: 'floor',    label: 'Floor path is clear',  done: false },
  { id: 'trash',    label: 'Trash removed',         done: false },
  { id: 'return',   label: 'Misplaced items returned', done: false },
];

export function buildChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item }));
}

// ── AI ROOM SELECTION ─────────────────────────────────────────────────────────

type EnergyLevel = 'locked_in' | 'holding' | 'scattered' | 'critical';

export async function generateDailyMission(energy: EnergyLevel): Promise<DailyMission> {
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
        max_tokens: 120,
        system: `You generate household missions for someone with ADHD.
Rules:
- One mission only. No list. No explanation.
- Never say "clean" — use: clear, hold, secure, sweep, reset
- Room: CAPS (LIVING ROOM, KITCHEN, BEDROOM, BATHROOM, OFFICE, HALLWAY, ENTRYWAY)
- Zone: directional (SW CORNER, NORTH WALL, CENTER FLOOR, EAST SHELF, MAIN SURFACE, ENTRY ZONE)
- Time: 10–20 min. CRITICAL = 10–13 min. LOCKED IN = 15–20 min.
- Return JSON only: { "room": "...", "zone": "...", "minutes": 15, "emoji": "⚔️" }
- Emoji map: locked_in=⚔️, holding=🛡️, scattered=🗡️, critical=🏴`,
        messages: [{
          role: 'user',
          content: `Energy: ${energy.toUpperCase()}. Return JSON only.`,
        }],
      }),
    });
    const data = await resp.json();
    const raw = (data.content?.[0]?.text ?? '{}').replace(/```json|```/g, '').trim();
    return JSON.parse(raw) as DailyMission;
  } catch {
    const fallbacks: Record<EnergyLevel, DailyMission> = {
      locked_in: { room: 'KITCHEN',     zone: 'MAIN SURFACE', minutes: 20, emoji: '⚔️' },
      holding:   { room: 'LIVING ROOM', zone: 'CENTER FLOOR', minutes: 15, emoji: '🛡️' },
      scattered: { room: 'BEDROOM',     zone: 'SW CORNER',    minutes: 12, emoji: '🗡️' },
      critical:  { room: 'ENTRYWAY',    zone: 'ENTRY ZONE',   minutes: 10, emoji: '🏴' },
    };
    return fallbacks[energy];
  }
}

// ── SESSION RECORD ────────────────────────────────────────────────────────────

export async function recordBlitzSession(
  userId: string,
  mission: DailyMission,
  elapsedSeconds: number,
  checklistAllDone: boolean,
): Promise<GradeConfig> {
  const grade = calculateGrade(elapsedSeconds, mission.minutes);

  // Bonus if checklist completed
  const bonusPoints = checklistAllDone ? 10 : 0;
  await awardOpsPoints(userId, grade.opsPoints + bonusPoints, `blitz_${grade.grade}`);

  // Log to clean_sessions if table exists
  try {
    await supabase.from('clean_sessions').insert({
      user_id: userId,
      room: mission.room,
      zone: mission.zone,
      target_minutes: mission.minutes,
      elapsed_seconds: elapsedSeconds,
      grade: grade.grade,
      checklist_done: checklistAllDone,
    });
  } catch { /* non-blocking */ }

  return grade;
}
