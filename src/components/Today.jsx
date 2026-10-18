import React, { useMemo } from "react";
import { colors } from "../constants.js";
import { formatDate, formatSet, suggestToday } from "../utils.js";
import { draftFromSuggestion, isDraftDirty } from "../draft.js";
import { S, btn, useUI } from "./ui.jsx";

function SuggestionCard({ s }) {
  const target = s.weight != null ? formatSet({ weight: s.weight, reps: s.reps, loadText: s.loadText }, s.unit) : `? × ${s.reps}`;
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
        <div style={{ color: colors.text, fontWeight: 600, fontSize: 15 }}>{s.exercise}</div>
        {s.muscle && <span style={{ fontSize: 11, color: colors.textMuted, background: colors.bg, padding: "2px 8px", borderRadius: 10 }}>{s.muscle}</span>}
      </div>
      {s.last && (
        <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 8, padding: "6px 10px", background: colors.bg, borderRadius: 6 }}>
          Last ({formatDate(s.last.date)}): {s.last.sets.map(x => formatSet(x, s.last.unit)).join(", ")}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ padding: "8px 14px", background: colors.accentDim + "33", borderRadius: 8, border: `1px solid ${colors.accentDim}`, whiteSpace: "nowrap" }}>
          <span style={{ color: colors.accentLight, fontWeight: 700, fontSize: 16 }}>{target}</span>
          <span style={{ color: colors.textDim, fontSize: 11, display: "block" }}>{s.sets} sets</span>
        </div>
        <span style={{ color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>{s.note}</span>
      </div>
    </div>
  );
}

export function TodaySuggestion({ data, draft, setDraft, setView }) {
  const { workouts, exercises, templates } = data;
  const { confirm } = useUI();
  const suggestion = useMemo(() => suggestToday({ workouts, exercises, templates }), [workouts, exercises, templates]);

  const start = async (name, list) => {
    if (isDraftDirty(draft) && !(await confirm({ title: "Replace current workout?", message: "You have an unsaved workout in the Log tab.", confirmLabel: "Replace" }))) return;
    setDraft(draftFromSuggestion(name, list));
    setView("log");
  };

  if (suggestion.type === "empty") {
    return (
      <div style={S.page}>
        <h2 style={S.h2}>Today's Workout</h2>
        <div style={{ ...S.card, padding: 32, textAlign: "center" }}>
          <p style={{ color: colors.textDim, fontSize: 15 }}>Log a few workouts first and I'll start suggesting what to train next.</p>
          <button onClick={() => setView("log")} style={btn("primary", { marginTop: 14 })}>Log a workout</button>
        </div>
      </div>
    );
  }

  const trainedBanner = suggestion.trainedToday && (
    <div style={{ ...S.card, padding: "10px 14px", color: colors.success, fontSize: 13 }}>✓ You already logged a workout today. Here's what's next when you're ready.</div>
  );

  if (suggestion.type === "rest") {
    return (
      <div style={S.page}>
        <h2 style={S.h2}>Today's Suggestion</h2>
        {trainedBanner}
        <div style={{ ...S.card, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧘</div>
          <p style={{ color: colors.success, fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Rest Day</p>
          <p style={{ color: colors.textDim, fontSize: 14 }}>{suggestion.message}</p>
        </div>
      </div>
    );
  }

  const isRotation = suggestion.type === "rotation";
  const title = isRotation ? suggestion.template.name : suggestion.name;

  return (
    <div style={S.page}>
      <h2 style={{ ...S.h2, marginBottom: 6 }}>Today's Workout</h2>
      {trainedBanner}
      <p style={{ color: colors.accentLight, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>{title}</p>
      {isRotation ? (
        <p style={{ ...S.muted, marginBottom: 14 }}>Next in your rotation — last session was {suggestion.lastName} on {formatDate(suggestion.lastDate)}.</p>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {suggestion.muscles.map(m => (
            <div key={m.muscle} style={{ background: colors.card, borderRadius: 8, padding: "8px 14px", border: `1px solid ${colors.border}`, fontSize: 12 }}>
              <span style={{ color: colors.text, fontWeight: 600 }}>{m.muscle}</span>
              <span style={{ color: colors.textMuted, marginLeft: 6 }}>{m.daysSince}d ago</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => start(title, suggestion.suggestions)} style={btn("primary", { width: "100%", padding: 12, fontSize: 14, marginBottom: 14, borderRadius: 10 })}>
        Start this workout
      </button>
      {suggestion.suggestions.map((s, i) => <SuggestionCard key={i} s={s} />)}
      <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
        Targets: ≤5 reps → add weight once every set hits the reps; 6–11 reps → add a rep; 12+ → add weight and reset to 8.
      </p>
    </div>
  );
}
