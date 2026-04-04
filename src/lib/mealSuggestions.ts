import { ANTHROPIC_API_KEY } from './config';

export type MealSuggestion = {
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  macros: { calories: number; protein: number; carbs: number; fat: number };
  prepMinutes: number;
  tags: string[];
};

const FALLBACK_SUGGESTIONS: MealSuggestion[] = [
  {
    name: 'Greek Yogurt & Berries',
    category: 'breakfast',
    macros: { calories: 280, protein: 22, carbs: 30, fat: 6 },
    prepMinutes: 2,
    tags: ['high-protein', 'quick', 'no-cook'],
  },
  {
    name: 'Chicken Rice Bowl',
    category: 'lunch',
    macros: { calories: 520, protein: 42, carbs: 58, fat: 10 },
    prepMinutes: 20,
    tags: ['high-protein', 'meal-prep-friendly'],
  },
  {
    name: 'Ground Beef Stir Fry',
    category: 'dinner',
    macros: { calories: 480, protein: 35, carbs: 25, fat: 22 },
    prepMinutes: 20,
    tags: ['family-friendly', 'high-protein'],
  },
  {
    name: 'Eggs & Toast',
    category: 'breakfast',
    macros: { calories: 320, protein: 18, carbs: 28, fat: 14 },
    prepMinutes: 8,
    tags: ['quick', 'high-protein'],
  },
  {
    name: 'PB Banana Wrap',
    category: 'snack',
    macros: { calories: 290, protein: 9, carbs: 40, fat: 12 },
    prepMinutes: 3,
    tags: ['quick', 'kids-friendly', 'no-cook'],
  },
];

export async function getSuggestedMeals(
  preferences: {
    calorieTarget?: number;
    proteinTarget?: number;
    restrictions?: string[];
    familySize?: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  },
): Promise<MealSuggestion[]> {
  if (!ANTHROPIC_API_KEY) return FALLBACK_SUGGESTIONS;

  try {
    const prompt = `Suggest 3 quick family meals. Requirements:
- Meal type: ${preferences.mealType ?? 'any'}
- Family size: ${preferences.familySize ?? 2}
- Restrictions: ${preferences.restrictions?.join(', ') || 'none'}
- Calorie target per serving: ${preferences.calorieTarget ?? 'flexible'}
- Protein target per serving: ${preferences.proteinTarget ?? 'flexible'}g

Return ONLY a JSON array of 3 objects. Each object must have exactly these fields:
{"name":"string","category":"breakfast|lunch|dinner|snack","macros":{"calories":number,"protein":number,"carbs":number,"fat":number},"prepMinutes":number,"tags":["string"]}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return FALLBACK_SUGGESTIONS;

    const json = await response.json();
    const text = json.content?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return FALLBACK_SUGGESTIONS;

    const parsed = JSON.parse(match[0]) as MealSuggestion[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : FALLBACK_SUGGESTIONS;
  } catch {
    return FALLBACK_SUGGESTIONS;
  }
}
