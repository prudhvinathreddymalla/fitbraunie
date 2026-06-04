const plan = window.PULSE_PLAN;
const today = new Date();
const todayKey = today.toISOString().slice(0, 10);
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
let timerSeconds = 90;
let timerRemaining = 90;
let timerInterval = null;

const ids = [
  "dateLabel",
  "heroWeek",
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
  "targetList",
  "todayFocus",
  "progressGrid",
  "proteinBar",
  "carbBar",
  "fatBar",
  "proteinBarLabel",
  "carbBarLabel",
  "fatBarLabel",
  "timerFace",
  "timerStatus",
  "timerToggle"
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

el.dateLabel.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(today);

setupWeekSelectors();
renderTargets();

document.querySelectorAll(".nav-item, .jump-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll(".quick-log").forEach((button) => {
  button.addEventListener("click", () => quickLog(button.dataset.kind));
});

document.querySelectorAll(".timer-preset").forEach((button) => {
  button.addEventListener("click", () => setTimer(Number(button.dataset.seconds)));
});

el.timerToggle.addEventListener("click", toggleTimer);

el.weekSelect.addEventListener("change", () => {
  activeWeek = Number(el.weekSelect.value);
  localStorage.setItem(activeWeekKey, String(activeWeek));
  el.metricWeek.value = String(activeWeek);
  fillMetricForm(activeWeek);
  render();
});

el.metricWeek.addEventListener("change", () => fillMetricForm(Number(el.metricWeek.value)));

document.getElementById("mealPanel").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = valueOf("mealName") || "Meal";
  const calories = numberOf("mealCalories");
  const protein = numberOf("mealProtein");
  const carbs = numberOf("mealCarbs");
  const fat = numberOf("mealFat");

  if (!calories && !protein && !carbs && !fat) return;

  state.entries.unshift({
    type: "meal",
    name,
    calories,
    protein,
    carbs,
    fat,
    time: timeLabel()
  });
  event.currentTarget.reset();
  persistDay();
});

