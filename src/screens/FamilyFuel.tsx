import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import {
  Flame, Plus, ChevronRight, ChevronLeft, Users,
  BookOpen, Check, Clock, AlertTriangle, ShoppingCart, RefreshCw,
} from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/logEvent';
import { incrementThemeMetric } from '../lib/themeUnlocks';
import { getSuggestedMeals, type MealSuggestion } from '../lib/mealSuggestions';
import { ANTHROPIC_API_KEY } from '../lib/config';
import { sendPushNotification } from '../lib/sendPushNotification';
import AnimatedCheckbox from '../components/AnimatedCheckbox';

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

type DesperateItem = {
  category: string;
  name: string;
  note: string;
  estimated_cost: number;
  protein_g_per_serving: number;
  spoon_level: number;
};

type DesperateAnswers = {
  days: number;
  who: string[];
  spoons: number;
  protein: boolean;
  budget: string;
  mustHaves: string;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const AGE_GROUPS = [
  { id: 'adult', label: 'Adult' },
  { id: 'teen', label: 'Teen (13–17)' },
  { id: 'child', label: 'Child (6–12)' },
  { id: 'toddler', label: 'Toddler (2–5)' },
];

const WHO_OPTIONS = ['Me', 'Partner', 'Kids (packed lunches)', 'Kids (home)', 'Just me'];
const BUDGET_OPTIONS = ['$40-50', '$60-75', '$80-100', '$100+', 'As low as possible'];
const LOADING_TEXTS = [
  'Checking what you can actually make...',
  'Keeping it cheap...',
  "Making sure there's protein...",
  'Almost done...',
];
const GROCERY_BUDGET = 400;

function mapGroceryCategory(cat: string): string {
  if (cat === 'BREAKFAST' || cat === 'LUNCH' || cat === 'SUPPER') return 'food';
  if (cat === 'SNACKS') return 'snacks';
  return 'other';
}

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
  T, todayLogs, family, onLogMeal, onRecipes, onFamilySetup, onDesperate,
}: {
  T: any;
  todayLogs: MealLog[];
  family: FamilyProfile[];
  onLogMeal: () => void;
  onRecipes: () => void;
  onFamilySetup: () => void;
  onDesperate: () => void;
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

      {/* I'M DESPERATE button */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: T.red + '18',
          borderWidth: 1.5,
          borderColor: T.red + '60',
          borderRadius: 18,
          padding: 18,
          marginBottom: 12,
        }}
        onPress={onDesperate}
        activeOpacity={0.75}
      >
        <AlertTriangle size={22} color={T.red} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: T.red, fontSize: 14, fontWeight: '800', letterSpacing: 2 }}>
            I'M DESPERATE
          </Text>
          <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
            Make me a grocery list right now
          </Text>
        </View>
        <ChevronRight size={18} color={T.red} />
      </TouchableOpacity>

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
function RecipeDetail({ T, recipe }: { T: any; recipe: Recipe }) {
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
        <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>ADD MEMBER</Text>
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
            <Text style={{ color: T.red, fontSize: 11, letterSpacing: 1 }}>REMOVE</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function FamilyFuel() {
  const { user, themeTokens: T } = useUser();
  const route = useRoute<any>();

  const [screen, setScreen] = useState<SubScreen>('home');
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [family, setFamily] = useState<FamilyProfile[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  // ── DESPERATE MODE STATE ──────────────────────────────────────────────────
  const [showDesperateMode, setShowDesperateMode] = useState(false);
  const [desperateStage, setDesperateStage] = useState<'questions' | 'loading' | 'list'>('questions');
  const [desperateQuestion, setDesperateQuestion] = useState(0);
  const [desperateList, setDesperateList] = useState<DesperateItem[] | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [groceryRemaining, setGroceryRemaining] = useState<number | null>(null);
  const [addedToList, setAddedToList] = useState(false);
  const [desperateAnswers, setDesperateAnswers] = useState<DesperateAnswers>({
    days: 4,
    who: ['Me'],
    spoons: 0,
    protein: false,
    budget: '$60-75',
    mustHaves: '',
  });

  // Loading animation dots
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Auto-open from WarRoom navigation param
  useFocusEffect(useCallback(() => {
    if (route.params?.desperateMode) {
      openDesperateMode();
    }
  }, [route.params?.desperateMode]));

  function openDesperateMode() {
    setDesperateStage('questions');
    setDesperateQuestion(0);
    setDesperateList(null);
    setCheckedItems(new Set());
    setAddedToList(false);
    setShowDesperateMode(true);
  }

  function startDotAnimation() {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ),
      ]);
    pulse(dot1, 0).start();
    pulse(dot2, 200).start();
    pulse(dot3, 400).start();

    loadingIntervalRef.current = setInterval(() => {
      setLoadingTextIdx(i => (i + 1) % LOADING_TEXTS.length);
    }, 1500);
  }

  function stopDotAnimation() {
    dot1.stopAnimation();
    dot2.stopAnimation();
    dot3.stopAnimation();
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
  }

  useEffect(() => {
    return () => {
      stopDotAnimation();
    };
  }, []);

  async function fetchGroceryContext(): Promise<{ pantryItems: string[]; budgetRemaining: number }> {
    let pantryItems: string[] = [];
    let budgetRemaining = GROCERY_BUDGET;

    try {
      if (user?.house_name) {
        const { data } = await supabase
          .from('pantry_items')
          .select('name')
          .eq('household_id', user.house_name)
          .gt('quantity', 0);
        pantryItems = (data ?? []).map((p: any) => p.name);
      }

      if (user?.id) {
        const { data: exps } = await supabase
          .from('budget_expenses')
          .select('amount')
          .eq('user_id', user.id)
          .eq('envelope_id', 'groceries')
          .gte('amount', 0);
        const spent = (exps ?? []).reduce((s: number, e: any) => s + parseFloat(e.amount), 0);
        budgetRemaining = GROCERY_BUDGET - spent;
        setGroceryRemaining(budgetRemaining);
      }
    } catch { /* non-blocking */ }

    return { pantryItems, budgetRemaining };
  }

  async function runDesperateGeneration(answers: DesperateAnswers) {
    setDesperateStage('loading');
    startDotAnimation();

    const { pantryItems } = await fetchGroceryContext();

    const pantryContext = pantryItems.length > 0
      ? `Already in pantry: ${pantryItems.join(', ')} — do not include these unless they need restocking.`
      : '';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: `You are a grocery list assistant for an ADHD household.
You prioritize:
1. Lowest possible effort to prepare (spoon level determines this)
2. Lowest possible cost (suggest cheaper alternatives always)
3. High protein if requested
4. Actual things people will eat, not aspirational healthy food
5. Must-have items always included

Rules:
- Spoon 0: everything is grab and eat, zero cooking, zero assembly
- Spoon 1: open a package, maybe microwave
- Spoon 2: one pan, one step, 10 min max
- Spoon 3: normal cooking, 30 min max
- Always suggest store brand / cheaper alternatives in brackets
- Never suggest anything that requires more than the stated spoon level
- Group by: BREAKFAST / LUNCH / SUPPER / SNACKS / MUST HAVES
- Include estimated cost per item in brackets
- Include a TOTAL ESTIMATE at the end
- Keep the whole list under the stated budget
- Be direct, no fluff, no nutrition lectures

Return ONLY a JSON array of items grouped by category:
[{
  "category": "BREAKFAST|LUNCH|SUPPER|SNACKS|MUST HAVES",
  "name": "item name",
  "note": "brief prep note or cheaper alternative",
  "estimated_cost": 4.99,
  "protein_g_per_serving": 15,
  "spoon_level": 0
}]`,
          messages: [{
            role: 'user',
            content: `Make me a grocery list with these constraints:
- Days: ${answers.days}
- Feeding: ${answers.who.join(', ')}
- Spoon level: ${answers.spoons}/3
- Protein priority: ${answers.protein ? 'YES - high protein focus' : 'No'}
- Budget: ${answers.budget}
- Must include: ${answers.mustHaves || 'nothing specific'}
${pantryContext}

Household context: ADHD household, two adults, young kids.
Make it real. Make it cheap. Make it doable.`,
          }],
        }),
      });

      const data = await response.json();
      const text = (data.content?.[0]?.text ?? '[]').replace(/```json|```/g, '').trim();
      const items: DesperateItem[] = JSON.parse(text);
      setDesperateList(items);
      setCheckedItems(new Set());
    } catch {
      setDesperateList([]);
    } finally {
      stopDotAnimation();
      setDesperateStage('list');
    }
  }

  async function handleAddToShoppingList() {
    if (!desperateList || !user?.id) return;
    const unchecked = desperateList.filter((_, i) => !checkedItems.has(i));
    try {
      const rows = unchecked.map(item => ({
        user_id: user.id,
        list_type: 'household',
        item: item.name,
        tagged_to: null,
        completed: false,
        added_by: user.username ?? null,
        ...(user.house_name ? { house_name: user.house_name } : {}),
      }));
      if (rows.length) {
        await supabase.from('shopping_list_items').insert(rows);
      }
      setAddedToList(true);
      setTimeout(() => {
        setShowDesperateMode(false);
      }, 1200);
    } catch { /* non-blocking */ }
  }

  async function handleShareWithPartner() {
    if (!user?.id || !user.house_name || !desperateList) return;
    try {
      const { data: partners } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('house_name', user.house_name)
        .neq('id', user.id)
        .limit(1);
      const partnerId = partners?.[0]?.id;
      if (!partnerId) return;
      const total = (desperateList ?? []).reduce((s, i) => s + (i.estimated_cost ?? 0), 0);
      await sendPushNotification(
        partnerId,
        '🛒 Grocery list incoming',
        `List for ${desperateAnswers.days} days — ${desperateList.length} items, ~$${total.toFixed(0)}`,
        { type: 'grocery_list', items: desperateList },
      );
    } catch { /* non-blocking */ }
  }

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

  // ── DESPERATE MODE OVERLAY ────────────────────────────────────────────────
  const estimatedTotal = (desperateList ?? []).reduce((s, i) => s + (i.estimated_cost ?? 0), 0);
  const categories = ['BREAKFAST', 'LUNCH', 'SUPPER', 'SNACKS', 'MUST HAVES'];

  function renderQuestions() {
    const q = desperateQuestion;
    const progressDots = (
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 32 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: i === q ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= q ? T.red : T.border,
            }}
          />
        ))}
      </View>
    );

    if (q === 0) return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        {progressDots}
        <Text style={{ color: T.red, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>How many days are you shopping for?</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          {[3, 4, 5, 6, 7].map(d => (
            <TouchableOpacity
              key={d}
              style={{
                flex: 1, minWidth: 56, padding: 18,
                borderRadius: 14, borderWidth: 2,
                borderColor: desperateAnswers.days === d ? T.red : T.border,
                backgroundColor: desperateAnswers.days === d ? T.red + '18' : T.card,
                alignItems: 'center',
              }}
              onPress={() => {
                setDesperateAnswers(a => ({ ...a, days: d }));
                setDesperateQuestion(1);
              }}
            >
              <Text style={{ color: desperateAnswers.days === d ? T.red : T.text, fontSize: 22, fontWeight: '900' }}>{d}</Text>
              <Text style={{ color: T.muted, fontSize: 10, marginTop: 2 }}>days</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );

    if (q === 1) return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        {progressDots}
        <Text style={{ color: T.red, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>Who needs feeding?</Text>
        <Text style={{ color: T.muted, fontSize: 12, marginBottom: 24 }}>Select all that apply</Text>
        <View style={{ gap: 10 }}>
          {WHO_OPTIONS.map(opt => {
            const selected = desperateAnswers.who.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={{
                  padding: 16, borderRadius: 14, borderWidth: 2,
                  borderColor: selected ? T.red : T.border,
                  backgroundColor: selected ? T.red + '18' : T.card,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
                onPress={() => {
                  setDesperateAnswers(a => ({
                    ...a,
                    who: selected ? a.who.filter(w => w !== opt) : [...a.who, opt],
                  }));
                }}
              >
                <Text style={{ color: selected ? T.red : T.text, fontWeight: '700', fontSize: 14 }}>{opt}</Text>
                {selected && <Check size={16} color={T.red} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {desperateAnswers.who.length > 0 && (
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: T.red, borderRadius: 14, padding: 18, alignItems: 'center' }}
            onPress={() => setDesperateQuestion(2)}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 }}>NEXT →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );

    if (q === 2) return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        {progressDots}
        <Text style={{ color: T.red, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>What's your energy level this week?</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {[
            { val: 0, label: '0 — Zero. Don\'t even ask.' },
            { val: 1, label: '1 — Open a package max' },
            { val: 2, label: '2 — One pan, one step' },
            { val: 3, label: '3 — Normal, just tired' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.val}
              style={{
                padding: 18, borderRadius: 14, borderWidth: 2,
                borderColor: desperateAnswers.spoons === opt.val ? T.red : T.border,
                backgroundColor: desperateAnswers.spoons === opt.val ? T.red + '18' : T.card,
              }}
              onPress={() => {
                setDesperateAnswers(a => ({ ...a, spoons: opt.val }));
                setDesperateQuestion(3);
              }}
            >
              <Text style={{ color: desperateAnswers.spoons === opt.val ? T.red : T.text, fontWeight: '700', fontSize: 14 }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );

    if (q === 3) return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        {progressDots}
        <Text style={{ color: T.red, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 32 }}>Are you prioritizing protein?</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1, padding: 24, borderRadius: 16, borderWidth: 2,
              borderColor: desperateAnswers.protein ? T.green : T.border,
              backgroundColor: desperateAnswers.protein ? T.green + '18' : T.card,
              alignItems: 'center',
            }}
            onPress={() => {
              setDesperateAnswers(a => ({ ...a, protein: true }));
              setDesperateQuestion(4);
            }}
          >
            <Text style={{ color: T.green, fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>YES</Text>
            <Text style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>GYMMING</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1, padding: 24, borderRadius: 16, borderWidth: 2,
              borderColor: !desperateAnswers.protein ? T.accent : T.border,
              backgroundColor: T.card,
              alignItems: 'center',
            }}
            onPress={() => {
              setDesperateAnswers(a => ({ ...a, protein: false }));
              setDesperateQuestion(4);
            }}
          >
            <Text style={{ color: T.text, fontWeight: '900', fontSize: 14 }}>NAH</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );

    if (q === 4) return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        {progressDots}
        <Text style={{ color: T.red, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 24 }}>What's your budget?</Text>
        <View style={{ gap: 10 }}>
          {BUDGET_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={{
                padding: 16, borderRadius: 14, borderWidth: 2,
                borderColor: desperateAnswers.budget === opt ? T.red : T.border,
                backgroundColor: desperateAnswers.budget === opt ? T.red + '18' : T.card,
              }}
              onPress={() => {
                setDesperateAnswers(a => ({ ...a, budget: opt }));
                setDesperateQuestion(5);
              }}
            >
              <Text style={{ color: desperateAnswers.budget === opt ? T.red : T.text, fontWeight: '700', fontSize: 15 }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );

    // Q6 — must haves
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
          {progressDots}
          <Text style={{ color: T.red, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>Anything you MUST have on this list?</Text>
          <TextInput
            style={{
              borderWidth: 1.5, borderColor: T.border, borderRadius: 14,
              padding: 16, color: T.text, fontSize: 15, backgroundColor: T.card,
              minHeight: 80, textAlignVertical: 'top', marginTop: 16, marginBottom: 20,
            }}
            placeholder="Popsicles, Pepsi, drinkable yogurts..."
            placeholderTextColor={T.muted}
            value={desperateAnswers.mustHaves}
            onChangeText={v => setDesperateAnswers(a => ({ ...a, mustHaves: v }))}
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={{ backgroundColor: T.red, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 12 }}
            onPress={() => runDesperateGeneration(desperateAnswers)}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 2 }}>MAKE MY LIST →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 12 }}
            onPress={() => runDesperateGeneration({ ...desperateAnswers, mustHaves: '' })}
          >
            <Text style={{ color: T.muted, fontSize: 12, letterSpacing: 1 }}>Nothing specific — just make the list</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function renderLoading() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: T.red,
                opacity: dot,
              }}
            />
          ))}
        </View>
        <Text style={{ color: T.muted, fontSize: 14, letterSpacing: 1, textAlign: 'center', paddingHorizontal: 40 }}>
          {LOADING_TEXTS[loadingTextIdx]}
        </Text>
      </View>
    );
  }

  function renderList() {
    if (!desperateList) return null;
    const overBudget = groceryRemaining !== null && estimatedTotal > groceryRemaining;
    const withinBudget = groceryRemaining !== null && estimatedTotal <= groceryRemaining;

    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }}>
          {/* Summary strip */}
          <View style={{ backgroundColor: T.card, borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: T.text, fontSize: 13, fontWeight: '700' }}>
              {desperateList.length} items · Est. ${estimatedTotal.toFixed(0)} · {desperateAnswers.days} days · Spoon {desperateAnswers.spoons}/3
            </Text>
          </View>

          {/* Budget warning / OK */}
          {overBudget && (
            <View style={{
              backgroundColor: T.red + '15', borderWidth: 1, borderColor: T.red + '40',
              borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8,
            }}>
              <AlertTriangle size={16} color={T.red} />
              <Text style={{ color: T.red, fontSize: 12, flex: 1 }}>
                Est. ${estimatedTotal.toFixed(0)} · Grocery envelope has ${groceryRemaining!.toFixed(0)} left
              </Text>
            </View>
          )}
          {withinBudget && (
            <View style={{
              backgroundColor: T.green + '15', borderWidth: 1, borderColor: T.green + '40',
              borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8,
            }}>
              <Check size={16} color={T.green} />
              <Text style={{ color: T.green, fontSize: 12, flex: 1 }}>
                Within your grocery envelope (${groceryRemaining!.toFixed(0)} available)
              </Text>
            </View>
          )}

          {/* Grouped items */}
          {categories.map(cat => {
            const catItems = (desperateList ?? []).filter(i => i.category === cat);
            if (!catItems.length) return null;
            return (
              <View key={cat} style={{ marginBottom: 20 }}>
                <Text style={{
                  color: T.red, fontSize: 10, fontWeight: '800', letterSpacing: 4,
                  borderLeftWidth: 3, borderLeftColor: T.red, paddingLeft: 10, marginBottom: 12,
                }}>
                  {cat}
                </Text>
                {catItems.map((item, catIdx) => {
                  const globalIdx = (desperateList ?? []).indexOf(item);
                  const checked = checkedItems.has(globalIdx);
                  return (
                    <View
                      key={globalIdx}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border + '30',
                      }}
                    >
                      <AnimatedCheckbox
                        checked={checked}
                        onToggle={() => {
                          setCheckedItems(prev => {
                            const next = new Set(prev);
                            if (next.has(globalIdx)) next.delete(globalIdx);
                            else next.add(globalIdx);
                            return next;
                          });
                        }}
                        color={T.red}
                        size={22}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: checked ? T.muted : T.text,
                          fontSize: 15, fontWeight: '500',
                          textDecorationLine: checked ? 'line-through' : 'none',
                        }}>
                          {item.name}
                        </Text>
                        {item.note ? (
                          <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{item.note}</Text>
                        ) : null}
                      </View>
                      <Text style={{ color: T.muted, fontSize: 12 }}>${item.estimated_cost?.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom bar */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.border + '40',
          paddingHorizontal: 20, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          gap: 8,
        }}>
          {addedToList ? (
            <View style={{ alignItems: 'center', padding: 16 }}>
              <Text style={{ color: T.green, fontWeight: '800', fontSize: 14, letterSpacing: 1 }}>
                ✓ Added to your Shopping List
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={{ backgroundColor: T.accent, borderRadius: 14, padding: 16, alignItems: 'center' }}
                onPress={handleAddToShoppingList}
              >
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>
                  ADD TO SHOPPING LIST
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 14,
                    alignItems: 'center', borderWidth: 1, borderColor: T.border,
                  }}
                  onPress={handleShareWithPartner}
                >
                  <Text style={{ color: T.text, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>SHARE WITH PARTNER</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 14,
                    alignItems: 'center', borderWidth: 1, borderColor: T.border,
                  }}
                  onPress={() => {
                    setDesperateStage('questions');
                    setDesperateQuestion(0);
                    setDesperateList(null);
                    setCheckedItems(new Set());
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} color={T.muted} />
                    <Text style={{ color: T.muted, fontSize: 12, letterSpacing: 1 }}>REGENERATE</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  const desperateOverlay = showDesperateMode ? (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 100, backgroundColor: T.bg,
    }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 14,
          borderBottomWidth: desperateStage === 'list' ? 1 : 0,
          borderBottomColor: T.border + '30',
        }}>
          {desperateStage === 'questions' && desperateQuestion > 0 ? (
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
                borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
              }}
              onPress={() => setDesperateQuestion(q => Math.max(0, q - 1))}
            >
              <ChevronLeft size={16} color={T.muted} />
              <Text style={{ color: T.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>BACK</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
          <Text style={{ color: T.red, fontSize: 13, fontWeight: '900', letterSpacing: 4 }}>
            {desperateStage === 'list' ? '🛒 YOUR LIST' : 'DESPERATE MODE'}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
              borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
            }}
            onPress={() => setShowDesperateMode(false)}
          >
            <Text style={{ color: T.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {desperateStage === 'questions' && (
          <>
            <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
              <Text style={{ color: T.muted, fontSize: 13, letterSpacing: 1 }}>
                Answer fast. We'll handle the rest.
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {renderQuestions()}
            </View>
          </>
        )}
        {desperateStage === 'loading' && renderLoading()}
        {desperateStage === 'list' && renderList()}
      </SafeAreaView>
    </View>
  ) : null;

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
              onDesperate={openDesperateMode}
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
            <RecipeDetail T={T} recipe={selectedRecipe} />
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

      {desperateOverlay}
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
