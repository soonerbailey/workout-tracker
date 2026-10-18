import { DEFAULT_SECONDARY, MUSCLE_GROUPS, SECONDARY_SET_WEIGHT } from "./constants.js";

// ─── IDs ─────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

// ─── Dates (always local time, never UTC) ────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
export const localDateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const getToday = () => localDateStr(new Date());
export const parseLocalDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
};
export const addDays = (s, n) => { const d = parseLocalDate(s); d.setDate(d.getDate() + n); return localDateStr(d); };
export const daysBetween = (a, b) => Math.round((parseLocalDate(b) - parseLocalDate(a)) / 86400000);
export const formatDate = (s) => parseLocalDate(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const weekStart = (s) => { const d = parseLocalDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localDateStr(d); };
export const isValidDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));

// ─── Units ───────────────────────────────────────────────────────────
export const KG_TO_LB = 2.20462;
export const unitCategory = (u) => (u === "lbs" || u === "kg" ? "load" : u === "bw" ? "bw" : u === "band" ? "band" : u === "sec" ? "time" : u === "cal" ? "cal" : "load");
export const convertLoad = (w, from, to) => {
  if (from === to || !w) return w;
  if (from === "kg" && to === "lbs") return w * KG_TO_LB;
  if (from === "lbs" && to === "kg") return w / KG_TO_LB;
  return w;
};
export const round1 = (n) => Math.round(n * 10) / 10;

export const formatLoad = (set, unit) => {
  const u = unit || "lbs";
  if (u === "bw") return set.weight > 0 ? `BW+${set.weight}` : "BW";
  if (u === "band") return set.loadText ? `${set.loadText} band` : "Band";
  if (u === "sec" || u === "cal") return "";
  return `${set.weight} ${u}`;
};
export const formatReps = (reps, unit) => (unit === "sec" ? `${reps}s` : unit === "cal" ? `${reps} cal` : `${reps}`);
export const formatSet = (set, unit) => {
  const load = formatLoad(set, unit);
  const reps = set.reps > 0 ? formatReps(set.reps, unit) : "?";
  return load ? `${load} × ${reps}` : reps;
};

// ─── Strength math ───────────────────────────────────────────────────
export const calcE1RM = (weight, reps) => {
  if (!(reps > 0) || !(weight > 0)) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

// Score used to pick a "best" set; depends on what the unit means.
export const setScore = (set, unit) => {
  const cat = unitCategory(unit);
  if (cat === "load") return calcE1RM(set.weight, set.reps);
  if (cat === "bw") return (set.weight || 0) * 1000 + (set.reps || 0);
  return set.reps || 0;
};
export const bestSet = (sets, unit) => {
  let best = null, bestScore = -1;
  (sets || []).forEach(s => { const sc = setScore(s, unit); if (sc > bestScore) { best = s; bestScore = sc; } });
  return bestScore > 0 ? best : null;
};

// ─── Exercise library lookup ─────────────────────────────────────────
export const buildExerciseIndex = (exercises) => {
  const m = new Map();
  (exercises || []).forEach(e => m.set(e.name, { ...e, secondary: Array.isArray(e.secondary) ? e.secondary : (DEFAULT_SECONDARY[e.name] || []) }));
  return m;
};
export const muscleOf = (entry, idx) => idx.get(entry.exercise)?.muscleGroup || entry.muscleGroup || null;
export const secondaryOf = (entry, idx) => idx.get(entry.exercise)?.secondary || DEFAULT_SECONDARY[entry.exercise] || [];

// ─── Normalization ───────────────────────────────────────────────────
export const normalizeSet = (s) => ({
  id: s.id || uid(),
  weight: Number(s.weight) || 0,
  reps: Number(s.reps) || 0,
  note: s.note ? String(s.note) : "",
  loadText: s.loadText ? String(s.loadText) : "",
});
export const normalizeWorkout = (w, idx) => ({
  id: w.id || uid(),
  date: String(w.date || "").slice(0, 10),
  name: w.name || "Workout",
  entries: (w.entries || []).map(e => {
    const out = { id: e.id || uid(), exercise: String(e.exercise || ""), unit: e.unit || "lbs", sets: (e.sets || []).map(normalizeSet) };
    const mg = (idx && idx.get(out.exercise)?.muscleGroup) || e.muscleGroup;
    if (mg) out.muscleGroup = mg; // snapshot so history survives library edits
    return out;
  }),
  ...(w.updatedAt ? { updatedAt: w.updatedAt } : {}),
});
export const isSetValid = (unit, s) => {
  if (!s || !(Number(s.reps) > 0)) return false;
  if (["bw", "band", "cal", "sec"].includes(unit)) return true;
  return Number(s.weight) > 0;
};
export const sortWorkouts = (ws) => [...ws].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));