document.getElementById("workoutPanel").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = valueOf("workoutName") || "Workout";
  const exercise = valueOf("exerciseName");
  const sets = numberOf("workoutSets");
  const reps = numberOf("workoutReps");
  const weight = numberOf("workoutWeight");
  const rir = valueOf("workoutRir");
  const minutes = numberOf("workoutMinutes");
  const water = numberOf("waterLiters");

  if (!minutes && !water && !sets && !reps && !weight && !exercise) return;

  state.entries.unshift({
    type: "workout",
    name,
    exercise,
    sets,
    reps,
    weight,
    rir,
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
  switchView("dashboard");
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
  switchView("dashboard");
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

setTimer(timerSeconds);
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

function render() {
  const totals = dailyTotals();
  const currentMetrics = weeklyMetrics[activeWeek] || {};
  const caloriePct = percent(totals.calories, state.goals.calories);
  const proteinPct = percent(totals.protein, state.goals.protein);

  el.heroWeek.textContent = activeWeek;
  el.heroTitle.textContent = `Week ${activeWeek}: ${weekHeadline(activeWeek)}`;
  el.heroSummary.textContent = currentMetrics.knee
    ? `Knee pain is logged at ${currentMetrics.knee}/10. Keep the rehab honest and the runs smooth.`
    : summaryText(totals);

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

  renderPlan();
  renderTodayFocus(totals);
  renderEntryList();
  renderMacros(totals);
  renderProgress();
}

function dailyTotals() {
  return state.entries.reduce((sum, entry) => {
    sum.calories += entry.calories || 0;
    sum.protein += entry.protein || 0;
    sum.carbs += entry.carbs || 0;
    sum.fat += entry.fat || 0;
    sum.water += entry.water || 0;
    sum.workout += entry.minutes || 0;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, workout: 0 });
}

function renderPlan() {
  const week = plan.trainingCalendar.find((item) => item.week === activeWeek) || plan.trainingCalendar[0];
  el.planGrid.innerHTML = dayLabels.map(([key, label]) => `
    <article class="plan-day ${planKind(week[key])}">
      <div>
        <span>${label}</span>
        <small>${planTag(week[key])}</small>
      </div>
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

function renderTodayFocus(totals) {
  const week = plan.trainingCalendar.find((item) => item.week === activeWeek) || plan.trainingCalendar[0];
  const dayKey = dayLabels[(today.getDay() + 6) % 7][0];
  const session = week[dayKey];
  const proteinLeft = Math.max(0, state.goals.protein - totals.protein);
  const waterLeft = Math.max(0, state.goals.water - totals.water);

  el.todayFocus.innerHTML = `
    <article class="focus-card">
      <span class="entry-meta">Training</span>
      <strong>${session}</strong>
      <small>${trainingCue(session)}</small>
    </article>
    <article class="focus-card">
      <span class="entry-meta">Nutrition</span>
      <strong>${Math.round(proteinLeft)}g protein left</strong>
      <small>${trimNumber(waterLeft)}L water left. Keep meals simple and protein-forward.</small>
    </article>
  `;
}

function renderEntryList() {
  el.entryList.innerHTML = state.entries.length
    ? state.entries.map(renderEntry).join("")
    : `<li class="entry"><div><strong>No entries yet</strong><p class="entry-meta">Add a meal, workout, water, or rehab block.</p></div></li>`;
}

function renderEntry(entry) {
  const details = entry.type === "meal" ? mealDetails(entry) : workoutDetails(entry);
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

function mealDetails(entry) {
  const macros = [
    `${Math.round(entry.calories || 0)} kcal`,
    `${Math.round(entry.protein || 0)}g protein`
  ];
  if (entry.carbs) macros.push(`${Math.round(entry.carbs)}g carbs`);
  if (entry.fat) macros.push(`${Math.round(entry.fat)}g fat`);
  return macros.join(" | ");
}

function workoutDetails(entry) {
  const pieces = [];
  if (entry.exercise) pieces.push(escapeHtml(entry.exercise));
  if (entry.sets || entry.reps) pieces.push(`${Math.round(entry.sets || 0)}x${Math.round(entry.reps || 0)}`);
  if (entry.weight) pieces.push(`${trimNumber(entry.weight)} kg`);
  if (entry.rir) pieces.push(`RIR ${escapeHtml(entry.rir)}`);
  if (entry.minutes) pieces.push(`${Math.round(entry.minutes)} min`);
  if (entry.water) pieces.push(`${trimNumber(entry.water)}L water`);
  return pieces.join(" | ") || "Workout logged";
}

function renderMacros(totals) {
  const maxMacro = Math.max(totals.protein, totals.carbs, totals.fat, 1);
  setBar(el.proteinBar, totals.protein, maxMacro);
  setBar(el.carbBar, totals.carbs, maxMacro);
  setBar(el.fatBar, totals.fat, maxMacro);
  el.proteinBarLabel.textContent = `${Math.round(totals.protein)}g`;
  el.carbBarLabel.textContent = `${Math.round(totals.carbs)}g`;
  el.fatBarLabel.textContent = `${Math.round(totals.fat)}g`;
}

function renderProgress() {
  const metrics = weeklyMetrics[activeWeek] || {};
  const lastWeek = weeklyMetrics[activeWeek - 1] || {};
  el.progressGrid.innerHTML = [
    progressCard("Weight", metrics.weight, lastWeek.weight, "kg"),
    progressCard("Waist", metrics.waist, lastWeek.waist, "cm"),
    progressCard("Sleep", metrics.sleep, lastWeek.sleep, "h"),
    progressCard("Running", metrics.running, lastWeek.running, "km"),
    progressCard("Knee Pain", metrics.knee, lastWeek.knee, "/10"),
    progressCard("Notes", metrics.notes || "None", "", "")
  ].join("");
}

function progressCard(label, value, previous, unit) {
  const cleanValue = value || "Not logged";
  const delta = numericDelta(value, previous);
  const deltaText = delta === "" ? "" : `<p class="entry-meta">${delta} vs last week</p>`;
  return `
    <article class="progress-item">
      <span>${label}</span>
      <strong>${escapeHtml(String(cleanValue))}${value && unit ? ` ${unit}` : ""}</strong>
      ${deltaText}
    </article>
  `;
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

function quickLog(kind) {
  const entries = {
    water: { type: "workout", name: "Water", water: 0.5 },
    rehab: { type: "workout", name: "Rehab", exercise: "Knee rehab", minutes: 15 },
    walk: { type: "workout", name: "Walk", exercise: "Easy walk", minutes: 30 }
  };
  state.entries.unshift({ ...entries[kind], time: timeLabel() });
  persistDay();
}

function switchView(viewName) {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
}

function setTimer(seconds) {
  stopTimer();
  timerSeconds = seconds;
  timerRemaining = seconds;
  renderTimer();
}

function toggleTimer() {
  if (timerInterval) {
    stopTimer();
    renderTimer();
    return;
  }
  el.timerStatus.textContent = "Running";
  el.timerToggle.textContent = "Pause";
  timerInterval = window.setInterval(() => {
    timerRemaining -= 1;
    if (timerRemaining <= 0) {
      stopTimer();
      timerRemaining = timerSeconds;
      el.timerStatus.textContent = "Complete";
    }
    renderTimer();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
  el.timerToggle.textContent = "Start";
  el.timerStatus.textContent = "Ready";
}

function renderTimer() {
  const minutes = String(Math.floor(timerRemaining / 60)).padStart(2, "0");
  const seconds = String(timerRemaining % 60).padStart(2, "0");
  el.timerFace.textContent = `${minutes}:${seconds}`;
}

function trainingCue(session) {
  if (session.includes("Long Run")) return "Keep it easy, protect the knee, and finish feeling controlled.";
  if (session.includes("Tempo")) return "Smooth pace, no heroics. The win is consistency.";
  if (session.includes("Rehab")) return "Slow reps and clean positions matter more than volume.";
  if (session.includes("Upper")) return "Log sets, reps, load, and RIR so progression is obvious.";
  if (session.includes("Lower")) return "Train legs, but let knee pain guide intensity.";
  return "Recovery is part of the program, not a day off from progress.";
}

function planKind(session) {
  if (session.includes("Run") || session.includes("Tempo") || session.includes("Track")) return "is-run";
  if (session.includes("Body")) return "is-lift";
  if (session.includes("Rehab") || session.includes("Mobility")) return "is-rehab";
  return "is-recovery";
}

function planTag(session) {
  if (session.includes("Long Run")) return "Long run";
  if (session.includes("Tempo")) return "Tempo";
  if (session.includes("Track")) return "Track";
  if (session.includes("Upper")) return "Upper";
  if (session.includes("Lower")) return "Lower";
  if (session.includes("Mobility")) return "Mobility";
  return "Recovery";
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

function weekHeadline(weekNumber) {
  const week = plan.trainingCalendar.find((item) => item.week === weekNumber);
  return week ? week.sat : "Training Plan";
}

function setBar(node, value, maxValue) {
  node.style.width = `${percent(value, maxValue)}%`;
}

function numericDelta(value, previous) {
  const current = Number(value);
  const old = Number(previous);
  if (!Number.isFinite(current) || !Number.isFinite(old) || previous === "") return "";
  const diff = Number((current - old).toFixed(1));
  if (diff === 0) return "No change";
  return diff > 0 ? `+${diff}` : String(diff);
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
