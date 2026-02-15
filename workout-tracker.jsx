import { useState, useMemo, useCallback, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

// ─── Data & Constants ────────────────────────────────────────────────
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Core", "Calves", "Cardio"];

const UNITS = ["lbs", "kg", "bw", "band", "cal", "sec"];

const DEFAULT_EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "Chest", type: "compound" },
  { name: "Incline DB Chest Press", muscleGroup: "Chest", type: "compound" },
  { name: "Incline Bench Press", muscleGroup: "Chest", type: "compound" },
  { name: "Pushups", muscleGroup: "Chest", type: "compound" },
  { name: "Diamond Pushups", muscleGroup: "Chest", type: "compound" },
  { name: "Weighted Dips", muscleGroup: "Chest", type: "compound" },
  { name: "Cable Fly", muscleGroup: "Chest", type: "isolation" },
  // Quads
  { name: "Zercher Squat", muscleGroup: "Quads", type: "compound" },
  { name: "Barbell Back Squat", muscleGroup: "Quads", type: "compound" },
  { name: "Box Squat", muscleGroup: "Quads", type: "compound" },
  { name: "Rear Foot Elevated Split Squat", muscleGroup: "Quads", type: "compound" },
  { name: "Bulgarian Split Squat", muscleGroup: "Quads", type: "compound" },
  { name: "Air Squat", muscleGroup: "Quads", type: "compound" },
  { name: "Leg Press", muscleGroup: "Quads", type: "compound" },
  { name: "Leg Extension", muscleGroup: "Quads", type: "isolation" },
  // Hamstrings
  { name: "Toes Elevated BB RDL", muscleGroup: "Hamstrings", type: "compound" },
  { name: "Romanian Deadlift", muscleGroup: "Hamstrings", type: "compound" },
  { name: "Single Leg KB RDL", muscleGroup: "Hamstrings", type: "compound" },
  { name: "Leg Curl", muscleGroup: "Hamstrings", type: "isolation" },
  // Back
  { name: "Conventional Deadlift", muscleGroup: "Back", type: "compound" },
  { name: "Raised Trap Bar Deadlift", muscleGroup: "Back", type: "compound" },
  { name: "Chest Supported DB Row", muscleGroup: "Back", type: "compound" },
  { name: "Barbell Row", muscleGroup: "Back", type: "compound" },
  { name: "Pull-Up", muscleGroup: "Back", type: "compound" },
  { name: "Neutral Grip Pull-Up", muscleGroup: "Back", type: "compound" },
  { name: "Seated Pulldown (Dual Pulley)", muscleGroup: "Back", type: "compound" },
  { name: "Lat Pulldown", muscleGroup: "Back", type: "compound" },
  { name: "Cable Row", muscleGroup: "Back", type: "isolation" },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "Shoulders", type: "compound" },
  { name: "DB Clean + Press", muscleGroup: "Shoulders", type: "compound" },
  { name: "Lateral Raise", muscleGroup: "Shoulders", type: "isolation" },
  { name: "Face Pull", muscleGroup: "Shoulders", type: "isolation" },
  { name: "Rear Delt Fly", muscleGroup: "Shoulders", type: "isolation" },
  // Biceps
  { name: "Barbell Curl", muscleGroup: "Biceps", type: "isolation" },
  { name: "Dumbbell Curl", muscleGroup: "Biceps", type: "isolation" },
  { name: "Hammer Curl", muscleGroup: "Biceps", type: "isolation" },
  // Triceps
  { name: "Tricep Pulldown", muscleGroup: "Triceps", type: "isolation" },
  { name: "Skull Crushers", muscleGroup: "Triceps", type: "isolation" },
  { name: "Overhead Tricep Extension", muscleGroup: "Triceps", type: "isolation" },
  { name: "Close-Grip Bench Press", muscleGroup: "Triceps", type: "compound" },
  // Glutes
  { name: "Hip Thrust", muscleGroup: "Glutes", type: "compound" },
  { name: "Single Leg Hip Thrust", muscleGroup: "Glutes", type: "compound" },
  { name: "Banded Lateral Walk", muscleGroup: "Glutes", type: "isolation" },
  // Core
  { name: "Half Kneeling Cable Lift", muscleGroup: "Core", type: "isolation" },
  { name: "Hollow Body Hold", muscleGroup: "Core", type: "isolation" },
  { name: "Plank", muscleGroup: "Core", type: "isolation" },
  { name: "Cable Crunch", muscleGroup: "Core", type: "isolation" },
  { name: "Turkish Get Up", muscleGroup: "Core", type: "compound" },
  // Calves
  { name: "Calf Raise", muscleGroup: "Calves", type: "isolation" },
  // Cardio
  { name: "Air Bike", muscleGroup: "Cardio", type: "compound" },
  { name: "Rower", muscleGroup: "Cardio", type: "compound" },
  { name: "Ski Erg", muscleGroup: "Cardio", type: "compound" },
];

