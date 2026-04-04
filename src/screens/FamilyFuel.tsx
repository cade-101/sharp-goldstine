import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Flame, Plus, ChevronRight, ChevronLeft, Users,
  BookOpen, Check, Clock, Zap,
} from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/logEvent';
import { incrementThemeMetric } from '../lib/themeUnlocks';
import { getSuggestedMeals, type MealSuggestion } from '../lib/mealSuggestions';

type SubScreen = 'home' | 'log_meal' | 'recipes' | 'recipe_detail' | 'family_setup';

type MealLog = {
  id: string;
  meal_name: string;
  meal_type: string;
  logged_for: string;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  logged_at: string;
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  instructions: string;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  prep_minutes: number;
  tags: string[];
  is_seed: boolean;
};

type FamilyProfile = {
  id: string;
  member_name: string;
  age_group: string;
  calorie_target: number | null;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const AGE_GROUPS = [
  { id: 'adult', label: 'Adult' },
  { id: 'teen', label: 'Teen (13–17)' },
  { id: 'child', label: 'Child (6–12)' },
  { id: 'toddler', label: 'Toddler (2–5)' },
];

// ── SEED RECIPES ──────────────────────────────────────────────────────────────
const SEED_RECIPES = [
  {
    name: 'One-Pan Chicken & Veggies',
    category: 'dinner',
    ingredients: ['2 chicken breasts', '1 cup broccoli', '1 red pepper', '2 tbsp olive oil', 'garlic powder', 'salt'],
    instructions: 'Preheat oven to 400°F. Cut chicken and veg into even pieces. Toss with oil and spices. Bake 25 min.',
    macros: { calories: 420, protein: 40, carbs: 14, fat: 22 },
    prep_minutes: 10,
    tags: ['high-protein', 'family-friendly', 'oven'],
  },
  {
    name: 'Greek Yogurt Parfait',
    category: 'breakfast',
    ingredients: ['1 cup Greek yogurt', '1/2 cup berries', '1/4 cup granola', '1 tsp honey'],
    instructions: 'Layer yogurt, berries, and granola. Drizzle honey. Serve immediately.',
    macros: { calories: 285, protein: 20, carbs: 38, fat: 5 },
    prep_minutes: 2,
    tags: ['quick', 'no-cook', 'high-protein'],
  },
  {
    name: 'Ground Turkey Taco Bowl',
    category: 'lunch',
    ingredients: ['300g ground turkey', '1 cup rice', 'taco seasoning', 'salsa', 'shredded cheese', 'sour cream'],
    instructions: 'Cook rice. Brown turkey with seasoning. Assemble bowls with rice, turkey, toppings.',
    macros: { calories: 560, protein: 38, carbs: 52, fat: 18 },
    prep_minutes: 20,
    tags: ['meal-prep-friendly', 'family-friendly', 'high-protein'],
  },
  {
    name: 'PB & Banana Oats',
    category: 'breakfast',
    ingredients: ['1 cup rolled oats', '1 banana', '2 tbsp peanut butter', '1 cup milk', 'pinch salt'],
    instructions: 'Cook oats with milk 5 min. Top with sliced banana and PB.',
    macros: { calories: 440, protein: 16, carbs: 62, fat: 14 },
    prep_minutes: 5,
    tags: ['kids-friendly', 'quick', 'filling'],
  },
  {
    name: 'Sheet Pan Salmon',
    category: 'dinner',
    ingredients: ['2 salmon fillets', '1 cup asparagus', '1 lemon', '2 tbsp olive oil', 'dill', 'salt'],
    instructions: 'Preheat oven to 425°F. Place salmon and asparagus on sheet pan. Drizzle with oil, season, add lemon slices. Bake 15 min.',
    macros: { calories: 380, protein: 42, carbs: 6, fat: 20 },
    prep_minutes: 5,
    tags: ['omega-3', 'quick', 'high-protein'],
  },
];

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
function FuelHome({
  T,
  todayLogs,
  family,
  onLogMeal,
  onRecipes,
  onFamilySetup,
}: {
  T: any;
  todayLogs: MealLog[];
  family: FamilyProfile[];
  onLogMeal: () => void;
  onRecipes: () => void;
  onFamilySetup: () => void;
}) {
  const totalCals = todayLogs.reduce((s, l) => s + (l.macros?.calories ?? 0), 0);
  const totalProtein = todayLogs.reduce((s, l) => s + (l.macros?.protein ?? 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      {/* Today summary */}
      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
        <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>TODAY</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroPill}>
            <Text style={[styles.macroValue, { color: T.accent }]}>{totalCals}</Text>
            <Text style={[styles.macroUnit, { color: T.muted }]}>kcal</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={[styles.macroValue, { color: T.accent }]}>{totalProtein}g</Text>
            <Text style={[styles.macroUnit, { color: T.muted }]}>protein</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={[styles.macroValue, { color: T.text }]}>{todayLogs.length}</Text>
            <Text style={[styles.macroUnit, { color: T.muted }]}>meals</Text>
          </View>
        </View>
        {todayLogs.slice(0, 4).map(log => (
          <View key={log.id} style={[styles.logRow, { borderTopColor: T.border + '20' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.logName, { color: T.text }]}>{log.meal_name}</Text>
              <Text style={[styles.logMeta, { color: T.muted }]}>
                {log.meal_type} · {log.logged_for} · {log.macros?.calories ?? 0} kcal
              </Text>
            </View>
            <Text style={[styles.logProtein, { color: T.muted }]}>{log.macros?.protein ?? 0}g</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: T.accent }]}
        onPress={onLogMeal}
      >
        <Plus size={18} color="#000" />
        <Text style={styles.primaryBtnText}>LOG A MEAL</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: T.card, borderColor: T.border + '30', flex: 1 }]}
          onPress={onRecipes}
        >
          <BookOpen size={22} color={T.accent} />
          <Text style={[styles.actionLabel, { color: T.text }]}>RECIPES</Text>
          <Text style={[styles.actionSub, { color: T.muted }]}>Browse & cook</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: T.card, borderColor: T.border + '30', flex: 1 }]}
          onPress={onFamilySetup}
        >
          <Users size={22} color={T.accent} />
          <Text style={[styles.actionLabel, { color: T.text }]}>FAMILY</Text>
          <Text style={[styles.actionSub, { color: T.muted }]}>{family.length} member{family.length !== 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── LOG MEAL ──────────────────────────────────────────────────────────────────
function LogMeal({
  T, family, userId, onDone,
}: {
  T: any; family: FamilyProfile[]; userId: string; onDone: (log: MealLog) => void;
}) {
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number]>('lunch');
  const [loggedFor, setLoggedFor] = useState(family[0]?.member_name ?? 'me');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    setLoadingSuggestions(true);
    getSuggestedMeals({ mealType, familySize: Math.max(family.length, 1) })
      .then(setSuggestions)
      .finally(() => setLoadingSuggestions(false));
  }, [mealType]);

  async function save() {
    if (!mealName.trim()) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const macros = {
        calories: parseInt(calories) || 0,
        protein: parseInt(protein) || 0,
        carbs: 0,
        fat: 0,
      };
      const { data } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userId,
          meal_name: mealName.trim(),
          meal_type: mealType,
          logged_for: loggedFor,
          macros,
        })
        .select()
        .single();

      if (data) {
        await logEvent(userId, 'meal_logged', { meal_type: mealType });
        incrementThemeMetric(userId, 'module_days').catch(() => {});
        onDone(data as MealLog);
      }
    } finally {
      setSaving(false);
    }
  }

  function applySuggestion(s: MealSuggestion) {
    setMealName(s.name);
    setCalories(String(s.macros.calories));
    setProtein(String(s.macros.protein));
    setMealType(s.category);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollPad}>
        {/* Suggestions */}
        {loadingSuggestions && (
          <View style={styles.suggestLoader}>
            <ActivityIndicator color={T.accent} size="small" />
            <Text style={[styles.suggestLoaderText, { color: T.muted }]}>Fetching suggestions...</Text>
          </View>
        )}
        {suggestions.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>
              SUGGESTED
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestCard, { backgroundColor: T.card, borderColor: T.border + '40' }]}
                  onPress={() => applySuggestion(s)}
                >
                  <Text style={[styles.suggestName, { color: T.text }]}>{s.name}</Text>
                  <Text style={[styles.suggestMacros, { color: T.muted }]}>
                    {s.macros.calories} kcal · {s.macros.protein}g protein · {s.prepMinutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Form */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>MEAL</Text>

          <TextInput
            style={[styles.input, { color: T.text, borderColor: T.border, backgroundColor: T.bg }]}
            placeholder="Meal name"
            placeholderTextColor={T.muted}
            value={mealName}
            onChangeText={setMealName}
          />

          <Text style={[styles.fieldLabel, { color: T.muted }]}>TYPE</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, {
                  borderColor: mealType === t ? T.accent : T.border,
                  backgroundColor: mealType === t ? T.accent + '18' : 'transparent',
                }]}
                onPress={() => setMealType(t)}
              >
                <Text style={[styles.chipText, { color: mealType === t ? T.accent : T.muted }]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: T.muted }]}>FOR</Text>
          <View style={styles.chipRow}>
            {['me', ...family.map(f => f.member_name), 'family'].map(name => (
              <TouchableOpacity
                key={name}
                style={[styles.chip, {
                  borderColor: loggedFor === name ? T.accent : T.border,
                  backgroundColor: loggedFor === name ? T.accent + '18' : 'transparent',
                }]}
                onPress={() => setLoggedFor(name)}
              >
                <Text style={[styles.chipText, { color: loggedFor === name ? T.accent : T.muted }]}>
                  {name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: T.muted }]}>CALORIES</Text>
          <TextInput
            style={[styles.input, { color: T.text, borderColor: T.border, backgroundColor: T.bg }]}
            placeholder="0"
            placeholderTextColor={T.muted}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />

          <Text style={[styles.fieldLabel, { color: T.muted }]}>PROTEIN (g)</Text>
          <TextInput
            style={[styles.input, { color: T.text, borderColor: T.border, backgroundColor: T.bg }]}
            placeholder="0"
            placeholderTextColor={T.muted}
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
        </View>

        <TouchableOpacity
          onPress={save}
          disabled={saving || !mealName.trim()}
          style={[styles.primaryBtn, { backgroundColor: mealName.trim() ? T.accent : T.border, opacity: saving ? 0.7 : 1 }]}
        >
          {saving
            ? <ActivityIndicator color="#000" size="small" />
            : <><Check size={18} color="#000" /><Text style={styles.primaryBtnText}>LOG MEAL</Text></>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── RECIPES LIST ──────────────────────────────────────────────────────────────
function RecipesList({
  T, recipes, onSelect,
}: {
  T: any; recipes: Recipe[]; onSelect: (r: Recipe) => void;
}) {
  const categories = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      {categories.map(cat => {
        const catRecipes = recipes.filter(r => r.category === cat);
        if (!catRecipes.length) return null;
        return (
          <View key={cat}>
            <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent, marginBottom: 10 }]}>
              {cat.toUpperCase()}
            </Text>
            {catRecipes.map(recipe => (
              <TouchableOpacity
                key={recipe.id}
                style={[styles.recipeRow, { backgroundColor: T.card, borderColor: T.border + '30' }]}
                onPress={() => onSelect(recipe)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recipeName, { color: T.text }]}>{recipe.name}</Text>
                  <Text style={[styles.recipeMeta, { color: T.muted }]}>
                    {recipe.prep_minutes} min · {recipe.macros.calories} kcal · {recipe.macros.protein}g protein
                  </Text>
                  <View style={styles.tagRow}>
                    {recipe.tags.slice(0, 3).map(tag => (
                      <Text key={tag} style={[styles.tag, { color: T.muted, borderColor: T.border }]}>{tag}</Text>
                    ))}
                  </View>
                </View>
                <ChevronRight size={16} color={T.muted} />
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── RECIPE DETAIL ─────────────────────────────────────────────────────────────
function RecipeDetail({ T, recipe, onBack }: { T: any; recipe: Recipe; onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <Text style={[styles.recipeDetailTitle, { color: T.text }]}>{recipe.name}</Text>
      <View style={styles.macroRow}>
        {[
          { label: 'Calories', value: `${recipe.macros.calories}` },
          { label: 'Protein', value: `${recipe.macros.protein}g` },
          { label: 'Carbs', value: `${recipe.macros.carbs}g` },
          { label: 'Fat', value: `${recipe.macros.fat}g` },
        ].map(m => (
          <View key={m.label} style={styles.macroPill}>
            <Text style={[styles.macroValue, { color: T.accent }]}>{m.value}</Text>
            <Text style={[styles.macroUnit, { color: T.muted }]}>{m.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.detailMeta}>
        <Clock size={14} color={T.muted} />
        <Text style={[styles.detailMetaText, { color: T.muted }]}>{recipe.prep_minutes} min prep</Text>
      </View>

      <Text style={[styles.detailSectionTitle, { color: T.text }]}>Ingredients</Text>
      {recipe.ingredients.map((ing, i) => (
        <View key={i} style={[styles.ingredientRow, { borderLeftColor: T.accent }]}>
          <Text style={[styles.ingredientText, { color: T.text }]}>{ing}</Text>
        </View>
      ))}

      <Text style={[styles.detailSectionTitle, { color: T.text }]}>Instructions</Text>
      <Text style={[styles.instructionText, { color: T.text }]}>{recipe.instructions}</Text>
    </ScrollView>
  );
}

// ── FAMILY SETUP ──────────────────────────────────────────────────────────────
function FamilySetup({
  T, family, userId, onUpdate,
}: {
  T: any; family: FamilyProfile[]; userId: string; onUpdate: (f: FamilyProfile[]) => void;
}) {
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('adult');
  const [saving, setSaving] = useState(false);

  async function addMember() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from('family_fuel_profiles')
        .insert({ user_id: userId, member_name: name.trim(), age_group: ageGroup })
        .select()
        .single();
      if (data) onUpdate([...family, data as FamilyProfile]);
      setName('');
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(id: string) {
    await supabase.from('family_fuel_profiles').delete().eq('id', id);
    onUpdate(family.filter(f => f.id !== id));
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
        <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>
          ADD MEMBER
        </Text>
        <TextInput
          style={[styles.input, { color: T.text, borderColor: T.border, backgroundColor: T.bg }]}
          placeholder="Name"
          placeholderTextColor={T.muted}
          value={name}
          onChangeText={setName}
        />
        <View style={styles.chipRow}>
          {AGE_GROUPS.map(ag => (
            <TouchableOpacity
              key={ag.id}
              style={[styles.chip, {
                borderColor: ageGroup === ag.id ? T.accent : T.border,
                backgroundColor: ageGroup === ag.id ? T.accent + '18' : 'transparent',
              }]}
              onPress={() => setAgeGroup(ag.id)}
            >
              <Text style={[styles.chipText, { color: ageGroup === ag.id ? T.accent : T.muted }]}>
                {ag.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={addMember}
          disabled={saving || !name.trim()}
          style={[styles.primaryBtn, { backgroundColor: name.trim() ? T.accent : T.border }]}
        >
          <Plus size={16} color="#000" />
          <Text style={styles.primaryBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {family.map(member => (
        <View
          key={member.id}
          style={[styles.memberRow, { backgroundColor: T.card, borderColor: T.border + '30' }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.memberName, { color: T.text }]}>{member.member_name}</Text>
            <Text style={[styles.memberAge, { color: T.muted }]}>{member.age_group}</Text>
          </View>
          <TouchableOpacity onPress={() => removeMember(member.id)}>
            <Text style={{ color: T.red ?? '#ef4444', fontSize: 11, letterSpacing: 1 }}>REMOVE</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function FamilyFuel() {
  const { user, themeTokens: T } = useUser();
  const [screen, setScreen] = useState<SubScreen>('home');
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [family, setFamily] = useState<FamilyProfile[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];

    const [logsRes, recipesRes, familyRes] = await Promise.all([
      supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', `${today}T00:00:00`)
        .order('logged_at', { ascending: false }),
      supabase
        .from('recipes')
        .select('*')
        .or(`user_id.eq.${user.id},is_seed.eq.true`)
        .order('created_at', { ascending: true }),
      supabase
        .from('family_fuel_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ]);

    setTodayLogs((logsRes.data ?? []) as MealLog[]);
    setRecipes((recipesRes.data ?? []) as Recipe[]);
    setFamily((familyRes.data ?? []) as FamilyProfile[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Seed recipes on first load if none exist
  useEffect(() => {
    if (loading || recipes.length > 0 || !user?.id) return;
    const seedAndLoad = async () => {
      await supabase.from('recipes').insert(
        SEED_RECIPES.map(r => ({
          ...r,
          user_id: user.id,
          is_seed: true,
          ingredients: JSON.stringify(r.ingredients),
        }))
      );
      loadData();
    };
    seedAndLoad();
  }, [loading, recipes.length, user?.id]);

  const SCREEN_TITLES: Record<SubScreen, string> = {
    home: 'FAMILY FUEL',
    log_meal: 'LOG MEAL',
    recipes: 'RECIPES',
    recipe_detail: selectedRecipe?.name ?? 'RECIPE',
    family_setup: 'FAMILY',
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border + '30' }]}>
        {screen !== 'home' ? (
          <TouchableOpacity
            onPress={() => { if (screen === 'recipe_detail') setScreen('recipes'); else setScreen('home'); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color={T.accent} />
            <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text>
          </TouchableOpacity>
        ) : (
          <Flame size={20} color={T.accent} style={{ marginRight: 8 }} />
        )}
        <Text style={[styles.headerTitle, { color: T.text }]}>{SCREEN_TITLES[screen]}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && screen === 'home' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <>
          {screen === 'home' && (
            <FuelHome
              T={T}
              todayLogs={todayLogs}
              family={family}
              onLogMeal={() => setScreen('log_meal')}
              onRecipes={() => setScreen('recipes')}
              onFamilySetup={() => setScreen('family_setup')}
            />
          )}
          {screen === 'log_meal' && (
            <LogMeal
              T={T}
              family={family}
              userId={user.id}
              onDone={log => {
                setTodayLogs(prev => [log, ...prev]);
                setScreen('home');
              }}
            />
          )}
          {screen === 'recipes' && (
            <RecipesList
              T={T}
              recipes={recipes}
              onSelect={r => { setSelectedRecipe(r); setScreen('recipe_detail'); }}
            />
          )}
          {screen === 'recipe_detail' && selectedRecipe && (
            <RecipeDetail T={T} recipe={selectedRecipe} onBack={() => setScreen('recipes')} />
          )}
          {screen === 'family_setup' && (
            <FamilySetup
              T={T}
              family={family}
              userId={user.id}
              onUpdate={setFamily}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  scrollPad: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 60 },
  card: {
    borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  sectionLabel: {
    fontSize: 10, letterSpacing: 3, fontWeight: '700',
    borderLeftWidth: 3, paddingLeft: 10, marginBottom: 14,
  },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  macroPill: { alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '800' },
  macroUnit: { fontSize: 10, letterSpacing: 1 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
  logName: { fontSize: 13, fontWeight: '600' },
  logMeta: { fontSize: 11, marginTop: 1 },
  logProtein: { fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16, marginBottom: 12,
  },
  primaryBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    borderWidth: 1, borderRadius: 14, padding: 18,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  actionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  actionSub: { fontSize: 11 },
  suggestLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  suggestLoaderText: { fontSize: 12, letterSpacing: 1 },
  suggestCard: {
    borderWidth: 1, borderRadius: 12, padding: 14, width: 220,
  },
  suggestName: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  suggestMacros: { fontSize: 11 },
  fieldLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  chipText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  recipeRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 1,
  },
  recipeName: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  recipeMeta: { fontSize: 11, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 9, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, letterSpacing: 0.5 },
  recipeDetailTitle: { fontSize: 22, fontWeight: '800', marginBottom: 16, lineHeight: 28 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  detailMetaText: { fontSize: 12 },
  detailSectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: 12, marginTop: 20 },
  ingredientRow: { borderLeftWidth: 2, paddingLeft: 12, marginBottom: 8 },
  ingredientText: { fontSize: 14, lineHeight: 20 },
  instructionText: { fontSize: 14, lineHeight: 22 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberAge: { fontSize: 11, marginTop: 2 },
});