// Merge `incoming` data into `current`, keeping everything already present.
export const mergeData = (current, incoming) => {
  const haveW = new Set(current.workouts.map(w => w.id));
  const haveE = new Set(current.exercises.map(e => e.name.toLowerCase()));
  const haveT = new Set(current.templates.map(t => t.id));
  const newWorkouts = (incoming.workouts || []).filter(w => !haveW.has(w.id));
  const newExercises = (incoming.exercises || []).filter(e => !haveE.has(e.name.toLowerCase()));
  const newTemplates = (incoming.templates || []).filter(t => !haveT.has(t.id));
  return {
    workouts: sortWorkouts([...current.workouts, ...newWorkouts]),
    exercises: [...current.exercises, ...newExercises],
    templates: [...current.templates, ...newTemplates],
    added: { workouts: newWorkouts.length, exercises: newExercises.length, templates: newTemplates.length },
  };
};

// Rename an exercise everywhere it is referenced.
export const renameInWorkout = (w, oldName, newName, muscleGroup) => {
  if (!w.entries.some(e => e.exercise === oldName)) return null;
  return { ...w, entries: w.entries.map(e => e.exercise === oldName ? { ...e, exercise: newName, ...(muscleGroup ? { muscleGroup } : {}) } : e) };
};
export const renameInTemplates = (templates, oldName, newName) =>
  templates.map(t => ({ ...t, exercises: t.exercises.map(x => x.exercise === oldName ? { ...x, exercise: newName } : x) }));

// ─── History lookups ─────────────────────────────────────────────────
// Most recent entry for an exercise, optionally before a date / excluding a workout.
export const lastEntryFor = (workouts, exercise, { beforeDate, excludeId } = {}) => {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    if (excludeId && w.id === excludeId) continue;
    if (beforeDate && w.date > beforeDate) continue;
    const entry = w.entries.find(e => e.exercise === exercise);
    if (entry && entry.sets.length) return { workout: w, entry };
  }
  return null;
};

// ─── Analytics metrics ───────────────────────────────────────────────
export const METRICS = {
  load: [
    { id: "e1rm", label: "Est. 1RM" },
    { id: "top", label: "Top weight" },
    { id: "volume", label: "Volume (wt × reps)" },
  ],
  bw: [
    { id: "maxreps", label: "Max reps" },
    { id: "topadded", label: "Top added load" },
    { id: "totalreps", label: "Total reps" },
  ],
  band: [{ id: "maxreps", label: "Max reps" }, { id: "totalreps", label: "Total reps" }],
  time: [{ id: "maxreps", label: "Longest set" }, { id: "totalreps", label: "Total time" }],
  cal: [{ id: "maxreps", label: "Best set" }, { id: "totalreps", label: "Total cals" }],
};
export const CATEGORY_LABEL = { load: "Weighted", bw: "Bodyweight", band: "Band", time: "Timed", cal: "Calories" };

export const metricUnitLabel = (category, metricId, displayUnit) => {
  if (category === "load") return metricId === "volume" ? displayUnit + "·reps" : displayUnit;
  if (category === "bw") return metricId === "topadded" ? "lbs added" : "reps";
  if (category === "time") return "sec";
  if (category === "cal") return "cal";
  return "reps";
};

const entryMetric = (entry, metricId, displayUnit) => {
  const u = entry.unit || "lbs";
  const sets = entry.sets || [];
  if (!sets.length) return null;
  const conv = (w) => convertLoad(w, u, displayUnit);
  switch (metricId) {
    case "e1rm": return Math.max(0, ...sets.map(s => calcE1RM(conv(s.weight), s.reps)));
    case "top": return Math.max(0, ...sets.filter(s => s.reps > 0).map(s => conv(s.weight)));
    case "volume": return sets.reduce((a, s) => a + conv(s.weight) * (s.reps || 0), 0);
    case "maxreps": return Math.max(0, ...sets.map(s => s.reps || 0));
    case "totalreps": return sets.reduce((a, s) => a + (s.reps || 0), 0);
    case "topadded": return Math.max(0, ...sets.filter(s => s.reps > 0).map(s => s.weight || 0));
    default: return null;
  }
};

