import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NutritionMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  category: "breakfast" | "lunch" | "dinner" | "snack";
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export type GoalType = "lose" | "maintain" | "gain";

function todayStr() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function goalTypeFromDB(val: string): GoalType {
  if (val === "lose" || val === "maintain" || val === "gain") return val;
  return "maintain";
}

function categoryFromDB(val: string): NutritionMeal["category"] {
  const allowed = ["breakfast", "lunch", "dinner", "snack"] as const;
  return (allowed as readonly string[]).includes(val)
    ? (val as NutritionMeal["category"])
    : "snack";
}

export function useNutritionData() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [water, setWaterState] = useState(0);
  const [goal, setGoalState] = useState<GoalType>("maintain");
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load data from DB ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!uid) {
      setMeals([]);
      setWaterState(0);
      setGoalState("maintain");
      setWeightLog([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = todayStr();

    const [mealsRes, dailyRes, weightRes] = await Promise.all([
      supabase
        .from("nutrition_meals")
        .select("*")
        .eq("user_id", uid)
        .eq("meal_date", today)
        .order("meal_time"),
      supabase
        .from("nutrition_daily_logs")
        .select("*")
        .eq("user_id", uid)
        .eq("log_date", today)
        .maybeSingle(),
      supabase
        .from("nutrition_daily_logs")
        .select("log_date, weight")
        .eq("user_id", uid)
        .not("weight", "is", null)
        .order("log_date", { ascending: false })
        .limit(7),
    ]);

    // Meals
    setMeals(
      (mealsRes.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        calories: r.calories,
        protein: Number(r.protein),
        carbs: Number(r.carbs),
        fat: Number(r.fat),
        time: r.meal_time,
        category: categoryFromDB(r.category),
      }))
    );

    // Daily log (water + goal)
    if (dailyRes.data) {
      setWaterState(dailyRes.data.water_glasses ?? 0);
      setGoalState(goalTypeFromDB(dailyRes.data.goal_type ?? "maintain"));
    }

    // Weight history
    if (weightRes.data && weightRes.data.length > 0) {
      const entries = weightRes.data
        .slice()
        .reverse()
        .map((r) => ({
          date: new Date(r.log_date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          weight: Number(r.weight),
        }));
      setWeightLog(entries);
    }

    setLoading(false);
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Upsert today's daily log ───────────────────────────────────────────────
  const upsertDailyLog = useCallback(
    async (updates: { water_glasses?: number; goal_type?: string; weight?: number }) => {
      if (!uid) return;
      const today = todayStr();
      await supabase.from("nutrition_daily_logs").upsert(
        { user_id: uid, log_date: today, ...updates },
        { onConflict: "user_id,log_date" }
      );
    },
    [uid]
  );

  // ── Water ─────────────────────────────────────────────────────────────────
  const setWater = useCallback(
    (value: number | ((prev: number) => number)) => {
      setWaterState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        upsertDailyLog({ water_glasses: next });
        return next;
      });
    },
    [upsertDailyLog]
  );

  // ── Goal ──────────────────────────────────────────────────────────────────
  const setGoal = useCallback(
    (g: GoalType) => {
      setGoalState(g);
      upsertDailyLog({ goal_type: g });
    },
    [upsertDailyLog]
  );

  // ── Add meal ──────────────────────────────────────────────────────────────
  const addMeal = useCallback(
    async (meal: Omit<NutritionMeal, "id">) => {
      if (!uid) return;
      const today = todayStr();
      const { data, error } = await supabase
        .from("nutrition_meals")
        .insert({
          user_id: uid,
          meal_date: today,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          meal_time: meal.time,
          category: meal.category,
        })
        .select()
        .single();

      if (!error && data) {
        const newMeal: NutritionMeal = {
          id: data.id,
          name: data.name,
          calories: data.calories,
          protein: Number(data.protein),
          carbs: Number(data.carbs),
          fat: Number(data.fat),
          time: data.meal_time,
          category: categoryFromDB(data.category),
        };
        setMeals((prev) => [...prev, newMeal]);
      }
    },
    [uid]
  );

  // ── Delete meal ───────────────────────────────────────────────────────────
  const deleteMeal = useCallback(
    async (id: string) => {
      setMeals((prev) => prev.filter((m) => m.id !== id));
      if (uid) {
        await supabase.from("nutrition_meals").delete().eq("id", id).eq("user_id", uid);
      }
    },
    [uid]
  );

  // ── Log weight ────────────────────────────────────────────────────────────
  const logWeight = useCallback(
    async (weightValue: number) => {
      if (!uid || isNaN(weightValue)) return;
      await upsertDailyLog({ weight: weightValue });
      const today = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      setWeightLog((prev) => {
        const filtered = prev.filter((e) => e.date !== today);
        return [...filtered.slice(-6), { date: today, weight: weightValue }];
      });
    },
    [uid, upsertDailyLog]
  );

  return {
    meals,
    water,
    setWater,
    goal,
    setGoal,
    weightLog,
    logWeight,
    addMeal,
    deleteMeal,
    loading,
    reload: loadData,
  };
}
