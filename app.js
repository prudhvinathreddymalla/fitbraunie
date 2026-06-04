const plan = window.PULSE_PLAN;
const todayKey = new Date().toISOString().slice(0, 10);
const storageKey = `pulse-pantry:${todayKey}`;
const goalsKey = "pulse-pantry:goals";
const metricsKey = "pulse-pantry:weekly-metrics";
const activeWeekKey = "pulse-pantry:active-week";

const defaultGoals = {
  calories: 2200,
  protein: 150,
  water: 3,
  weight: ""
};

let state = loadState();
let weeklyMetrics = JSON.parse(localStorage.getItem(metricsKey) || "{}");
let activeWeek = Number(localStorage.getItem(activeWeekKey)) || 1;
let installPrompt = null;

const ids = [
  "dateLabel",
  "heroTitle",
  "heroSummary",
  "calorieRing",
  "proteinRing",
  "caloriePct",
  "proteinPct",
  "caloriesValue",
  "proteinValue",
  "waterValue",
  "workoutValue",
  "calorieGoalLabel",
  "proteinGoalLabel",
  "waterGoalLabel",
  "entryList",
  "installButton",
  "weekSelect",
  "metricWeek",
  "planGrid",
  "targetList"
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const dayLabels = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"]
];

document.getElementById("dateLabel").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date());

setupWeekSelectors();
renderTargets();

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

el.weekSelect.addEventListener("change", () => {
  activeWeek = Number(el.weekSelect.value);
  localStorage.setItem(activeWeekKey, String(activeWeek));
  el.metricWeek.value = String(activeWeek);
  fillMetricForm(activeWeek);
  renderPlan();
  render();
});

el.metricWeek.addEventListener("change", () => fillMetricForm(Number(el.metricWeek.value)));

document.getElementById("mealPanel").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = valueOf("mealName") || "Meal";
  const calories = numberOf("mealCalories");
  const protein = numberOf("mealProtein");

  if (!calories && !protein) return;

  state.entries.unshift({
    type: "meal",
    name,
    calories,
    protein,
    time: timeLabel()
  });
  event.currentTarget.reset();
  persistDay();
});

document.getElementById("workoutPanel").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = valueOf("workoutName") || "Workout";
  const minutes = numberOf("workoutMinutes");
  const water = numberOf("waterLiters");

  if (!minutes && !water) return;

  state.entries.unshift({
    type: "workout",
    name,
    minutes,
    water,
    time: timeLabel()
  });
  event.currentTarget.reset();
  persistDay();
});

document.getElementById("metricsPanel").addEventListener("submit", (event) => {
  event.preventDefault();
  const week = Number(el.metricWeek.value);
  weeklyMetrics[week] = {
    weight: valueOf("metricWeight"),
    waist: valueOf("metricWaist"),
    sleep: valueOf("metricSleep"),
    running: valueOf("metricRunning"),
    knee: valueOf("metricKnee"),
    notes: valueOf("metricNotes")
  };
  localStorage.setItem(metricsKey, JSON.stringify(weeklyMetrics));
  activeWeek = week;
  el.weekSelect.value = String(week);
  localStorage.setItem(activeWeekKey, String(activeWeek));
  render();
  switchTab("plan");
});

document.getElementById("targetsPanel").addEventListener("submit", (event) => {
  event.preventDefault();
  state.goals = {
    calories: numberOf("goalCalories") || defaultGoals.calories,
    protein: numberOf("goalProtein") || defaultGoals.protein,
    water: numberOf("goalWater") || defaultGoals.water,
    weight: valueOf("weight")
  };
  persistDay();
  switchTab("plan");
});

document.getElementById("clearToday").addEventListener("click", () => {
  state.entries = [];
  persistDay();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  el.installButton.hidden = false;
});

el.installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  el.installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

renderPlan();
fillMetricForm(activeWeek);
render();

function loadState() {
  const goals = JSON.parse(localStorage.getItem(goalsKey) || "null") || defaultGoals;
  const savedDay = JSON.parse(localStorage.getItem(storageKey) || "null");
  return savedDay || { goals, entries: [] };
}

function persistDay() {
  localStorage.setItem(goalsKey, JSON.stringify(state.goals));
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}

function setupWeekSelectors() {
  const options = plan.trainingCalendar
    .map((week) => `<option value="${week.week}">Week ${week.week}</option>`)
    .join("");
  el.weekSelect.innerHTML = options;
  el.metricWeek.innerHTML = options;
  el.weekSelect.value = String(activeWeek);
  el.metricWeek.value = String(activeWeek);
}

