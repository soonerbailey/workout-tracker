import React, { useState } from "react";
import { colors } from "../constants.js";
import { bestSet, buildExerciseIndex, calcE1RM, formatDate, formatSet, muscleOf, uid, unitCategory } from "../utils.js";
import { draftFromWorkout, isDraftDirty } from "../draft.js";
import { S, btn, useUI } from "./ui.jsx";

export function History({ data, draft, setDraft, setView }) {
  const { workouts, exercises, templates, actions } = data;
  const { confirm, notify } = useUI();
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const idx = buildExerciseIndex(exercises);
  const q = query.trim().toLowerCase();
  const sorted = [...workouts].reverse().filter(w => !q || w.name.toLowerCase().includes(q) || w.entries.some(e => e.exercise.toLowerCase().includes(q)));

  const remove = async (w) => {
    if (!(await confirm({ title: `Delete "${w.name}"?`, message: `${formatDate(w.date)} · ${w.entries.length} exercises. You can undo right after.`, confirmLabel: "Delete", danger: true }))) return;
    actions.deleteWorkout(w.id);
    notify("Workout deleted", { actionLabel: "Undo", onAction: () => actions.saveWorkout(w), duration: 8000 });
  };

  const edit = async (w) => {
    if (isDraftDirty(draft) && draft.editingId !== w.id && !(await confirm({ title: "Replace current workout?", message: "You have an unsaved workout in the Log tab. Editing this one will replace it.", confirmLabel: "Replace" }))) return;
    setDraft(draftFromWorkout(w));
    setView("log");
  };

  const saveAsTemplate = (w) => {
    actions.setTemplates([...templates, { id: uid(), name: w.name, exercises: w.entries.map(e => ({ exercise: e.exercise, unit: e.unit || "lbs", defaultSets: e.sets.length || 3 })) }]);
    notify(`Template "${w.name}" saved`);
  };

  return (
    <div style={S.page}>
      <h2 style={S.h2}>Workout History</h2>
      {workouts.length > 0 && (
        <input placeholder="Search workouts or exercises…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ ...S.input, width: "100%", padding: "10px 12px", background: colors.card, marginBottom: 12 }} />
      )}
      {workouts.length === 0 && <p style={{ color: colors.textDim, textAlign: "center", padding: 40 }}>No workouts logged yet. Start by logging your first workout!</p>}
      {sorted.map(w => (
        <div key={w.id} style={{ background: colors.card, borderRadius: 12, marginBottom: 10, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
          <div onClick={() => setExpanded(expanded === w.id ? null : w.id)} role="button" aria-expanded={expanded === w.id}
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
                const u = entry.unit || "lbs";
                const best = bestSet(entry.sets, u);
                const mg = muscleOf(entry, idx);
                return (
                  <div key={entry.id || i} style={{ padding: "10px 0", borderBottom: i < w.entries.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ color: colors.accentLight, fontSize: 14, fontWeight: 600 }}>{entry.exercise}</span>
                      {mg && <span style={{ color: colors.textMuted, fontSize: 11, background: colors.bg, padding: "2px 8px", borderRadius: 10 }}>{mg}</span>}
                    </div>
                    {entry.sets.map((s, j) => (
                      <div key={s.id || j} style={{ paddingLeft: 8, marginBottom: 3 }}>
                        <div style={{ display: "flex", gap: 8, fontSize: 13, color: colors.textDim, alignItems: "center" }}>
                          <span style={{ width: 20, color: colors.textMuted }}>{j + 1}.</span>
                          <span>{formatSet(s, u)}</span>
                          {best && s === best && entry.sets.length > 1 && <span style={{ color: colors.success, fontSize: 11 }}>★ best</span>}
                        </div>
                        {s.note && <div style={{ fontSize: 11, color: colors.textMuted, paddingLeft: 28, fontStyle: "italic" }}>{s.note}</div>}
                      </div>
                    ))}
                    {unitCategory(u) === "load" && best && (
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, paddingLeft: 8 }}>Est. 1RM: {calcE1RM(best.weight, best.reps)} {u}</div>
                    )}
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={() => edit(w)} style={btn("primary", { fontSize: 12 })}>Edit</button>
                <button onClick={() => saveAsTemplate(w)} style={btn("outline", { fontSize: 12 })}>Save as Template</button>
                <button onClick={() => remove(w)} style={btn("danger", { fontSize: 12 })}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