// Which unit categories an exercise has been logged in, and the most recent load unit.
export const exerciseUnitInfo = (workouts, exercise) => {
  const cats = new Map(); // category -> last date
  let lastLoadUnit = null;
  workouts.forEach(w => w.entries.forEach(e => {
    if (e.exercise !== exercise) return;
    const cat = unitCategory(e.unit || "lbs");
    cats.set(cat, w.date);
    if (cat === "load") lastLoadUnit = e.unit || "lbs";
  }));
  const ordered = [...cats.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([c]) => c);
  return { categories: ordered, loadUnit: lastLoadUnit || "lbs" };
};

// One point per workout: the metric for that exercise in that unit category.
export const exerciseSeries = (workouts, exercise, category, metricId, displayUnit) => {
  const out = [];
  workouts.forEach(w => {
    let best = null;
    w.entries.forEach(e => {
      if (e.exercise !== exercise || unitCategory(e.unit || "lbs") !== category) return;
      const v = entryMetric(e, metricId, displayUnit);
      if (v == null) return;
      const additive = metricId === "volume" || metricId === "totalreps";
      best = best == null ? v : additive ? best + v : Math.max(best, v);
    });
    if (best != null && best > 0) out.push({ date: w.date, t: parseLocalDate(w.date).getTime(), value: round1(best) });
  });
  return out;
};

// Least-squares trend vs. real elapsed days; projects 2/4/6/8 weeks past the last point.
export const projectSeries = (series) => {
  if (series.length < 3) return null;
  const t0 = series[0].t;
  const xs = series.map(p => (p.t - t0) / 86400000);
  const ys = series.map(p => p.value);
  const span = xs[xs.length - 1] - xs[0];
  if (span < 14) return null;
  const n = xs.length;
  const xm = xs.reduce((a, b) => a + b, 0) / n;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((a, x, i) => a + (x - xm) * (ys[i] - ym), 0);
  const den = xs.reduce((a, x) => a + (x - xm) ** 2, 0);
  if (den === 0) return null;
  const slope = num / den;
  const intercept = ym - slope * xm;
  const last = series[n - 1];
  const lastX = xs[n - 1];
  const points = [{ t: last.t, date: last.date, projected: last.value }];
  for (let wk = 2; wk <= 8; wk += 2) {
    const x = lastX + wk * 7;
    const date = addDays(last.date, wk * 7);
    points.push({ t: parseLocalDate(date).getTime(), date, projected: Math.max(0, round1(slope * x + intercept)) });
  }
  return { slopePerWeek: round1(slope * 7), points };
};

// ─── Volume ──────────────────────────────────────────────────────────
// { weekKey: { muscle: sets } } — primary muscle = 1 set, secondary = 0.5 set.
export const weeklyVolume = (workouts, idx) => {
  const weeks = {};
  workouts.forEach(w => {
    const key = weekStart(w.date);
    const bucket = (weeks[key] = weeks[key] || {});
    w.entries.forEach(e => {
      const n = e.sets.length;
      const mg = muscleOf(e, idx);
      if (!mg) return;
      bucket[mg] = (bucket[mg] || 0) + n;
      secondaryOf(e, idx).forEach(s => { if (s !== mg) bucket[s] = (bucket[s] || 0) + n * SECONDARY_SET_WEIGHT; });
    });
  });
  return weeks;
};

// ─── Today suggestion ────────────────────────────────────────────────
const LOAD_INC = { lbs: 5, kg: 2.5 };