function renderPlan() {
  const week = plan.trainingCalendar.find((item) => item.week === activeWeek) || plan.trainingCalendar[0];
  el.planGrid.innerHTML = dayLabels.map(([key, label]) => `
    <article class="plan-day">
      <span>${label}</span>
      <strong>${week[key]}</strong>
    </article>
  `).join("");
}

function renderTargets() {
  el.targetList.innerHTML = plan.targets.map((item) => `
    <article class="target-item">
      <span>${item.goal}</span>
      <strong>${item.target}</strong>
    </article>
  `).join("");
}

function fillMetricForm(week) {
  const saved = weeklyMetrics[week] || {};
  document.getElementById("metricWeight").value = saved.weight || "";
  document.getElementById("metricWaist").value = saved.waist || "";
  document.getElementById("metricSleep").value = saved.sleep || "";
  document.getElementById("metricRunning").value = saved.running || "";
  document.getElementById("metricKnee").value = saved.knee || "";
  document.getElementById("metricNotes").value = saved.notes || "";
}

function render() {
  const totals = state.entries.reduce((sum, entry) => {
    sum.calories += entry.calories || 0;
    sum.protein += entry.protein || 0;
    sum.water += entry.water || 0;
    sum.workout += entry.minutes || 0;
    return sum;
  }, { calories: 0, protein: 0, water: 0, workout: 0 });

  const caloriePct = percent(totals.calories, state.goals.calories);
  const proteinPct = percent(totals.protein, state.goals.protein);
  const currentMetrics = weeklyMetrics[activeWeek] || {};

  el.calorieRing.style.setProperty("--value", caloriePct);
  el.proteinRing.style.setProperty("--value", proteinPct);
  el.caloriePct.textContent = `${caloriePct}%`;
  el.proteinPct.textContent = `${proteinPct}%`;

  el.caloriesValue.textContent = Math.round(totals.calories);
  el.proteinValue.textContent = Math.round(totals.protein);
  el.waterValue.textContent = trimNumber(totals.water);
  el.workoutValue.textContent = Math.round(totals.workout);

  el.calorieGoalLabel.textContent = state.goals.calories;
  el.proteinGoalLabel.textContent = state.goals.protein;
  el.waterGoalLabel.textContent = trimNumber(state.goals.water);

  document.getElementById("goalCalories").value = state.goals.calories;
  document.getElementById("goalProtein").value = state.goals.protein;
  document.getElementById("goalWater").value = state.goals.water;
  document.getElementById("weight").value = state.goals.weight;

  el.heroTitle.textContent = `Week ${activeWeek}: ${weekHeadline(activeWeek)}`;
  el.heroSummary.textContent = currentMetrics.knee
    ? `Knee pain is logged at ${currentMetrics.knee}/10. Keep the rehab honest and the runs smooth.`
    : summaryText(totals);

  el.entryList.innerHTML = state.entries.length
    ? state.entries.map(renderEntry).join("")
    : `<li class="entry"><div><strong>No entries yet</strong><p class="entry-meta">Add a meal or workout to start the day.</p></div></li>`;
}

function weekHeadline(weekNumber) {
  const week = plan.trainingCalendar.find((item) => item.week === weekNumber);
  return week ? week.sat : "Training Plan";
}

function renderEntry(entry) {
  const details = entry.type === "meal"
    ? `${Math.round(entry.calories || 0)} kcal | ${Math.round(entry.protein || 0)}g protein`
    : `${Math.round(entry.minutes || 0)} min | ${trimNumber(entry.water || 0)}L water`;
  return `
    <li class="entry">
      <div>
        <strong>${escapeHtml(entry.name)}</strong>
        <p class="entry-meta">${details}</p>
      </div>
      <span class="entry-meta">${entry.time}</span>
    </li>
  `;
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });
}

function summaryText(totals) {
  if (totals.calories >= state.goals.calories && totals.protein >= state.goals.protein) {
    return "Fuel and protein targets are both covered. Nice clean finish.";
  }
  if (totals.workout > 0) {
    return `${Math.round(totals.workout)} workout minutes logged. Pair that with a protein-forward meal.`;
  }
  return "Follow your running, rehab, gym, and nutrition plan with one calm daily check-in.";
}

function percent(value, goal) {
  return Math.min(100, Math.round((value / goal) * 100)) || 0;
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function numberOf(id) {
  return Number(document.getElementById(id).value) || 0;
}

function timeLabel() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function trimNumber(value) {
  return Number(value.toFixed(1)).toString();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
