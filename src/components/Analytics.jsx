import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { colors, MUSCLE_GROUPS, VOLUME_TARGETS } from "../constants.js";
import {
  addDays, buildExerciseIndex, CATEGORY_LABEL, exerciseSeries, exerciseUnitInfo, formatDate, getToday,
  localDateStr, METRICS, metricUnitLabel, projectSeries, round1, weekStart, weeklyVolume,
} from "../utils.js";
import { S, pill } from "./ui.jsx";

const tooltipStyle = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text };

function StrengthCard({ workouts }) {
  // Exercises by most recent use
  const exercisesUsed = useMemo(() => {
    const last = new Map();
    workouts.forEach(w => w.entries.forEach(e => last.set(e.exercise, w.date)));
    return [...last.entries()].sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0])).map(([n]) => n);
  }, [workouts]);

  const [exercise, setExercise] = useState(exercisesUsed[0] || "");
  useEffect(() => { if (!exercisesUsed.includes(exercise)) setExercise(exercisesUsed[0] || ""); }, [exercisesUsed, exercise]);

  const info = useMemo(() => exerciseUnitInfo(workouts, exercise), [workouts, exercise]);
  const [category, setCategory] = useState(null);
  const cat = info.categories.includes(category) ? category : info.categories[0];
  const [metricId, setMetricId] = useState(null);
  const metrics = METRICS[cat] || [];
  const metric = metrics.find(m => m.id === metricId) || metrics[0];
  const [unitPref, setUnitPref] = useState(null);
  const displayUnit = unitPref || info.loadUnit;

  const series = useMemo(() => (cat && metric ? exerciseSeries(workouts, exercise, cat, metric.id, displayUnit) : []), [workouts, exercise, cat, metric, displayUnit]);
  const projection = useMemo(() => (metric && metric.id !== "volume" && !metric.id.startsWith("total") ? projectSeries(series) : null), [series, metric]);
  const unitLabel = cat ? metricUnitLabel(cat, metric?.id, displayUnit) : "";

  const sortedList = useMemo(() => [...exercisesUsed].sort(), [exercisesUsed]);

  return (
    <div style={S.card}>
      <h3 style={S.h3}>Strength Progression</h3>
      {!exercisesUsed.length ? <p style={{ color: colors.textDim, textAlign: "center", padding: 20 }}>No data in this time range.</p> : (
        <>
          <select value={exercise} onChange={e => { setExercise(e.target.value); setCategory(null); setMetricId(null); setUnitPref(null); }} aria-label="Exercise"
            style={{ ...S.input, width: "100%", marginBottom: 10, fontSize: 15 }}>
            {sortedList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {info.categories.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {info.categories.map(c => <button key={c} onClick={() => { setCategory(c); setMetricId(null); }} style={pill(c === cat, { background: c === cat ? colors.accentDim : colors.bg })}>{CATEGORY_LABEL[c]}</button>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {metrics.map(m => <button key={m.id} onClick={() => setMetricId(m.id)} style={pill(m.id === metric?.id, { background: m.id === metric?.id ? colors.accent : colors.bg })}>{m.label}</button>)}
            {cat === "load" && (
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {["lbs", "kg"].map(u => <button key={u} onClick={() => setUnitPref(u)} style={pill(u === displayUnit, { padding: "4px 10px", background: u === displayUnit ? colors.accentDim : colors.bg })}>{u}</button>)}
              </span>
            )}
          </div>

          {series.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={t => formatDate(localDateStr(new Date(t)))} tick={{ fill: colors.textMuted, fontSize: 10 }} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} domain={[(min) => Math.max(0, Math.floor(min * 0.95)), (max) => Math.ceil(max * 1.05)]} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={t => formatDate(localDateStr(new Date(t)))} formatter={(v, name) => [`${v} ${unitLabel}`, name]} />
                  <Line data={series} type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2} dot={{ r: 4, fill: colors.accent }} name={metric.label} isAnimationActive={false} />
                  {projection && <Line data={projection.points} type="linear" dataKey="projected" stroke={colors.warning} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: colors.warning }} name="Trend" isAnimationActive={false} />}
                </LineChart>
              </ResponsiveContainer>
              {projection && (
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: colors.accent }}>● {metric.label}</span>
                  <span style={{ color: colors.warning }}>- - Trend, next 8 weeks ({projection.slopePerWeek >= 0 ? "+" : ""}{projection.slopePerWeek} {unitLabel}/wk)</span>
                </div>
              )}
              {series.length >= 2 && (() => {
                const first = series[0].value, last = series[series.length - 1].value, diff = round1(last - first);
                return (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: colors.bg, borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: colors.textDim }}>Change: </span>
                    <span style={{ color: diff >= 0 ? colors.success : colors.danger, fontWeight: 600 }}>{diff >= 0 ? "+" : ""}{diff} {unitLabel}</span>
                    <span style={{ color: colors.textDim }}> ({first} → {last}, {formatDate(series[0].date)} – {formatDate(series[series.length - 1].date)})</span>
                  </div>
                );
              })()}
              {cat === "load" && metric.id === "e1rm" && <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>Estimated from your best set each session (Epley). Most reliable for sets of 10 reps or fewer.</p>}
            </>
          ) : <p style={{ color: colors.textDim, textAlign: "center", padding: 20 }}>No data for this exercise yet.</p>}
        </>
      )}
    </div>
  );
}

