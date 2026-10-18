import React, { useState } from "react";
import { colors, MUSCLE_GROUPS } from "../constants.js";
import { buildExerciseIndex } from "../utils.js";
import { S, btn, pill, Modal, useUI } from "./ui.jsx";

function TemplatesPanel({ data }) {
  const { templates, actions } = data;
  const { confirm, notify } = useUI();
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  const remove = async (tpl) => {
    if (!(await confirm({ title: `Delete template "${tpl.name}"?`, message: "Workouts you've already logged aren't affected.", confirmLabel: "Delete", danger: true }))) return;
    const prev = templates;
    actions.setTemplates(templates.filter(t => t.id !== tpl.id));
    notify("Template deleted", { actionLabel: "Undo", onAction: () => actions.setTemplates(prev), duration: 8000 });
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= templates.length) return;
    const next = [...templates];
    [next[i], next[j]] = [next[j], next[i]];
    actions.setTemplates(next);
  };
  const rename = () => {
    if (!name.trim()) return;
    actions.setTemplates(templates.map(t => t.id === editing ? { ...t, name: name.trim() } : t));
    setEditing(null);
  };

  return (
    <div style={{ ...S.card }}>
      <div style={{ fontSize: 12, color: colors.accentLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Workout Templates</div>
      <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>The Today tab follows this order as your rotation.</p>
      {templates.length === 0 && <p style={{ color: colors.textDim, fontSize: 13 }}>No templates yet. Save one from the Log or History view.</p>}
      {templates.map((tpl, i) => (
        <div key={tpl.id} style={{ background: colors.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: colors.text, fontSize: 14, fontWeight: 500 }}>{tpl.name}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{tpl.exercises.map(e => e.exercise).join(" · ")}</div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={btn("secondary", { padding: "4px 8px", opacity: i === 0 ? 0.4 : 1 })}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === templates.length - 1} aria-label="Move down" style={btn("secondary", { padding: "4px 8px", opacity: i === templates.length - 1 ? 0.4 : 1 })}>↓</button>
            <button onClick={() => { setEditing(tpl.id); setName(tpl.name); }} style={btn("secondary", { padding: "4px 10px", fontSize: 12 })}>Rename</button>
            <button onClick={() => remove(tpl)} aria-label="Delete template" style={btn("danger", { padding: "4px 10px", fontSize: 12 })}>✕</button>
          </div>
        </div>
      ))}
      {editing && (
        <Modal onClose={() => setEditing(null)} maxWidth={380}>
          <h3 style={{ ...S.h3, fontSize: 17 }}>Rename Template</h3>
          <input value={name} onChange={e => setName(e.target.value)} style={{ ...S.input, width: "100%", padding: "10px 12px", marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={rename} style={btn("primary", { flex: 1, padding: 12 })}>Save</button>
            <button onClick={() => setEditing(null)} style={btn("secondary", { flex: 1, padding: 12 })}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ExerciseManager({ data }) {
  const { exercises, workouts, actions } = data;
  const { confirm, notify } = useUI();
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", muscleGroup: "Chest", type: "compound", secondary: [] });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const idx = buildExerciseIndex(exercises);

  const usage = (name) => workouts.filter(w => w.entries.some(e => e.exercise === name)).length;

  const filtered = exercises.filter(e => (filter === "All" || e.muscleGroup === filter) && (!search || e.name.toLowerCase().includes(search.toLowerCase())));
  const grouped = {};
  filtered.forEach(e => { (grouped[e.muscleGroup] = grouped[e.muscleGroup] || []).push(e); });

  const startAdd = () => { setForm({ name: "", muscleGroup: filter === "All" ? "Chest" : filter, type: "compound", secondary: [] }); setError(""); setEditing("__new__"); };
  const startEdit = (ex) => { setForm({ ...ex, secondary: idx.get(ex.name)?.secondary || [] }); setError(""); setEditing(ex.name); };

  const save = async () => {
    const name = form.name.trim();
    if (!name) return setError("Enter a name");
    const clash = exercises.find(e => e.name.toLowerCase() === name.toLowerCase() && e.name !== editing);
    if (clash) return setError(`"${clash.name}" already exists`);
    const updated = { name, muscleGroup: form.muscleGroup, type: form.type, secondary: form.secondary.filter(s => s !== form.muscleGroup) };
    if (editing === "__new__") {
      actions.setExercises([...exercises, updated]);
    } else {
      const n = usage(editing);
      if (n > 0 && name !== editing && !(await confirm({ title: `Rename to "${name}"?`, message: `This also updates ${n} logged workout${n > 1 ? "s" : ""} and any templates that use "${editing}", so your history and charts stay connected.`, confirmLabel: "Rename" }))) return;
      actions.updateExercise(editing, updated);
      if (n > 0 && name !== editing) notify(`Renamed in ${n} workout${n > 1 ? "s" : ""}`);
    }
    setEditing(null);
  };

  const remove = async (ex) => {
    const n = usage(ex.name);
    if (!(await confirm({
      title: `Delete "${ex.name}"?`,
      message: n > 0 ? `It's used in ${n} logged workout${n > 1 ? "s" : ""}. Those workouts keep their sets and still count toward ${ex.muscleGroup} volume; it just won't be in the exercise picker.` : "It isn't used in any logged workouts.",
      confirmLabel: "Delete", danger: true,
    }))) return;
    const prev = exercises;
    actions.deleteExercise(ex.name);
    notify(`Deleted ${ex.name}`, { actionLabel: "Undo", onAction: () => actions.setExercises(prev), duration: 8000 });
  };

  const toggleSecondary = (mg) => setForm(f => ({ ...f, secondary: f.secondary.includes(mg) ? f.secondary.filter(x => x !== mg) : [...f.secondary, mg] }));

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, margin: 0 }}>Exercises</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowTemplates(!showTemplates)} style={btn(showTemplates ? "primary" : "secondary")}>Templates ({data.templates.length})</button>
          <button onClick={startAdd} style={btn("primary")}>+ Add New</button>
        </div>
      </div>

      {showTemplates && <TemplatesPanel data={data} />}

      <input placeholder="Search exercises…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, width: "100%", padding: "10px 12px", background: colors.card, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["All", ...MUSCLE_GROUPS].map(mg => <button key={mg} onClick={() => setFilter(mg)} style={pill(filter === mg, { fontSize: 11 })}>{mg}</button>)}
      </div>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>{filtered.length} exercise{filtered.length !== 1 ? "s" : ""}</div>

      {Object.entries(grouped).map(([mg, exs]) => (
        <div key={mg} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: colors.accentLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{mg}</div>
          {exs.map(ex => {
            const sec = idx.get(ex.name)?.secondary || [];
            return (
              <div key={ex.name} style={{ background: colors.card, borderRadius: 10, padding: "12px 14px", marginBottom: 6, border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: colors.text, fontSize: 14, fontWeight: 500 }}>{ex.name}</div>
                  <span style={{ fontSize: 11, color: colors.textMuted, background: colors.bg, padding: "1px 8px", borderRadius: 8, marginTop: 2, display: "inline-block" }}>{ex.type}{sec.length ? ` · also ${sec.join(", ")}` : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(ex)} style={btn("secondary", { padding: "4px 10px", fontSize: 12 })}>Edit</button>
                  <button onClick={() => remove(ex)} aria-label={`Delete ${ex.name}`} style={btn("danger", { padding: "4px 10px", fontSize: 12 })}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {filtered.length === 0 && <p style={{ color: colors.textDim, textAlign: "center", padding: 30 }}>No exercises match your search.</p>}

      {editing && (
        <Modal onClose={() => setEditing(null)} maxWidth={400}>
          <h3 style={{ ...S.h3, fontSize: 17 }}>{editing === "__new__" ? "Add Exercise" : "Edit Exercise"}</h3>
          <label style={S.label}>Name</label>
          <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setError(""); }} placeholder="e.g. Dumbbell Fly" style={{ ...S.input, width: "100%", padding: "10px 12px", marginBottom: 4 }} />
          <div style={{ color: colors.danger, fontSize: 12, minHeight: 16, marginBottom: 6 }}>{error}</div>
          <label style={S.label}>Primary muscle group</label>
          <select value={form.muscleGroup} onChange={e => setForm({ ...form, muscleGroup: e.target.value })} style={{ ...S.input, width: "100%", padding: "10px 12px", marginBottom: 12 }}>
            {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
          </select>
          <label style={S.label}>Also works (counts as half a set)</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {MUSCLE_GROUPS.filter(mg => mg !== form.muscleGroup && mg !== "Cardio").map(mg => (
              <button key={mg} onClick={() => toggleSecondary(mg)} style={pill(form.secondary.includes(mg), { fontSize: 11, background: form.secondary.includes(mg) ? colors.accent : colors.bg })}>{mg}</button>
            ))}
          </div>
          <label style={S.label}>Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["compound", "isolation"].map(t => (
              <button key={t} onClick={() => setForm({ ...form, type: t })} style={btn(form.type === t ? "primary" : "secondary", { flex: 1, padding: 10 })}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={btn("primary", { flex: 1, padding: 12 })}>{editing === "__new__" ? "Add Exercise" : "Save Changes"}</button>
            <button onClick={() => setEditing(null)} style={btn("secondary", { flex: 1, padding: 12 })}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