export const progressionFor = (entry) => {
  const unit = entry.unit || "lbs";
  const cat = unitCategory(unit);
  const sets = entry.sets || [];
  const best = bestSet(sets, unit);
  const nSets = sets.length || 3;
  if (!best) return { unit, sets: nSets, weight: null, reps: 8, loadText: "", note: "Find a working weight" };

  if (cat === "load" || (cat === "bw" && best.weight > 0)) {
    const inc = cat === "bw" ? 5 : LOAD_INC[unit] || 5;
    const atTop = sets.filter(s => s.weight === best.weight);
    const missed = atTop.some(s => (s.reps || 0) < best.reps);
    if (missed) return { unit, sets: nSets, weight: best.weight, reps: best.reps, note: `Repeat — hit ${best.reps} on every set before adding weight` };
    if (best.reps <= 5) return { unit, sets: nSets, weight: best.weight + inc, reps: best.reps, note: `All sets done — add ${inc} ${cat === "bw" ? "lbs" : unit}` };
    if (best.reps >= 12) return { unit, sets: nSets, weight: best.weight + inc, reps: 8, note: "Top of range — add weight, reset reps" };
    return { unit, sets: nSets, weight: best.weight, reps: best.reps + 1, note: "Same weight, add a rep" };
  }
  if (cat === "bw") {
    if (best.reps >= 12) return { unit, sets: nSets, weight: 5, reps: 8, note: "12+ reps — add load (BW+5)" };
    return { unit, sets: nSets, weight: 0, reps: best.reps + 1, note: "Add a rep" };
  }
  if (cat === "band") {
    if (best.reps >= 20) return { unit, sets: nSets, loadText: best.loadText, weight: 0, reps: 12, note: "20+ reps — try a heavier band" };
    return { unit, sets: nSets, loadText: best.loadText, weight: 0, reps: best.reps + 1, note: "Same band, add a rep" };
  }
  if (cat === "time") return { unit, sets: nSets, weight: 0, reps: best.reps + 5, note: "Add 5 seconds" };
  return { unit, sets: nSets, weight: 0, reps: best.reps + 1, note: "Beat last time" };
};

const suggestExercise = (workouts, exerciseName, fallbackUnit) => {
  const last = lastEntryFor(workouts, exerciseName);
  if (!last) return { exercise: exerciseName, last: null, ...{ unit: fallbackUnit || "lbs", sets: 3, weight: null, reps: 8, loadText: "", note: "New — start light and find your weight" } };
  return { exercise: exerciseName, last: { date: last.workout.date, sets: last.entry.sets, unit: last.entry.unit || "lbs" }, ...progressionFor(last.entry) };
};

export const suggestToday = ({ workouts, exercises, templates, today = getToday() }) => {
  if (!workouts.length) return { type: "empty" };
  const idx = buildExerciseIndex(exercises);
  const desc = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const trainedToday = desc[0].date === today;

  // 1) Template rotation, if recent workouts follow your templates.
  const tplByName = new Map(templates.map(t => [t.name.trim().toLowerCase(), t]));
  const recent = desc.filter(w => daysBetween(w.date, today) <= 45);
  const tplHits = recent.filter(w => tplByName.has(String(w.name).trim().toLowerCase()));
  if (templates.length >= 2 && tplHits.length >= 2) {
    const lastTpl = tplByName.get(tplHits[0].name.trim().toLowerCase());
    const i = templates.findIndex(t => t.id === lastTpl.id);
    const next = templates[(i + 1) % templates.length];
    return {
      type: "rotation", trainedToday, template: next,
      lastName: lastTpl.name, lastDate: tplHits[0].date,
      suggestions: next.exercises.map(x => suggestExercise(workouts, x.exercise, x.unit)),
    };
  }

  // 2) Muscle groups you train that are most overdue.
  const daysSince = {};
  desc.forEach(w => w.entries.forEach(e => {
    const mg = muscleOf(e, idx);
    if (mg && daysSince[mg] == null) daysSince[mg] = daysBetween(w.date, today);
  }));
  const priorities = Object.entries(daysSince)
    .filter(([mg]) => mg !== "Cardio")
    .map(([muscle, d]) => ({ muscle, daysSince: d }))
    .sort((a, b) => b.daysSince - a.daysSince);
  const top = priorities.filter(p => p.daysSince >= 2).slice(0, 3);
  if (!top.length) return { type: "rest", trainedToday, message: "Everything you train was hit in the last 2 days. Consider a rest day or easy cardio." };

  const suggestions = [];
  top.forEach(({ muscle }) => {
    // Exercises you actually do for this muscle, most frequent in the last 60 days first.
    const freq = new Map();
    desc.forEach(w => {
      if (daysBetween(w.date, today) > 60) return;
      w.entries.forEach(e => { if (muscleOf(e, idx) === muscle) freq.set(e.exercise, (freq.get(e.exercise) || 0) + 1); });
    });
    let picks = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 2);
    if (!picks.length) {
      const lib = [...idx.values()].filter(e => e.muscleGroup === muscle);
      picks = [lib.find(e => e.type === "compound"), lib.find(e => e.type === "isolation")].filter(Boolean).map(e => e.name).slice(0, 2);
    }
    picks.forEach(name => suggestions.push({ ...suggestExercise(workouts, name), muscle }));
  });
  return { type: "muscles", trainedToday, name: top.map(t => t.muscle).join(" + "), muscles: top, suggestions };
};

export { MUSCLE_GROUPS };