function VolumeCards({ workouts, exercises }) {
  const idx = useMemo(() => buildExerciseIndex(exercises), [exercises]);
  const weeks = useMemo(() => weeklyVolume(workouts, idx), [workouts, idx]);
  const today = getToday();
  const thisWeek = weekStart(today);
  const [which, setWhich] = useState("this");
  const weekKey = which === "this" ? thisWeek : addDays(thisWeek, -7);

  const chartData = useMemo(() => Object.keys(weeks).sort().slice(-12).map(k => {
    const row = { week: formatDate(k) };
    MUSCLE_GROUPS.forEach(mg => { if (weeks[k][mg]) row[mg] = round1(weeks[k][mg]); });
    return row;
  }), [weeks]);

  // Muscle groups you've trained in the last 8 weeks — shown even at 0 so gaps are visible.
  const active = useMemo(() => {
    const cutoff = addDays(thisWeek, -56);
    const set = new Set();
    Object.entries(weeks).forEach(([k, g]) => { if (k >= cutoff) Object.keys(g).forEach(mg => set.add(mg)); });
    return MUSCLE_GROUPS.filter(mg => set.has(mg));
  }, [weeks, thisWeek]);

  const cardioSessions = useMemo(() => {
    const idxCardio = (e) => (idx.get(e.exercise)?.muscleGroup || e.muscleGroup) === "Cardio";
    return workouts.filter(w => weekStart(w.date) === weekKey && w.entries.some(idxCardio)).length;
  }, [workouts, weekKey, idx]);

  const rows = active.filter(mg => VOLUME_TARGETS[mg] != null).map(mg => ({ muscle: mg, sets: round1(weeks[weekKey]?.[mg] || 0), target: VOLUME_TARGETS[mg] }))
    .sort((a, b) => a.sets / a.target - b.sets / b.target);

  if (!chartData.length) return <div style={S.card}><h3 style={S.h3}>Weekly Volume</h3><p style={{ color: colors.textDim, textAlign: "center", padding: 20 }}>Not enough data yet.</p></div>;

  return (
    <>
      <div style={S.card}>
        <h3 style={S.h3}>Weekly Sets by Muscle Group</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis dataKey="week" tick={{ fill: colors.textMuted, fontSize: 10 }} />
            <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            {MUSCLE_GROUPS.map((mg, i) => <Bar key={mg} dataKey={mg} stackId="vol" fill={colors.chartColors[i % colors.chartColors.length]} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>Secondary muscles count as half a set (e.g. RDLs add to Glutes).</p>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ ...S.h3, margin: 0 }}>Volume vs Target</h3>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setWhich("this")} style={pill(which === "this", { background: which === "this" ? colors.accent : colors.bg })}>This week</button>
            <button onClick={() => setWhich("last")} style={pill(which === "last", { background: which === "last" ? colors.accent : colors.bg })}>Last week</button>
          </div>
        </div>
        {rows.map(({ muscle, sets, target }) => {
          const pct = Math.min((sets / target) * 100, 100);
          const c = sets >= target ? colors.success : sets >= target * 0.6 ? colors.warning : sets > 0 ? colors.danger : colors.textMuted;
          return (
            <div key={muscle} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: colors.text }}>{muscle}</span>
                <span style={{ color: c }}>{sets} / {target} sets</span>
              </div>
              <div style={{ height: 6, background: colors.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, transition: "width .5s" }} />
              </div>
            </div>
          );
        })}
        {active.includes("Cardio") && <div style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>Cardio: <span style={{ color: colors.text }}>{cardioSessions} session{cardioSessions !== 1 ? "s" : ""}</span></div>}
        <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
          {which === "this" ? `Week so far (since ${formatDate(thisWeek)}). ` : ""}Shows muscle groups you've trained in the last 8 weeks. Targets: ~10 sets for big groups, fewer for arms, core and calves.
        </p>
      </div>
    </>
  );
}

export function Analytics({ data }) {
  const { workouts, exercises } = data;
  const [range, setRange] = useState("all");
  const filtered = useMemo(() => {
    if (range === "all") return workouts;
    const cutoff = addDays(getToday(), -Number(range));
    return workouts.filter(w => w.date >= cutoff);
  }, [workouts, range]);

  return (
    <div style={S.page}>
      <h2 style={S.h2}>Analytics</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "180", "90", "30"].map(r => <button key={r} onClick={() => setRange(r)} style={pill(range === r, { padding: "6px 14px" })}>{r === "all" ? "All Time" : `${r}d`}</button>)}
      </div>
      <StrengthCard workouts={filtered} />
      <VolumeCards workouts={filtered} exercises={exercises} />
    </div>
  );
}
