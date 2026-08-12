import { useMemo, useState } from 'react';
import { foodDatabase as rawFoodDatabase } from './foodData';

const activityLevels = [
  { value: 1.2, label: 'Sedentary' },
  { value: 1.375, label: 'Lightly active' },
  { value: 1.55, label: 'Moderately active' },
  { value: 1.725, label: 'Very active' },
  { value: 1.9, label: 'Extremely active' },
];

const bmiCategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obesity';
};

const formatNumber = (value) => Number(value).toFixed(1);

const toMetric = ({ weight, weightUnit, height, heightUnit }) => {
  const weightKg = weightUnit === 'lb' ? weight * 0.453592 : weight;
  const heightCm = heightUnit === 'in' ? height * 2.54 : height;
  return { weightKg, heightCm };
};

// derive calories (kcal) from macros when not provided: 4 kcal/g for protein/carbs, 9 kcal/g for fat
const foodDatabase = rawFoodDatabase.map((f) => ({
  ...f,
  calories: f.calories ? f.calories : Math.round((Number(f.protein || 0) * 4 + Number(f.carbs || 0) * 4 + Number(f.fat || 0) * 9) * 10) / 10,
  baseGram: f.baseGram || 100,
}));

export default function App() {
  const [profile, setProfile] = useState({
    age: 30,
    sex: 'female',
    height: 170,
    heightUnit: 'cm',
    weight: 70,
    weightUnit: 'kg',
    activity: 1.55,
  });

  const [macroRatio, setMacroRatio] = useState({ protein: 30, carbs: 40, fat: 30 });
  // foodEntry includes `grams` to allow scaling based on grams input
  const [foodEntry, setFoodEntry] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', grams: 100 });
  const [selectedFood, setSelectedFood] = useState('');
  const [items, setItems] = useState([]);
  const [nutritionPlan, setNutritionPlan] = useState([]);

  const roundValue = (value) => Math.round(value);

  const generateNutritionPlan = () => {
    const totalCalories = metrics.tdee;
    const totalProtein = metrics.proteinGrams;
    const totalCarbs = metrics.carbsGrams;
    const totalFat = metrics.fatGrams;
    setNutritionPlan([
      {
        name: 'Breakfast',
        calories: roundValue(totalCalories * 0.27),
        protein: roundValue(totalProtein * 0.27),
        carbs: roundValue(totalCarbs * 0.27),
        fat: roundValue(totalFat * 0.27),
        selectedFoods: [],
      },
      {
        name: 'Lunch',
        calories: roundValue(totalCalories * 0.30),
        protein: roundValue(totalProtein * 0.30),
        carbs: roundValue(totalCarbs * 0.30),
        fat: roundValue(totalFat * 0.30),
        selectedFoods: [],
      },
      {
        name: 'Dinner',
        calories: roundValue(totalCalories * 0.30),
        protein: roundValue(totalProtein * 0.30),
        carbs: roundValue(totalCarbs * 0.30),
        fat: roundValue(totalFat * 0.30),
        selectedFoods: [],
      },
      {
        name: 'Snacks',
        calories: roundValue(totalCalories * 0.13),
        protein: roundValue(totalProtein * 0.13),
        carbs: roundValue(totalCarbs * 0.13),
        fat: roundValue(totalFat * 0.13),
        selectedFoods: [],
      },
    ]);
  };

  const addMealFood = (index, foodName, grams = 100) => {
    if (!foodName) return;
    setNutritionPlan((prev) => {
      const plan = [...prev];
      const entry = { name: foodName, grams: Number(grams) || 0 };
      plan[index] = { ...plan[index], selectedFoods: [...(plan[index].selectedFoods || []), entry] };
      return plan;
    });
  };

  const removeMealFood = (index, foodIdx) => {
    setNutritionPlan((prev) => {
      const plan = [...prev];
      plan[index] = { ...plan[index], selectedFoods: plan[index].selectedFoods.filter((_, i) => i !== foodIdx) };
      return plan;
    });
  };

  const updateMealGrams = (index, foodIdx, grams) => {
    grams = Number(grams) || 0;
    setNutritionPlan((prev) => {
      const plan = [...prev];
      const foods = [...(plan[index].selectedFoods || [])];
      if (!foods[foodIdx]) return plan;
      foods[foodIdx] = { ...foods[foodIdx], grams };
      plan[index] = { ...plan[index], selectedFoods: foods };
      return plan;
    });
  };

  const mealFoodContribution = (meal) => {
    const foods = meal.selectedFoods || [];
    return foods.reduce(
      (acc, f) => {
        const food = foodDatabase.find((d) => d.name === f.name) || items.find((d) => d.name === f.name);
        if (!food) return acc;
        const scale = (f.grams || 0) / 100;
        acc.calories += Math.round((food.calories || 0) * scale);
        acc.protein += Math.round((food.protein || 0) * scale * 10) / 10;
        acc.carbs += Math.round((food.carbs || 0) * scale * 10) / 10;
        acc.fat += Math.round((food.fat || 0) * scale * 10) / 10;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  };

  const handleFoodSelect = (foodName) => {
    const food = foodDatabase.find((item) => item.name === foodName);
    if (!food) {
      setSelectedFood('');
      setFoodEntry({ name: '', calories: '', protein: '', carbs: '', fat: '', grams: 100 });
      return;
    }

    const grams = food.baseGram || 100;
    const scale = grams / 100;

    setSelectedFood(food.name);
    setFoodEntry({
      name: food.name,
      grams,
      calories: Math.round((food.calories || 0) * scale),
      protein: Math.round((food.protein || 0) * scale * 10) / 10,
      carbs: Math.round((food.carbs || 0) * scale * 10) / 10,
      fat: Math.round((food.fat || 0) * scale * 10) / 10,
    });
  };

  const handleFoodGramsChange = (grams) => {
    grams = Number(grams) || 0;
    setFoodEntry((prev) => {
      const food = foodDatabase.find((f) => f.name === prev.name);
      if (!food) return { ...prev, grams };
      const scale = grams / 100;
      return {
        ...prev,
        grams,
        calories: Math.round((food.calories || 0) * scale),
        protein: Math.round((food.protein || 0) * scale * 10) / 10,
        carbs: Math.round((food.carbs || 0) * scale * 10) / 10,
        fat: Math.round((food.fat || 0) * scale * 10) / 10,
      };
    });
  };

  const metrics = useMemo(() => {
    const { weightKg, heightCm } = toMetric(profile);
    const heightM = heightCm / 100;
    const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
    const isMale = profile.sex === 'male';
    const bmr = isMale
      ? 10 * weightKg + 6.25 * heightCm - 5 * profile.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * profile.age - 161;
    const tdee = bmr * profile.activity;
    const proteinGrams = (tdee * (macroRatio.protein / 100)) / 4;
    const carbsGrams = (tdee * (macroRatio.carbs / 100)) / 4;
    const fatGrams = (tdee * (macroRatio.fat / 100)) / 9;

    return {
      bmi,
      bmiLabel: bmiCategory(bmi),
      bmr,
      tdee,
      proteinGrams,
      carbsGrams,
      fatGrams,
    };
  }, [profile, macroRatio]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.calories += Number(item.calories) || 0;
          acc.protein += Number(item.protein) || 0;
          acc.carbs += Number(item.carbs) || 0;
          acc.fat += Number(item.fat) || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [items],
  );

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleFoodAdd = () => {
    if (!foodEntry.name.trim() || !foodEntry.calories) return;
    setItems((prev) => [
      ...prev,
      {
        ...foodEntry,
        calories: Number(foodEntry.calories),
        protein: Number(foodEntry.protein),
        carbs: Number(foodEntry.carbs),
        fat: Number(foodEntry.fat),
        grams: Number(foodEntry.grams) || 0,
      },
    ]);
    setFoodEntry({ name: '', calories: '', protein: '', carbs: '', fat: '', grams: 100 });
    setSelectedFood('');
  };

  const savePlan = () => {
    try {
      localStorage.setItem('nutritionPlan', JSON.stringify(nutritionPlan));
      alert('Plan saved locally');
    } catch (e) {
      console.error(e);
      alert('Could not save plan');
    }
  };

  const loadPlan = () => {
    try {
      const raw = localStorage.getItem('nutritionPlan');
      if (!raw) return alert('No saved plan found');
      setNutritionPlan(JSON.parse(raw));
    } catch (e) {
      console.error(e);
      alert('Could not load plan');
    }
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Nutrition</span>
          <h1>Assessment Calculator</h1>
          <p>Minimal web design for body metrics and food tracking.</p>
        </div>
        <div className="hero-overview">
          <div>
            <strong>{formatNumber(metrics.tdee)}</strong>
            <span>Daily goal</span>
          </div>
          <div>
            <strong>{formatNumber(metrics.bmi)}</strong>
            <span>BMI</span>
          </div>
        </div>
      </header>

      <section className="card">
        <h2>Profile</h2>
        <div className="form-grid">
          <label>
            Age
            <input type="number" min="10" value={profile.age} onChange={(e) => updateProfile('age', Number(e.target.value))} />
          </label>
          <label>
            Sex
            <select value={profile.sex} onChange={(e) => updateProfile('sex', e.target.value)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label>
            Weight
            <div className="inline-group">
              <input type="number" min="1" value={profile.weight} onChange={(e) => updateProfile('weight', Number(e.target.value))} />
              <select value={profile.weightUnit} onChange={(e) => updateProfile('weightUnit', e.target.value)}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </label>
          <label>
            Height
            <div className="inline-group">
              <input type="number" min="1" value={profile.height} onChange={(e) => updateProfile('height', Number(e.target.value))} />
              <select value={profile.heightUnit} onChange={(e) => updateProfile('heightUnit', e.target.value)}>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </label>
          <label className="full-width">
            Activity
            <select value={profile.activity} onChange={(e) => updateProfile('activity', Number(e.target.value))}>
              {activityLevels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Results</h2>
        <div className="result-grid">
          <div className="result-card">
            <strong>{formatNumber(metrics.bmi)}</strong>
            <span>BMI • {metrics.bmiLabel}</span>
          </div>
          <div className="result-card">
            <strong>{formatNumber(metrics.bmr)} kcal</strong>
            <span>BMR</span>
          </div>
          <div className="result-card">
            <strong>{formatNumber(metrics.tdee)} kcal</strong>
            <span>TDEE</span>
          </div>
          <div className="result-card">
            <strong>{formatNumber(metrics.proteinGrams)}g</strong>
            <span>Protein</span>
          </div>
          <div className="result-card">
            <strong>{formatNumber(metrics.carbsGrams)}g</strong>
            <span>Carbs</span>
          </div>
          <div className="result-card">
            <strong>{formatNumber(metrics.fatGrams)}g</strong>
            <span>Fat</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Macro ratio</h2>
        <div className="macro-grid">
          {['protein', 'carbs', 'fat'].map((macro) => (
            <label key={macro}>
              {macro.toUpperCase()}
              <input
                type="number"
                min="0"
                max="100"
                value={macroRatio[macro]}
                onChange={(e) => setMacroRatio((prev) => ({ ...prev, [macro]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <p className="hint">Macro targets are based on your TDEE.</p>
      </section>

      <section className="card">
        <h2>Food log</h2>
        <div className="food-grid">
          <label>
            Food item
            <select value={selectedFood} onChange={(e) => handleFoodSelect(e.target.value)}>
              <option value="">Choose from database</option>
              {foodDatabase.map((food) => (
                <option key={food.name} value={food.name}>
                  {food.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item name
            <input
              placeholder="Custom name"
              value={foodEntry.name}
              onChange={(e) => setFoodEntry((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label>
            Grams
            <input
              type="number"
              min="0"
              value={foodEntry.grams}
              onChange={(e) => handleFoodGramsChange(e.target.value)}
            />
          </label>
          <label>
            Calories
            <input
              type="number"
              placeholder="Calories"
              value={foodEntry.calories}
              onChange={(e) => setFoodEntry((prev) => ({ ...prev, calories: e.target.value }))}
            />
          </label>
          <label>
            Protein
            <input
              type="number"
              placeholder="Protein"
              value={foodEntry.protein}
              onChange={(e) => setFoodEntry((prev) => ({ ...prev, protein: e.target.value }))}
            />
          </label>
          <label>
            Carbs
            <input
              type="number"
              placeholder="Carbs"
              value={foodEntry.carbs}
              onChange={(e) => setFoodEntry((prev) => ({ ...prev, carbs: e.target.value }))}
            />
          </label>
          <label>
            Fat
            <input
              type="number"
              placeholder="Fat"
              value={foodEntry.fat}
              onChange={(e) => setFoodEntry((prev) => ({ ...prev, fat: e.target.value }))}
            />
          </label>
        </div>
        <button type="button" className="primary-button" onClick={handleFoodAdd}>
          Add item
        </button>

        {items.length > 0 ? (
          <ul className="food-list">
            {items.map((item, idx) => (
              <li key={`${item.name}-${idx}`}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.calories} kcal</span>
                </div>
                <div className="food-details">
                  <span>{item.protein || 0}g P</span>
                  <span>{item.carbs || 0}g C</span>
                  <span>{item.fat || 0}g F</span>
                </div>
                <button className="link-button" type="button" onClick={() => removeItem(idx)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Add food items to track your totals.</p>
        )}

        {items.length > 0 && (
          <div className="log-summary">
            <div>
              <span>Total calories</span>
              <strong>{totals.calories}</strong>
            </div>
            <div>
              <span>Protein</span>
              <strong>{totals.protein}g</strong>
            </div>
            <div>
              <span>Carbs</span>
              <strong>{totals.carbs}g</strong>
            </div>
            <div>
              <span>Fat</span>
              <strong>{totals.fat}g</strong>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="plan-header">
          <div>
            <h2>Nutrition plan</h2>
            <p>Use your TDEE and macro targets to split meals for the day.</p>
          </div>
          <button type="button" className="secondary-button" onClick={generateNutritionPlan}>
            Generate plan
          </button>
        </div>

        {nutritionPlan.length > 0 ? (
          <div>
            <div className="plan-grid">
              {nutritionPlan.map((meal, idx) => {
                const contrib = mealFoodContribution(meal);
                return (
                  <div key={meal.name} className="plan-card">
                    <strong>{meal.name}</strong>
                    <span>{meal.calories} kcal</span>

                    <div className="inline-group">
                      <label>
                        Pick (DB)
                        <select defaultValue="" onChange={(e) => addMealFood(idx, e.target.value, 100)}>
                          <option value="">— choose —</option>
                          {foodDatabase.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Pick (Log)
                        <select defaultValue="" onChange={(e) => addMealFood(idx, e.target.value, 100)}>
                          <option value="">— choose —</option>
                          {items.map((it, i) => (
                            <option key={`${it.name}-${i}`} value={it.name}>
                              {it.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {meal.selectedFoods && meal.selectedFoods.length > 0 && (
                      <ul className="food-list">
                        {meal.selectedFoods.map((f, fi) => (
                          <li key={`${f.name}-${fi}`}>
                            <div>
                              <strong>{f.name}</strong>
                              <span>
                                <input
                                  type="number"
                                  value={f.grams}
                                  min={0}
                                  onChange={(e) => updateMealGrams(idx, fi, Number(e.target.value))}
                                  style={{ width: 80 }}
                                />
                                g
                              </span>
                            </div>
                            <div className="food-details">
                              <span>
                                {Math.round(((foodDatabase.find((d) => d.name === f.name) || items.find((d) => d.name === f.name))?.calories || 0) * (f.grams || 0) / 100)} kcal
                              </span>
                            </div>
                            <button className="link-button" type="button" onClick={() => removeMealFood(idx, fi)}>
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="plan-macros">
                      <span>Target: {meal.calories} kcal</span>
                      <span>Food: {contrib.calories} kcal</span>
                      <span>Remaining: {meal.calories - contrib.calories} kcal</span>
                    </div>

                    <div className="plan-macros">
                      <span>{meal.protein}g P</span>
                      <span>{meal.carbs}g C</span>
                      <span>{meal.fat}g F</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="button" className="secondary-button" onClick={savePlan} style={{ marginRight: 8 }}>
                Save plan
              </button>
              <button type="button" className="secondary-button" onClick={loadPlan}>
                Load plan
              </button>
            </div>
          </div>
        ) : (
          <p className="hint">Click generate to create a daily nutrition plan.</p>
        )}
      </section>
    </div>
  );
}
