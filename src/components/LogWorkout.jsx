import React, { useMemo, useState } from "react";
import { colors, MUSCLE_GROUPS, UNITS } from "../constants.js";
import { formatDate, formatSet, isSetValid, lastEntryFor, progressionFor, uid, getToday } from "../utils.js";
import { makeEntry, makeSet, emptyDraft, draftFromTemplate, isDraftDirty } from "../draft.js";
import { S, btn, useUI, Modal } from "./ui.jsx";
import { ImportNotes } from "./ImportNotes.jsx";
import { RestTimer, primeAudio } from "./RestTimer.jsx";

function SetRow({ set, idx, onChange, onRemove, unit, onRest }) {
  const repLabel = unit === "sec" ? "sec" : unit === "cal" ? "cals" : "reps";
  const showLoad = !["sec", "cal"].includes(unit);
  const isBand = unit === "band";
  const isBW = unit === "bw";
  const loadValue = isBand ? (set.loadText || "") : (set.weight > 0 ? String(set.weight) : "");

  const onLoadChange = (e) => {
    if (isBand) return onChange({ ...set, loadText: e.target.value, weight: 0 });
    onChange({ ...set, weight: e.target.value === "" ? 0 : +e.target.value });
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: colors.textMuted, fontSize: 12, width: 20, textAlign: "center" }}>{idx + 1}</span>
        {showLoad ? (
          <input type={isBand ? "text" : "number"} inputMode={isBand ? "text" : "decimal"} aria-label={`Set ${idx + 1} load`}
            placeholder={isBW ? "+ lbs" : isBand ? "color" : unit} value={loadValue} onChange={onLoadChange}
            style={{ ...S.input, flex: 1 }} />
        ) : <div style={{ flex: 1 }} />}
        <span style={{ color: colors.textMuted, fontSize: 11 }}>×</span>
        <input type="number" inputMode="numeric" aria-label={`Set ${idx + 1} ${repLabel}`} placeholder={repLabel}
          value={set.reps > 0 ? set.reps : ""} onChange={e => onChange({ ...set, reps: e.target.value === "" ? 0 : +e.target.value })}
          style={{ ...S.input, flex: 1 }} />
        <button onClick={onRest} title="Start rest timer" aria-label="Start rest timer" style={btn("ghost", { fontSize: 15, color: colors.textMuted })}>⏱</button>
        <button onClick={onRemove} aria-label="Remove set" style={btn("ghost", { color: colors.danger, fontSize: 16 })}>×</button>
      </div>
      <div style={{ paddingLeft: 28, marginTop: 3, paddingRight: 56 }}>
        <input type="text" placeholder="Note (AMRAP, tempo…)" value={set.note || ""}
          onChange={e => onChange({ ...set, note: e.target.value })}
          style={{ ...S.input, width: "100%", padding: "5px 8px", color: colors.textDim, fontSize: 13 }} />
      </div>
    </div>
  );
}

function LastSession({ workouts, entry, draft, onApply }) {
  const last = useMemo(() => entry.exercise ? lastEntryFor(workouts, entry.exercise, { excludeId: draft.editingId, beforeDate: draft.date }) : null,
    [workouts, entry.exercise, draft.editingId, draft.date]);
  if (!last) return entry.exercise ? <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>First time logging this exercise</div> : null;
  const u = last.entry.unit || "lbs";
  const prog = progressionFor(last.entry);
  return (
    <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 10, padding: "8px 10px", background: colors.bg, borderRadius: 8 }}>
      <div><span style={{ color: colors.textMuted }}>Last · {formatDate(last.workout.date)}:</span> {last.entry.sets.map(s => formatSet(s, u)).join(", ")}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => onApply(u, last.entry.sets.map(s => makeSet({ weight: s.weight, reps: s.reps, loadText: s.loadText })))} style={btn("outline", { padding: "4px 10px", fontSize: 12 })}>Repeat</button>
        <button onClick={() => onApply(prog.unit, Array.from({ length: prog.sets }, () => makeSet({ weight: prog.weight || 0, reps: prog.reps || 0, loadText: prog.loadText || "" })))} style={btn("outline", { padding: "4px 10px", fontSize: 12 })}>
          Progress: {prog.weight != null ? formatSet({ weight: prog.weight, reps: prog.reps, loadText: prog.loadText }, prog.unit) : "—"}
        </button>
        <span style={{ color: colors.textMuted, fontSize: 11 }}>{prog.note}</span>
      </div>
    </div>
  );
}