const SAMPLE_WORKOUTS = (() => {
  const workouts = [];
  const today = new Date();
  const routines = [
    { day: "Upper A", exercises: ["Barbell Bench Press", "Incline DB Chest Press", "Overhead Press", "Chest Supported DB Row", "Barbell Curl", "Tricep Pulldown"] },
    { day: "Lower", exercises: ["Zercher Squat", "Toes Elevated BB RDL", "Leg Press", "Leg Curl", "Single Leg Hip Thrust", "Calf Raise"] },
    { day: "Upper B", exercises: ["Raised Trap Bar Deadlift", "Barbell Row", "Pull-Up", "Weighted Dips", "Skull Crushers", "Face Pull"] },
  ];
  const baseWeights = { "Barbell Bench Press": 185, "Incline DB Chest Press": 70, "Overhead Press": 125, "Chest Supported DB Row": 70, "Barbell Curl": 65, "Tricep Pulldown": 55, "Zercher Squat": 175, "Toes Elevated BB RDL": 175, "Leg Press": 270, "Leg Curl": 80, "Single Leg Hip Thrust": 35, "Calf Raise": 135, "Raised Trap Bar Deadlift": 295, "Barbell Row": 135, "Pull-Up": 0, "Weighted Dips": 0, "Skull Crushers": 25, "Face Pull": 40 };

  for (let w = 0; w < 8; w++) {
    for (let r = 0; r < 3; r++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (8 - w) * 7 - (2 - r) * 2 - 1);
      const routine = routines[r];
      const entries = routine.exercises.map(name => {
        const bw = baseWeights[name] || 50;
        const progression = bw * (0.02 * w);
        const weight = Math.round((bw + progression) / 5) * 5;
        const reps = name === "Pull-Up" ? 8 + Math.floor(w / 3) : name === "Plank" ? 60 : (8 + Math.floor(Math.random() * 5));
        return { exercise: name, unit: "lbs", sets: [{ weight, reps, note: "" }, { weight, reps: Math.max(reps - 1, 6), note: "" }, { weight: name === "Pull-Up" || name === "Weighted Dips" ? 0 : weight, reps: Math.max(reps - 2, 5), note: "" }] };
      });
      workouts.push({ id: `s-${w}-${r}`, date: d.toISOString().slice(0, 10), name: routine.day, entries });
    }
  }
  return workouts.sort((a, b) => a.date.localeCompare(b.date));
})();

// ─── Utility Functions ───────────────────────────────────────────────
const calcE1RM = (weight, reps) => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

