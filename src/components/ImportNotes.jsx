import React, { useState } from "react";
import { colors, MUSCLE_GROUPS } from "../constants.js";
import { parseNotes } from "../parser.js";
import { formatSet, getToday, isSetValid, lastEntryFor, uid } from "../utils.js";
import { makeEntry, makeSet, isDraftDirty } from "../draft.js";
import { S, btn, Modal, useUI } from "./ui.jsx";

const EXAMPLE = `Day 1
Zercher Squat 4x3 2 on last 205lb
Incline DB chest press 4x3 90lb
OHP 4x5 125/135/135/140
Weighted dips AMRAP 10lb ball
Banded lateral walk 3x24 Blue or black band
Hollow body hold 3x15 sec`;

export function ImportNotes({ data, draft, setDraft, onClose, setView }) {
  const { workouts, exercises, templates, actions } = data;
  const { confirm, notify } = useUI();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  // For exercises not in the library: name -> { mode: "map" | "new", target, muscleGroup }
  const [resolve, setResolve] = useState({});

  const parse = () => {
    const names = exercises.map(e => e.name);
    const unitFor = (name) => lastEntryFor(workouts, name)?.entry.unit || null;
    const ws = parseNotes(text, { names, unitFor, templateNames: templates.map(t => t.name) })
      .map(w => ({ ...w, date: w.date || getToday() }));
    const r = {};
    ws.forEach(w => w.entries.forEach(e => { if (!e.matched && !r[e.exercise]) r[e.exercise] = { mode: "new", target: "", muscleGroup: "Chest" }; }));
    setResolve(r);
    setParsed(ws);
  };

  const unresolvedNames = Object.keys(resolve);
  const finalName = (name) => {
    const r = resolve[name];
    if (!r) return name;
    return r.mode === "map" && r.target ? r.target : name;
  };

  // Add any "new" exercises to the library, then return workouts with names resolved.
  const applyResolution = () => {
    const toAdd = unresolvedNames.filter(n => resolve[n].mode === "new" && !exercises.some(e => e.name.toLowerCase() === n.toLowerCase()))
      .map(n => ({ name: n, muscleGroup: resolve[n].muscleGroup, type: "compound", secondary: [] }));
    if (toAdd.length) actions.setExercises([...exercises, ...toAdd]);
    return parsed.map(w => ({ ...w, entries: w.entries.map(e => ({ ...e, exercise: finalName(e.exercise) })) }));
  };

  const mapsIncomplete = unresolvedNames.some(n => resolve[n].mode === "map" && !resolve[n].target);

  const reviewInLog = async (i) => {
    if (isDraftDirty(draft) && !(await confirm({ title: "Replace current workout?", message: "The workout you're entering will be replaced by the imported one.", confirmLabel: "Replace" }))) return;
    const w = applyResolution()[i];
    setDraft({
      editingId: null, name: w.name, date: w.date,
      entries: w.entries.map(e => makeEntry({ exercise: e.exercise, unit: e.unit, sets: e.sets.map(s => makeSet(s)) })),
    });
    onClose();
    setView("log");
  };

  const saveAll = async () => {
    const ws = applyResolution();
    let skipped = 0;
    const toSave = ws.map(w => ({
      id: uid(), name: w.name, date: w.date,
      entries: w.entries.map(e => {
        const sets = e.sets.filter(s => isSetValid(e.unit, s));
        skipped += e.sets.length - sets.length;
        return { id: uid(), exercise: e.exercise, unit: e.unit, sets: sets.map(s => makeSet(s)) };
      }).filter(e => e.sets.length),
    })).filter(w => w.entries.length);
    if (skipped && !(await confirm({ title: `Skip ${skipped} incomplete set${skipped > 1 ? "s" : ""}?`, message: "Sets with missing reps (e.g. AMRAP with no count) or missing weight won't be saved. Use \"Review in Log\" to fill them in instead.", confirmLabel: "Save anyway" }))) return;
    toSave.forEach(w => actions.saveWorkout(w));
    notify(`Saved ${toSave.length} workout${toSave.length !== 1 ? "s" : ""}`);
    onClose();
    setView("history");
  };

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <h3 style={{ ...S.h3, fontSize: 17 }}>Paste from notes</h3>
      {!parsed ? (
        <>
          <p style={{ ...S.muted, marginBottom: 10, lineHeight: 1.5 }}>
            Paste a workout the way you write it in your phone notes. A line like "Day 1" or "Upper A 10/14" starts a workout; each other line is an exercise.
          </p>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={EXAMPLE} rows={9}
            style={{ ...S.input, width: "100%", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button disabled={!text.trim()} onClick={parse} style={btn("primary", { flex: 1, padding: 12, opacity: text.trim() ? 1 : 0.5 })}>Read notes</button>
            <button onClick={onClose} style={btn("secondary", { flex: 1, padding: 12 })}>Cancel</button>
          </div>
        </>
      ) : parsed.length === 0 ? (
        <>
          <p style={S.muted}>Couldn't find any exercises in that text.</p>
          <button onClick={() => setParsed(null)} style={btn("secondary", { marginTop: 12 })}>Back</button>
        </>
      ) : (
        <>
          {unresolvedNames.length > 0 && (
            <div style={{ ...S.card, background: colors.bg, borderColor: colors.warning + "66" }}>
              <div style={{ color: colors.warning, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Not in your exercise list</div>
              {unresolvedNames.map(n => (
                <div key={n} style={{ marginBottom: 10 }}>
                  <div style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>{n}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select value={resolve[n].mode} onChange={e => setResolve(r => ({ ...r, [n]: { ...r[n], mode: e.target.value } }))} style={{ ...S.input, fontSize: 14 }}>
                      <option value="new">Add as new</option>
                      <option value="map">Same as…</option>
                    </select>
                    {resolve[n].mode === "new" ? (
                      <select value={resolve[n].muscleGroup} onChange={e => setResolve(r => ({ ...r, [n]: { ...r[n], muscleGroup: e.target.value } }))} style={{ ...S.input, fontSize: 14 }}>
                        {MUSCLE_GROUPS.map(mg => <option key={mg}>{mg}</option>)}
                      </select>
                    ) : (
                      <select value={resolve[n].target} onChange={e => setResolve(r => ({ ...r, [n]: { ...r[n], target: e.target.value } }))} style={{ ...S.input, fontSize: 14, flex: 1 }}>
                        <option value="">Pick exercise…</option>
                        {exercises.map(e => <option key={e.name}>{e.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsed.map((w, i) => (
            <div key={i} style={{ ...S.card, background: colors.bg }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={w.name} onChange={e => setParsed(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={{ ...S.input, flex: 2 }} aria-label="Workout name" />
                <input type="date" value={w.date} onChange={e => setParsed(p => p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} style={{ ...S.input, flex: 1, colorScheme: "dark" }} aria-label="Workout date" />
              </div>
              {w.entries.map((e, k) => (
                <div key={k} style={{ padding: "6px 0", borderTop: k ? `1px solid ${colors.border}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: colors.accentLight, fontSize: 14, fontWeight: 600 }}>{finalName(e.exercise)}</span>
                    <span style={{ color: colors.textMuted, fontSize: 11 }}>{e.unit}</span>
                  </div>
                  <div style={{ fontSize: 13, color: colors.textDim }}>{e.sets.map(s => formatSet(s, e.unit)).join(", ")}</div>
                  {e.sets.some(s => s.note) && <div style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic" }}>{[...new Set(e.sets.map(s => s.note).filter(Boolean))].join(" · ")}</div>}
                  {e.warnings.filter(x => x !== "Not in your exercise list").map(x => <div key={x} style={{ fontSize: 11, color: colors.warning }}>⚠ {x}</div>)}
                  <div style={{ fontSize: 11, color: colors.textMuted }}>from: “{e.raw}”</div>
                </div>
              ))}
              <button disabled={mapsIncomplete} onClick={() => reviewInLog(i)} style={btn(parsed.length === 1 ? "primary" : "outline", { width: "100%", marginTop: 10, padding: 10, opacity: mapsIncomplete ? 0.5 : 1 })}>
                Review in Log
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {parsed.length > 1 && <button disabled={mapsIncomplete} onClick={saveAll} style={btn("primary", { flex: 1, padding: 12, opacity: mapsIncomplete ? 0.5 : 1 })}>Save all {parsed.length}</button>}
            <button onClick={() => setParsed(null)} style={btn("secondary", { flex: 1, padding: 12 })}>Back</button>
          </div>
        </>
      )}
    </Modal>
  );
}
