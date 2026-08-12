import { useMemo, useState } from 'react';

const activityLevels = [
  { value: 1.2, label: 'Sedentary (little or no exercise)' },
  { value: 1.375, label: 'Lightly active (1-3 days/week)' },
  { value: 1.55, label: 'Moderately active (3-5 days/week)' },
  { value: 1.725, label: 'Very active (6-7 days/week)' },
  { value: 1.9, label: 'Extremely active (hard exercise or physical job)' },
];

const bmiCategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obesity';
};

const formatNumber = (value) => Number(value).toFixed(1);

const toMetric = ({ weight, weightUnit, height, heightUnit }) => {
  const weightKg = weightUnit === 'lb' ? weight * 0.453592 : weight;
  const heightCm = heightUnit === 'in' ? height * 2.54 : height;
  const heightM = heightCm / 100;
  return { weightKg, heightCm, heightM };
};

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
  const [foodEntry, setFoodEntry] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [items, setItems] = useState([]);

  const metrics = useMemo(() => {
    const { weightKg, heightM } = toMetric(profile);
    const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
    const isMale = profile.sex === 'male';
    const bmr = isMale
      ? 10 * weightKg + 6.25 * (profile.heightUnit === 'in' ? profile.height * 2.54 : profile.height) - 5 * profile.age + 5
      : 10 * weightKg + 6.25 * (profile.heightUnit === 'in' ? profile.height * 2.54 : profile.height) - 5 * profile.age - 161;
    const tdee = bmr * profile.activity;
    const calories = Math.max(1200, tdee);
    const proteinGrams = (calories * (macroRatio.protein / 100)) / 4;
    const carbsGrams = (calories * (macroRatio.carbs / 100)) / 4;
    const fatGrams = (calories * (macroRatio.fat / 100)) / 9;

    return {
      bmi,
      bmiLabel: bmiCategory(bmi),
      bmr,
      tdee,
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
    };
  }, [profile, macroRatio]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.calories += Number(item.calories) || 0;
        acc.protein += Number(item.protein) || 0;
        acc.carbs += Number(item.carbs) || 0;
        acc.fat += Number(item.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [items]);

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleFoodAdd = () => {
    if (!foodEntry.name.trim() || !foodEntry.calories) return;
    setItems((prev) => [...prev, { ...foodEntry, calories: Number(foodEntry.calories), protein: Number(foodEntry.protein), carbs: Number(foodEntry.carbs), fat: Number(foodEntry.fat) }]);
    setFoodEntry({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Nutrition & Assessment Calculator</h1>
        <p>Enter your details to calculate BMI, BMR, daily energy needs, and macro targets.</p>
      </header>

      <section className="card">
        <h2>Profile</h2>
        <div className="grid-two-column">
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
            <div className="input-with-select">
              <input type="number" min="1" value={profile.weight} onChange={(e) => updateProfile('weight', Number(e.target.value))} />
              <select value={profile.weightUnit} onChange={(e) => updateProfile('weightUnit', e.target.value)}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </label>
          <label>
            Height
            <div className="input-with-select">
              <input type="number" min="1" value={profile.height} onChange={(e) => updateProfile('height', Number(e.target.value))} />
              <select value={profile.heightUnit} onChange={(e) => updateProfile('heightUnit', e.target.value)}>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </label>
          <label className="full-width">
            Activity level
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
        <div className="metrics-grid">
          <article>
            <h3>BMI</h3>
            <p>{formatNumber(metrics.bmi)}</p>
            <span>{metrics.bmiLabel}</span>
          </article>
          <article>
            <h3>BMR</h3>
            <p>{formatNumber(metrics.bmr)} kcal/day</p>
            <span>Resting daily energy expenditure</span>
          </article>
          <article>
            <h3>TDEE</h3>
            <p>{formatNumber(metrics.tdee)} kcal/day</p>
            <span>Daily calorie needs based on activity</span>
          </article>
          <article>
            <h3>Macro targets</h3>
            <p>{formatNumber(metrics.proteinGrams)}g protein</p>
            <p>{formatNumber(metrics.carbsGrams)}g carbs</p>
            <p>{formatNumber(metrics.fatGrams)}g fat</p>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>Macro ratio</h2>
        <div className="grid-three-column">
          {(['protein', 'carbs', 'fat'] as const).map((macro) => (
            <label key={macro}>
              {macro.charAt(0).toUpperCase() + macro.slice(1)} %
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
        <p className="hint">Adjust macro percentages; totals are not enforced automatically.</p>
      </section>

      <section className="card">
        <h2>Food intake log</h2>
        <div className="grid-five-column">
          <input
            placeholder="Food item"
            value={foodEntry.name}
            onChange={(e) => setFoodEntry((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Calories"
            value={foodEntry.calories}
            onChange={(e) => setFoodEntry((prev) => ({ ...prev, calories: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Protein (g)"
            value={foodEntry.protein}
            onChange={(e) => setFoodEntry((prev) => ({ ...prev, protein: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Carbs (g)"
            value={foodEntry.carbs}
            onChange={(e) => setFoodEntry((prev) => ({ ...prev, carbs: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Fat (g)"
            value={foodEntry.fat}
            onChange={(e) => setFoodEntry((prev) => ({ ...prev, fat: e.target.value }))}
          />
        </div>
        <button type="button" className="primary-button" onClick={handleFoodAdd}>
          Add food item
        </button>

        {items.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Carbs</th>
                  <th>Fat</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={`${item.name}-${idx}`}>
                    <td>{item.name}</td>
                    <td>{item.calories}</td>
                    <td>{item.protein}</td>
                    <td>{item.carbs}</td>
                    <td>{item.fat}</td>
                    <td>
                      <button className="link-button" type="button" onClick={() => removeItem(idx)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="summary-row">
                  <td>Total</td>
                  <td>{totals.calories}</td>
                  <td>{totals.protein}</td>
                  <td>{totals.carbs}</td>
                  <td>{totals.fat}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint">Add food items to track your day.</p>
        )}
      </section>
    </div>
  );
}
