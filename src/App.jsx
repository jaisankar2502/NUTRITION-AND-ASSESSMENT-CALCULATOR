import { useMemo, useState, useEffect } from 'react';
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

// BMI scale is displayed across a fixed 15-35 range so the marker position
// and zone widths below line up with the standard 18.5 / 25 / 30 breakpoints.
const BMI_SCALE_MIN = 15;
const BMI_SCALE_MAX = 35;
const bmiScalePosition = (bmi) => {
  const clamped = Math.min(Math.max(bmi, BMI_SCALE_MIN), BMI_SCALE_MAX);
  return ((clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100;
};

const mealIcons = { Breakfast: 'coffee', Lunch: 'sandwich', Dinner: 'moonMeal', Snacks: 'apple' };
const mealTimes = { Breakfast: '7:30 AM', Lunch: '12:30 PM', Dinner: '7:30 PM', Snacks: '4:00 PM' };
const macroIcons = { protein: 'drumstick', carbs: 'wheat', fat: 'droplet' };
const macroTones = { protein: 'green', carbs: 'amber', fat: 'rose' };

// Calorie ring geometry: an SVG circle's stroke-dasharray/offset trick draws
// a circular progress arc without any charting library.
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Small hand-authored line-icon set (no icon font/library) so every icon
// inherits color via currentColor and stays crisp at any size/theme.
const ICON_PATHS = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  calendarCheck: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 15 2 2 4-4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  scaleWeight: <><circle cx="12" cy="13" r="8" /><path d="M9 3h6M12 3v3M9.5 10.5l2.5 2.5" /></>,
  ruler: <><path d="M3 16.5 16.5 3l4.5 4.5L7.5 21z" /><path d="M13 6.5 15 8.5M9.5 10 11.5 12M6 13.5 8 15.5" /></>,
  activity: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  gauge: <><path d="M4 16a8 8 0 0 1 16 0" /><path d="M12 16 15.5 10" /><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" /><path d="M4 16v2M20 16v2M12 8v2" /></>,
  flame: <path d="M12 2c1 4-4 5-4 9a4 4 0 0 0 8 0c0-2-1-3-1-3s2 1 2 5a6 6 0 0 1-12 0c0-5 3-6 4-11 1 1 2 0 3 0Z" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" /></>,
  drumstick: <path d="M15 11a5 5 0 1 0-7-7c-2 2-2 5-1 7l-4 4a2 2 0 1 0 3 3l4-4c2 1 5 1 7-1Z" />,
  wheat: <><path d="M12 22V9" /><path d="M12 3c1 1 1 3 0 4-1-1-1-3 0-4ZM8.7 5.8c1.3.5 2 2.2 1.2 3.5-1.3-.5-2-2.2-1.2-3.5ZM15.3 5.8c-1.3.5-2 2.2-1.2 3.5 1.3-.5 2-2.2 1.2-3.5ZM6.8 10.2c1.4.3 2.4 1.9 1.7 3.3-1.4-.3-2.4-1.9-1.7-3.3ZM17.2 10.2c-1.4.3-2.4 1.9-1.7 3.3 1.4-.3 2.4-1.9 1.7-3.3Z" /></>,
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" />,
  save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
  folderOpen: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2Zm0 3 1.4 7.1A2 2 0 0 0 6.4 19H18a2 2 0 0 0 2-1.9L21 10Z" />,
  sparkles: <><path d="M12 3v4M12 17v4M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" /><path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" /></>,
  coffee: <><path d="M4 8h13a3 3 0 0 1 0 6h-1" /><path d="M4 8v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8" /><path d="M6 4c0 1-1 1-1 2M10 4c0 1-1 1-1 2" /></>,
  sandwich: <><path d="M3 12h18" /><path d="M4 12 6 6h12l2 6" /><path d="m4 12 1 6h14l1-6" /></>,
  moonMeal: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
  apple: <><path d="M12 8c-3-2-7 0-7 5a8 8 0 0 0 7 8 8 8 0 0 0 7-8c0-5-4-7-7-5Z" /><path d="M12 8V5a2 2 0 0 1 2-2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></>,
  utensils: <><path d="M6 2v7a2 2 0 0 0 4 0V2M8 9v13" /><path d="M17 2c-1.7 0-3 2-3 4.5S15.3 11 17 11v11" /></>,
  pieChart: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l7 4" /></>,
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  check: <path d="M4 12l5 5L20 6" />,
};

const Icon = ({ name, size = 18, className = '', ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`icon${className ? ` ${className}` : ''}`}
    aria-hidden="true"
    {...rest}
  >
    {ICON_PATHS[name]}
  </svg>
);

const formatNumber = (value) => Number(value).toFixed(1);

// Parses a number <input>'s raw text and rewrites the DOM value to the clean
// numeric string in the same tick, so stray leading zeros (e.g. "025") can't
// stick around when the parsed number happens to match the previous state
// (React skips the DOM update when a controlled value prop doesn't change).
const parseNumberInput = (e) => {
  const raw = e.target.value;
  const num = raw === '' ? 0 : Number(raw) || 0;
  e.target.value = String(num);
  return num;
};

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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  // apply theme class to document
  useEffect(() => {
    // toggle class on body so CSS selectors using body.theme-dark apply correctly
    document.body.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);

  const accentColors = ['#0d9488', '#64748b', '#d97706', '#dc2626'];

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
  const [editingMealIndex, setEditingMealIndex] = useState(null);
  const [editorPageOpen, setEditorPageOpen] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState({});
  const [editorSearch, setEditorSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

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

  const openMealEditorPage = (index) => {
    setEditingMealIndex(index);
    setEditorPageOpen(true);
  };

  const closeMealEditorPage = () => {
    setEditorPageOpen(false);
    setEditingMealIndex(null);
  };

  const toggleAccordion = (index) => {
    setExpandedMeals((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCardClick = (index) => {
    const meal = nutritionPlan[index];
    const hasFoods = (meal?.selectedFoods || []).length > 0;
    if (!hasFoods) openMealEditorPage(index);
    else toggleAccordion(index);
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

  const macroRatioTotal = macroRatio.protein + macroRatio.carbs + macroRatio.fat;
  const macroBarPct = (macro) => (macroRatioTotal > 0 ? (macroRatio[macro] / macroRatioTotal) * 100 : 0);

  const caloriePct = metrics.tdee > 0 ? Math.min(100, (totals.calories / metrics.tdee) * 100) : 0;
  const calorieOver = totals.calories > metrics.tdee;
  const calorieRemaining = Math.max(0, Math.round(metrics.tdee - totals.calories));

  const macroActualPct = (macro) => {
    const target = metrics[`${macro}Grams`];
    return target > 0 ? Math.min(100, (totals[macro] / target) * 100) : 0;
  };

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

  const copyToClipboard = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch (e) {
      console.error(e);
      alert('Could not copy to clipboard');
    }
  };

  const buildResultsText = () =>
    [
      'Results',
      `BMI: ${formatNumber(metrics.bmi)} (${metrics.bmiLabel})`,
      `BMR: ${formatNumber(metrics.bmr)} kcal`,
      `TDEE: ${formatNumber(metrics.tdee)} kcal`,
      `Protein target: ${formatNumber(metrics.proteinGrams)}g`,
      `Carbs target: ${formatNumber(metrics.carbsGrams)}g`,
      `Fat target: ${formatNumber(metrics.fatGrams)}g`,
    ].join('\n');

  const buildMacroText = () =>
    [
      'Macro ratio',
      `Protein: ${macroRatio.protein}% (${formatNumber(metrics.proteinGrams)}g)`,
      `Carbs: ${macroRatio.carbs}% (${formatNumber(metrics.carbsGrams)}g)`,
      `Fat: ${macroRatio.fat}% (${formatNumber(metrics.fatGrams)}g)`,
    ].join('\n');

  const buildPlanText = () => {
    const lines = ['Nutrition plan'];
    nutritionPlan.forEach((meal) => {
      const time = mealTimes[meal.name] ? ` (${mealTimes[meal.name]})` : '';
      lines.push(`\n${meal.name}${time} — ${meal.calories} kcal`);
      const foods = meal.selectedFoods || [];
      if (foods.length === 0) {
        lines.push('  (no foods added)');
      } else {
        foods.forEach((f) => {
          const food = foodDatabase.find((d) => d.name === f.name) || items.find((d) => d.name === f.name);
          const kcal = Math.round(((food?.calories || 0) * (f.grams || 0)) / 100);
          lines.push(`  - ${f.name} (${f.grams}g) — ${kcal} kcal`);
        });
      }
    });
    lines.push(`\nDaily target: ${formatNumber(metrics.tdee)} kcal`);
    return lines.join('\n');
  };

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="brand">
          <div className="logo">NA</div>
          <div>
            <div className="brand-title">Nutrition & Assessment</div>
            <div className="brand-sub">Calculator</div>
          </div>
        </div>
        <div className="nav-actions">
          <button className="secondary-button theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </nav>

      <header className="hero">
        <div>
          <span className="eyebrow">Nutrition</span>
          <h1>Assessment Calculator</h1>
          <p>Smart daily plans, simple tracking, and clear targets — made for your customers.</p>
        </div>
        <div className="hero-overview">
          <div className="stat-tile">
            <span className="stat-icon" data-tone="cyan"><Icon name="target" /></span>
            <div>
              <strong>{formatNumber(metrics.tdee)}</strong>
              <span>Daily goal (kcal)</span>
            </div>
          </div>
          <div className="stat-tile">
            <span className="stat-icon" data-tone="violet"><Icon name="gauge" /></span>
            <div>
              <strong>{formatNumber(metrics.bmi)}</strong>
              <span>BMI • {metrics.bmiLabel}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="card">
        <h2><Icon name="user" /> Profile</h2>
        <div className="form-grid">
          <label>
            <span className="label-text"><Icon name="calendar" size={16} /> Age</span>
            <input type="number" min="10" value={profile.age} onChange={(e) => updateProfile('age', parseNumberInput(e))} />
          </label>
          <label>
            <span className="label-text"><Icon name="user" size={16} /> Sex</span>
            <select value={profile.sex} onChange={(e) => updateProfile('sex', e.target.value)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label>
            <span className="label-text"><Icon name="scaleWeight" size={16} /> Weight</span>
            <div className="inline-group">
              <input type="number" min="1" value={profile.weight} onChange={(e) => updateProfile('weight', parseNumberInput(e))} />
              <select value={profile.weightUnit} onChange={(e) => updateProfile('weightUnit', e.target.value)}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </label>
          <label>
            <span className="label-text"><Icon name="ruler" size={16} /> Height</span>
            <div className="inline-group">
              <input type="number" min="1" value={profile.height} onChange={(e) => updateProfile('height', parseNumberInput(e))} />
              <select value={profile.heightUnit} onChange={(e) => updateProfile('heightUnit', e.target.value)}>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </label>
          <label className="full-width">
            <span className="label-text"><Icon name="activity" size={16} /> Activity</span>
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
        <div className="section-header">
          <h2><Icon name="gauge" /> Results</h2>
          <button type="button" className="secondary-button" onClick={() => copyToClipboard('results', buildResultsText())}>
            <Icon name={copiedKey === 'results' ? 'check' : 'copy'} size={16} /> {copiedKey === 'results' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="result-grid">
          <div className="result-card">
            <div className="result-card-head">
              <span className="stat-icon" data-tone="violet"><Icon name="gauge" /></span>
              <div>
                <strong>{formatNumber(metrics.bmi)}</strong>
                <span>BMI • {metrics.bmiLabel}</span>
              </div>
            </div>
            <div className="bmi-scale" aria-hidden="true">
              <div className="bmi-scale-track">
                <span className="bmi-scale-marker" style={{ left: `${bmiScalePosition(metrics.bmi)}%` }} />
              </div>
              <div className="bmi-scale-labels">
                <span>Under</span>
                <span>Normal</span>
                <span>Over</span>
                <span>Obese</span>
              </div>
            </div>
          </div>
          <div className="result-card">
            <div className="result-card-head">
              <span className="stat-icon" data-tone="amber"><Icon name="flame" /></span>
              <div>
                <strong>{formatNumber(metrics.bmr)} kcal</strong>
                <span>BMR</span>
              </div>
            </div>
          </div>
          <div className="result-card">
            <div className="result-card-head">
              <span className="stat-icon" data-tone="cyan"><Icon name="target" /></span>
              <div>
                <strong>{formatNumber(metrics.tdee)} kcal</strong>
                <span>TDEE</span>
              </div>
            </div>
          </div>
          <div className="result-card">
            <div className="result-card-head">
              <span className="stat-icon" data-tone="green"><Icon name="drumstick" /></span>
              <div>
                <strong>{formatNumber(metrics.proteinGrams)}g</strong>
                <span>Protein</span>
              </div>
            </div>
          </div>
          <div className="result-card">
            <div className="result-card-head">
              <span className="stat-icon" data-tone="amber"><Icon name="wheat" /></span>
              <div>
                <strong>{formatNumber(metrics.carbsGrams)}g</strong>
                <span>Carbs</span>
              </div>
            </div>
          </div>
          <div className="result-card">
            <div className="result-card-head">
              <span className="stat-icon" data-tone="rose"><Icon name="droplet" /></span>
              <div>
                <strong>{formatNumber(metrics.fatGrams)}g</strong>
                <span>Fat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2><Icon name="pieChart" /> Macro ratio</h2>
          <button type="button" className="secondary-button" onClick={() => copyToClipboard('macro', buildMacroText())}>
            <Icon name={copiedKey === 'macro' ? 'check' : 'copy'} size={16} /> {copiedKey === 'macro' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="macro-bar" role="img" aria-label={`Protein ${macroRatio.protein}%, carbs ${macroRatio.carbs}%, fat ${macroRatio.fat}%`}>
          <span className="macro-bar-segment" data-tone="green" style={{ width: `${macroBarPct('protein')}%` }} />
          <span className="macro-bar-segment" data-tone="amber" style={{ width: `${macroBarPct('carbs')}%` }} />
          <span className="macro-bar-segment" data-tone="rose" style={{ width: `${macroBarPct('fat')}%` }} />
        </div>
        <div className="macro-bar-legend">
          <span><i data-tone="green" />Protein {macroRatio.protein}%</span>
          <span><i data-tone="amber" />Carbs {macroRatio.carbs}%</span>
          <span><i data-tone="rose" />Fat {macroRatio.fat}%</span>
        </div>
        <div className="macro-grid">
          {['protein', 'carbs', 'fat'].map((macro) => (
            <label key={macro}>
              <span className="label-text"><Icon name={macroIcons[macro]} size={16} /> {macro.toUpperCase()}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={macroRatio[macro]}
                onChange={(e) => setMacroRatio((prev) => ({ ...prev, [macro]: parseNumberInput(e) }))}
              />
            </label>
          ))}
        </div>
        <p className="hint">
          Macro targets are based on your TDEE.
          {macroRatioTotal !== 100 ? ` Currently totals ${macroRatioTotal}% — adjust to 100% for exact gram targets.` : ''}
        </p>
      </section>

      <section className="card">
        <h2><Icon name="utensils" /> Food log</h2>

        <div className="log-analytics">
          <div className="calorie-ring-card">
            <div className="calorie-ring">
              <svg viewBox="0 0 120 120">
                <circle className="ring-track" cx="60" cy="60" r={RING_RADIUS} />
                <circle
                  className="ring-fill"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  style={{
                    strokeDasharray: RING_CIRCUMFERENCE,
                    strokeDashoffset: RING_CIRCUMFERENCE * (1 - caloriePct / 100),
                    stroke: calorieOver ? '#dc2626' : 'url(#ringGradient)',
                  }}
                />
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="calorie-ring-center">
                <strong>{totals.calories}</strong>
                <span>kcal consumed</span>
              </div>
            </div>
            <div className="calorie-ring-meta">
              <strong>{calorieOver ? `${totals.calories - Math.round(metrics.tdee)} kcal over goal` : `${calorieRemaining} kcal remaining`}</strong>
              <span>{Math.round(caloriePct)}% of {formatNumber(metrics.tdee)} kcal goal</span>
            </div>
          </div>

          <div className="macro-progress">
            <h3>Today vs target</h3>
            {['protein', 'carbs', 'fat'].map((macro) => (
              <div className="macro-progress-row" key={macro}>
                <span className="macro-progress-label">
                  <Icon name={macroIcons[macro]} size={15} /> {macro.charAt(0).toUpperCase() + macro.slice(1)}
                </span>
                <div className="macro-progress-track">
                  <span className="macro-progress-fill" data-tone={macroTones[macro]} style={{ width: `${macroActualPct(macro)}%` }} />
                </div>
                <span className="macro-progress-value">{Math.round(totals[macro])}g / {Math.round(metrics[`${macro}Grams`])}g</span>
              </div>
            ))}
          </div>
        </div>

        <div className="food-log-grid">
          <div className="food-log-form">
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
                  onChange={(e) => handleFoodGramsChange(parseNumberInput(e))}
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
              <Icon name="plus" size={16} /> Add item
            </button>
          </div>

          <div className="food-log-list">
            {items.length > 0 ? (
              <ul className="food-list">
                {items.map((item, idx) => (
                  <li key={`${item.name}-${idx}`}>
                    <div className="food-row">
                      <div className="food-row-info">
                        <strong>{item.name}</strong>
                        <div className="food-details">
                          <span>{item.protein || 0}g P</span>
                          <span>{item.carbs || 0}g C</span>
                          <span>{item.fat || 0}g F</span>
                        </div>
                      </div>
                      <div className="food-row-actions">
                        <div className="food-cal">{item.calories} kcal</div>
                        <button className="remove-btn" type="button" onClick={() => removeItem(idx)}>
                          <Icon name="trash" size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="utensils" size={22} /></span>
                <p>Add food items to track your totals.</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="log-summary totals-card">
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
          </div>
        </div>
      </section>

      <section className="card">
        <div className="plan-header">
          <div>
            <h2><Icon name="calendarCheck" /> Nutrition plan</h2>
            <p>Use your TDEE and macro targets to split meals for the day.</p>
          </div>
          <button type="button" className="secondary-button" onClick={generateNutritionPlan}>
            <Icon name="sparkles" size={16} /> Generate plan
          </button>
        </div>

        {nutritionPlan.length > 0 ? (
          <div>
            <div className="plan-grid">
              {nutritionPlan.map((meal, idx) => {
                const contrib = mealFoodContribution(meal);
                return (
                    <div key={meal.name} className={`plan-card ${expandedMeals[idx] ? 'expanded' : 'collapsed'}`} style={{ ['--accent-color']: accentColors[idx % accentColors.length] }}>
                      <div className="header-row" onClick={() => handleCardClick(idx)} role="button" tabIndex={0} aria-label={`Open ${meal.name} details`}>
                      <div className="title">
                        <span className="meal-icon"><Icon name={mealIcons[meal.name] || 'utensils'} size={18} /></span>
                        <div>
                          <strong>{meal.name}</strong>
                          {mealTimes[meal.name] && <span className="meal-time">{mealTimes[meal.name]}</span>}
                        </div>
                      </div>
                      <div className="calorie-display">
                        <span>{meal.calories} kcal</span>
                      </div>
                    </div>

                    <div className="meal-progress-track" aria-hidden="true">
                      <span
                        className="meal-progress-fill"
                        style={{
                          width: `${meal.calories > 0 ? Math.min(100, (contrib.calories / meal.calories) * 100) : 0}%`,
                          background: contrib.calories > meal.calories ? '#fb7185' : 'var(--accent-color, #06b6d4)',
                        }}
                      />
                    </div>

                    {/* make header clickable to open meal details modal */}
                    <div style={{ height: 0 }} />

                    <div className="pick-controls">
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
                            <div className="food-info-row">
                              <strong>{f.name}</strong>
                              <button
                                className="remove-btn icon-only"
                                type="button"
                                onClick={() => removeMealFood(idx, fi)}
                                aria-label={`Remove ${f.name}`}
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            </div>
                            <div className="food-info-row food-info-meta">
                              <label className="grams-field">
                                <input
                                  type="number"
                                  value={f.grams}
                                  min={0}
                                  onChange={(e) => updateMealGrams(idx, fi, parseNumberInput(e))}
                                />
                                g
                              </label>
                              <span className="food-cal">
                                {Math.round(((foodDatabase.find((d) => d.name === f.name) || items.find((d) => d.name === f.name))?.calories || 0) * (f.grams || 0) / 100)} kcal
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="plan-macros">
                      <div className="macro-item">
                        <strong>{meal.calories} kcal</strong>
                        <small>Target</small>
                      </div>
                      <div className="macro-item">
                        <strong>{contrib.calories} kcal</strong>
                        <small>Food</small>
                      </div>
                      <div className="macro-item">
                        <strong>{meal.calories - contrib.calories} kcal</strong>
                        <small>Remaining</small>
                      </div>
                    </div>

                    {/* Removed P/C/F macros as per the requirement */}
                  </div>
                );
              })}
            </div>

            <div className="plan-actions">
              <button type="button" className="secondary-button" onClick={savePlan}>
                <Icon name="save" size={16} /> Save plan
              </button>
              <button type="button" className="secondary-button" onClick={loadPlan}>
                <Icon name="folderOpen" size={16} /> Load plan
              </button>
              <button type="button" className="secondary-button" onClick={() => copyToClipboard('plan', buildPlanText())}>
                <Icon name={copiedKey === 'plan' ? 'check' : 'copy'} size={16} /> {copiedKey === 'plan' ? 'Copied' : 'Copy plan'}
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="calendarCheck" size={22} /></span>
            <p>Click "Generate plan" to create a daily nutrition plan from your TDEE and macro targets.</p>
          </div>
        )}
      </section>

      {/* Full-page meal editor (initial setup) */}
      {editorPageOpen && editingMealIndex !== null && (
        <div className="editor-page">
          <div className="editor-header">
            <button className="link-button" onClick={closeMealEditorPage}>Back</button>
            <h2><Icon name={mealIcons[nutritionPlan[editingMealIndex].name] || 'utensils'} /> {nutritionPlan[editingMealIndex].name} — Setup</h2>
            <div />
          </div>
          <div className="editor-body">
            <div style={{ marginBottom: 12 }}>
              <label className="editor-search">
                Search foods
                <input placeholder="Search food name" value={editorSearch} onChange={(e) => setEditorSearch(e.target.value)} />
              </label>
              <div className="editor-food-list">
                {(() => {
                  const matches = foodDatabase.filter(
                    (f) => (editorSearch || '').trim() === '' || f.name.toLowerCase().includes(editorSearch.toLowerCase()),
                  );
                  if (matches.length === 0) {
                    return (
                      <div className="empty-state empty-state-compact">
                        <span className="empty-state-icon"><Icon name="search" size={20} /></span>
                        <p>No foods match "{editorSearch}".</p>
                      </div>
                    );
                  }
                  return matches.slice(0, 20).map((f) => (
                    <div key={f.name} className="editor-food-item">
                      <div>
                        <strong>{f.name}</strong>
                        <div className="food-meta">{Math.round(f.calories)} kcal • {f.protein || 0}g P • {f.carbs || 0}g C • {f.fat || 0}g F</div>
                      </div>
                      <div>
                        <button className="secondary-button" onClick={() => addMealFood(editingMealIndex, f.name, f.baseGram || 100)}>
                          <Icon name="plus" size={14} /> Add
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div>
              <h4>Selected foods</h4>
              <ul className="food-list">
                {(nutritionPlan[editingMealIndex]?.selectedFoods || []).map((f, fi) => (
                  <li key={`${f.name}-${fi}`}>
                    <div className="food-info-row">
                      <strong>{f.name}</strong>
                      <button
                        className="remove-btn icon-only"
                        type="button"
                        onClick={() => removeMealFood(editingMealIndex, fi)}
                        aria-label={`Remove ${f.name}`}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                    <div className="food-info-row food-info-meta">
                      <label className="grams-field">
                        <input type="number" min={0} value={f.grams} onChange={(e) => updateMealGrams(editingMealIndex, fi, parseNumberInput(e))} />
                        g
                      </label>
                      <span className="food-cal">
                        {Math.round(((foodDatabase.find((d) => d.name === f.name) || items.find((d) => d.name === f.name))?.calories || 0) * (f.grams || 0) / 100)} kcal
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="primary-button" onClick={() => { closeMealEditorPage(); setExpandedMeals((p) => ({ ...p, [editingMealIndex]: true })); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