const formatDate = (d) => {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getToday = () => new Date().toISOString().slice(0, 10);

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Styles ──────────────────────────────────────────────────────────
const colors = {
  bg: "#0f1117", card: "#1a1d27", cardHover: "#22263a", border: "#2a2e3f",
  accent: "#6c5ce7", accentLight: "#a29bfe", accentDim: "#4a3fb5",
  text: "#e8e8ef", textDim: "#8b8da3", textMuted: "#5a5c72",
  success: "#00b894", warning: "#fdcb6e", danger: "#e17055",
  chartColors: ["#6c5ce7", "#00b894", "#e17055", "#fdcb6e", "#74b9ff", "#fd79a8", "#55efc4", "#fab1a0", "#81ecec", "#dfe6e9"]
};

// ─── Components ──────────────────────────────────────────────────────

function NavBar({ view, setView }) {
  const tabs = [
    { id: "log", label: "Log", icon: "+" },
    { id: "history", label: "History", icon: "☰" },
    { id: "analytics", label: "Analytics", icon: "◔" },
    { id: "suggest", label: "Today", icon: "★" },
    { id: "exercises", label: "Exercises", icon: "⚙" },
  ];
  return (
    <nav style={{ display: "flex", gap: 4, padding: "8px 12px", background: colors.card, borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, zIndex: 100 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setView(t.id)}
          style={{ flex: 1, padding: "10px 4px", border: "none", borderRadius: 8,
            background: view === t.id ? colors.accent : "transparent",
            color: view === t.id ? "#fff" : colors.textDim,
            fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
          <span style={{ fontSize: 16, display: "block", marginBottom: 2 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function SetRow({ set, idx, onChange, onRemove, unit }) {
  const repLabel = unit === "sec" ? "sec" : unit === "cal" ? "cals" : "reps";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: colors.textMuted, fontSize: 12, width: 20, textAlign: "center" }}>{idx + 1}</span>
        <input type="number" placeholder={unit === "bw" ? "+" : unit} value={set.weight === 0 && unit === "bw" ? "" : set.weight || ""} onChange={e => onChange({ ...set, weight: +e.target.value })}
          style={{ flex: 1, padding: "8px 8px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 14, minWidth: 0 }} />
        <span style={{ color: colors.textMuted, fontSize: 11 }}>×</span>
        <input type="number" placeholder={repLabel} value={set.reps || ""} onChange={e => onChange({ ...set, reps: +e.target.value })}
          style={{ flex: 1, padding: "8px 8px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 14, minWidth: 0 }} />
        <button onClick={onRemove} style={{ background: "none", border: "none", color: colors.danger, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
      </div>
      <div style={{ paddingLeft: 28, marginTop: 3 }}>
        <input type="text" placeholder="Note (AMRAP, blue band, tempo…)" value={set.note || ""} onChange={e => onChange({ ...set, note: e.target.value })}
          style={{ width: "100%", padding: "5px 8px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 5, color: colors.textDim, fontSize: 12, boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

function ExerciseEntry({ entry, exercises, onUpdate, onRemove }) {
  const unit = entry.unit || "lbs";
  const updateSet = (i, set) => { const s = [...entry.sets]; s[i] = set; onUpdate({ ...entry, sets: s }); };
  const removeSet = (i) => { const s = entry.sets.filter((_, j) => j !== i); onUpdate({ ...entry, sets: s }); };
  const addSet = () => {
    const last = entry.sets[entry.sets.length - 1] || { weight: 0, reps: 8 };
    onUpdate({ ...entry, sets: [...entry.sets, { ...last, note: "" }] });
  };
  return (
    <div style={{ background: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <select value={entry.exercise} onChange={e => onUpdate({ ...entry, exercise: e.target.value })}
          style={{ flex: 1, padding: "8px 10px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 14, marginRight: 8 }}>
          <option value="">Select exercise…</option>
          {MUSCLE_GROUPS.map(mg => {
            const mgExercises = exercises.filter(e => e.muscleGroup === mg);
            return mgExercises.length > 0 ? (
              <optgroup key={mg} label={mg}>
                {mgExercises.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: colors.danger, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {UNITS.map(u => (
          <button key={u} onClick={() => onUpdate({ ...entry, unit: u })}
            style={{ padding: "4px 10px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: unit === u ? colors.accent : colors.bg, color: unit === u ? "#fff" : colors.textMuted }}>
            {u}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, paddingLeft: 28 }}>
        <span style={{ flex: 1, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
          {unit === "bw" ? "+Weight" : unit === "band" ? "Band" : "Weight"}
        </span>
        <span style={{ width: 11 }} />
        <span style={{ flex: 1, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
          {unit === "sec" ? "Seconds" : unit === "cal" ? "Cals" : "Reps"}
        </span>
        <span style={{ width: 24 }} />
      </div>
      {entry.sets.map((set, i) => <SetRow key={i} set={set} idx={i} unit={unit} onChange={s => updateSet(i, s)} onRemove={() => removeSet(i)} />)}
      <button onClick={addSet}
        style={{ width: "100%", padding: "8px", background: colors.bg, border: `1px dashed ${colors.border}`, borderRadius: 6, color: colors.accentLight, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
        + Add Set
      </button>
    </div>
  );
}

function LogWorkout({ exercises, workouts, setWorkouts, setView }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(getToday());
  const [entries, setEntries] = useState([{ exercise: "", unit: "lbs", sets: [{ weight: 0, reps: 8, note: "" }, { weight: 0, reps: 8, note: "" }, { weight: 0, reps: 8, note: "" }] }]);

  const addExercise = () => setEntries([...entries, { exercise: "", unit: "lbs", sets: [{ weight: 0, reps: 8, note: "" }, { weight: 0, reps: 8, note: "" }, { weight: 0, reps: 8, note: "" }] }]);

  const save = () => {
    const valid = entries.filter(e => e.exercise && e.sets.some(s => s.weight > 0 && s.reps > 0));
    if (!valid.length) return;
    const workout = { id: uid(), date, name: name || "Workout", entries: valid };
    setWorkouts(prev => [...prev, workout].sort((a, b) => a.date.localeCompare(b.date)));
    setName(""); setDate(getToday());
    setEntries([{ exercise: "", unit: "lbs", sets: [{ weight: 0, reps: 8, note: "" }, { weight: 0, reps: 8, note: "" }, { weight: 0, reps: 8, note: "" }] }]);
    setView("history");
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: colors.text, margin: "0 0 16px", fontSize: 22 }}>Log Workout</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Workout name (e.g. Push Day)" value={name} onChange={e => setName(e.target.value)}
          style={{ flex: 2, padding: "10px 12px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, padding: "10px 8px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14, colorScheme: "dark" }} />
      </div>
      {entries.map((entry, i) => (
        <ExerciseEntry key={i} entry={entry} exercises={exercises}
          onUpdate={e => { const n = [...entries]; n[i] = e; setEntries(n); }}
          onRemove={() => setEntries(entries.filter((_, j) => j !== i))} />
      ))}
      <button onClick={addExercise}
        style={{ width: "100%", padding: 12, background: colors.card, border: `1px dashed ${colors.accent}`, borderRadius: 10, color: colors.accentLight, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
        + Add Exercise
      </button>
      <button onClick={save}
        style={{ width: "100%", padding: 14, background: colors.accent, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        Save Workout
      </button>
    </div>
  );
}

function History({ workouts, setWorkouts, exercises }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = [...workouts].reverse();

  const deleteWorkout = (id) => setWorkouts(prev => prev.filter(w => w.id !== id));

  const bestSet = (sets) => {
    let best = { weight: 0, reps: 0 };
    sets.forEach(s => { if (calcE1RM(s.weight, s.reps) > calcE1RM(best.weight, best.reps)) best = s; });
    return best;
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: colors.text, margin: "0 0 16px", fontSize: 22 }}>Workout History</h2>
      {sorted.length === 0 && <p style={{ color: colors.textDim, textAlign: "center", padding: 40 }}>No workouts logged yet. Start by logging your first workout!</p>}
      {sorted.map(w => (
        <div key={w.id} style={{ background: colors.card, borderRadius: 12, marginBottom: 10, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
          <div onClick={() => setExpanded(expanded === w.id ? null : w.id)}
            style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: colors.text, fontWeight: 600, fontSize: 15 }}>{w.name}</div>
              <div style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{formatDate(w.date)} · {w.entries.length} exercises · {w.entries.reduce((a, e) => a + e.sets.length, 0)} sets</div>
            </div>
            <span style={{ color: colors.textMuted, fontSize: 18, transform: expanded === w.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
          </div>
          {expanded === w.id && (
            <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${colors.border}` }}>
              {w.entries.map((entry, i) => {
                const ex = exercises.find(e => e.name === entry.exercise);
                const best = bestSet(entry.sets);
                return (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i < w.entries.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ color: colors.accentLight, fontSize: 14, fontWeight: 600 }}>{entry.exercise}</span>
                      <span style={{ color: colors.textMuted, fontSize: 11, background: colors.bg, padding: "2px 8px", borderRadius: 10 }}>{ex?.muscleGroup}</span>
                    </div>
                    {entry.sets.map((s, j) => {
                      const u = entry.unit || "lbs";
                      const repLabel = u === "sec" ? "s" : u === "cal" ? "cal" : "";
                      const weightLabel = u === "bw" ? (s.weight > 0 ? `BW+${s.weight}` : "BW") : `${s.weight} ${u}`;
                      return (
                        <div key={j} style={{ paddingLeft: 8, marginBottom: 3 }}>
                          <div style={{ display: "flex", gap: 8, fontSize: 13, color: colors.textDim, alignItems: "center" }}>
                            <span style={{ width: 20, color: colors.textMuted }}>{j + 1}.</span>
                            <span>{weightLabel} × {s.reps}{repLabel}</span>
                            {s === best && <span style={{ color: colors.success, fontSize: 11 }}>★ best</span>}
                          </div>
                          {s.note && <div style={{ fontSize: 11, color: colors.textMuted, paddingLeft: 28, fontStyle: "italic" }}>{s.note}</div>}
                        </div>
                      );
                    })}
                    {(entry.unit || "lbs") !== "bw" && (entry.unit || "lbs") !== "band" && (entry.unit || "lbs") !== "sec" && (entry.unit || "lbs") !== "cal" && (
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, paddingLeft: 8 }}>Est. 1RM: {calcE1RM(best.weight, best.reps)} {entry.unit || "lbs"}</div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => deleteWorkout(w.id)}
                style={{ marginTop: 10, padding: "8px 16px", background: "transparent", border: `1px solid ${colors.danger}`, borderRadius: 6, color: colors.danger, fontSize: 12, cursor: "pointer" }}>
                Delete Workout
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Analytics({ workouts, exercises }) {
  const [selectedExercise, setSelectedExercise] = useState("Barbell Bench Press");
  const [timeRange, setTimeRange] = useState("all");

  const exercisesUsed = useMemo(() => {
    const set = new Set();
    workouts.forEach(w => w.entries.forEach(e => set.add(e.exercise)));
    return [...set].sort();
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    if (timeRange === "all") return workouts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeRange === "30" ? 30 : timeRange === "60" ? 60 : 90));
    return workouts.filter(w => new Date(w.date) >= cutoff);
  }, [workouts, timeRange]);

  const e1rmData = useMemo(() => {
    const data = [];
    filteredWorkouts.forEach(w => {
      w.entries.filter(e => e.exercise === selectedExercise).forEach(entry => {
        let bestE1RM = 0;
        entry.sets.forEach(s => { const e = calcE1RM(s.weight, s.reps); if (e > bestE1RM) bestE1RM = e; });
        if (bestE1RM > 0) data.push({ date: w.date, label: formatDate(w.date), e1rm: bestE1RM });
      });
    });
    return data;
  }, [filteredWorkouts, selectedExercise]);

  const projection = useMemo(() => {
    if (e1rmData.length < 3) return null;
    const n = e1rmData.length;
    const xs = e1rmData.map((_, i) => i);
    const ys = e1rmData.map(d => d.e1rm);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((a, x, i) => a + (x - xMean) * (ys[i] - yMean), 0);
    const den = xs.reduce((a, x) => a + (x - xMean) ** 2, 0);
    if (den === 0) return null;
    const slope = num / den;
    const intercept = yMean - slope * xMean;
    const next4 = [];
    for (let i = 1; i <= 4; i++) {
      const futureIdx = n - 1 + i * 2;
      const projected = Math.round(slope * futureIdx + intercept);
      const futureDate = new Date(e1rmData[n - 1].date);
      futureDate.setDate(futureDate.getDate() + i * 14);
      next4.push({ label: formatDate(futureDate.toISOString().slice(0, 10)), e1rm: null, projected });
    }
    const withProjection = e1rmData.map(d => ({ ...d, projected: null }));
    withProjection[withProjection.length - 1].projected = withProjection[withProjection.length - 1].e1rm;
    return [...withProjection, ...next4];
  }, [e1rmData]);

  const volumeData = useMemo(() => {
    const weekMap = {};
    filteredWorkouts.forEach(w => {
      const d = new Date(w.date + "T12:00:00");
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const weekKey = monday.toISOString().slice(0, 10);
      if (!weekMap[weekKey]) weekMap[weekKey] = {};
      w.entries.forEach(entry => {
        const ex = exercises.find(e => e.name === entry.exercise);
        if (!ex) return;
        const mg = ex.muscleGroup;
        weekMap[weekKey][mg] = (weekMap[weekKey][mg] || 0) + entry.sets.length;
      });
    });
    return Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([week, groups]) => ({
      week: formatDate(week), ...groups
    }));
  }, [filteredWorkouts, exercises]);

  const latestVolumeBreakdown = useMemo(() => {
    if (!volumeData.length) return [];
    const latest = volumeData[volumeData.length - 1];
    return MUSCLE_GROUPS.map(mg => ({ muscle: mg, sets: latest[mg] || 0 })).filter(d => d.sets > 0).sort((a, b) => b.sets - a.sets);
  }, [volumeData]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: colors.text, margin: "0 0 16px", fontSize: 22 }}>Analytics</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "90", "60", "30"].map(r => (
          <button key={r} onClick={() => setTimeRange(r)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: timeRange === r ? colors.accent : colors.card, color: timeRange === r ? "#fff" : colors.textDim }}>
            {r === "all" ? "All Time" : `${r}d`}
          </button>
        ))}
      </div>

      <div style={{ background: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: "0 0 12px", fontSize: 16 }}>Strength Progression (Est. 1RM)</h3>
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 13, marginBottom: 12 }}>
          {exercisesUsed.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        {e1rmData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={projection || e1rmData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="label" tick={{ fill: colors.textMuted, fontSize: 10 }} />
                <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} domain={["dataMin - 10", "dataMax + 10"]} />
                <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }} />
                <Line type="monotone" dataKey="e1rm" stroke={colors.accent} strokeWidth={2} dot={{ r: 4, fill: colors.accent }} name="Actual 1RM" connectNulls={false} />
                {projection && <Line type="monotone" dataKey="projected" stroke={colors.warning} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: colors.warning }} name="Projected" connectNulls />}
              </LineChart>
            </ResponsiveContainer>
            {projection && (
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
                <span style={{ color: colors.accent }}>● Actual</span>
                <span style={{ color: colors.warning }}>- - Projected</span>
              </div>
            )}
            {e1rmData.length >= 2 && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: colors.bg, borderRadius: 8, fontSize: 13 }}>
                <span style={{ color: colors.textDim }}>Progress: </span>
                <span style={{ color: e1rmData[e1rmData.length - 1].e1rm >= e1rmData[0].e1rm ? colors.success : colors.danger, fontWeight: 600 }}>
                  {e1rmData[e1rmData.length - 1].e1rm >= e1rmData[0].e1rm ? "+" : ""}{e1rmData[e1rmData.length - 1].e1rm - e1rmData[0].e1rm} lbs
                </span>
                <span style={{ color: colors.textDim }}> ({e1rmData[0].e1rm} → {e1rmData[e1rmData.length - 1].e1rm} lbs)</span>
              </div>
            )}
          </>
        ) : <p style={{ color: colors.textDim, textAlign: "center", padding: 20 }}>No data for this exercise yet.</p>}
      </div>

      <div style={{ background: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: "0 0 12px", fontSize: 16 }}>Weekly Volume by Muscle Group</h3>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={volumeData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="week" tick={{ fill: colors.textMuted, fontSize: 10 }} />
              <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }} />
              {MUSCLE_GROUPS.map((mg, i) => <Bar key={mg} dataKey={mg} stackId="vol" fill={colors.chartColors[i]} />)}
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ color: colors.textDim, textAlign: "center", padding: 20 }}>Not enough data yet.</p>}
      </div>

      {latestVolumeBreakdown.length > 0 && (
        <div style={{ background: colors.card, borderRadius: 12, padding: 16, border: `1px solid ${colors.border}` }}>
          <h3 style={{ color: colors.text, margin: "0 0 12px", fontSize: 16 }}>Latest Week Volume</h3>
          {latestVolumeBreakdown.map(({ muscle, sets }) => {
            const target = 10;
            const pct = Math.min(sets / target * 100, 100);
            return (
              <div key={muscle} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: colors.text }}>{muscle}</span>
                  <span style={{ color: sets >= target ? colors.success : sets >= target * 0.6 ? colors.warning : colors.danger }}>{sets} sets</span>
                </div>
                <div style={{ height: 6, background: colors.bg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: sets >= target ? colors.success : sets >= target * 0.6 ? colors.warning : colors.danger, borderRadius: 3, transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>Target: ~10 sets per muscle group per week</p>
        </div>
      )}
    </div>
  );
}

function TodaySuggestion({ workouts, exercises }) {
  const suggestion = useMemo(() => {
    if (workouts.length === 0) return { type: "empty" };

    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    const recentDays = {};
    const now = new Date();

    sorted.forEach(w => {
      w.entries.forEach(entry => {
        const ex = exercises.find(e => e.name === entry.exercise);
        if (ex && !recentDays[ex.muscleGroup]) {
          recentDays[ex.muscleGroup] = Math.floor((now - new Date(w.date + "T12:00:00")) / 86400000);
        }
      });
    });

    const priorities = MUSCLE_GROUPS
      .map(mg => ({ muscle: mg, daysSince: recentDays[mg] ?? 999 }))
      .sort((a, b) => b.daysSince - a.daysSince);

    const topMuscles = priorities.slice(0, 3).filter(p => p.daysSince >= 2);
    if (topMuscles.length === 0) {
      return { type: "rest", message: "All muscle groups were trained recently. Consider a rest day or light cardio!" };
    }

    const suggestedExercises = [];
    topMuscles.forEach(({ muscle }) => {
      const available = exercises.filter(e => e.muscleGroup === muscle);
      const compounds = available.filter(e => e.type === "compound");
      const isolations = available.filter(e => e.type === "isolation");

      if (compounds.length > 0) suggestedExercises.push(compounds[0]);
      if (isolations.length > 0) suggestedExercises.push(isolations[0]);
      else if (compounds.length > 1) suggestedExercises.push(compounds[1]);
    });

    const suggestions = suggestedExercises.map(ex => {
      let lastPerformance = null;
      let lastUnit = "lbs";
      for (const w of sorted) {
        const entry = w.entries.find(e => e.exercise === ex.name);
        if (entry) {
          lastUnit = entry.unit || "lbs";
          const bestSet = entry.sets.reduce((best, s) => calcE1RM(s.weight, s.reps) > calcE1RM(best.weight, best.reps) ? s : best, entry.sets[0]);
          lastPerformance = { weight: bestSet.weight, reps: bestSet.reps, date: w.date };
          break;
        }
      }
      let suggestedWeight, suggestedReps, note;
      if (lastPerformance) {
        if (lastPerformance.reps >= 10) {
          suggestedWeight = lastPerformance.weight + 5;
          suggestedReps = 8;
          note = "Increase weight, reset reps";
        } else {
          suggestedWeight = lastPerformance.weight;
          suggestedReps = lastPerformance.reps + 1;
          note = "Same weight, add a rep";
        }
      } else {
        suggestedWeight = null;
        suggestedReps = 8;
        note = "New exercise — start light and find your weight";
      }
      return { exercise: ex, lastPerformance, suggestedWeight, suggestedReps, note, unit: lastUnit };
    });

    const workoutName = topMuscles.map(m => m.muscle).join(" + ");
    return { type: "workout", name: workoutName, muscles: topMuscles, suggestions };
  }, [workouts, exercises]);

  if (suggestion.type === "empty") {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ color: colors.text, margin: "0 0 16px", fontSize: 22 }}>Today's Workout</h2>
        <div style={{ background: colors.card, borderRadius: 12, padding: 32, textAlign: "center", border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.textDim, fontSize: 15 }}>Log a few workouts first and I'll start suggesting what to train next!</p>
        </div>
      </div>
    );
  }

  if (suggestion.type === "rest") {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ color: colors.text, margin: "0 0 16px", fontSize: 22 }}>Today's Suggestion</h2>
        <div style={{ background: colors.card, borderRadius: 12, padding: 32, textAlign: "center", border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧘</div>
          <p style={{ color: colors.success, fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Rest Day</p>
          <p style={{ color: colors.textDim, fontSize: 14 }}>{suggestion.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: colors.text, margin: "0 0 8px", fontSize: 22 }}>Today's Workout</h2>
      <p style={{ color: colors.accentLight, fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>{suggestion.name}</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {suggestion.muscles.map(m => (
          <div key={m.muscle} style={{ background: colors.card, borderRadius: 8, padding: "8px 14px", border: `1px solid ${colors.border}`, fontSize: 12 }}>
            <span style={{ color: colors.text, fontWeight: 600 }}>{m.muscle}</span>
            <span style={{ color: colors.textMuted, marginLeft: 6 }}>{m.daysSince === 999 ? "never trained" : `${m.daysSince}d ago`}</span>
          </div>
        ))}
      </div>

      {suggestion.suggestions.map(({ exercise, lastPerformance, suggestedWeight, suggestedReps, note, unit }, i) => {
        const u = unit || "lbs";
        const fmtWeight = (w) => u === "bw" ? (w > 0 ? `BW+${w}` : "BW") : `${w} ${u}`;
        return (
          <div key={i} style={{ background: colors.card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
              <div>
                <div style={{ color: colors.text, fontWeight: 600, fontSize: 15 }}>{exercise.name}</div>
                <span style={{ fontSize: 11, color: colors.textMuted, background: colors.bg, padding: "2px 8px", borderRadius: 10 }}>{exercise.muscleGroup} · {exercise.type}</span>
              </div>
            </div>
            {lastPerformance && (
              <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 8, padding: "6px 10px", background: colors.bg, borderRadius: 6 }}>
                Last: {fmtWeight(lastPerformance.weight)} × {lastPerformance.reps} on {formatDate(lastPerformance.date)}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ padding: "8px 14px", background: colors.accentDim + "33", borderRadius: 8, border: `1px solid ${colors.accentDim}` }}>
                <span style={{ color: colors.accentLight, fontWeight: 700, fontSize: 16 }}>
                  {suggestedWeight != null ? `${fmtWeight(suggestedWeight)} × ${suggestedReps}` : `? × ${suggestedReps}`}
                </span>
                <span style={{ color: colors.textDim, fontSize: 11, display: "block" }}>3 sets</span>
              </div>
              <span style={{ color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>{note}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExerciseManager({ exercises, setExercises }) {
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", muscleGroup: "Chest", type: "compound" });
  const [search, setSearch] = useState("");

  const filtered = exercises.filter(e => {
    const matchGroup = filter === "All" || e.muscleGroup === filter;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const grouped = {};
  filtered.forEach(e => {
    if (!grouped[e.muscleGroup]) grouped[e.muscleGroup] = [];
    grouped[e.muscleGroup].push(e);
  });

  const startAdd = () => {
    setForm({ name: "", muscleGroup: filter === "All" ? "Chest" : filter, type: "compound" });
    setEditing("__new__");
  };

  const startEdit = (ex) => {
    setForm({ name: ex.name, muscleGroup: ex.muscleGroup, type: ex.type });
    setEditing(ex.name);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing === "__new__") {
      if (exercises.some(e => e.name.toLowerCase() === form.name.trim().toLowerCase())) return;
      setExercises(prev => [...prev, { name: form.name.trim(), muscleGroup: form.muscleGroup, type: form.type }]);
    } else {
      setExercises(prev => prev.map(e => e.name === editing ? { name: form.name.trim(), muscleGroup: form.muscleGroup, type: form.type } : e));
    }
    setEditing(null);
  };

  const remove = (name) => {
    setExercises(prev => prev.filter(e => e.name !== name));
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: colors.text, margin: 0, fontSize: 22 }}>Exercises</h2>
        <button onClick={startAdd}
          style={{ padding: "8px 16px", background: colors.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add New
        </button>
      </div>

      <input placeholder="Search exercises…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14, marginBottom: 12, boxSizing: "border-box" }} />

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["All", ...MUSCLE_GROUPS].map(mg => (
          <button key={mg} onClick={() => setFilter(mg)}
            style={{ padding: "5px 12px", borderRadius: 16, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: filter === mg ? colors.accent : colors.card, color: filter === mg ? "#fff" : colors.textDim }}>
            {mg}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>{filtered.length} exercise{filtered.length !== 1 ? "s" : ""}</div>

      {Object.entries(grouped).map(([mg, exs]) => (
        <div key={mg} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: colors.accentLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{mg}</div>
          {exs.map(ex => (
            <div key={ex.name} style={{ background: colors.card, borderRadius: 10, padding: "12px 14px", marginBottom: 6, border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: colors.text, fontSize: 14, fontWeight: 500 }}>{ex.name}</div>
                <span style={{ fontSize: 11, color: colors.textMuted, background: colors.bg, padding: "1px 8px", borderRadius: 8, marginTop: 2, display: "inline-block" }}>{ex.type}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(ex)} style={{ background: "none", border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textDim, fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>Edit</button>
                <button onClick={() => remove(ex.name)} style={{ background: "none", border: `1px solid ${colors.danger}44`, borderRadius: 6, color: colors.danger, fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {filtered.length === 0 && <p style={{ color: colors.textDim, textAlign: "center", padding: 30 }}>No exercises match your search.</p>}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: "100%", maxWidth: 380, border: `1px solid ${colors.border}` }}>
            <h3 style={{ color: colors.text, margin: "0 0 16px", fontSize: 17 }}>{editing === "__new__" ? "Add Exercise" : "Edit Exercise"}</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: colors.textMuted, display: "block", marginBottom: 4 }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dumbbell Fly"
                style={{ width: "100%", padding: "10px 12px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: colors.textMuted, display: "block", marginBottom: 4 }}>Muscle Group</label>
              <select value={form.muscleGroup} onChange={e => setForm({ ...form, muscleGroup: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 14 }}>
                {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: colors.textMuted, display: "block", marginBottom: 4 }}>Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["compound", "isolation"].map(t => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: form.type === t ? colors.accent : colors.bg, color: form.type === t ? "#fff" : colors.textDim }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={save}
                style={{ flex: 1, padding: 12, background: colors.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                {editing === "__new__" ? "Add Exercise" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(null)}
                style={{ flex: 1, padding: 12, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textDim, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPanel({ workouts, setWorkouts, exercises, setExercises }) {
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");

  const exportData = () => {
    const payload = { workouts, exercises };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "workouts.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      if (Array.isArray(data)) {
        setWorkouts(data.sort((a, b) => a.date.localeCompare(b.date)));
      } else if (data && data.workouts) {
        setWorkouts(data.workouts.sort((a, b) => a.date.localeCompare(b.date)));
        if (data.exercises) setExercises(data.exercises);
      }
      setImporting(false); setImportText("");
    } catch { /* invalid JSON */ }
  };

  return (
    <div style={{ padding: "8px 16px", display: "flex", gap: 8, justifyContent: "center", borderTop: `1px solid ${colors.border}`, background: colors.card }}>
      <button onClick={exportData} style={{ padding: "8px 16px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textDim, fontSize: 12, cursor: "pointer" }}>Export JSON</button>
      <button onClick={() => setImporting(!importing)} style={{ padding: "8px 16px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textDim, fontSize: 12, cursor: "pointer" }}>Import JSON</button>
      <button onClick={() => setWorkouts(SAMPLE_WORKOUTS)} style={{ padding: "8px 16px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textDim, fontSize: 12, cursor: "pointer" }}>Load Sample Data</button>
      {importing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: "100%", maxWidth: 400 }}>
            <h3 style={{ color: colors.text, margin: "0 0 12px" }}>Import Workout Data</h3>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste JSON here…"
              style={{ width: "100%", height: 150, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 13, padding: 10, resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={handleImport} style={{ flex: 1, padding: 10, background: colors.accent, border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Import</button>
              <button onClick={() => { setImporting(false); setImportText(""); }} style={{ flex: 1, padding: 10, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textDim, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("suggest");
  const [workouts, setWorkouts] = useState(SAMPLE_WORKOUTS);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <NavBar view={view} setView={setView} />
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 60 }}>
        {view === "log" && <LogWorkout exercises={exercises} workouts={workouts} setWorkouts={setWorkouts} setView={setView} />}
        {view === "history" && <History workouts={workouts} setWorkouts={setWorkouts} exercises={exercises} />}
        {view === "analytics" && <Analytics workouts={workouts} exercises={exercises} />}
        {view === "suggest" && <TodaySuggestion workouts={workouts} exercises={exercises} />}
        {view === "exercises" && <ExerciseManager exercises={exercises} setExercises={setExercises} />}
      </div>
      <DataPanel workouts={workouts} setWorkouts={setWorkouts} exercises={exercises} setExercises={setExercises} />
    </div>
  );
}