function ExerciseEntry({ entry, exercises, workouts, draft, onUpdate, onRemove, onRest }) {
  const unit = entry.unit || "lbs";
  const updateSet = (i, set) => { const s = [...entry.sets]; s[i] = set; onUpdate({ ...entry, sets: s }); };
  const removeSet = (i) => onUpdate({ ...entry, sets: entry.sets.filter((_, j) => j !== i) });
  const addSet = () => {
    const last = entry.sets[entry.sets.length - 1];
    onUpdate({ ...entry, sets: [...entry.sets, makeSet(last ? { weight: last.weight, reps: last.reps, loadText: last.loadText } : {})] });
  };
  const pickExercise = (name) => {
    // Default to the unit you used last time for this exercise.
    const last = lastEntryFor(workouts, name);
    const untouched = entry.sets.every(s => !s.weight && !s.reps && !s.loadText);
    onUpdate({ ...entry, exercise: name, unit: untouched && last ? (last.entry.unit || "lbs") : entry.unit });
  };
  const known = exercises.some(e => e.name === entry.exercise);
  return (
    <div style={{ ...S.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <select value={entry.exercise} onChange={e => pickExercise(e.target.value)} aria-label="Exercise"
          style={{ ...S.input, flex: 1, marginRight: 8, fontSize: 15 }}>
          <option value="">Select exercise…</option>
          {!known && entry.exercise && <option value={entry.exercise}>{entry.exercise} (not in library)</option>}
          {MUSCLE_GROUPS.map(mg => {
            const list = exercises.filter(e => e.muscleGroup === mg);
            return list.length ? <optgroup key={mg} label={mg}>{list.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}</optgroup> : null;
          })}
          {exercises.some(e => !MUSCLE_GROUPS.includes(e.muscleGroup)) && (
            <optgroup label="Other">{exercises.filter(e => !MUSCLE_GROUPS.includes(e.muscleGroup)).map(e => <option key={e.name} value={e.name}>{e.name}</option>)}</optgroup>
          )}
        </select>
        <button onClick={onRemove} aria-label="Remove exercise" style={btn("ghost", { color: colors.danger, fontSize: 18 })}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
        {UNITS.map(u => (
          <button key={u} onClick={() => onUpdate({ ...entry, unit: u })}
            style={{ padding: "4px 10px", borderRadius: 12, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: unit === u ? colors.accent : colors.bg, color: unit === u ? "#fff" : colors.textMuted }}>
            {u}
          </button>
        ))}
      </div>
      <LastSession workouts={workouts} entry={entry} draft={draft} onApply={(u, sets) => onUpdate({ ...entry, unit: u, sets })} />
      <div style={{ display: "flex", gap: 6, marginBottom: 6, paddingLeft: 28, paddingRight: 56 }}>
        <span style={{ ...S.caps, flex: 1 }}>{unit === "bw" ? "+Weight" : unit === "band" ? "Band" : unit === "sec" || unit === "cal" ? "" : "Weight"}</span>
        <span style={{ width: 11 }} />
        <span style={{ ...S.caps, flex: 1 }}>{unit === "sec" ? "Seconds" : unit === "cal" ? "Cals" : "Reps"}</span>
      </div>
      {entry.sets.map((set, i) => (
        <SetRow key={set.id || i} set={set} idx={i} unit={unit} onChange={s => updateSet(i, s)} onRemove={() => removeSet(i)} onRest={onRest} />
      ))}
      <button onClick={addSet} style={{ width: "100%", padding: 8, background: colors.bg, border: `1px dashed ${colors.border}`, borderRadius: 6, color: colors.accentLight, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
        + Add Set
      </button>
    </div>
  );
}

export function LogWorkout({ data, draft, setDraft, setView, timer, setTimer, onSaved }) {
  const { workouts, exercises, templates, actions } = data;
  const { confirm, notify } = useUI();
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [importing, setImporting] = useState(false);

  const setEntries = (fn) => setDraft(d => ({ ...d, entries: typeof fn === "function" ? fn(d.entries) : fn }));
  const startRest = () => primeAudio() || setTimer(t =>({ ...t, endAt: Date.now() + (t.duration || 90) * 1000 }));

  const loadTemplate = async (tpl) => {
    if (isDraftDirty(draft) && !(await confirm({ title: `Load "${tpl.name}"?`, message: "This replaces the workout you're currently entering.", confirmLabel: "Replace" }))) return;
    setDraft(draftFromTemplate(tpl));
  };

  const discard = async () => {
    if (isDraftDirty(draft) && !(await confirm({ title: draft.editingId ? "Stop editing?" : "Discard this workout?", message: draft.editingId ? "Your changes won't be saved. The original workout is unchanged." : "Everything entered so far will be cleared.", confirmLabel: "Discard", danger: true }))) return;
    setDraft(emptyDraft());
  };

  const saveAsTemplate = () => {
    const tplExercises = draft.entries.filter(e => e.exercise).map(e => ({ exercise: e.exercise, unit: e.unit || "lbs", defaultSets: e.sets.length || 3 }));
    if (!tplExercises.length) return;
    actions.setTemplates([...templates, { id: uid(), name: templateName.trim() || draft.name.trim() || "My Template", exercises: tplExercises }]);
    setSavingTemplate(false);
    notify("Template saved");
  };

  const save = async () => {
    const chosen = draft.entries.filter(e => e.exercise);
    const invalid = chosen.reduce((a, e) => a + e.sets.filter(s => !isSetValid(e.unit || "lbs", s)).length, 0);
    const entries = chosen.map(e => ({ ...e, sets: e.sets.filter(s => isSetValid(e.unit || "lbs", s)) })).filter(e => e.sets.length);
    if (!entries.length) {
      await confirm({ title: "Nothing to save yet", message: "Pick an exercise and enter reps (and weight, for lbs/kg) for at least one set.", confirmLabel: "OK", cancelLabel: null });
      return;
    }
    if (invalid > 0 && !(await confirm({ title: `Skip ${invalid} incomplete set${invalid > 1 ? "s" : ""}?`, message: "Sets without reps (or without weight, for lbs/kg) won't be saved.", confirmLabel: "Save anyway" }))) return;
    const wasEditing = !!draft.editingId;
    actions.saveWorkout({ id: draft.editingId || uid(), date: draft.date || getToday(), name: draft.name.trim() || "Workout", entries });
    setDraft(emptyDraft());
    setTimer(t => ({ ...t, endAt: null }));
    notify(wasEditing ? "Workout updated" : "Workout saved");
    onSaved?.();
    setView("history");
  };

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, margin: 0 }}>{draft.editingId ? "Edit Workout" : "Log Workout"}</h2>
        <button onClick={() => setImporting(true)} style={btn("outline")}>Paste from notes</button>
      </div>

      {draft.editingId && (
        <div style={{ ...S.card, padding: "10px 14px", borderColor: colors.warning + "88", color: colors.warning, fontSize: 13 }}>
          Editing a saved workout. Save to update it, or discard to leave it unchanged.
        </div>
      )}

      {!draft.editingId && templates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...S.caps, fontSize: 12, marginBottom: 6 }}>Templates</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {templates.map(tpl => (
              <button key={tpl.id} onClick={() => loadTemplate(tpl)}
                style={{ padding: "8px 16px", background: colors.card, border: `1px solid ${colors.accent}44`, borderRadius: 20, color: colors.accentLight, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {tpl.name}<span style={{ color: colors.textMuted, fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{tpl.exercises.length} ex</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Workout name (e.g. Upper A)" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          style={{ ...S.input, flex: 2, padding: "10px 12px", background: colors.card }} />
        <input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} aria-label="Date"
          style={{ ...S.input, flex: 1, padding: "10px 8px", background: colors.card, colorScheme: "dark" }} />
      </div>

      {draft.entries.map((entry, i) => (
        <ExerciseEntry key={entry.id || i} entry={entry} exercises={exercises} workouts={workouts} draft={draft} onRest={startRest}
          onUpdate={e => setEntries(list => list.map((x, j) => (j === i ? e : x)))}
          onRemove={() => setEntries(list => list.filter((_, j) => j !== i))} />
      ))}

      <button onClick={() => setEntries(list => [...list, makeEntry()])}
        style={{ width: "100%", padding: 12, background: colors.card, border: `1px dashed ${colors.accent}`, borderRadius: 10, color: colors.accentLight, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
        + Add Exercise
      </button>

      <button onClick={save} style={btn("primary", { width: "100%", padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 10, marginBottom: 8 })}>
        {draft.editingId ? "Update Workout" : "Save Workout"}
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setSavingTemplate(true); setTemplateName(draft.name); }} style={btn("outline", { flex: 1, padding: 12, borderRadius: 10 })}>Save as Template</button>
        <button onClick={discard} style={btn("secondary", { flex: 1, padding: 12, borderRadius: 10 })}>{draft.editingId ? "Cancel Edit" : "Clear"}</button>
      </div>

      <RestTimer timer={timer} setTimer={setTimer} />

      {savingTemplate && (
        <Modal onClose={() => setSavingTemplate(false)} maxWidth={380}>
          <h3 style={{ ...S.h3, fontSize: 17 }}>Save as Template</h3>
          <label style={S.label}>Template Name</label>
          <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Upper A" style={{ ...S.input, width: "100%", padding: "10px 12px", marginBottom: 14 }} />
          <div style={{ marginBottom: 16, fontSize: 13, color: colors.textDim }}>
            {draft.entries.filter(e => e.exercise).map((e, i) => <div key={i} style={{ padding: "3px 0", color: colors.accentLight, fontSize: 12 }}>• {e.exercise} ({e.sets.length} sets, {e.unit})</div>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveAsTemplate} style={btn("primary", { flex: 1, padding: 12 })}>Save Template</button>
            <button onClick={() => setSavingTemplate(false)} style={btn("secondary", { flex: 1, padding: 12 })}>Cancel</button>
          </div>
        </Modal>
      )}

      {importing && <ImportNotes data={data} draft={draft} setDraft={setDraft} onClose={() => setImporting(false)} setView={setView} />}
    </div>
  );
}
